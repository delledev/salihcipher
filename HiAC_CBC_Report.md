# HiAC-CBC: Hybrid Affine-Hill Cipher in Cipher Block Chaining Mode

## 1. Introduction
The **HiAC-CBC** (Hybrid Affine-Hill Cipher Block Chaining) system is an original, symmetric-key cryptographic algorithm designed to provide significantly stronger encryption than classical standalone substitution ciphers. By combining matrix multiplication (Hill Cipher), modular linear transformations (Affine Cipher), and a probabilistic chaining mode (Cipher Block Chaining - CBC), HiAC-CBC creates a robust defense against frequency analysis, known-plaintext, and chosen-plaintext attacks that easily break classical ciphers.

## 2. System Architecture

The cipher operates onto an alphabet of 26 letters (A-Z), where each letter is mapped to an integer $0 \leq x \leq 25$ ($A=0, B=1, \dots, Z=25$). The plaintext is divided into blocks of size 2 (represented as $2 \times 1$ vectors). 

### 2.1 Keys and Parameters
The secret key comprises three distinct parameters:
1. **$H$ (Hill Matrix)**: A $2 \times 2$ matrix with elements from $\mathbb{Z}_{26}$. The matrix must be invertible modulo 26, meaning its determinant $\det(H)$ must be coprime to 26 ($\gcd(\det(H), 26) = 1$).
2. **$a$ (Affine Multiplier)**: A scalar integer coprime to 26 selected from the set $\{1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25\}$.
3. **$b$ (Affine Offset)**: A scalar integer $0 \leq b \leq 25$.

Additionally, the system requires an **Initialization Vector (IV)**: a random $2 \times 1$ vector over $\mathbb{Z}_{26}$ used for the first block to ensure semantic security (identical plaintexts encrypt to different ciphertexts under the same key).

### 2.2 Encryption Process
Let $P_1, P_2, \dots, P_n$ be plaintext blocks of size 2. If the plaintext has an odd length, it is padded with the character 'X' (value 23).
Let $C_0 = IV$.

For each block $P_i$ ($1 \leq i \leq n$):
1. **CBC Addition (XOR equivalent)**: The current plaintext block is added to the previous ciphertext block modulo 26.
   $$ X_i = (P_i + C_{i-1}) \pmod{26} $$
2. **Hill Transformation (Diffusion)**: The vector is multiplied by the matrix $H$ to mix the characters, achieving diffusion.
   $$ Y_i = H \cdot X_i \pmod{26} $$
3. **Affine Transformation (Confusion)**: The vector is multiplied by scalar $a$, and shifted by vector $\vec{b} = [b, b]^T$, achieving confusion.
   $$ C_i = (a \cdot Y_i + \vec{b}) \pmod{26} $$

The ciphertext is the sequence of blocks $C_1, C_2, \dots, C_n$, transmitted alongside the $IV$.

### 2.3 Decryption Process
Decryption reverses the operations sequentially. For each block $C_i$:
1. **Inverse Affine**: We calculate $a^{-1} \pmod{26}$.
   $$ Y_i = a^{-1} \cdot (C_i - \vec{b}) \pmod{26} $$
2. **Inverse Hill**: We calculate the matrix inverse $H^{-1} \pmod{26} = \det(H)^{-1} \cdot \text{adj}(H) \pmod{26}$.
   $$ X_i = H^{-1} \cdot Y_i \pmod{26} $$
3. **CBC Undo**: We subtract the previous ciphertext block to recover the plaintext.
   $$ P_i = (X_i - C_{i-1}) \pmod{26} $$

## 3. Key Generation and Distribution
Keys ($H, a, b$) are generated securely using PRNGs ensuring the modular constraints are met (e.g., verifying $\det(H)$ coprimality). Keys are distributed using asymmetric encryption (like RSA) or Diffie-Hellman key exchange over a secure channel. The $IV$, however, does not need to be secret and can be prepended to the ciphertext upon transmission.

## 4. Example Execution
**Parameters**:
- $H = \begin{pmatrix} 2 & 1 \\ 1 & 1 \end{pmatrix}$
- $a = 7$, $b = 3$
- $IV = \begin{pmatrix} 5 \\ 8 \end{pmatrix}$

**Plaintext**: "HE" $\rightarrow \begin{pmatrix} 7 \\ 4 \end{pmatrix}$
1. **CBC Addition**: $X_1 = \left( \begin{pmatrix} 7 \\ 4 \end{pmatrix} + \begin{pmatrix} 5 \\ 8 \end{pmatrix} \right) \bmod 26 = \begin{pmatrix} 12 \\ 12 \end{pmatrix}$
2. **Hill Matrix**: $Y_1 = \begin{pmatrix} 2 & 1 \\ 1 & 1 \end{pmatrix} \begin{pmatrix} 12 \\ 12 \end{pmatrix} \bmod 26 = \begin{pmatrix} 36 \\ 24 \end{pmatrix} \bmod 26 = \begin{pmatrix} 10 \\ 24 \end{pmatrix}$
3. **Affine Transform**: $C_1 = 7 \cdot \begin{pmatrix} 10 \\ 24 \end{pmatrix} + \begin{pmatrix} 3 \\ 3 \end{pmatrix} \bmod 26 = \begin{pmatrix} 70 + 3 \\ 168 + 3 \end{pmatrix} \bmod 26 = \begin{pmatrix} 73 \\ 171 \end{pmatrix} \bmod 26 = \begin{pmatrix} 21 \\ 15 \end{pmatrix} \rightarrow \text{"VP"}$

**Ciphertext**: "VP"

## 5. Security Advantages
1. By wrapping the Hill cipher in CBC mode, we solve the classical deterministic vulnerability of Hill/Affine systems. Identical letter pairs no longer produce identical ciphertext pairs.
2. The combination of Affine scalar scaling and Hill matrix multiplication destroys simple linear cryptanalysis attempts used against basic Affine ciphers.
3. Operating on $\mathbb{Z}_{26}$ allows text-native processing without binary conversions, fulfilling classical cryptographic learning goals while elevating security.
