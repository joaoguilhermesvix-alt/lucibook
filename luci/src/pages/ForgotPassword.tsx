import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Verifique seu e-mail para redefinir a senha.");
    } catch (err: any) {
      setError(err.message || "Erro ao enviar e-mail de recuperação.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-8 sm:p-10"
      >
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-gray-500 hover:text-pink-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>

        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Recuperar Senha
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50/50 backdrop-blur-md border border-red-100 text-red-600 rounded-2xl text-sm text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50/50 backdrop-blur-md border border-green-100 text-green-600 rounded-2xl text-sm text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
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

          <button
            type="submit"
            disabled={loading}
            className="btn-action w-full flex justify-center items-center mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Enviar Link"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
