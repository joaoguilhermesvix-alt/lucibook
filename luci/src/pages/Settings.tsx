import { useState, useEffect } from "react";
import { Download, LogOut, Info, X } from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showiOSInstructions, setShowiOSInstructions] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstallable && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else {
      const isIos = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()) && !(window as any).MSStream;
      if (isIos) {
        setShowiOSInstructions(true);
      } else {
        alert("Para instalar, procure pela opção 'Adicionar à tela inicial' no menu do seu navegador.");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex justify-between items-center bg-white/70 backdrop-blur-md p-6 rounded-[32px] border border-gray-100/50 shadow-sm mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-main mb-1">
            Configurações
          </h1>
          <p className="text-sm text-sub">Personalize as opções do seu aplicativo Luci Book.</p>
        </div>
      </motion.div>

      <div className="w-full bg-white/70 backdrop-blur-md border border-gray-100/50 rounded-[32px] p-6 shadow-sm flex flex-col gap-4">
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between p-4 bg-pink-50/50 hover:bg-pink-50 rounded-2xl transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center p-2">
              <img
                src="https://res.cloudinary.com/dsctpzqvy/image/upload/v1776300844/Design_sem_nome_onbzb5.png"
                alt="Luci Book Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-semibold text-main text-[15px]">Instalar App</h3>
              <p className="text-[13px] text-sub">Baixar app Luci Book no dispositivo</p>
            </div>
          </div>
          <Download className="w-5 h-5 text-pink-500" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 rounded-2xl transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-red-600 text-[15px]">Sair da Conta</h3>
              <p className="text-[13px] text-red-500/70">Desconectar da sua conta atual</p>
            </div>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showiOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl relative"
            >
              <button
                onClick={() => setShowiOSInstructions(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Como instalar no iOS</h3>
              </div>
              
              <ol className="space-y-4 text-gray-600 ml-2 list-decimal list-inside">
                <li>Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari (o quadrado com uma seta para cima).</li>
                <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
              </ol>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
