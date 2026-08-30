// Playing a run of segments as one continuous recording.
//
// Built on MediaSource Extensions rather than on a player library, because
// bundling someone else's would be the one thing this integration is not
// supposed to do. The segments are fragmented MP4 (that is why the recorder
// sets those movflags), which is exactly what a SourceBuffer accepts.
//
// The video element's own timeline holds footage only. Segments are laid end
// to end with the gaps between recordings removed, so the running time is the
// material that exists and every position the scrubber can reach is a moment
// that was recorded. Real time lives in the timeline component above the
// player; placeRun / mediaTimeFor / utcFor translate between the two. The
// earlier design mapped currentTime directly onto real time, which meant a
// recording pause showed up as minutes of seekable nothing: the running time
// read as a quarter hour when there were ten minutes of footage, and seeking
// into the hole stalled the element for good.
//
// A run also stays within one stream. The recordings view may show every
// stream of a camera at once, and feeding segments of two different encodings
// into one SourceBuffer hands the decoder data that does not match the type it
// was opened with.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { errorText, type CamwatchApi } from "../api";

export interface PlayableSegment {
  path: string;
  start: number;
  duration: number;
  /** Which stream the segment belongs to; a run never mixes streams. */
  stream_key?: string;
}

/** A segment with its place on the video element's own timeline. */
export interface PlacedSegment {
  segment: PlayableSegment;
  mediaStart: number;
}

// How much footage to keep buffered ahead of the playhead. Two segments is
// enough that playback never waits on a fetch, and little enough that seeking
// somewhere else has not wasted much.
const LOOKAHEAD_SEGMENTS = 2;

// The most bytes handed to a single appendBuffer call. Appending a whole
// high-resolution segment at once was measured to exhaust the browser's
// SourceBuffer quota: three 2K segments filled it and the fourth append was
// refused outright with "The SourceBuffer is full". Modest slices give the
// quota recovery below a chance to free space between slices, and when the
// tail of a segment no longer fits, the part that got in still plays.
const APPEND_CHUNK_BYTES = 8 * 1024 * 1024;

// When there is an audio track it is AAC-LC, because the recorder either
// encodes it that way or drops it entirely. Whether there is one at all has to
// be read from the file: a camera recorded with audio switched off produces
// segments with no audio track, and declaring one anyway hands MediaSource a
// type the data does not match.
const AUDIO_CODEC = "mp4a.40.2";

/**
 * Lay the run of segments that covers a moment onto the media timeline.
 *
 * The run starts at the segment covering `fromUtc` (or the next one after it,
 * when the moment falls between recordings) and contains every later segment
 * of the same stream, packed end to end. `preferStream` keeps an ongoing
 * playback on its stream when more than one covers the moment; when only
 * another stream has footage there, the run switches to it, because footage
 * beats loyalty.
 */
export function placeRun(
  segments: PlayableSegment[],
  fromUtc: number,
  preferStream?: string,
): PlacedSegment[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const covering = sorted.filter(
    (s) => s.start <= fromUtc && fromUtc < s.start + s.duration,
  );
  let anchor =
    covering.find((s) => s.stream_key === preferStream) ?? covering[0];
  if (!anchor) {
    const upcoming = sorted.filter((s) => s.start + s.duration > fromUtc);
    anchor =
      upcoming.find(
        (s) => s.start === upcoming[0]?.start && s.stream_key === preferStream,
      ) ?? upcoming[0];
  }
  if (!anchor) return [];

  let at = 0;
  return sorted
    .filter(
      (s) =>
        s.stream_key === anchor.stream_key && s.start + s.duration > fromUtc,
    )
    .map((segment) => {
      const placed = { segment, mediaStart: at };
      at += segment.duration;
      return placed;
    });
}

/**
 * The media-timeline position of a moment in real time.
 *
 * A moment inside a gap snaps to the recording after it, which is what a
 * click between two clips means: show me the next thing that happened.
 */
export function mediaTimeFor(placed: PlacedSegment[], utc: number): number {
  for (const p of placed) {
    if (utc < p.segment.start) return p.mediaStart;
    if (utc < p.segment.start + p.segment.duration) {
      return p.mediaStart + (utc - p.segment.start);
    }
  }
  const last = placed[placed.length - 1];
  return last ? last.mediaStart + last.segment.duration : 0;
}

