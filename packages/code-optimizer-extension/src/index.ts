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
  INotebookTracker
} from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ToolbarButton, runIcon, fastForwardIcon, offlineBoltIcon } from '@jupyterlab/ui-components';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { RuleBasedOptimizer, LLMOptimizer } from '@jupyterlab/code-optimizer';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * The code optimizer extension plugin.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/code-optimizer-extension:plugin',
  description: 'Integrates code optimizer with JupyterLab notebooks',
  requires: [INotebookTracker, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    settingRegistry: ISettingRegistry
  ) => {
    // Load plugin settings so we can read the Gemini API key
    let pluginSettings: ISettingRegistry.ISettings | null = null;
    settingRegistry
      .load('@jupyterlab/code-optimizer-extension:plugin')
      .then(s => { pluginSettings = s; })
      .catch(err => { console.error('Could not load code optimizer settings:', err); });
    console.log('CODE OPTIMIZER EXTENSION LOADED SUCCESSFULLY');

    // Add optimize button to notebook toolbar
    tracker.widgetAdded.connect((sender, notebookPanel) => {
      console.log('Adding optimize button to notebook toolbar');
      const optimizeButton = new ToolbarButton({
        icon: runIcon,
        tooltip: 'Optimize Current Cell',
        onClick: async () => {
          console.log('Optimize button clicked');
          const cell = tracker.activeCell;
          console.log('Active cell:', cell);
          console.log('Cell type:', cell?.model.type);
          if (cell && cell.model.type === 'code') {
            const originalCode = cell.model.sharedModel.getSource();
            console.log('Original code length:', originalCode.length);
            console.log('Original code:', originalCode);
            
            const ruleOptimizer = new RuleBasedOptimizer();
            const optimized = ruleOptimizer.optimize(originalCode, 'python');
            const method = 'rule-based';

            console.log('Optimized code:', optimized.code);
            console.log('Optimization method:', method);

            // Create dialog body with diff view
            const body = new Widget();
            body.addClass('jp-OptimizerDialog');
            
            const originalDiv = document.createElement('div');
            originalDiv.innerHTML = `<h3>Original Code:</h3><pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(originalCode)}</pre>`;
            
            const optimizedDiv = document.createElement('div');
            optimizedDiv.innerHTML = `<h3>Optimized Code:</h3><pre style="background: #e8f5e9; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(optimized.code)}</pre>`;
            
            body.node.appendChild(originalDiv);
            body.node.appendChild(document.createElement('br'));
            body.node.appendChild(optimizedDiv);

            // Show optimization method
            const methodDiv = document.createElement('div');
            methodDiv.innerHTML = `<h3>Optimization Method:</h3><p><strong>${method}</strong></p>`;
            body.node.appendChild(methodDiv);

            // Show transformations applied
            if (optimized.transformations.length > 0) {
              const transformDiv = document.createElement('div');
              transformDiv.innerHTML = `<h3>Transformations Applied:</h3><ul>${optimized.transformations.map((t: any) => `<li>${t.description}</li>`).join('')}</ul>`;
              body.node.appendChild(transformDiv);
            }

            const buttons = optimized.code === originalCode
              ? [Dialog.okButton({ label: 'Close' })]
              : [Dialog.cancelButton({ label: 'Reject' }), Dialog.okButton({ label: 'Accept' })];

            showDialog({
              title: optimized.code === originalCode ? `Code Optimization - No Changes (${method})` : `Code Optimization - Review Changes (${method})`,
              body: body,
              buttons
            }).then(result => {
              if (result.button.accept && optimized.code !== originalCode) {
                cell.model.sharedModel.setSource(optimized.code);
              }
            });
          }
        }
      });

      notebookPanel.toolbar.addItem('optimize-cell', optimizeButton);

      // Add "Optimize All Cells" button
      const optimizeAllButton = new ToolbarButton({
        icon: fastForwardIcon,
        tooltip: 'Optimize All Cells',
        onClick: async () => {
          console.log('Optimize All Cells clicked');
          const notebook = notebookPanel.content;
          const ruleOptimizer = new RuleBasedOptimizer();

          // Collect results for every code cell
          interface CellResult {
            index: number;
            originalCode: string;
            optimizedCode: string;
            transformations: any[];
            changed: boolean;
          }
          const results: CellResult[] = [];

          notebook.widgets.forEach((cell, index) => {
            if (cell.model.type === 'code') {
              const originalCode = cell.model.sharedModel.getSource();
              const optimized = ruleOptimizer.optimize(originalCode, 'python');
              results.push({
                index,
                originalCode,
                optimizedCode: optimized.code,
                transformations: optimized.transformations,
                changed: optimized.code !== originalCode
              });
            }
          });

          const changedCells = results.filter(r => r.changed);

          // Build dialog body
          const body = new Widget();
          body.addClass('jp-OptimizerDialog');

          if (changedCells.length === 0) {
            const msg = document.createElement('p');
            msg.textContent = `All ${results.length} code cell(s) are already optimized — no changes needed.`;
            body.node.appendChild(msg);

            showDialog({
              title: 'Optimize All Cells — No Changes',
              body,
              buttons: [Dialog.okButton({ label: 'Close' })]
            });
            return;
          }

          const summary = document.createElement('p');
          summary.innerHTML = `<strong>${changedCells.length}</strong> of <strong>${results.length}</strong> code cell(s) can be optimized. Review changes below:`;
          body.node.appendChild(summary);

          changedCells.forEach(r => {
            const section = document.createElement('div');
            section.style.marginTop = '16px';
            section.style.borderTop = '1px solid #ccc';
            section.style.paddingTop = '8px';
            section.innerHTML = `
              <h4 style="margin:0 0 6px 0">Cell ${r.index + 1}</h4>
              <h5 style="margin:0 0 4px 0">Original:</h5>
              <pre style="background:#f5f5f5;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px">${escapeHtml(r.originalCode)}</pre>
              <h5 style="margin:0 0 4px 0">Optimized:</h5>
              <pre style="background:#e8f5e9;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px">${escapeHtml(r.optimizedCode)}</pre>
              ${r.transformations.length > 0
                ? `<ul style="margin:4px 0 0 0;font-size:12px">${r.transformations.map((t: any) => `<li>${escapeHtml(t.description)}</li>`).join('')}</ul>`
                : ''}
            `;
            body.node.appendChild(section);
          });

          showDialog({
            title: `Optimize All Cells — ${changedCells.length} Change(s)`,
            body,
            buttons: [
              Dialog.cancelButton({ label: 'Reject All' }),
              Dialog.okButton({ label: 'Accept All' })
            ]
          }).then(result => {
            if (result.button.accept) {
              // Apply all optimizations
              changedCells.forEach(r => {
                const cell = notebook.widgets[r.index];
                cell.model.sharedModel.setSource(r.optimizedCode);
              });
            }
          });
        }
      });

      notebookPanel.toolbar.addItem('optimize-all-cells', optimizeAllButton);

      // Add "Optimize All Cells with Gemini" button
      const geminiButton = new ToolbarButton({
        icon: offlineBoltIcon,
        tooltip: 'Optimize All Cells with Gemini',
        onClick: async () => {
          console.log('Optimize All Cells with Gemini clicked');

          // Check API key
          const apiKey = (pluginSettings?.get('llmApiKey').composite as string) ?? '';
          if (!apiKey) {
            const errBody = new Widget();
            const msg = document.createElement('p');
            msg.textContent =
              'No Gemini API key found. Go to Settings → Code Optimizer → LLM API Key and enter your Google Gemini API key.';
            errBody.node.appendChild(msg);
            showDialog({
              title: 'Gemini API Key Required',
              body: errBody,
              buttons: [Dialog.okButton({ label: 'OK' })]
            });
            return;
          }

          const notebook = notebookPanel.content;

          // Collect all code cells
          const codeCells: Array<{ index: number; code: string }> = [];
          notebook.widgets.forEach((cell, index) => {
            if (cell.model.type === 'code' && cell.model.sharedModel.getSource().trim()) {
              codeCells.push({ index, code: cell.model.sharedModel.getSource() });
            }
          });

          if (codeCells.length === 0) {
            const b = new Widget();
            b.node.textContent = 'No non-empty code cells found in this notebook.';
            showDialog({ title: 'Nothing to Optimize', body: b, buttons: [Dialog.okButton()] });
            return;
          }

          // Show a processing dialog while Gemini works
          const loadingBody = new Widget();
          loadingBody.node.innerHTML = `
            <p style="margin:8px 0">
              Sending <strong>${codeCells.length}</strong> cell(s) to Gemini for optimization…
            </p>
            <p style="color:#666;font-size:13px">This may take a few seconds. The dialog will update when complete.</p>
          `;
          // We resolve this via a shared flag
          let resolveLoading!: (value: boolean) => void;
          const loadingDone = new Promise<boolean>(res => { resolveLoading = res; });

          // Show the loading dialog (non-blocking via .then)
          const loadingDialogPromise = showDialog({
            title: `Optimizing ${codeCells.length} Cell(s) with Gemini…`,
            body: loadingBody,
            buttons: [Dialog.cancelButton({ label: 'Cancel' })]
          });

          // Process all cells concurrently with Gemini
          const llmOptimizer = new LLMOptimizer({
            apiKey,
            provider: 'google',
            model: 'gemini-2.0-flash'
          });

          interface GeminiResult {
            index: number;
            originalCode: string;
            optimizedCode: string;
            changed: boolean;
            error?: string;
          }

          let cancelled = false;
          loadingDialogPromise.then(r => {
            if (!r.button.accept) cancelled = true;
            resolveLoading(true);
          });

          const geminiResults: GeminiResult[] = await Promise.all(
            codeCells.map(async ({ index, code }) => {
              try {
                const result = await llmOptimizer.optimize(code, 'python');
                return {
                  index,
                  originalCode: code,
                  optimizedCode: result.code,
                  changed: result.code.trim() !== code.trim()
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

          // Close loading dialog
          resolveLoading(true);
          await loadingDone;

          if (cancelled) return;

          const changedResults = geminiResults.filter(r => r.changed);
          const errorResults = geminiResults.filter(r => r.error);

          if (changedResults.length === 0) {
            const b = new Widget();
            b.node.innerHTML = `
              <p>Gemini found no changes to apply across <strong>${geminiResults.length}</strong> cell(s).</p>
              ${errorResults.length > 0 ? `<p style="color:#c00"><strong>${errorResults.length}</strong> cell(s) failed: ${escapeHtml(errorResults[0].error ?? '')}</p>` : ''}
            `;
            showDialog({
              title: 'Gemini Optimization — No Changes',
              body: b,
              buttons: [Dialog.okButton({ label: 'Close' })]
            });
            return;
          }

          // Build review modal with per-cell checkboxes
          const reviewBody = new Widget();
          reviewBody.addClass('jp-OptimizerDialog');

          const summary = document.createElement('p');
          summary.innerHTML =
            `<strong>${changedResults.length}</strong> of <strong>${geminiResults.length}</strong> cell(s) were optimized by Gemini.` +
            (errorResults.length > 0 ? ` <span style="color:#c00">(${errorResults.length} failed)</span>` : '') +
            ' Select which changes to apply:';
          reviewBody.node.appendChild(summary);

          // Keep track of checkbox elements for each cell
          const checkboxes: Array<{ checkbox: HTMLInputElement; cellIndex: number; optimizedCode: string }> = [];

          changedResults.forEach(r => {
            const section = document.createElement('div');
            section.style.cssText = 'margin-top:16px;border-top:1px solid #ccc;padding-top:10px';

            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:bold';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.style.cssText = 'width:16px;height:16px;cursor:pointer';
            checkboxes.push({ checkbox, cellIndex: r.index, optimizedCode: r.optimizedCode });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`Cell ${r.index + 1}`));
            section.appendChild(label);

            const beforeAfter = document.createElement('div');
            beforeAfter.style.cssText = 'margin-top:8px';
            beforeAfter.innerHTML = `
              <h5 style="margin:0 0 4px 0;color:#555">Original:</h5>
              <pre style="background:#f5f5f5;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:150px;overflow:auto">${escapeHtml(r.originalCode)}</pre>
              <h5 style="margin:6px 0 4px 0;color:#2e7d32">Optimized by Gemini:</h5>
              <pre style="background:#e8f5e9;padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;max-height:150px;overflow:auto">${escapeHtml(r.optimizedCode)}</pre>
            `;
            section.appendChild(beforeAfter);
            reviewBody.node.appendChild(section);
          });

          showDialog({
            title: `Gemini Optimization — ${changedResults.length} Change(s) Ready`,
            body: reviewBody,
            buttons: [
              Dialog.cancelButton({ label: 'Cancel' }),
              Dialog.okButton({ label: 'Apply Selected' })
            ]
          }).then(result => {
            if (result.button.accept) {
              checkboxes.forEach(({ checkbox, cellIndex, optimizedCode }) => {
                if (checkbox.checked) {
                  notebook.widgets[cellIndex].model.sharedModel.setSource(optimizedCode);
                }
              });
            }
          });
        }
      });

      notebookPanel.toolbar.addItem('optimize-all-gemini', geminiButton);
      console.log('Optimize All with Gemini button added');
    });
  }
};

export default plugin;
