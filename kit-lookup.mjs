#!/usr/bin/env node
// The prototype skill's single tool for reading @epam/ai-dial-ui-kit. Run it from the prototype folder.
//   node kit-lookup.mjs update                    install/upgrade the kit to the latest version (+ jsdom for render)
//   node kit-lookup.mjs search <text>             find components by name/description/alias ("" lists all 2.0)
//   node kit-lookup.mjs info <Name>               a component's props (with enum values) and usage examples
//   node kit-lookup.mjs render <Name> ['<json>']  the real component's HTML, rendered by the installed kit
//   node kit-lookup.mjs render '[{"name":"…","props":{…}}, …]'   several at once
//   node kit-lookup.mjs classes <regex>           which kit utility classes exist, with their CSS
//   node kit-lookup.mjs icon <name> [size]        Tabler outline icon as inline SVG (kit style, stroke 1.5)
//   node kit-lookup.mjs version                   installed kit version + the stylesheet <link> to paste
//   node kit-lookup.mjs grid                      the kit's Grid 2.0, live: AG Grid + kit theme block to paste in <head>
//   node kit-lookup.mjs asset <name> [height]     a DIAL brand asset (logo, gradient icons) as an inline <img>
//   node kit-lookup.mjs pattern <name> --source > page.tpl.html   copy a DIAL page template to edit (patterns/ lists them)
//   node kit-lookup.mjs pattern page.tpl.html > page.html         build your edited template into the page
// Props JSON: plain values as in the React examples; enums as their string value ("md", "danger");
// "@icon:send" or "@icon:send:16" for an icon; {"@component":"PrimaryButton","label":"Ok"} for a nested component.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const KIT = '@epam/ai-dial-ui-kit';
function findUp(start, rel) {
  for (let d = start; ; d = dirname(d)) {
    if (existsSync(join(d, rel))) return join(d, rel);
    if (dirname(d) === d) return null;
  }
}
const kitDir = findUp(process.cwd(), `node_modules/${KIT}`);
const projectDir = kitDir ? dirname(dirname(dirname(kitDir))) : process.cwd();
const fail = (msg, code = 1) => { console.error(msg); process.exit(code); };
const needKit = () => kitDir ?? fail(`${KIT} is not installed here. Run: node kit-lookup.mjs update`);
const kitVersion = () => JSON.parse(readFileSync(join(needKit(), 'package.json'), 'utf8')).version;
const manifest = () => JSON.parse(readFileSync(join(needKit(), 'dist/components-manifest.json'), 'utf8'));

