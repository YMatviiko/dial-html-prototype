# dial-html-prototype

A Claude skill that builds a **single-file HTML prototype** in DIAL 2.0 styling. It's for designers, PMs and engineers who want a quick visual concept without setting up a React project.

On each run the skill:

1. Upgrades the prototype folder to the latest `@epam/ai-dial-ui-kit`.
2. Renders the kit's real 2.0 components to static HTML.
3. Styles the page with the kit's own stylesheet.
4. Starts from the closest DIAL Chat 2.0 page pattern (chat, catalog, toolsets, QuickApp builder, scheduled tasks, files, settings).
5. Validates the result and checks it with a screenshot.

New kit components are available as soon as they are published. Light theme only.

> For production UI in a React/TSX project, use the sibling skill `dial-design-vibecode`. Prototypes are references, never code to merge.

## Requirements

- Node 18+ and npm, with network access (the first run installs the kit, `react`, `react-dom` and `jsdom` into the working folder)
- Chrome or Chromium, for the screenshot check (optional; Claude will say so if it can't check visually)
- Claude Code or Claude Desktop (Cowork)

## Install

### Option A: Claude Code, per project

Run this from your project or prototype folder:

```bash
git clone https://github.com/YMatviiko/dial-html-prototype.git .claude/skills/dial-html-prototype
```

The skill is picked up automatically. No restart or MCP server is needed.

### Option B: Claude Code, for all projects (personal)

```bash
git clone https://github.com/YMatviiko/dial-html-prototype.git ~/.claude/skills/dial-html-prototype
```

> The scripts in `SKILL.md` assume the skill lives at `.claude/skills/dial-html-prototype` inside the working folder. With a personal install, ask Claude to use the personal path, or symlink it into the project:
> `ln -s ~/.claude/skills/dial-html-prototype .claude/skills/dial-html-prototype`

### Option C: Claude Desktop (Cowork)

1. Download the repo as a ZIP (**Code → Download ZIP**) or zip the folder yourself.
2. Make sure `SKILL.md` is at the top level of the zip, then rename the file to `dial-html-prototype.skill`.
3. Open **Settings → Capabilities → Skills**, upload the `.skill` file and enable it.

### Check that it works

Start Claude in the project folder and ask: *"What skills do you have?"* `dial-html-prototype` should be listed. Then try the example prompts below.

## Use

Just describe what you want. The skill triggers on words like prototype, mockup, wireframe, demo page, clickable concept or "static HTML in DIAL styles". You don't need to name the skill or the kit.

Example prompts:

- *"Make a DIAL prototype of an agent permissions page."*
- *"Mock up a new filter bar for the catalog in DIAL styles."*
- *"Prototype a usage-limit banner in the chat conversation."*

What happens next:

1. Claude runs `kit-lookup.mjs update` and reports the kit version (e.g. "kit updated 0.14.2 → 0.15.4").
2. It picks the closest page pattern and adds your feature to it.
3. It builds, validates and screenshots the page.
4. It gives you a single `.html` file. Double-click it to open it in a browser.

In its reply Claude states the kit version, what is approximate, and the `data-dial-component` names used, so an engineer knows what to build with.

## Hand-off to engineering

When a prototype is approved, the engineer starts a fresh task with `dial-design-vibecode` and uses the `data-dial-component` tags in the prototype as the component list.

## Use the tools by hand

Run these from the prototype folder:

```bash
K="node .claude/skills/dial-html-prototype/kit-lookup.mjs"
$K update                    # install/upgrade the kit
$K search modal              # find a component
$K info Popup                # props, enum values, examples
$K render PrimaryButton '{"label":"Save","iconBefore":"@icon:plus"}'
$K pattern catalog --source > page.tpl.html   # start from a page pattern
$K pattern page.tpl.html > page.html          # build the template
node .claude/skills/dial-html-prototype/validate-html.mjs page.html
```

(In zsh, define `K` as a shell function instead of a variable.)

## Files

| File | What it is |
|---|---|
| `SKILL.md` | The instructions Claude follows |
| `components.md` | Props-JSON syntax, render recipes, page skeleton, tokens, typography, layout gaps, the live kit Grid, and what rendering can't produce (tooltip, status pills, plain layout) |
| `kit-lookup.mjs` | One tool for the kit: `update`, `search`, `info`, `render`, `classes`, `icon`, `asset`, `pattern`, `grid`, `version` |
| `patterns/` | 22 DIAL Chat 2.0 page patterns, a `tables` reference (all 2.0 table types) plus shared navigation partials (syntax and maintenance in `patterns/README.md`) |
| `assets/` | DIAL art the kit doesn't ship: logo, nav and gradient icons, model/provider logos, file-type icons |
| `validate-html.mjs` | Deterministic checker run before a prototype is shown |
| `CHANGELOG.md` | Release notes |

## Update

```bash
git -C .claude/skills/dial-html-prototype pull
```

New kit components need no skill update. After a kit upgrade, re-check the hand-written parts of `components.md` with the validator.

## Troubleshooting

| Problem | Fix |
|---|---|
| `update` fails | Check Node/npm and network access. The skill stops and shows the real error rather than building from memory. Offline, it keeps the installed kit. |
| Component looks unstyled | Run the validator; it flags unknown classes and suggests the nearest real one. |
| No screenshot | Install Chrome/Chromium. Claude will say it couldn't check visually. |
| Dark mode requested | Not supported; the skill builds light theme only. |
| Skill not listed | Confirm the path is `.claude/skills/dial-html-prototype/SKILL.md` and restart the session. |
