# How PICKY works

PICKY is a Manifest V3 Chrome extension written in plain JavaScript, HTML, and CSS. It has no build pipeline, framework, backend, or third-party runtime dependency.

## Source map

| File | Responsibility |
| --- | --- |
| `manifest.json` | Version, permissions, icons, worker, and popup registration |
| `background.js` | Toolbar mode, selection coordination, and result delivery |
| `popup.js` | Color conversion, clipboard feedback, palette, preferences, and page preparation |
| `popup.html` | Popup structure and accessible control labels |
| `popup.css` | Layout, theme, feedback, and the single-row palette viewport |
| `icons/` | Packaged P icons at four sizes |

## Manual color selection

1. The user physically clicks **Pick from page**.
2. The popup immediately calls `chrome.scripting.executeScript` with `armPagePicker`. This function is serialized into the active page's isolated world and registers a token-scoped message listener.
3. After preparation succeeds, the popup sends `PICK_ARMED` to the worker.
4. The worker validates the sender and request, acquires its `busy` lock, and acknowledges the request. The popup then closes.
5. The worker checks that the originating popup is gone and that the original tab remains active, then sends `RUN_ARMED_PICK` with the same token.
6. The page listener opens the native EyeDropper and holds its response until selection or cancellation finishes. It removes the listener and preparation timer when finished.
7. The worker stores the result and attempts to reopen the popup. The popup restores the chosen color and copy feedback.

The start message is a coordination signal; it does not manufacture user activation. Preparation must begin from the physical click. The native picker needs the popup closed so colors underneath it are accessible. These ordering constraints are why the code uses callbacks in the handoff rather than inserting timers or awaited storage reads.

`armPagePicker` and `samplePage` run in a different execution context from their source files. They must not depend on surrounding module variables or helpers.

## Automatic selection

Auto-pick is off by default. When enabled, the toolbar action has no default popup. Its click handler immediately injects `samplePage`, which opens EyeDropper before its first await. Completion uses the same result-delivery path as manual picking. Reopening the workspace temporarily assigns the popup, then restores the stored toolbar mode.

## Storage and clipboard

| Location | Keys | Purpose |
| --- | --- | --- |
| `chrome.storage.local` | `savedColors`, `lastColor`, `autoPick` | Persist colors and the click preference on this installation |
| `chrome.storage.session` | `pickResult` | Transfer a pending result to the popup, scoped by window ID |
| Clipboard | Chosen HEX, or clicked RGB/HSL text | Copy color values on selection or an explicit copy action |

The palette is deduplicated, normalized to uppercase HEX, and limited to 15 entries. Palette writes are serialized; rendering commits only after the storage write succeeds. Stored values are checked during initialization. Clipboard feedback is shown after a successful write, and a delayed write cannot label a newly selected color as copied.

There is no analytics or server transmission in this version. The extension writes color text to the clipboard; it does not read clipboard contents.

## Permissions

| Permission | Use |
| --- | --- |
| `storage` | Palette, last color, settings, and pending selection results |
| `activeTab` | Temporary access to the tab following the user's action |
| `scripting` | Prepare and run the picker in that tab |
| `clipboardWrite` | Copy color values |

No persistent all-site host permission is requested. Chrome-protected pages and other restricted contexts may reject injection. Try a normal HTTPS page when testing.

## Layout constraints

The popup is 360 × 468 CSS pixels. Its seven grid rows, six gaps, and vertical padding sum to that height. The palette has five columns and a 54px viewport: one 44px card row plus 10px vertical padding. A second row scrolls inside that viewport. The status occupies a reserved 22px row below Save, including when empty; it does not change the surrounding layout.

## Current limitations

- Native picking and popup reopening depend on Chrome APIs and platform behavior. Minimum declared Chrome version: 127.
- Data is local to the extension installation, with no export or cross-device sync.
- If reopening the popup fails, the toolbar shows `!`; this version does not open a fallback tab.
- A failure while persisting the worker's final result is logged to the console and can prevent result delivery. When auto-pick is enabled, a reopen failure does not guarantee the next toolbar click will show the pending result.

These are existing behaviors documented for maintainers; this documentation commit does not change them.
