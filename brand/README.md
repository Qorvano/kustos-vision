# Brand files

| File | What it is |
|---|---|
| `kustos_vision.svg` | The logo: light metallic frame, blue lens. Drawn for dark backgrounds. The panel header embeds this file; the README shows it in dark mode. |
| `kustos_vision_on_light.svg` | The same logo with a solid dark frame (`#161A22`, the colour the logo's source names for its monochrome form), for light backgrounds. The README shows it in light mode. |
| `kustos_sidebar_vision.svg` | The monochrome form the sidebar icon is made of. `frontend/public/kustos-icons.js` carries it as one path string and registers it as `kustos_vision:vision`. |

The images Home Assistant's integration pages show live inside the
integration, in `custom_components/kustos_vision/brand/`: `icon.png` and
`icon@2x.png` for light themes, `dark_icon.png` and `dark_icon@2x.png` for
dark themes, rendered from the two SVGs above and trimmed to the drawing.
Since Home Assistant 2026.3 a custom integration ships its images that way and
they take priority over the central brands CDN; the CDN's repository no longer
accepts custom integrations. Square, so no separate logo images are needed.

To re-render after a change to the SVGs, crop to the drawing (viewBox
`52 51 408 408`) and rasterise at 256 and 512 pixels, for example with
`rsvg-convert -w 256 -h 256`.
