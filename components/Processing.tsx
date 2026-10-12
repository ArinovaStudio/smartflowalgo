"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentProcessingPage({refe}: {refe: string}) {
  const router = useRouter();
  const [message, setMessage] = useState(
    "We're securely verifying your payment."
  );

useEffect(() => {
  if (!refe) return;

  let cancelled = false;

  const verify = async () => {
    try {
      // Get checkoutId from your DB
      const checkReq = await fetch(`/api/payments/db?ref=${refe}`, {
        cache: "no-store",
      });

      if (!checkReq.ok) {
        throw new Error("Unable to fetch checkout.");
      }

      const checkData = await checkReq.json();
      const checkoutId = checkData.checkoutId;

      if (!checkoutId) {
        throw new Error("Checkout ID not found.");
      }

      // Verify payment
      const verifyRes = await fetch(
        `/api/payments/verify?checkoutId=${checkoutId}`,
        {
          cache: "no-store",
        }
      );

      const verifyData = await verifyRes.json();

      console.log(verifyData);
      
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Verification failed");
      }

      if (verifyData.status === "PAID" || verifyData.status === "SUCCESS") {
        setMessage("Payment verified. Finalizing your order...");

        const updateRes = await fetch("/api/payments/db", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkoutId,
            status: verifyData.status,
          }),
        });

        if (!updateRes.ok) {
          throw new Error("Failed to update payment.");
        }

        if (!cancelled) {
          router.replace("/payment/success");
        }
      } else {
        router.push("/payment/failure")
        setMessage(`Payment status: ${verifyData.status}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unable to verify payment. Please refresh or contact support.");
    }
  };

  verify();

  return () => {
    cancelled = true;
  };
}, [refe, router]);
return (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-center">

        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent" />
        </div>

        <h1 className="text-center text-3xl font-bold text-slate-900 dark:text-white">
          Processing Your Payment
        </h1>

        <p className="mt-4 text-center text-slate-600 dark:text-slate-300">
          Please don&apos;t close this page. We&apos;re securely verifying your payment
          with our payment provider.
        </p>

        <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center text-sm text-slate-700 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {message}
        </div>

        <div className="mt-8 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>

          <span>This usually takes only a few seconds.</span>
        </div>
      </div>
    </div>
  </div>
);
}