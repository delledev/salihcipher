# Salih Cipher Algorithm Documentation

## Overview

Salih Cipher is a custom symmetric block cipher designed to provide strong encryption through a multi-layered cryptographic pipeline. It operates on 16-byte (128-bit) blocks and uses a 128-bit key and nonce for each encryption operation. The algorithm emphasizes diffusion and confusion principles to ensure that small changes in plaintext or nonce produce dramatically different ciphertexts.

## Algorithm Specifications

### Key Parameters
- **Block Size**: 16 bytes (128 bits)
- **Key Size**: 16 bytes (128 bits)
- **Nonce Size**: 16 bytes (128 bits)
- **Padding**: PKCS#7 style
- **Nonce Increment**: Big-endian counter (incremented per block)

### Core Components

The cipher consists of several cryptographic layers working in tandem:

1. **S-Box Substitution** (Substitution-Box)
2. **Bit Reversal & Nonce XOR** (Double Mirror)
3. **Mixing Layer** (Diffusion through rotation and permutation)
4. **Key XOR with Derived Key** (Key XOR nonce)
5. **CBC-Style Chaining** (Inter-block dependency)

---

## Detailed Encryption Pipeline

### Step 0: Preparation

**Input**: Plaintext string, 16-byte key, 16-byte nonce

**Process**:
1. Convert plaintext to bytes using UTF-8 encoding
2. Apply PKCS#7 padding to reach 16-byte boundary
3. Split padded data into 16-byte blocks
4. Apply S-Box substitution to all bytes in all blocks

**Output**: Array of 16-byte S-Box substituted blocks, initial nonce

### Step 1: Double Mirror & Nonce XOR (`doubleMirrorXor`)

**Input**: S-Box substituted block, current nonce

**Process**:

**First Pass**:
- Reverse all 8 bits in each byte of the block
- XOR each byte with the corresponding nonce byte
- Result: `FirstPass = ReverseBits(SBoxBlock) ⊕ Nonce`

**Second Pass**:
- Increment nonce using big-endian counter (carry propagates from least significant byte)
- Reverse all 8 bits again in each byte
- XOR with the incremented nonce
- Result: `SecondPass = ReverseBits(FirstPass) ⊕ IncrementedNonce`

**Mathematical Property**: This double reversal combined with nonce mixing provides diffusion at the bit level, ensuring that bit changes propagate across the entire byte.

### Step 2: Mixing Layer (`mixBlock`)

**Input**: Result from Step 1 (16-byte block)

**Process**: Three rounds of rotations to increase diffusion

**Round 1 - Rotate Left by 3**:
```
output[i] = input[(i + 3) % 16]
```
Bytes shift 3 positions to the left (circular).

**Round 2 - Rotate Right by 7**:
```
output[i] = round1[(i - 7 + 16) % 16]
```
Bytes rotate 7 positions to the right.

**Round 3 - Rotate Left by 5**:
```
output[i] = round2[(i + 5) % 16]
```
Bytes shift 5 positions to the left.

**Diffusion Effect**: The multiple rotation with different offsets ensures that every byte position is influenced by multiple source positions. Combined, the rotations guarantee complete diffusion across all 16 byte positions.

### Step 3: Key XOR with Derived Key

**Input**: Result from Step 2, original key, current nonce

**Process**:
1. Derive key by XORing the original key with current nonce:
   ```
   DerivedKey = Key ⊕ Nonce
   ```
2. XOR each byte of the mixed block with the corresponding derived key byte:
   ```
   output[i] = mixedBlock[i] ⊕ DerivedKey[i % 16]
   ```

**Purpose**: This key layer adds dependency on both the key and nonce, making the cipher resistant to attacks that don't account for both values.

### Step 4: CBC-Style Chaining

**Input**: Result from Step 3, previous ciphertext block (or null for first block)

**Process**:
- For the first block: output remains unchanged
- For subsequent blocks:
  ```
  ciphertext[i] = output[i] ⊕ previousCiphertext[i]
  ```

**Purpose**: Creates inter-block dependency, ensuring that identical plaintext blocks produce different ciphertexts based on their position in the stream.

### Step 5: Nonce Increment

After each block is encrypted, the nonce is incremented using big-endian counter arithmetic:
```
Nonce = Nonce + 1 (big-endian, with carry)
```

This ensures each block uses a unique nonce, preventing patterns when the same plaintext block appears multiple times.

---

## Detailed Decryption Pipeline

Decryption reverses the encryption pipeline in reverse order:

### Step 1: Reverse CBC Chaining

**Input**: Ciphertext block, previous ciphertext block (or null for first)

**Process**:
- For the first block: output remains unchanged
- For subsequent blocks:
  ```
  afterChaining[i] = ciphertext[i] ⊕ previousCiphertext[i]
  ```

**Note**: We can use the current ciphertext block as the previous block for the next operation since CBC chaining is reversible.

### Step 2: Reverse Key XOR

**Input**: Result from Step 1, original key, current nonce

**Process**:
1. Derive the same key as encryption:
   ```
   DerivedKey = Key ⊕ Nonce
   ```
2. XOR with derived key (XOR is self-inverse):
   ```
   output[i] = input[i] ⊕ DerivedKey[i % 16]
   ```

### Step 3: Inverse Mixing Layer

**Input**: Result from Step 2

**Process**: Reverse the three rotation rounds

**Reverse Round 3 - Rotate Right by 5**:
```
output[i] = input[(i - 5 + 16) % 16]
```

