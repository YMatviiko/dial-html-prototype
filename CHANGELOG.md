# Changelog

## v1.1.0 — 2026-11-04

### New: `tables` pattern

A reference page with every table type from the Figma "[DIAL] Components 2.0" table spec (page "Table Cells":
Cell atoms, Table Header, Table Subheader, Table Cell, Cell types, Details, Cases). Copy the table you need into a
page pattern: `kit-lookup.mjs pattern tables --source`.

- **Anatomy:** header cell variants (sort arrow, right alignment, two-line title, select-all checkbox), filter row
  (search + filter, filter-applied dot, empty), row densities (84 / 56 / 40 / 20px), cell states (hover, selected,
  error, highlighted), change highlights (updated, added, deleted), cell types (text, link, number, entity, input,
  checkbox, radio, icon, hierarchical).
- **Chat table:** no border, 12px radius, shadow, 84px rows, rounded hover row, usage bars and status badges.
- **Admin table types:** Data (40px, vertical dividers, checkbox selection), Entity (56px, avatar + link + second
  line), Editable (inputs in cells, row menu), Heat map (20px, grouped rows).
- **Admin example (Runs):** sorting, filtering, horizontal scroll, pinned Actions column.
- **Double header:** grouped columns separated by long dividers.
- IDs, timestamps, costs and durations use tabular numbers, as the spec requires.

Registered in the pattern table in `SKILL.md`, in `README.md`, and in the Grid section of `components.md`.

Approximate: row dividers are 1px (spec 0.5px); cell info/error corner marks are not drawn; the kit Search is 32px
tall (spec 24px); "running low" bars stay blue (no strong yellow token in the kit); progress-bar fills are set by a
small inline script because a static page can't run the kit's inline width.

### Kit 0.16 compatibility

Kit 0.16 (Tailwind v4) drops more utilities. Patterns and docs now use substitutes that work in both 0.15 and 0.16:

- `text-tertiary` is gone: hints and captions use `text-secondary`, as the kit's own components do.
- Patterns no longer use `outline-none`, `placeholder:text-secondary`, `break-all`, `self-end`, `pl-6`, `px-8`,
  `grid-cols-4` or `z-10`.
- `components.md`: updated gaps table (new substitutes, `max-w-[420px]` instead of `max-w-[428px]`, 32px gutters via
  `mx-4 px-4`), the `hidden` attribute note (it behaves differently up to 0.15 and from 0.16), and the 0.16 components
  (`ToggleChip`, `FormSection`, `SelectedEntityCard`, `LoginScreen`).
- `validate-html.mjs`: suggests the substitute for each class dropped in 0.16.

All 23 patterns build and pass the validator with kit 0.15.4.

## v1.0.0

Initial release of the `dial-html-prototype` skill: kit tooling (`kit-lookup.mjs`), validator, cheatsheet and
22 DIAL Chat 2.0 page patterns.
