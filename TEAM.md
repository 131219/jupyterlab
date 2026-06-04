# Team Project — JupyterLab Notebook Summary & Code Optimizer

## What We're Building

Two AI-powered features added to JupyterLab:

1. **Notebook Summary** — a sidebar button that generates a concise plain-text summary of the active notebook using Anthropic, with a loading state, Copy, and Refresh
2. **Code Optimizer** — per-cell and whole-notebook toolbar buttons that rewrite code using Google Gemini (falls back to rule-based optimization when no API key is set)

## Who Owns What

| Owner | Package(s) | What it does |
|-------|-----------|--------------|
| Charity Snellgrove | `packages/extensionmanager-extension/` | Sidebar panel with the Notebook Summary button; product spec |
| Jaden Dang | `packages/summarizer/` | Core summarization logic (cell parsing, truncation, summary formatting) |
| Prateek Singh | `packages/notebook-extension/`, `packages/code-optimizer/`, `packages/code-optimizer-extension/` | Summary output panel, toolbar button, code optimizer backend and UI |
| Rana Abudaya | `packages/code-optimizer/`, `packages/code-optimizer-extension/` | Code optimizer extension (shared with Prateek) |

## How the Pieces Connect

```
User clicks "Notebook Summary" (Charity — extensionmanager-extension)
    → summarizeNotebook() called (Jaden — packages/summarizer)
    → result displayed in summary panel (Prateek — notebook-extension)
    → [future] backend call to Anthropic API (see charityfiles/notebook-summary-spec.md)

User clicks "Optimize" button (Prateek/Rana — code-optimizer-extension)
    → RuleBasedOptimizer or Gemini LLM called (packages/code-optimizer)
    → optimized code written back to cell
```

## Running Locally

From the repo root:

```bash
bash scripts/start-dev.sh
```

Then open **http://127.0.0.1:8888/lab** in your browser.

> Requires Node.js 20+ (via nvm) and a Python venv at `jl-env/`. See `packages/code-optimizer-extension/README.md` for setup details.

### Setting up Gemini (for AI code optimization)

1. Open **Settings → Settings Editor → Code Optimizer**
2. Set **LLM Provider**: `google`, **LLM Model**: `gemini-2.0-flash`
3. Paste your API key from [aistudio.google.com](https://aistudio.google.com)

## Package READMEs

- [`packages/summarizer/README.md`](packages/summarizer/README.md) — summarizer API and behavior
- [`packages/code-optimizer/README.md`](packages/code-optimizer/README.md) — optimizer API and usage
- [`packages/code-optimizer-extension/README.md`](packages/code-optimizer-extension/README.md) — how to run, configure Gemini, and use the toolbar buttons

## Design Spec

The full product and implementation spec for the Notebook Summary feature (user flow, backend API shape, Anthropic integration, security model, testing plan) is at:

[`charityfiles/notebook-summary-spec.md`](charityfiles/notebook-summary-spec.md)
