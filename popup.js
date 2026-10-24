const $ = (selector) => document.querySelector(selector);

const colorInput = $("#colorInput");
const preview = $("#preview");
const hexValue = $("#hexValue");
const rgbValue = $("#rgbValue");
const hslValue = $("#hslValue");
const colorName = $("#colorName");
const paletteEl = $("#palette");
const statusEl = $("#status");

let currentColor = colorInput.value.toUpperCase();
const PALETTE_LIMIT = 15;
let savedColors = [];
let paletteWriteInProgress = false;
let activeTab;
const copyNotice = $("#copyNotice");
const autoPick = $("#autoPick");

function normalizeHex(hex) {
  if (typeof hex !== "string") return null;
  let value = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    value = value.split("").map((char) => char + char).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return `#${value.toUpperCase()}`;
}

function hexToRgb(hex) {
  const value = normalizeHex(hex).slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function describeColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  if (r === g && g === b) {
    if (r < 35) return "Near black";
    if (r < 90) return "Dark gray";
    if (r < 170) return "Gray";
    if (r < 235) return "Light gray";
    return "Near white";
  }
  if (hsl.h < 15 || hsl.h >= 345) return "Red";
  if (hsl.h < 45) return "Orange";
  if (hsl.h < 70) return "Yellow";
  if (hsl.h < 165) return "Green";
  if (hsl.h < 195) return "Teal";
  if (hsl.h < 255) return "Blue";
  if (hsl.h < 290) return "Purple";
  if (hsl.h < 345) return "Pink";
  return "Color";
}

function updateColor(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return;
  copyNotice.hidden = true;
  currentColor = normalized;
  colorInput.value = normalized;
  preview.style.backgroundColor = normalized;
  hexValue.textContent = normalized;

  const { r, g, b } = hexToRgb(normalized);
  const hsl = rgbToHsl(r, g, b);
  rgbValue.textContent = `${r}, ${g}, ${b}`;
  hslValue.textContent = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
  colorName.textContent = describeColor(normalized);
}

async function copyText(value) {
  const selectedWhenCopyStarted = currentColor;
  copyNotice.hidden = true;
  try {
    await navigator.clipboard.writeText(value);
    if (currentColor === selectedWhenCopyStarted) {
      showCopied(value === selectedWhenCopyStarted ? "HEX copied" : "Copied");
    }
  } catch {
    showStatus("Copy failed — try again.");
  }
}

function showCopied(message) {
  copyNotice.textContent = message;
  copyNotice.hidden = false;
}

let statusTimer;
function showStatus(message) {
  statusEl.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { statusEl.textContent = ""; }, 8000);
}

function renderPalette() {
  paletteEl.replaceChildren();
  if (!savedColors.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Your saved colors will live here.";
    paletteEl.append(empty);
    return;
  }

  savedColors.forEach((hex) => {
    const card = document.createElement("div");
    card.className = "swatch-card";

    const swatch = document.createElement("button");
    swatch.className = "swatch-color";
    swatch.style.backgroundColor = hex;
    swatch.title = `Select ${hex}`;
    swatch.setAttribute("aria-label", `Select color ${hex}`);
    swatch.addEventListener("click", () => updateColor(hex));

    const remove = document.createElement("button");
    remove.className = "remove-color";
    remove.textContent = "×";
    remove.title = `Remove ${hex}`;
    remove.setAttribute("aria-label", `Remove ${hex}`);
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      await savePalette(savedColors.filter(color => color !== hex), "Color removed");
    });
    

    const code = document.createElement("span");
    code.className = "swatch-code";
    code.textContent = hex;

    card.append(swatch, remove, code);
    paletteEl.append(card);
  });
}

colorInput.addEventListener("input", (event) => updateColor(event.target.value));
$("#copyHex").addEventListener("click", () => copyText(currentColor));
document.querySelectorAll(".format-row").forEach((button) => {
  button.addEventListener("click", () => {
    const format = button.dataset.format;
    const value = format === "rgb" ? `rgb(${rgbValue.textContent})` : `hsl(${hslValue.textContent})`;
    copyText(value);
  });
});

async function savePalette(nextColors, successMessage) {
  if (paletteWriteInProgress) return;
  paletteWriteInProgress = true;
  const setDisabled = disabled => document.querySelectorAll("#saveColor, #clearPalette, .palette button").forEach(button => { button.disabled = disabled; });
  setDisabled(true);
  try {
    // Commit the in-memory UI only after storage confirms success.
    await chrome.storage.local.set({ savedColors: [...nextColors] });
    savedColors = [...nextColors];
    renderPalette();
    showStatus(successMessage);
  } catch {
    showStatus("Could not save palette. Your existing colors are unchanged.");
  } finally {
    paletteWriteInProgress = false;
    setDisabled(false);
  }
}

$("#saveColor").addEventListener("click", async () => {
  if (savedColors.includes(currentColor)) { showStatus("Already in your palette"); return; }
  if (savedColors.length >= PALETTE_LIMIT) { showStatus("Palette full — remove a color first"); return; }
  await savePalette([currentColor, ...savedColors], "Color saved");
});

$("#clearPalette").addEventListener("click", async () => {
  if (savedColors.length) await savePalette([], "Palette cleared");
});

