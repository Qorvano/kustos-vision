// The kustos_vision icon set for the Home Assistant front end.
//
// Loaded on every page through frontend.add_extra_js_url, not with the panel:
// the sidebar draws its icon long before anyone opens the panel, so the module
// that defines the icon has to be there first. HACS loads its own sidebar icon
// the same way.
//
// The drawing is the monochrome sidebar logo, brand/kustos_sidebar_vision.svg,
// flattened into one path string: each circle becomes two half arcs, and the
// iris ring keeps its hole because its inner arc runs the opposite way round.
// Home Assistant scales through the viewBox, so the coordinates stay the
// logo's own 512 grid instead of being rescaled to the 24 grid of MDI.
const VIEW_BOX = "0 0 512 512";

// The guardian frame: two brows and the two halves of the eye.
const FRAME = [
  "M 240 58 L 240 123 L 159 172 C 132 188 102 207 52 250 L 52 192 C 52 171 62 154 81 143 L 240 58 Z",
  "M 272 58 L 272 123 L 353 172 C 380 188 410 207 460 250 L 460 192 C 460 171 450 154 431 143 L 272 58 Z",
  "M 239 452 C 168 435 107 368 52 298 C 108 230 170 194 256 192 L 256 216 C 193 216 140 246 93 298 C 138 350 192 380 239 384 Z",
  "M 273 452 C 344 435 405 368 460 298 C 404 230 342 194 256 192 L 256 216 C 319 216 372 246 419 298 C 374 350 320 380 273 384 Z",
].join(" ");

// The lens: iris ring, pupil, and the highlight stroke.
const IRIS = [
  "M 256 226 A 66 66 0 1 1 255.99 226 Z M 256 254 A 38 38 0 1 0 256.01 254 Z",
  "M 238 292 A 18 18 0 1 0 274 292 A 18 18 0 1 0 238 292 Z",
  "M 214 250 L 235 270 L 229 276 L 208 256 Z",
].join(" ");

const ICONS = {
  vision: { path: `${FRAME} ${IRIS}`, viewBox: VIEW_BOX },
  guardian: { path: FRAME, viewBox: VIEW_BOX },
};

window.customIconsets = window.customIconsets || {};
window.customIconsets.kustos_vision = (name) => {
  const icon = ICONS[name];
  return icon
    ? Promise.resolve(icon)
    : Promise.reject(new Error(`kustos_vision has no icon "${name}"`));
};
