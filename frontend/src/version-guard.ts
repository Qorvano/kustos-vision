// Imported before anything else in the entry module, so this runs before any
// customElements.define call of this bundle.
//
// A page that has already run an older version of this bundle cannot take a
// newer one: custom elements can never be redefined, so the newer module dies
// on its first define and the OLD code silently stays in charge. That is
// exactly what happens to a tab that stays open across a Home Assistant
// restart after an update, because the frontend then imports the new module
// address into the old page. Seen in the live log as "the name
// 'kustos-vision-live-stream' has already been used with this registry". The
// only clean way out is a fresh page.

// At most one forced reload per half minute. If the page is genuinely broken,
// reloading it in a tight loop would make the browser unusable.
const RELOAD_LOOP_GUARD_MS = 30_000;
const KEY = "kustos-vision-reloaded";

if (customElements.get("kustos-vision-panel") !== undefined) {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0);
  } catch {
    // Storage can be unavailable; reloading without the guard still beats
    // silently showing an outdated panel.
  }
  if (Date.now() - last > RELOAD_LOOP_GUARD_MS) {
    try {
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      // See above.
    }
    location.reload();
  }
}

export {};
