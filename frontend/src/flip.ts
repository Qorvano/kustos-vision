// The glide of a reordered list.
//
// Rows reorder by re-rendering, which on its own snaps them into place with
// no hint of what moved where. This plays the move instead: remember where
// every row sits before the order changes, and after the render let each row
// slide from its old place to its new one. Keyed rendering is a
// prerequisite, otherwise the rows have no identity to follow.

/* Long enough to read the motion, short enough to keep up with a pointer
   that is still dragging. */
const MOVE_MS = 150;

export class FlipList {
  private before = new Map<string, number>();

  /** Remember where every row sits, keyed by its data-key attribute. */
  snapshot(rows: Iterable<Element>): void {
    this.before.clear();
    for (const row of rows) {
      const key = (row as HTMLElement).dataset?.key;
      if (key !== undefined) {
        this.before.set(key, row.getBoundingClientRect().top);
      }
    }
  }

  /** Slide every remembered row from its old place to where it is now. */
  play(rows: Iterable<Element>): void {
    if (this.before.size === 0) return;
    for (const row of rows) {
      const key = (row as HTMLElement).dataset?.key;
      if (key === undefined) continue;
      const from = this.before.get(key);
      if (from === undefined) continue;
      const delta = from - row.getBoundingClientRect().top;
      if (delta === 0) continue;
      row.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: "none" }],
        { duration: MOVE_MS, easing: "ease-out" },
      );
    }
    this.before.clear();
  }
}
