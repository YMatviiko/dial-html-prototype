# DIAL 2.0 HTML cheatsheet

Component markup comes from the installed kit, not from this file:

```
node .claude/skills/dial-html-prototype/kit-lookup.mjs render PrimaryButton '{"label":"Save"}'
```

This file covers what rendering can't give you: the page skeleton, tokens, typography, layout gaps, and the
few things a static page can't render (data grid, which runs live, hover tooltip, overlays shown inside a section, status
pills, plain layout).

## Rendering components

1. Find the component: `kit-lookup.mjs search <text>` (e.g. `search modal` → `Popup`).
2. Read its props: `kit-lookup.mjs info <Name>`. Enum props list their string values.
3. Render it: `kit-lookup.mjs render <Name> '<props JSON>'`, or several at once with
   `render '[{"name":"…","props":{…}}, …]'`.
4. Paste the HTML **as printed**. It already carries `data-dial-component`, real icons and every state class.
   Read the `note:` lines under it. They tell you about props the component doesn't have, or that it's a
   full-page overlay.

Props JSON:
- Plain values work as in the React examples: `{"label":"Save","disabled":true}`.
- Enums take their string value: `{"size":"sm"}`, `{"variant":"danger"}`, `{"appearance":"selectable"}`.
- Icons: `"@icon:plus"`, or with a size `"@icon:x:16"`. Example: `{"iconBefore":"@icon:plus"}` on buttons, `{"icon":"@icon:send"}` on icon buttons.
- A nested component: `{"@component":"PrimaryButton","label":"Ok"}`. A plain element (lowercase name) for
  layout inside a rendered container: `{"@component":"dl","className":"flex flex-col gap-3 px-6 py-4","children":[…]}`
  (kit classes only).
- Handlers (`onClick`, `onRemove`…) are added for you, so optional controls show (a Tag's remove button). If one
  appears that you don't want (e.g. SideDrawer's Back button), pass the handler as `null`: `{"onBack":null}`.
- Size: if a note says an inline size was dropped, pass `"className"` with a kit size class (`K classes '^size-'`).
- Images in props (`Avatar` `src`, `EntityIdentity` `item.iconUrl`): `"@asset:model-gpt"`.
- `onBack` is never added for you (it draws a Back button); pass `"onBack": true` to show one.
- To put your own markup inside a kit container (Popup body, SideDrawer content), use the `wrap` marker in a
  pattern (`patterns/README.md`) instead of nesting long JSON. A Popup body has no padding of its own: wrap your
  content in `<div class="flex flex-col gap-4 px-6 py-4">`, as the header and footer use `px-6 py-4`.
- Open states: Select, Dropdown and Popup take `"open": true`. The menu is placed right under its field.

Recipes that work as-is:

| Want | Render |
|---|---|
| Primary / neutral / outlined / ghost / link / danger button | `PrimaryButton` `NeutralButton` `OutlinedButton` `GhostButton` `LinkButton` `DangerButton` with `{"label":"…"}` |
| Button with icon | `PrimaryButton {"label":"New","iconBefore":"@icon:plus"}` |
| Icon-only button | `PrimaryIconButton` / `GhostIconButton` / `DangerIconButton` `{"aria-label":"Send","icon":"@icon:send"}`; add `"size":"small"` for 24px |
| Text field | `Input {"id":"name","labelProps":{"label":"Name"},"placeholder":"…"}`; add `"invalid":true,"error":"…"` or `"disabled":true` |
| Search | `Search {"placeholder":"Search applications"}` |
| Select | `Select {"id":"m","labelProps":{"label":"Model"},"options":[{"value":"a","label":"GPT-4o"}],"value":"a"}` (+ `"open":true`) |
| Checkbox / Switch / Radio | `Checkbox {"id":"c","labelProps":{"label":"…"},"isSelected":true}`, `Switch {…,"isOn":true}`, `Radio {"id":"r","name":"g","value":"m","labelProps":{"label":"…"},"isSelected":true}` |
| Tabs | `Tabs {"ariaLabel":"…","tabs":[{"id":"a","label":"Models","count":12}],"activeTabId":"a"}` |
| Tag | `Tag {"label":"…"}`; `"closable":true`; `"appearance":"selectable","selected":true` |
| Inline alert | `Notification {"variant":"info","type":"section-message","title":"…","message":"…"}` |
| Card in a browse grid | wrap your card content in `CardShell` (as in `catalog`, `scheduled-tasks`) |
| Status / schedule label | `Badge {"label":"Active"}` (variants via `K info Badge`) |
| Markdown / instructions editor | the kit `MarkdownEditor` can't render statically: copy the editor block from `scheduled-task-form` |
| Modal / confirm dialog | `Popup {"open":true,"header":"…","size":"sm","children":"…"}`; `ConfirmationPopup {"open":true,"header":"…","description":"…","variant":"danger","confirmLabel":"Delete"}` |

