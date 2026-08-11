"use client";

import { useState, useEffect, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Layers,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

export interface PlanData {
  id: string;
  name: string;
  subtitle?: string | null;
  badge?: string | null;
  isHighlight: boolean;
  hasCycles: boolean;
  price?: number | null;
  billingPeriod?: string | null;
  monthlyPrice?: number | null;
  quarterlyPrice?: number | null;
  quarterlyDiscount?: string | null;
  yearlyPrice?: number | null;
  yearlyDiscount?: string | null;
  features: string[];
  buttonText?: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id?: string;
  name: string;
  subtitle: string;
  badge: string;
  isHighlight: boolean;
  hasCycles: boolean;
  price: string;
  billingPeriod: string;
  monthlyPrice: string;
  quarterlyPrice: string;
  quarterlyDiscount: string;
  yearlyPrice: string;
  yearlyDiscount: string;
  features: string[];
  buttonText: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  subtitle: "",
  badge: "",
  isHighlight: false,
  hasCycles: false,
  price: "",
  billingPeriod: "month",
  monthlyPrice: "",
  quarterlyPrice: "",
  quarterlyDiscount: "",
  yearlyPrice: "",
  yearlyDiscount: "",
  features: [""],
  buttonText: "",
  order: 1,
  isActive: true,
};

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30";

export default function PlansManagement() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plans?all=true");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load plans");
      }
      setPlans(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/plans/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to seed plans");
      await fetchPlans();
    } catch (err: any) {
      alert(err.message || "Failed to seed default plans");
    } finally {
      setSeeding(false);
    }
  }

  function openCreateModal() {
    setForm({
      ...EMPTY_FORM,
      order: plans.length + 1,
      features: ["4 Private SFA Indicators", "SFA Premium Scanner", "VIP Telegram Channel Access"],
    });
    setEditingId(null);
    setFormError(null);
    setNewFeatureInput("");
    setModalOpen(true);
  }

  function openEditModal(plan: PlanData) {
    setForm({
      id: plan.id,
      name: plan.name,
      subtitle: plan.subtitle || "",
      badge: plan.badge || "",
      isHighlight: plan.isHighlight,
      hasCycles: plan.hasCycles,
      price: plan.price !== null && plan.price !== undefined ? String(plan.price) : "",
      billingPeriod: plan.billingPeriod || "month",
      monthlyPrice: plan.monthlyPrice !== null && plan.monthlyPrice !== undefined ? String(plan.monthlyPrice) : "",
      quarterlyPrice: plan.quarterlyPrice !== null && plan.quarterlyPrice !== undefined ? String(plan.quarterlyPrice) : "",
      quarterlyDiscount: plan.quarterlyDiscount || "",
      yearlyPrice: plan.yearlyPrice !== null && plan.yearlyPrice !== undefined ? String(plan.yearlyPrice) : "",
      yearlyDiscount: plan.yearlyDiscount || "",
      features: plan.features && plan.features.length > 0 ? [...plan.features] : [""],
      buttonText: plan.buttonText || "",
      order: plan.order,
      isActive: plan.isActive,
    });
    setEditingId(plan.id);
    setFormError(null);
    setNewFeatureInput("");
    setModalOpen(true);
  }

  function addFeature() {
    if (!newFeatureInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      features: [...prev.features.filter((f) => f.trim()), newFeatureInput.trim()],
    }));
    setNewFeatureInput("");
  }

  function removeFeature(index: number) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Plan name is required");
      return;
    }

    setSubmitting(true);
    try {
      const cleanFeatures = form.features.map((f) => f.trim()).filter(Boolean);
      if (newFeatureInput.trim()) cleanFeatures.push(newFeatureInput.trim());

      const payload = {
        name: form.name.trim(),
        subtitle: form.subtitle.trim() || undefined,
        badge: form.badge.trim() || undefined,
        isHighlight: form.isHighlight,
        hasCycles: form.hasCycles,
        price: form.price ? Number(form.price) : undefined,
        billingPeriod: form.billingPeriod.trim() || undefined,
        monthlyPrice: form.monthlyPrice ? Number(form.monthlyPrice) : undefined,
        quarterlyPrice: form.quarterlyPrice ? Number(form.quarterlyPrice) : undefined,
        quarterlyDiscount: form.quarterlyDiscount.trim() || undefined,
        yearlyPrice: form.yearlyPrice ? Number(form.yearlyPrice) : undefined,
        yearlyDiscount: form.yearlyDiscount.trim() || undefined,
        features: cleanFeatures,
        buttonText: form.buttonText.trim() || undefined,
        order: Number(form.order) || 0,
        isActive: form.isActive,
      };

      const url = editingId ? `/api/plans/${editingId}` : "/api/plans";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save plan");
      }

      setModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePlanActive(plan: PlanData) {
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to toggle plan status");
    }
  }

  async function handleDelete() {
    if (!deleteModalId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plans/${deleteModalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete plan");
      setDeleteModalId(null);
      await fetchPlans();
    } catch (err: any) {
      alert(err.message || "Failed to delete plan");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-sky-500" />
            <span>Plan & Subscription Management</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create, edit, and organize dynamic membership plans shown across the site.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPlans}
            disabled={loading}
            title="Refresh plans"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* {plans.length === 0 && (
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Seed Default 3 Plans
            </button>
          )} */}

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      )}

      {/* Plans List Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all shadow-sm ${plan.isHighlight
                  ? "border-sky-500/60 dark:border-sky-500/40 bg-sky-500/5 dark:bg-zinc-950/90 ring-1 ring-sky-500/20"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                } ${!plan.isActive ? "opacity-60 grayscale-[30%]" : ""}`}
            >
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{plan.order}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {plan.name}
                      </h3>
                    </div>
                    {plan.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {plan.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {plan.badge && (
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${plan.isHighlight
                            ? "bg-sky-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                      >
                        {plan.badge}
                      </span>
                    )}

                    <button
                      onClick={() => togglePlanActive(plan)}
                      title={plan.isActive ? "Deactivate plan" : "Activate plan"}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${plan.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                        }`}
                    >
                      {plan.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span>{plan.isActive ? "Active" : "Hidden"}</span>
                    </button>
                  </div>
                </div>

                {/* Price Display */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {plan.hasCycles ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                          ₹{plan.monthlyPrice?.toLocaleString() || "0"}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          / month
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {plan.quarterlyPrice && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            3M: ₹{plan.quarterlyPrice.toLocaleString()} {plan.quarterlyDiscount ? `(${plan.quarterlyDiscount})` : ""}
                          </span>
                        )}
                        {plan.yearlyPrice && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            1Y: ₹{plan.yearlyPrice.toLocaleString()} {plan.yearlyDiscount ? `(${plan.yearlyDiscount})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        ₹{plan.price?.toLocaleString() || "0"}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        / {plan.billingPeriod || "period"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Included Features ({plan.features.length}):
                  </span>
                  <ul className="space-y-1.5  pr-1">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  Type: {plan.hasCycles ? "Multi-Cycle" : "Single Price"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteModalId(plan.id)}
                    className="p-1.5 rounded-lg border border-red-500/25 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    title="Delete plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== CREATE / EDIT MODAL ==================== */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 overflow-y-auto"
            onClick={() => !submitting && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Title */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingId ? "Edit Membership Plan" : "Create New Membership Plan"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure pricing, features, styling, and billing cycles.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Basic Info ── */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    1. Basic Plan Information
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Plan Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Indicator VIP"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Badge Label (Optional)
                      </label>
                      <input
                        type="text"
                        value={form.badge}
                        onChange={(e) => setForm({ ...form, badge: e.target.value })}
                        placeholder="e.g. Core VIP or Gold VIP Research"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subtitle / Short Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      placeholder="e.g. Full algorithmic indicators & market scanners for daily consistency."
                      className={inputCls}
                    />
                  </div>

                  {/* Highlights and Toggles */}
                  <div className="flex flex-wrap items-center gap-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isHighlight}
                        onChange={(e) => setForm({ ...form, isHighlight: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Highlight Card (Gold VIP Styling)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Active (Visible on public site)
                      </span>
                    </label>
                  </div>
                </div>

                {/* ── Pricing Configuration ── */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      2. Pricing Configuration
                    </h4>

                    {/* Mode Toggle */}
                    <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasCycles: false })}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${!form.hasCycles
                            ? "bg-white dark:bg-sky-500 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400"
                          }`}
                      >
                        Single Fixed Price
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hasCycles: true })}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${form.hasCycles
                            ? "bg-white dark:bg-sky-500 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400"
                          }`}
                      >
                        Multi-Cycle (Monthly / 3M / 1Y)
                      </button>
                    </div>
                  </div>

                  {!form.hasCycles ? (
                    /* Single Price Options */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Price (₹) *
                        </label>
                        <input
                          type="number"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          placeholder="e.g. 799 or 6000"
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Billing Period Label
                        </label>
                        <input
                          type="text"
                          value={form.billingPeriod}
                          onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}
                          placeholder="e.g. 3 days access or month"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Multi-Cycle Options */
                    <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Monthly Price (₹) *
                          </label>
                          <input
                            type="number"
                            value={form.monthlyPrice}
                            onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                            placeholder="e.g. 3499"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            3 Months Price (₹)
                          </label>
                          <input
                            type="number"
                            value={form.quarterlyPrice}
                            onChange={(e) => setForm({ ...form, quarterlyPrice: e.target.value })}
                            placeholder="e.g. 9000"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            3M Discount Text
                          </label>
                          <input
                            type="text"
                            value={form.quarterlyDiscount}
                            onChange={(e) => setForm({ ...form, quarterlyDiscount: e.target.value })}
                            placeholder="e.g. Save ₹1,497"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Yearly Price (₹)
                          </label>
                          <input
                            type="number"
                            value={form.yearlyPrice}
                            onChange={(e) => setForm({ ...form, yearlyPrice: e.target.value })}
                            placeholder="e.g. 29499"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Yearly Discount Text
                          </label>
                          <input
                            type="text"
                            value={form.yearlyDiscount}
                            onChange={(e) => setForm({ ...form, yearlyDiscount: e.target.value })}
                            placeholder="e.g. Save ₹12,489"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Features List Builder ── */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    3. Included Features List
                  </h4>

                  {/* Active Features */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {form.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => {
                            const copy = [...form.features];
                            copy[idx] = e.target.value;
                            setForm({ ...form, features: copy });
                          }}
                          placeholder={`Feature ${idx + 1}`}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(idx)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Feature Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newFeatureInput}
                      onChange={(e) => setNewFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFeature();
                        }
                      }}
                      placeholder="Add another feature bullet point..."
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs rounded-lg border border-sky-500/20 transition-all shrink-0 cursor-pointer"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* ── Button & Display Settings ── */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    4. Button & Ordering Settings
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Button Label (Optional)
                      </label>
                      <input
                        type="text"
                        value={form.buttonText}
                        onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                        placeholder="e.g. Get 3-Day Pass — ₹799"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Display Order #
                      </label>
                      <input
                        type="number"
                        value={form.order}
                        onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                    {formError}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting
                      ? "Saving..."
                      : editingId
                        ? "Update Plan"
                        : "Create Plan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      <AnimatePresence>
        {deleteModalId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 dark:bg-black/80 p-4"
            onClick={() => setDeleteModalId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                <Trash2 className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Plan?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to delete this membership plan? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalId(null)}
                  disabled={deleting}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
