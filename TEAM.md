# Team Project — JupyterLab Code Optimizer & Notebook Summary

## CSS566 Group Software Management Project
**University of Washington, Spring 2026**
Team Finding Nemo: Rana Abudaya, Stone Lei Cao, Jaden Dang, Prateek Singh, Charity Snellgrove

---

## What We Built

Two AI-powered features added directly into JupyterLab 4.6:

1. **Code Optimizer** — per-cell and whole-notebook toolbar buttons that rewrite code using Google Gemini (with automatic fallback to rule-based optimization when no API key is configured)
2. **Notebook Summary** — a toolbar button that generates a plain-text summary of the active notebook so teammates can understand its contents without reading every cell

---

## Who Owns What

| Owner | Package(s) | What it does |
|-------|-----------|--------------|
| **Rana Abudaya** | `packages/code-optimizer/`, `packages/code-optimizer-extension/` | Full code optimizer: rule-based transformers, Gemini/multi-provider LLM integration, per-cell ⚡ buttons, Optimize All live queue, settings schema, diff dialog |
| **Jaden Dang** | `packages/summarizer/` | Core summarization logic: cell parsing, truncation, output formatting |
| **Prateek Singh** | `packages/notebook-extension/` | Notebook summary output panel and toolbar button; PR integration lead |
| **Charity Snellgrove** | `packages/extensionmanager-extension/`, `charityfiles/` | Notebook Summary product specification, design spec, button design |
| **Stone Lei Cao** | — | Toolbar visibility research, issue tracking, documentation |

---

## How the Pieces Connect

```
User clicks ⚡ on a cell or "Optimize All" (Rana — code-optimizer-extension)
    → RuleBasedOptimizer or Gemini LLM called (packages/code-optimizer)
    → side-by-side diff dialog shown, user accepts or rejects
    → optimized code written back to cell only on explicit approval

User clicks Notebook Summary button (Prateek — notebook-extension)
    → summarizeNotebook() called (Jaden — packages/summarizer)
    → plain-text summary rendered in panel
    → Copy and Refresh controls available
    → [planned] backend call to Anthropic API (spec in charityfiles/notebook-summary-spec.md)
```

---

## Running the Project

From the repo root:

```bash
bash scripts/start-dev.sh
```

Then open **http://127.0.0.1:8888/lab** in your browser.

**Prerequisites:**
- Node.js 20+ — install via nvm: `nvm install 20`
- Python virtualenv at `jl-env/`: `python3 -m venv jl-env && jl-env/bin/pip install -e '.[dev]'`

The startup script checks for both and prints clear instructions if either is missing.

### Setting up Gemini (for AI code optimization)

1. Open **Settings → Settings Editor → Code Optimizer**
2. Set **LLM Provider**: `google`, **LLM Model**: `gemini-2.0-flash`
3. Paste your API key from [aistudio.google.com](https://aistudio.google.com)

No API key? Rule-based optimization runs automatically with no setup.

---

## Pull Requests

| PR | Author | What it added |
|----|--------|--------------|
| [#20](https://github.com/131219/jupyterlab/pull/20) | Charity Snellgrove | Button design, notebook summary spec |
| [#22](https://github.com/131219/jupyterlab/pull/22) | Rana Abudaya | Full code optimizer extension (2,603 lines) |
| [#29](https://github.com/131219/jupyterlab/pull/29) | Jaden Dang | Summarizer core logic |
| [#36](https://github.com/131219/jupyterlab/pull/36) | Prateek Singh | Notebook summary output panel |
| [#37](https://github.com/131219/jupyterlab/pull/37) | Jaden Dang | TEAM.md and package documentation |
| [#38](https://github.com/131219/jupyterlab/pull/38) | Rana Abudaya | Per-cell ⚡ buttons, Optimize All live queue, team README, repo cleanup |

---

## Package Documentation

- [`packages/code-optimizer-extension/README.md`](packages/code-optimizer-extension/README.md) — how to run, configure Gemini, and use both optimizer buttons
- [`packages/summarizer/README.md`](packages/summarizer/README.md) — summarizer API and cell parsing behavior

## Design Spec

Full product and implementation spec for Notebook Summary (API shape, panel state machine, Anthropic integration, security model):
[`charityfiles/notebook-summary-spec.md`](charityfiles/notebook-summary-spec.md)
