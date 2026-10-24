# Validation and maintenance

## Documentation-only change

The accompanying documentation commit adds navigation comments to the two JavaScript files. Removing exactly those added comment blocks restores the original source byte for byte. No executable statements are renamed, reordered, or reformatted. HTML, CSS, manifest, permissions, icons, and version remain unchanged.

JavaScript syntax is checked with:

```sh
node --check background.js
node --check popup.js
```

Node is optional tooling for this check; running the extension itself requires no Node installation or package install.

## Existing evidence

The author confirmed the native picking flow in Chrome on the 0.3.9 baseline. Development-time simulations covered repeated manual and automatic selection, cancellation and retry, copy feedback, stored-data normalization, and failed palette writes. Those simulations were run in the development workspace and are not a browser automation suite shipped in this repository. They do not prove native user-activation behavior in every Chrome version.

## Manual checks before a functional release

| Scenario | Expected result |
| --- | --- |
| Load a clean installation | Popup opens; auto-pick is off |
| Pick on a regular HTTPS page | Popup closes, native picker opens, result popup returns |
| Repeat picking five times on the same page | Every physical click starts a new selection |
| Pick beneath the original popup position | The area is accessible during selection |
| Cancel, then retry | Cancellation is shown and the next selection works |
| Copy HEX, RGB, and HSL | Clipboard contains the selected format and feedback follows success |
| Save, remove, clear, and reopen | Palette changes persist correctly |
| Save exactly five colors | One complete row is visible with no vertical palette scroll |
| Save a sixth color | Extra rows scroll inside the palette only |
| Trigger a status message, then let it clear | Footer and controls stay in the same positions |
| Enable auto-pick and repeat toolbar selections | Each toolbar click starts the picker; preference persists |
| Disable auto-pick | Toolbar returns to normal popup behavior |
| Try a restricted Chrome page | Failure is reported rather than opening a new fallback tab |

Keep the current loaded folder path when testing an update to preserve local extension identity and data. Use a separate Chrome profile for clean-install tests rather than deleting the working installation.

## Debugging map

- Popup state or palette errors: inspect the popup console.
- Worker handoff or reopening errors: inspect the service worker from `chrome://extensions`.
- Injection errors: confirm that the active page allows script injection.
- First-pick-only failures: inspect activation-sensitive call order before changing the UI.

Never add an await, storage request, or timer before the direct manual preparation call merely to simplify the code. Verify native behavior in Chrome after any functional picker change.
