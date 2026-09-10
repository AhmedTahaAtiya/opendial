import JSZip from 'jszip';
import { sanitizeImportedBackup } from './backup';
import type { ExportBackupData } from '../types/opendial';

const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'icon.svg',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

async function addAsset(zip: JSZip, path: string): Promise<string> {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error('Missing built extension asset: ' + path);
  const data = await response.arrayBuffer();
  zip.file(path.replace(/^\.\//, ''), data);
  return new TextDecoder().decode(data);
}

export async function generateExtensionZip(backupData: ExportBackupData): Promise<Blob> {
  const zip = new JSZip();
  zip.file('config_seed.json', JSON.stringify(sanitizeImportedBackup(backupData), null, 2));
  if (typeof document === 'undefined') return zip.generateAsync({ type: 'blob' });
  const contents = await Promise.all(
    STATIC_ASSETS.map(function (path) {
      return addAsset(zip, path);
    }),
  );
  const sourcePattern = /src="(\.\/assets\/[^"]+)"/g;
  const stylePattern = /href="(\.\/assets\/[^"]+)"/g;
  const paths: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = sourcePattern.exec(contents[0])) !== null) paths.push(match[1]);
  while ((match = stylePattern.exec(contents[0])) !== null) paths.push(match[1]);
  await Promise.all(
    paths.map(function (path) {
      return addAsset(zip, path);
    }),
  );
  zip.file(
    'README.txt',
    'OpenDial offline New Tab extension. Extract and load unpacked in a Chromium browser.\n',
  );
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}
