/**
 * OpenDial E2EE Crypto Engine.
 * Passwords and derived keys are used only in memory and are never exported.
 */

import { EncryptedPayload } from '../types/opendial';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256 as const;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_LENGTH = 128 as const;
const DECRYPTION_FAILURE = 'Decryption failed. Check the password and backup integrity.';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptData(data: unknown, password: string): Promise<EncryptedPayload> {
  if (!password) throw new Error('Encryption password cannot be empty.');

  // A new salt and IV are generated for every operation. Neither is reused or persisted elsewhere.
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LENGTH },
    key,
    plaintext,
  );

  return {
    version: '1',
    isEncrypted: true,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: 'AES-GCM',
      keyLength: KEY_LENGTH,
      iv: bytesToBase64(iv),
      tagLength: TAG_LENGTH,
    },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptData<T = unknown>(
  payload: EncryptedPayload,
  password: string,
): Promise<T> {
  if (!password) throw new Error('Password required for decryption.');

  try {
    if (
      payload?.version !== '1' ||
      payload?.isEncrypted !== true ||
      payload.kdf?.name !== 'PBKDF2' ||
      payload.kdf.hash !== 'SHA-256' ||
      !Number.isInteger(payload.kdf.iterations) ||
      payload.kdf.iterations < 1 ||
      payload.cipher?.name !== 'AES-GCM' ||
      payload.cipher.keyLength !== KEY_LENGTH ||
      payload.cipher.tagLength !== TAG_LENGTH
    ) {
      throw new Error('Unsupported encrypted payload');
    }

    const salt = base64ToBytes(payload.kdf.salt);
    const iv = base64ToBytes(payload.cipher.iv);
    const ciphertext = base64ToBytes(payload.ciphertext);
    if (
      salt.byteLength !== SALT_BYTES ||
      iv.byteLength !== IV_BYTES ||
      ciphertext.byteLength < 16
    ) {
      throw new Error('Invalid encrypted payload');
    }

    const key = await deriveKey(password, salt, payload.kdf.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: payload.cipher.tagLength },
      key,
      ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    // Authentication, malformed payloads, wrong passwords and invalid JSON are intentionally indistinguishable.
    throw new Error(DECRYPTION_FAILURE);
  }
}

export function checkPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: 'Empty' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak' };
  if (score <= 3) return { score, label: 'Moderate' };
  return { score, label: 'Strong' };
}
