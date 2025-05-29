import * as crypto from 'crypto';

/**
 * Computes the SHA-256 hash of the given content string.
 * @param content The string content to hash
 * @returns The SHA-256 hash as a hexadecimal string
 */
export function computeSha256(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}