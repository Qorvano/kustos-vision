import { css } from "lit";

// One place for the look, so the views stay about behaviour. Everything is
// expressed through Home Assistant's own theme variables, which is what makes
// the panel follow whatever theme the user has picked instead of fighting it.
// Where a chain needs a last-resort fallback for a real surface, it ends on a
// CSS system colour (Canvas, Field, ButtonBorder): those follow the page's
// light/dark scheme, so a theme that omits a variable never paints a
// light-mode value onto a dark page.
export const shared = css`
  :host {
    /* The geometry the panel repeats, named once. Each maps onto Home
       Assistant's own variable where the theme system has one, so a theme
       that customises it moves the panel with it. */
    --kv-radius-card: var(--ha-card-border-radius, 12px);
    /* Pill-shaped, like Home Assistant's own buttons. */
    --kv-radius-button: 9999px;
    --kv-radius-field: 4px;
    /* Home Assistant's own content cap: ha-config-section centres its
       content at this width, so settings pages here do the same. */
    --kv-content-max-width: 1040px;
    display: block;
    color: var(--primary-text-color);
    background: var(--primary-background-color);
    min-height: 100%;
  }
  .card {
    background: var(--ha-card-background, var(--card-background-color, Canvas));
    border-radius: var(--kv-radius-card);
    /* Home Assistant's cards carry a border and no shadow; the permanent
       drop shadow was what made these read as foreign at first glance. */
    border: var(--ha-card-border-width, 1px) solid
      var(--ha-card-border-color, var(--divider-color, ButtonBorder));
    box-shadow: var(--ha-card-box-shadow, none);
    padding: 16px;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 1.15em;
    font-weight: 500;
  }
  h3 {
    margin: 20px 0 8px;
    font-size: 1em;
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  p.hint {
    margin: 4px 0 12px;
    color: var(--secondary-text-color);
    font-size: 0.9em;
    line-height: 1.4;
  }
  button {
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: var(--kv-radius-button);
    padding: 8px 16px;
    min-height: 36px;
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  /* The hover state layer Home Assistant's buttons draw, as a neutral tint
     that works on filled and outlined variants in either theme. */
  button:hover:not(:disabled) {
    box-shadow: inset 0 0 0 999px rgba(127, 127, 127, 0.14);
  }
  button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  button.secondary {
    background: transparent;
    border-color: var(--divider-color, ButtonBorder);
    color: var(--primary-color);
  }
  button.danger {
    /* Red text on a quiet outline is how Home Assistant renders destructive
       actions; it also keeps rows of delete buttons from becoming a wall of
       red slabs. */
    background: transparent;
    border-color: var(--divider-color, ButtonBorder);
    color: var(--error-color, #db4437);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
    box-shadow: none;
  }
  /* Controls that sit under a camera picture and must not push it around. */
  button.compact {
    min-height: 0;
    min-width: 36px;
    padding: 6px 10px;
    font-size: 0.9em;
  }
  label {
    display: block;
    margin: 10px 0 4px;
    font-size: 0.85em;
    color: var(--secondary-text-color);
  }
  input:not([type="checkbox"]),
  select {
    font: inherit;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: none;
    /* Longhands on purpose: as a shorthand, an unset --divider-color would
       reset border-style along with it and leave no line at all. */
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: var(
      --mdc-text-field-idle-line-color,
      var(--divider-color, ButtonBorder)
    );
    border-radius: var(--kv-radius-field) var(--kv-radius-field) 0 0;
    /* Filled with an underline, like Home Assistant's text fields. The old
       card-coloured outlined box disappeared into the card it sat on. */
    background: var(
      --mdc-text-field-fill-color,
      var(--secondary-background-color, Field)
    );
    color: var(--primary-text-color, FieldText);
  }
  input:not([type="checkbox"]):focus,
  select:focus {
    outline: none;
    /* The second pixel of the focused underline, drawn without changing the
       box so nothing shifts when a field takes focus. */
    border-bottom-color: var(--primary-color);
    box-shadow: inset 0 -1px 0 0 var(--primary-color);
  }
  /* A checkbox wearing Home Assistant's switch: same element, same events,
     native look. The variables are the ones themes set for ha-switch; the
     checked track falls back to the primary colour at the opacity the
     original switch uses. */
  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 36px;
    height: 14px;
    margin: 3px 2px;
    flex: none;
    vertical-align: middle;
    border-radius: 7px;
    background: var(--switch-unchecked-track-color, rgba(127, 127, 127, 0.5));
    position: relative;
    cursor: pointer;
  }
  input[type="checkbox"]::after {
    content: "";
    position: absolute;
    top: -3px;
    left: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--switch-unchecked-button-color, ButtonFace);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    transition:
      left 90ms ease,
      background-color 90ms ease;
  }
  input[type="checkbox"]:checked {
    background: var(
      --switch-checked-track-color,
      color-mix(in srgb, var(--primary-color) 54%, transparent)
    );
  }
  input[type="checkbox"]:checked::after {
    left: 16px;
    background: var(--switch-checked-button-color, var(--primary-color));
  }
  input[type="checkbox"]:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 4px;
  }
  input[type="checkbox"]:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  .grow {
    flex: 1;
    min-width: 160px;
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color, #db4437);
  }
  /* A list row with the divider the settings lists repeat. */
  .divided {
    padding: 12px 0;
    border-bottom: 1px solid var(--divider-color, ButtonBorder);
  }
  /* Section switcher, the way Home Assistant marks a selection: a bar on a
     shared baseline, never a filled pill. This is the page-background
     variant; the panel's header tabs are the coloured one. */
  .subtabs {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--divider-color, ButtonBorder);
    margin-bottom: 16px;
  }
  .subtabs::-webkit-scrollbar {
    display: none;
  }
  .subtabs button {
    background: none;
    border: none;
    border-radius: 0;
    color: var(--secondary-text-color);
    height: 44px;
    min-height: 0;
    padding: 0 16px;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    /* Sits on the container's own baseline instead of 1px above it. */
    margin-bottom: -1px;
  }
  .subtabs button:hover:not(:disabled) {
    color: var(--primary-text-color);
    box-shadow: none;
  }
  .subtabs button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td,
  th {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid var(--divider-color, ButtonBorder);
    font-weight: normal;
  }
  th {
    color: var(--secondary-text-color);
    font-size: 0.85em;
  }
`;
