/**
 * PICKY service worker: toolbar mode, native picking, and result delivery.
 *
 * Manual selections are prepared by popup.js during a physical click. This
 * worker waits for that popup to close before sending the prepared start signal.
 * Keep activation-sensitive calls in their existing order; see docs/ARCHITECTURE.md.
 */

const POPUP = 'popup.html';
const HANDOFF_DEADLINE_MS = 4000;
let busy = false;

// Toolbar preference: a normal popup by default, immediate picking when opted in.
async function syncAction() {
  const { autoPick = false } = await chrome.storage.local.get('autoPick');
  await chrome.action.setPopup({ popup: autoPick === true ? '' : POPUP });
}
chrome.runtime.onInstalled.addListener(() => {
  syncAction().catch(console.error);
  chrome.storage.session.remove('pickResult').catch(console.error);
});
chrome.runtime.onStartup.addListener(() => { syncAction().catch(console.error); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.autoPick) syncAction().catch(console.error);
});

// Present results without permanently changing the saved toolbar preference.
async function showWorkspace(windowId) {
  let opened = false;
  try {
    await chrome.action.setPopup({ popup: POPUP });
    await chrome.action.openPopup(Number.isInteger(windowId) ? { windowId } : {});
    opened = true;
    await chrome.action.setBadgeText({ text: '' });
  } catch (error) {
    console.warn('PICKY could not reopen the result window.', error);
  } finally {
    // A result view must never permanently replace the stored click mode.
    try { await syncAction(); } catch (error) { console.error('PICKY click mode:', error); }
    if (!opened) {
      try {
        await chrome.action.setBadgeBackgroundColor({ color: '#FF0088' });
        await chrome.action.setBadgeText({ text: '!' });
      } catch (error) { console.error('PICKY badge:', error); }
    }
  }
}

// Runs in the existing page, never inside the disappearing popup.
async function samplePage() {
  try {
    if (!window.EyeDropper) return { message: 'Color picking is unavailable here. Try an HTTPS website.' };
    const selection = new EyeDropper().open();
    const { sRGBHex } = await selection;
    const hex = sRGBHex.toUpperCase();
    let copied = false;
    try { await navigator.clipboard.writeText(hex); copied = true; } catch {}
    return { hex, copied };
  } catch (error) {
    return { message: error.name === 'AbortError' ? 'Selection cancelled' : `Picking failed (${error.name}): ${error.message}` };
  }
}

// Persist the selected color, deliver the transient result, then release the lock.
async function finishPick(tab, outcome) {
  try {
    if (outcome.hex) await chrome.storage.local.set({ lastColor: outcome.hex });
    await chrome.storage.session.set({ pickResult: { ...outcome, windowId: tab.windowId } });
    await showWorkspace(tab.windowId);
  } catch (error) {
    console.error('PICKY:', error);
  } finally { busy = false; }
}

// Catch synchronous invocation errors and callback errors as well as lastError.
// Keep this callback-based: the extension's click activation must be preserved.
function invokeApi(invoke, onSuccess, onFailure) {
  try {
    invoke(value => {
      const error = chrome.runtime.lastError;
      if (error) { onFailure(error.message); return; }
      try { onSuccess(value); } catch (callbackError) { onFailure(callbackError.message); }
    });
  } catch (error) { onFailure(error.message); }
}

function injectPicker(tab) {
  invokeApi(
    done => chrome.scripting.executeScript({
      target: { tabId: tab.id }, func: samplePage, args: [], injectImmediately: true
    }, done),
    results => { void finishPick(tab, results?.[0]?.result || { message: 'The page changed. Please try again.' }); },
    message => { void finishPick(tab, { message: `Chrome could not start picking: ${message}` }); }
  );
}

// Automatic path remains immediate: no closure checks, focus calls or timers.
function pickColor(tab) {
  if (busy) return;
  busy = true;
  if (!Number.isInteger(tab?.id) || tab.id < 0) {
    void finishPick(tab || {}, { message: 'Open a website and try again.' });
    return;
  }
  injectPicker(tab);
}
chrome.action.onClicked.addListener(pickColor);

// Use extension API callbacks throughout the handoff. Chromium carries the
// initiating user gesture into these callbacks; a setTimeout would lose it.
function startManualPick(tab, sourceDocumentId, token) {
  const deadline = Date.now() + HANDOFF_DEADLINE_MS;
  // Chromium popup contexts have windowId -1, not the browser's ID.
  const filter = { contextTypes: ['POPUP'] };
  if (sourceDocumentId) filter.documentIds = [sourceDocumentId];
  function fail(message) {
    // Disarm a preparation that never reached the native picker.
    try { chrome.tabs.sendMessage(tab.id, { type: 'CANCEL_ARMED_PICK', token }, () => { void chrome.runtime.lastError; }); } catch {}
    void finishPick(tab, { message });
  }
  function waitForClosedPopup() {
    // Deadline only: a fast machine must not spend its check-count budget
    // before the popup's response callback has had a chance to close it.
    if (Date.now() >= deadline) {
      fail('PICKY window did not close. Close it and click the toolbar icon to try again.');
      return;
    }
    invokeApi(
      done => chrome.runtime.getContexts(filter, done),
      contexts => {
        if (contexts.some(context => context.documentUrl === chrome.runtime.getURL(POPUP))) {
          waitForClosedPopup();
          return;
        }
        invokeApi(
          done => chrome.tabs.query({ active: true, windowId: tab.windowId }, done),
          tabs => {
            if (tabs?.[0]?.id !== tab.id) {
              fail('The active tab changed. Open PICKY on the page you want to sample.');
              return;
            }
            invokeApi(
              done => chrome.tabs.sendMessage(tab.id, { type: 'RUN_ARMED_PICK', token }, done),
              outcome => { void finishPick(tab, outcome || { message: 'The page changed. Please try again.' }); },
              message => fail(`Could not start prepared picking: ${message}`)
            );
          },
          message => fail(`Could not check the active page: ${message}`)
        );
      },
      message => fail(`Could not check popup closure: ${message}`)
    );
  }
  waitForClosedPopup();
}

// Only this extension's own popup may request a prepared manual selection.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL(POPUP)) return;
  if (message?.type !== 'PICK_ARMED' || typeof message.token !== 'string' || !/^[0-9a-f-]{36}$/i.test(message.token) || !Number.isInteger(message.tabId) || message.tabId < 0 || !Number.isInteger(message.windowId) || message.windowId < 0) return;
  if (busy) { respond({ accepted: false }); return; }
  busy = true;
  // Do not wait for this popup to close before responding: its callback is
  // responsible for closing it. Native picking only starts after the checks.
  respond({ accepted: true });
  startManualPick({ id: message.tabId, windowId: message.windowId }, sender.documentId, message.token);
});
