# Brand files

| File | What it is |
|---|---|
| `kustos_vision.svg` | The logo: light metallic frame, blue lens. Drawn for dark backgrounds. The panel header embeds this file; the README shows it in dark mode. |
| `kustos_vision_on_light.svg` | The same logo with a solid dark frame (`#161A22`, the colour the logo's source names for its monochrome form), for light backgrounds. The README shows it in light mode. |
| `kustos_sidebar_vision.svg` | The monochrome form the sidebar icon is made of. `frontend/public/kustos-icons.js` carries it as one path string and registers it as `kustos_vision:vision`. |
| `custom_integrations/kustos_vision/` | The images Home Assistant's integration pages show, in the layout of the [home-assistant/brands](https://github.com/home-assistant/brands) repository: `icon.png` and `icon@2x.png` for light themes, `dark_icon.png` and `dark_icon@2x.png` for dark themes, trimmed to the drawing. Square, so no separate logo images are needed. |

Home Assistant loads integration images only from brands.home-assistant.io,
never from the integration itself. To get them there, copy the
`custom_integrations/kustos_vision` folder into the brands repository under the
same path and open a pull request.
