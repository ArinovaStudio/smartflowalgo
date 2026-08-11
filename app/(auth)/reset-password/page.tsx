"use client";

import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import React, { useState, Suspense } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token || !email) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to reset password.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <section className="max-w-md mx-auto px-4 py-16 md:py-24 text-left" id="reset-password-view">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-md space-y-6">
          <div className="text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Invalid Reset Link</h2>
            <p className="text-xs text-slate-500">This password reset link is invalid or has expired.</p>
            <Link href="/login" className="inline-block mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to Login
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto px-4 py-16 md:py-24 text-left" id="reset-password-view">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-md space-y-6">
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mx-auto mb-3">
            <KeyRound className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Set New Password</h2>
          <p className="text-xs text-slate-500">
            Create a strong new password for your SMARTFLOWALGO account
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Password Reset!</h3>
            <p className="text-[11px] text-slate-500 leading-normal max-w-xs mx-auto">
              Your password has been updated. Redirecting you to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </button>

            <div className="text-center pt-1">
              <Link href="/login" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <section className="max-w-md mx-auto px-4 py-16 md:py-24">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </section>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
