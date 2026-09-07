import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import JSZip from 'jszip';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'extension-dist');

async function files(dir: string): Promise<string[]> {
  const result: string[] = [];
  for (const name of await readdir(dir)) {
    const path = resolve(dir, name);
    if ((await stat(path)).isDirectory()) result.push(...await files(path));
    else result.push(relative(output, path).replaceAll('\\', '/'));
  }
  return result;
}

test('extension artifact contains local app with minimal secure manifest', async () => {
  const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, []);
  assert.equal(manifest.chrome_url_overrides.newtab, 'index.html');
  assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'none'; base-uri 'none'");
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.host_permissions, undefined);
  for (const permission of ['tabs', 'bookmarks', 'contextualIdentities', 'storage', 'unlimitedStorage']) assert.ok(!manifest.permissions.includes(permission));
  const names = await files(output);
  assert.ok(names.includes('index.html'));
  assert.ok(names.some(name => /^assets\/.+\.js$/.test(name)));
  assert.ok(names.some(name => /^assets\/.+\.css$/.test(name)));
  for (const size of [16, 32, 48, 128]) assert.ok(names.includes(`icons/icon-${size}.png`));
  assert.ok(!names.some(name => name.endsWith('.map') || name.startsWith('.env') || name.includes('node_modules')));
  const html = await readFile(resolve(output, 'index.html'), 'utf8');
  assert.match(html, /\.\/assets\//);
  assert.doesNotMatch(html, /https?:\/\//);
  const text = (await Promise.all(names.filter(name => /\.(html|js|css|json|txt)$/.test(name)).map(name => readFile(resolve(output, name), 'utf8')))).join('\n');
  assert.doesNotMatch(text, /europe-west3\.run\.app|Cloud Run|Open Full Dashboard/i);
  assert.doesNotMatch(text, /VITE_[A-Z0-9_]+\s*=|client_secret\s*[:=]/i);
  const zip = await JSZip.loadAsync(await readFile(resolve(root, 'opendial-extension.zip')));
  assert.deepEqual(Object.keys(zip.files).filter(function (name) { return !zip.files[name].dir; }).sort(), names.concat([]).sort());
});
