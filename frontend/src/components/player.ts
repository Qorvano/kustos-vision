// Playing a run of segments as one continuous recording.
//
// Built on MediaSource Extensions rather than on a player library, because
// bundling someone else's would be the one thing this integration is not
// supposed to do. The segments are fragmented MP4 (that is why the recorder
// sets those movflags), which is exactly what a SourceBuffer accepts.
//
// Each segment starts its own timeline at zero, because the recorder writes
// with -reset_timestamps. The player puts them back in the right place with
// timestampOffset, so the seams are invisible and the video element's
// currentTime maps onto real time.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface PlayableSegment {
  path: string;
  start: number;
  duration: number;
}

// How much footage to keep buffered ahead of the playhead. Two segments is
// enough that playback never waits on a fetch, and little enough that seeking
// somewhere else has not wasted much.
const LOOKAHEAD_SEGMENTS = 2;

// The audio track is always AAC-LC, because the recorder either encodes it
// that way or drops it. The video codec is not known in advance: it is copied
// from the camera untouched, so it is read out of the file below.
const AUDIO_CODEC = "mp4a.40.2";

/**
 * Read the H.264 profile, constraints and level out of a fragmented MP4.
 *
 * MediaSource needs the exact codec string up front and rejects a wrong one
 * with a decode error rather than a useful message. Rather than guessing a
 * common value, the three bytes that describe it are taken from the file's own
 * avcC box. Searching for the four-character code is enough here: it appears
 * once, inside the sample description that every segment carries in its moov.
 */
export function readVideoCodec(header: Uint8Array): string | null {
  for (let i = 0; i + 8 < header.length; i += 1) {
    if (
      header[i] === 0x61 && // a
      header[i + 1] === 0x76 && // v
      header[i + 2] === 0x63 && // c
      header[i + 3] === 0x43 // C
    ) {
      // Immediately after the box type: configurationVersion, then the three
      // bytes that make up the codec string.
      const profile = header[i + 5];
      const compatibility = header[i + 6];
      const level = header[i + 7];
      if (profile === undefined || level === undefined) return null;
      const hex = (v: number) => v.toString(16).padStart(2, "0");
      return `avc1.${hex(profile)}${hex(compatibility)}${hex(level)}`;
    }
  }
  return null;
}

@customElement("camwatch-player")
export class CamwatchPlayer extends LitElement {
  @property({ attribute: false }) segments: PlayableSegment[] = [];
  /** Where to start, as a UTC timestamp in seconds. */
  @property({ type: Number }) seekTo = 0;
  @property() segmentUrlBase = "/api/camwatch/segment";

  @state() private message = "";

  private media?: MediaSource;
  private buffer?: SourceBuffer;
  private objectUrl?: string;
  private queue: PlayableSegment[] = [];
  private appended = new Set<string>();
  private origin = 0;
  private loading = false;
  private generation = 0;

