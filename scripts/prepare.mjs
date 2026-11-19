// Turns src/DiNota.html (the single-file web app) into resources/index.html for the desktop shell.
// The only change: the Neutralinojs client library is loaded first, so DiNota's own NATIVE()
// checks find it and switch on native save dialogs, "Open with", Quit, and so on.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'DiNota.html');
const out = join(root, 'resources', 'index.html');
const HOOK = '<meta charset="utf-8">';
const INJECT = HOOK + '\n<script src="/js/neutralino.js"></script>\n<script>try { Neutralino.init(); } catch (e) { console.warn("Neutralino did not start", e); }</script>';

let html = readFileSync(src, 'utf8');
const at = html.indexOf(HOOK);
if (at < 0 || at > 2000) throw new Error(`src/DiNota.html: expected ${HOOK} at the top of <head>`);
if (!html.includes('window.Neutralino') || !html.includes('function bindDesktop'))
  throw new Error('src/DiNota.html has no desktop bridge (NATIVE / bindDesktop). Is this the right file?');
html = html.slice(0, at) + INJECT + html.slice(at + HOOK.length);

mkdirSync(join(root, 'resources', 'icons'), { recursive: true });
mkdirSync(join(root, 'resources', 'js'), { recursive: true });
writeFileSync(out, html);
copyFileSync(join(root, 'assets', 'icon-256.png'), join(root, 'resources', 'icons', 'appIcon.png'));

// Keep the version in neutralino.config.json in step with the app's own APP_VERSION.
const m = html.match(/APP_VERSION\s*=\s*['"]([\d.]+)['"]/);
const cfgPath = join(root, 'neutralino.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
if (m) {
  const v = m[1].split('.').concat(['0', '0']).slice(0, 3).join('.');
  if (cfg.version !== v) { cfg.version = v; writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n'); console.log(`version -> ${v}`); }
}
console.log(`resources/index.html written (${(html.length / 1048576).toFixed(1)} MB), DiNota ${cfg.version}`);
if (!existsSync(join(root, 'resources', 'js', 'neutralino.js')) || !existsSync(join(root, 'bin')))
  console.log('Neutralinojs runtime not downloaded yet: run "npm run setup" once.');
