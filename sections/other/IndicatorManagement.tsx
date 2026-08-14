"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LineChart,
  Layers,
  Sparkles,
  Sliders,
  X,
  ExternalLink,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Tag,
  Copy,
  Check,
  Zap,
  Globe,
  Lock,
  FileCode,
} from "lucide-react";

export interface IndicatorItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  symbol: string | null;
  market: string | null;
  timeframe: string | null;
  status: "DRAFT" | "TESTING" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  currentVersion: string | null;
  tradingViewId: string | null;
  tradingViewUrl: string | null;
  publisher: string | null;
  distributionType: string | null;
  isPremium: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  planAccess: Array<{
    plan: { id: string; name: string; badge: string | null };
  }>;
  _count: {
    versions: number;
    userAccess: number;
    planAccess: number;
  };
}

export interface IndicatorCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  _count?: { indicators: number };
}

interface SummaryStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
  premium: number;
}

interface FormState {
  name: string;
  description: string;
  symbol: string;
  market: string;
  timeframe: string;
  categoryId: string;
  status: "DRAFT" | "TESTING" | "ACTIVE" | "INACTIVE";
  currentVersion: string;
  tradingViewId: string;
  tradingViewUrl: string;
  publisher: string;
  distributionType: string;
  shareType: "URL" | "SCRIPT";
  initialScript: string;
  isPremium: boolean;
  isActive: boolean;
  planIds: string[];
  initialReleaseNotes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  symbol: "",
  market: "Crypto",
  timeframe: "1H",
  categoryId: "",
  status: "ACTIVE",
  currentVersion: "v1.0.0",
  tradingViewId: "",
  tradingViewUrl: "",
  publisher: "SmartFlowAlgo",
  distributionType: "INVITE_ONLY",
  shareType: "URL",
  initialScript: "",
  isPremium: true,
  isActive: true,
  planIds: [],
  initialReleaseNotes: "Initial version release",
};

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30";

