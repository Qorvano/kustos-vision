import type { ControlKind } from "./types";

// Readable names for the capability slots.
//
// The keys are identifiers: stable, lowercase, and meaningless to anyone who
// has not read the source. Showing them in the panel made the user read
// "ptz_up" where "Schwenken hoch" belongs.

export const CAPABILITY_LABELS: Record<string, string> = {
  ptz_up: "Schwenken hoch",
  ptz_down: "Schwenken runter",
  ptz_left: "Schwenken links",
  ptz_right: "Schwenken rechts",
  ptz_preset: "Position anfahren",
  ptz_patrol: "Patrouille",
  light: "Licht",
  light_brightness: "Helligkeit",
  siren: "Sirene",
  siren_on: "Sirene ein",
  siren_off: "Sirene aus",
  night_vision: "Nachtsicht",
  privacy_mode: "Privatsphäre",
  motion_trigger: "Bewegungsmelder",
};

/**
 * A capability's label, falling back to a tidied key.
 *
 * The fallback matters: the backend decides which capabilities exist, so a
 * newer version can offer one this panel has never heard of. Showing it
 * readably beats hiding it or printing a raw identifier.
 */
export function capabilityLabel(key: string): string {
  const known = CAPABILITY_LABELS[key];
  if (known) return known;
  const readable = key.replace(/_/g, " ");
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

/** Short symbols for the four movement buttons on a tile. */
export const PTZ_SYMBOLS: Record<string, string> = {
  ptz_up: "▲",
  ptz_down: "▼",
  ptz_left: "◀",
  ptz_right: "▶",
};


/**
 * The ways an entity can be operated, most obvious first.
 *
 * Mirrors KINDS_BY_DOMAIN on the Python side, which refuses a control its
 * entity cannot perform. Offering the impossible choice here and letting the
 * save fail would be a worse way to say the same thing.
 *
 * An empty result means no restriction: no entity, or a domain neither side
 * knows, where guessing would block something that works.
 */
export function kindsForEntity(entityId: string | undefined): ControlKind[] {
  if (!entityId || !entityId.includes(".")) return [];
  const byDomain: Record<string, ControlKind[]> = {
    button: ["button"],
    scene: ["button"],
    script: ["button"],
    switch: ["switch", "button"],
    light: ["switch", "button"],
    siren: ["switch", "button"],
    fan: ["switch", "button"],
    input_boolean: ["switch", "button"],
    select: ["select"],
    input_select: ["select"],
    number: ["number"],
    input_number: ["number"],
  };
  return byDomain[entityId.split(".", 1)[0]] ?? [];
}

export const KIND_LABELS: Record<ControlKind, string> = {
  button: "Knopf",
  switch: "An/Aus",
  select: "Auswahl",
  number: "Wert",
};
