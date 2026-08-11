"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  Shield,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  X,
  Sparkles,
  KeyRound,
  Calendar,
  Phone,
  Mail,
  Zap,
  TrendingUp,
  Gift,
} from "lucide-react";
import PaymentsModal from "./PaymentModel";

export interface UserItem {
  id: string;
  srn: number;
  name: string | null;
  email: string;
  mobile: string | null;
  tradingViewId: string | null;
  image: string | null;
  experience: string | null;
  interest: string | null;
  planType: "FREE" | "PAID" | null;
  userType: "CLIENT" | "INFULENCER" | "ADMIN";
  version: string | null;
  discount: number | null;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
  paymentCount: number;
  referralCount: number;
  totalSpent: number;
}

interface DetailedUser extends UserItem {
  payments: Array<{
    id: string;
    status: string;
    amount: string;
    currency: string;
    checkoutId: string | null;
    checkoutReference: string;
    createdAt: string;
  }>;
  referrals: Array<{
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
  }>;
  accounts: Array<{
    id: string;
    provider: string;
    type: string;
  }>;
  totalReferralEarnings: number;
}

interface FormState {
  id?: string;
  name: string;
  email: string;
  password: "";
  mobile: string;
  tradingViewId: string;
  userType: "CLIENT" | "INFULENCER" | "ADMIN";
  planType: "FREE" | "PAID";
  experience: string;
  interest: string;
  version: string;
  discount: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  mobile: "",
  tradingViewId: "",
  userType: "CLIENT",
  planType: "FREE",
  experience: "Beginner",
  interest: "Gold",
  version: "Latest",
  discount: 0,
};

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30";