// ---------- kit CSS: flatten to { sel, body } rules (native nesting "&", @media kept, @layer dropped)
function rules(src, ctx = { sel: '', at: [] }) {
  const out = [], own = [];
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '{') continue;
    const pre = src.slice(start, i), cut = pre.lastIndexOf(';');
    if (cut >= 0) own.push(pre.slice(0, cut + 1));
    const child = pre.slice(cut + 1).trim();
    let depth = 1, j = i + 1;
    for (; j < src.length && depth; j++) depth += src[j] === '{' ? 1 : src[j] === '}' ? -1 : 0;
    const next = child.startsWith('@')
      ? { sel: ctx.sel, at: child.startsWith('@layer') ? ctx.at : [...ctx.at, child] }
      : { sel: !ctx.sel ? child : child.includes('&') ? child.replace(/&/g, ctx.sel) : child.split(',').map((c) => `${ctx.sel} ${c.trim()}`).join(','), at: ctx.at };
    out.push(...rules(src.slice(i + 1, j - 1), next));
    start = i = j;
  }
  own.push(src.slice(start));
  const body = own.join('').trim();
  if (ctx.sel && body) out.unshift({ sel: [...ctx.at, ctx.sel].join(' '), body });
  return out;
}
let byClassCache;
function byClass() {
  if (byClassCache) return byClassCache;
  const css = readFileSync(join(needKit(), 'dist/index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  byClassCache = new Map();
  for (const r of rules(css))
    for (const m of r.sel.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) {
      const c = m[1].replace(/\\(.)/g, '$1');
      if (!byClassCache.has(c)) byClassCache.set(c, []);
      byClassCache.get(c).push(r);
    }
  return byClassCache;
}

// ---------- update
function update() {
  const installed = kitDir ? kitVersion() : null;
  let latest = null;
  try { latest = execSync(`npm view ${KIT} version`, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  const newer = (a, b) => { const x = a.split(/[.-]/).map(Number), y = b.split(/[.-]/).map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
  const req = createRequire(join(projectDir, 'noop.js'));
  const has = (p) => { try { req.resolve(`${p}/package.json`); return true; } catch { return false; } };
  const pkgs = [];
  if (!installed || (latest && newer(latest, installed))) pkgs.push(`${KIT}@${latest ?? 'latest'}`);
  for (const p of ['react', 'react-dom', 'jsdom']) if (!has(p)) pkgs.push(p);
  if (!installed && !latest) fail(`Can't reach npm and ${KIT} is not installed. Check the network and run update again.`);
  if (pkgs.length) {
    if (!existsSync(join(projectDir, 'package.json'))) execSync('npm init -y', { cwd: projectDir, stdio: 'ignore' });
    console.log(`Installing in ${projectDir}: ${pkgs.join(' ')}`);
    try { execSync(`npm install ${pkgs.join(' ')}`, { cwd: projectDir, stdio: 'inherit' }); }
    catch { fail('npm install failed (output above). Fix it before building; do not guess the kit.'); }
  }
  const now = JSON.parse(readFileSync(join(projectDir, `node_modules/${KIT}/package.json`), 'utf8')).version;
  if (!installed) console.log(`Kit ${now} installed.`);
  else if (now !== installed) console.log(`Kit updated ${installed} → ${now}.`);
  else console.log(latest ? `Kit ${now} is the latest.` : `Offline: using the installed kit ${now}.`);
}

// ---------- search / info
const firstLine = (s) => (s ?? '').split('\n').find((l) => l.trim() && !/^aliases:|^Design system/.test(l))?.trim() ?? '';
const aliases = (s) => ((s ?? '').match(/aliases:\s*(.*)/) || [])[1]?.replace(/\|/g, ', ') ?? '';
function search(q) {
  const t = (q ?? '').toLowerCase();
  const hits = manifest().components.filter((c) => (t ? `${c.name}\n${c.description}`.toLowerCase().includes(t) : c.generation === '2.0'))
    .sort((a, b) => (b.generation === '2.0') - (a.generation === '2.0') || b.name.toLowerCase().includes(t) - a.name.toLowerCase().includes(t));
  for (const c of hits) {
    const tag = c.generation === '2.0' ? '2.0' : `1.0 — don't use${c.supersededBy ? `; use ${c.supersededBy}` : ''}`;
    console.log(`${c.name.padEnd(26)} [${tag}] ${firstLine(c.description)}${aliases(c.description) ? ` (aka ${aliases(c.description)})` : ''}`);
  }
  console.log(`\n${hits.length} match(es). Details: node kit-lookup.mjs info <Name>`);
  if (t && !hits.some((c) => c.generation === '2.0')) console.log('No 2.0 component for this: build it as plain layout (components.md, "Plain layout"), or try another word.');
}
function info(name) {
  const m = manifest();
  const c = m.components.find((x) => x.name === name) ?? fail(`No component "${name}". Try: node kit-lookup.mjs search <text>`);
  if (c.generation !== '2.0') console.log(`!! ${name} is a 1.0 component — don't use it.${c.supersededBy ? ` Use ${c.supersededBy}.` : ''}\n`);
  console.log(`# ${c.name} (${c.generation})\n${c.description.trim()}\n\n## Props`);
  const enums = new Map((m.types ?? []).filter((t) => t.kind === 'enum').map((t) => [t.name, t.members.map((x) => x.value.replace(/'/g, '"')).join(' | ')]));
  for (const p of c.props ?? []) {
    const ev = enums.get(p.type);
    console.log(`- ${p.name}${p.required ? ' (required)' : ''}: ${p.type}${ev ? ` = ${ev}` : ''}${p.defaultValue ? `, default ${p.defaultValue}` : ''}${p.description ? ` — ${p.description.split('\n')[0]}` : ''}`);
  }
  if (!c.props?.length) console.log('(no own props listed: it is a preset; see the example and its base component)');
  else console.log('(Props a component inherits from the one it is built from, e.g. ConfirmationPopup from Popup, may be missing here: check that one too.)');
  if (c.examples?.length) console.log(`\n## Examples\n${c.examples.join('\n\n')}`);
  console.log(`\nRender it: node kit-lookup.mjs render ${c.name} '{…props as JSON…}'`);
}

// ---------- render: the installed kit, client-rendered in jsdom (portals and effects included)
async function render(items, collect = null) {
  const req = createRequire(join(projectDir, 'noop.js'));
  let JSDOM;
  try { ({ JSDOM } = req('jsdom')); } catch { fail('render needs jsdom. Run: node kit-lookup.mjs update'); }
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  for (const k of ['document', 'HTMLElement', 'Element', 'Node', 'Text', 'DocumentFragment', 'SVGElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'CustomEvent', 'MutationObserver'])
    globalThis[k] = w[k];
  globalThis.getComputedStyle = w.getComputedStyle.bind(w);
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
  class NoopObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  globalThis.ResizeObserver = w.ResizeObserver = NoopObserver;
  globalThis.IntersectionObserver = w.IntersectionObserver = NoopObserver;
  w.matchMedia = globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.requestAnimationFrame = w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = w.cancelAnimationFrame = clearTimeout;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.scrollTo = () => {};
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  // React/kit dev warnings would drown the output; keep them only to explain an empty render.
  const quiet = { error: console.error, warn: console.warn }, noise = [];
  console.error = console.warn = (...a) => noise.push(a.map(String).join(' ').split('\n')[0]);
  const React = req('react');
  const { createRoot } = req('react-dom/client');
  const kit = req(KIT);
  const icons = createRequire(join(needKit(), 'package.json'))('@tabler/icons-react');
  const known = byClass();
  // Some controls only appear when a handler exists (e.g. Tag's remove button needs onRemove); JSON can't
  // carry functions, so every on* prop the manifest lists gets a no-op.
  const specs = new Map(manifest().components.map((c) => [c.name, c.props ?? []]));
  const added = new Set();
  const withHandlers = (n, p) => {
    // onBack only draws a Back button: opt in with "onBack": true. `true` on any on* prop means "a no-op handler".
    for (const k of Object.keys(p)) if (/^on[A-Z]/.test(k) && p[k] === true) p = { ...p, [k]: () => {} };
    const all = (specs.get(n) ?? []).filter((x) => /^on[A-Z]/.test(x.name) && x.name !== 'onBack' && !(x.name in p));
    // Report only optional handlers that can add a control (not plain events such as onChange or onImageError).
    for (const x of all) if (!x.required && !/^on(\w*Change|Click|Close|Cancel|Confirm|Submit|Toggle|\w*Error|Focus|Blur|Key\w*|Mouse\w*|Scroll|Load\w*|Open\w*)$/.test(x.name)) added.add(x.name);
    const h = all.map((x) => x.name);
    return { ...Object.fromEntries(h.map((x) => [x, () => {}])), ...p };
  };
  let nested = [];

  const toProps = (v) => {
    if (Array.isArray(v)) return v.map(toProps);
    if (typeof v === 'string' && v.startsWith('@asset:')) return assetDataUri(v.slice(7));
    if (typeof v === 'string' && v.startsWith('@icon:')) {
      const [, n, size] = v.split(':');
      const Icon = icons[`Icon${n.replace(/(^|-)(\w)/g, (_, __, ch) => ch.toUpperCase())}`];
      if (!Icon) throw new Error(`no Tabler icon "${n}"`);
      return React.createElement(Icon, { size: Number(size ?? 20), stroke: 1.5 });
    }
    if (v && typeof v === 'object') {
      if (v['@component']) {
        const { ['@component']: n, ...rest } = v;
        if (/^[a-z]/.test(n)) { // plain element: "div", "dl", "span"…; a "style" string is kept as written
          const { style, ...attrs } = rest;
          return React.createElement(n, { ...toProps(attrs), ...(typeof style === 'string' ? { 'data-kit-style': style } : {}) });
        }
        if (!kit[n]) throw new Error(`no kit component "${n}"`);
        nested.push({ name: n, props: rest });
        return React.createElement(kit[n], withHandlers(n, toProps(rest)));
      }
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toProps(x)]));
    }
    return v;
  };

  for (const { name, props = {} } of items) {
    // collect: return results (used by `pattern`) instead of printing them
    const res = { name, html: '', text: [] };
    const say = (t) => (collect ? res.text.push(t) : console.log(t));
    if (collect) collect.push(res);
    say(`\n## ${name} ${JSON.stringify(props)}`);
    if (!kit[name]) { say(`not exported by the kit. Try: node kit-lookup.mjs search ${name}`); process.exitCode = 1; continue; }
    if (name === 'Grid') { say(`Grid is AG Grid and can't be rendered to static HTML. Use the live grid: "node kit-lookup.mjs grid" (see "Grid (table)" in components.md).`); continue; }
    noise.length = 0;
    added.clear();
    nested = [];
    let html = '', notes = [];
    try {
      const element = React.createElement(kit[name], withHandlers(name, toProps(props)));
      // Nested kit components: render each alone to learn its root's signature, so it can be tagged in place.
      const tags = [];
      for (const n of nested) {
        w.document.body.innerHTML = '<div id="kit-root"></div>';
        const r = createRoot(w.document.getElementById('kit-root'));
        await React.act(async () => { r.render(React.createElement(kit[n.name], withHandlers(n.name, toProps(n.props)))); });
        tidy(w.document, n.name, known); // compare after cleanup, which turns inline sizes into classes
        const el = w.document.body.firstElementChild;
        if (el) { el.removeAttribute('data-dial-component'); tags.push([signature(el, known), n.name]); }
        try { await React.act(async () => r.unmount()); } catch {}
      }
      w.document.body.innerHTML = '<div id="kit-root"></div>';
      const root = createRoot(w.document.getElementById('kit-root'));
      await React.act(async () => { root.render(element); });
      await React.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
      ({ html, notes } = tidy(w.document, name, known, tags));
      try { await React.act(async () => root.unmount()); } catch {} // tidy rewrote the DOM React owned
    } catch (e) { notes.push(`render failed: ${String(e.message).split('\n')[0]} — the props are probably wrong; check: node kit-lookup.mjs info ${name}`); }
    res.html = html;
    if (html) say(html);
    else if (!notes.some((n) => n.startsWith('render failed'))) say('(renders nothing in a static page: it needs user interaction. Try an "open" prop, or see components.md.)');
    if (html && added.size) notes.push(`handlers were added so optional controls show (${[...added].join(', ')}). If an unwanted control appears (e.g. a Back button), pass "${[...added][0]}": null.`);
    for (const n of notes) say(`note: ${n}`);
    if (!html && noise.length) say(`kit said: ${[...new Set(noise)].slice(0, 3).join(' | ')}`);
  }
  Object.assign(console, quiet);
}

// tag + kit classes + the start of its text: different components often share a root class list (e.g. Input and
// RadioGroup wrappers), their text tells them apart.
const signature = (el, known) => `${el.tagName}|${[...el.classList].filter((c) => known.has(c)).sort().join(' ')}|${el.textContent.trim().slice(0, 40)}`;

// Turn the live DOM into static, validator-clean markup.
function tidy(doc, name, known, tags = []) {
  const notes = [];
  const body = doc.body;
  // Floating UI focus guards and visually-hidden helpers: drop empty/aria-hidden ones, keep text ones as sr-only.
  for (const el of body.querySelectorAll('[data-floating-ui-focus-guard]')) el.remove();
  for (const el of [...body.querySelectorAll('[style*="clip"]')]) {
    if (!el.textContent.trim() || el.getAttribute('aria-hidden') === 'true') el.remove();
    else { el.removeAttribute('style'); el.classList.add('sr-only'); }
  }
  // Floating panels (menus, popovers) are positioned at runtime: put them right under the control that opens them.
  for (const el of [...body.querySelectorAll('[style*="translate"], [style*="--fui"]')]) {
    el.removeAttribute('style');
    el.classList.remove('absolute', 'fixed');
    const trigger = el.id && body.querySelector(`[aria-controls="${el.id}"]`);
    if (trigger) { trigger.after(el); el.classList.add('mt-1'); }
  }
  for (const el of [...body.querySelectorAll('[data-floating-ui-portal], #kit-root')]) el.replaceWith(...el.childNodes);
  for (const el of body.querySelectorAll('*')) {
    for (const a of ['data-floating-ui-inert', 'data-floating-ui-focusable', 'aria-owns']) el.removeAttribute(a);
    for (const a of [...el.attributes]) if (a.value === '[object Object]') {
      el.removeAttribute(a.name);
      notes.push(`prop "${a.name}" is not a prop of ${name} (ignored). Check: node kit-lookup.mjs info ${name}`);
    }
    const st = el.getAttribute('style');
    if (st) {
      // Full-page overlays: position:fixed + inset 0 -> kit classes. Anything else is dropped.
      const s = el.style, add = [];
      if (['fixed', 'absolute', 'relative', 'sticky'].includes(s.position)) add.push(s.position);
      if (['top', 'right', 'bottom', 'left'].every((k) => s[k] === '0px')) add.push('inset-0');
      if (['auto', 'hidden'].includes(s.overflow)) add.push(`overflow-${s.overflow}`);
      // Sizes set inline (e.g. Avatar width/height) -> the matching arbitrary kit class, when the kit has it.
      const kept = new Set(['position', 'top', 'right', 'bottom', 'left', 'overflow']);
      const px = (v) => (/^\d+(\.\d+)?px$/.test(v) ? v : null);
      if (px(s.width) && s.width === s.height && known.has(`size-[${s.width}]`)) { add.push(`size-[${s.width}]`); kept.add('width').add('height'); }
      for (const [k, pre] of [['width', 'w'], ['height', 'h'], ['min-width', 'min-w'], ['max-width', 'max-w'], ['font-size', 'text']])
        if (!kept.has(k) && px(s.getPropertyValue(k)) && known.has(`${pre}-[${s.getPropertyValue(k)}]`)) { add.push(`${pre}-[${s.getPropertyValue(k)}]`); kept.add(k); }
      // Inline font sizes -> the kit type class of that size (keeps e.g. Avatar initials at their real size).
      // nearest kit type size (the class also sets weight/line height; close enough for e.g. avatar initials)
      const typeScale = [[10, 'dial-caption-text'], [12, 'dial-tiny-text'], [14, 'dial-small-text'], [16, 'dial-body-text'], [18, 'dial-h2-text'], [20, 'dial-h1-text'], [22, 'dial-display3-text'], [28, 'dial-display2-text'], [32, 'dial-display1-text']];
      const fs = parseFloat(s.fontSize);
      if (!kept.has('font-size') && /px$/.test(s.fontSize) && fs) {
        add.push(typeScale.reduce((a, b) => (Math.abs(b[0] - fs) < Math.abs(a[0] - fs) ? b : a))[1]);
        kept.add('font-size');
      }
      el.classList.add(...add.filter((c) => known.has(c)));
      const dropped = st.split(';').map((x) => x.trim()).filter(Boolean).filter((d) => !kept.has(d.split(':')[0].trim()));
      if (dropped.length) notes.push(`dropped runtime inline style on <${el.tagName.toLowerCase()}>: ${dropped.join('; ')}${/(width|height):\s*\d/.test(dropped.join(';')) ? ` — the kit has no matching class; pass a "className" with a size that exists (node kit-lookup.mjs classes '^size-')` : ''}`);
      el.removeAttribute('style');
    }
    // Marker classes with no CSS (e.g. dial-kit-popup) do nothing and would fail the validator.
    for (const c of [...el.classList]) if (!known.has(c) && !c.startsWith('tabler-icon')) el.classList.remove(c);
    if (el.getAttribute('class') === '') el.removeAttribute('class');
  }
  for (const el of body.querySelectorAll('[data-kit-style]')) { el.setAttribute('style', el.getAttribute('data-kit-style')); el.removeAttribute('data-kit-style'); }
  // Empty wrappers left behind by the hidden helpers.
  for (const el of [...body.querySelectorAll('span:empty:not([class]):not([id])')]) el.remove();
  for (const [sig, n] of tags)
    for (const el of body.querySelectorAll('*')) if (!el.hasAttribute('data-dial-component') && signature(el, known) === sig) el.setAttribute('data-dial-component', n);
  const first = body.firstElementChild;
  if (first) first.setAttribute('data-dial-component', name);
  const html = body.innerHTML.trim();
  if (/class="[^"]*\bfixed\b/.test(html)) notes.push('overlay: covers the whole page. To show it inside a section, see "Overlays inside a section" in components.md.');
  return { html, notes };
}

// ---------- classes / icon / version
function classes(re) {
  const r = new RegExp(re);
  const map = byClass();
  const hits = [...map.keys()].filter((c) => r.test(c)).sort();
  for (const c of hits) {
    const decl = map.get(c).map((x) => (/[:@\s[]/.test(x.sel.replace(/\\./g, '')) ? `${x.sel.replace(/\s+/g, ' ')} { ${x.body} }` : x.body)).join('  |  ');
    console.log(`${c.padEnd(36)} ${decl.length > 220 ? decl.slice(0, 217) + '...' : decl}`);
  }
  console.log(`\n${hits.length} class(es) match /${re}/. Anything not listed here does not exist in the kit CSS.`);
}
function icon(n, size = '16', extra = '', ret = false) {
  const p = findUp(needKit(), `node_modules/@tabler/icons/icons/${n.endsWith('-filled') ? 'filled' : 'outline'}`);
  const file = p && join(p, `${n.replace(/-filled$/, '')}.svg`); // filled icons drop the suffix on disk
  if (!file || !existsSync(file)) fail(`No Tabler icon "${n}". Browse names at https://tabler.io/icons (add -filled for the filled style)`);
  let paths = readFileSync(file, 'utf8').match(/<path[^>]*\/>/g).filter((x) => !/stroke="none"/.test(x)).join('');
  if (n.endsWith('-filled')) paths = paths.replace(/<path /g, '<path fill="currentColor" stroke="none" ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-${n}${extra ? ` ${extra}` : ''}" aria-hidden="true">${paths}</svg>`;
  if (ret) return svg;
  console.log(svg);
}

// ---------- DIAL brand assets (logo, gradient icons) and page patterns, shipped with the skill
const skillDir = dirname(fileURLToPath(import.meta.url));
function assetFile(n) {
  for (const ext of ['svg', 'png']) { const f = join(skillDir, 'assets', `${n}.${ext}`); if (existsSync(f)) return f; }
  fail(`No asset "${n}". Available: ${readdirSync(join(skillDir, 'assets')).map((f) => f.replace(/\.(svg|png)$/, '')).join(', ')}`);
}
function assetDataUri(n) {
  const f = assetFile(n.split(':')[0]);
  return `data:image/${f.endsWith('.png') ? 'png' : 'svg+xml'};base64,${readFileSync(f).toString('base64')}`;
}
function asset(n, height, ret = false) {
  const f = assetFile(n);
  let vw, vh;
  if (f.endsWith('.png')) { const b = readFileSync(f); vw = b.readUInt32BE(16); vh = b.readUInt32BE(20); }
  else [, , vw, vh] = readFileSync(f, 'utf8').match(/viewBox="([^"]*)"/)[1].split(/\s+/).map(Number);
  const h = Number(height ?? vh), w = Math.round((h * vw) / vh * 100) / 100;
  // A data URI keeps the prototype a single file; the image keeps the asset's own colours and gradients.
  const tag = `<img src="${assetDataUri(n)}" width="${w}" height="${h}" alt="" class="shrink-0">`;
  if (ret) return tag;
  console.log(tag);
}
// Partials: <!-- include: navigation [collapsed] [active=ID] [chat=N] [chat-title="…"] [menu=N] [user=open] [item="Label|icon"] -->
// inserts patterns/_navigation.html (or _navigation-collapsed.html). active = new-chat|scheduled|catalog|files
// (tinted pill + assets/nav-ID-active.svg); chat = open conversation row; chat-title renames it; menu = row with
// its "more" button showing; user=open = the footer user button pressed (its menu open).
function expandIncludes(html) {
  return html.replace(/<!-- include: ([\w-]+)((?: [\w-]+(?:=(?:"[^"]*"|[\w|-]+))?)*) -->/g, (_, name, args) => {
    const opt = Object.fromEntries([...args.matchAll(/([\w-]+)(?:=(?:"([^"]*)"|([\w-]+)))?/g)].map((m) => [m[1], m[2] ?? m[3] ?? true]));
    const file = join(skillDir, 'patterns', `_${name}${opt.collapsed ? '-collapsed' : ''}.html`);
    if (!existsSync(file)) fail(`No partial "${file.split('/').pop()}" in patterns/`);
    let part = readFileSync(file, 'utf8');
    // item="Label|tabler-icon" adds a main nav item for a new page (after File manager); active=item highlights it.
    if (typeof opt.item === 'string') {
      const [label, ic = 'point'] = opt.item.split('|');
      part = part.replace(/(<!-- nav-item: files [^>]*-->)/, `$1\n        <!-- nav-item: item "${label}" ${ic} -->`);
    }
    const has = (a) => existsSync(join(skillDir, 'assets', `${a}.svg`));
    part = part.replace(/<!-- nav-item: ([\w-]+) "([^"]+)" ([\w-]+) -->/g, (__, id, label, ic) => {
      const on = opt.active === id;
      const art = on && has(`nav-${id}-active`) ? `<!-- asset: nav-${id}-active 24 -->`
        : !on && has(`nav-${id}`) ? `<!-- asset: nav-${id} 24 -->`
        : `<!-- icon: ${ic} 24${on ? ' text-accent' : ''} -->`;
      const state = on ? 'bg-control-accent-alpha' : 'hover:bg-control-accent-alpha-hover';
      const cur = on ? ' aria-current="page"' : '';
      return opt.collapsed
        ? `<a href="#" data-nav="${id}" aria-label="${label}"${cur} class="flex items-center p-2 rounded-full text-primary ${state}">${art}</a>`
        : `<a href="#" data-nav="${id}"${cur} class="flex w-full items-center gap-2 p-2 rounded-full dial-small-text text-primary ${state}">${art}${label}</a>`;
    });
    const row = (n) => new RegExp(`(<a [^>]*data-chat="${n}"[^>]*class="[^"]*)hover:bg-control-accent-alpha-hover([^"]*"[^>]*>)([\\s\\S]*?)(</a>)`);
    if (opt.chat) part = part.replace(row(opt.chat), (m, a, b, inner, end) => {
      if (typeof opt['chat-title'] === 'string') inner = inner.replace(/(<span class="flex-1[^"]*">)[^<]*(<\/span>)/, `$1${opt['chat-title']}$2`);
      return `${a}bg-control-accent-alpha${b}${inner}${end}`;
    });
    if (opt.menu) part = part.replace(row(opt.menu), (m, a, b, inner, end) =>
      `${a}bg-control-accent-alpha-hover${b}${inner}<span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-control-accent-alpha-hover text-secondary"><!-- icon: dots-vertical 16 --></span>${end}`);
    if (opt.user === 'open') part = part.replace(/(data-user-menu class="[^"]*)hover:bg-control-accent-alpha-hover/, '$1bg-control-accent-alpha-hover');
    return part;
  });
}
// pattern <name>            build a built-in pattern into a page
// pattern <name> --source   print its template (markers unexpanded) to copy and edit as your own page
// pattern <file.tpl.html>   build your own template (same markers: include, render, wrap, icon, asset)
async function pattern(n, source = false) {
  const own = /\.html$/.test(n) && existsSync(n);
  const file = own ? n : join(skillDir, 'patterns', `${n}.html`);
  if (!existsSync(file)) fail(`No pattern "${n}". Available: ${readdirSync(join(skillDir, 'patterns')).filter((f) => /^[a-z].*\.html$/.test(f)).map((f) => f.replace(/\.html$/, '')).join(', ')}`);
  if (source) { console.log(readFileSync(file, 'utf8')); return; }
  let html = expandIncludes(readFileSync(file, 'utf8'));
  // <!-- wrap: Name {props} --> …your markup… <!-- /wrap --> renders a kit component around your markup (as its
  // children, or as the prop named by "@slot", e.g. {"@slot":"footer"}). Nested wraps are expanded innermost first.
  for (let i = 0, m; (m = html.match(/<!-- wrap: (\w+) (\{.*?\}) -->((?:(?!<!-- wrap: )[^])*?)<!-- \/wrap -->/)); i++) {
    const props = parseJson(m[2], `pattern props for ${m[1]}`);
    const slot = props['@slot'] ?? 'children';
    delete props['@slot'];
    const token = `KITSLOT${i}X`;
    const res = [];
    await render([{ name: m[1], props: { ...props, [slot]: token } }], res);
    if (!res[0].html) { console.error(res[0].text.join('\n')); fail(`pattern: ${m[1]} rendered nothing`); }
    if (!res[0].html.includes(token)) fail(`pattern: ${m[1]} did not render its "${slot}" slot`);
    html = html.replace(m[0], () => res[0].html.replace(token, () => m[3]));
  }
  // Kit components are rendered now, so the pattern always matches the installed kit.
  const marks = [...html.matchAll(/<!-- render: (\w+) (\{.*?\}) -->/g)];
  const results = [];
  if (marks.length) await render(marks.map((m) => ({ name: m[1], props: parseJson(m[2], `pattern props for ${m[1]}`) })), results);
  marks.forEach((m, i) => {
    // Notes go to stderr so `pattern x > page.html` stays clean; the overlay/handler hints are expected here.
    const notes = results[i].text.filter((t) => t.startsWith('note:') && !/^note: (overlay|handlers)/.test(t));
    if (!results[i].html) console.error(results[i].text.join('\n'));
    else if (notes.length) console.error(`${m[1]}: ${notes.join(' | ')}`);
    html = html.replace(m[0], () => results[i].html);
  });
  html = html.replace(/<!-- asset: ([\w-]+)(?: (\d+))? -->/g, (_, a, h) => asset(a, h, true));
  html = html.replace(/<!-- icon: ([\w-]+) (\d+)(?: ([^>]*?))? -->/g, (_, i, sz, cls) => icon(i, sz, cls ?? '', true));
  html = html.replace('<!-- kit-link -->', `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/${KIT}@${kitVersion()}/dist/index.css">`);
  if (html.includes('<!-- kit-grid -->')) { const block = await grid(); html = html.replace('<!-- kit-grid -->', () => block); }
  console.log(html);
}

// ---------- kit Grid 2.0, live: AG Grid from jsDelivr + the kit's own theme values, selection controls and empty state
// The kit's Grid is AG Grid with a theme object (GRID_THEME_PARAMS) and `.dial-kit-grid` rules that already ship in the
// kit stylesheet. AG Grid builds its theme CSS in the browser, so a page needs only the AG Grid script and the
// theme values; both are read from the installed kit here, so the block always matches it.
function findFile(dir, test) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') { const r = findFile(p, test); if (r) return r; } }
    else if (test(p)) return p;
  }
  return null;
}
function agGridVersion(kitPath) {
  const dep = JSON.parse(readFileSync(join(kitPath, 'package.json'), 'utf8')).dependencies?.['ag-grid-community'] ?? '';
  const want = dep.replace(/^[^\d]*/, '');
  const bundled = join(kitPath, 'dist/node_modules/ag-grid-community/dist/package/main.esm.js');
  if (existsSync(bundled)) {
    const src = readFileSync(bundled, 'utf8');
    if (want && src.includes(`"${want}"`)) return want;
    const m = src.match(/var \w+ = "(\d+\.\d+\.\d+)", \w+ = 2e3/);
    if (m) return m[1];
  }
  return want || null;
}
function kitGridRuntime(K) {
  const ag = window.agGrid;
  if (ag && ag.ModuleRegistry && ag.AllCommunityModule) ag.ModuleRegistry.registerModules([ag.AllCommunityModule]);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fill = (tpl, map) => tpl.replace(/KIT[A-Z]+/g, (k) => (k in map ? esc(map[k]) : k));
  const node = (html) => { const t = document.createElement('template'); t.innerHTML = html; return t.content.firstElementChild; };
  // Case-insensitive, number-aware sorting, as the kit's baseColumnComparator.
  const compare = (a, b) => {
    if (a == null || a === '') return b == null || b === '' ? 0 : -1;
    if (b == null || b === '') return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  };
  let count = 0;
  return function dialGrid(target, o = {}) {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) throw new Error(`dialGrid: no element ${target}`);
    if (!host.hasAttribute('data-dial-component')) host.setAttribute('data-dial-component', 'Grid');
    if (!ag) { host.textContent = 'The table needs an internet connection: AG Grid loads from cdn.jsdelivr.net.'; return null; }
    const uid = `dial-grid-${++count}`;
    const mode = o.selection; // 'multiple' | 'single' | undefined
    const rowId = o.getRowId || ((d) => String(d.id ?? JSON.stringify(d)));
    const root = document.createElement('div');
    root.className = [K.cls.root, 'size-full', mode && K.cls.withSelection, o.withoutHeaderBorders && K.cls.withoutHeaderBorders].filter(Boolean).join(' ');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', o.ariaLabel || 'Data grid');
    const inner = document.createElement('div');
    inner.className = 'h-full overflow-x-auto';
    root.appendChild(inner);
    host.appendChild(root);

    // Default cell: one truncated line; the full text shows on hover only when it is cut (kit EllipsisTooltip).
    const textCell = (p) => {
      const s = document.createElement('span');
      s.className = 'block min-w-0 max-w-full truncate dial-small-text text-primary';
      const v = p.valueFormatted ?? p.value;
      s.textContent = v == null ? '' : String(v);
      s.addEventListener('mouseenter', () => { s.title = s.scrollWidth > s.clientWidth ? s.textContent : ''; });
      return s;
    };
    // Selection column: the kit's 2.0 Checkbox / Radio (rendered from the installed kit), not AG Grid's inputs.
    const control = (on, id, label) => node(mode === 'single'
      ? fill(on ? K.tpl.radioOn : K.tpl.radioOff, { KITID: `${uid}-${id}`, KITNAME: uid, KITVALUE: id, KITLABEL: label })
      : fill(on ? K.tpl.checkboxOn : K.tpl.checkboxOff, { KITID: `${uid}-${id}`, KITLABEL: label }));
    class SelectCell {
      init(p) {
        this.p = p;
        this.e = document.createElement('div');
        this.e.className = 'flex';
        this.draw = () => this.e.replaceChildren(control(p.node.isSelected(), rowId(p.data), o.selectRowLabel?.(p.data) ?? 'Select row'));
        this.draw();
        p.node.addEventListener('rowSelected', this.draw);
        this.e.addEventListener('click', (ev) => { ev.preventDefault(); p.node.setSelected(mode === 'single' ? true : !p.node.isSelected(), mode === 'single'); });
      }
      getGui() { return this.e; }
      refresh() { return false; }
      destroy() { this.p.node.removeEventListener('rowSelected', this.draw); }
    }
    class SelectAll {
      init(p) {
        this.api = p.api;
        this.e = document.createElement('div');
        this.e.className = 'flex';
        this.draw = () => {
          let s = 0, t = 0;
          this.api.forEachNodeAfterFilter((n) => { if (n.selectable !== false) { t++; if (n.isSelected()) s++; } });
          this.all = t > 0 && s === t;
          const tpl = this.all ? K.tpl.checkboxOn : s > 0 ? K.tpl.checkboxMixed : K.tpl.checkboxOff;
          this.e.replaceChildren(node(fill(tpl, { KITID: `${uid}-all`, KITLABEL: o.selectAllLabel || 'Select all rows' })));
        };
        this.draw();
        this.api.addEventListener('selectionChanged', this.draw);
        this.api.addEventListener('modelUpdated', this.draw);
        this.e.addEventListener('click', (ev) => { ev.preventDefault(); this.all ? this.api.deselectAll('filtered') : this.api.selectAll('filtered'); });
      }
      getGui() { return this.e; }
      refresh() { return false; }
      destroy() {
        if (this.api.isDestroyed()) return;
        this.api.removeEventListener('selectionChanged', this.draw);
        this.api.removeEventListener('modelUpdated', this.draw);
      }
    }
    class Empty {
      init() { this.e = node(fill(K.tpl.empty, { KITTITLE: o.emptyStateTitle ?? K.text.emptyTitle, KITDESC: o.emptyStateDescription ?? K.text.emptyDescription })); }
      getGui() { return this.e; }
    }

    const selectionCol = mode && {
      ...K.selectionColDef, colId: K.selectionColId, headerName: '', headerClass: K.cls.headerSelect, cellClass: K.cls.rowSelect,
      headerComponent: mode === 'multiple' ? SelectAll : undefined, cellRenderer: SelectCell,
    };
    const columns = (o.columnDefs || []).map((c) => (c.cellRenderer || c.children ? c : { ...c, cellRenderer: textCell }));
    const { defaultColDef, rowSelection, onGridReady, onSelectionChanged, ...rest } = o.gridOptions || {};
    const api = ag.createGrid(inner, {
      rowModelType: 'clientSide',
      headerHeight: K.rowHeight,
      rowHeight: K.rowHeight,
      cellSelection: false,
      theme: ag.themeBalham.withPart(ag.colorSchemeLight).withParams({
        ...K.theme,
        browserColorScheme: 'light',
        oddRowBackgroundColor: o.alternateOddRowColors ? K.theme.oddRowBackgroundColor : K.theme.backgroundColor,
        wrapperBorder: o.wrapperBorder !== false,
      }),
      autoSizeStrategy: { type: 'fitGridWidth' },
      columnDefs: selectionCol ? [selectionCol, ...columns] : columns,
      defaultColDef: {
        minWidth: K.minColumnWidth, resizable: true, sortable: true, floatingFilter: true, filter: 'agTextColumnFilter',
        filterParams: { filterPlaceholder: o.filterPlaceholder ?? K.text.filterPlaceholder, buttons: ['reset'] },
        comparator: compare, ...defaultColDef,
      },
      onGridSizeChanged: (e) => e.api.sizeColumnsToFit(),
      onGridReady: (e) => { e.api.sizeColumnsToFit(); onGridReady?.(e); },
      suppressCellFocus: true,
      suppressDragLeaveHidesColumns: true,
      noRowsOverlayComponent: Empty,
      rowData: o.rowData || [],
      rowSelection: mode
        ? { ...(typeof rowSelection === 'object' ? rowSelection : {}), mode: mode === 'single' ? 'singleRow' : 'multiRow', checkboxes: false, headerCheckbox: false }
        : rowSelection,
      onSelectionChanged: (e) => {
        const rows = e.api.getSelectedRows();
        // Once something is selected the selection column stays visible (it is hidden until hover before that).
        root.classList.toggle(K.cls.selectionVisible, rows.length > 0);
        o.onSelectionChange?.(new Set(rows.map(rowId)), rows);
        onSelectionChanged?.(e);
      },
      getRowId: (p) => rowId(p.data),
      ...rest,
    });
    for (const id of o.selectedRowIds || []) api.getRowNode(String(id))?.setSelected(true);
    return api;
  };
}
async function grid() {
  const kitPath = needKit();
  const dist = join(kitPath, 'dist');
  const constFile = findFile(join(dist, 'components'), (p) => /Grid[\\/]constants\.js$/.test(p) && readFileSync(p, 'utf8').includes('GRID_THEME_PARAMS'));
  if (!constFile) fail(`This kit (${kitVersion()}) has no 2.0 Grid theme (GRID_THEME_PARAMS). Use the static tables in the "tables" pattern.`);
  const c = await import(pathToFileURL(constFile).href);
  const rendererConsts = join(dirname(constFile), 'renderers/constants.js');
  const r = existsSync(rendererConsts) ? await import(pathToFileURL(rendererConsts).href) : {};
  const gridJs = join(dirname(constFile), 'Grid.js');
  const gridSrc = existsSync(gridJs) ? readFileSync(gridJs, 'utf8') : '';
  const grab = (re, dflt) => gridSrc.match(re)?.[1] ?? dflt;
  const ver = agGridVersion(kitPath);
  if (!ver) fail(`Couldn't find which AG Grid version kit ${kitVersion()} uses.`);

  const res = [];
  await render([
    { name: 'Checkbox', props: { id: 'KITID', 'aria-label': 'KITLABEL' } },
    { name: 'Checkbox', props: { id: 'KITID', 'aria-label': 'KITLABEL', isSelected: true } },
    { name: 'Checkbox', props: { id: 'KITID', 'aria-label': 'KITLABEL', isSelected: true, isIndeterminate: true } },
    { name: 'Radio', props: { name: 'KITNAME', value: 'KITVALUE', 'aria-label': 'KITLABEL' } },
    { name: 'Radio', props: { name: 'KITNAME', value: 'KITVALUE', 'aria-label': 'KITLABEL', isSelected: true } },
    { name: 'NoDataContent', props: { live: true, title: 'KITTITLE', description: 'KITDESC', icon: '@icon:zoom-cancel:100' } },
  ], res);
  const bad = res.find((x) => !x.html);
  if (bad) fail(`grid: ${bad.name} rendered nothing:\n${bad.text.join('\n')}`);
  // Radio gets a React id: make it a placeholder. The kit draws the empty-state icon with a 0.5 stroke.
  const [checkboxOff, checkboxOn, checkboxMixed, radioOff, radioOn, empty] = res.map((x) => x.html.replace(/(id|for)="_r_\w+_"/g, '$1="KITID"'));
  const K = {
    theme: c.GRID_THEME_PARAMS,
    rowHeight: c.ROW_HEIGHT ?? 40,
    minColumnWidth: Number(grab(new RegExp(`\\b${grab(/minWidth: (\w+),\s*resizable: !0/, 'none')} = (\\d+)`), 150)),
    selectionColId: grab(/= "(dial-kit-grid-selection)"/, 'dial-kit-grid-selection'),
    selectionColDef: r.SELECTION_COL_DEF ?? { width: 40, minWidth: 40, maxWidth: 40, resizable: false, sortable: false, filter: false, floatingFilter: false, suppressMovable: true, suppressHeaderMenuButton: true, suppressAutoSize: true, suppressSizeToFit: true },
    cls: {
      root: c.GRID_ROOT_CLASS, withSelection: c.GRID_WITH_SELECTION_CLASS, withoutHeaderBorders: c.GRID_WITHOUT_HEADER_BORDERS_CLASS,
      rowSelect: c.GRID_ROW_SELECT_CLASS, headerSelect: c.GRID_HEADER_SELECT_CLASS, selectionVisible: c.GRID_SELECTION_VISIBLE_CLASS,
    },
    text: {
      filterPlaceholder: grab(/filterPlaceholder: \w+ = "([^"]*)"/, 'Enter value'),
      emptyTitle: grab(/emptyStateTitle: \w+ = "([^"]*)"/, 'No results found'),
      emptyDescription: grab(/emptyStateDescription: \w+ = "([^"]*)"/, "Sorry, we couldn't find any results for your search."),
    },
    tpl: { checkboxOff, checkboxOn, checkboxMixed, radioOff, radioOn, empty: empty.replace(/stroke-width="1\.5"/, 'stroke-width="0.5"') },
  };
  return [
    `<!-- kit-grid: the kit's Grid 2.0 (AG Grid ${ver}, theme from kit ${kitVersion()}). Generated by kit-lookup.mjs grid; don't edit, regenerate. -->`,
    `<script src="https://cdn.jsdelivr.net/npm/ag-grid-community@${ver}/dist/ag-grid-community.min.js"></script>`,
    `<script data-kit-grid>`,
    `window.dialGrid = (${kitGridRuntime.toString()})(${JSON.stringify(K)});`,
    `</script>`,
    `<!-- /kit-grid -->`,
  ].join('\n');
}

const [cmd, a1, a2] = process.argv.slice(2);
const parseJson = (s, what) => { try { return JSON.parse(s); } catch (e) { fail(`${what} is not valid JSON: ${e.message}`); } };
if (cmd === 'update') update();
else if (cmd === 'search') search(a1);
else if (cmd === 'info' && a1) info(a1);
else if (cmd === 'render' && a1) await render(a1.trim().startsWith('[') ? parseJson(a1, 'render list') : [{ name: a1, props: a2 ? parseJson(a2, 'props') : {} }]);
else if (cmd === 'classes' && a1) classes(a1);
else if (cmd === 'icon' && a1) icon(a1, a2);
else if (cmd === 'asset' && a1) asset(a1, a2);
else if (cmd === 'pattern' && a1) await pattern(a1, a2 === '--source');
else if (cmd === 'grid') console.log(await grid());
else if (cmd === 'version') { const v = kitVersion(); console.log(v); console.log(`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/${KIT}@${v}/dist/index.css">`); }
else {
  const src = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1);
  console.error(src.slice(0, src.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(2);
}