Anything else: `search`, then `info`, then `render`. **Search before hand-building anything**: newer kits keep
adding components (0.15 added e.g. `Badge`, `Avatar`, `SideDrawer`, `BottomSheet`; 0.16 adds `ToggleChip`,
`FormSection`, `SelectedEntityCard`, `LoginScreen`). If a render prints nothing, the component only appears on
interaction (try `"open":true`) or needs props you didn't pass (`info` lists the required ones).

## DIAL screens: start from a pattern

Every DIAL Chat area has page patterns built from the latest Figma designs (table in SKILL.md; syntax in
`patterns/README.md`). Start from one with `K pattern <name> > page.html` and add the feature. What the patterns
show that you must keep:
- **Navigation**: the shared sidebar (336px, raised, no border) or, on builders/editors/forms, the 72px rail.
  The current page or conversation is a tinted pill. There is **no header bar** above chat content.
- **Composer**: one card with the text line on top and `+`, model picker and mic (send button once filled)
  below. 700px on the start screen, 748px in a conversation, pinned at the bottom.
- **Messages**: user message right-aligned in a tinted bubble with edit/delete under it; assistant answer with
  the model icon and rich text, actions under it (`chat-content` has the blocks).
- **Overlays**: details and moves open as a 540px side drawer (`SideDrawer`); confirmations and pickers as a
  `Popup`. Settings is a large popup over the app.

## Page skeleton

```html
<!doctype html>
<!-- DIAL prototype — not production code -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Screen name</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap">
  <!-- exact line from: node .claude/skills/dial-html-prototype/kit-lookup.mjs version -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@epam/ai-dial-ui-kit@VERSION/dist/index.css">
  <style>
    html, body { height: 100%; }
    body { font-family: Inter, system-ui, sans-serif; }
  </style>
</head>
<body class="bg-layer-base text-primary dial-small-text">
  ...
</body>
</html>
```

App shell (sidebar + header + scrolling content):

```html
<body class="h-full flex bg-layer-base text-primary dial-small-text">
  <aside class="w-[260px] shrink-0 flex flex-col border-r border-tertiary bg-layer-raised">…</aside>
  <div class="flex-1 min-w-0 flex flex-col">
    <header class="h-12 shrink-0 flex items-center justify-between gap-2 px-4 border-b border-tertiary bg-layer-raised">…</header>
    <main class="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">…</main>
  </div>
</body>
</html>
```

Buttons are `display: flex`, so in a column (`flex-col`, grid cell) they stretch to full width. Put buttons
in a row (`flex items-center gap-2`) or give the column `items-start`.

## Colour tokens (2.0)

Each is `<prefix>-<name>`. Light values shown for orientation only; never type them.

