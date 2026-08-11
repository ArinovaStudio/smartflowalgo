"use client";

import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';

type View = "login" | "forgot" | "forgot-sent";

function Login() {
  const [view, setView] = useState<View>("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loginSubmitted, setLoginSubmitted] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        email: loginForm.email,
        password: loginForm.password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMsg(res.error || "Invalid email or password");
        setLoading(false);
      } else {
        setLoginSubmitted(true);
        // Fetch the fresh session to read userType
        const session = await getSession();
        const userType = (session?.user as any)?.userType;
        const destination = userType === "ADMIN" ? "/admin" : "/user";
        setTimeout(() => {
          router.push(destination);
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg("");
    try {
      // Google OAuth will redirect; middleware handles role-based routing after callback
      await signIn("google", { callbackUrl: "/api/auth/redirect" });
    } catch {
      setErrorMsg("Google sign in failed");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || "Something went wrong. Please try again.");
      } else {
        setView("forgot-sent");
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchView = (v: View) => {
    setErrorMsg("");
    setView(v);
  };

  return (
    <section
      className="max-w-md mx-auto px-4 py-16 md:py-24 text-left"
      id="login-view"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-md space-y-6">

        {/* ── HEADER ── */}
        <div className="text-center space-y-1.5">
          {view === "login" && (
            <>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white whitespace-nowrap">
                Welcome back to{" "}
                <span className="text-blue-600 dark:text-blue-400">SMARTFLOWALGO</span>
              </h2>
              <p className="text-xs text-slate-500">
                Sign in to resume trading worksheets and simulator parameters
              </p>
            </>
          )}
          {view === "forgot" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mx-auto mb-2">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Reset Password
              </h2>
              <p className="text-xs text-slate-500">
                Enter your email and we'll send you a reset link
              </p>
            </>
          )}
          {view === "forgot-sent" && (
            <>
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Check your inbox
              </h2>
              <p className="text-xs text-slate-500">
                A reset link has been sent to <span className="font-bold text-slate-700 dark:text-slate-300">{forgotEmail}</span>. It expires in 1 hour.
              </p>
            </>
          )}
        </div>

        {/* ── ERROR BANNER ── */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── SUCCESS STATE ── */}
        {loginSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Successfully Authenticated
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal max-w-xs mx-auto">
              Session initialized successfully. Redirecting you to your trading dashboard...
            </p>
            <button
              onClick={() => router.push("/user")}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>

        ) : view === "login" ? (
          <div className="space-y-4">
            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-400 absolute">
                Or
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-[11px] cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Create Account
              </Link>
            </div>
          </div>

        ) : view === "forgot" ? (
          <div className="space-y-4">
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchView("login")}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </div>

        ) : (
          // forgot-sent view
          <div className="space-y-4 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => switchView("forgot")}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                try again
              </button>
              .
            </p>
            <button
              type="button"
              onClick={() => switchView("login")}
              className="w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Login;