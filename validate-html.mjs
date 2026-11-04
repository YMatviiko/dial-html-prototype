#!/usr/bin/env node
// Deterministic checker for dial-html-prototype.
// Usage: node validate-html.mjs prototype.html [more.html ...]
// Needs @epam/ai-dial-ui-kit installed (reads node_modules/@epam/ai-dial-ui-kit/dist/index.css).
// Errors fail the run (exit 1); warnings are printed but pass.
//   error   class (in markup or set from <script>) that is not in the kit CSS; tabler-icon* is the only exception
//   error   class defined in the file's own <style> (use kit classes; use data-* or id for JS hooks)
//   error   raw design value in style="", own <style>, SVG paint attributes or script-set styles:
//           hex / colour functions / named colours, any length unit except 0 and %, var() of a non-kit variable
//           (exception: px for layout sizes — width/height and their min/max — when the kit has no class)
//   error   custom property (--x) declared in the file: prototypes are light theme only, no overrides
//   error   kit stylesheet missing / not rel=stylesheet / not pinned to the installed version
//   error   any other stylesheet, @import, or external <script src> (Google Fonts is the only extra allowed)
//   error   Inter not loaded or not set on body; missing "DIAL prototype" comment
//   error   interactive markup but no data-dial-component tags; 1.0 data-dial-component (Dial*)
//   warning data-dial-component name not found in the kit manifest
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function findUp(start, rel) {
  for (let d = start; ; d = dirname(d)) {
    if (existsSync(join(d, rel))) return join(d, rel);
    if (dirname(d) === d) return null;
  }
}
const here = dirname(fileURLToPath(import.meta.url));
const REL = 'node_modules/@epam/ai-dial-ui-kit/dist/index.css';
const cssPath = findUp(process.cwd(), REL) ?? findUp(here, REL);
if (!cssPath) {
  console.error('FAIL: kit stylesheet not found (' + REL + '). Is @epam/ai-dial-ui-kit installed? Run the Setup Check.');
  process.exit(1);
}
const kitVersion = JSON.parse(readFileSync(cssPath.replace(/dist\/index\.css$/, 'package.json'), 'utf8')).version;
const KIT_HREF = `https://cdn.jsdelivr.net/npm/@epam/ai-dial-ui-kit@${kitVersion}/dist/index.css`;
const manifestPath = cssPath.replace(/index\.css$/, 'components-manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const componentNames = manifest ? new Set(manifest.components.map((c) => c.name)) : null;

// Kit class set: selectors only. Empty innermost rule bodies and drop url()/at-rule preludes first, so
// decimals ("0.5rem" -> "5rem") and data-URI hosts ("www.w3.org") don't leak in as fake classes.
const classRe = /\.((?:\\.|[A-Za-z0-9_-])+)/g;
const kitCss = readFileSync(cssPath, 'utf8');
const selectorsOnly = kitCss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '').replace(/\{[^{}]*\}/g, '{}').replace(/@[^{;]*/g, '');
const kitClasses = new Set([...selectorsOnly.matchAll(classRe)].map((m) => m[1].replace(/\\(.)/g, '$1')));
const kitVars = new Set([...kitCss.matchAll(/--[\w-]+/g)].map((m) => m[0]));
const LAYOUT_SIZES = new Set(['width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'flex-basis']);
const isAllowedClass = (c) => kitClasses.has(c) || c === 'tabler-icon' || c.startsWith('tabler-icon-');

const NAMED_COLOURS = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));
// Known gaps in the pruned kit build, with what to use instead.
const SUBSTITUTES = {
  'mx-auto': 'center with a flex parent: "flex justify-center"',
  'mr-auto': 'use "ml-auto" on the next sibling, or "justify-between" on the parent',
  'h-screen': 'use "min-h-screen", or html,body{height:100%} in <style> plus "h-full"',
  'hover:underline': 'use a LinkButton imitation (dial-kit-primary-link-button)',
  'max-w-sm': 'use max-w-[420px]', 'max-w-md': 'use max-w-[450px]', 'max-w-lg': 'use max-w-[600px]',
  'max-w-xl': 'use max-w-[600px]', 'max-w-2xl': 'use max-w-[600px] or max-w-full', 'max-w-3xl': 'use max-w-full or max-w-[600px]',
  // dropped in kit 0.16 (Tailwind v4)
  'text-tertiary': 'use "text-secondary" (the kit\'s own hint colour)',
  'outline-none': 'on a bare textarea/input use style="outline: none"',
  'placeholder:text-secondary': 'leave it out: the default placeholder colour is what the kit\'s inputs use',
  'z-10': 'use "z-popup" on a page overlay; a raised sidebar only needs "relative"',
  'z-50': 'use "z-popup"',
  'self-end': 'use "items-end" on the parent, or "self-stretch flex items-end"',
  'pl-6': 'use "ml-6", or "pl-4" plus "ml-2" on the first child',
  'grid-cols-4': 'use "grid" + style="grid-template-columns: repeat(4, minmax(0, 1fr))"',
  'break-all': 'use "break-words"',
};
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function suggest(cls) {
  if (SUBSTITUTES[cls]) return ` Instead: ${SUBSTITUTES[cls]}.`;
  const m = cls.match(/^(?:([a-z-]+:))?w-(\d+(?:\.\d+)?)$/);
  if (m && kitClasses.has(`${m[1] ?? ''}size-${m[2]}`)) return ` For a square, "size-${m[2]}" exists.`;
  const head = cls.replace(/^([a-z-]+:)*/, '').split('-')[0];
  const near = [...kitClasses].filter((k) => k.replace(/^([a-z-]+:)*/, '').split('-')[0] === head)
    .map((k) => [k, lev(cls, k)]).filter(([, n]) => n <= 3).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k]) => k);
  return near.length ? ` Nearest kit classes: ${near.join(', ')}.` : ' Check with: node kit-lookup.mjs classes <regex>.';
}

