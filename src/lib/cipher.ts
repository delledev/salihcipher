import { INV_SBOX, SBOX } from "./constants";
import {
  blocksToHex,
  blocksToString,
  hexToBlocks,
  prepareBlocks,
  stringToBytes,
  substituteBlockArray,
  encryptBlockWithPipeline,
  decryptBlockWithPipeline,
  incrementNonce,
  removePadding
} from "./util";

/**
 * Encrypts plaintext using the custom cryptographic pipeline
 * @param plaintext - The text to encrypt
 * @param key - 16-byte encryption key
 * @param nonce - 16-byte nonce (incremented per block)
 * @returns Hex-encoded ciphertext
 */
export function encrypt(plaintext: string, key: Uint8Array, nonce: Uint8Array): string {
  const plainBytes = stringToBytes(plaintext);
  const blocks = prepareBlocks(plainBytes);
  const sboxBlocks = substituteBlockArray(blocks, SBOX);

  const cipherBlocks: Uint8Array[] = [];
  let currentNonce = new Uint8Array(nonce);
  let previousCiphertext: Uint8Array | null = null;

  for (const sboxBlock of sboxBlocks) {
    const encryptedBlock = encryptBlockWithPipeline(
      sboxBlock,
      key,
      currentNonce,
      previousCiphertext
    );

    cipherBlocks.push(encryptedBlock);
    previousCiphertext = encryptedBlock;
    currentNonce = new Uint8Array(incrementNonce(currentNonce));
  }

  return blocksToHex(cipherBlocks);
}

/**
 * Decrypts ciphertext using the custom cryptographic pipeline
 * @param ciphertext - Hex-encoded ciphertext to decrypt
 * @param key - 16-byte encryption key (must match encryption key)
 * @param nonce - 16-byte nonce (must match encryption nonce)
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string, key: Uint8Array, nonce: Uint8Array): string {
  const cipherBlocks = hexToBlocks(ciphertext);

  const plainBlocks: Uint8Array[] = [];
  let currentNonce = new Uint8Array(nonce);
  let previousCiphertext: Uint8Array | null = null;

  for (let i = 0; i < cipherBlocks.length; i++) {
    const decryptedSboxBlock = decryptBlockWithPipeline(
      cipherBlocks[i],
      key,
      currentNonce,
      previousCiphertext
    );

    const plainBlock = substituteBlockArray([decryptedSboxBlock], INV_SBOX)[0];
    plainBlocks.push(plainBlock);
    previousCiphertext = cipherBlocks[i];
    currentNonce = new Uint8Array(incrementNonce(currentNonce));
  }

  // Combine all plain blocks into a single Uint8Array
  const allBytes: number[] = [];
  for (const block of plainBlocks) {
    allBytes.push(...block);
  }
  const paddedData = new Uint8Array(allBytes);
  
  // Remove PKCS#7 padding
  const unpadded = removePadding(paddedData);
  
  return String.fromCharCode(...unpadded);
}