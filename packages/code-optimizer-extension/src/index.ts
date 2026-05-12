/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
----------------------------------------------------------------------------*/

/**
 * @packageDocumentation
 * @module code-optimizer-extension
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  INotebookTracker,
  NotebookPanel
} from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ToolbarButton, offlineBoltIcon } from '@jupyterlab/ui-components';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { RuleBasedOptimizer, LLMOptimizer } from '@jupyterlab/code-optimizer';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/code-optimizer-extension:plugin',
  description: 'Integrates code optimizer with JupyterLab notebooks',
  autoStart: true,
  requires: [INotebookTracker, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    settingRegistry: ISettingRegistry
  ) => {
    let pluginSettings: ISettingRegistry.ISettings | null = null;
    settingRegistry
      .load('@jupyterlab/code-optimizer-extension:plugin')
      .then(s => { pluginSettings = s; })
      .catch(err => { console.error('Could not load code optimizer settings:', err); });

    // Per-cell optimize command — shows in the cell toolbar via schema registration
    app.commands.addCommand('code-optimizer:optimize-active-cell', {
      icon: offlineBoltIcon,
      caption: 'Optimize this cell (Gemini if configured, else rule-based)',
      execute: async () => {
        const cell = tracker.activeCell;
        if (!cell || cell.model.type !== 'code') return;

        const originalCode = cell.model.sharedModel.getSource();
        if (!originalCode.trim()) return;

        const apiKey = (pluginSettings?.get('llmApiKey').composite as string) ?? '';

        let optimizedCode = originalCode;
        let method = 'rule-based';
        let transformations: any[] = [];

        if (apiKey) {
          try {
            const llm = new LLMOptimizer({
              apiKey,
              provider: 'google',
              model: 'gemini-2.0-flash'
            });
            const result = await llm.optimize(originalCode, 'python');
            optimizedCode = result.code;
            method = 'Gemini';
          } catch {
            const rule = new RuleBasedOptimizer();
            const result = rule.optimize(originalCode, 'python');
            optimizedCode = result.code;
            method = 'rule-based (Gemini failed)';
            transformations = result.transformations;
          }
        } else {
          const rule = new RuleBasedOptimizer();
          const result = rule.optimize(originalCode, 'python');
          optimizedCode = result.code;
          transformations = result.transformations;
        }

        const body = new Widget();
        body.addClass('jp-OptimizerDialog');
        body.node.innerHTML = `
          <h3 style="margin:0 0 6px">Original:</h3>
          <pre style="background:#f5f5f5;padding:10px;border-radius:4px;white-space:pre-wrap;font-size:12px">${escapeHtml(originalCode)}</pre>
          <h3 style="margin:8px 0 6px;color:#2e7d32">Optimized (${method}):</h3>
          <pre style="background:#e8f5e9;padding:10px;border-radius:4px;white-space:pre-wrap;font-size:12px">${escapeHtml(optimizedCode)}</pre>
          ${transformations.length > 0
            ? `<ul style="font-size:12px;margin:4px 0 0">${transformations.map(t => `<li>${escapeHtml(t.description)}</li>`).join('')}</ul>`
            : ''}
        `;

        const buttons = optimizedCode === originalCode
          ? [Dialog.okButton({ label: 'Close' })]
          : [Dialog.cancelButton({ label: 'Reject' }), Dialog.okButton({ label: 'Accept' })];

        const result = await showDialog({
          title: optimizedCode === originalCode
            ? `No Changes (${method})`
            : `Review Optimization (${method})`,
          body,
          buttons
        });

        if (result.button.accept && optimizedCode !== originalCode) {
          cell.model.sharedModel.setSource(optimizedCode);
        }
      }
    });

    const addButtonsToPanel = (notebookPanel: NotebookPanel) => {
      // "Optimize All" — Gemini first if API key set, rule-based fallback
      const optimizeAllButton = new ToolbarButton({
        icon: offlineBoltIcon,
        label: 'Optimize All',
        tooltip: 'Optimize all cells (Gemini if configured, else rule-based)',
        onClick: async () => {
          const notebook = notebookPanel.content;
          const apiKey = (pluginSettings?.get('llmApiKey').composite as string) ?? '';

          const codeCells: Array<{ index: number; code: string }> = [];
          notebook.widgets.forEach((cell, index) => {
            if (cell.model.type === 'code' && cell.model.sharedModel.getSource().trim()) {
              codeCells.push({ index, code: cell.model.sharedModel.getSource() });
            }
          });

          if (codeCells.length === 0) {
            const b = new Widget();
            b.node.textContent = 'No non-empty code cells found.';
            showDialog({ title: 'Nothing to Optimize', body: b, buttons: [Dialog.okButton()] });
            return;
          }

          if (apiKey) {
            // ── Gemini path ──────────────────────────────────────────────────
            const loadingBody = new Widget();
            loadingBody.node.innerHTML = `
              <p style="margin:8px 0">Sending <strong>${codeCells.length}</strong> cell(s) to Gemini…</p>
              <p style="color:#666;font-size:13px">This may take a few seconds.</p>
            `;

            let resolveLoading!: (v: boolean) => void;
            const loadingDone = new Promise<boolean>(res => { resolveLoading = res; });
            let cancelled = false;

            const loadingDialogPromise = showDialog({
              title: `Optimizing ${codeCells.length} cell(s) with Gemini…`,
              body: loadingBody,
              buttons: [Dialog.cancelButton({ label: 'Cancel' })]
            });
            loadingDialogPromise.then(r => {
              if (!r.button.accept) cancelled = true;
              resolveLoading(true);
            });

            const llm = new LLMOptimizer({
              apiKey,
              provider: 'google',
              model: 'gemini-2.0-flash'
            });

            interface GResult {
              index: number;
              originalCode: string;
              optimizedCode: string;
              changed: boolean;
              error?: string;
            }

            const geminiResults: GResult[] = await Promise.all(
              codeCells.map(async ({ index, code }) => {
                try {
                  const r = await llm.optimize(code, 'python');
                  return {
                    index,
                    originalCode: code,
                    optimizedCode: r.code,
                    changed: r.code.trim() !== code.trim()
                  };
                } catch (err: any) {
                  return {
                    index,
                    originalCode: code,
                    optimizedCode: code,
                    changed: false,
                    error: String(err?.message ?? err)
                  };
                }
              })
            );

            resolveLoading(true);
            await loadingDone;
            if (cancelled) return;

            const changedG = geminiResults.filter(r => r.changed);
            const errors = geminiResults.filter(r => r.error);

            if (changedG.length === 0) {
              const b = new Widget();
              b.node.innerHTML = `
                <p>Gemini found no changes in <strong>${geminiResults.length}</strong> cell(s).</p>
                ${errors.length > 0
                  ? `<p style="color:#c00"><strong>${errors.length}</strong> failed: ${escapeHtml(errors[0].error ?? '')}</p>`
                  : ''}
              `;
              showDialog({ title: 'Gemini — No Changes', body: b, buttons: [Dialog.okButton({ label: 'Close' })] });
              return;
            }

            const reviewBody = new Widget();
            reviewBody.addClass('jp-OptimizerDialog');

            const summary = document.createElement('p');
            summary.innerHTML =
              `<strong>${changedG.length}</strong> of <strong>${geminiResults.length}</strong> cell(s) optimized by Gemini.` +
              (errors.length > 0 ? ` <span style="color:#c00">(${errors.length} failed)</span>` : '') +
              ' Select which to apply:';
            reviewBody.node.appendChild(summary);

            const checkboxes: Array<{
              checkbox: HTMLInputElement;
              cellIndex: number;
              optimizedCode: string;
            }> = [];

            changedG.forEach(r => {
              const section = document.createElement('div');
              section.style.cssText =
                'margin-top:16px;border-top:1px solid #ccc;padding-top:10px';

              const label = document.createElement('label');
              label.style.cssText =
                'display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:bold';

              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.checked = true;
              checkboxes.push({
                checkbox,
                cellIndex: r.index,
                optimizedCode: r.optimizedCode
              });

              label.append(checkbox, document.createTextNode(`Cell ${r.index + 1}`));

              const diff = document.createElement('div');
              diff.style.marginTop = '8px';
              diff.innerHTML = `
                <h5 style="margin:0 0 4px;color:#555">Original:</h5>
                <pre style="background:#f5f5f5;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:120px;overflow:auto">${escapeHtml(r.originalCode)}</pre>
                <h5 style="margin:6px 0 4px;color:#2e7d32">Optimized:</h5>
                <pre style="background:#e8f5e9;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:120px;overflow:auto">${escapeHtml(r.optimizedCode)}</pre>
              `;

              section.append(label, diff);
              reviewBody.node.appendChild(section);
            });

            const reviewResult = await showDialog({
              title: `Gemini — ${changedG.length} Change(s) Ready`,
              body: reviewBody,
              buttons: [
                Dialog.cancelButton({ label: 'Cancel' }),
                Dialog.okButton({ label: 'Apply Selected' })
              ]
            });

            if (reviewResult.button.accept) {
              checkboxes.forEach(({ checkbox, cellIndex, optimizedCode }) => {
                if (checkbox.checked) {
                  notebook.widgets[cellIndex].model.sharedModel.setSource(
                    optimizedCode
                  );
                }
              });
            }
          } else {
            // ── Rule-based path ───────────────────────────────────────────────
            const ruleOptimizer = new RuleBasedOptimizer();

            interface RResult {
              index: number;
              originalCode: string;
              optimizedCode: string;
              transformations: any[];
              changed: boolean;
            }
            const results: RResult[] = [];

            notebook.widgets.forEach((cell, index) => {
              if (cell.model.type === 'code') {
                const orig = cell.model.sharedModel.getSource();
                const opt = ruleOptimizer.optimize(orig, 'python');
                results.push({
                  index,
                  originalCode: orig,
                  optimizedCode: opt.code,
                  transformations: opt.transformations,
                  changed: opt.code !== orig
                });
              }
            });

            const changedR = results.filter(r => r.changed);
            const body = new Widget();
            body.addClass('jp-OptimizerDialog');

            if (changedR.length === 0) {
              body.node.textContent = `All ${results.length} code cell(s) are already optimized.`;
              showDialog({
                title: 'No Changes',
                body,
                buttons: [Dialog.okButton({ label: 'Close' })]
              });
              return;
            }

            const summary = document.createElement('p');
            summary.innerHTML = `<strong>${changedR.length}</strong> of <strong>${results.length}</strong> cell(s) can be optimized:`;
            body.node.appendChild(summary);

            changedR.forEach(r => {
              const section = document.createElement('div');
              section.style.cssText =
                'margin-top:16px;border-top:1px solid #ccc;padding-top:8px';
              section.innerHTML = `
                <h4 style="margin:0 0 6px">Cell ${r.index + 1}</h4>
                <h5 style="margin:0 0 4px">Original:</h5>
                <pre style="background:#f5f5f5;padding:8px;border-radius:4px;font-size:12px;white-space:pre-wrap">${escapeHtml(r.originalCode)}</pre>
                <h5 style="margin:4px 0">Optimized:</h5>
                <pre style="background:#e8f5e9;padding:8px;border-radius:4px;font-size:12px;white-space:pre-wrap">${escapeHtml(r.optimizedCode)}</pre>
                ${r.transformations.length > 0
                  ? `<ul style="font-size:12px;margin:4px 0 0">${r.transformations.map(t => `<li>${escapeHtml(t.description)}</li>`).join('')}</ul>`
                  : ''}
              `;
              body.node.appendChild(section);
            });

            const ruleResult = await showDialog({
              title: `Optimize All (rule-based) — ${changedR.length} Change(s)`,
              body,
              buttons: [
                Dialog.cancelButton({ label: 'Reject All' }),
                Dialog.okButton({ label: 'Accept All' })
              ]
            });

            if (ruleResult.button.accept) {
              changedR.forEach(r => {
                notebook.widgets[r.index].model.sharedModel.setSource(
                  r.optimizedCode
                );
              });
            }
          }
        }
      });

      notebookPanel.toolbar.addItem('optimize-all', optimizeAllButton);

      // Inject per-cell ⚡ button into the floating cell toolbar
      const injectCellButton = async (cell: any) => {
        if (!cell || cell.model?.type !== 'code' || cell.isDisposed) return;
        // Wait for cell to be ready, then give the cell toolbar time to attach
        try { await cell.ready; } catch { return; }
        await new Promise(r => setTimeout(r, 80));
        if (cell.isDisposed || !cell.inputArea) return;

        const widgets: any[] = (cell.inputArea.layout as any)?.widgets ?? [];
        for (const w of widgets) {
          if (w && typeof w.insertItem === 'function' && typeof w.names === 'function') {
            const names: string[] = Array.from(w.names());
            if (!names.includes('optimize-active-cell')) {
              const btn = new ToolbarButton({
                icon: offlineBoltIcon,
                tooltip: 'Optimize this cell',
                onClick: () => { void app.commands.execute('code-optimizer:optimize-active-cell'); }
              });
              w.insertItem(0, 'optimize-active-cell', btn);
            }
            return;
          }
        }
      };

      notebookPanel.content.activeCellChanged.connect((_, cell) => { void injectCellButton(cell); });
      void injectCellButton(notebookPanel.content.activeCell);
    };

    tracker.widgetAdded.connect((_, panel) => addButtonsToPanel(panel));
    tracker.forEach(panel => addButtonsToPanel(panel));
  }
};

export default plugin;
