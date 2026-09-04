/**
 * OpenDial E2EE Crypto Engine
 * Uses Web Crypto API (crypto.subtle) for client-side AES-GCM 256-bit encryption
 * with PBKDF2 key derivation. Zero data leaves the client unencrypted.
 */

import { EncryptedPayload } from '../types/opendial';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a passphrase and salt using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts any JSON-serializable object with AES-GCM using password
 */
export async function encryptData(data: unknown, password: string): Promise<EncryptedPayload> {
  if (!password) {
    throw new Error('Encryption password cannot be empty');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const serialized = JSON.stringify(data);
  const encoded = enc.encode(serialized);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as ArrayBuffer,
    },
    key,
    encoded
  );

  return {
    version: '1.0.0',
    isEncrypted: true,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
  };
}

/**
 * Decrypts an encrypted payload using the provided password
 */
export async function decryptData<T = unknown>(
  payload: EncryptedPayload,
  password: string
): Promise<T> {
  if (!password) {
    throw new Error('Password required for decryption');
  }

  const saltBuffer = base64ToArrayBuffer(payload.salt);
  const ivBuffer = base64ToArrayBuffer(payload.iv);
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);

  const key = await deriveKey(password, new Uint8Array(saltBuffer));

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer) as unknown as ArrayBuffer,
      },
      key,
      ciphertextBuffer
    );

    const dec = new TextDecoder();
    const jsonString = dec.decode(decryptedBuffer);
    return JSON.parse(jsonString) as T;
  } catch {
    throw new Error('Decryption failed: Invalid password or corrupted payload.');
  }
}

/**
 * Quick password strength validator
 */
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
