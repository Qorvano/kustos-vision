// Live video without any third-party player.
//
// Home Assistant's own APIs cover every case, so nothing here depends on
// another integration or a community card:
//
//   1. WebRTC via camera/webrtc/*, which is sub-second and, on Home Assistant
//      OS, served by the go2rtc that ships with core.
//   2. Native HLS via camera/stream, for cameras that only offer that. Only
//      Safari plays HLS in a plain <video>, so this is offered exactly when
//      the browser says it can.
//   3. MJPEG via /api/camera_proxy_stream, which works in every browser. It is
//      last because it costs the Home Assistant machine real work per viewer,
//      unlike the two above.
//
// A tile that is not on screen never opens a stream. Without that, a view with
// eight cameras would hold eight connections open at once.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant } from "../types";

type Mode = "idle" | "webrtc" | "hls" | "mjpeg" | "still" | "error";

interface Capabilities {
  frontend_stream_types: string[];
}

interface WebRtcClientConfig {
  configuration: RTCConfiguration;
}

@customElement("kustos-vision-live-stream")
export class CamwatchLiveStream extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property() entityId = "";
  @property({ type: Boolean }) muted = true;

  @state() private mode: Mode = "idle";
  @state() private message = "";

  private peer?: RTCPeerConnection;
  private unsubscribe?: () => Promise<void>;
  private observer?: IntersectionObserver;
  private visible = false;
  private starting = false;

  static override styles = css`
    :host {
      display: block;
      position: relative;
      background: var(--secondary-background-color, #222);
      aspect-ratio: 16 / 9;
      overflow: hidden;
    }
    video,
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 8px;
      color: var(--secondary-text-color, #bbb);
      font-size: 0.9em;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    // Streaming only while on screen keeps a wall of cameras from opening a
    // connection per tile.
    this.observer = new IntersectionObserver((entries) => {
      const nowVisible = entries.some((e) => e.isIntersecting);
      if (nowVisible === this.visible) return;
      this.visible = nowVisible;
      if (nowVisible) void this.start();
      else this.stop();
    });
    this.observer.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.observer = undefined;
    this.stop();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("entityId") && this.visible) {
      this.stop();
      void this.start();
    }
  }

  private get accessToken(): string | undefined {
    const attributes = this.hass?.states?.[this.entityId]?.attributes;
    return attributes?.access_token as string | undefined;
  }

  private async start(): Promise<void> {
    if (this.starting || !this.entityId || !this.hass) return;
    this.starting = true;
    try {
      const caps = await this.hass.callWS<Capabilities>({
        type: "camera/capabilities",
        entity_id: this.entityId,
      });
      const types = caps.frontend_stream_types ?? [];

      if (types.includes("web_rtc") && (await this.startWebRtc())) return;
      if (types.includes("hls") && (await this.startHls())) return;
      this.startMjpeg();
    } catch (err) {
      this.fail(err);
    } finally {
      this.starting = false;
    }
  }

  private stop(): void {
    void this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.peer?.close();
    this.peer = undefined;
    const video = this.renderRoot.querySelector("video");
    if (video) {
      video.srcObject = null;
      video.removeAttribute("src");
    }
    this.mode = "idle";
  }

  private fail(err: unknown): void {
    this.mode = "error";
    this.message = err instanceof Error ? err.message : String(err);
  }

  // --------------------------------------------------------------------
  // WebRTC
  // --------------------------------------------------------------------

  private async startWebRtc(): Promise<boolean> {
    try {
      const config = await this.hass.callWS<WebRtcClientConfig>({
        type: "camera/webrtc/get_client_config",
        entity_id: this.entityId,
      });

      const peer = new RTCPeerConnection(config.configuration);
      this.peer = peer;
      // Receive-only: the panel never sends media to the camera.
      peer.addTransceiver("video", { direction: "recvonly" });
      peer.addTransceiver("audio", { direction: "recvonly" });

      const stream = new MediaStream();
      peer.addEventListener("track", (event) => {
        stream.addTrack(event.track);
        const video = this.renderRoot.querySelector("video");
        if (video) video.srcObject = stream;
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      let sessionId: string | undefined;
      peer.addEventListener("icecandidate", (event) => {
        if (!event.candidate || !sessionId) return;
        void this.hass.callWS({
          type: "camera/webrtc/candidate",
          entity_id: this.entityId,
          session_id: sessionId,
          candidate: event.candidate.toJSON(),
        });
      });

      this.mode = "webrtc";
      // camera/webrtc/offer is a subscription, not a plain call: the answer
      // and the camera's ICE candidates arrive as later events.
      this.unsubscribe = await this.subscribe(
        {
          type: "camera/webrtc/offer",
          entity_id: this.entityId,
          offer: offer.sdp,
        },
        (msg) => {
          if (msg.type === "session") {
            sessionId = msg.session_id as string;
          } else if (msg.type === "answer") {
            void peer.setRemoteDescription({
              type: "answer",
              sdp: msg.answer as string,
            });
          } else if (msg.type === "candidate") {
            void peer.addIceCandidate(
              msg.candidate as RTCIceCandidateInit,
            );
          } else if (msg.type === "error") {
            this.fail(new Error(String(msg.message)));
          }
        },
      );
      return true;
    } catch {
      // Not an error worth showing: the next transport is tried immediately.
      this.peer?.close();
      this.peer = undefined;
      return false;
    }
  }

  private subscribe(
    message: Record<string, unknown>,
    onEvent: (msg: Record<string, unknown>) => void,
  ): Promise<() => Promise<void>> {
    const connection = this.hass.connection as unknown as {
      subscribeMessage: (
        cb: (msg: Record<string, unknown>) => void,
        msg: Record<string, unknown>,
      ) => Promise<() => Promise<void>>;
    };
    return connection.subscribeMessage(onEvent, message);
  }

  // --------------------------------------------------------------------
  // HLS and MJPEG
  // --------------------------------------------------------------------

  private async startHls(): Promise<boolean> {
    const probe = document.createElement("video");
    // Only Safari plays HLS in a plain video element. Shipping a JavaScript
    // HLS player would mean bundling someone else's, so other browsers fall
    // through to MJPEG instead.
    if (!probe.canPlayType("application/vnd.apple.mpegurl")) return false;

    try {
      const { url } = await this.hass.callWS<{ url: string }>({
        type: "camera/stream",
        entity_id: this.entityId,
        format: "hls",
      });
      this.mode = "hls";
      await this.updateComplete;
      const video = this.renderRoot.querySelector("video");
      if (video) {
        video.src = this.hass.hassUrl(url);
        void video.play().catch(() => undefined);
      }
      return true;
    } catch {
      return false;
    }
  }

  private startMjpeg(): void {
    this.mode = this.accessToken ? "mjpeg" : "still";
  }

  // --------------------------------------------------------------------

  override render() {
    const token = this.accessToken;
    switch (this.mode) {
      case "webrtc":
      case "hls":
        return html`<video autoplay playsinline .muted=${this.muted}></video>`;
      case "mjpeg":
        return html`<img
          alt=""
          src=${this.hass.hassUrl(
            `/api/camera_proxy_stream/${this.entityId}?token=${token}`,
          )}
        />`;
      case "still":
        return token
          ? html`<img
              alt=""
              src=${this.hass.hassUrl(
                `/api/camera_proxy/${this.entityId}?token=${token}`,
              )}
            />`
          : html`<div class="overlay">Kein Vorschaubild verfügbar</div>`;
      case "error":
        return html`<div class="overlay">${this.message}</div>`;
      default:
        return html`<div class="overlay">…</div>${nothing}`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-live-stream": CamwatchLiveStream;
  }
}