| Role | Class | Light value |
|---|---|---|
| Page background | `bg-layer-base` | #F5F7FA |
| Card / panel / popup / input surface | `bg-layer-raised` | #FCFCFC |
| Inset area, zebra rows, disabled fields, count badges | `bg-layer-sunken` | #EEF1F7 |
| Modal backdrop | `bg-backdrop` | #161B2D at 30% |
| Main text | `text-primary` | #161B2D |
| Secondary text, labels, hints, icons | `text-secondary` | #57647A |
| Accent text, links, selected items | `text-accent` | #1D4ED8 |
| Status text | `text-error` `text-success` `text-warning` `text-info` | |
| Text on a filled accent/danger control | `text-control-permanent` | #FCFCFC |
| Text on `bg-control-inverted` (tooltip only) | `text-control-inverted` | #FCFCFC |
| Filled accent control | `bg-control-accent` | #1D4ED8 |
| Soft accent tint (selected row/item) | `bg-control-accent-alpha` | |
| Hover tint | `hover:bg-control-accent-alpha-hover` | |
| Status backgrounds | `bg-info` `bg-success` `bg-warning` `bg-error` | |
| Dividers, table lines, panel borders | `border-tertiary` | #E0E6F0 |
| Field borders | `border-secondary` | #D1DBEA |
| Outlined control border | `border-default` | #B2C2DD |
| Strong border (rare; not for fields) | `border-primary` | #57647A |

**Don't use** the legacy 1.0 tokens the CSS still contains: `bg-layer-0…4`, `bg-accent-*`, `bg-controls-*`,
`text-accent-primary`, `text-controls-*`, `border-accent-primary`. There is no `text-tertiary` from 0.16 on: hints
and captions are `text-secondary`, as in the kit's own components. The blue→violet gradient only comes with
the primary button (render `PrimaryButton`); there's no gradient utility.

## Typography

One `dial-*-text` class sets size, line height and weight. Inter comes from `body`.

| Use | Class |
|---|---|
| Page title | `dial-display3-text` (22/32) or `dial-h1-text` (20/28) |
| Section title | `dial-h1-text`; smaller `dial-h2-text` (18/26), `dial-h3-text` (16/24) |
| Body | `dial-small-text` (14/20); long text `dial-small-paragraph-text` (14/24); large `dial-body-text` (16/24) |
| Emphasis | `dial-small-semi-text`, `dial-small-paragraph-semi-text` |
| Label, meta | `dial-tiny-semi-text`, `dial-tiny-text` (12/16) |
| Overline (uppercase) | `dial-tiny-lead-semi-text`, `dial-caption-lead-semi-text` |
| Code | `dial-code-text` |

## Layout: what's missing in the kit CSS

The kit CSS is a pruned Tailwind build. Most flex/grid/gap/padding utilities exist; these don't. Kit 0.16
(Tailwind v4) dropped more, so the table covers both: the substitutes work in 0.15 and 0.16.

| Missing | Use instead |
|---|---|
| `mx-auto` | flex parent with `justify-center` |
| `h-screen` | `html, body { height: 100%; }` (skeleton) + `h-full`, or `min-h-screen` |
| `w-4`, `w-5`… for squares | `size-4`, `size-5`, `size-[16px]`, `size-[20px]`, `size-[24px]` |
| `max-w-sm/md/lg/xl/2xl/3xl` | `max-w-[420px]`, `max-w-[600px]`, `max-w-full` |
| `w-1/3`, `w-1/4`, `grid-cols-4` | `grid grid-cols-3`; four columns: `grid` + `style="grid-template-columns: repeat(4, minmax(0, 1fr))"`; or `flex-1` children |
| `py-5`, `py-6`, `pt-6`, `pb-3`, `pb-5`, `pt-0.5` | the nearest of `py-4`, `p-6`, `pb-4`, `pt-3`, `pt-1` |
| `px-8`, `pl-8` (32px gutters) | `mx-4 px-4` on the container (what the catalog patterns do) |
| `pl-6` | `ml-6` when nothing is painted behind it; on a bordered/filled box `pl-4` + `ml-2` on its first child |
| `list-disc` | `style="list-style-type: disc"` on the `<ul>` plus `ml-6` |
| `line-clamp-1` | `truncate` (`line-clamp-2` … `-5` exist) |
| `rounded-tr-[4px]`, `rounded-b-lg` | `rounded-2xl` / `rounded-lg` all round |
| `border-accent-alpha` | `border-secondary` |
| `h-3`, `h-[10px]`, `h-[36px]`, `h-[56px]`, `h-[100px]`, `size-[44px]`, `size-[64px]`, `min-w-[800px]` | exact layout sizes may be inline px: `style="height: 36px"` (in render JSON, a `"style"` string on a plain element) |
| `text-tertiary` | `text-secondary` |
| `z-10`, `z-50` | `z-popup` on a page overlay (menu, backdrop); a raised sidebar only needs `relative` for its shadow to sit on top |
| `self-end` | `items-end` on the parent, or `self-stretch flex items-end` on the item |
| `outline-none` (bare `<textarea>`/`<input>` in a composer) | `style="outline: none"` |
| `placeholder:text-*` | nothing: keep the default placeholder colour, which the kit's own inputs use |
| `break-all` | `break-words` |
| `col-span-*`, `grid-rows-*` | nested flex/grid |
| `bottom-0`, `top-4`, `top-8`, `right-4` | `top-0`, `top-1/2`, `right-0`, `inset-0` + flex alignment |
| responsive show/hide (`md:hidden`, `md:flex`) | none: build for one desktop width (1440) |

