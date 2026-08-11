"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Loader2,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export interface Payment {
  id: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  checkoutId: string | null;
  checkoutReference: string;
  merchantCode: string;
  createdAt: string;
  updatedAt: string;
}

interface VerifyResponse {
  sumupStatus: string;
  matched: boolean;
  payment: Payment;
}

interface PaymentsModalProps {
  leadId: string;
  leadName: string;
  onClose: () => void;
}

export default function PaymentsModal({ leadId, leadName, onClose }: PaymentsModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<
    Record<string, { sumupStatus: string; matched: boolean; error?: string }>
  >({});

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/save-data?id=${leadId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load payments"); return; }
      setPayments([data.data.payment]);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function verifyWithSumup(paymentId: string) {
    setVerifyingId(paymentId);
    setVerifyResults((prev) => { const next = { ...prev }; delete next[paymentId]; return next; });
    try {
      const res = await fetch(`/api/payments/verify?checkoutId=${paymentId}`);
      const data = await res.json();
      if (!res.ok) {
        setVerifyResults((prev) => ({ ...prev, [paymentId]: { sumupStatus: "", matched: false, error: data.error ?? "Verification failed" } }));
        return;
      }
      const result = data.checkout as VerifyResponse;
      setVerifyResults((prev) => ({ ...prev, [paymentId]: { sumupStatus: result.sumupStatus, matched: result.matched } }));
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? result.payment : p)));
    } catch {
      setVerifyResults((prev) => ({ ...prev, [paymentId]: { sumupStatus: "", matched: false, error: "Network error" } }));
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-slate-950/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-2xl shadow-black/20 dark:shadow-black/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payments</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{leadName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPayments}
              disabled={loading}
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[calc(85vh-64px)] overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500 dark:text-sky-400" />
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && payments.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-400 dark:text-slate-500">
              No payments found for this user.
            </div>
          )}

          {!loading && !error && payments.length > 0 && (
            <div className="space-y-3">
              {payments.map((payment) => {
                const vr = verifyResults[payment.id];
                return (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-slate-900 dark:text-white">
                            {formatAmount(payment.amount)} {payment.currency}
                          </span>
                          <StatusBadge status={payment.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Ref: {payment.checkoutReference}</p>
                        {payment.checkoutId && (
                          <p className="text-xs text-slate-500">Checkout ID: {payment.checkoutId}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(payment.createdAt).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <button
                        onClick={() => verifyWithSumup(payment.checkoutId as string)}
                        disabled={verifyingId === payment.id || !payment.checkoutId}
                        title={!payment.checkoutId ? "No SumUp checkout linked" : "Verify with SumUp"}
                        className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verifyingId === payment.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ShieldCheck className="h-3.5 w-3.5" />}
                        Verify with SumUp
                      </button>
                    </div>

                    {vr && (
                      <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                        vr.error
                          ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300"
                          : vr.matched
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      }`}>
                        {vr.error ? (
                          <><AlertCircle className="h-3.5 w-3.5 shrink-0" />{vr.error}</>
                        ) : vr.matched ? (
                          <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" />SumUp status is {vr.sumupStatus} — matches our record.</>
                        ) : (
                          <><RefreshCw className="h-3.5 w-3.5 shrink-0" />SumUp reported {vr.sumupStatus}. Record updated to match.</>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatAmount(amount: string) {
  const n = Number(amount);
  return Number.isFinite(n) ? n.toFixed(2) : amount;
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    PAID: { label: "Paid", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30", icon: CheckCircle2 },
    PENDING: { label: "Pending", className: "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-amber-500/30", icon: Clock },
    FAILED: { label: "Failed", className: "bg-red-500/10 text-red-600 dark:text-red-300 ring-red-500/30", icon: XCircle },
    EXPIRED: { label: "Expired", className: "bg-slate-100 dark:bg-slate-500/10 text-slate-500 dark:text-slate-300 ring-slate-300 dark:ring-slate-500/30", icon: AlertCircle },
  };

  const { label, className, icon: Icon } = config[status] ?? config.PENDING;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}