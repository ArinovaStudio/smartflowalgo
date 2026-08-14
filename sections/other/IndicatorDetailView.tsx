"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  LineChart,
  GitBranch,
  ShieldCheck,
  Users,
  CreditCard,
  History,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  Loader2,
  Calendar,
  Lock,
  Globe,
  Tag,
  Check,
  X,
  FileCode,
  ShieldAlert,
} from "lucide-react";

interface IndicatorDetail {
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
  versions: Array<{
    id: string;
    version: string;
    releaseNotes: string | null;
    script: string | null;
    status: string;
    releasedAt: string | null;
    createdAt: string;
  }>;
  planAccess: Array<{
    id: string;
    plan: {
      id: string;
      name: string;
      badge: string | null;
      price: number | null;
      monthlyPrice: number | null;
      isActive: boolean;
    };
  }>;
  userAccess: Array<{
    id: string;
    status: "GRANTED" | "REVOKED" | "EXPIRED";
    grantedAt: string;
    expiresAt: string | null;
    grantedBy: string | null;
    reason: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
      tradingViewId: string | null;
      planType: string | null;
      userType: string;
    };
  }>;
  activityLogs: Array<{
    id: string;
    action: string;
    details: string | null;
    performedBy: string | null;
    createdAt: string;
  }>;
}

interface AvailablePlan {
  id: string;
  name: string;
  badge: string | null;
}

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30";

