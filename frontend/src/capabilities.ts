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
