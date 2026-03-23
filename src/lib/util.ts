import { SBOX, INV_SBOX } from "./constants";

// ============================================================================
// UTILITY FUNCTIONS - Encoding & Block Management
// ============================================================================

export function stringToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function blocksToHex(blocks: Uint8Array[]): string {
  return blocks
    .map(block => Array.from(block)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''))
    .join('');
}

export function hexToBlocks(hexString: string): Uint8Array[] {
  const blocks: Uint8Array[] = [];
  const BLOCK_SIZE = 16;
  
  for (let i = 0; i < hexString.length; i += BLOCK_SIZE * 2) {
    const hexBlock = hexString.slice(i, i + BLOCK_SIZE * 2);
    const bytes = new Uint8Array(hexBlock.length / 2);
    for (let j = 0; j < hexBlock.length; j += 2) {
      bytes[j / 2] = parseInt(hexBlock.substr(j, 2), 16);
    }
    blocks.push(bytes);
  }
  
  return blocks;
}

export function blocksToString(blocks: Uint8Array[]): string {
  const bytes: number[] = [];
  for (const block of blocks) {
    bytes.push(...block);
  }
  return String.fromCharCode(...bytes);
}

export function removePadding(data: Uint8Array): Uint8Array {
  if (data.length === 0) return data;
  
  const paddingLength = data[data.length - 1];
  
  // Validate PKCS#7 padding
  if (paddingLength > 16 || paddingLength === 0) {
    return data;
  }
  
  // Check that all padding bytes are correct
  for (let i = 0; i < paddingLength; i++) {
    if (data[data.length - 1 - i] !== paddingLength) {
      return data;
    }
  }
  
  return data.slice(0, data.length - paddingLength);
}

// ============================================================================
// BLOCK OPERATIONS - Padding & Substitution
// ============================================================================

export function prepareBlocks(input: Uint8Array): Uint8Array[] {
  const BLOCK_SIZE = 16;
  
  // Pad input to multiple of 16 bytes (PKCS#7 style)
  const padLength = BLOCK_SIZE - (input.length % BLOCK_SIZE || BLOCK_SIZE);
  const padded = new Uint8Array(input.length + padLength);
  padded.set(input);
  padded.fill(padLength, input.length);

  // Split into 16-byte blocks
  const blocks: Uint8Array[] = [];
  for (let i = 0; i < padded.length; i += BLOCK_SIZE) {
    blocks.push(padded.slice(i, i + BLOCK_SIZE));
  }

  return blocks;
}

export function substituteBlockArray(blocks: Uint8Array[], subBox: number[]): Uint8Array[] {
  return blocks.map(block => block.map(byte => subBox[byte]));
}

// ============================================================================
// CRYPTOGRAPHIC PRIMITIVES - XOR & Nonce
// ============================================================================

export function xorBlockWithKey(block: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(block.length);
  for (let i = 0; i < block.length; i++) {
    result[i] = block[i] ^ key[i % key.length];
  }
  return result;
}

export function xorBlocks(block1: Uint8Array, block2: Uint8Array): Uint8Array {
  const result = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    result[i] = block1[i] ^ block2[i];
  }
  return result;
}

export function incrementNonce(nonce: Uint8Array): Uint8Array {
  if (nonce.length !== 16) {
    throw new Error("Nonce must be 16 bytes");
  }

  const result = new Uint8Array(nonce);
  for (let i = 15; i >= 0; i--) {
    result[i] = (result[i] + 1) & 0xff;
    if (result[i] !== 0) break;
  }

  return result;
}

// ============================================================================
// INTERNAL CRYPTOGRAPHIC FUNCTIONS - Bit Reversal
// ============================================================================

function reverseBitsInByte(byte: number): number {
  let result = 0;
  for (let i = 0; i < 8; i++) {
    result = (result << 1) | (byte & 1);
    byte >>= 1;
  }
  return result;
}