export default function IndicatorDetailView({ indicatorId }: { indicatorId: string }) {
  const router = useRouter();
  const [indicator, setIndicator] = useState<IndicatorDetail | null>(null);
  const [allPlans, setAllPlans] = useState<AvailablePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "versions" | "plans" | "users" | "logs">(
    "overview"
  );

  // Modals
  const [newVersionModal, setNewVersionModal] = useState(false);
  const [verNum, setVerNum] = useState("");
  const [verNotes, setVerNotes] = useState("");
  const [verScript, setVerScript] = useState("");
  const [verSubmitting, setVerSubmitting] = useState(false);

  const [grantUserModal, setGrantUserModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  const [savingPlans, setSavingPlans] = useState(false);

  useEffect(() => {
    fetchIndicatorDetail();
    fetchAllPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorId]);

  async function fetchIndicatorDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/indicators/${indicatorId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load indicator");
      }
      setIndicator(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load indicator");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllPlans() {
    try {
      const res = await fetch("/api/plans");
      const json = await res.json();
      if (res.ok && json.success) {
        setAllPlans(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load plans", err);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!indicator) return;
    try {
      const res = await fetch(`/api/admin/indicators/${indicator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update status");
      }
      await fetchIndicatorDetail();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  }

  async function handleCreateVersion(e: FormEvent) {
    e.preventDefault();
    if (!verNum.trim()) return;

    setVerSubmitting(true);
    try {
      const res = await fetch(`/api/admin/indicators/${indicatorId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: verNum,
          releaseNotes: verNotes,
          script: verScript,
          status: "RELEASED",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to release version");
      }

      setNewVersionModal(false);
      setVerNum("");
      setVerNotes("");
      setVerScript("");
      await fetchIndicatorDetail();
    } catch (err: any) {
      alert(err.message || "Failed to release version");
    } finally {
      setVerSubmitting(false);
    }
  }

  async function handleTogglePlan(planId: string) {
    if (!indicator) return;
    const currentPlanIds = indicator.planAccess.map((pa) => pa.plan.id);
    const newPlanIds = currentPlanIds.includes(planId)
      ? currentPlanIds.filter((id) => id !== planId)
      : [...currentPlanIds, planId];

    setSavingPlans(true);
    try {
      const res = await fetch(`/api/admin/indicators/${indicatorId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planIds: newPlanIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update plan mappings");
      }
      await fetchIndicatorDetail();
    } catch (err: any) {
      alert(err.message || "Failed to update plans");
    } finally {
      setSavingPlans(false);
    }
  }

  async function handleGrantAccess(e: FormEvent) {
    e.preventDefault();
    if (!userEmail.trim()) return;

    setGrantSubmitting(true);
    try {
      const res = await fetch(`/api/admin/indicators/${indicatorId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          status: "GRANTED",
          reason: grantReason || "Manual Admin Grant",
          expiresAt: grantExpiry ? new Date(grantExpiry).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to grant access");
      }

      setGrantUserModal(false);
      setUserEmail("");
      setGrantReason("");
      setGrantExpiry("");
      await fetchIndicatorDetail();
    } catch (err: any) {
      alert(err.message || "Failed to grant access");
    } finally {
      setGrantSubmitting(false);
    }
  }

  async function handleRevokeAccess(userId: string) {
    if (!confirm("Are you sure you want to revoke access for this user?")) return;
    try {
      const res = await fetch(`/api/admin/indicators/${indicatorId}/access?userId=${userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to revoke access");
      }
      await fetchIndicatorDetail();
    } catch (err: any) {
      alert(err.message || "Failed to revoke access");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (error || !indicator) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto" />
        <p className="font-bold">{error || "Indicator not found"}</p>
        <Link
          href="/admin/indicators"
          className="inline-flex items-center gap-2 text-xs font-semibold text-sky-500 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Indicators Repository
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/admin/indicators"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-500 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Repository
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LineChart className="h-6 w-6 text-sky-500" />
                <span>{indicator.name}</span>
              </h1>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {indicator.currentVersion || "v1.0.0"}
              </span>

              {indicator.isPremium && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase tracking-wider">
                  PRO EXCLUSIVE
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              {indicator.description || "Proprietary algorithm & indicators for SmartFlowAlgo."}
            </p>
          </div>

          {/* Quick Actions & Status Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={indicator.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ACTIVE">Status: ACTIVE (Live)</option>
              <option value="DRAFT">Status: DRAFT (Internal)</option>
              <option value="TESTING">Status: TESTING (QA)</option>
              <option value="INACTIVE">Status: INACTIVE (Disabled)</option>
            </select>

            {indicator.tradingViewUrl && (
              <a
                href={indicator.tradingViewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors"
              >
                <span>TradingView</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-1 mt-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LineChart className="h-4 w-4" />
            <span>Overview Specs</span>
          </button>

          <button
            onClick={() => setActiveTab("versions")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "versions"
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <GitBranch className="h-4 w-4" />
            <span>Versions & Releases ({indicator.versions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "plans"
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Plan Access Mapping ({indicator.planAccess.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "users"
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Direct User Access ({indicator.userAccess.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            <span>Audit Logs ({indicator.activityLogs.length})</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Technical Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Indicator Unique Slug</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{indicator.slug}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Category</span>
                <span className="font-semibold text-slate-900 dark:text-white">{indicator.category?.name || "None"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Target Market</span>
                <span className="font-semibold text-slate-900 dark:text-white">{indicator.market || "Crypto"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Recommended Symbol</span>
                <span className="font-semibold text-slate-900 dark:text-white">{indicator.symbol || "BTCUSDT"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Timeframe</span>
                <span className="font-semibold text-slate-900 dark:text-white">{indicator.timeframe || "1H"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Created Date</span>
                <span className="text-slate-400">{new Date(indicator.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              TradingView Script Integration
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">TradingView Script ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {indicator.tradingViewId || "Not assigned"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Publisher Handle</span>
                <span className="font-semibold text-slate-900 dark:text-white">{indicator.publisher || "SmartFlowAlgo"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Distribution Type</span>
                <span className="font-bold text-sky-500">{indicator.distributionType || "INVITE_ONLY"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Active User Access Count</span>
                <span className="font-bold text-emerald-500">{indicator.userAccess.length} granted users</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-slate-400">Eligible Subscription Plans</span>
                <span className="font-semibold text-purple-400">{indicator.planAccess.length} plans</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: VERSIONS & CHANGELOG ================= */}
      {activeTab === "versions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Release Version History
            </h3>
            <button
              onClick={() => setNewVersionModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Release New Version
            </button>
          </div>

          <div className="space-y-3">
            {indicator.versions.map((ver) => {
              const isCurrent = ver.version === indicator.currentVersion;
              return (
                <div
                  key={ver.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    isCurrent
                      ? "border-sky-500/40 bg-sky-500/5 dark:bg-sky-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-mono font-bold text-slate-900 dark:text-white">
                        {ver.version}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase">
                          CURRENT RELEASE
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Released {ver.releasedAt ? new Date(ver.releasedAt).toLocaleDateString("en-IN") : "Draft"}
                      </span>
                    </div>
                  </div>

                  {ver.releaseNotes && (
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <p className="font-bold text-slate-500 text-[10px] uppercase mb-1">Release Notes & Changelog</p>
                      <p className="whitespace-pre-wrap">{ver.releaseNotes}</p>
                    </div>
                  )}

                  {ver.script && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-slate-400 hover:text-slate-200 flex items-center gap-1">
                        <FileCode className="h-3.5 w-3.5" /> View Pine Script Source Code Snippet
                      </summary>
                      <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-sky-300 font-mono text-[11px] overflow-x-auto">
                        {ver.script}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PLAN MAPPING MATRIX ================= */}
      {activeTab === "plans" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Plan-Based Access Rules
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Toggle subscription plans that include access to this indicator.
              </p>
            </div>
            {savingPlans && <Loader2 className="h-5 w-5 animate-spin text-sky-500" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {allPlans.map((plan) => {
              const isAssigned = indicator.planAccess.some((pa) => pa.plan.id === plan.id);
              return (
                <div
                  key={plan.id}
                  onClick={() => handleTogglePlan(plan.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isAssigned
                      ? "border-sky-500 bg-sky-500/10 dark:bg-sky-950/30"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAssigned ? "Access Granted" : "Locked"}
                    </p>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      isAssigned
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {isAssigned && <Check className="h-4 w-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: DIRECT USER ACCESS ================= */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Individual User Access Permissions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manually grant or revoke indicator access for specific user accounts (promotional, manual override, custom expiry).
              </p>
            </div>

            <button
              onClick={() => setGrantUserModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              <UserCheck className="h-4 w-4" />
              Grant User Access
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">User</th>
                  <th className="px-4 py-3.5 font-semibold">TradingView ID</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Granted Date</th>
                  <th className="px-4 py-3.5 font-semibold">Expires</th>
                  <th className="px-4 py-3.5 font-semibold">Reason</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {indicator.userAccess.map((ua) => (
                  <tr key={ua.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {ua.user.name || "Unnamed"}
                      </p>
                      <p className="text-[11px] text-slate-400">{ua.user.email}</p>
                    </td>

                    <td className="px-4 py-3 text-xs font-mono text-slate-300">
                      {ua.user.tradingViewId || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          ua.status === "GRANTED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {ua.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(ua.grantedAt).toLocaleDateString("en-IN")}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-400">
                      {ua.expiresAt ? new Date(ua.expiresAt).toLocaleDateString("en-IN") : "Lifetime"}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[150px]">
                      {ua.reason || "Admin Grant"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevokeAccess(ua.user.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Revoke Access"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {indicator.userAccess.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No direct manual user overrides set. Users inherit access via subscription plans.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: AUDIT LOGS ================= */}
      {activeTab === "logs" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            System & Admin Activity Logs
          </h3>

          <div className="space-y-2">
            {indicator.activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                    {log.action}
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">{log.details}</p>
                  <p className="text-[10px] text-slate-500">By: {log.performedBy || "Admin"}</p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: RELEASE NEW VERSION ================= */}
      <AnimatePresence>
        {newVersionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setNewVersionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Release New Version Tag
                </h3>
                <button onClick={() => setNewVersionModal(false)}>
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateVersion} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Version Tag *
                  </label>
                  <input
                    type="text"
                    required
                    value={verNum}
                    onChange={(e) => setVerNum(e.target.value)}
                    placeholder="e.g. v2.4.1"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Release Notes & Changelog
                  </label>
                  <textarea
                    rows={3}
                    value={verNotes}
                    onChange={(e) => setVerNotes(e.target.value)}
                    placeholder="• Improved signal detection&#10;• Reduced false breakouts"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pine Script Source Code (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={verScript}
                    onChange={(e) => setVerScript(e.target.value)}
                    placeholder="// //@version=5 ..."
                    className={`${inputCls} font-mono text-xs`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewVersionModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verSubmitting}
                    className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    {verSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Publish Version</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: GRANT USER ACCESS ================= */}
      <AnimatePresence>
        {grantUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setGrantUserModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Grant Direct User Access
                </h3>
                <button onClick={() => setGrantUserModal(false)}>
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleGrantAccess} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    User Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={grantExpiry}
                    onChange={(e) => setGrantExpiry(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Grant Note
                  </label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="VIP Promotional Grant"
                    className={inputCls}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setGrantUserModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={grantSubmitting}
                    className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    {grantSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Grant Access</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
