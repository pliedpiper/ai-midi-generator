import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ENCRYPTION_SECRET_ENV = 'OPENROUTER_KEY_ENCRYPTION_SECRET';
const IV_LENGTH = 12;
const VERSION = 'v1';

const getKey = () => {
  const secret = process.env[ENCRYPTION_SECRET_ENV];
  if (!secret || secret.length < 16) {
    throw new Error(`${ENCRYPTION_SECRET_ENV} must be set to a strong secret`);
  }
  return createHash('sha256').update(secret).digest();
};

export const encryptSecret = (plaintext: string): string => {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    tag.toString('base64url')
  ].join(':');
};

export const decryptSecret = (encoded: string): string => {
  const [version, ivEncoded, encryptedEncoded, tagEncoded] = encoded.split(':');
  if (version !== VERSION || !ivEncoded || !encryptedEncoded || !tagEncoded) {
    throw new Error('Invalid encrypted payload format');
  }

  const key = getKey();
  const iv = Buffer.from(ivEncoded, 'base64url');
  const encrypted = Buffer.from(encryptedEncoded, 'base64url');
  const tag = Buffer.from(tagEncoded, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};
