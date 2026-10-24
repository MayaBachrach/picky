# PICKY

A compact Chrome color picker by Maya Bachrach. Version 0.4.6.

## Features

- Pick a color using the native EyeDropper, with the popup closed during selection.
- Automatically copy the HEX value; copy RGB and HSL values from the popup.
- Save up to 15 colors locally, with a single visible row of five swatches.
- Optional auto-pick when clicking the toolbar icon, disabled by default.
- Hot pink interface with a star button and stable status-message spacing.

## Install locally

1. Download this repository as a ZIP and extract it to a permanent folder.
2. Open `chrome://extensions` in Chrome (version 127 or newer).
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the folder containing `manifest.json` and pin PICKY to the toolbar.

To update an existing local installation, replace the files in the same loaded folder and click **Reload**. Keeping the same folder preserves the extension identity and local saved colors.

## Development

Plain HTML, CSS and JavaScript. No build step or package dependencies.

- `manifest.json`: extension metadata and permissions.
- `background.js`: toolbar behavior and native-picker coordination.
- `popup.js`: palette, copy actions and picker preparation.
- `popup.html` / `popup.css`: popup interface.
- `icons/`: packaged extension icons.

## Data and permissions

Colors and preferences are stored locally. This version has no analytics or backend and does not transmit data to a server. Permissions: `storage` for preferences and colors; `activeTab` and `scripting` for user-initiated picker preparation; `clipboardWrite` for copying color values.

## Store packaging

ZIP the extension files with `manifest.json` at the ZIP root. Exclude Git metadata and development documentation. Store publication also requires listing assets and accurate privacy declarations.

## Validation

The picking flow was confirmed working by the author on the 0.3.9 baseline. Subsequent versions changed presentation only. Simulated regression checks cover repeated selection, cancellation, copying and palette persistence. A full live-browser check is still needed before store publication.
