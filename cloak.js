/*!
 * CloakJS v1.0.0
 * -------------------------------------------------------------------------
 * A tiny, dependency-free "invisibility cloak" that DISCOURAGES use of the
 * browser DevTools and shows an anti-scam ("self-XSS") warning.
 *
 * IMPORTANT / HONEST LIMITATION:
 *   No website can truly *disable* DevTools — the browser does not allow it.
 *   This cloak is made of polyester, not real magic. It only:
 *     1) Prints a loud self-XSS scam warning in the console (always works,
 *        this is the most important part — same approach Facebook/Google use).
 *     2) Adds deterrents: blocks right-click + common DevTools shortcuts.
 *     3) Tries to DETECT when DevTools is opened, and shows a warning overlay.
 *   A determined user can always lift the cloak. Use it as a deterrent +
 *   warning, never as a real security control.
 *
 * Usage (one line — just include the script, it auto-runs with defaults):
 *   <script src="cloak.js"></script>
 *
 * Or customize:
 *   <script src="cloak.js"></script>
 *   <script>CloakJS.wear({ useDebugger: true });</script>
 * -------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();        // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);               // AMD
  } else {
    root.CloakJS = factory();          // Browser global
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Default warning text. You can override `title` and `message` via wear().
  // `message` may be a string OR an array of lines (easier to edit line-by-line).
  var DEFAULT_TITLE = 'หยุด! (STOP)';
  var DEFAULT_MESSAGE = [
    'นี่คือฟีเจอร์ของเบราว์เซอร์ที่มีไว้สำหรับนักพัฒนาเท่านั้น',
    'หากมีใครบอกให้คุณคัดลอกและวางโค้ดที่นี่ อาจเป็นการหลอกลวง',
    'ทั้งนี้ระบบนี้ไม่มีนโยบายขอข้อมูลส่วนตัวที่สำคัญ หรือบังคับให้ผู้ใช้งานวางโค้ด/สคริปต์ใดๆ ' +
    'ลงในแชทหรือแพลตฟอร์ม เพื่อป้องกันความเสี่ยงต่อบัญชีและการถูกโจรกรรมข้อมูล'
  ];

  var DEFAULTS = {
    // --- Deterrents -------------------------------------------------------
    disableContextMenu: true,   // block right-click menu
    disableShortcuts: true,     // block F12, Ctrl+Shift+I/J/C, Ctrl+U
    disableTextSelection: false,// block selecting text (optional)

    // --- Detection --------------------------------------------------------
    detect: true,               // poll for DevTools being open
    interval: 1000,             // poll interval (ms)
    sizeThreshold: 160,         // px gap that suggests docked DevTools
    useDebugger: false,         // stronger detection via `debugger;`.
                                //   Catches undocked DevTools too, BUT pauses
                                //   the page when DevTools is open (causes jank).

    // --- What to show on detection ---------------------------------------
    overlay: true,              // show full-screen warning overlay when detected
    persist: false,             // if true, overlay stays even after DevTools closes
    redirectUrl: null,          // if set, navigate here instead of overlay
    onDetect: null,             // optional callback(): runs when DevTools opens
    onClose: null,              // optional callback(): runs when DevTools closes

    // --- Console anti-scam warning (always recommended) ------------------
    consoleWarning: true,

    // --- Customizable warning text (override these to change what shows) --
    // `message` accepts a string OR an array of lines. Defaults shown here.
    title: DEFAULT_TITLE,
    message: DEFAULT_MESSAGE,
    consoleTitle: null,   // falls back to `title` if not set
    consoleMessage: null  // falls back to `message` if not set
  };

  var options;            // set by wear(); never read before then
  var pollTimer = null;
  var overlayEl = null;
  var isOpen = false;
  var started = false;
  var boundContext = null;
  var boundKeydown = null;
  var boundSelect = null;

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------
  // wear(options)  -> put the cloak on
  // takeOff()      -> take the cloak off
  function wear(userOptions) {
    // re-wearing resets everything first
    if (started) takeOff();
    options = merge(clone(DEFAULTS), userOptions || {});

    // Normalize text: allow string OR array of lines for any message field.
    options.message = normalizeText(options.message);
    options.consoleTitle = options.consoleTitle != null ? options.consoleTitle : options.title;
    options.consoleMessage = normalizeText(
      options.consoleMessage != null ? options.consoleMessage : options.message
    );

    started = true;

    if (options.consoleWarning) printConsoleWarning();
    if (options.disableContextMenu) bindContextMenu();
    if (options.disableShortcuts) bindShortcuts();
    if (options.disableTextSelection) bindTextSelection();
    if (options.detect) startDetection();

    return api;
  }

  function takeOff() {
    stopDetection();
    if (boundContext) document.removeEventListener('contextmenu', boundContext);
    if (boundKeydown) document.removeEventListener('keydown', boundKeydown, true);
    if (boundSelect) document.removeEventListener('selectstart', boundSelect);
    boundContext = boundKeydown = boundSelect = null;
    removeOverlay();
    started = false;
  }

  // ---------------------------------------------------------------------
  // Console warning (the most effective anti-scam piece)
  // ---------------------------------------------------------------------
  function printConsoleWarning() {
    try {
      console.log('%c' + options.consoleTitle,
        'color:#fff;background:#d32f2f;font-size:42px;font-weight:bold;' +
        'padding:6px 16px;border-radius:6px;');
      console.log('%c' + options.consoleMessage,
        'color:#d32f2f;font-size:16px;font-weight:600;line-height:1.6;');
    } catch (e) { /* console may be unavailable */ }
  }

  // ---------------------------------------------------------------------
  // Deterrents
  // ---------------------------------------------------------------------
  function bindContextMenu() {
    boundContext = function (e) { e.preventDefault(); };
    document.addEventListener('contextmenu', boundContext);
  }

  function bindShortcuts() {
    boundKeydown = function (e) {
      var key = (e.key || '').toLowerCase();
      var blocked =
        e.keyCode === 123 ||                              // F12
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].indexOf(key) !== -1) || // DevTools
        (e.ctrlKey && key === 'u') ||                     // View source
        (e.metaKey && e.altKey && ['i', 'j', 'c'].indexOf(key) !== -1);     // macOS DevTools
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener('keydown', boundKeydown, true);
  }

  function bindTextSelection() {
    boundSelect = function (e) { e.preventDefault(); };
    document.addEventListener('selectstart', boundSelect);
  }

  // ---------------------------------------------------------------------
  // Detection
  // ---------------------------------------------------------------------
  function startDetection() {
    pollTimer = setInterval(check, options.interval);
    check();
  }

  function stopDetection() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function check() {
    var open = detectBySize() || (options.useDebugger && detectByDebugger());
    if (open && !isOpen) {
      isOpen = true;
      handleDetected();
    } else if (!open && isOpen) {
      isOpen = false;
      if (!options.persist) removeOverlay();
      if (typeof options.onClose === 'function') options.onClose();
    }
  }

  // Catches DOCKED DevTools (the common case): the viewport shrinks.
  function detectBySize() {
    var w = window.outerWidth - window.innerWidth;
    var h = window.outerHeight - window.innerHeight;
    return w > options.sizeThreshold || h > options.sizeThreshold;
  }

  // Catches UNDOCKED DevTools too, but pauses the page while open.
  function detectByDebugger() {
    var start = (window.performance || Date).now();
    // eslint-disable-next-line no-debugger
    debugger;
    return ((window.performance || Date).now() - start) > 100;
  }

  function handleDetected() {
    if (typeof options.onDetect === 'function') {
      try { options.onDetect(); } catch (e) { /* ignore */ }
    }
    if (options.redirectUrl) {
      window.location.href = options.redirectUrl;
      return;
    }
    if (options.overlay) showOverlay();
  }

  // ---------------------------------------------------------------------
  // Overlay
  // ---------------------------------------------------------------------
  function showOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.setAttribute('role', 'alertdialog');
    overlayEl.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(15,23,42,0.96)', 'backdrop-filter:blur(6px)',
      '-webkit-backdrop-filter:blur(6px)',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Sarabun,Tahoma,sans-serif',
      'padding:24px', 'text-align:center'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'max-width:560px', 'background:#fff', 'border-radius:18px',
      'padding:40px 32px', 'box-shadow:0 24px 60px rgba(0,0,0,0.35)'
    ].join(';');

    card.innerHTML =
      '<div style="font-size:56px;line-height:1;margin-bottom:16px;">⚠️</div>' +
      '<h1 style="margin:0 0 16px;font-size:26px;color:#d32f2f;font-weight:800;">' +
        escapeHtml(options.title) + '</h1>' +
      '<p style="margin:0;font-size:17px;line-height:1.7;color:#1f2937;white-space:pre-line;">' +
        escapeHtml(options.message) + '</p>';

    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
  }

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  // Accepts a string or an array of lines; returns a single newline-joined string.
  function normalizeText(value) {
    return Array.isArray(value) ? value.join('\n') : String(value == null ? '' : value);
  }
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clone(obj) { return merge({}, obj); }
  function merge(target, src) {
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    return target;
  }

  // Public API.
  var api = {
    wear: wear,
    takeOff: takeOff,
    defaults: DEFAULTS
  };

  // ---------------------------------------------------------------------
  // Auto-init with defaults (the "one line" experience: just include it).
  // To customize, call CloakJS.wear({...}) yourself afterwards.
  //
  // Guard with `!started` so that an explicit CloakJS.wear({...}) call
  // (which may run before DOMContentLoaded) is NOT overwritten by the
  // deferred default auto-init.
  // ---------------------------------------------------------------------
  function autoInit() { if (!started) wear(); }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      autoInit();
    }
  }

  return api;
});
