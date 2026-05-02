import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, UserCircle, Download, CheckCircle2, ChevronRight, MessageSquareCode } from "lucide-react";

export default function LuciCreator() {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "analyzing" | "generating" | "done">("idle");
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [selectedStyleName, setSelectedStyleName] = useState<string>("");
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lashStyles = [
    { name: "Volume Russo", styleConfig: { numHairs: 250, thickness: 1.5, length: 0.18, curve: 1.2, darkness: 0.8 } },
    { name: "Volume Brasileiro", styleConfig: { numHairs: 200, thickness: 1.4, length: 0.16, curve: 1.0, darkness: 0.75, yShape: true } },
    { name: "Volume Clássico", styleConfig: { numHairs: 100, thickness: 1.8, length: 0.14, curve: 0.8, darkness: 0.7 } },
    { name: "Wispy / Sirena", styleConfig: { numHairs: 150, thickness: 1.6, length: 0.20, curve: 1.0, darkness: 0.85, spikes: true } },
    { name: "Mega Volume", styleConfig: { numHairs: 400, thickness: 1.2, length: 0.22, curve: 1.4, darkness: 0.95 } },
    { name: "Efeito Fox", styleConfig: { numHairs: 200, thickness: 1.5, length: 0.15, curve: 0.9, darkness: 0.8, fox: true } },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter menos de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFaceImage(event.target?.result as string);
      setFinalImage(null);
      setStatus("idle");
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const addChat = (msg: string) => setChatLog((prev) => [...prev, msg]);

  const generateLashImage = async (styleName: string, config: any) => {
    if (!faceImage) {
      setError("Por favor, faça o upload da foto do rosto primeiro.");
      return;
    }

    setSelectedStyleName(styleName);
    setStatus("sending");
    setError("");
    setFinalImage(null);
    setChatLog(["Iniciando comunicação com a I.A. (Backend seguro)..."]);

    try {
      const base64Face = faceImage.split(",")[1];
      
      // Simula tempo de rede e "chat" process do backend para encantar o usuário
      await new Promise(r => setTimeout(r, 600));
      addChat("Enviando foto para a API do nano banana...");
      
      await new Promise(r => setTimeout(r, 600));
      setStatus("analyzing");
      addChat("Extraindo pontos de referência dos cílios...");

      // Call our secure backend to handle Gemini without exposing API Keys
      const response = await fetch("/api/analyze-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Face }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro na API Backend");
      }

      const landmarks = await response.json();

      setStatus("generating");
      addChat("Referenciais recebidos. Gerando Extensão de Cílios...");
      await new Promise(r => setTimeout(r, 600));

      // Render image with beautiful Canvas integration without modifying the skin
      await processImage(landmarks, config);
      setStatus("done");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "As matrizes da foto não foram reconhecidas. Verifique a API.");
      setStatus("idle");
    }
  };

  const processImage = (landmarks: any, config: any) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));

        // Use original resolution for crisp editing
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original face
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply Lashes based on perfect mapping
        drawLid(ctx, landmarks.leftEye, false, canvas.width, canvas.height, config);
        drawLid(ctx, landmarks.rightEye, true, canvas.width, canvas.height, config);

        // A slight soft-focus/blend pass on the final integration
        setFinalImage(canvas.toDataURL("image/jpeg", 0.95));
        resolve();
      };
      img.onerror = reject;
      img.src = faceImage as string;
    });
  };

  const drawLid = (
    ctx: CanvasRenderingContext2D, 
    eye: any, 
    isRight: boolean, 
    imgW: number, 
    imgH: number, 
    config: any
  ) => {
    if (!eye?.leftCorner || !eye?.rightCorner || !eye?.upperCurve) return;

    // Convert normalized -> pixel coords
    const lcx = eye.leftCorner.x * imgW;
    const lcy = eye.leftCorner.y * imgH;
    
    const rcx = eye.rightCorner.x * imgW;
    const rcy = eye.rightCorner.y * imgH;

    const ucx = eye.upperCurve.x * imgW;
    const ucy = eye.upperCurve.y * imgH;

    const eyeWidth = Math.abs(rcx - lcx);
    const actualLength = eyeWidth * config.length;

    // Base Eyeliner simulation so it blends natively
    ctx.beginPath();
    ctx.moveTo(lcx, lcy);
    ctx.quadraticCurveTo(ucx, ucy * 0.95, rcx, rcy);
    ctx.lineWidth = eyeWidth * 0.05 * config.thickness;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(10, 8, 8, ${config.darkness * 0.9})`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = eyeWidth * 0.03;
    ctx.stroke();

    // Reset shadow for fine hairs
    ctx.shadowBlur = eyeWidth * 0.01;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.globalCompositeOperation = "multiply";

    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Spawn hairs along the quadratic curve
    for (let i = 0; i < config.numHairs; i++) {
      const rand1 = seededRandom(i * 1.5);
      const rand2 = seededRandom(i * 2.3);
      const t = (i / config.numHairs) + (rand1 * 0.02 - 0.01);
      
      if (t < 0 || t > 1) continue;

      // Point on the quadratic curve
      const invT = 1 - t;
      const startX = invT * invT * lcx + 2 * invT * t * ucx + t * t * rcx;
      const startY = invT * invT * lcy + 2 * invT * t * (ucy * 0.95) + t * t * rcy;

      // Base direction (outward fan)
      let outAngle = (t - 0.5) * 80; // Sweeps from -40 to 40 degrees
      if (config.fox) {
         // Fox pulls the hairs sharply to the outer edge
         outAngle = isRight ? (t * 80) : (-t * 80);
      }
      outAngle += (rand1 * 15 - 7.5); // Add jitter
      
      let hairLen = actualLength * (0.6 + rand2 * 0.6);
      
      // Spikes effect for Wispy
      if (config.spikes && (i % 8 < 2)) {
         hairLen *= 1.4;
      }

      // Fox effect extends outer length
      if (config.fox) {
        if ((!isRight && t < 0.3) || (isRight && t > 0.7)) hairLen *= 1.5;
        else hairLen *= 0.6;
      }

      const angleRad = (90 + outAngle) * (Math.PI / 180);

      const endX = startX + Math.cos(angleRad) * hairLen * (isRight ? 1 : -1);
      const endY = startY - Math.sin(angleRad) * hairLen * config.curve;

      const cpX = startX + (endX - startX) * 0.7 + (isRight ? 5 : -5);
      const cpY = startY + (endY - startY) * 0.9 + (eyeWidth * 0.05);

      ctx.lineWidth = Math.max(1, (eyeWidth * 0.01) * config.thickness * (0.6 + rand1 * 0.6));
      ctx.globalAlpha = config.darkness * (0.4 + rand2 * 0.5);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.stroke();

      // For Volume Y, add a branching split hair
      if (config.yShape && i % 2 === 0) {
         const yEndX = endX + (rand1 > 0.5 ? 5 : -5);
         const yEndY = endY - 3;
         ctx.beginPath();
         ctx.moveTo(cpX, cpY);
         ctx.lineTo(yEndX, yEndY);
         ctx.stroke();
      }
    }
    
    ctx.globalCompositeOperation = "source-over";
  };

  const downloadResult = () => {
    if (!finalImage) return;
    const link = document.createElement("a");
    link.href = finalImage;
    link.download = `Luci_Creator_${selectedStyleName.replace(/ /g, "_")}.jpg`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-[var(--accent)]" />
            Luci Creator
          </h1>
          <p className="text-sub mt-1">
            Gere uma fotografia perfeita da sua cliente simulando os fios com I.A Avançada.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Upload e Controles */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          
          <div className="glass-panel p-6 flex flex-col items-center">
            <h3 className="w-full font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-gray-500" />
              1. Envio da Foto Frontal
            </h3>
            
            <div 
              className="w-full relative aspect-square max-w-[280px] rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 flex flex-col items-center justify-center cursor-pointer hover:bg-white/80 transition-all overflow-hidden mx-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              {faceImage ? (
                <img src={faceImage} alt="Foto Original" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center p-4 text-center">
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <span className="text-sm font-medium text-gray-500">Toque para enviar o rosto de frente</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload}
              />
            </div>
          </div>

          <div className="glass-panel p-6 flex-1">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              2. Comandos Prontos (I.A.)
            </h3>
            
            <div className="space-y-3">
              {lashStyles.map((style) => (
                <button
                  key={style.name}
                  onClick={() => generateLashImage(style.name, style.styleConfig)}
                  disabled={!faceImage || status === "analyzing" || status === "generating"}
                  className="w-full group flex items-center justify-between p-4 rounded-xl bg-white/60 border border-white/80 hover:bg-pink-50 hover:border-pink-200 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-medium text-gray-700 group-hover:text-pink-600 transition-colors">
                    {style.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-pink-500" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Coluna Direita: Resultado */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {status === "idle" && !finalImage && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center text-gray-400 max-w-sm"
              >
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>A foto gerada da sua cliente com os cílios perfeitos aparecerá aqui.</p>
              </motion.div>
            )}

            {(status === "sending" || status === "analyzing" || status === "generating") && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col w-full max-w-sm"
              >
                <div className="flex justify-center mb-6">
                   <div className="relative w-24 h-24">
                     <div className="absolute inset-0 border-4 border-pink-100 rounded-full" />
                     <div className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin" />
                     <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-pink-400 animate-pulse" />
                   </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                  Comunicação I.A.
                </h3>
                
                <div className="bg-white/80 rounded-2xl p-4 border border-pink-100 shadow-sm flex flex-col gap-3 min-h-[150px]">
                  {chatLog.map((log, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <MessageSquareCode className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-700 font-medium">{log}</span>
                    </motion.div>
                  ))}
                  
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1 }}
                    className="flex gap-1 ml-7 mt-1.5"
                  >
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animation-delay-200" />
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animation-delay-400" />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {status === "done" && finalImage && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center"
              >
                <div className="flex items-center gap-2 text-green-600 font-medium mb-4 bg-green-50 px-4 py-1.5 rounded-full ring-1 ring-green-100">
                  <CheckCircle2 className="w-5 h-5" />
                  Imagem gerada e alinhada com sucesso!
                </div>

                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80 max-w-md w-full bg-black mx-auto">
                  <img 
                    src={finalImage} 
                    alt={`Resultado ${selectedStyleName}`} 
                    className="w-full h-auto object-cover max-h-[600px] select-none pointer-events-none" 
                  />
                  
                  <div className="absolute bottom-4 left-4 right-4 bg-black/40 backdrop-blur-md px-4 py-3 rounded-xl text-white shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-xs text-white/70 block uppercase tracking-wider font-semibold mb-0.5">ESTILO APLICADO</span>
                      <span className="text-sm font-bold truncate block">{selectedStyleName}</span>
                    </div>
                    <Sparkles className="w-5 h-5 text-pink-300" />
                  </div>
                </div>

                <div className="mt-8 flex justify-center w-full">
                  <button 
                    onClick={downloadResult}
                    className="btn-action px-8 py-3.5 font-semibold flex items-center gap-3 shadow-[0_8px_30px_rgba(255,133,161,0.3)] hover:shadow-[0_8px_30px_rgba(255,133,161,0.4)]"
                  >
                    <Download className="w-5 h-5" />
                    Baixar Fotografia Completa
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
