import React, { useState } from "react";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";
import type { UserSession } from "../types";
import { login } from "../api/authApi";

interface LoginPageProps {
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("meryemelbiach@gmail.com");
  const [password, setPassword] = useState("1234567890");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { token } = await login(email.trim(), password);

      // Store the JWT for authenticated API requests
      if (rememberMe) {
        localStorage.setItem("aml_token", token);
      } else {
        sessionStorage.setItem("aml_token", token);
      }

      const user: UserSession = {
        email: email.trim(),
        name: email.trim().split("@")[0],
        role: "ANALYST",
        institution: "SENTINEL AML",
      };

      onLoginSuccess(user);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'authentification."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="login-page-container"
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center px-4 sm:px-6 relative overflow-hidden"
    >
      {/* Background subtle mesh / lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500/30 text-white shadow-xl shadow-blue-950/60 mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            SENTINEL <span className="text-blue-400 font-mono text-sm px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/60">AML</span>
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mt-1">
            Compliance Platform
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Transaction Monitoring & Anti-Money Laundering Operations
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#0b1120] border border-slate-800/90 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">
              Compliance Analyst Portal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sign in to monitor transaction risk indicators and alerts.
            </p>
          </div>

          {/* Visual Error Banner */}
          {errorMessage && (
            <div
              id="login-error-banner"
              className="mb-5 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Analyst Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@institution.com"
                  className="w-full bg-[#070b14] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#070b14] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-[#070b14] text-blue-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Remember session</span>
              </label>
              <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                Security Policy
              </span>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating Analyst...</span>
              ) : (
                <>
                  <span>Sign In to AML Monitor</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                <span>Prototype Demonstration Credentials</span>
              </div>
              <div className="font-mono text-slate-300">
                Email : <span className="text-blue-400">compliance@sentinel-aml.com</span>
              </div>
              <div className="font-mono text-slate-300">
                Password : <span className="text-blue-400">password123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory & Institutional Notice */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Confidential Compliance System • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};