// This function is serialized into the existing page. Preparing it must be
// the first Chrome API call in each physical button click, so executeScript
// can grant a fresh transient activation to that page on EVERY attempt.
function armPagePicker(token) {
  const key = "__pickyNativePicker";
  if (globalThis[key]?.running) return { armed: false, message: "A selection is already running. Press Escape first." };
  globalThis[key]?.cleanup();
  if (!window.EyeDropper) return { armed: false, message: "Color picking is unavailable here. Try an HTTPS website." };
  const control = { running: false, cleanup: null };
  let expiry;
  function cleanup() {
    clearTimeout(expiry);
    chrome.runtime.onMessage.removeListener(onMessage);
    if (globalThis[key] === control) delete globalThis[key];
  }
  control.cleanup = cleanup;
  function onMessage(message, sender, respond) {
    if (sender.id !== chrome.runtime.id || message?.token !== token) return;
    if (message.type === "CANCEL_ARMED_PICK") { cleanup(); respond({ cancelled: true }); return; }
    if (message.type !== "RUN_ARMED_PICK" || control.running) return;
    control.running = true;
    clearTimeout(expiry);
    let selection;
    try {
      // The activation belongs to THIS page from the direct executeScript
      // above. This message is a start signal, not a fabricated user gesture.
      selection = new EyeDropper().open();
    } catch (error) {
      cleanup();
      respond({ message: `Picking failed (${error.name}): ${error.message}` });
      return;
    }
    selection.then(async ({ sRGBHex }) => {
      const hex = sRGBHex.toUpperCase();
      let copied = false;
      try { await navigator.clipboard.writeText(hex); copied = true; } catch {}
      return { hex, copied };
    }).catch(error => ({ message: error.name === "AbortError" ? "Selection cancelled" : `Picking failed (${error.name}): ${error.message}` }))
      .then(outcome => { cleanup(); respond(outcome); });
    // Hold the response until the native picker finishes. The popup is not
    // the owner of this request and can close without losing the result.
    return true;
  }
  chrome.runtime.onMessage.addListener(onMessage);
  globalThis[key] = control;
  expiry = setTimeout(cleanup, 6000);
  return { armed: true };
}

$("#eyedropper").addEventListener("click", () => {
  if (!Number.isInteger(activeTab?.id)) { showStatus("Open a website and try again."); return; }
  const button = $("#eyedropper");
  const token = crypto.randomUUID();
  button.disabled = true;
  const failed = message => { showStatus(message); button.disabled = false; };
  // No await, storage access, runtime message or timer before this injection.
  try {
  chrome.scripting.executeScript({
    target: { tabId: activeTab.id }, func: armPagePicker, args: [token], injectImmediately: true
  }, results => {
    if (chrome.runtime.lastError) { failed(`Could not prepare picking: ${chrome.runtime.lastError.message}`); return; }
    const preparation = results?.[0]?.result;
    if (!preparation?.armed) { failed(preparation?.message || "Could not prepare picking."); return; }
    chrome.runtime.sendMessage({ type: "PICK_ARMED", token, tabId: activeTab.id, windowId: activeTab.windowId }, response => {
      if (chrome.runtime.lastError || !response?.accepted) {
        const error = chrome.runtime.lastError?.message;
        chrome.tabs.sendMessage(activeTab.id, { type: "CANCEL_ARMED_PICK", token }, () => { void chrome.runtime.lastError; });
        failed(error || "A selection is already running. Press Escape and try again.");
        return;
      }
      window.close();
    });
  });
  } catch (error) { failed(`Could not prepare picking: ${error.message}`); }
});

autoPick.addEventListener("change", async () => {
  const requested = autoPick.checked;
  let persisted = false;
  autoPick.disabled = true;
  try {
    await chrome.storage.local.set({ autoPick: requested });
    persisted = true;
    await chrome.action.setPopup({ popup: requested ? "" : "popup.html" });
    showStatus(requested ? "Auto-pick enabled" : "Auto-pick disabled");
  } catch {
    // Do not display an unchecked box if the checked preference was saved.
    autoPick.checked = persisted ? requested : !requested;
    showStatus(persisted ? "Preference saved. Reopen PICKY to apply it." : "Could not save preference. Please try again.");
  } finally { autoPick.disabled = false; }
});

async function init() {
  const [result, tabs, session] = await Promise.all([
    chrome.storage.local.get(["savedColors", "lastColor", "autoPick"]),
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.session.get("pickResult")
  ]);
  activeTab = tabs[0];
  await Promise.allSettled([
    chrome.action.setPopup({ popup: result.autoPick === true ? "" : "popup.html" }),
    chrome.action.setBadgeText({ text: "" })
  ]);
  savedColors = Array.isArray(result.savedColors) ? [...new Set(result.savedColors.map(normalizeHex).filter(Boolean))].slice(0, PALETTE_LIMIT) : [];
  updateColor(normalizeHex(result.lastColor) || currentColor);
  renderPalette();
  autoPick.checked = result.autoPick === true;
  autoPick.disabled = false;
  $("#eyedropper").disabled = false;
  $("#saveColor").disabled = false;
  $("#clearPalette").disabled = false;
  const picked = session.pickResult;
  if (picked && (!Number.isInteger(picked.windowId) || picked.windowId === activeTab?.windowId)) {
    await chrome.storage.session.remove("pickResult");
    const pickedHex = normalizeHex(picked.hex);
    if (pickedHex) {
      updateColor(pickedHex);
      if (picked.copied) showCopied("HEX copied");
      else await copyText(currentColor);
    } else if (picked.message) showStatus(picked.message);
  }
}

init().catch(() => showStatus("Could not load PICKY. Close and reopen the window."));