/** The moment in real time that a media-timeline position shows. */
export function utcFor(placed: PlacedSegment[], mediaTime: number): number {
  for (const p of placed) {
    if (mediaTime < p.mediaStart + p.segment.duration) {
      return p.segment.start + Math.max(0, mediaTime - p.mediaStart);
    }
  }
  const last = placed[placed.length - 1];
  return last ? last.segment.start + last.segment.duration : 0;
}

/**
 * Read the H.264 profile, constraints and level out of a fragmented MP4.
 *
 * MediaSource needs the exact codec string up front and rejects a wrong one
 * with a decode error rather than a useful message. Rather than guessing a
 * common value, the three bytes that describe it are taken from the file's own
 * avcC box. Searching for the four-character code is enough here: it appears
 * once, inside the sample description that every segment carries in its moov.
 */
function findBox(header: Uint8Array, type: string): number {
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => type.charCodeAt(i));
  for (let i = 0; i + 8 < header.length; i += 1) {
    if (
      header[i] === a &&
      header[i + 1] === b &&
      header[i + 2] === c &&
      header[i + 3] === d
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Whether the segment carries an audio track.
 *
 * The sample description names its format, so an AAC track shows up as an
 * "mp4a" box in the moov. A segment recorded with audio switched off has none,
 * and declaring AAC for it would make MediaSource reject data that is
 * otherwise perfectly playable.
 */
export function hasAudioTrack(header: Uint8Array): boolean {
  return findBox(header, "mp4a") !== -1;
}

export function readVideoCodec(header: Uint8Array): string | null {
  const i = findBox(header, "avcC");
  if (i === -1) return null;
  // Immediately after the box type: configurationVersion, then the three
  // bytes that make up the codec string.
  const profile = header[i + 5];
  const compatibility = header[i + 6];
  const level = header[i + 7];
  if (profile === undefined || level === undefined) return null;
  const hex = (v: number) => v.toString(16).padStart(2, "0");
  return `avc1.${hex(profile)}${hex(compatibility)}${hex(level)}`;
}

/**
 * The corner clock's text: date and second-exact time of the shown moment.
 *
 * Derived from the index rather than from the cameras' own OSD, whose clocks
 * drift as soon as they lose their time source; the file names and fragment
 * times come from this machine's NTP-synchronised clock.
 */
export function clockText(utcSeconds: number): string {
  const at = new Date(utcSeconds * 1000);
  return `${at.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} ${at.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

const isQuotaError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "QuotaExceededError";

@customElement("kustos-vision-player")
export class CamwatchPlayer extends LitElement {
  /**
   * The websocket client, which is also how the segments are fetched.
   *
   * The file endpoints require authentication and there is no cookie to fall
   * back on: Home Assistant accepts either an Authorization header or a signed
   * path, and nothing else. Fetching without either answered 401 for every
   * segment, which surfaced as "Die Aufnahme konnte nicht geladen werden" on a
   * recording that was perfectly intact.
   */
  @property({ attribute: false }) api?: CamwatchApi;
  @property({ attribute: false }) segments: PlayableSegment[] = [];
  /** Where to start, as a UTC timestamp in seconds. */
  @property({ type: Number }) seekTo = 0;
  @property() segmentUrlBase = "/api/kustos_vision/segment";

  @state() private message = "";
  /** A moment the cursor was dragged to at which nothing was recorded. */
  @state() private gapAt?: number;
  /** The real time the shown frame was recorded, for the corner clock. */
  @state() private clockUtc?: number;

  private media?: MediaSource;
  private withAudio = true;
  private buffer?: SourceBuffer;
  private objectUrl?: string;
  private placed: PlacedSegment[] = [];
  private appended = new Set<string>();
  /** Segments that really made it into the buffer, as opposed to skipped. */
  private accepted = 0;
  /** The rest of a segment whose append was interrupted by a full buffer. */
  private carry?: { path: string; rest: Uint8Array; firstOfSegment: boolean };
  /** Where a freshly loaded run starts, and whether it resumes playing. */
  private startup?: { mediaTime: number; resume: boolean };
  private loading = false;
  private generation = 0;
  private wired = false;

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
    .clock {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-family: ui-monospace, monospace;
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 1;
    }
    .gap {
      position: absolute;
      inset: 0;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      font-size: 0.9em;
      text-align: center;
      padding: 12px;
    }
  `;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.teardown();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("segments")) {
      void this.load();
    } else if (changed.has("seekTo")) {
      // Deliberately without any further condition. This used to require a
      // live buffer, so once a load had failed, every following click on the
      // timeline was silently ignored and the player looked dead.
      this.jump(this.seekTo);
    }
  }

  private video(): HTMLVideoElement | null {
    return this.renderRoot.querySelector("video");
  }

  /** Attach the element listeners exactly once; loads come and go. */
  private wire(video: HTMLVideoElement): void {
    if (this.wired) return;
    this.wired = true;
    video.addEventListener("timeupdate", () => {
      void this.pump();
      // The timeline above follows the playback through this; without it the
      // red cursor only ever moved when somebody clicked.
      if (this.placed.length > 0 && !video.seeking) {
        const time = utcFor(this.placed, video.currentTime);
        this.clockUtc = time;
        this.dispatchEvent(
          new CustomEvent("positionchange", {
            detail: { time },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });
    video.addEventListener("seeked", () => {
      if (this.placed.length > 0) {
        this.clockUtc = utcFor(this.placed, video.currentTime);
      }
    });
    video.addEventListener("seeking", () => this.onSeeking());
    // Stalling mid-run means the data for this spot never arrived even though
    // the file was appended: a recording cut short mid-write carries less
    // footage than the index believes. Playback moves on to the next material
    // instead of waiting forever for data that does not exist.
    video.addEventListener("waiting", () => this.skipHole());
    video.addEventListener("error", () => {
      const err = video.error;
      if (err && !this.message) {
        this.message = `Der Browser meldet einen Wiedergabefehler${
          err.message ? `: ${err.message}` : ` (Code ${err.code})`
        }.`;
      }
    });
  }

  private jump(utc: number): void {
    const recordedAnywhere = this.segments.some(
      (s) => utc >= s.start && utc < s.start + s.duration,
    );
    if (!recordedAnywhere) {
      // The cursor was dragged to a stretch where nothing was recorded. The
      // honest answer to "what was there at this time" is a black picture
      // saying so, not a silent jump to some other clip.
      this.gapAt = utc;
      this.video()?.pause();
      return;
    }
    this.gapAt = undefined;
    const containing = this.placed.find(
      (p) => utc >= p.segment.start && utc < p.segment.start + p.segment.duration,
    );
    if (!containing) {
      // The current run has nothing at that moment. Another stream may cover
      // it, or the next recording starts later; re-anchoring decides.
      void this.load(utc, this.placed[0]?.segment.stream_key);
      return;
    }
    const video = this.video();
    if (!video) return;
    const target = containing.mediaStart + (utc - containing.segment.start);
    if (this.isBuffered(video, target)) {
      video.currentTime = target;
      return;
    }
    const firstPending = this.placed.find(
      (p) => !this.appended.has(p.segment.path),
    );
    if (
      this.carry?.path === containing.segment.path ||
      firstPending?.segment.path === containing.segment.path
    ) {
      // On its way already; seeking there makes the element wait for exactly
      // the data the pump is about to deliver.
      video.currentTime = target;
      void this.pump();
      return;
    }
    // Anything further restarts there. Waiting instead would crawl segment by
    // segment toward the target, and on a high-resolution stream those are
    // fifty megabytes each: the controls sat on "playing" for as long as the
    // downloads took, with nothing moving.
    void this.load(utc, containing.segment.stream_key);
  }

  private isBuffered(video: HTMLVideoElement, target: number): boolean {
    const buffered = video.buffered;
    for (let i = 0; i < buffered.length; i += 1) {
      if (target >= buffered.start(i) && target <= buffered.end(i)) return true;
    }
    return false;
  }

  /**
   * React to the element seeking somewhere the buffer does not cover.
   *
   * The scrubber can reach every media-timeline position, including footage
   * that was evicted behind the playhead or not fetched yet. Both are
   * recoverable; sitting silently on a spinner is not.
   */
  private onSeeking(): void {
    const video = this.video();
    if (!video || this.placed.length === 0 || this.appended.size === 0) return;
    const t = video.currentTime;
    if (this.isBuffered(video, t)) return;

    const pos = this.placed.find((p) => t < p.mediaStart + p.segment.duration);
    if (!pos) return;
    const firstPending = this.placed.find(
      (p) => !this.appended.has(p.segment.path),
    );
    if (
      this.carry?.path === pos.segment.path ||
      firstPending?.segment.path === pos.segment.path
    ) {
      // The pump is on its way to this spot.
      void this.pump();
      return;
    }
    if (!this.appended.has(pos.segment.path)) {
      // Far ahead in the queue; restart there instead of fetching everything
      // in between first.
      void this.load(utcFor(this.placed, t), pos.segment.stream_key);
      return;
    }
    const buffered = video.buffered;
    if (buffered.length > 0 && t < buffered.start(0)) {
      // Behind everything still held: this footage was evicted to make room
      // and has to be fetched again.
      void this.load(utcFor(this.placed, t), pos.segment.stream_key);
      return;
    }
    // Appended but not there: the file really ends before the index says.
    this.skipHole();
  }

  /** Move past a spot whose data will never arrive. */
  private skipHole(): void {
    const video = this.video();
    if (!video) return;
    const buffered = video.buffered;
    for (let i = 0; i < buffered.length; i += 1) {
      if (buffered.start(i) > video.currentTime) {
        video.currentTime = buffered.start(i);
        return;
      }
    }
  }

  private teardown(): void {
    this.generation += 1;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.buffer = undefined;
    this.media = undefined;
    this.placed = [];
    this.appended.clear();
    this.accepted = 0;
    this.carry = undefined;
    this.startup = undefined;
    this.loading = false;
  }

  private async load(from?: number, preferStream?: string): Promise<void> {
    this.teardown();
    const generation = this.generation;
    this.message = "";
    this.gapAt = undefined;

    if (this.segments.length === 0) {
      this.message = "Für diesen Zeitraum ist nichts aufgezeichnet.";
      return;
    }
    if (!("MediaSource" in window)) {
      this.message = "Dieser Browser unterstützt die Wiedergabe nicht.";
      return;
    }

    const startAt = from ?? this.seekTo ?? this.segments[0].start;
    this.placed = placeRun(this.segments, startAt, preferStream);
    if (this.placed.length === 0) {
      this.message = "Ab diesem Zeitpunkt ist nichts mehr aufgezeichnet.";
      return;
    }

    // The element about to lose its source: whether it was playing decides
    // whether the new run starts moving on its own, and the requested moment
    // is applied once there is data to stand on.
    const previous = this.video();
    this.startup = {
      mediaTime: mediaTimeFor(this.placed, startAt),
      resume: previous !== null && !previous.paused,
    };

    let codec: string | null;
    try {
      codec = await this.inspect(this.placed[0].segment);
    } catch (err) {
      this.message = errorText(err);
      return;
    }
    if (generation !== this.generation) return;
    if (!codec) {
      // Only H.264 can be described here. A recording copied from an H.265,
      // AV1 or MJPEG camera reaches this point, and saying so beats a silent
      // black rectangle.
      this.message =
        "Diese Aufnahme ist nicht H.264. Die Wiedergabe im Panel unterstützt " +
        "derzeit nur H.264; die Datei selbst ist unbeschädigt und lässt sich " +
        "herunterladen.";
      return;
    }

    // Video only, unless the file actually carries an audio track.
    const videoOnly = `video/mp4; codecs="${codec}"`;
    const withAudio = `video/mp4; codecs="${codec}, ${AUDIO_CODEC}"`;
    const wanted = this.withAudio ? withAudio : videoOnly;
    const supported = MediaSource.isTypeSupported(wanted)
      ? wanted
      : MediaSource.isTypeSupported(videoOnly)
        ? videoOnly
        : null;
    if (!supported) {
      this.message = `Dieser Browser kann ${codec} nicht abspielen.`;
      return;
    }

    const media = new MediaSource();
    this.media = media;
    this.objectUrl = URL.createObjectURL(media);

    await this.updateComplete;
    const video = this.video();
    if (!video) return;
    this.wire(video);
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
          // The scrubber shows the whole run from the first moment. Without
          // this the running time creeps upward with every append, and the
          // part not fetched yet cannot even be seeked to.
          const last = this.placed[this.placed.length - 1];
          if (last) {
            media.duration = last.mediaStart + last.segment.duration;
          }
          void this.pump();
        } catch (err) {
          this.message = errorText(err);
        }
      },
      { once: true },
    );
  }

  private async inspect(segment: PlayableSegment): Promise<string | null> {
    // The moov box sits at the front of a fragmented MP4, so the first few
    // kilobytes describe the whole thing and the file need not be fetched to
    // find out what it is.
    const response = await this.fetchSegment(segment, {
      headers: { Range: "bytes=0-8191" },
    });
    if (!response.ok && response.status !== 206) {
      // The status is part of the message on purpose. Without it a refused
      // request and a missing file read identically, and the reason the
      // recording will not play never reaches the person looking at it.
      throw new Error(
        `Die Aufnahme konnte nicht geladen werden (HTTP ${response.status}).`,
      );
    }
    const header = new Uint8Array(await response.arrayBuffer());
    this.withAudio = hasAudioTrack(header);
    return readVideoCodec(header);
  }

  private urlFor(segment: PlayableSegment): string {
    return `${this.segmentUrlBase}/${segment.path}`;
  }

  /** Fetch a segment with credentials, which the endpoint insists on. */
  private fetchSegment(
    segment: PlayableSegment,
    init?: RequestInit,
  ): Promise<Response> {
    const url = this.urlFor(segment);
    if (!this.api) {
      // Nothing to authenticate with. Saying so beats a bare 401, which is
      // what a plain fetch would produce here.
      return Promise.reject(
        new Error("Die Wiedergabe ist nicht mit Home Assistant verbunden."),
      );
    }
    return this.api.authorizedFetch(url, init);
  }

  /** One appendBuffer call, settled on its updateend. */
  private appendOnce(bytes: Uint8Array): Promise<void> {
    const buffer = this.buffer;
    if (!buffer) return Promise.reject(new Error("kein Puffer"));
    return new Promise((resolve, reject) => {
      let failed: unknown;
      const onError = (event: Event) => {
        failed = event;
      };
      const onEnd = () => {
        buffer.removeEventListener("error", onError);
        buffer.removeEventListener("updateend", onEnd);
        if (failed) reject(new Error("Der Puffer hat die Daten abgelehnt."));
        else resolve();
      };
      buffer.addEventListener("error", onError);
      buffer.addEventListener("updateend", onEnd);
      try {
        buffer.appendBuffer(bytes as BufferSource);
      } catch (err) {
        buffer.removeEventListener("error", onError);
        buffer.removeEventListener("updateend", onEnd);
        reject(err);
      }
    });
  }

  /**
   * Free the footage the playhead has left behind.
   *
   * The browser caps how much a SourceBuffer may hold, and it does not evict
   * on its own what was never played. One segment length stays: a short seek
   * back is instant, anything further goes through a reload anyway.
   */
  private async evictBehind(video: HTMLVideoElement | null): Promise<boolean> {
    const buffer = this.buffer;
    if (!buffer || !video || buffer.updating) return false;
    const keepBehind = this.placed[0]?.segment.duration ?? 0;
    const cut = video.currentTime - keepBehind;
    const buffered = buffer.buffered;
    if (buffered.length === 0 || cut <= buffered.start(0)) return false;
    await new Promise<void>((resolve) => {
      buffer.addEventListener("updateend", () => resolve(), { once: true });
      buffer.remove(buffered.start(0), cut);
    });
    return true;
  }

  /** Keep a little footage buffered ahead of the playhead. */
  private async pump(): Promise<void> {
    const buffer = this.buffer;
    const media = this.media;
    if (!buffer || !media || buffer.updating || this.loading) return;
    if (media.readyState !== "open") return;
    const video = this.video();

    if (!this.carry) {
      const next = this.placed.find((p) => !this.appended.has(p.segment.path));
      if (!next) {
        if (this.accepted === 0) {
          // Everything was skipped, so there is nothing to play and nothing
          // that will ever say so on its own.
          this.message = "Keines der Segmente dieses Zeitraums ließ sich laden.";
          return;
        }
        try {
          media.endOfStream();
        } catch {
          // Already ended; nothing to do.
        }
        return;
      }

      if (video && this.appended.size > 0) {
        const bufferedEnd =
          video.buffered.length > 0
            ? video.buffered.end(video.buffered.length - 1)
            : 0;
        const lead = bufferedEnd - video.currentTime;
        if (lead > LOOKAHEAD_SEGMENTS * (this.placed[0]?.segment.duration ?? 0)) {
          return;
        }
      }

      const generation = this.generation;
      this.loading = true;
      try {
        const response = await this.fetchSegment(next.segment);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = new Uint8Array(await response.arrayBuffer());
        if (generation !== this.generation || !this.buffer) return;
        // Reset the parser before every new file. A segment cut short in the
        // middle of a write, which is what a recorder crash or camera reboot
        // leaves behind, parks the parser inside an unfinished media segment,
        // and from then on setting timestampOffset throws for every file that
        // follows. Measured with a real recording: one 58-second file that
        // the index believed was five minutes poisoned the rest of the run.
        this.buffer.abort();
        this.buffer.timestampOffset = next.mediaStart;
        this.appended.add(next.segment.path);
        this.carry = {
          path: next.segment.path,
          rest: data,
          firstOfSegment: true,
        };
      } catch (err) {
        // One unreadable segment must not end the playback: it is skipped and
        // shows up as a short jump, which is what the file actually is.
        this.appended.add(next.segment.path);
        // eslint-disable-next-line no-console
        console.warn(
          "kustos_vision: segment could not be fetched",
          next.segment.path,
          err,
        );
      } finally {
        this.loading = false;
      }
      if (!this.carry) {
        if (generation === this.generation) void this.pump();
        return;
      }
    }

    await this.drainCarry(video);
  }

  /** Append the carried segment slice by slice until done or full. */
  private async drainCarry(video: HTMLVideoElement | null): Promise<void> {
    const carry = this.carry;
    if (!carry || !this.buffer) return;
    const generation = this.generation;
    this.loading = true;
    try {
      while (carry.rest.length > 0) {
        const slice = carry.rest.subarray(0, APPEND_CHUNK_BYTES);
        try {
          await this.appendOnce(slice);
        } catch (err) {
          if (generation !== this.generation) return;
          if (isQuotaError(err)) {
            if (await this.evictBehind(video)) continue;
            // Nothing behind the playhead to give up. The rest of this
            // segment stays carried; the next timeupdate will have moved the
            // playhead and freed room.
            return;
          }
          // eslint-disable-next-line no-console
          console.warn(
            "kustos_vision: segment could not be appended",
            carry.path,
            err,
          );
          this.carry = undefined;
          return;
        }
        if (generation !== this.generation) return;
        carry.rest = carry.rest.subarray(slice.length);
        if (carry.firstOfSegment) {
          this.accepted += 1;
          carry.firstOfSegment = false;
          this.applyStartup();
        }
      }
      this.carry = undefined;
    } finally {
      this.loading = false;
    }
    if (generation === this.generation) {
      this.nudgeStalledSeek();
      void this.pump();
    }
  }

  /** Put the element where the run was asked to start, once data exists. */
  private applyStartup(): void {
    const startup = this.startup;
    if (!startup) return;
    this.startup = undefined;
    const video = this.video();
    if (!video) return;
    if (startup.mediaTime > 0) video.currentTime = startup.mediaTime;
    if (startup.resume) {
      // Restarting at a new spot swaps the element's source, and not every
      // browser resumes a swapped source by itself: Safari kept the controls
      // on "playing" while nothing moved, until pause and play were pressed
      // by hand.
      void video.play().catch(() => {
        // A refused play leaves the person one press away, which still beats
        // pretending.
      });
    }
  }

  /**
   * Unstick a seek whose data turned out not to exist.

   * A seek into the not-yet-fetched part waits for the pump; when the append
   * lands and the spot is still dry (a recording shorter than the index
   * believes), the element would wait forever, so it moves to the next
   * footage instead.
   */
  private nudgeStalledSeek(): void {
    const video = this.video();
    if (!video || !video.seeking) return;
    if (this.isBuffered(video, video.currentTime)) return;
    this.skipHole();
  }

  override render() {
    return html`
      <video controls playsinline></video>
      ${this.clockUtc !== undefined && !this.message && this.gapAt === undefined
        ? html`<div class="clock">${clockText(this.clockUtc)}</div>`
        : nothing}
      ${this.gapAt !== undefined
        ? html`<div class="gap">
            Um ${new Date(this.gapAt * 1000).toLocaleTimeString()} liegt keine
            Aufnahme vor.
          </div>`
        : nothing}
      ${this.message ? html`<div class="overlay">${this.message}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-player": CamwatchPlayer;
  }
}
