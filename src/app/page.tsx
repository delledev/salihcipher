"use client";

import { useState } from "react";
import { decrypt, encrypt } from "@/lib/cipher";
import { getEncryptionTrace, getDecryptionTrace, TraceStep } from "@/lib/trace";

const HexGrid = ({ data, label }: { data: number[]; label?: string }) => {
  if (!data) return null; // Guard against undefined

  const displayData = data.length > 16 ? data.slice(0, 16) : data;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">
          {label}
        </span>
      )}
      <div className="grid grid-cols-4 gap-2 p-3 bg-black/60 border border-white/10 rounded-2xl shadow-inner">
        {displayData.map((byte, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-neutral-800/80 border border-white/[0.05] group/byte transition-all hover:bg-neutral-700/80"
          >
            <span className="text-sm font-mono font-bold text-indigo-200 uppercase tracking-tight">
              {byte.toString(16).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-sans text-neutral-500 group-hover/byte:text-neutral-300 font-medium tracking-tighter">
              {byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '•'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CipherApp() {
  const [plaintext, setPlaintext] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [nonceInput, setNonceInput] = useState("");
  const [ciphertext, setCiphertext] = useState("");

  const [decryptKey, setDecryptKey] = useState("");
  const [decryptNonce, setDecryptNonce] = useState("");
  const [decryptCipher, setDecryptCipher] = useState("");
  const [decrypted, setDecrypted] = useState("");

  const [isLoadingText, setIsLoadingText] = useState(false);
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [traceType, setTraceType] = useState<"encrypt" | "decrypt" | null>(null);

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

  const generateKey = () => {
    const key = crypto.getRandomValues(new Uint8Array(16));
    setKeyInput(Array.from(key).map((b) => b.toString(16).padStart(2, "0")).join(""));
  };

  const generateNonce = () => {
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    setNonceInput(Array.from(nonce).map((b) => b.toString(16).padStart(2, "0")).join(""));
  };

  const generateSampleText = async () => {
    setIsLoadingText(true);
    try {
      const response = await fetch("https://baconipsum.com/api/?type=meat-and-filler&sentences=3&format=text");
      if (!response.ok) throw new Error("API request failed");
      const text = await response.text();
      setPlaintext(text);
    } catch (error) {
      const fallbacks = [
        "The quick brown fox jumps over the lazy dog. Secure communication is a basic human right in the digital age.",
        "Precision in cryptography and elegant UI design go hand in hand to create a premium user experience.",
        "This pipeline represents a custom implementation of block-cipher principles with multiple diffusion layers."
      ];
      setPlaintext(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    } finally {
      setIsLoadingText(false);
    }
  };

  const handleEncrypt = () => {
    const key = parseHexKey(keyInput);
    const nonce = parseHexKey(nonceInput);
    if (!key || !nonce || !plaintext) {
      alert("Invalid input. Key/Nonce must be 32 hex chars.");
      return;
    }
    try {
      const encrypted = encrypt(plaintext, key, nonce);
      setCiphertext(encrypted);
      setDecryptKey(keyInput);
      setDecryptNonce(nonceInput);
      setDecryptCipher(encrypted);
      setDecrypted("");
      setTraceSteps(getEncryptionTrace(plaintext, key, nonce));
      setTraceType("encrypt");
    } catch (error) {
      alert("Encryption failed: " + (error as Error).message);
    }
  };

  const handleDecrypt = () => {
    const key = parseHexKey(decryptKey);
    const nonce = parseHexKey(decryptNonce);
    if (!key || !nonce || !decryptCipher) {
      alert("Invalid data for decryption.");
      return;
    }
    try {
      const decryptedText = decrypt(decryptCipher, key, nonce);
      setDecrypted(decryptedText);
      setTraceSteps(getDecryptionTrace(decryptCipher, key, nonce));
      setTraceType("decrypt");
    } catch (error) {
      alert("Decryption failed: " + (error as Error).message);
    }
  };

  const copyToClipboard = (text: string) => {
    if (text) navigator.clipboard.writeText(text);
  };

  const ActionButton = ({ onClick, title, children, className = "", disabled = false }: { onClick: () => void; title: string; children: React.ReactNode; className?: string; disabled?: boolean }) => (
    <button onClick={onClick} title={title} disabled={disabled} className={`p-1.5 text-neutral-500 hover:text-indigo-400 transition-colors bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans selection:bg-indigo-500/30 pb-24">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="inline-flex items-center p-2 bg-zinc-900/50 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md">
            <div className="bg-indigo-500/20 p-3 rounded-xl mr-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div className="pr-6 text-left">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Salih Cipher</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Encryption Panel */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white tracking-[0.2em] uppercase ml-2">Encryption</h2>
            <div className="bg-zinc-900/80 border border-white/10 shadow-2xl rounded-[2.5rem] p-8 backdrop-blur-xl flex flex-col gap-6 min-h-[600px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">Plaintext Message</label>
                  <button onClick={generateSampleText} disabled={isLoadingText} className="text-[10px] font-black text-indigo-300 hover:text-indigo-200 transition-colors uppercase tracking-widest px-3 py-1.5 bg-indigo-500/20 rounded-xl border border-indigo-500/10 cursor-pointer disabled:opacity-50">
                    {isLoadingText ? "..." : "Generate Sample"}
                  </button>
                </div>
                <textarea value={plaintext} onChange={(e) => setPlaintext(e.target.value)} placeholder="Secret message..." className="w-full h-32 bg-black/60 border border-white/5 rounded-2xl px-4 py-4 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono text-sm resize-none shadow-inner leading-relaxed" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Key (Hex)</label>
                  <div className="relative">
                    <input type="text" value={keyInput} onChange={(e) => setKeyInput(e.target.value.toLowerCase())} placeholder="32 hex chars" className="w-full bg-black/60 border border-white/5 rounded-xl pl-4 pr-16 py-3 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-mono text-xs truncate" />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                      <ActionButton onClick={() => copyToClipboard(keyInput)} title="Copy"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></ActionButton>
                      <ActionButton onClick={generateKey} title="New"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></ActionButton>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Nonce (Hex)</label>
                  <div className="relative">
                    <input type="text" value={nonceInput} onChange={(e) => setNonceInput(e.target.value.toLowerCase())} placeholder="32 hex chars" className="w-full bg-black/60 border border-white/5 rounded-xl pl-4 pr-16 py-3 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-mono text-xs truncate" />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                      <ActionButton onClick={() => copyToClipboard(nonceInput)} title="Copy"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></ActionButton>
                      <ActionButton onClick={generateNonce} title="New"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></ActionButton>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleEncrypt} className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-xl shadow-indigo-500/20 rounded-2xl py-4 font-black transition-all cursor-pointer active:scale-[0.98] uppercase mt-4">Encrypt Pipeline</button>

              <div className="space-y-2 flex-grow flex flex-col mt-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ciphertext Result</label>
                  {ciphertext && <button onClick={() => copyToClipboard(ciphertext)} className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer font-black uppercase">Copy</button>}
                </div>
                <div className={`w-full flex-grow min-h-[120px] border rounded-2xl p-4 text-xs font-mono overflow-y-auto break-all transition-all ${ciphertext ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100' : 'bg-black/60 border-white/5 text-neutral-600 flex items-center justify-center'}`}>{ciphertext || "Output area..."}</div>
              </div>
            </div>
          </div>

          {/* Decryption Panel */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white tracking-[0.2em] uppercase ml-2">Decryption</h2>
            <div className="bg-zinc-900/80 border border-white/10 shadow-2xl rounded-[2.5rem] p-8 backdrop-blur-xl flex flex-col gap-6 min-h-[600px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Key (Hex)</label>
                  <div className="relative">
                    <input type="text" value={decryptKey} onChange={(e) => setDecryptKey(e.target.value.toLowerCase())} placeholder="32 hex chars" className="w-full bg-black/60 border border-white/5 rounded-xl pl-4 pr-12 py-3 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40 font-mono text-xs truncate" />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2"><ActionButton onClick={() => copyToClipboard(decryptKey)} title="Copy"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></ActionButton></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Nonce (Hex)</label>
                  <div className="relative">
                    <input type="text" value={decryptNonce} onChange={(e) => setDecryptNonce(e.target.value.toLowerCase())} placeholder="32 hex chars" className="w-full bg-black/60 border border-white/5 rounded-xl pl-4 pr-12 py-3 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40 font-mono text-xs truncate" />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2"><ActionButton onClick={() => copyToClipboard(decryptNonce)} title="Copy"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></ActionButton></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Ciphertext</label>
                <textarea value={decryptCipher} onChange={(e) => setDecryptCipher(e.target.value.toLowerCase())} placeholder="Paste encrypted..." className="w-full h-32 bg-black/60 border border-white/5 rounded-2xl px-4 py-4 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-all font-mono text-sm resize-none shadow-inner leading-relaxed" />
              </div>

              <button onClick={handleDecrypt} className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-xl shadow-purple-500/20 rounded-2xl py-4 font-black transition-all cursor-pointer active:scale-[0.98] uppercase mt-4">Decrypt Pipeline</button>

              <div className="space-y-2 flex-grow flex flex-col mt-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Plaintext Result</label>
                  {decrypted && <button onClick={() => copyToClipboard(decrypted)} className="text-xs text-purple-300 hover:text-purple-200 transition-colors cursor-pointer font-black uppercase">Copy</button>}
                </div>
                <div className={`w-full flex-grow min-h-[120px] border rounded-2xl p-4 text-sm font-sans overflow-y-auto break-words transition-all ${decrypted ? 'bg-purple-500/10 border-purple-500/30 text-purple-100' : 'bg-black/60 border-white/5 text-neutral-600 flex items-center justify-center'}`}>{decrypted || "Output area..."}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Visualizer */}
        {traceSteps.length > 0 && (
          <div className="mt-24 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-indigo-500/20 rounded-3xl border border-indigo-500/10 mb-4 shadow-xl shadow-indigo-500/5">
                <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1">Execution Visualizer ({traceType})</h2>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-[0.4em]">Visualizing all blocks in sequence</p>
            </div>

            <div className="space-y-16">
              {traceSteps.map((step, idx) => (
                <div key={idx} className="space-y-8 p-10 bg-neutral-900/60 border border-white/10 rounded-[3.5rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500/20 group-hover:bg-indigo-500/40 transition-all" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Step 0{idx + 1}</span>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">{step.label}</h3>
                      <p className="text-sm text-neutral-400 font-medium max-w-2xl leading-relaxed">{step.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {step.blocks?.map((block, bIdx) => (
                      <HexGrid key={bIdx} data={block} label={`Block ${bIdx + 1}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