export default function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [detailsUser, setDetailsUser] = useState<DetailedUser | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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
  }, [debouncedSearch, roleFilter, planFilter, sortBy, order]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, roleFilter, planFilter, sortBy, order]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "ALL") params.set("userType", roleFilter);
      if (planFilter !== "ALL") params.set("planType", planFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load users");
      }

      setUsers(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
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
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormModalOpen(true);
  }

  function openEditModal(u: UserItem) {
    setEditingUser(u);
    setForm({
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      password: "",
      mobile: u.mobile || "",
      tradingViewId: u.tradingViewId || "",
      userType: u.userType || "CLIENT",
      planType: u.planType || "FREE",
      experience: u.experience || "Beginner",
      interest: u.interest || "Gold",
      version: u.version || "Latest",
      discount: u.discount || 0,
    });
    setFormError(null);
    setFormModalOpen(true);
  }

  async function openDetailsDrawer(userId: string) {
    setDetailsLoading(true);
    setDetailsUser(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load user details");
      }
      setDetailsUser(json.data);
    } catch (err: any) {
      alert(err.message || "Failed to load user details");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.email.trim()) {
      setFormError("Email address is required");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save user");
      }

      setFormModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteModalId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteModalId}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete user");
      }

      setDeleteModalId(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-6 w-6 text-sky-500" />
            <span>User & Account Management</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View, edit user roles (`ADMIN`, `INFULENCER`, `CLIENT`), upgrade plans, reset passwords, and inspect payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            title="Refresh users"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add New User
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-2xl  shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, mobile, TradingView ID..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Roles</option>
              <option value="CLIENT">Client</option>
              <option value="INFULENCER">Influencer</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Plans</option>
              <option value="FREE">Free Plan</option>
              <option value="PAID">Paid Plan</option>
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
                <th className="px-4 py-3.5 font-semibold">User Info</th>
                <th className="px-4 py-3.5 font-semibold">User Role</th>
                <th className="px-4 py-3.5 font-semibold">Plan Status</th>
                <th className="px-4 py-3.5 font-semibold">TradingView ID</th>
                <th className="px-4 py-3.5 font-semibold">Mobile</th>
                <th className="px-4 py-3.5 font-semibold">Spent (₹)</th>
                <th className="px-4 py-3.5 font-semibold">Joined</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {users.map((u) => {
                const isUserAdmin = u.userType === "ADMIN";
                const isUserInfluencer = u.userType === "INFULENCER";

                return (
                  <tr
                    key={u.id}
                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* User Info */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          <img
                            src={u.image}
                            alt={u.name || u.email}
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {(u.name || u.email || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {u.name || "Unnamed User"}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          isUserAdmin
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : isUserInfluencer
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                        }`}
                      >
                        {isUserAdmin ? (
                          <Shield className="h-3 w-3" />
                        ) : isUserInfluencer ? (
                          <Sparkles className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        <span>{u.userType}</span>
                      </span>
                    </td>

                    {/* Plan Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.planType === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {u.planType === "PAID" ? "PAID" : "FREE"}
                      </span>
                    </td>

                    {/* TradingView ID */}
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {u.tradingViewId ? (
                        <div className="flex items-center gap-1.5">
                          <span>{u.tradingViewId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(u.tradingViewId!)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded cursor-pointer"
                            title="Copy TradingView ID"
                          >
                            {copiedId === u.tradingViewId ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Mobile */}
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                      {u.mobile || "—"}
                    </td>

                    {/* Total Spent */}
                    <td className="px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white">
                      ₹{u.totalSpent.toLocaleString()}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetailsDrawer(u.id)}
                          title="View Full Profile & Payments"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title="Edit User & Role"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteModalId(u.id)}
                          title="Delete User"
                          className="p-1.5 rounded-lg border border-red-500/25 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span>
            {total === 0 ? "No results" : `Showing ${rangeStart}-${rangeEnd} of ${total} users`}
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

      {/* ==================== CREATE / EDIT USER MODAL ==================== */}
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
              className="my-8 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingUser ? `Edit User: ${editingUser.email}` : "Create New User Account"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Modify profile details, upgrade plan status, or assign user roles (`ADMIN`, `INFULENCER`, `CLIENT`).
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Doe"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="john@example.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Password {editingUser && "(Leave blank to keep existing)"}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value as any })}
                      placeholder={editingUser ? "••••••••" : "Minimum 6 chars"}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      placeholder="+91 98765 43210"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      User Type / Role *
                    </label>
                    <select
                      value={form.userType}
                      onChange={(e) => setForm({ ...form, userType: e.target.value as any })}
                      className={inputCls}
                    >
                      <option value="CLIENT">Client / Regular Trader</option>
                      <option value="INFULENCER">Influencer / Promoter</option>
                      <option value="ADMIN">Administrator (Full Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Plan Type *
                    </label>
                    <select
                      value={form.planType}
                      onChange={(e) => setForm({ ...form, planType: e.target.value as any })}
                      className={inputCls}
                    >
                      <option value="FREE">FREE Plan</option>
                      <option value="PAID">PAID (VIP Member)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      TradingView ID
                    </label>
                    <input
                      type="text"
                      value={form.tradingViewId}
                      onChange={(e) => setForm({ ...form, tradingViewId: e.target.value })}
                      placeholder="tv_username"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Promo Discount % (If Influencer)
                    </label>
                    <input
                      type="number"
                      value={form.discount}
                      onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                      placeholder="10"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Trading Experience
                    </label>
                    <select
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      className={inputCls}
                    >
                      <option value="Beginner">Beginner (0-1 yrs)</option>
                      <option value="Intermediate">Intermediate (1-3 yrs)</option>
                      <option value="Advanced">Advanced (3+ yrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Interest
                    </label>
                    <select
                      value={form.interest}
                      onChange={(e) => setForm({ ...form, interest: e.target.value })}
                      className={inputCls}
                    >
                      <option value="Gold">Gold Trading</option>
                      <option value="Crypto">Bitcoin Volatility</option>
                      <option value="Forex">Forex Session Flow</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white shadow"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== USER DETAILS & PAYMENTS DRAWER/MODAL ==================== */}
      <AnimatePresence>
        {(detailsUser || detailsLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 overflow-y-auto"
            onClick={() => setDetailsUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="my-8 w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {detailsLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
              )}

              {detailsUser && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-500 font-bold text-lg flex items-center justify-center border border-sky-500/20">
                        {(detailsUser.name || detailsUser.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{detailsUser.name || "Unnamed User"}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              detailsUser.userType === "ADMIN"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : detailsUser.userType === "INFULENCER"
                                ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                : "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                            }`}
                          >
                            {detailsUser.userType}
                          </span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          ID: {detailsUser.id} | SRN: #{detailsUser.srn}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDetailsUser(null)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Email</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">
                        {detailsUser.email}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Mobile</span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {detailsUser.mobile || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">TradingView ID</span>
                      <span className="font-bold text-sky-600 dark:text-sky-400 font-mono block">
                        {detailsUser.tradingViewId || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Plan Type</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                        {detailsUser.planType || "FREE"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Total Spent</span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        ₹{detailsUser.totalSpent.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Experience</span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {detailsUser.experience || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Interest</span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {detailsUser.interest || "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Auth Provider</span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {detailsUser.accounts.length > 0
                          ? detailsUser.accounts.map((a) => a.provider).join(", ")
                          : "Email Credentials"}
                      </span>
                    </div>
                  </div>

                  {/* Payment History Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-sky-500" />
                        <span>Payment History ({detailsUser.payments.length})</span>
                      </span>
                      <span className="text-xs font-bold text-sky-500">
                        Total Spent: ₹{detailsUser.totalSpent.toLocaleString()}
                      </span>
                    </h3>

                    {detailsUser.payments.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                        No payment records found for this user.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {detailsUser.payments.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {p.currency} {Number(p.amount).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Ref: {p.checkoutReference} {p.checkoutId ? `| ID: ${p.checkoutId}` : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.status === "PAID"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-amber-500/10 text-amber-500"
                                }`}
                              >
                                {p.status}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(p.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Referral History (if Influencer) */}
                  {detailsUser.userType === "INFULENCER" && (
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <span>Influencer Referrals ({detailsUser.referrals.length})</span>
                        </span>
                        <span className="text-xs font-bold text-purple-500">
                          Earnings: ₹{detailsUser.totalReferralEarnings.toLocaleString()}
                        </span>
                      </h3>

                      {detailsUser.referrals.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                          No referred client payments recorded yet.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {detailsUser.referrals.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {r.user?.name || r.user?.email || "Referred User"}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {r.currency} {Number(r.amount).toLocaleString()} • {r.user?.mobile}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                {r.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                  Delete User Account?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to permanently delete this user and all associated accounts?
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalId(null)}
                  disabled={deleting}
                  className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow flex items-center justify-center gap-2 disabled:opacity-50"
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
