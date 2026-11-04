---
name: dial-html-prototype
description: Build a standalone HTML prototype/mockup (single .html file, no build step, no React) in DIAL design-system 2.0 styling, using the latest @epam/ai-dial-ui-kit — its real component markup and its stylesheet. Use when someone asks for a prototype, mockup, wireframe, demo page, clickable concept or "static HTML" in DIAL styles — including when they don't mention the kit. NOT for production UI in a React/TSX project; for that use the dial-design-vibecode skill.
---

# DIAL HTML Prototype

You are helping someone (often a designer or PM, not an engineer) make a **throwaway HTML
prototype** that looks like DIAL 2.0. It is a visual concept, not production code. The kit's React
components can't run in plain HTML, so the skill **renders the real components to static HTML** with the
installed kit and styles the page with the kit's own stylesheet. Never invent colours, spacing or fonts.

If the person actually wants a real feature in a React/TSX project, stop and use
`dial-design-vibecode` instead. Prototypes are never merged into a product codebase.

## Tools

Everything goes through one script, run from the prototype folder. `K` below is shorthand for
`node .claude/skills/dial-html-prototype/kit-lookup.mjs`; type the full command (in zsh a `K="…"` variable
doesn't work, a shell function does):

| Need | Command |
|---|---|
| Install / upgrade the kit to the latest version | `K update` |
| Find a component ("modal", "dropdown", "badge"…) | `K search <text>` |
| Its props, enum values and examples | `K info <Name>` |
| **Its real HTML**, rendered by the installed kit | `K render <Name> '<props JSON>'` (several: `K render '[{"name":…,"props":…}, …]'`) |
| Whether a utility class exists, and what it does | `K classes '<regex>'` |
| A standalone icon | `K icon <tabler-name> [16\|20\|24]` (add `-filled` for the filled style) |
| A DIAL brand asset (logo, gradient icons, model icon) | `K asset <name> [height]` |
| **A DIAL page template** to start from (table below) | `K pattern <name> --source > page.tpl.html` |
| Build your edited template into the prototype | `K pattern page.tpl.html > page.html` |
| The stylesheet `<link>` to paste | `K version` |

[`components.md`](components.md) (next to this file) has the props-JSON syntax, render recipes for common
components, the page skeleton, tokens, typography, layout gaps, and the few things rendering can't produce
(data grid, tooltip, overlays inside a section, status pills, plain layout). Read it before building.
These are the only sanctioned ways to read the kit: don't `grep`/`find` inside `node_modules`.

## Setup (every run)

Run `K update` first. It installs the kit if the folder has none, upgrades it if npm has a newer version, and
adds what `render` needs (`react`, `react-dom`, `jsdom`). Report its result line in your reply (e.g. "kit
updated 0.14.2 → 0.15.4"). Offline, it keeps the installed kit. If it fails, show the real error and stop;
don't build from memory. No MCP server or session restart is needed.

## Rules

1. **One self-contained `.html` file** that opens by double-click. No build tools, no frameworks, no
   Tailwind CDN, no external scripts. Plain HTML + CSS, plus an optional small inline `<script>` for
   click-through behaviour.
2. **Start from the page skeleton in `components.md`**: Inter from Google Fonts, the kit stylesheet pinned to
   the installed version (exact line from `K version`), `font-family: Inter, system-ui, sans-serif` on `body`.
3. **Light theme only.** Use the kit's built-in light values. Don't declare CSS variables (`--x: …`) or
   add any theme override. If someone asks for dark mode, say the prototype skill builds light only.
4. **Every kit component comes from `K render`, pasted as printed.** Don't write component markup by hand,
   don't trim its classes, don't copy markup from an older prototype (the kit changes between versions). Read
   the `note:` lines: a wrong prop name, a failed render (check `K info`), a full-page overlay. The one
   sanctioned edit is showing an overlay inside a section, as described in `components.md`.
5. **Your own markup (layout, plain elements) uses only classes that exist in the kit CSS** (plus
   `tabler-icon*` on icons). The kit CSS is a pruned Tailwind build: a missing class silently does nothing
   (`mx-auto`, `h-screen`, `w-4`, `max-w-sm` don't exist). Check with `K classes`; `components.md` lists the
   common gaps and substitutes.
6. **No own classes and no raw values.** The page's `<style>` holds only the skeleton rules. No hex, `rgb()`,
   named colours, or `px`/`rem`/`em`/`vh` values in `style=""`, `<style>`, SVG `fill`/`stroke`, or styles set
   from the script. Percentages are fine. One exception: an exact **layout size** from the design (width,
   height and their min/max, e.g. `style="width: 336px"`) may be px when the kit has no class for it.
   Spacing and colour never are.
7. **Icons are Tabler** (the kit's set): pass `"@icon:<name>"` in render props, or inline `K icon` for a
   standalone icon, coloured with a kit `text-*` class. Brand art with its own colours or gradients (the DIAL
   Chat logo, the New chat icon, the starter sparkles, model icons) comes from `K asset`. No hand-drawn icons or
   emoji.
8. **Script hooks use `id` or `data-*` attributes, never made-up classes.** Show and hide with the kit's
   `hidden` class (`el.classList.toggle('hidden')`); the `hidden` attribute loses to `flex`/`grid`.
   Any class the script adds must exist in the kit CSS too.
9. **Use only 2.0 components, and search before hand-building.** `K search` marks 1.0 (`Dial*`) components
   and names their 2.0 replacement; never use a 1.0 one. Newer kits add components (avatars, badges, drawers),
   so search for every element before treating it as plain layout. Rendered markup, including nested
   components, is already tagged with `data-dial-component`; keep the tags. Plain
   layout (app shell, cards, lists, chat messages) gets no tag; `components.md` has patterns for it. If
   nothing fits (e.g. status pills), use the closest pattern there and say what's approximate. Don't invent
   component names.
10. **Colour pairings for your own markup** follow the token table in `components.md`: text on a filled
    control is `text-control-permanent`; `text-control-inverted` only goes on `bg-control-inverted`; field
    borders are `border-secondary`, dividers `border-tertiary`. Don't use legacy 1.0 tokens (`bg-layer-0…4`,
    `bg-controls-*`, `text-accent-primary`).
11. **Label it as a prototype.** Keep `<!-- DIAL prototype — not production code -->` right after
    `<!doctype html>`. In your reply, say it is an approximation, give the kit version, and list the
    `data-dial-component` names used, so an engineer knows what to build with.

## Starting point: the closest DIAL page pattern

People use this skill to sketch **new features**, without a design. So never invent the app around the feature:
start from the closest page pattern (`patterns/`, built from the latest DIAL Chat 2.0 designs) and add the
feature to it.

| Area | Pattern | Use it for |
|---|---|---|
| Chat | `dial-chat` | Start screen: greeting, composer (model picker inside), conversation starters |
| | `chat-conversation` | A conversation: user bubble with edit/delete, assistant answer with rich text, composer at the bottom |
| | `chat-content` | Copyable message blocks: attachments, citations, answer actions, code block, table, composer with files |
| | `chat-states` | Usage-limit banners, model dropdown, chat actions menu with submenu |
| Catalog | `catalog` | Catalog list: favorites, browse header, search + filter, tabs with counts, card grid |
| | `catalog-details` | Entity details side panel over the catalog (identity, actions, tabs) |
| | `catalog-delete` | Destructive confirmation inside the side panel |
| Toolsets | `toolsets-editor` | Create/edit form with metadata column and setup (auth options) — any entity editor |
| | `toolsets-details` | Toolset details drawer with tabs (About / Overview / Tools / Connect) |
| QuickApp | `quickapp-builder` | Agent/app builder: metadata, instructions editor + add-on cards, configuration column |
| | `quickapp-add-skill` | Catalog picker popup (search, filter, selectable table) opened from an "Add" button |
| | `quickapp-preview` | Preview/test-chat mode with "Back to setup" |
| Scheduled tasks | `scheduled-tasks` | Task list: header, search, sort, card grid with states |
| | `scheduled-task-form` | Create/edit task: details column + configuration with markdown editor |
| | `scheduled-task-view` | Task details with switch, actions and run history |
| | `scheduled-task-run` | A run's conversation with the task's right panel |
| File manager | `files` | Folder tree, file table, selection + bulk actions bar |
| | `files-empty` | Empty folder with breadcrumbs |
| | `files-move` | Move/Copy side drawer with folder tree |
| Settings | `settings` | Settings popup (section rail + form) — any settings or preferences form |
| | `settings-extensions` | Connections/integrations table in settings |
| | `settings-menu` | Nav-footer user menu open (Settings / Log out) |
| Tables | `tables` | Every table type from the Components 2.0 spec: chat table, admin data / entity / editable / heat map, sorting, filtering, pinned actions, double header, cell states — copy the one you need into a page |

Pick by **layout**, not by name: a new "agent permissions" page is probably `toolsets-editor` or `settings`;
a new list of things is `scheduled-tasks` or `catalog`; anything in a conversation is `chat-conversation` +
blocks from `chat-content`. If nothing fits, say so, build from the skeleton in `components.md`, and list it as
approximate. Never invent a different app shell, header or composer. Pattern syntax (navigation options,
`wrap`, assets) is in [`patterns/README.md`](patterns/README.md).

## Workflow

0. `K update`.
1. Clarify only what blocks you (what feature, where it lives in the product, what states). Don't ask about
   styling: DIAL 2.0 styling is the rule, not a choice.
2. Copy the closest pattern's template (`K pattern <name> --source > page.tpl.html`) and add the feature **in
   the template**: it is short and readable, and it keeps the markers (`include: navigation` with its options,
   `render`, `wrap`, `icon`, `asset` — see `patterns/README.md`). Build it with `K pattern page.tpl.html >
   page.html`; rebuild after every edit. Never edit the generated page by hand (it inlines all images). With no
   fitting pattern, start a template from the skeleton in `components.md`.
3. Read `components.md`. List the remaining UI elements and map each to a 2.0 component (`K search`; the
   recipes cover the common ones). Check props with `K info` when unsure.
4. Render the components, ideally in one batch call, and assemble the page from the starting point, rendered
   markup and kit-class layout.
5. Validate, fix every error, and re-run until it passes:
   ```
   node .claude/skills/dial-html-prototype/validate-html.mjs path/to/prototype.html
   ```
   Unknown-class errors suggest the nearest real class. Warnings are shown, not hidden.
6. **Look at it.** Screenshot it and read the image:
   ```
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=5000 --screenshot=/tmp/proto.png file:///abs/path/prototype.html
   ```
   (Linux: `google-chrome` / `chromium`.) Check that nothing is unstyled or invisible (e.g. a tag on a
   same-colour card), buttons haven't stretched across a column, and text is readable. Fix and repeat
   steps 5–6. If no browser is available, say you couldn't check it visually.
7. Tell the person how to open it (double-click the file), the kit version, what is approximate, and which
   real components it stands in for.

## Handoff

If the prototype is approved for real build, the engineer starts a fresh task with
`dial-design-vibecode` and uses the `data-dial-component` tags as the component list. The
prototype is a reference, not source to copy.

## Maintaining this skill

New kit components need no change here: `K update` + `K search`/`K render` pick them up. After a kit upgrade,
re-check the hand-written parts of `components.md` (the Grid table, Tooltip, status pills, plain layout, the
gaps table): build a page from them and run the validator, which flags any class the new kit dropped.
