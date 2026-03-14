"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    loadRomFile: (file: File) => void;
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [romLoaded, setRomLoaded] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const keysPressed = useRef<Set<string>>(new Set());

  const loadEmulator = useCallback(async () => {
    const script = document.createElement("script");
    script.src = "/emulator/assets/index-DjuXTGPv.js";
    script.type = "module";
    script.onload = () => console.log("Emulator loaded");
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/emulator/assets/index-DjuXTGPv.css";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    loadEmulator();
  }, [loadEmulator]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.isTrusted) return;
      if (keysPressed.current.has(e.key)) return;
      keysPressed.current.add(e.key);
      
      const keyMap: Record<string, string> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        z: "a", Z: "a", x: "b", X: "b", Enter: "start", " ": "select",
      };
      
      const gbKey = keyMap[e.key];
      if (gbKey) {
        setPressedKeys(prev => new Set([...prev, gbKey]));
        window.dispatchEvent(new CustomEvent("gbkey", { detail: { key: gbKey, pressed: true } }));
      }
      if (e.code === "Space") {
        window.dispatchEvent(new KeyboardEvent(e.type, { code: "ShiftLeft", key: e.key, bubbles: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.isTrusted) return;
      keysPressed.current.delete(e.key);
      
      const keyMap: Record<string, string> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        z: "a", Z: "a", x: "b", X: "b", Enter: "start", " ": "select",
      };
      
      const gbKey = keyMap[e.key];
      if (gbKey) {
        setPressedKeys(prev => { const n = new Set(prev); n.delete(gbKey); return n; });
        window.dispatchEvent(new CustomEvent("gbkey", { detail: { key: gbKey, pressed: false } }));
      }
      if (e.code === "Space") {
        window.dispatchEvent(new KeyboardEvent(e.type, { code: "ShiftLeft", key: e.key, bubbles: true }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleRomSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && window.loadRomFile) {
      window.loadRomFile(file);
      setRomLoaded(true);
    }
  };

  const handleVirtualKey = useCallback((key: string, pressed: boolean) => {
    const keyMap: Record<string, string> = {
      up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
      a: "KeyZ", b: "KeyX", start: "Enter", select: "Space",
    };
    const code = keyMap[key];
    if (code) {
      window.dispatchEvent(new KeyboardEvent(pressed ? "keydown" : "keyup", { code, bubbles: true }));
    }
    window.dispatchEvent(new CustomEvent("gbkey", { detail: { key, pressed } }));
    setPressedKeys(prev => {
      const n = new Set(prev);
      if (pressed) n.add(key); else n.delete(key);
      return n;
    });
  }, []);

  const ts = (e: React.TouchEvent, key: string, pressed: boolean) => { e.preventDefault(); handleVirtualKey(key, pressed); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 select-none">
      <div className="relative">
        <div className="bg-gradient-to-br from-neutral-200 via-neutral-300 to-neutral-400 rounded-t-3xl rounded-b-lg p-4 sm:p-6 shadow-2xl border-b-8 border-r-8 border-neutral-400">
          
          {/* Top Bezel */}
          <div className="bg-gradient-to-b from-neutral-300 to-neutral-400 rounded-t-2xl -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 p-3 sm:p-4 mb-4 border-b border-neutral-400">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-12 h-1 bg-neutral-500 rounded-full" />
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-2 bg-neutral-500" />
                  <div className="w-0.5 h-2 bg-neutral-500" />
                  <div className="w-0.5 h-2 bg-neutral-500" />
                </div>
              </div>
              <div className="flex-1" />
              <div className="w-8 h-1 bg-neutral-500 rounded-full" />
            </div>
            <div className="flex justify-center">
              <div className="bg-neutral-800 text-neutral-300 px-3 py-0.5 rounded text-xs font-bold tracking-widest">Nintendo</div>
            </div>
          </div>

          {/* Screen Section */}
          <div className="bg-neutral-700 rounded-lg p-4 sm:p-6 border-4 border-neutral-600 shadow-inner mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${romLoaded ? 'bg-red-500 shadow-lg shadow-red-500/60' : 'bg-red-900'}`} />
                <span className="text-red-400 text-xs font-bold tracking-wider">BATTERY</span>
              </div>
              <div className="text-purple-300 text-xs font-bold tracking-widest text-center flex-1">DOT MATRIX WITH STEREO SOUND</div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 rounded p-2 shadow-inner">
                <canvas ref={canvasRef} id="screen" width={160} height={144} className="block mx-auto"
                  style={{ imageRendering: "pixelated", width: "100%", maxWidth: "320px", height: "auto", aspectRatio: "10/9" }} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded" />
            </div>
          </div>

          {/* Branding */}
          <div className="flex items-center gap-1 mb-6 ml-2">
            <span className="text-purple-700 font-extrabold text-lg italic">Nintendo</span>
            <span className="text-purple-800 font-bold text-sm">GAME BOY</span>
            <span className="text-purple-600 text-xs">™</span>
          </div>

          {/* Controls */}
          <div className="px-2">
            <div className="flex justify-between items-end mb-8">
              {/* D-Pad */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32">
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-400 to-neutral-600 rounded-full shadow-lg" />
                <div className="absolute inset-2 flex flex-col items-center justify-center">
                  <button className={`w-8 h-8 sm:w-9 sm:h-9 bg-neutral-800 transition-all active:scale-95 flex items-center justify-center ${pressedKeys.has('up') ? 'brightness-75 shadow-inner' : 'shadow-md'}`}
                    style={{ clipPath: 'polygon(20% 100%, 50% 0%, 80% 100%)' }}
                    onMouseDown={() => handleVirtualKey("up", true)} onMouseUp={() => handleVirtualKey("up", false)} onMouseLeave={() => handleVirtualKey("up", false)}
                    onTouchStart={(e) => ts(e, "up", true)} onTouchEnd={(e) => ts(e, "up", false)} aria-label="Up">
                    <div className="w-1 h-2 bg-neutral-600 mt-2" />
                  </button>
                  <div className="flex">
                    <button className={`w-8 h-8 sm:w-9 sm:h-9 bg-neutral-800 transition-all active:scale-95 flex items-center justify-center ${pressedKeys.has('left') ? 'brightness-75 shadow-inner' : 'shadow-md'}`}
                      style={{ clipPath: 'polygon(100% 20%, 0% 50%, 100% 80%)' }}
                      onMouseDown={() => handleVirtualKey("left", true)} onMouseUp={() => handleVirtualKey("left", false)} onMouseLeave={() => handleVirtualKey("left", false)}
                      onTouchStart={(e) => ts(e, "left", true)} onTouchEnd={(e) => ts(e, "left", false)} aria-label="Left">
                      <div className="w-2 h-1 bg-neutral-600 ml-2" />
                    </button>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-neutral-800 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-neutral-900/50" />
                    </div>
                    <button className={`w-8 h-8 sm:w-9 sm:h-9 bg-neutral-800 transition-all active:scale-95 flex items-center justify-center ${pressedKeys.has('right') ? 'brightness-75 shadow-inner' : 'shadow-md'}`}
                      style={{ clipPath: 'polygon(0% 20%, 100% 50%, 0% 80%)' }}
                      onMouseDown={() => handleVirtualKey("right", true)} onMouseUp={() => handleVirtualKey("right", false)} onMouseLeave={() => handleVirtualKey("right", false)}
                      onTouchStart={(e) => ts(e, "right", true)} onTouchEnd={(e) => ts(e, "right", false)} aria-label="Right">
                      <div className="w-2 h-1 bg-neutral-600 mr-2" />
                    </button>
                  </div>
                  <button className={`w-8 h-8 sm:w-9 sm:h-9 bg-neutral-800 transition-all active:scale-95 flex items-center justify-center ${pressedKeys.has('down') ? 'brightness-75 shadow-inner' : 'shadow-md'}`}
                    style={{ clipPath: 'polygon(20% 0%, 50% 100%, 80% 0%)' }}
                    onMouseDown={() => handleVirtualKey("down", true)} onMouseUp={() => handleVirtualKey("down", false)} onMouseLeave={() => handleVirtualKey("down", false)}
                    onTouchStart={(e) => ts(e, "down", true)} onTouchEnd={(e) => ts(e, "down", false)} aria-label="Down">
                    <div className="w-1 h-2 bg-neutral-600 mb-2" />
                  </button>
                </div>
              </div>

              {/* A/B Buttons */}
              <div className="flex items-end gap-4 sm:gap-6 -rotate-12">
                <div className="flex flex-col items-center gap-1">
                  <button className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all active:scale-95 flex items-center justify-center ${pressedKeys.has('b') ? 'bg-red-800 shadow-inner' : 'bg-gradient-to-br from-red-500 to-red-700 shadow-lg'}`}
                    onMouseDown={() => handleVirtualKey("b", true)} onMouseUp={() => handleVirtualKey("b", false)} onMouseLeave={() => handleVirtualKey("b", false)}
                    onTouchStart={(e) => ts(e, "b", true)} onTouchEnd={(e) => ts(e, "b", false)} aria-label="B Button">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-red-400/30 to-transparent" />
                  </button>
                  <span className="text-purple-800 font-bold text-sm tracking-wider">B</span>
                </div>
                <div className="flex flex-col items-center gap-1 -mt-4">
                  <button className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all active:scale-95 flex items-center justify-center ${pressedKeys.has('a') ? 'bg-red-800 shadow-inner' : 'bg-gradient-to-br from-red-500 to-red-700 shadow-lg'}`}
                    onMouseDown={() => handleVirtualKey("a", true)} onMouseUp={() => handleVirtualKey("a", false)} onMouseLeave={() => handleVirtualKey("a", false)}
                    onTouchStart={(e) => ts(e, "a", true)} onTouchEnd={(e) => ts(e, "a", false)} aria-label="A Button">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-red-400/30 to-transparent" />
                  </button>
                  <span className="text-purple-800 font-bold text-sm tracking-wider">A</span>
                </div>
              </div>
            </div>

            {/* Start/Select */}
            <div className="flex justify-center gap-6 sm:gap-8">
              <div className="flex flex-col items-center gap-2">
                <button className={`w-12 h-4 sm:w-14 sm:h-5 rounded-full transition-all active:scale-95 ${pressedKeys.has('select') ? 'bg-neutral-700 shadow-inner' : 'bg-gradient-to-b from-neutral-500 to-neutral-600 shadow-md'}`}
                  style={{ transform: 'rotate(-15deg)' }}
                  onMouseDown={() => handleVirtualKey("select", true)} onMouseUp={() => handleVirtualKey("select", false)} onMouseLeave={() => handleVirtualKey("select", false)}
                  onTouchStart={(e) => ts(e, "select", true)} onTouchEnd={(e) => ts(e, "select", false)} aria-label="Select" />
                <span className="text-purple-800 font-bold text-xs tracking-widest" style={{ transform: 'rotate(-15deg)' }}>SELECT</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button className={`w-12 h-4 sm:w-14 sm:h-5 rounded-full transition-all active:scale-95 ${pressedKeys.has('start') ? 'bg-neutral-700 shadow-inner' : 'bg-gradient-to-b from-neutral-500 to-neutral-600 shadow-md'}`}
                  style={{ transform: 'rotate(-15deg)' }}
                  onMouseDown={() => handleVirtualKey("start", true)} onMouseUp={() => handleVirtualKey("start", false)} onMouseLeave={() => handleVirtualKey("start", false)}
                  onTouchStart={(e) => ts(e, "start", true)} onTouchEnd={(e) => ts(e, "start", false)} aria-label="Start" />
                <span className="text-purple-800 font-bold text-xs tracking-widest" style={{ transform: 'rotate(-15deg)' }}>START</span>
              </div>
            </div>

            {/* Speaker Grill */}
            <div className="flex justify-end mt-6 mb-4">
              <div className="grid grid-cols-3 gap-1 rotate-12">
                {[...Array(18)].map((_, i) => (
                  <div key={i} className="w-1 h-3 bg-neutral-500 rounded-full" />
                ))}
              </div>
            </div>

            {/* Load ROM Button */}
            <div className="mt-4 flex justify-center">
              <label className="cursor-pointer bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all text-sm">
                <span>{romLoaded ? "Load Different ROM" : "Load ROM"}</span>
                <input type="file" accept=".gb,.gbc" onChange={handleRomSelect} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-slate-400 text-xs">
        <p>Keyboard: Arrows = D-Pad | Z = B | X = A | Enter = Start | Space = Select</p>
        <p className="mt-1">Touch controls enabled for mobile devices</p>
      </div>
    </div>
  );
}
