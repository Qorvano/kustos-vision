// The panel's own dropdown, because the native one cannot be either styled
// or tamed: macOS grows its menu across the screen instead of scrolling it,
// and no CSS reaches its inside. This one is a filled field that opens a
// bordered popover with its own scrollbar, a search box when asked for one,
// and the keyboard behaviour a select owes its user.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { shared } from "../styles";

export interface SelectOption {
  value: string;
  label: string;
  /** Shown but not pickable, like a disabled <option>. */
  disabled?: boolean;
}

/** Case-insensitive substring match over the label, exported for tests. */
export function filterOptions(
  options: SelectOption[],
  query: string,
): SelectOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return options;
  return options.filter((o) => o.label.toLowerCase().includes(needle));
}

/* Breathing room to the viewport edge, so the panel never touches it. */
export const EDGE_MARGIN = 8;
/* Below this an option label is unreadable. A dropdown anchored to a 120px
   table cell still has to open wide enough to be used. */
const MIN_DROP_WIDTH = 200;

export interface DropViewport {
  width: number;
  height: number;
}

/** What the popover has to fit inside, as the eye sees it. */
export function viewportSize(): DropViewport {
  // The visual viewport, not the layout one: on a phone the soft keyboard
  // and the address bar take height away from what is actually visible,
  // and a list sized to window.innerHeight would run underneath both.
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };
}

/**
 * Where and how tall the popover may be, from the field's place on screen.
 *
 * The width follows the field, but never below what an option needs to be
 * read; both edges stay inside the viewport, which is what a phone needs
 * and a wide window never notices. The side with more room wins, and the
 * list scrolls inside that room instead of growing past the window - the
 * native menu's failing this component exists to fix.
 */
export function placeDrop(
  rect: { top: number; bottom: number; left: number; width: number },
  viewport: DropViewport,
  edgeMargin: number,
  minWidth = MIN_DROP_WIDTH,
): { up: boolean; maxHeight: number; left: number; width: number } {
  const below = viewport.height - rect.bottom - edgeMargin;
  const above = rect.top - edgeMargin;
  const up = above > below;
  const room = Math.max(viewport.width - 2 * edgeMargin, 0);
  const width = Math.min(
    Math.max(rect.width, Math.min(minWidth, room)),
    room,
  );
  const left = Math.min(
    Math.max(rect.left, edgeMargin),
    Math.max(viewport.width - width - edgeMargin, edgeMargin),
  );
  return { up, maxHeight: Math.max(up ? above : below, 0), left, width };
}

@customElement("kustos-vision-select")
export class CamwatchSelect extends LitElement {
  @property({ attribute: false }) options: SelectOption[] = [];
  @property() value = "";
  /** Show a search box in the popover; meant for long lists. */
  @property({ type: Boolean }) search = false;
  @property({ type: Boolean }) disabled = false;

  @state() private open = false;
  @state() private query = "";
  @state() private highlighted = -1;
  @state() private drop?: {
    up: boolean;
    maxHeight: number;
    left: number;
    width: number;
    anchorTop: number;
    anchorBottom: number;
    viewportHeight: number;
  };

  /** The viewport width when the popover opened, see onViewportChange. */
  private openWidth = 0;
  private repositionQueued = false;