export default function IndicatorManagement() {
  const [indicators, setIndicators] = useState<IndicatorItem[]>([]);
  const [categories, setCategories] = useState<IndicatorCategoryItem[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    total: 0,
    active: 0,
    inactive: 0,
    draft: 0,
    premium: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [marketFilter, setMarketFilter] = useState("ALL");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [catSubmitting, setCatSubmitting] = useState(false);

  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter, marketFilter]);

  useEffect(() => {
    fetchIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, categoryFilter, statusFilter, marketFilter]);

  useEffect(() => {
    fetchCategories();
    fetchPlans();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/indicator-categories");
      const json = await res.json();
      if (res.ok && json.success) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  }

  async function fetchPlans() {
    try {
      const res = await fetch("/api/plans");
      const json = await res.json();
      if (res.ok && json.success) {
        setAvailablePlans(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load plans", err);
    }
  }

  async function fetchIndicators() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryFilter !== "ALL") params.set("categoryId", categoryFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (marketFilter !== "ALL") params.set("market", marketFilter);

      const res = await fetch(`/api/admin/indicators?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load indicators");
      }

      setIndicators(json.data);
      if (json.summary) setSummary(json.summary);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to load indicators");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  function openCreateModal() {
    setEditingIndicator(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormModalOpen(true);
  }

  function openEditModal(ind: IndicatorItem) {
    setEditingIndicator(ind);
    setForm({
      name: ind.name,
      description: ind.description || "",
      symbol: ind.symbol || "",
      market: ind.market || "Crypto",
      timeframe: ind.timeframe || "1H",
      categoryId: ind.category?.id || "",
      status: ind.status === "ARCHIVED" ? "INACTIVE" : ind.status,
      currentVersion: ind.currentVersion || "v1.0.0",
      tradingViewId: ind.tradingViewId || "",
      tradingViewUrl: ind.tradingViewUrl || "",
      publisher: ind.publisher || "SmartFlowAlgo",
      distributionType: ind.distributionType || "INVITE_ONLY",
      shareType: ind.distributionType === "DIRECT_SCRIPT" ? "SCRIPT" : "URL",
      initialScript: "",
      isPremium: ind.isPremium,
      isActive: ind.isActive,
      planIds: ind.planAccess.map((p) => p.plan.id),
      initialReleaseNotes: "",
    });
    setFormError(null);
    setFormModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Indicator name is required");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingIndicator
        ? `/api/admin/indicators/${editingIndicator.id}`
        : "/api/admin/indicators";
      const method = editingIndicator ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save indicator");
      }

      setFormModalOpen(false);
      await fetchIndicators();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCatSubmitting(true);
    try {
      const res = await fetch("/api/admin/indicator-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create category");
      }

      setNewCatName("");
      setNewCatDesc("");
      await fetchCategories();
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    } finally {
      setCatSubmitting(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/admin/indicator-categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete category");
      }
      await fetchCategories();
      await fetchIndicators();
    } catch (err: any) {
      alert(err.message || "Failed to delete category");
    }
  }

  async function handleDelete() {
    if (!deleteModalId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/indicators/${deleteModalId}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete indicator");
      }

      setDeleteModalId(null);
      await fetchIndicators();
    } catch (err: any) {
      alert(err.message || "Failed to delete indicator");
    } finally {
      setDeleting(false);
    }
  }

  function togglePlanSelection(planId: string) {
    setForm((prev) => {
      const exists = prev.planIds.includes(planId);
      return {
        ...prev,
        planIds: exists ? prev.planIds.filter((id) => id !== planId) : [...prev.planIds, planId],
      };
    });
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LineChart className="h-6 w-6 text-sky-500" />
            <span>Indicator Repository & Distribution</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your proprietary TradingView indicators, versions, changelogs, plan rules, and direct user access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Layers className="h-4 w-4 text-purple-400" />
            Categories ({categories.length})
          </button>

          <button
            type="button"
            onClick={fetchIndicators}
            disabled={loading}
            title="Refresh indicators"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Indicator
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Indicators</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total}</span>
            <span className="text-xs text-sky-500 font-bold">Repository</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active Releases</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.active}</span>
            <span className="text-xs text-emerald-500 font-medium">Live</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Drafts / In Testing</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.draft + summary.inactive}</span>
            <span className="text-xs text-amber-500 font-medium">Internal</span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-sm">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Premium Exclusives</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.premium}</span>
            <span className="text-xs text-purple-500 font-medium">Paid Plans</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, symbol, TradingView ID..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="TESTING">Testing</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Markets</option>
              <option value="Crypto">Crypto</option>
              <option value="Forex">Forex</option>
              <option value="Stocks">Stocks</option>
              <option value="Indices">Indices</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="relative overflow-x-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            </div>
          )}

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Indicator Info</th>
                <th className="px-4 py-3.5 font-semibold">Version</th>
                <th className="px-4 py-3.5 font-semibold">Category / Market</th>
                <th className="px-4 py-3.5 font-semibold">Assigned Plans</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold">User Access</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {indicators.map((ind) => {
                const isLive = ind.status === "ACTIVE" && ind.isActive;
                return (
                  <tr
                    key={ind.id}
                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Name & Slug */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
                          <LineChart className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/indicators/${ind.id}`}
                            className="text-xs font-bold text-slate-900 dark:text-white hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5"
                          >
                            <span>{ind.name}</span>
                            {ind.isPremium && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                                PRO
                              </span>
                            )}
                          </Link>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {ind.description || ind.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Version */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
                        {ind.currentVersion || "v1.0.0"}
                      </span>
                    </td>

                    {/* Category & Market */}
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {ind.category?.name || "Uncategorized"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {ind.market || "Crypto"} • {ind.timeframe || "1H"}
                      </p>
                    </td>

                    {/* Assigned Plans */}
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {ind.planAccess.length > 0 ? (
                          ind.planAccess.map((pa) => (
                            <span
                              key={pa.plan.id}
                              className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-bold"
                            >
                              {pa.plan.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No plans assigned</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          isLive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : ind.status === "DRAFT"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        <span>{ind.status}</span>
                      </span>
                    </td>

                    {/* User Access Count */}
                    <td className="px-4 py-3.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {ind._count.userAccess}
                      </span>{" "}
                      <span className="text-slate-400 text-[11px]">users</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/indicators/${ind.id}`}
                          title="Indicator Control Center"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => openEditModal(ind)}
                          title="Edit Metadata"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteModalId(ind.id)}
                          title="Delete Indicator"
                          className="p-1.5 rounded-lg border border-red-500/25 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && indicators.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No indicators found in the repository matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span>
            {total === 0 ? "No results" : `Showing ${rangeStart}-${rangeEnd} of ${total} indicators`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== CREATE / EDIT INDICATOR MODAL ==================== */}
      <AnimatePresence>
        {formModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 overflow-y-auto"
            onClick={() => !submitting && setFormModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingIndicator ? `Edit: ${editingIndicator.name}` : "Create New TradingView Indicator"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure TradingView script parameters, access permissions, plan assignment, and initial version release.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  disabled={submitting}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                    Basic Identity & Classification
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Indicator Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="SmartFlow Pro Strategy"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={form.categoryId}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Select Category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Proprietary trend & momentum signal indicator..."
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Target Market
                      </label>
                      <select
                        value={form.market}
                        onChange={(e) => setForm({ ...form, market: e.target.value })}
                        className={inputCls}
                      >
                        <option value="Crypto">Crypto</option>
                        <option value="Forex">Forex</option>
                        <option value="Stocks">Stocks</option>
                        <option value="Indices">Indices</option>
                        <option value="Multi-Market">Multi-Market</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Recommended Symbol
                      </label>
                      <input
                        type="text"
                        value={form.symbol}
                        onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                        placeholder="BTCUSDT, XAUUSD"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Timeframe
                      </label>
                      <input
                        type="text"
                        value={form.timeframe}
                        onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                        placeholder="5m, 15m, 1H, 4H"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* TradingView Integration & Script Source */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                      TradingView Distribution & Code Setup
                    </h3>

                    {/* 2 Share Types Switcher */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, shareType: "URL", distributionType: "INVITE_ONLY" })
                        }
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          form.shareType === "URL"
                            ? "bg-sky-500 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Globe className="h-3 w-3" />
                        <span>1. Share URL / Invite-Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, shareType: "SCRIPT", distributionType: "DIRECT_SCRIPT" })
                        }
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          form.shareType === "SCRIPT"
                            ? "bg-sky-500 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <FileCode className="h-3 w-3" />
                        <span>2. Share Source Code Directly</span>
                      </button>
                    </div>
                  </div>

                  {form.shareType === "URL" ? (
                    <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            TradingView Script ID
                          </label>
                          <input
                            type="text"
                            value={form.tradingViewId}
                            onChange={(e) => setForm({ ...form, tradingViewId: e.target.value })}
                            placeholder="PUB;123456789"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            TradingView Script URL
                          </label>
                          <input
                            type="url"
                            value={form.tradingViewUrl}
                            onChange={(e) => setForm({ ...form, tradingViewUrl: e.target.value })}
                            placeholder="https://www.tradingview.com/script/..."
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Publisher Handle
                          </label>
                          <input
                            type="text"
                            value={form.publisher}
                            onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                            placeholder="SmartFlowAlgo"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Distribution Mode
                          </label>
                          <select
                            value={form.distributionType}
                            onChange={(e) => setForm({ ...form, distributionType: e.target.value })}
                            className={inputCls}
                          >
                            <option value="INVITE_ONLY">Invite Only (TradingView Username Access)</option>
                            <option value="PRIVATE">Private Backend Authorized</option>
                            <option value="PUBLIC">Public Script</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-sky-500/20">
                      <div>
                        <label className="block text-xs font-bold text-sky-400 mb-1 flex items-center justify-between">
                          <span>Paste Pine Script Source Code Directly</span>
                          <span className="text-[10px] text-slate-400 font-mono">Pine Script v5</span>
                        </label>
                        <textarea
                          rows={6}
                          value={form.initialScript}
                          onChange={(e) => setForm({ ...form, initialScript: e.target.value })}
                          placeholder={`//@version=5\nindicator("SmartFlow Algo Pro", overlay=true)\n\n// Add Pine script logic here...`}
                          className={`${inputCls} font-mono text-xs bg-slate-950 text-sky-300 border-slate-800`}
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          This source code will be stored in the indicator version history and served securely to authorized customers.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status & Version */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                    Lifecycle & Version Status
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Indicator Status
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                        className={inputCls}
                      >
                        <option value="ACTIVE font-bold text-emerald-500">ACTIVE (Live to Eligible Users)</option>
                        <option value="DRAFT">DRAFT (Internal Preparation)</option>
                        <option value="TESTING">TESTING (QA Only)</option>
                        <option value="INACTIVE">INACTIVE (Disabled)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Version Tag
                      </label>
                      <input
                        type="text"
                        value={form.currentVersion}
                        onChange={(e) => setForm({ ...form, currentVersion: e.target.value })}
                        placeholder="v1.0.0, v2.4.1"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Plan Mapping */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                    Eligible Subscription Plans
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availablePlans.map((plan) => {
                      const isSelected = form.planIds.includes(plan.id);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => togglePlanSelection(plan.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400"
                              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                          }`}
                        >
                          <span>{plan.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-sky-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{editingIndicator ? "Save Changes" : "Create Indicator"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CATEGORY MANAGER MODAL ==================== */}
      <AnimatePresence>
        {categoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 dark:bg-black/80 p-4"
            onClick={() => setCategoryModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-400" />
                  <span>Manage Indicator Categories</span>
                </h2>
                <button
                  onClick={() => setCategoryModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Add category form */}
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category Name (e.g. Volume, Swing Trading)"
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={catSubmitting}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {catSubmitting ? "Adding..." : "Add Category"}
                </button>
              </form>

              {/* List existing categories */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{cat.name}</p>
                      <p className="text-[10px] text-slate-400">{cat.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
            onClick={() => !deleting && setDeleteModalId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500">
                <ShieldAlert className="h-6 w-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Indicator
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete this indicator? This will remove all version history, plan associations, and direct user access permissions.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalId(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
