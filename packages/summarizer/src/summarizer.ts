/**
 * Summarizer module for generating concise summaries of notebook content.
 * Author: Jaden Dang
 * Date: 04-29-2026
 * This module provides functionality to summarize the content of notebook cells
 * into a human-readable format, with special handling for markdown and code cells.
 * It also supports a maximum summary length for notebooks with 50 or more cells.
 */

/**
 * Maximum character length for a single cell's contribution to the summary.
 */
const MAX_CELL_CONTRIBUTION = 200;

/**
 * Maximum total character length of the summary for notebooks with 50 or more cells.
 */
const MAX_SUMMARY_LENGTH = 2000;

/**
 * Represents a single notebook cell.
 */
export interface NotebookCell {
  text: string;
  /** 'markdown' or 'code' */
  type: 'markdown' | 'code';
}

/**
 * The result of summarizing a notebook.
 */
export interface SummaryResult {
  summary: string;
  cellCount: number;
}

/**
 * Summarizes notebook cells into a condensed string.
 *
 * Markdown headings become section labels. Code cells are prefixed with "Code:".
 * Whitespace-only cells are skipped. Summaries for notebooks with 50+ cells
 * are capped at 2000 characters.
 *
 * @param cells - The notebook cells to summarize.
 * @returns An object with the summary string and total cell count.
 */
export function summarizeNotebook(cells: NotebookCell[]): SummaryResult {
  const activeCells = cells.filter(cell => cell.text.trim().length > 0);

  if (activeCells.length === 0) {
    return { summary: 'No content to summarize.', cellCount: 0 };
  }

  const parts: string[] = [];

  for (const cell of activeCells) {
    const contribution =
      cell.type === 'markdown'
        ? _summarizeMarkdownCell(cell.text)
        : _summarizeCodeCell(cell.text);

    if (contribution) {
      parts.push(contribution);
    }
  }

  let summary = parts.join('\n');

  if (cells.length >= 50 && summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.slice(0, MAX_SUMMARY_LENGTH);
  }

  return { summary, cellCount: cells.length };
}

/**
 * Returns the first meaningful line of a markdown cell.
 * Headings are returned as-is; other content is truncated to 200 chars.
 */
function _summarizeMarkdownCell(text: string): string | null {
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (/^#{1,6}\s/.test(trimmed)) {
      return trimmed;
    }
    return trimmed.slice(0, MAX_CELL_CONTRIBUTION);
  }

  return null;
}

/**
 * Returns a "Code:"-prefixed summary from a code cell.
 * Prefers comment lines (#); falls back to the first non-empty line of code.
 * Truncated to 200 chars.
 */
function _summarizeCodeCell(text: string): string | null {
  const lines = text.split('\n');
  const commentLines = lines.filter(line => line.trimStart().startsWith('#'));

  if (commentLines.length > 0) {
    const comment = commentLines[0].trim().slice(0, MAX_CELL_CONTRIBUTION);
    return `Code: ${comment}`;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      return `Code: ${trimmed.slice(0, MAX_CELL_CONTRIBUTION)}`;
    }
  }

  return null;
}
