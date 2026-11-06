import cypress from 'cypress';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve('.');
const evidenceDir = path.resolve(projectRoot, '..', 'docs', 'QA', 'evidencias');
const viteProcess = spawn(
  process.execPath,
  [path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  { cwd: projectRoot, stdio: 'inherit' },
);
try {
  const deadline = Date.now() + 15000;
  let ready = false;
  while (Date.now() < deadline && viteProcess.exitCode === null) {
    try {
      const response = await fetch('http://127.0.0.1:4173/');
      ready = response.ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (ready) break;
  }
  if (!ready) throw new Error('Vite did not become ready on http://127.0.0.1:4173');

  const result = await cypress.run({
    project: projectRoot,
    browser: 'chrome',
    reporter: 'spec',
  });
  const runs = result?.runs ?? [];
  const tests = runs.flatMap((run) => run.tests ?? []);
  const rows = tests.map((test) => {
    const state = test.attempts?.at(-1)?.state ?? 'unknown';
    const title = [...(test.title ?? [])].join(' › ');
    return `<tr><td>${escapeHtml(title)}</td><td class="${escapeHtml(state)}">${escapeHtml(state)}</td></tr>`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Relatório Cypress — ASCEND</title>
<style>body{font:16px Arial,sans-serif;margin:40px;color:#17212b}h1{color:#087c54}.summary{display:flex;gap:14px;margin:24px 0}.card{padding:18px 24px;border:1px solid #d5dce3;border-radius:8px}.passed{color:#087c54;font-weight:bold}.failed{color:#c62828;font-weight:bold}table{border-collapse:collapse;width:100%}td,th{padding:12px;border:1px solid #d5dce3;text-align:left}th{background:#f2f5f8}</style></head>
<body><h1>Cypress — ASCEND</h1>
<p>Execução E2E local de ${escapeHtml(result?.cypressVersion ?? 'Cypress')} · navegador: ${escapeHtml(`${result?.browserName ?? 'unknown'} ${result?.browserVersion ?? ''}`.trim())}</p>
<div class="summary"><div class="card"><strong>${result?.totalTests ?? tests.length}</strong><br>testes</div><div class="card passed"><strong>${result?.totalPassed ?? 0}</strong><br>aprovados</div><div class="card failed"><strong>${result?.totalFailed ?? 0}</strong><br>falhas</div><div class="card"><strong>${formatDuration(result?.totalDuration ?? 0)}</strong><br>duração</div></div>
<table><thead><tr><th>Teste</th><th>Resultado</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  await writeFile(path.join(evidenceDir, 'cypress-report.html'), html, 'utf8');
  await writeFile(path.join(evidenceDir, 'cypress-results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  if (!result || result.failures || result.totalFailed) process.exitCode = 1;
} finally {
  viteProcess.kill();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatDuration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}
