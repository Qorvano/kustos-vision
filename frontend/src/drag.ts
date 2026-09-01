// The shared mechanics of dragging a row through a list.
//
// Two things every sortable list here needs and none should reinvent: the
// drop position taken from where the rows actually are - rows wrap on a
// phone, so no uniform height may be assumed - and a nudge that keeps the
// surrounding scroller moving while the finger rests against its edge,
// without which a list longer than the screen cannot be sorted on a phone
// at all.

/** Which row the pointer is over, from where the rows actually are. */
export function dropIndexAt(
  rows: { top: number; bottom: number }[],
  clientY: number,
  current: number,
): number {
  if (rows.length === 0) return current;
  let index = current;
  rows.forEach((row, i) => {
    if (clientY >= row.top && clientY <= row.bottom) index = i;
  });
  if (clientY < rows[0].top) index = 0;
  if (clientY > rows[rows.length - 1].bottom) index = rows.length - 1;
  return index;
}

/** The nearest ancestor that scrolls, across shadow boundaries. */
export function scrollParentOf(node: Element): Element | null {
  let current: Node | null = node;
  for (;;) {
    current =
      current instanceof ShadowRoot ? current.host : current.parentNode;
    if (!current) return null;
    if (!(current instanceof Element)) continue;
    const style = getComputedStyle(current);
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
  }
}

/* How close to a scroller's edge a drag starts nudging it, and by how much
   per event: slow enough to aim, fast enough to cross a long list. */
const EDGE_ZONE_PX = 48;
const EDGE_STEP_PX = 8;

/** Nudge the scroller while a drag rests against one of its edges. */
export function edgeAutoscroll(scroller: Element, clientY: number): void {
  const rect = scroller.getBoundingClientRect();
  if (clientY < rect.top + EDGE_ZONE_PX) {
    scroller.scrollTop -= EDGE_STEP_PX;
  } else if (clientY > rect.bottom - EDGE_ZONE_PX) {
    scroller.scrollTop += EDGE_STEP_PX;
  }
}