Check any utility with `kit-lookup.mjs classes '<regex>'`. Arbitrary classes like `w-[260px]` are fine
only if the kit has them.

---

## Overlays inside a section

A rendered `Popup` / `ConfirmationPopup` covers the whole page (`fixed inset-0` plus a `z-*` class). To show
one inside a section (e.g. a gallery or a "dialog state" panel), wrap it in
`<div class="relative h-[420px] overflow-hidden rounded-xl">` and on the overlay replace
`fixed inset-0 overflow-auto` and its `z-*` class with `absolute inset-0`. That's the only sanctioned edit
to rendered markup.

To show/hide an overlay from the script, toggle the kit's `hidden` **class**
(`el.classList.toggle('hidden')`). The `hidden` attribute behaves differently across kits (up to 0.15 it
loses to `flex`, from 0.16 it wins), so don't rely on it.

## Grid (table)

The kit's 2.0 `Grid` is AG Grid with the kit's theme. `render Grid` can't draw it statically, so a prototype runs it
**live**: `K grid` prints a block for `<head>` with the AG Grid script (from jsDelivr, the exact version the kit
uses) and a `dialGrid()` helper built from the installed kit: its theme values (`GRID_THEME_PARAMS`), its selection
column with the 2.0 `Checkbox`/`Radio`, and its empty state. The `.dial-kit-grid` rules already ship in the kit
stylesheet. The result looks and behaves like the kit Grid: 40px rows and header, 10px uppercase titles with 12px
dividers, floating text filters, sorting, resizing, 0.5px row lines, subtle hover and selected tints with a thin
outline.

In a template, put `<!-- kit-grid -->` in `<head>` after `<!-- kit-link -->` (without a template, paste the output
of `K grid` there). Give the host a height and call `dialGrid` from your script:

```html
<!-- 40px header + 40px filter row + 40px per row + 2px border -->
<div id="runs" data-dial-component="Grid" style="height: 322px"></div>
<script>
  dialGrid('#runs', {
    ariaLabel: 'Runs',
    selection: 'multiple',                 // or 'single' (radios); leave out for no selection column
    selectedRowIds: ['run-315'],           // rows are matched by their "id" field (or getRowId)
    columnDefs: [
      { field: 'name', headerName: 'Run', flex: 1.4 },
      { field: 'target', headerName: 'Target' },
      { field: 'cost', headerName: 'Cost', filter: 'agNumberColumnFilter',
        cellClass: 'dial-kit-grid-align-right', headerClass: 'dial-kit-grid-align-right',
        valueFormatter: function (p) { return '$' + p.value.toFixed(2); } }
    ],
    rowData: [{ id: 'run-315', name: 'Run #315', target: 'Gemini 2.5 Flash', cost: 5 } /* … */]
  });
</script>
```

Options mirror the kit Grid's props: `columnDefs`, `rowData`, `selection`, `selectedRowIds`, `getRowId`,
`onSelectionChange(ids, rows)`, `alternateOddRowColors` (zebra rows), `wrapperBorder` (default on),
`withoutHeaderBorders`, `filterPlaceholder`, `emptyStateTitle`, `emptyStateDescription`, `selectRowLabel`,
`selectAllLabel`, `ariaLabel`, and `gridOptions` for any other AG Grid option (e.g. `{ rowHeight: 56 }` for regular
density; the kit itself only uses 40px). Column definitions are plain AG Grid ones. Cells without a `cellRenderer`
get the kit's one-line truncated text. A custom `cellRenderer` returns a DOM element; build it with kit classes,
or put rendered kit markup inside it (e.g. a `Badge` from `K render`).

