**[Installation](#installation)** |
**[Documentation](https://jupyterlab.readthedocs.io)** |
**[Contributing](#contributing)** |
**[License](#license)** |
**[Team](#team)** |
**[Getting help](#getting-help)** |

# JupyterLab — Team Finding Nemo (CSS566, Spring 2026)

> **CSS566 Group Software Management Project — University of Washington, Spring 2026**
> Team: Rana Abudaya, Stone Lei Cao, Jaden Dang, Prateek Singh, Charity Snellgrove

This is Team Finding Nemo's fork of [JupyterLab](https://github.com/jupyterlab/jupyterlab). The team built two AI-powered extensions on top of JupyterLab 4.6:

1. **Code Optimizer** — cleans up notebook code using a three-tier system: instant rule-based transformations (always available, no API key needed), LSP-based semantic refactoring (file mode), and LLM-powered rewriting via Google Gemini with automatic fallback between all tiers
2. **Notebook Summary** — generates a structured plain-text summary of any open notebook so teammates can understand its contents at a glance without reading every cell

Both features live entirely inside JupyterLab. Nothing is modified without explicit user approval at every step.

---

## Quick Start

```bash
bash scripts/start-dev.sh
```

Opens JupyterLab at **http://127.0.0.1:8888/lab** with both extensions loaded in dev mode.

**Requirements:** Node.js 20+ (install via nvm) and a Python virtualenv at `jl-env/`.
Full setup guide: [`packages/code-optimizer-extension/README.md`](packages/code-optimizer-extension/README.md)

---

## Features

### Code Optimizer

| Button | Location | What it does |
|--------|----------|-------------|
| ⚡ (lightning bolt) | Each code cell's toolbar | Optimize that one cell — shows a side-by-side diff, Accept or Reject |
| **Optimize All** | Notebook toolbar | Opens a live queue streaming results cell-by-cell; select what to keep with checkboxes |

**To enable Gemini (AI optimization):**
1. Open **Settings → Settings Editor → Code Optimizer**
2. Set **LLM Provider** to `google`, **LLM Model** to `gemini-2.0-flash`
3. Paste your API key from [aistudio.google.com](https://aistudio.google.com)

No API key? The extension falls back to rule-based optimization automatically — no configuration needed.

### Notebook Summary

Click the summary toolbar button on any notebook. A panel renders a plain-text overview of the notebook built from cell headings and code comments. Supports **Copy** to clipboard and **Refresh**.

---

## Repository Structure

| Package | Owner | What it does |
|---------|-------|-------------|
| `packages/code-optimizer` | Rana Abudaya | Core optimizer: rule-based transformers, LLM client, fallback chain |
| `packages/code-optimizer-extension` | Rana Abudaya | JupyterLab UI: per-cell buttons, diff dialog, Optimize All live queue, settings schema |
| `packages/summarizer` | Jaden Dang | Summarization logic: cell parsing, truncation, output formatting |
| `packages/notebook-extension` | Prateek Singh | Notebook summary panel and toolbar integration |
| `packages/extensionmanager-extension` | Charity Snellgrove | Notebook Summary sidebar panel; product specification |

See [`TEAM.md`](TEAM.md) for full architecture and how the packages connect.

---

## Team Contributions

| Member | Branch(es) | Key Contributions |
|--------|-----------|------------------|
| **Rana Abudaya** | `rana-abudaya`, `rana-ai-config-fix` | Code optimizer architecture, four rule-based transformers, Gemini/multi-provider LLM integration, per-cell ⚡ buttons, Optimize All live queue, ESLint fixes, README docs |
| **Prateek Singh** | `prateek-summary-output-panel` | Notebook summary panel, toolbar button, PR merges and integration coordination (PRs #20, #22, #29, #36) |
| **Jaden Dang** | `jadendang/summary-logic`, `jadendang/documentation` | Summarizer core logic, TEAM.md, summarizer README (PRs #29, #37) |
| **Charity Snellgrove** | `charity/buttondesign` | Notebook Summary product spec (`charityfiles/notebook-summary-spec.md`), button design, summary spec (PR #20) |
| **Stone Lei Cao** | — | Toolbar visibility investigation, issue tracking, documentation support |

---

## Pull Requests

| PR | Branch | Author | What it added |
|----|--------|--------|--------------|
| [#20](https://github.com/131219/jupyterlab/pull/20) | `charity/buttondesign` | Charity Snellgrove | Button design and notebook summary spec |
| [#22](https://github.com/131219/jupyterlab/pull/22) | `rana-abudaya` | Rana Abudaya | Full code optimizer extension (2,603 additions) |
| [#29](https://github.com/131219/jupyterlab/pull/29) | `jadendang/summary-logic` | Jaden Dang | Summarizer core logic |
| [#36](https://github.com/131219/jupyterlab/pull/36) | `prateek-summary-output-panel` | Prateek Singh | Notebook summary output panel |
| [#37](https://github.com/131219/jupyterlab/pull/37) | `jadendang/documentation` | Jaden Dang | TEAM.md and package documentation |

---

## Project Links

- **GitHub Repository:** https://github.com/131219/jupyterlab
- **Kanban Board:** https://github.com/users/131219/projects/1/views/1
- **Upstream JupyterLab:** https://github.com/jupyterlab/jupyterlab
