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
import { errorText } from "../api";
import { clockText } from "./player";
import type { HomeAssistant } from "../types";

type Mode = "idle" | "webrtc" | "hls" | "mjpeg" | "still" | "error";

/* Beyond this an HD stream shows only compression blocks, so more zoom
   would magnify artefacts, not information. */
const MAX_ZOOM = 8;
/* One comfortable notch per wheel click. */
const ZOOM_STEP = 1.2;

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
  /** Ticks once a second while a live picture is showing. */
  @state() private nowSeconds = 0;
  /** Whether the picture fills the screen, by whichever of the two routes. */
  @state() private expanded = false;
  /** Filling the screen without the browser's help: iPhone Safari and the
      companion app's web view have no fullscreen API for an element. */
  @property({ type: Boolean, reflect: true }) immersive = false;
  /** The loupe: how far in, and where the picture's origin sits. */
  @state() private zoom = { scale: 1, x: 0, y: 0 };

  /** The fingers or the mouse button currently on the picture. */
  private pointers = new Map<number, { x: number; y: number }>();
  /** What the loupe looked like when the current gesture began. */
  private gesture?: {
    scale: number;
    x: number;
    y: number;
    midX: number;
    midY: number;
    /** Distance between two fingers at the start; nothing for one. */
    span: number | null;
  };

  private clockTimer?: ReturnType<typeof setInterval>;

  private peer?: RTCPeerConnection;
  private unsubscribe?: () => Promise<void>;
  private observer?: IntersectionObserver;
  private visible = false;
  private starting = false;

  static override styles = css`
    :host {
      display: block;
      position: relative;
      /* The letterbox behind a 16:9 picture, dark in every theme for the
         same reason the player chrome is: it frames video, not text. */
      background: #111;
      aspect-ratio: 16 / 9;
      overflow: hidden;
    }
    /* Three ways to be the whole screen. Each needs its own rule: a
       selector list dies whole in a browser that does not know one of its
       parts, and :-webkit-full-screen is exactly such a part. */
    :host(:fullscreen) {
      /* The screen decides the shape now, not the tile. */
      aspect-ratio: auto;
      width: 100%;
      height: 100%;
      /* The loupe's fingers, not the browser's gestures. */
      touch-action: none;
    }
    :host(:-webkit-full-screen) {
      aspect-ratio: auto;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
    /* The screen, taken without the browser's help - for iPhone Safari and
       the companion app's web view, which have no fullscreen API for an
       element at all. */
    :host([immersive]) {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      /* Follows the address bar as it slides away. */
      height: 100dvh;
      z-index: 120;
      aspect-ratio: auto;
      touch-action: none;
      /* Nothing behind this may scroll while a finger pans the picture. */
      overscroll-behavior: contain;
    }
    .stage {
      position: absolute;
      inset: 0;
      /* The loupe's maths anchor at the top-left corner. */
      transform-origin: 0 0;
    }
    video,
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .zoombadge,
    .zoomhint {
      position: absolute;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 1;
    }
    .zoombadge {
      top: 8px;
      left: 8px;
      font-family: ui-monospace, monospace;
    }
    .zoomhint {
      /* Clear of the home indicator and the rounded corners. */
      bottom: calc(8px + env(safe-area-inset-bottom, 0px));
      left: calc(8px + env(safe-area-inset-left, 0px));
    }
    .zoomhint .coarse {
      display: none;
    }
    @media (pointer: coarse) {
      .zoomhint .fine {
        display: none;
      }
      .zoomhint .coarse {
        display: inline;
      }
    }
    .exit {
      position: absolute;
      /* Out from under the notch and the rounded corner. */
      top: calc(8px + env(safe-area-inset-top, 0px));
      right: calc(8px + env(safe-area-inset-right, 0px));
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      cursor: pointer;
    }
    /* The clock makes room for the exit button while it is on screen -
       one rule per fullscreen flavour, see above. */
    :host(:fullscreen) .clock {
      right: calc(64px + env(safe-area-inset-right, 0px));
    }
    :host(:-webkit-full-screen) .clock {
      right: calc(64px + env(safe-area-inset-right, 0px));
    }
    :host([immersive]) .clock {
      right: calc(64px + env(safe-area-inset-right, 0px));
      top: calc(8px + env(safe-area-inset-top, 0px));
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 8px;
      /* On the always-dark backdrop above, not on the theme's surface. */
      color: #ddd;
      font-size: 0.9em;
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
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    // The live clock is this machine's NTP-synchronised time, deliberately
    // not the camera's: their clocks drift without a time source, which is
    // exactly why the picture no longer carries one.
    this.nowSeconds = Date.now() / 1000;
    this.clockTimer = setInterval(() => {
      this.nowSeconds = Date.now() / 1000;
    }, 1000);
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
    this.addEventListener("fullscreenchange", this.onFullscreenChange);
    // Belt to the element listener's braces: some engines deliver the
    // change only at the document level for elements inside shadow roots,
    // and older WebKit only under its prefix.
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this.onFullscreenChange);
    // The wheel listener is registered in setExpanded, only while the
    // picture owns the screen: an idle tile holding a non-passive wheel
    // listener slows scrolling over the whole grid.
    this.addEventListener("dblclick", this.onDoubleClick);
    this.addEventListener("pointerdown", this.onPointerDown);
    this.addEventListener("pointermove", this.onPointerMove);
    this.addEventListener("pointerup", this.onPointerUp);
    this.addEventListener("pointercancel", this.onPointerUp);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.clockTimer !== undefined) clearInterval(this.clockTimer);
    this.clockTimer = undefined;
    this.observer?.disconnect();
    this.observer = undefined;
    this.removeEventListener("fullscreenchange", this.onFullscreenChange);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    document.removeEventListener(
      "webkitfullscreenchange",
      this.onFullscreenChange,
    );
    this.leaveImmersive(false);
    this.removeEventListener("wheel", this.onWheel);
    this.removeEventListener("dblclick", this.onDoubleClick);
    this.removeEventListener("pointerdown", this.onPointerDown);
    this.removeEventListener("pointermove", this.onPointerMove);
    this.removeEventListener("pointerup", this.onPointerUp);
    this.removeEventListener("pointercancel", this.onPointerUp);
    this.stop();
  }

  // --------------------------------------------------------------------
  // Fullscreen and the loupe
  // --------------------------------------------------------------------

  /**
   * Whether this very element natively fills the screen.
   *
   * document.fullscreenElement is retargeted at shadow boundaries and
   * answers with the outermost host, never with an element nested in
   * shadow roots like this one; the containing root's view is the one
   * that names this element itself. Older WebKit only has the prefixed,
   * unretargeted answer.
   */
  private isNativeFullscreen(): boolean {
    const root = this.getRootNode();
    const viaRoot =
      root instanceof ShadowRoot
        ? root.fullscreenElement
        : document.fullscreenElement;
    if (viaRoot === this) return true;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
    };
    return doc.webkitFullscreenElement === this;
  }

  private nativeFullscreenAvailable(): boolean {
    const doc = document as Document & { webkitFullscreenEnabled?: boolean };
    const el = this as HTMLElement & {
      webkitRequestFullscreen?: () => unknown;
    };
    if (typeof el.requestFullscreen === "function" && document.fullscreenEnabled) {
      return true;
    }
    return (
      typeof el.webkitRequestFullscreen === "function" &&
      doc.webkitFullscreenEnabled === true
    );
  }

  /** Fill the screen with this picture, or step back out of it. */
  async toggleFullscreen(): Promise<void> {
    if (this.expanded) {
      this.collapse();
      return;
    }
    if (this.nativeFullscreenAvailable()) {
      try {
        const el = this as HTMLElement & {
          webkitRequestFullscreen?: () => unknown;
        };
        await (typeof el.requestFullscreen === "function"
          ? el.requestFullscreen({ navigationUI: "hide" })
          : el.webkitRequestFullscreen?.());
        // The state decides, not the promise: a web view whose host app
        // does not implement fullscreen resolves it and shows nothing.
        if (this.isNativeFullscreen()) return;
      } catch {
        // Refused. The picture still has to fill the screen.
      }
    }
    this.enterImmersive();
  }

  private collapse(): void {
    if (this.immersive) {
      this.leaveImmersive(true);
      return;
    }
    const doc = document as Document & { webkitExitFullscreen?: () => void };
    if (typeof document.exitFullscreen === "function") {
      void document.exitFullscreen();
    } else {
      doc.webkitExitFullscreen?.();
    }
  }

  private enterImmersive(): void {
    this.immersive = true;
    this.setExpanded(true);
    window.addEventListener("keydown", this.onImmersiveKey, true);
    window.addEventListener("popstate", this.onImmersivePop);
    // One history entry, so a phone's back gesture leaves the picture
    // rather than the panel; popped again on the way out.
    history.pushState({ ...(history.state ?? {}), kvImmersive: true }, "");
  }

  private leaveImmersive(viaUi: boolean): void {
    if (!this.immersive) return;
    this.immersive = false;
    window.removeEventListener("keydown", this.onImmersiveKey, true);
    window.removeEventListener("popstate", this.onImmersivePop);
    this.setExpanded(false);
    const state = history.state as { kvImmersive?: boolean } | null;
    if (viaUi && state?.kvImmersive) history.back();
  }

  private onImmersiveKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.leaveImmersive(true);
    }
  };

  private onImmersivePop = (): void => this.leaveImmersive(false);

  /** Both routes to the screen meet here; the loupe lives and dies with it. */
  private setExpanded(on: boolean): void {
    if (this.expanded === on) return;
    this.expanded = on;
    if (on) {
      // passive:false, because zooming must keep the wheel from scrolling.
      this.addEventListener("wheel", this.onWheel, { passive: false });
    } else {
      this.removeEventListener("wheel", this.onWheel);
      // Back in the wall of tiles a magnified crop would masquerade as the
      // whole picture.
      this.zoom = { scale: 1, x: 0, y: 0 };
    }
  }

  private onFullscreenChange = (): void => {
    this.setExpanded(this.isNativeFullscreen() || this.immersive);
  };

  /** Keep the picture covering the box: no gaps past any edge. */
  private clampedZoom(scale: number, x: number, y: number) {
    const rect = this.getBoundingClientRect();
    return {
      scale,
      x: Math.min(0, Math.max(rect.width * (1 - scale), x)),
      y: Math.min(0, Math.max(rect.height * (1 - scale), y)),
    };
  }

  private onWheel = (event: WheelEvent): void => {
    if (!this.expanded) return;
    event.preventDefault();
    const { scale, x, y } = this.zoom;
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const next = Math.min(MAX_ZOOM, Math.max(1, scale * factor));
    if (next === scale) return;
    // The spot under the pointer stays under the pointer.
    const rect = this.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const ratio = next / scale;
    this.zoom = this.clampedZoom(
      next,
      px - (px - x) * ratio,
      py - (py - y) * ratio,
    );
  };

  private onDoubleClick = (): void => {
    if (!this.expanded) return;
    this.zoom = { scale: 1, x: 0, y: 0 };
  };

  /** Where the fingers meet and how far apart they are, element-local. */
  private pointerAnchor(): { midX: number; midY: number; span: number | null } {
    const rect = this.getBoundingClientRect();
    const points = [...this.pointers.values()];
    const midX = points.reduce((s, p) => s + p.x, 0) / points.length - rect.left;
    const midY = points.reduce((s, p) => s + p.y, 0) / points.length - rect.top;
    const span =
      points.length >= 2
        ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
        : null;
    return { midX, midY, span };
  }

  /** Every added or lifted finger starts the gesture over from the current
      zoom, which is what lets a pinch hand over to a one-finger pan. */
  private rebaseGesture(): void {
    if (this.pointers.size === 0) {
      this.gesture = undefined;
      return;
    }
    this.gesture = { ...this.zoom, ...this.pointerAnchor() };
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.expanded) return;
    // A tap on the exit button is a click, not a gesture; capturing its
    // pointer here would swallow the click before the button sees it.
    const origin = event.composedPath()[0];
    if (origin instanceof HTMLElement && origin.closest(".exit")) return;
    // One finger moves an already magnified picture; a second one, or the
    // wheel, is what magnifies. An unzoomed single tap stays untouched so
    // a double tap can still reach the reset.
    if (this.pointers.size === 0 && this.zoom.scale === 1 && event.pointerType === "mouse") {
      return;
    }
    this.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.rebaseGesture();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const base = this.gesture;
    if (!base) return;
    const now = this.pointerAnchor();
    let scale = base.scale;
    if (base.span !== null && now.span !== null && base.span > 0) {
      scale = Math.min(MAX_ZOOM, Math.max(1, base.scale * (now.span / base.span)));
    } else if (base.scale === 1) {
      // A single finger on an unmagnified picture has nothing to move.
      return;
    }
    // The picture point that sat between the fingers stays between them.
    const ratio = scale / base.scale;
    this.zoom = this.clampedZoom(
      scale,
      now.midX - (base.midX - base.x) * ratio,
      now.midY - (base.midY - base.y) * ratio,
    );
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.pointers.delete(event.pointerId)) return;
    this.rebaseGesture();
  };

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
    this.message = errorText(err);
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
    const live = ["webrtc", "hls", "mjpeg"].includes(this.mode);
    const { scale, x, y } = this.zoom;
    return html`<div
      class="stage"
      style="transform: translate(${x}px, ${y}px) scale(${scale}); cursor: ${
        this.expanded && scale > 1 ? "grab" : "default"
      }"
    >
      ${this.renderPicture()}
    </div>
    ${live ? html`<div class="clock">${clockText(this.nowSeconds)}</div>` : nothing}
    ${this.expanded
      ? html`<button
          class="exit"
          title="Vollbild verlassen"
          @click=${() => void this.toggleFullscreen()}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M14,14H19V16H16V19H14V14M5,14H10V19H8V16H5V14M8,5H10V10H5V8H8V5M19,8V10H14V5H16V8H19Z"
            />
          </svg>
        </button>`
      : nothing}
    ${scale > 1
      ? html`<div class="zoombadge">${scale.toFixed(1)}×</div>`
      : nothing}
    ${this.expanded && scale === 1
      ? html`<div class="zoomhint">
          <span class="fine"
            >Mausrad: Lupe · Ziehen: verschieben · Doppelklick: zurücksetzen ·
            Esc: verlassen</span
          >
          <span class="coarse"
            >Zwei Finger: Lupe · Ziehen: verschieben · Doppeltipp:
            zurücksetzen · Kreuz oben rechts: verlassen</span
          >
        </div>`
      : nothing}`;
  }

  private renderPicture() {
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