`dialGrid` returns the AG Grid API. It needs an internet connection; offline the host shows a short message.
Not included: the row context menu (show a menu with a rendered `Dropdown` if the screen needs one) and the
mobile always-visible selection column.

**Static tables.** Figma layouts the kit Grid doesn't draw out of the box (the chat table, entity cells with
avatars, inputs in cells, the heat map, the double header, change highlights) stay hand-built: copy them from
the `tables` pattern (`K pattern tables --source`), which follows the Components 2.0 table spec (densities
20/40/56/84px, cell states, chat vs admin tables). The basic static recipe:

```html
<div data-dial-component="Grid" class="overflow-hidden rounded-lg border border-tertiary bg-layer-raised">
  <table class="w-full">
    <thead class="bg-layer-base">
      <tr>
        <th class="h-[40px] px-2 text-left dial-small-semi-text text-secondary">Name</th>
        <th class="h-[40px] px-2 text-left dial-small-semi-text text-secondary">Owner</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-t border-tertiary hover:bg-control-accent-alpha-hover">
        <td class="h-[40px] px-2 dial-small-text text-primary">Customer support bot</td>
        <td class="h-[40px] px-2 dial-small-text text-primary">Anna K.</td>
      </tr>
    </tbody>
  </table>
</div>
```

Selected row: add `bg-control-accent-alpha` to the `<tr>`. Zebra rows: `bg-layer-sunken` on every other row.
Selection column: a rendered `Checkbox` with `"labelProps"` left out and `"aria-label":"Select row"`.

## Tooltip

Tooltips only appear on hover, so `render` shows just the trigger. To show one statically:

```html
<div role="tooltip" data-dial-component="Tooltip" class="max-w-[376px] whitespace-pre-wrap break-words rounded-lg bg-control-inverted px-3 py-2 dial-small-text text-control-inverted shadow-xs">Copied to clipboard</div>
```

## Status pills

Kit 0.15+ has `Badge` (`K search status`); render it. Only if your kit has no such component, use the Tag shape
with a status colour pair and say it's approximate:
`inline-flex h-[32px] max-w-full items-center gap-1 rounded-full px-3 dial-tiny-semi-text bg-success text-success`
(or `bg-warning text-warning`, `bg-error text-error`, `bg-info text-info`; neutral `bg-layer-sunken text-secondary`).
Check them in the screenshot on tinted rows, where they can fade.

## Plain layout (no 2.0 component)

For DIAL Chat use the pattern above instead of these. Other app shells, lists and cards have no 2.0 component
(check with `K search` first). Build them from kit classes, leave them untagged, and say they're approximate:

- **Card / panel:** `rounded-xl border border-tertiary bg-layer-raised p-4` (on a `bg-layer-base` page).
  A default `Tag` is invisible on a raised card (same colour); put tags on `bg-layer-base`.
- **Navigation / conversation list row:** the kit's menu-row look,
  `flex w-full cursor-pointer items-center gap-2 px-3 h-[40px] rounded-lg dial-small-text text-primary truncate hover:bg-control-accent-alpha-hover`;
  active row: **replace** `text-primary` with `text-accent` and add `bg-control-accent-alpha` (with both text
  classes, `text-primary` wins). Group heading: `px-3 pt-3 pb-1 dial-tiny-lead-semi-text text-secondary`.
- **Chat message:** user `max-w-[600px] rounded-xl bg-layer-sunken px-4 py-3 dial-small-paragraph-text`, in a
  `flex flex-col items-end` column;
  assistant `flex gap-3 max-w-[600px]`: a rendered `Avatar` (`{"name":"GPT-4o","size":28}`) next to the text in
  `dial-small-paragraph-text text-primary`.
- **Message composer:** render `Textarea` and a `PrimaryIconButton` (`"icon":"@icon:send"`) side by side.
- **Standalone icon:** `kit-lookup.mjs icon <name> [16|20|24]`, coloured with a `text-*` class.
