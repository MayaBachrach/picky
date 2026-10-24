# PICKY

**Pick a color. Copy its value. Keep it close.**

A compact Chrome extension by **Maya Bachrach**, built with plain JavaScript, HTML, and CSS. Current extension version: **0.4.6**.

## What it does

- Samples colors with Chrome's native EyeDropper, closing the popup so the area beneath it stays accessible.
- Copies the selected HEX automatically and offers RGB/HSL copy actions.
- Saves up to 15 colors locally, showing five at a time in a single-row viewport.
- Offers optional auto-pick on toolbar click, disabled by default.
- Uses a compact hot-pink interface with feedback beside the selected value and a stable status row.

No account, build step, package installation, backend, or analytics is needed to use this version.

## Install in Chrome

Requires Chrome **127 or newer**. This repository provides a local installation; it does not imply a Chrome Web Store release.

1. Select **Code → Download ZIP** on this repository and extract it to a permanent folder.
2. Open `chrome://extensions`.
3. Enable **Developer mode**, then select **Load unpacked**.
4. Select the extracted folder containing `manifest.json`.
5. Pin PICKY to the toolbar and open it on a regular HTTPS page.

To update an existing local installation, replace the files in the same loaded folder and click **Reload**. Keep the folder path unchanged to preserve the extension's local identity and saved colors. Removing the extension can remove its local data.

## Use it

Click **Pick from page**, choose a screen color, and find its HEX in your clipboard. Use **Save color** to keep it in your palette. Click a saved swatch to select it; use its × to remove it. Click the copy icon or an RGB/HSL row to copy that value.

Enable **Auto-pick on open** if you want a toolbar click to start selection immediately. Press Escape to cancel native selection.

## Read the project

| Guide | Contents |
| --- | --- |
| [Product decisions](docs/PRODUCT.md) | Problem, design choices, iteration, and authorship |
| [Architecture](docs/ARCHITECTURE.md) | File map, picker lifecycle, storage, permissions, and layout |
| [Validation](docs/VALIDATION.md) | Existing evidence, manual checks, and debugging guidance |

```text
picky/
├── manifest.json       Extension registration and permissions
├── background.js       Toolbar mode and picker coordination
├── popup.js            Color state, palette, clipboard, preferences
├── popup.html          Popup structure
├── popup.css           Theme and layout
├── icons/              Packaged extension icons
└── docs/               Product and maintenance documentation
```

## Data and permissions

Colors and preferences are stored on the local installation. There is no server transmission or analytics in this version. PICKY writes color values to the clipboard and does not read its contents.

The manifest requests `storage`, `activeTab`, `scripting`, and `clipboardWrite`. [The architecture guide explains each permission](docs/ARCHITECTURE.md#permissions). No persistent all-site host permission is requested.

## Development and verification

Edit the source files and reload the extension in Chrome. No build command is required. Optional JavaScript syntax checks:

```sh
node --check background.js
node --check popup.js
```

The author confirmed the native picker flow working on the 0.3.9 baseline. Later versions refined presentation. Development-time simulations covered repeated picking and storage/copy failure paths; they are not a substitute for native-browser testing. See the [manual validation guide](docs/VALIDATION.md) before releasing functional changes.

The picker handoff deliberately preserves activation-sensitive ordering. Read [Architecture](docs/ARCHITECTURE.md) before changing its asynchronous control flow.

## Store packaging

Create a ZIP containing `manifest.json`, `background.js`, `popup.js`, `popup.html`, `popup.css`, and `icons/`, with `manifest.json` directly at the ZIP root. Exclude Git metadata and documentation. Listing assets and accurate privacy declarations must be prepared separately before submission.

## Credit

Product direction, interaction and visual feedback, and hands-on testing: **Maya Bachrach**. Implementation and documentation developed with AI assistance.
