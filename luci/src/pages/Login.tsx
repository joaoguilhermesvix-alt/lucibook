import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login. Verifique suas credenciais.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Ensure user document exists
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: user.displayName || "Usuário",
          email: user.email,
          role: "client", // default non-admin role
          createdAt: new Date().toISOString()
        });
      }
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao entrar com Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-8 sm:p-10"
      >
        <div className="flex justify-center mb-8">
          <img
            src="https://res.cloudinary.com/dsctpzqvy/image/upload/v1776300844/Design_sem_nome_onbzb5.png"
            alt="Luci Book Logo"
            className="w-40 h-auto drop-shadow-lg"
          />
        </div>

        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-8">
          Bem-vinda de volta!
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50/50 backdrop-blur-md border border-red-100 text-red-600 rounded-2xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-[var(--glass)] border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-700 shadow-sm"
              placeholder="Seu e-mail"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-[var(--glass)] border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-700 shadow-sm"
              placeholder="Sua senha"
            />
          </div>

          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="btn-action w-full flex justify-center items-center mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar com Email"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-gray-200 w-full"></div>
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">OU</span>
          <div className="h-px bg-gray-200 w-full"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 py-3.5 rounded-2xl hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all font-medium shadow-sm"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continuar com Google
            </>
          )}
        </button>

        <p className="mt-8 text-center text-sm text-gray-500">
          Não tem uma conta?{" "}
          <Link
            to="/register"
            className="text-pink-600 hover:text-pink-700 font-medium transition-colors"
          >
            Cadastre-se
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
