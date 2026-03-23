import { SBOX, INV_SBOX } from "./constants";
import { 
  stringToBytes, 
  prepareBlocks, 
  substituteBlockArray, 
  xorBlocks, 
  xorBlockWithKey,
  incrementNonce,
  hexToBlocks
} from "./util";

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

function doubleMirrorXor(block: Uint8Array, nonce: Uint8Array): Uint8Array {
  let state = new Uint8Array(block);
  state = new Uint8Array(reverseBitsInBlock(state));
  for (let i = 0; i < 16; i++) state[i] ^= nonce[i];
  state = new Uint8Array(reverseBitsInBlock(state));
  const incNonce = incrementNonce(nonce);
  for (let i = 0; i < 16; i++) state[i] ^= incNonce[i];
  return state;
}

function mixBlock(block: Uint8Array): Uint8Array {
  let rotated = new Uint8Array(16);
  for (let i = 0; i < 16; i++) rotated[i] = block[(i - 7 + 16) % 16];
  return rotated;
}

export interface TraceStep {
  label: string;
  blocks: number[][]; // Using blocks: number[][] for multi-block support
  description: string;
}

export function getEncryptionTrace(plaintext: string, key: Uint8Array, nonce: Uint8Array): TraceStep[] {
  if (!plaintext) return [];
  
  const bytes = stringToBytes(plaintext);
  const blocks = prepareBlocks(bytes);
  
  const steps: TraceStep[] = [
    { label: "1. Input Blocks", blocks: blocks.map(b => Array.from(b)), description: "Plaintext padded and split into 16-byte blocks." }
  ];

  const sboxBlocks = substituteBlockArray(blocks, SBOX);
  steps.push({ label: "2. S-Box Substitution", blocks: sboxBlocks.map(b => Array.from(b)), description: "Non-linear substitution applied to scramble individual byte values." });

  let currentNonce = new Uint8Array(nonce);
  let previousCiphertext: Uint8Array | null = null;
  
  const mirrorBlocks: number[][] = [];
  const mixedBlocks: number[][] = [];
  const finalBlocks: number[][] = [];

  for (const sboxBlock of sboxBlocks) {
    const derivedKey = xorBlocks(key, currentNonce);
    
    // Step: Mirror
    let block = doubleMirrorXor(sboxBlock, currentNonce);
    mirrorBlocks.push(Array.from(block));

    // Step: Mixing
    block = mixBlock(block);
    mixedBlocks.push(Array.from(block));

    // Step: Key XOR + CBC
    block = xorBlockWithKey(block, derivedKey);
    if (previousCiphertext) {
      block = xorBlocks(block, previousCiphertext);
    }
    
    finalBlocks.push(Array.from(block));
    previousCiphertext = block;
    currentNonce = new Uint8Array(incrementNonce(currentNonce));
  }

  steps.push({ label: "3. Mirror Transform", blocks: mirrorBlocks, description: "Deep bit-reversal and nonce XOR for high diffusion and bit-level chaos." });
  steps.push({ label: "4. Diffusion (Mix)", blocks: mixedBlocks, description: "Block rotation to spread the influence of each byte across the block." });
  steps.push({ label: "5. Final Ciphertext", blocks: finalBlocks, description: "Final result after XORing with the working key and CBC chaining." });

  return steps;
}

export function getDecryptionTrace(ciphertext: string, key: Uint8Array, nonce: Uint8Array): TraceStep[] {
    const cipherBlocks = hexToBlocks(ciphertext);
    if (!cipherBlocks || cipherBlocks.length === 0) return [];

    const steps: TraceStep[] = [
        { label: "1. Received Blocks", blocks: cipherBlocks.map(b => Array.from(b)), description: "The raw encrypted data blocks received for processing." }
    ];

    let currentNonce = new Uint8Array(nonce);
    let previousCiphertext: Uint8Array | null = null;
    
    const unkeyedBlocks: number[][] = [];
    const unmixedBlocks: number[][] = [];
    const plainBlocks: number[][] = [];

    for (let i = 0; i < cipherBlocks.length; i++) {
        const derivedKey = xorBlocks(key, currentNonce);
        let block = new Uint8Array(cipherBlocks[i]);

        // Reverse CBC
        const currentCipherBlock = new Uint8Array(block);
        if (previousCiphertext) {
            block = new Uint8Array(xorBlocks(block, previousCiphertext));
        }

        // Reverse Key XOR
        block = new Uint8Array(xorBlockWithKey(block, derivedKey));
        unkeyedBlocks.push(Array.from(block));

        // Reverse Mix
        const rotated = new Uint8Array(16);
        for (let j = 0; j < 16; j++) rotated[j] = block[(j + 7) % 16];
        block = rotated;
        unmixedBlocks.push(Array.from(block));

        // Reverse Mirror
        const incNonce = incrementNonce(currentNonce);
        let state = new Uint8Array(block);
        for (let j = 0; j < 16; j++) state[j] ^= incNonce[j];
        state = new Uint8Array(reverseBitsInBlock(state));
        for (let j = 0; j < 16; j++) state[j] ^= currentNonce[j];
        state = new Uint8Array(reverseBitsInBlock(state));
        block = state;

        // Inverse S-Box
        const plainBlock = substituteBlockArray([block], INV_SBOX)[0];
        plainBlocks.push(Array.from(plainBlock));

        previousCiphertext = currentCipherBlock;
        currentNonce = new Uint8Array(incrementNonce(currentNonce));
    }

    steps.push({ label: "2. Reversed XOR", blocks: unkeyedBlocks, description: "Un-chained blocks by reversing CBC and removing the session key." });
    steps.push({ label: "3. Reversed Mix", blocks: unmixedBlocks, description: "Inverted the diffusion layer to restore original byte alignments." });
    steps.push({ label: "4. Plaintext Blocks", blocks: plainBlocks, description: "Successfully recovered original plaintext blocks before unpadding." });

    return steps;
}
