import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { decryptData, encryptData } from './crypto';
import type { EncryptedPayload } from '../types/opendial';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Object.defineProperty(globalThis, 'btoa', {
  value: (value: string) => Buffer.from(value, 'binary').toString('base64'),
  configurable: true,
});
Object.defineProperty(globalThis, 'atob', {
  value: (value: string) => Buffer.from(value, 'base64').toString('binary'),
  configurable: true,
});

const failure = /Decryption failed\. Check the password and backup integrity\./;

test('wrong password fails safely', async () => {
  const payload = await encryptData({ secret: 'value' }, 'correct-password');
  await assert.rejects(decryptData(payload, 'wrong-password'), failure);
});

test('tampered ciphertext or authentication tag fails safely', async () => {
  const payload = await encryptData({ secret: 'value' }, 'correct-password');
  const bytes = Buffer.from(payload.ciphertext, 'base64');
  bytes[bytes.length - 1] ^= 1;
  const tampered: EncryptedPayload = { ...payload, ciphertext: bytes.toString('base64') };
  await assert.rejects(decryptData(tampered, 'correct-password'), failure);
});

test('identical inputs use fresh salt and IV and both decrypt', async () => {
  const data = { dials: ['one'], nested: { enabled: true } };
  const first = await encryptData(data, 'same-password');
  const second = await encryptData(data, 'same-password');

  assert.notEqual(first.kdf.salt, second.kdf.salt);
  assert.notEqual(first.cipher.iv, second.cipher.iv);
  assert.notEqual(first.ciphertext, second.ciphertext);
  assert.deepEqual(await decryptData(first, 'same-password'), data);
  assert.deepEqual(await decryptData(second, 'same-password'), data);
});
