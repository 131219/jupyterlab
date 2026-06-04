# @jupyterlab/summarizer

Core summarization logic for the JupyterLab Notebook Summary feature.

## Overview

This package provides a pure TypeScript function that converts an array of notebook cells into a condensed, human-readable summary string. It is UI-agnostic and can be used by any frontend extension or backend service that has access to notebook cell data.

## Usage

```typescript
import { summarizeNotebook, NotebookCell } from '@jupyterlab/summarizer';

const cells: NotebookCell[] = [
  { type: 'markdown', text: '# Data Analysis' },
  { type: 'code', text: '# Load dataset\nimport pandas as pd\ndf = pd.read_csv("data.csv")' },
  { type: 'markdown', text: 'We explore the dataset below.' },
  { type: 'code', text: 'df.describe()' }
];

const result = summarizeNotebook(cells);
console.log(result.summary);
// # Data Analysis
// Code: # Load dataset
// We explore the dataset below.
// Code: df.describe()

console.log(result.cellCount); // 4
```

## API

### `summarizeNotebook(cells: NotebookCell[]): SummaryResult`

Summarizes an array of notebook cells into a condensed string.

**Behavior:**
- Whitespace-only cells are skipped
- Markdown cells: headings (`#`–`######`) are returned as-is; other content is truncated to 200 characters
- Code cells: if the cell has comment lines (`#`), the first comment is used; otherwise the first non-empty line is used. Prefixed with `Code:`
- For notebooks with 50 or more cells, the total summary is capped at 2000 characters

### `NotebookCell`

```typescript
interface NotebookCell {
  text: string;
  type: 'markdown' | 'code';
}
```

### `SummaryResult`

```typescript
interface SummaryResult {
  summary: string;   // The condensed summary string
  cellCount: number; // Total number of cells including empty ones
}
```

## Design Notes

- No external dependencies — pure TypeScript logic only
- Empty notebooks return `{ summary: 'No content to summarize.', cellCount: 0 }`
- The 200-character per-cell cap and 2000-character total cap are defined as named constants (`MAX_CELL_CONTRIBUTION`, `MAX_SUMMARY_LENGTH`) at the top of the source file

## Author

Jaden Dang
