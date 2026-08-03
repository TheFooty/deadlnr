import crypto from 'crypto';

// AES-256-GCM encryption helper
const ALGORITHM = 'aes-256-gcm';
// Default fallback key for local dev if ENCRYPTION_KEY environment variable is not set
const DEFAULT_KEY = 'deadlnr-secret-encryption-key-32b!'; // 32 characters

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // Ensure key is exactly 32 bytes (256 bits)
    return crypto.createHash('sha256').update(envKey).digest();
  }
  return crypto.createHash('sha256').update(DEFAULT_KEY).digest();
}

/**
 * Encrypts a string (e.g. Canvas iCal URL) using AES-256-GCM.
 * Format returned: iv:authTag:encryptedHex
 */
export function encryptText(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 */
export function decryptText(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    throw new Error('Decryption failed');
  }
}
