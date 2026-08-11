"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Loader2,
  Megaphone,
  Plus,
  Users,
  X,
} from "lucide-react";

type Promoter = {
  id: string;
  name: string | null;
  tradingViewId: string | null;
  mobile: string | null;
  email: string;
  discount: number | null;
  planType: string | null;
  userType: string;
  createdAt: string;
  updatedAt: string;
  referralCount: number;
};

type PromotersTableProps = {
  initialData: Promoter[];
  initialTotal: number;
  pageSize: number;
};

type FormState = {
  name: string;
  mobile: string;
  email: string;
  tradingViewId: string;
  id?: string;
  discount: number
};

type ReferralPayment = {
  id: string;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    tradingViewId: string;
  } | null;
};

const EMPTY_FORM: FormState = { name: "", mobile: "", email: "", tradingViewId: "", id: "", discount: 0 };

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400",
  PENDING: "bg-amber-500/10 text-amber-400",
  FAILED: "bg-red-500/10 text-red-400",
  CANCELLED: "bg-slate-500/10 text-slate-400",
};

export default function PromotersTable({ initialData, initialTotal, pageSize }: PromotersTableProps) {
  const [data, setData] = useState<Promoter[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [referralsModalOpen, setReferralsModalOpen] = useState(false);
  const [referralsPromoter, setReferralsPromoter] = useState<{ id: string; name: string } | null>(null);
  const [referralsData, setReferralsData] = useState<ReferralPayment[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsError, setReferralsError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function loadPage(nextPage: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/promoters?page=${nextPage}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error("Failed to load promoters");
      const json = await res.json();
      setData(json.data);
      setTotal(json.total);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(id: string) {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
      })
      .catch((err) => console.error("Copy failed", err));
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim() || form.name.trim().length < 2) errors.name = "Enter a valid name";
    if (!form.mobile.trim() || form.mobile.trim().length < 7) errors.mobile = "Enter a valid mobile number";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/promoters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim(),
          tradingViewId: form.tradingViewId.trim() || undefined,
          discount: Number(form.discount) || 0,
          id: form.id
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormError(typeof json.error === "string" ? json.error : "Please check the form and try again.");
        return;
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      if (page === 1) {
        setData((prev) => [json.data, ...prev].slice(0, pageSize));
      }
      setTotal((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewReferrals(promoter: Promoter) {
    setReferralsPromoter({ id: promoter.id, name: promoter.name ?? "Promoter" });
    setReferralsModalOpen(true);
    setReferralsLoading(true);
    setReferralsError(null);
    setReferralsData([]);

    try {
      const res = await fetch(`/api/promoters/${promoter.id}`);
      const json = await res.json();

      if (!res.ok) {
        setReferralsError(typeof json.error === "string" ? json.error : "Failed to load referrals");
        return;
      }
      console.log(json.data.referrals);
      
      setReferralsData(json.data.referrals);
    } catch (err) {
      console.error(err);
      setReferralsError("Something went wrong. Please try again.");
    } finally {
      setReferralsLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {total} {total === 1 ? "promoter" : "promoters"} total
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setFormErrors({});
            setFormError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400"
        >
          <Plus className="h-4 w-4" />
          Add Influencer
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">TradingView</th>
                <th className="px-4 py-3 font-medium">Referrals</th>
                <th className="px-4 py-3 font-medium">Discount %</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.map((promoter) => (
                <tr key={promoter.id} className="text-slate-300 hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-medium text-white">{promoter.name}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleCopy(promoter.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300 transition-colors hover:border-sky-500/50 hover:text-white"
                      title="Click to copy"
                    >
                      {promoter.id}
                      {copiedId === promoter.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-slate-500" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">{promoter.mobile}</td>
                  <td className="px-4 py-3">{promoter.email}</td>
                  <td className="px-4 py-3">{promoter.tradingViewId ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-400">
                      {promoter.referralCount}
                    </span>
                  </td>
                                    <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-sky-400">
                      {promoter.discount ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(promoter.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleViewReferrals(promoter)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-sky-500/50 hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Referrals
                    </button>
                  </td>
                </tr>
              ))}

              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Megaphone className="mx-auto mb-2 h-6 w-6 text-slate-700" />
                    No promoters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => loadPage(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 hover:border-slate-700 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => loadPage(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 hover:border-slate-700 hover:text-white"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add Influencer modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => !submitting && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Add Influencer</h2>
                <button
                  type="button"
                  onClick={() => !submitting && setModalOpen(false)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-900 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Referral code</label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={(e) => updateField("id", e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                    placeholder="TTY10"
                  />
                  {formErrors.id && <p className="mt-1 text-xs text-red-400">{formErrors.id}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Discount Percentage</label>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={(e) => updateField("discount", e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                    placeholder="TTY10"
                  />
                  {formErrors.discount && <p className="mt-1 text-xs text-red-400">{formErrors.discount}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                    placeholder="Jane Doe"
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Mobile</label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => updateField("mobile", e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                    placeholder="+91 98765 43210"
                  />
                  {formErrors.mobile && <p className="mt-1 text-xs text-red-400">{formErrors.mobile}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                    placeholder="jane@example.com"
                  />
                  {formErrors.email && <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    TradingView ID <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.tradingViewId}
                    onChange={(e) => updateField("tradingViewId", e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
                    placeholder="tv_username"
                  />
                </div>

                {formError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "Adding..." : "Add Influencer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Referrals modal */}
      <AnimatePresence>
        {referralsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setReferralsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Referrals</h2>
                  {referralsPromoter && (
                    <p className="mt-0.5 text-xs text-slate-500">{referralsPromoter.name}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setReferralsModalOpen(false)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-900 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {referralsLoading && (
                  <div className="flex items-center justify-center py-12 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}

                {!referralsLoading && referralsError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {referralsError}
                  </div>
                )}

                {!referralsLoading && !referralsError && referralsData.length === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    <Users className="mx-auto mb-2 h-6 w-6 text-slate-700" />
                    <p className="text-sm">No referrals yet.</p>
                  </div>
                )}

                {!referralsLoading && !referralsError && referralsData.length > 0 && (
                  <ul className="space-y-2">
                    {referralsData.map((payment) => (
                      <li
                        key={payment.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {payment.user?.name ?? "Unknown user"}
                            </p>
                            {payment.user && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {payment.user.email} · {payment.user.mobile}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_STYLES[payment.status] ?? "bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {payment.currency} {payment.amount} • {payment.user?.tradingViewId}
                          </span>
                          <span>{new Date(payment.createdAt).toLocaleString()}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}