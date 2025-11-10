import { createHash, randomBytes, pbkdf2Sync } from 'crypto'

/**
 * Generate a salt for password hashing
 */
export function generateSalt(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a password with a salt using PBKDF2
 */
export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const testHash = hashPassword(password, salt)
  return testHash === hash
}

/**
 * Generate an authentication key from password
 * This is used to authenticate devices when adding them
 */
export function generateAuthKey(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

/**
 * Verify an auth key matches a password
 */
export function verifyAuthKey(password: string, authKey: string): boolean {
  const testKey = generateAuthKey(password)
  return testKey === authKey
}