**Reverse Round 2 - Rotate Left by 7**:
```
output[i] = prev[(i + 7) % 16]
```

**Reverse Round 1 - Rotate Right by 3**:
```
output[i] = prev[(i - 3 + 16) % 16]
```

### Step 4: Inverse Double Mirror & Nonce XOR

**Input**: Result from Step 3, current nonce

**Process**: Reverse of Step 1

**Reverse Second Pass**:
- Increment nonce (same as encryption)
- XOR with incremented nonce (self-inverse):
  ```
  output[i] = input[i] ⊕ IncrementedNonce[i]
  ```
- Reverse bits in each byte:
  ```
  output[i] = ReverseBits(output[i])
  ```

**Reverse First Pass**:
- XOR with original nonce:
  ```
  output[i] = output[i] ⊕ Nonce[i]
  ```
- Reverse bits in each byte:
  ```
  output[i] = ReverseBits(output[i])
  ```

### Step 5: Inverse S-Box Substitution

**Input**: Result from Step 4 (decrypted bytes)

**Process**:
- Apply Inverse S-Box lookup table to each byte
- This reverses the S-Box substitution from encryption

### Step 6: Remove PKCS#7 Padding

**Input**: Decrypted bytes from Step 5

**Process**:
1. Read the last byte value (padding length)
2. Validate that all last N bytes equal the padding length
3. Remove the padding bytes
4. Convert remaining bytes to UTF-8 string

**Output**: Original plaintext

---

## Cryptographic Properties

### Confusion
- **S-Box Substitution**: Provides non-linear transformation, breaking linear relationships between plaintext and ciphertext
- **Bit Reversal**: Bit-level confusion making individual bit changes affect multiple bits after multiple rounds

### Diffusion
- **Double Mirror**: Distributes bit changes across the entire byte
- **Mixing Layer**: Three rotation passes ensure that each output byte depends on multiple input bytes across the entire block
- **CBC Chaining**: Each block's ciphertext affects all subsequent blocks

### Avalanche Effect
Small changes in plaintext, key, or nonce produce dramatically different ciphertexts:
- 1-bit change in plaintext → affects ~64 bytes of ciphertext (due to CBC chaining through multiple blocks)
- 1-bit change in nonce → affects entire current block + all subsequent blocks
- 1-bit change in key → affects entire block and propagates through CBC chaining

---

## Security Considerations

### Strengths
1. **Multiple Layers**: Combination of substitution, bit reversal, rotation, and XOR operations
2. **Nonce-based**: Each block uses a unique nonce, preventing pattern attacks
3. **Key Derivation**: Nonce combined with key makes attacks harder
4. **Diffusion**: Complete dependency between all bytes after mixing

### Design Choices
- **Block Size (128-bit)**: Standard for modern block ciphers
- **No Key Schedule**: Simplicity over key expansion (acceptable for educational cipher)
- **CBC Mode**: Provides inter-block mixing without requiring explicit authentication

### Recommended Usage
- Use cryptographically secure random generation for keys and nonces
- Never reuse the same (key, nonce) pair for different plaintexts
- Treat as educational: NOT recommended for real cryptographic security requirements
- Consider using established ciphers (AES, ChaCha20) for production use

---

## Code Implementation Example

### Encryption
```typescript
import { encrypt } from './lib/cipher';

const plaintext = "Hello, World!";
const key = new Uint8Array(16);        // 16-byte key
const nonce = new Uint8Array(16);      // 16-byte nonce

crypto.getRandomValues(key);
crypto.getRandomValues(nonce);

const ciphertext = encrypt(plaintext, key, nonce);
// ciphertext is a hex string
```

### Decryption
```typescript
import { decrypt } from './lib/cipher';

const decrypted = decrypt(ciphertext, key, nonce);
// decrypted should equal original plaintext
```

---

## Performance Characteristics

- **Block Processing**: Each 16-byte block goes through 5 major transformation stages
- **Per-Block Operations**: ~500-600 basic operations (XOR, rotations, bit reversals)
- **Padding**: Automatic PKCS#7 padding for any plaintext size
- **Output**: Hex-encoded ciphertext (2 hex chars per byte)

---

## Test Vectors

For validation, the cipher should produce consistent ciphertexts:

```
Plaintext: "test"
Key: 00010203 04050607 08090a0b 0c0d0e0f
Nonce: 10111213 14151617 18191a1b 1c1d1e1f
Output: (hex-encoded, deterministic)

Decryption of output with same key/nonce should produce "test"
```

---

## References

- Feistel Networks: Foundation for block cipher design
- AES (Advanced Encryption Standard): Inspiration for substitution-box and diffusion concepts
- CBC Mode: For chaining plaintext blocks together
- PKCS#7: Standard padding scheme

---

## Algorithm Summary Table

| Stage | Input | Operation | Output | Purpose |
|-------|-------|-----------|--------|---------|
| 0 | Plaintext | S-Box, Padding | SBox Blocks | Substitution & Size |
| 1 | SBox Block | Bit Reverse + Nonce XOR × 2 | Diffused Block | Bit-level Diffusion |
| 2 | Diffused | Rotate 3L, 7R, 5L | Mixed Block | Byte-level Diffusion |
| 3 | Mixed | Key ⊕ Nonce XOR | Keyed Block | Key Integration |
| 4 | Keyed | ⊕ Previous CT | Ciphertext | Block Chaining |
| 5 | Nonce | Big-endian +1 | New Nonce | Block Uniqueness |

