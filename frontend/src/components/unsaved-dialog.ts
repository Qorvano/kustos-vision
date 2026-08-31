// The question the navigation guard asks, in Home Assistant's dialog shape:
// a dimmed page, a centred card, and the three honest answers to leaving
// with unsaved work.

import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { shared } from "../styles";
import type { UnsavedChoice } from "../dirty";

@customElement("kustos-vision-unsaved-dialog")
export class CamwatchUnsavedDialog extends LitElement {
  @state() private open = false;
  private resolve?: (choice: UnsavedChoice) => void;

  static override styles = [
    shared,
    css`
      :host {
        min-height: 0;
        background: none;
      }
      .scrim {
        position: fixed;
        inset: 0;
        /* Above every layer the panel uses, the dropdown popover included. */
        z-index: 110;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
      }
      .box {
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        color: var(--primary-text-color, CanvasText);
        border-radius: var(--kv-radius-card);
        border: 1px solid var(--divider-color, ButtonBorder);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        max-width: 420px;
        width: calc(100% - 32px);
        padding: 20px 24px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 8px;
        font-size: 20px;
        font-weight: 400;
      }
      p {
        margin: 0 0 20px;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
    `,
  ];

  /** Show the dialog; resolves with what the person decided. */
  ask(): Promise<UnsavedChoice> {
    // A second question while one is open answers the first as "stay".
    this.resolve?.("cancel");
    this.open = true;
    return new Promise((resolve) => {
      this.resolve = resolve;
      void this.updateComplete.then(() => {
        const first = this.renderRoot.querySelector("button");
        if (first instanceof HTMLElement) first.focus();
      });
    });
  }

  private answer(choice: UnsavedChoice): void {
    this.open = false;
    this.resolve?.(choice);
    this.resolve = undefined;
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.answer("cancel");
    }
  }

  override render() {
    if (!this.open) return nothing;
    return html`<div
      class="scrim"
      @keydown=${this.onKeydown}
      @click=${(e: Event) => {
        if (e.target === e.currentTarget) this.answer("cancel");
      }}
    >
      <div class="box" role="alertdialog" aria-modal="true">
        <h2>Ungespeicherte Änderungen</h2>
        <p>
          Hier gibt es Änderungen, die noch nicht gespeichert sind. Sollen sie
          gespeichert werden?
        </p>
        <div class="buttons">
          <button @click=${() => this.answer("save")}>Speichern</button>
          <button class="danger" @click=${() => this.answer("discard")}>
            Nicht speichern
          </button>
          <button class="secondary" @click=${() => this.answer("cancel")}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-unsaved-dialog": CamwatchUnsavedDialog;
  }
}
