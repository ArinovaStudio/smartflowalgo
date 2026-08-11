"use client";

import { getToken } from "@/lib/plan-token";
import { CheckCircle, Send, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signIn } from "next-auth/react";

function Rigester() {
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    experience: "Beginner",
    interest: "Gold",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [registerSubmitted, setRegisterSubmitted] = useState(false);

  const router = useRouter();

  function goToCheckout() {
    const tok = getToken("FREE");
    router.push(`/checkout?plan=${tok}`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Auto sign in user after successful registration
      const signInRes = await signIn("credentials", {
        email: registerForm.email,
        password: registerForm.password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Registration succeeded, but direct login failed (prompt manual login)
        router.push("/login");
      } else {
        setRegisterSubmitted(true);
        setTimeout(() => {
          router.push("/simulator");
          router.refresh();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg("");
    try {
      await signIn("google", { callbackUrl: "/simulator" });
    } catch (err: any) {
      setErrorMsg("Google registration failed");
      setGoogleLoading(false);
    }
  };

  return (
    <section
      className="max-w-md mx-auto px-4 py-12 md:py-20 text-left"
      id="register-view"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-md space-y-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            Create your SMARTFLOWALGO account
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Build a rule-based methodology across Gold, Bitcoin, and Forex
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {registerSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Account Created Successfully
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal max-w-xs mx-auto">
              Welcome to Smartflow Trading education circles! Redirecting to your trading dashboard...
            </p>
            <button
              onClick={() => router.push("/simulator")}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
            >
              Proceed to Simulator Sandbox
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Sign-up Button */}
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
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              Sign up with Google
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
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="John Doe"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="john@example.com"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Trading Experience
                  </label>
                  <select
                    value={registerForm.experience}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        experience: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="Beginner">Beginner (0-1 yrs)</option>
                    <option value="Intermediate">Intermediate (1-3 yrs)</option>
                    <option value="Advanced">Advanced (3+ yrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Primary Interest
                  </label>
                  <select
                    value={registerForm.interest}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        interest: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="Gold">Gold Trading</option>
                    <option value="Crypto">Bitcoin Volatility</option>
                    <option value="Forex">Forex Session Flow</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Account
              </button>

              {/* Want free access block */}
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-[11px] leading-relaxed">
                <Send className="h-4 w-4 text-blue-500 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">
                    Want free access first?
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    Avoid subscription checks altogether:{" "}
                    <button
                      type="button"
                      onClick={goToCheckout}
                      className="text-blue-500 font-bold hover:underline"
                    >
                      Join the Telegram community
                    </button>{" "}
                    for free setup updates!
                  </p>
                </div>
              </div>
            </form>

            <div className="text-center pt-2 text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Rigester;
