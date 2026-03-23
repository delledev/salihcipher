"use client";

import { useState } from "react";
import { decrypt, encrypt } from "@/lib/cipher";

export default function CipherApp() {
  const [plaintext, setPlaintext] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [nonceInput, setNonceInput] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [decryptKey, setDecryptKey] = useState("");
  const [decryptNonce, setDecryptNonce] = useState("");
  const [decryptCipher, setDecryptCipher] = useState("");
  const [decrypted, setDecrypted] = useState("");

  // Parse hex string to Uint8Array
  const parseHexKey = (hex: string): Uint8Array | null => {
    if (!hex || hex.length !== 32) return null;
    try {
      return new Uint8Array(
        hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
    } catch {
      return null;
    }
  };

  // Generate random key
  const generateKey = () => {
    const key = crypto.getRandomValues(new Uint8Array(16));
    setKeyInput(Array.from(key).map((b) => b.toString(16).padStart(2, "0")).join(""));
  };

  // Generate random nonce
  const generateNonce = () => {
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    setNonceInput(Array.from(nonce).map((b) => b.toString(16).padStart(2, "0")).join(""));
  };

  // Handle encryption
  const handleEncrypt = () => {
    const key = parseHexKey(keyInput);
    const nonce = parseHexKey(nonceInput);

    if (!key || !nonce) {
      alert("Invalid key or nonce. Must be 32 hex characters.");
      return;
    }

    if (!plaintext) {
      alert("Please enter text to encrypt.");
      return;
    }

    try {
      const encrypted = encrypt(plaintext, key, nonce);
      setCiphertext(encrypted);
      
      // Auto-populate decryption section
      setDecryptKey(keyInput);
      setDecryptNonce(nonceInput);
      setDecryptCipher(encrypted);
      setDecrypted(""); // Clear previous decryption
    } catch (error) {
      alert("Encryption failed: " + (error as Error).message);
    }
  };

  // Handle decryption
  const handleDecrypt = () => {
    const key = parseHexKey(decryptKey);
    const nonce = parseHexKey(decryptNonce);

    if (!key || !nonce) {
      alert("Invalid key or nonce. Must be 32 hex characters.");
      return;
    }

    if (!decryptCipher) {
      alert("No ciphertext to decrypt.");
      return;
    }

    try {
      const decryptedText = decrypt(decryptCipher, key, nonce);
      setDecrypted(decryptedText);
    } catch (error) {
      alert("Decryption failed: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 font-mono flex items-center justify-center">
      <div className="w-full max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
          ▮▮ SALIF CIPHER ▮▮
        </h1>
        <p className="text-slate-400 text-sm mt-2 opacity-75">
          // Cryptographic Pipeline System
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Panel - Encryption */}
        <div className="space-y-4">
          {/* Text Input */}
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
            <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
              ▸ Input Text
            </label>
            <textarea
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder="text to encrypt"
              className="w-full h-40 bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/30 placeholder-slate-600 resize-none text-xs"
            />
          </div>

          {/* Key Input Section */}
          <div className="space-y-3">
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
                ▸ Encryption Key (32 hex chars)
              </label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.toLowerCase())}
                placeholder="insert key"
                className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/30 placeholder-slate-600 text-xs"
              />
            </div>
            <button
              onClick={generateKey}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 rounded-lg transition-all duration-200 uppercase text-xs tracking-wide shadow-lg"
            >
              ⟳ Generate Key
            </button>
          </div>

          {/* Nonce Input Section */}
          <div className="space-y-3">
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
                ▸ Nonce (32 hex chars)
              </label>
              <input
                type="text"
                value={nonceInput}
                onChange={(e) => setNonceInput(e.target.value.toLowerCase())}
                placeholder="insert nonce"
                className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/30 placeholder-slate-600 text-xs"
              />
            </div>
            <button
              onClick={generateNonce}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 rounded-lg transition-all duration-200 uppercase text-xs tracking-wide shadow-lg"
            >
              ⟳ Generate Nonce
            </button>
          </div>

          {/* Encrypt Button */}
          <button
            onClick={handleEncrypt}
            className="w-full bg-blue-700 hover:bg-blue-600 text-slate-100 font-bold py-3 rounded-lg transition-all duration-200 uppercase text-sm tracking-wide shadow-lg"
          >
            ⟹ Encrypt
          </button>

          {/* Encrypted Data Box */}
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
            <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
              ▸ Encrypted Data
            </label>
            <div className="w-full h-48 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-300 text-xs overflow-y-auto break-all font-mono">
              {ciphertext || "// encrypted output will appear here"}
            </div>
          </div>
        </div>

        {/* Right Panel - Decryption */}
        <div className="space-y-4">
          {/* Decrypt Key Input */}
          <div className="space-y-3">
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
                ▸ Decryption Key (32 hex chars)
              </label>
              <input
                type="text"
                value={decryptKey}
                onChange={(e) => setDecryptKey(e.target.value.toLowerCase())}
                placeholder="insert key"
                className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/30 placeholder-slate-600 text-xs"
              />
            </div>
          </div>

          {/* Decrypt Nonce Input */}
          <div className="space-y-3">
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
                ▸ Nonce (32 hex chars)
              </label>
              <input
                type="text"
                value={decryptNonce}
                onChange={(e) => setDecryptNonce(e.target.value.toLowerCase())}
                placeholder="insert nonce"
                className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/30 placeholder-slate-600 text-xs"
              />
            </div>
          </div>

          {/* Ciphertext Input */}
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
            <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
              ▸ Ciphertext
            </label>
            <textarea
              value={decryptCipher}
              onChange={(e) => setDecryptCipher(e.target.value.toLowerCase())}
              placeholder="stuff for decryption"
              className="w-full h-40 bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/30 placeholder-slate-600 resize-none text-xs"
            />
          </div>

          {/* Decrypt Button */}
          <button
            onClick={handleDecrypt}
            className="w-full bg-blue-700 hover:bg-blue-600 text-slate-100 font-bold py-3 rounded-lg transition-all duration-200 uppercase text-sm tracking-wide shadow-lg"
          >
            ⟹ Decrypt
          </button>

          {/* Decryption Output */}
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900 shadow-lg">
            <label className="text-slate-300 text-xs font-bold uppercase tracking-wider block mb-2">
              ▸ Decryption Output
            </label>
            <div className="w-full h-48 bg-slate-800 border border-slate-700 rounded px-4 py-3 text-slate-300 text-xs overflow-y-auto break-words font-mono leading-relaxed">
              {decrypted || "// decrypted text will appear here"}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-slate-600 text-xs">
        <p>// SalihCipher - Cryptographic Pipeline v1.0</p>
        <p className="mt-1">⟡ Space Theme | Monospace Typography</p>
      </div>
    </div>
    </div>
  );
}
