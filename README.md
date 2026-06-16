# CloakJS 

> *"You shall not inspect."* — Gandalf, probably

A tiny (~4.8 KB), dependency-free **invisibility cloak** for your web page. It politely asks visitors to stop poking around in DevTools, throws a big scary console warning at would-be scam victims, and — when someone opens DevTools anyway — drops a full-screen overlay.

It's one line. You wear it. Done.

```html
<script src="cloak.js"></script>
```

That's the whole tutorial. You may leave now. Or keep reading, the trust issues section is fun.

---

## 🚨 The trust issues section (please actually read this)

Let's get one thing straight before you ship this to production and tell your boss the site is now "hacker-proof":

> **A cloak is not a force field.** You cannot *truly* disable DevTools. Nobody can. Not you, not Google, not that Stack Overflow answer with 4,000 upvotes. The browser simply does not allow it.

CloakJS is made of **polyester, not Deathly-Hallows-grade magic**. What it actually does:

1. 🗣️ **Yells in the console** — a loud, styled anti-scam ("self-XSS") warning. This is the genuinely useful part, and it's exactly what Facebook, Google, and government sites do. *Always works.*
2. ✋ **Slaps your right hands away** — blocks right-click and the usual DevTools shortcuts (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`).
3. 👀 **Notices when you peek** — detects DevTools opening and shows a warning overlay (or redirects you to the shadow realm of your choosing).

Anyone who knows what they're doing can lift the cloak in about four seconds. So:

- ✅ Use it to **scare off scammers** who tell grandma to "paste this code here, trust me."
- ✅ Use it as a **gentle 'devs only' sign**.
- ❌ Do **NOT** hide API keys, passwords, or your secret BBQ sauce recipe in client-side code and expect this to protect them. If it's in the browser, it's already on the visitor's hard drive. Keep secrets on the server. Always.

---

## 🪄 How to wear it

### Option A: The lazy genius (recommended)

Include the script. Walk away. The cloak puts itself on with sensible defaults.

```html
<script src="cloak.js"></script>
```

### Option B: The control freak

Call `wear()` to customize. Anything you don't set falls back to the defaults.

```html
<!-- 1. Load the cloak FIRST (very important, see Troubleshooting) -->
<script src="cloak.js"></script>

<!-- 2. THEN wear it your way -->
<script>
  CloakJS.wear({
    title: 'หยุด! (STOP)',
    message: [
      'นี่คือฟีเจอร์ของเบราว์เซอร์ที่มีไว้สำหรับนักพัฒนาเท่านั้น',
      'หากมีใครบอกให้คุณคัดลอกและวางโค้ดที่นี่ อาจเป็นการหลอกลวง'
    ],
    useDebugger: true,   // catch the sneaky undocked-DevTools people too
    persist: false       // make the overlay clingy (stays after DevTools closes)
  });
</script>
```

Changed your mind? Take it off:

```js
CloakJS.takeOff();   // cloak goes back in the closet
```

---

## 💬 Customizing the message

`message` accepts a **string** OR an **array of lines** (joined with `\n` for you, because we're nice like that).

```js
// Array — one item per line, easy to edit
CloakJS.wear({ message: ['Line 1', 'Line 2', 'Line 3'] });

// String — for minimalists
CloakJS.wear({ message: 'Nothing to see here. Move along. 👮' });
```

Want different vibes in the console vs. the overlay? Sure:

```js
CloakJS.wear({
  title: 'Warning',
  message: 'Shown in the overlay.',
  consoleTitle: 'STOP',                          // console only (defaults to title)
  consoleMessage: 'Shown in the console only.'   // console only (defaults to message)
});
```

Don't want to rewrite the perfectly good default text, just bolt something onto it?

```js
CloakJS.wear({
  message: CloakJS.defaults.message.concat(['p.s. we see you 👁️'])
});
```

---

## 🎛️ Options (the knobs and dials)

| Option | Type | Default | What it does |
|---|---|---|---|
| `disableContextMenu` | boolean | `true` | Blocks the right-click menu. |
| `disableShortcuts` | boolean | `true` | Blocks `F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U` (and macOS `Cmd+Opt+I/J/C`). |
| `disableTextSelection` | boolean | `false` | Stops text selection. Mildly evil. Use sparingly. |
| `detect` | boolean | `true` | Watches for DevTools opening. |
| `interval` | number | `1000` | How often it checks (ms). |
| `sizeThreshold` | number | `160` | Pixel gap that screams "DevTools is docked." |
| `useDebugger` | boolean | `false` | Stronger detection via a `debugger;` trick. Catches **undocked** DevTools too — **but freezes the page** while DevTools is open. Trade-offs, baby. |
| `overlay` | boolean | `true` | Show the full-screen "nope" overlay on detection. |
| `persist` | boolean | `false` | Keep the overlay even after DevTools closes (clingy mode). |
| `redirectUrl` | string \| null | `null` | Banish the snooper to this URL instead of showing the overlay. |
| `onDetect` | function \| null | `null` | Your callback when DevTools opens. Go wild. |
| `onClose` | function \| null | `null` | Your callback when DevTools closes. |
| `consoleWarning` | boolean | `true` | Print the styled anti-scam warning on load. Keep this on. |
| `title` | string | `'หยุด! (STOP)'` | Heading for overlay + console. |
| `message` | string \| string[] | Thai anti-scam text | Body text. String or array of lines. |
| `consoleTitle` | string \| null | `null` | Console-only heading. Falls back to `title`. |
| `consoleMessage` | string \| string[] \| null | `null` | Console-only body. Falls back to `message`. |

---

## 📚 API

| Method | What it does |
|---|---|
| `CloakJS.wear(options?)` | Put the cloak on (re-wearing resets everything; last call wins). Returns the API. |
| `CloakJS.takeOff()` | Take it off — removes listeners, stops detection, kills the overlay. |
| `CloakJS.defaults` | The default options, in case you want to peek (the irony is noted). |

---

## 🕵️ How detection works (and why it's not magic)

- **Size method** (default): when DevTools is **docked**, the page viewport shrinks. We measure that gap. Cheap, fast, catches the F12 crowd.
- **Debugger method** (`useDebugger: true`): runs a `debugger;` statement and times it. If DevTools is open, it pauses, the timer spikes, and we know. This *also* catches **undocked** (separate-window) DevTools — but it **freezes the page** whenever DevTools is open, which is exactly as fun as it sounds.

Neither is foolproof. A determined nerd with `:root` access and a dream will get past both. The **console warning is the one piece you can always count on.**

---

## 🆘 Troubleshooting

**"`CloakJS.wear()` does nothing / my custom message won't show up."**
- The `<script src="cloak.js">` tag must come **before** your `wear()` call. Load the cloak before you try to wear it. This is also good life advice.
- Console says `CloakJS is not defined`? The script didn't load. Wrong path, or wrong order. (See above. The cloak. Before. Wearing it.)
- Calling `wear()` twice re-wears from scratch — the **last** call wins.

**"The overlay doesn't pop up when I open DevTools."**
- Default detection only catches **docked** DevTools. For separate-window DevTools, flip on `useDebugger: true` (and accept the page-freeze tax).
- It polls every `interval` ms (default 1000), so give it up to a second to notice you.

**"Right-click / F12 still works!"**
- Some browser-level shortcuts and menus simply cannot be intercepted by a web page. That's by design. The cloak is a deterrent, not a bouncer with a badge.

---

## 🛠️ Building the minified cloak

`cloak.min.js` is conjured with [terser](https://terser.org/):

```bash
npx terser cloak.js --compress --mangle --comments false -o cloak.min.js
```

(Yes, the Thai text keeps it from getting much smaller. UTF-8 bytes don't fold neatly. Blame Unicode, not us.)

---

## 🌐 Browser support

All modern browsers (Chrome, Edge, Firefox, Safari). Pure standard DOM APIs, no build step required to *use* it.

## 📄 License

MIT — wear it, share it, lose it in the laundry. Just don't sue us when someone presses F12 anyway. 🧦