const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: node validate-html.mjs file.html [...]'); process.exit(2); }

const findings = [];
const blank = (s) => s.replace(/[^\n]/g, ' '); // keep offsets/lines stable when masking

for (const file of files) {
  if (!existsSync(file)) { findings.push({ file, line: 0, col: 0, level: 'error', rule: 'missing-file', msg: 'file not found' }); continue; }
  const raw = readFileSync(file, 'utf8');
  const nl = [];
  for (let i = 0; i < raw.length; i++) if (raw[i] === '\n') nl.push(i);
  const lineOf = (i) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < i) lo = mid + 1; else hi = mid; } return lo + 1; };
  const add = (at, level, rule, msg) => findings.push({ file, line: lineOf(at), col: at, level, rule, msg });

  // Mask scripts first (so "<!--" inside a JS string can't hide markup), then comments.
  const scripts = [...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let text = raw;
  for (const s of scripts) { const start = s.index + s[0].indexOf('>') + 1; text = text.slice(0, start) + blank(s[2]) + text.slice(start + s[2].length); }
  text = text.replace(/<!--[\s\S]*?(?:-->|$)/g, blank);

  // ---- value checks shared by style="", own <style>, SVG paint attributes and script-set styles
  const checkValue = (value, at, allowPx = false) => {
    const v = value.replace(/url\([^)]*\)/gi, blank); // url(#gradient) and file names are not colours
    for (const h of v.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g))
      add(at + h.index, 'error', 'raw-value', `Raw hex colour "${h[0]}" — use a kit colour class.`);
    for (const h of v.matchAll(/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/gi))
      add(at + h.index, 'error', 'raw-value', `Raw colour function "${h[1]}()" — use a kit colour class.`);
    for (const h of v.matchAll(/(?<![\w#-])([a-z]+)(?![\w-]|\()/gi))
      if (NAMED_COLOURS.has(h[1].toLowerCase()))
        add(at + h.index, 'error', 'raw-value', `Named colour "${h[1]}" — use a kit colour class.`);
    for (const h of v.matchAll(/(?<![\w#.-])-?(\d*\.?\d+)(px|r?em|pt|pc|vh|vw|dvh|svh|lvh|vmin|vmax|ch|ex|cm|mm|in|q)\b/gi))
      if (parseFloat(h[1]) !== 0 && !(allowPx && h[2].toLowerCase() === 'px'))
        add(at + h.index, 'error', 'raw-value', `Raw "${h[0]}" — use a kit spacing/size class (find one: node kit-lookup.mjs classes <regex>).`);
    for (const h of v.matchAll(/var\(\s*(--[\w-]+)/g))
      if (!kitVars.has(h[1]))
        add(at + h.index, 'error', 'unknown-variable', `"${h[1]}" is not a kit variable.`);
  };
  // declarations "a: b; c: d" starting at absolute offset `at`
  const checkDecls = (decls, at) => {
    const clean = decls.replace(/\/\*[\s\S]*?\*\//g, blank);
    for (const d of clean.matchAll(/([^;{}]+?):([^;{}]*)/g)) {
      const prop = d[1].trim();
      if (prop.startsWith('--')) add(at + d.index, 'error', 'no-theme-override', `Custom property "${prop}" declared — prototypes use the kit's light theme as is.`);
      // Exact layout sizes from a design (e.g. a 336px sidebar) may be px when the kit has no class; spacing and colour may not.
      checkValue(d[2], at + d.index + d[1].length + 1, LAYOUT_SIZES.has(prop.toLowerCase()));
    }
  };

  // ---- own <style>: no class definitions, no @import, values checked
  for (const b of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const start = b.index + b[0].indexOf('>') + 1;
    const body = b[1].replace(/\/\*[\s\S]*?\*\//g, blank);
    for (const m of body.matchAll(/@import\b/g)) add(start + m.index, 'error', 'no-extra-css', '@import is not allowed — the kit stylesheet and Inter are the only CSS.');
    for (const r of body.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const sel = r[1].replace(/url\([^)]*\)/g, '');
      for (const c of sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g))
        add(start + r.index + c.index, 'error', 'own-class', `Own class ".${c[1]}" defined — style with kit classes only; use data-* or id for JS hooks.`);
      checkDecls(r[2], start + r.index + r[1].length + 1);
    }
  }

  // ---- style="" attributes
  for (const m of text.matchAll(/(?<![\w:-])style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const v = m[1] ?? m[2];
    checkDecls(v, m.index + m[0].indexOf(v));
  }

  // ---- SVG paint attributes
  for (const m of text.matchAll(/(?<![\w:-])(fill|stroke|stop-color|flood-color|lighting-color|color)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const v = (m[2] ?? m[3]).trim();
    // var(--kit-token, fallback) is a kit token (the kit's own icons use it); only a kit variable counts.
    const kitVar = v.match(/^var\(\s*(--[\w-]+)/);
    if (kitVar && kitVars.has(kitVar[1])) continue;
    if (!/^(none|currentColor|transparent|inherit|url\(#[^)]*\))$/i.test(v))
      add(m.index, 'error', 'raw-value', `${m[1]}="${v}" — SVGs use stroke/fill="currentColor" (or none) and get colour from a kit text-* class.`);
  }

  // ---- class="" in markup
  // `at` = absolute offset of `list`, so each token is reported on its own line/column
  const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  const checkClasses = (list, at, where) => {
    for (const t of list.matchAll(/\S+/g)) {
      const cls = t[0].replace(/&(amp|lt|gt|quot|#39);/g, (e) => entities[e]); // attribute values are HTML-escaped
      if (/[${}]/.test(cls)) continue; // template placeholder
      if (!isAllowedClass(cls))
        add(at + t.index, 'error', 'unknown-class', `"${cls}"${where} is not in the kit CSS — it would silently do nothing.${suggest(cls)}`);
    }
  };
  const valueAt = (m, v) => m.index + m[0].lastIndexOf(v);
  for (const m of text.matchAll(/(?<![\w:.-])class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
    const v = m[1] ?? m[2] ?? m[3];
    checkClasses(v, valueAt(m, v), '');
  }

  // ---- scripts: external src, classes and styles set from JS
  for (const s of scripts) {
    if (/\bsrc\s*=/i.test(s[1])) {
      const src = (s[1].match(/\bsrc\s*=\s*["']?([^"'\s>]+)/i) || [])[1] ?? '';
      add(s.index, 'error', /tailwind|twind|unocss/i.test(src) ? 'no-tailwind-cdn' : 'no-external-script',
        `External script "${src}" — only a small inline <script> is allowed (no frameworks, no Tailwind runtime).`);
    }
    const start = s.index + s[0].indexOf('>') + 1;
    const js = s[2].replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, blank); // drop template expressions, keep offsets
    for (const m of js.matchAll(/(?<![\w-])class\s*=\s*(?:\\?"([^"\\]*)\\?"|'([^']*)')/g)) { const v = m[1] ?? m[2]; checkClasses(v, start + valueAt(m, v), ' (in script markup)'); }
    // Only arguments that are a bare string literal are class names (toggle's 2nd argument is a condition).
    for (const m of js.matchAll(/classList\.(add|remove|toggle|replace|contains)\(/g)) {
      let depth = 1, i = m.index + m[0].length, arg = '', argAt = i;
      const args = [];
      for (; i < js.length && depth; i++) {
        const ch = js[i];
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        if (depth === 0 || (depth === 1 && ch === ',')) { args.push([arg, argAt]); arg = ''; argAt = i + 1; continue; }
        arg += ch;
      }
      const literal = m[1] === 'toggle' ? args.slice(0, 1) : args;
      for (const [a, at] of literal) {
        const q = a.match(/^\s*(['"`])([^'"`]*)\1\s*$/);
        if (q) checkClasses(q[2], start + at + a.indexOf(q[2]), ' (set from script)');
      }
    }
    for (const m of js.matchAll(/\bclassName\s*[+]?=\s*(['"`])([^'"`]*)\1/g)) checkClasses(m[2], start + valueAt(m, m[2]), ' (set from script)');
    for (const m of js.matchAll(/setAttribute\(\s*['"]class['"]\s*,\s*(['"`])([^'"`]*)\1/g)) checkClasses(m[2], start + valueAt(m, m[2]), ' (set from script)');
    for (const m of js.matchAll(/\.style\.[\w]+\s*=\s*(['"`])([^'"`]*)\1/g)) checkValue(m[2], start + valueAt(m, m[2]));
    for (const m of js.matchAll(/(?:cssText\s*=|setAttribute\(\s*['"]style['"]\s*,)\s*(['"`])([^'"`]*)\1/g)) checkDecls(m[2], start + valueAt(m, m[2]));
  }

  // ---- stylesheets and fonts
  const links = [...text.matchAll(/<link\b[^>]*>/gi)].map((m) => {
    const attr = (n) => (m[0].match(new RegExp(`\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')) || []).slice(1).find((x) => x !== undefined) ?? '';
    return { at: m.index, rel: attr('rel').toLowerCase(), href: attr('href') };
  });
  const kitLinks = links.filter((l) => /ai-dial-ui-kit/.test(l.href));
  if (!kitLinks.length) add(0, 'error', 'no-kit-stylesheet', `Kit stylesheet is not linked. Paste: <link rel="stylesheet" href="${KIT_HREF}">`);
  for (const l of kitLinks)
    if (l.rel !== 'stylesheet' || l.href !== KIT_HREF)
      add(l.at, 'error', 'kit-version', `Kit link must be exactly <link rel="stylesheet" href="${KIT_HREF}"> (installed version ${kitVersion}).`);
  for (const l of links)
    if (l.rel.includes('stylesheet') && !/ai-dial-ui-kit/.test(l.href) && !/^https:\/\/fonts\.googleapis\.com\//.test(l.href))
      add(l.at, 'error', /tailwind/i.test(l.href) ? 'no-tailwind-cdn' : 'no-extra-css', `Extra stylesheet "${l.href}" — only the kit stylesheet and Google Fonts (Inter) are allowed.`);
  if (!links.some((l) => /fonts\.googleapis\.com\/css2?\?[^"']*family=Inter\b/.test(l.href)))
    add(0, 'error', 'no-inter', 'Inter is not loaded — add the Google Fonts <link> for Inter (the kit ships no font file).');
  if (!/body[^{]*\{[^}]*font-family\s*:\s*['"]?Inter\b/i.test([...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((b) => b[1]).join('\n')))
    add(0, 'error', 'no-inter', 'Set body { font-family: Inter, system-ui, sans-serif; } in a <style> block.');
  if (!/<!--\s*DIAL prototype/i.test(raw))
    add(0, 'error', 'no-prototype-label', 'Missing "<!-- DIAL prototype — not production code -->" comment at the top.');

  // ---- hidden attribute next to a display utility: the utility wins, so the element stays visible
  for (const m of text.matchAll(/<[a-z][\w-]*\b[^>]*>/gi)) {
    const tag = m[0];
    if (/\shidden(?=[\s>=\/])/i.test(tag) && /\bclass\s*=\s*["'][^"']*(?<![\w:-])(flex|grid|block|inline-flex|inline-block)(?![\w-])/i.test(tag))
      add(m.index, 'warning', 'hidden-attr', 'hidden attribute is overridden by the display class — toggle the kit "hidden" class instead.');
  }

  // ---- component tags
  const tags = [...text.matchAll(/data-dial-component\s*=\s*["']([^"']+)["']/g)];
  if (!tags.length && /<(button|input|select|textarea)\b/i.test(text))
    add(0, 'error', 'no-component-tags', 'Interactive elements but no data-dial-component tags — tag every imitated component with its real 2.0 name.');
  for (const m of tags) {
    const name = m[1];
    if (/^Dial[A-Z]/.test(name))
      add(m.index, 'error', 'no-1.0-components', `"${name}" is a 1.0 component — use its 2.0 replacement.`);
    else if (componentNames && !componentNames.has(name))
      add(m.index, 'warning', 'unknown-component', `"${name}" is not in the kit manifest — check with kit-lookup.mjs search, or drop the tag for plain layout.`);
  }
}

console.log(`dial-html-prototype validator — kit ${kitVersion} css: ${cssPath} (${kitClasses.size} classes known)`);
console.log(`files checked: ${files.length}`);
const errors = findings.filter((f) => f.level === 'error');
const warnings = findings.filter((f) => f.level === 'warning');
const show = (list) => {
  const seen = new Set();
  for (const f of [...list].sort((a, b) => a.file.localeCompare(b.file) || a.col - b.col)) {
    const k = `${f.file}:${f.col}:${f.rule}:${f.msg}`;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`  ${f.file}:${f.line} [${f.rule}] ${f.msg}`);
  }
};
if (warnings.length) { console.log(`\n${warnings.length} warning(s):\n`); show(warnings); }
if (!errors.length) { console.log('\nPASS' + (warnings.length ? ' — no blocking violations (warnings above).' : ' — no violations found.')); process.exit(0); }
console.log(`\nFAIL — ${errors.length} error(s):\n`); show(errors);
process.exit(1);
