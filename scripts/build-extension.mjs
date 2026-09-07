import { cp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
import JSZip from 'jszip';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const output = resolve(root, 'extension-dist');
const zipPath = resolve(root, 'opendial-extension.zip');

async function addDirectory(zip, directory, prefix = '') {
  for (const name of (await readdir(directory)).sort()) {
    const full = resolve(directory, name);
    const target = prefix ? prefix + '/' + name : name;
    if ((await stat(full)).isDirectory()) await addDirectory(zip, full, target);
    else zip.file(target, await readFile(full));
  }
}

await rm(dist, { recursive: true, force: true });
await rm(output, { recursive: true, force: true });
await rm(zipPath, { force: true });
await build({ root });
await cp(dist, output, { recursive: true });
await writeFile(resolve(output, 'README.txt'), 'OpenDial offline New Tab extension. Load this directory unpacked in a Chromium browser.\n');
const zip = new JSZip();
await addDirectory(zip, output);
await writeFile(zipPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }));
console.log('Extension directory: ' + output);
console.log('Extension ZIP: ' + zipPath);