function reverseBitsInBlock(block: Uint8Array): Uint8Array {
  const result = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    result[i] = reverseBitsInByte(block[i]);
  }
  return result;
}

// ============================================================================
// INTERNAL CRYPTOGRAPHIC FUNCTIONS - Mixing & Transformations
// ============================================================================

function doubleMirrorXor(sboxBlock: Uint8Array, nonce: Uint8Array): Uint8Array {
  let state: Uint8Array = new Uint8Array(sboxBlock);

  // First pass: reverse bits and XOR with nonce
  state = new Uint8Array(reverseBitsInBlock(state));
  for (let i = 0; i < 16; i++) {
    state[i] ^= nonce[i];
  }

  // Second pass: reverse bits and XOR with incremented nonce
  state = new Uint8Array(reverseBitsInBlock(state));
  const incrementedNonce = incrementNonce(nonce);
  for (let i = 0; i < 16; i++) {
    state[i] ^= incrementedNonce[i];
  }

  return state;
}

function inverseDoubleMirrorXor(block: Uint8Array, nonce: Uint8Array): Uint8Array {
  let state: Uint8Array = new Uint8Array(block);

  // Reverse of second pass
  const incrementedNonce = incrementNonce(nonce);
  for (let i = 0; i < 16; i++) {
    state[i] ^= incrementedNonce[i];
  }
  state = new Uint8Array(reverseBitsInBlock(state));

  // Reverse of first pass
  for (let i = 0; i < 16; i++) {
    state[i] ^= nonce[i];
  }
  state = new Uint8Array(reverseBitsInBlock(state));

  return state;
}

// ============================================================================
// INTERNAL CRYPTOGRAPHIC FUNCTIONS - Mixing & Transformations
// ============================================================================

function mixBlock(block: Uint8Array): Uint8Array {
  let state = new Uint8Array(block);

  // Rotate right by 7
  let rotated = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    rotated[i] = state[(i - 7 + 16) % 16];
  }

  return rotated;
}

function inverseMixBlock(block: Uint8Array): Uint8Array {
  let state = new Uint8Array(block);

  // Reverse: Rotate left by 7 (inverse of rotate right by 7)
  let rotated = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    rotated[i] = state[(i + 7) % 16];
  }

  return rotated;
}


// ============================================================================
// ENCRYPTION PIPELINE
// ============================================================================

export function encryptBlockWithPipeline(
  sboxBlock: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  previousCiphertext: Uint8Array | null
): Uint8Array {
  // Derive key by XORing with nonce
  const derivedKey = xorBlocks(key, nonce);

  // Step 1: Double bit reversal + nonce XOR
  let block = doubleMirrorXor(sboxBlock, nonce);

  // Step 2: Mixing layer (rotation for diffusion)
  block = mixBlock(block);

  // Step 3: XOR with derived key (key XOR nonce)
  block = xorBlockWithKey(block, derivedKey);

  // Step 4: CBC-style chaining
  if (previousCiphertext) {
    block = xorBlocks(block, previousCiphertext);
  }

  return block;
}

export function decryptBlockWithPipeline(
  ciphertextBlock: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  previousCiphertextBlock: Uint8Array | null
): Uint8Array {
  // Derive key by XORing with nonce
  const derivedKey = xorBlocks(key, nonce);

  let block: Uint8Array = new Uint8Array(ciphertextBlock);

  // Step 1: Reverse CBC chaining
  if (previousCiphertextBlock) {
    block = new Uint8Array(xorBlocks(block, previousCiphertextBlock));
  }

  // Step 2: Reverse key XOR with derived key
  block = new Uint8Array(xorBlockWithKey(block, derivedKey));

  // Step 3: Reverse mixing
  block = new Uint8Array(inverseMixBlock(block));

  // Step 4: Reverse double mirror & nonce XOR
  block = new Uint8Array(inverseDoubleMirrorXor(block, nonce));

  return block;
}