  static override styles = [
    shared,
    css`
      :host {
        display: block;
        width: 100%;
        position: relative;
        /* shared's :host rules serve full-page views. */
        min-height: 0;
        background: none;
      }
      :host([compact]) .select-field {
        min-height: 0;
        padding: 4px 28px 4px 8px;
        font-size: 0.9em;
      }
      .drop {
        position: fixed;
        z-index: 100; /* above every layer the panel itself uses */
        display: flex;
        flex-direction: column;
        background: var(--ha-card-background, var(--card-background-color, Canvas));
        border: 1px solid var(--divider-color, ButtonBorder);
        border-radius: var(--kv-radius-card);
        /* A floating panel casts a dark shadow in both themes. */
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }
      .drop input {
        width: auto;
        margin: 8px;
        /* The search box is a rounded outline, the way Home Assistant draws
           it inside its own pickers. */
        border: 1px solid var(--divider-color, ButtonBorder);
        border-radius: var(--kv-radius-card);
        background: none;
      }
      .drop input:focus {
        border-color: var(--primary-color);
        box-shadow: none;
      }
      .list {
        overflow-y: auto;
        padding: 4px 0;
      }
      .item {
        padding: 10px 16px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item.highlighted {
        background: color-mix(in srgb, currentColor 10%, transparent);
      }
      .item.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
      }
      .item.disabled {
        color: var(--disabled-text-color, GrayText);
        cursor: default;
      }
      .empty {
        padding: 10px 16px;
        color: var(--secondary-text-color);
      }
    `,
  ];

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unlisten();
  }

  /** The label of the current value, for the closed field. */
  private currentLabel(): string {
    return this.options.find((o) => o.value === this.value)?.label ?? "";
  }

  private toggle(): void {
    if (this.disabled) return;
    if (this.open) this.close();
    else this.openDrop();
  }

  private measureDrop(): void {
    const field = this.renderRoot.querySelector(".select-field");
    if (!(field instanceof HTMLElement)) return;
    const rect = field.getBoundingClientRect();
    const view = viewportSize();
    // Gone from the screen: nothing left to hang the list under.
    if (rect.bottom < 0 || rect.top > view.height) {
      this.close();
      return;
    }
    this.drop = {
      ...placeDrop(rect, view, EDGE_MARGIN),
      anchorTop: rect.top,
      anchorBottom: rect.bottom,
      viewportHeight: view.height,
    };
  }

  private openDrop(): void {
    this.openWidth = viewportSize().width;
    this.measureDrop();
    if (!this.drop) return;
    this.query = "";
    this.highlighted = this.filtered().findIndex((o) => o.value === this.value);
    this.open = true;
    window.addEventListener("pointerdown", this.onOutsidePointer, true);
    window.addEventListener("scroll", this.onAnyScroll, true);
    window.addEventListener("resize", this.onViewportChange);
    window.visualViewport?.addEventListener("resize", this.onViewportChange);
    window.visualViewport?.addEventListener("scroll", this.onViewportChange);
    void this.updateComplete.then(() => {
      const search = this.renderRoot.querySelector(".drop input");
      if (search instanceof HTMLElement) search.focus();
      this.scrollHighlightIntoView();
    });
  }

  private close(): void {
    this.open = false;
    this.drop = undefined;
    this.unlisten();
  }

  private unlisten(): void {
    window.removeEventListener("pointerdown", this.onOutsidePointer, true);
    window.removeEventListener("scroll", this.onAnyScroll, true);
    window.removeEventListener("resize", this.onViewportChange);
    window.visualViewport?.removeEventListener("resize", this.onViewportChange);
    window.visualViewport?.removeEventListener("scroll", this.onViewportChange);
  }

  private scheduleReposition(): void {
    if (this.repositionQueued) return;
    this.repositionQueued = true;
    requestAnimationFrame(() => {
      this.repositionQueued = false;
      if (this.open) this.measureDrop();
    });
  }

  private onOutsidePointer = (event: Event): void => {
    if (!event.composedPath().includes(this)) this.close();
  };

  private onAnyScroll = (event: Event): void => {
    // The popover's own list may scroll; any other scroll moves the anchor,
    // so the list follows it instead of vanishing - closing here was what
    // made iOS's rubber-band swallow an open list.
    const target = event.target;
    if (target instanceof Node && this.renderRoot.contains(target)) return;
    this.scheduleReposition();
  };

  private onViewportChange = (): void => {
    // A soft keyboard takes height and leaves the width alone; closing on
    // that shuts the list the moment its own search field takes focus. A
    // rotation or a real window resize does move the width.
    if (viewportSize().width !== this.openWidth) {
      this.close();
      return;
    }
    this.scheduleReposition();
  };

  private filtered(): SelectOption[] {
    return filterOptions(this.options, this.query);
  }

  private pick(option: SelectOption): void {
    if (option.disabled) return;
    this.value = option.value;
    this.close();
    this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: option.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private move(step: number): void {
    const filtered = this.filtered();
    if (filtered.length === 0) return;
    const next = Math.min(
      Math.max(this.highlighted + step, 0),
      filtered.length - 1,
    );
    this.highlighted = next;
    this.scrollHighlightIntoView();
  }

  private scrollHighlightIntoView(): void {
    void this.updateComplete.then(() => {
      this.renderRoot
        .querySelector(".item.highlighted")
        ?.scrollIntoView({ block: "nearest" });
    });
  }

  private onKeydown(event: KeyboardEvent): void {
    if (!this.open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        this.openDrop();
      }
      return;
    }
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        this.close();
        break;
      case "ArrowDown":
        event.preventDefault();
        this.move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.move(-1);
        break;
      case "Enter": {
        event.preventDefault();
        const filtered = this.filtered();
        const chosen =
          filtered[this.highlighted] ??
          (filtered.length === 1 ? filtered[0] : undefined);
        if (chosen) this.pick(chosen);
        break;
      }
    }
  }

  private renderDrop() {
    if (!this.open || !this.drop) return nothing;
    const filtered = this.filtered();
    const style = [
      `left:${this.drop.left}px`,
      `width:${this.drop.width}px`,
      `max-height:${this.drop.maxHeight}px`,
      this.drop.up
        ? `bottom:${this.drop.viewportHeight - this.drop.anchorTop}px`
        : `top:${this.drop.anchorBottom}px`,
    ].join(";");
    return html`<div class="drop" style=${style} @keydown=${this.onKeydown}>
      ${this.search
        ? html`<input
            type="text"
            placeholder="Durchsuchen"
            .value=${this.query}
            @input=${(e: Event) => {
              this.query = (e.target as HTMLInputElement).value;
              this.highlighted = 0;
            }}
          />`
        : nothing}
      <div class="list" role="listbox">
        ${filtered.length === 0
          ? html`<div class="empty">Nichts gefunden.</div>`
          : filtered.map(
              (option, index) => html`<div
                class="item ${index === this.highlighted ? "highlighted" : ""} ${
                  option.value === this.value ? "selected" : ""
                } ${option.disabled ? "disabled" : ""}"
                role="option"
                aria-selected=${option.value === this.value ? "true" : "false"}
                aria-disabled=${option.disabled ? "true" : "false"}
                @pointerenter=${() => (this.highlighted = index)}
                @click=${() => this.pick(option)}
              >
                ${option.label}
              </div>`,
            )}
      </div>
    </div>`;
  }

  override render() {
    return html`
      <button
        type="button"
        class="select-field"
        ?disabled=${this.disabled}
        aria-haspopup="listbox"
        aria-expanded=${this.open ? "true" : "false"}
        @click=${this.toggle}
        @keydown=${this.onKeydown}
      >
        ${this.currentLabel() || html`&nbsp;`}
      </button>
      ${this.renderDrop()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-select": CamwatchSelect;
  }
}