  static override styles = css`
    :host {
      display: block;
      background: #000;
      position: relative;
      aspect-ratio: 16 / 9;
    }
    video {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ccc;
      font-size: 0.9em;
      text-align: center;
      padding: 12px;
      pointer-events: none;
    }
  `;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.teardown();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("segments")) {
      void this.load();
    } else if (changed.has("seekTo") && this.buffer) {
      this.jump(this.seekTo);
    }
  }

  /** The video element's time that corresponds to a moment in real time. */
  private toMediaTime(utc: number): number {
    return Math.max(0, utc - this.origin);
  }

  private jump(utc: number): void {
    const video = this.renderRoot.querySelector("video");
    if (!video) return;
    const target = this.toMediaTime(utc);
    // Seeking into a part that was never fetched has to refill the buffer from
    // there, otherwise the element would sit and wait for data that is not
    // coming.
    const buffered = video.buffered;
    let covered = false;
    for (let i = 0; i < buffered.length; i += 1) {
      if (target >= buffered.start(i) && target <= buffered.end(i)) covered = true;
    }
    if (covered) {
      video.currentTime = target;
      return;
    }
    void this.load(utc);
  }

  private teardown(): void {
    this.generation += 1;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.buffer = undefined;
    this.media = undefined;
    this.queue = [];
    this.appended.clear();
    this.loading = false;
  }

  private async load(from?: number): Promise<void> {
    this.teardown();
    const generation = this.generation;
    this.message = "";

    if (this.segments.length === 0) {
      this.message = "Für diesen Zeitraum ist nichts aufgezeichnet.";
      return;
    }
    if (!("MediaSource" in window)) {
      this.message = "Dieser Browser unterstützt die Wiedergabe nicht.";
      return;
    }

    const startAt = from ?? this.seekTo ?? this.segments[0].start;
    const index = Math.max(
      0,
      this.segments.findIndex((s) => s.start + s.duration > startAt),
    );
    this.queue = this.segments.slice(index);
    this.origin = this.queue[0]?.start ?? startAt;

    let codec: string | null;
    try {
      codec = await this.detectCodec(this.queue[0]);
    } catch (err) {
      this.message = err instanceof Error ? err.message : String(err);
      return;
    }
    if (generation !== this.generation) return;
    if (!codec) {
      this.message = "Das Format der Aufnahme konnte nicht bestimmt werden.";
      return;
    }

    const mime = `video/mp4; codecs="${codec}, ${AUDIO_CODEC}"`;
    const fallback = `video/mp4; codecs="${codec}"`;
    const supported = MediaSource.isTypeSupported(mime)
      ? mime
      : MediaSource.isTypeSupported(fallback)
        ? fallback
        : null;
    if (!supported) {
      this.message = `Dieser Browser kann ${codec} nicht abspielen.`;
      return;
    }

    const media = new MediaSource();
    this.media = media;
    this.objectUrl = URL.createObjectURL(media);

    await this.updateComplete;
    const video = this.renderRoot.querySelector("video");
    if (!video) return;
    video.src = this.objectUrl;

    media.addEventListener(
      "sourceopen",
      () => {
        if (generation !== this.generation) return;
        try {
          const buffer = media.addSourceBuffer(supported);
          // "segments" mode is what makes timestampOffset apply, which is how
          // files that each start at zero end up on one timeline.
          buffer.mode = "segments";
          this.buffer = buffer;
          buffer.addEventListener("updateend", () => void this.pump());
          void this.pump();
        } catch (err) {
          this.message = err instanceof Error ? err.message : String(err);
        }
      },
      { once: true },
    );

    video.addEventListener("timeupdate", () => void this.pump());
  }

  private async detectCodec(segment: PlayableSegment): Promise<string | null> {
    // The moov box sits at the front of a fragmented MP4, so the first few
    // kilobytes are enough and the whole file need not be fetched to find out
    // what it is.
    const response = await fetch(this.urlFor(segment), {
      headers: { Range: "bytes=0-8191" },
    });
    if (!response.ok && response.status !== 206) {
      throw new Error("Die Aufnahme konnte nicht geladen werden.");
    }
    return readVideoCodec(new Uint8Array(await response.arrayBuffer()));
  }

  private urlFor(segment: PlayableSegment): string {
    return `${this.segmentUrlBase}/${segment.path}`;
  }

  /** Keep a little footage buffered ahead of the playhead. */
  private async pump(): Promise<void> {
    const buffer = this.buffer;
    const media = this.media;
    if (!buffer || !media || buffer.updating || this.loading) return;
    if (media.readyState !== "open") return;

    const video = this.renderRoot.querySelector("video");
    const ahead = this.queue.filter((s) => !this.appended.has(s.path));
    if (ahead.length === 0) {
      if (media.readyState === "open") {
        try {
          media.endOfStream();
        } catch {
          // Already ended; nothing to do.
        }
      }
      return;
    }

    if (video) {
      const bufferedEnd =
        video.buffered.length > 0
          ? video.buffered.end(video.buffered.length - 1)
          : 0;
      const lead = bufferedEnd - video.currentTime;
      const enough =
        lead > LOOKAHEAD_SEGMENTS * (this.queue[0]?.duration ?? 0) &&
        this.appended.size > 0;
      if (enough) return;
    }

    const next = ahead[0];
    const generation = this.generation;
    this.loading = true;
    try {
      const response = await fetch(this.urlFor(next));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      if (generation !== this.generation || !this.buffer) return;

      this.buffer.timestampOffset = next.start - this.origin;
      this.buffer.appendBuffer(data);
      this.appended.add(next.path);
    } catch (err) {
      // One unreadable segment must not end the playback: it is skipped and
      // shows up as a short jump, which is what the file actually is.
      this.appended.add(next.path);
      // eslint-disable-next-line no-console
      console.warn("camwatch: segment could not be appended", next.path, err);
    } finally {
      this.loading = false;
    }
  }

  override render() {
    return html`
      <video controls playsinline></video>
      ${this.message ? html`<div class="overlay">${this.message}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "camwatch-player": CamwatchPlayer;
  }
}
