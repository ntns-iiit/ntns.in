# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `make serve` — Hugo dev server. Runs `make epub` first.
- `make build` — Production build. Runs `make epub` then `hugo $(HUGO_FLAGS)`.
- `make epub` — Regenerates EPUBs for every content file with `type: essay` in front matter (shells out to `pandoc`; requires pandoc on PATH).

**Always use `make`, not bare `hugo`.** The EPUB generation is a pre-hugo pipeline step (see below). CI does the same (`make build`).

Deploys on push to `main` via `.github/workflows/hugo.yaml` (GitHub Pages). A parallel `.gitlab-ci.yml` exists for GitLab Pages — keep both in sync if one changes.

## Architecture

Hugo static site (no external theme) for **ntns.in** — a political manifesto + reading circle publication by an IIIT Hyderabad student group.

### Content → layout routing

Hugo's default section type follows the top-level directory, so nested sections must set `type:` explicitly in front matter to pick up the right layout directory:

| Content path | `type:` | Layout |
| --- | --- | --- |
| `content/silence/_index.md` | (default `silence`) | `layouts/silence/list.html` |
| `content/praxis/*` | `praxis` | `layouts/praxis/{list,single}.html` |
| `content/circle/_index.md` | (default `circle`) | `layouts/circle/list.html` |
| `content/circle/N/_index.md` | `session` | `layouts/session/list.{html,ics}` |
| `content/circle/N/<essay>.md` | `essay` | `layouts/essay/single.html` |

`layouts/_default/baseof.html` wraps every page (title/main/footer blocks, analytics script, independence disclaimer). `layouts/index.html` is the landing page.

### EPUB pipeline

`make epub` scans `content/**/*.md` for `^type: essay`, then for each match runs `pandoc --standalone` and writes the output to the **same relative path under `static/`** (e.g. `content/circle/1/foo.md` → `static/circle/1/foo.epub`). Hugo then copies `static/` verbatim, so the EPUB ends up served at the page's URL with `.epub` appended. `layouts/partials/download-bar.html` links to exactly that path. EPUBs are gitignored (`static/**/*.epub`).

If you rename/move an essay file, the old EPUB under `static/` is not cleaned up automatically.

### Sectioned rendering (manifesto + MoM)

`layouts/_default/_markup/render-heading.html` is a custom heading render hook. When a page sets `sectioned: true` in front matter, every `##` H2 opens a `<section>` with Roman-numeral numbering (`I.`, `II.`, …), closing the previous one. State is tracked via `.Page.Store` (`inSection`, `sectionCount`). The list templates and `layouts/shortcodes/cta.html` both check `.Store.Get "inSection"` and emit a closing `</section>` when needed — if you add a new layout that renders `.Content` for a sectioned page, it must do the same, or the final section will stay open. Set `sectionIds: true` to add `id="s1"`, `id="s2"`, … anchors.

### Calendar output

`hugo.toml` defines a custom `ics` output format. Sessions set `outputs: ["html", "ics"]` and `layouts/session/list.ics` emits a single-event iCalendar using `sessionDate` and `venue` from front matter. `layouts/partials/add-to-calendar.html` renders both a Google Calendar deep link and a download link to `calendar.ics`.

### Inline HTML in titles/headings

`hugo.toml` sets `markup.goldmark.renderer.unsafe = true` because content uses inline HTML (e.g. `heading: "Minutes of the <em>First</em> Meeting"`). Templates that render `.Title` or `.Params.heading` pipe through `safeHTML` / `plainify` as appropriate — follow existing patterns when adding new templates.

### Styling

Single stylesheet: `static/css/silence.css` (serif/warm-paper aesthetic — Crimson Pro body, IM Fell English headings, cream `#f4f0e8` background). No build step for CSS.

### Analytics

Umami instance at `stats.ntns.in`, hardcoded in `baseof.html`.
