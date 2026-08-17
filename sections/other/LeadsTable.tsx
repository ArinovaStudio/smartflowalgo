"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  RefreshCw,
  LucideTrash,
  Receipt,
  CalendarClock,
} from "lucide-react";
import PaymentsModal from "./PaymentModel";

export type AccType = "APPLIED" | "PAID" | "REJECTED" | "AWAITED";

export interface Lead {
  srn: number;
  id: string;
  name: string;
  tradingViewId: string | null;
  broker?: string | null;
  mobile: string;
  email: string;
  planType?: AccType | string | null;
  createdAt: string;
  renualDate?: string | null;
  version?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type PlanFilter = "ALL" | AccType;
type RenewalFilter = "ALL" | "EXPIRING_SOON" | "EXPIRED" | "ACTIVE";
type SortBy = "createdAt" | "name" | "renualDate" | "srn";
type SortOrder = "asc" | "desc";

interface LeadsTableProps {
  initialData: any[];
  initialTotal: number;
  pageSize: number;
}

const statusColorMap: Record<AccType, string> = {
  PAID: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50",
  APPLIED: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700/50",
  AWAITED: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/50",
  REJECTED: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/50",
};

export default function LeadsTable({ initialData, initialTotal, pageSize }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialData);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize,
    total: initialTotal,
    totalPages: Math.max(1, Math.ceil(initialTotal / pageSize)),
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [renewalFilter, setRenewalFilter] = useState<RenewalFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const [paymentsFor, setPaymentsFor] = useState<{ id: string; name: string } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, planFilter, renewalFilter, sortBy, order]);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, planFilter, renewalFilter, sortBy, order]);

  async function fetchLeads() {
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
      if (planFilter !== "ALL") params.set("planType", planFilter);
      if (renewalFilter !== "ALL") params.set("renewalFilter", renewalFilter);
      const res = await fetch(`/api/get-leads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load leads"); return; }
      setLeads(data.data);
      setPagination(data.pagination);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(field: SortBy) {
    if (sortBy === field) setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setOrder("desc"); }
  }

  const handleStatusChange = async (leadId: string, newPlanType: AccType) => {
    const prevLeads = [...leads];
    const targetLead = leads.find((l) => l.id === leadId);

    // If changing to PAID, store today's date as the renewal date
    const updatedRenualDate =
      newPlanType === "PAID"
        ? new Date().toISOString()
        : targetLead?.renualDate;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
            ...l,
            planType: newPlanType,
            renualDate: updatedRenualDate,
          }
          : l
      )
    );
    setUpdatingId(leadId);
    setError(null);

    try {
      const res = await fetch("/api/save-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          planType: newPlanType,
          ...(newPlanType === "PAID" ? { renualDate: updatedRenualDate } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update status");
        setLeads(prevLeads);
      }
    } catch {
      setError("Network error while updating status");
      setLeads(prevLeads);
    } finally {
      setUpdatingId(null);
    }
  };

  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  const deleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    setLoading(true);
    const del = await fetch(`/api/save-data?id=${id}`, { method: "DELETE" });
    if (del.ok) {
      fetchLeads();
    } else {
      setError("Failed to delete lead");
      setLoading(false);
    }
  };

  function renderRenewalBadge(renualDateStr?: string | null) {
    if (!renualDateStr) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    const renualDate = new Date(renualDateStr);
    const diffDays = Math.floor((Date.now() - renualDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = 30 - diffDays;

    const formattedDate = renualDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    if (daysRemaining <= 0) {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-slate-700 dark:text-slate-300">{formattedDate}</span>
          <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 leading-tight">
            Expired ({Math.abs(daysRemaining)}d ago)
          </span>
        </div>
      );
    }

    if (daysRemaining <= 7) {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-slate-700 dark:text-slate-300">{formattedDate}</span>
          <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 leading-tight">
            {daysRemaining}d left (Soon)
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="font-medium text-slate-700 dark:text-slate-300">{formattedDate}</span>
        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 leading-tight">
          {daysRemaining}d left
        </span>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, mobile, TV ID, broker..."
            className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Plan Status Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-white focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="ALL">All status</option>
            <option value="APPLIED">Applied</option>
            <option value="PAID">Paid</option>
            <option value="AWAITED">Awaited</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Renewal 1-Month Filter */}
          <select
            value={renewalFilter}
            onChange={(e) => setRenewalFilter(e.target.value as RenewalFilter)}
            className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-white focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="ALL">All Renewal</option>
            <option value="EXPIRING_SOON">Expiring Soon (1 Month)</option>
            <option value="EXPIRED">Expired</option>
            <option value="ACTIVE">Active (within 1 Month)</option>
          </select>

          <button
            onClick={fetchLeads}
            disabled={loading}
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs sm:text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table Container - full width without ugly horizontal scrollbars */}
      <div className="relative w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-950/50 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-sky-500 dark:text-sky-400" />
          </div>
        )}

        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-transparent">
              <th className="px-3 py-3 font-semibold">S No.</th>
              <SortableHeader label="Name" field="name" sortBy={sortBy} order={order} onSort={toggleSort} />
              <th className="px-3 py-3 font-semibold">TradingView ID</th>
              <th className="px-3 py-3 font-semibold">Broker</th>
              <th className="px-3 py-3 font-semibold">Version</th>
              <th className="px-3 py-3 font-semibold">Mobile</th>
              <th className="px-3 py-3 font-semibold">Email</th>
              <th className="px-3 py-3 font-semibold">Plan / Status</th>
              <SortableHeader label="Joined" field="createdAt" sortBy={sortBy} order={order} onSort={toggleSort} />
              <SortableHeader label="Renewal" field="renualDate" sortBy={sortBy} order={order} onSort={toggleSort} />
              <th className="px-3 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
            {leads.map((lead) => {
              const currentStatus = ((lead.planType as AccType) || "APPLIED");
              return (
                <tr key={lead.id} className="group text-slate-700 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-3 text-slate-400 dark:text-slate-400 font-mono text-[11px]">{lead.srn}</td>
                  <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                    <div className="max-w-[120px] truncate" title={lead.name}>
                      {lead.name}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 group justify-between max-w-[130px]">
                      <span className="truncate" title={lead.tradingViewId || ""}>{lead.tradingViewId || "—"}</span>
                      {lead.tradingViewId && (
                        <button
                          onClick={() => handleCopy(lead.tradingViewId as string)}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-all rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none shrink-0"
                          title="Copy to clipboard"
                        >
                          {copiedId === lead.tradingViewId ? (
                            <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
                              <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    <span className="inline-block max-w-[100px] truncate" title={lead.broker || ""}>
                      {lead.broker || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    <span className="inline-block max-w-[130px] truncate" title={lead.version || ""}>
                      {lead.version || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{lead.mobile || "—"}</td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    <span className="inline-block max-w-[140px] truncate" title={lead.email}>
                      {lead.email}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="relative inline-flex items-center">
                      <select
                        value={currentStatus}
                        disabled={updatingId === lead.id}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as AccType)}
                        className={`text-[11px] font-semibold rounded-lg px-2 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${statusColorMap[currentStatus] ||
                          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          } ${updatingId === lead.id ? "opacity-50 cursor-wait" : ""}`}
                      >
                        <option value="APPLIED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">APPLIED</option>
                        <option value="PAID" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">PAID</option>
                        <option value="AWAITED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">AWAITED</option>
                        <option value="REJECTED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">REJECTED</option>
                      </select>
                      {updatingId === lead.id && (
                        <Loader2 className="absolute right-1.5 h-3 w-3 animate-spin text-sky-500 pointer-events-none" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {new Date(lead.createdAt).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {/* {renderRenewalBadge(lead.renualDate)} */}
                    {
                      currentStatus === "PAID"
                        ? renderRenewalBadge(lead.renualDate)
                        : currentStatus === "APPLIED"
                          ? "-"
                          : new Date(lead.updatedAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                    }
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* <button
                        onClick={() => setPaymentsFor({ id: lead.id, name: lead.name })}
                        title="View payments"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 transition hover:border-sky-500/30 hover:text-sky-600 dark:hover:text-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-950/30"
                      >
                        <Receipt size={13} />
                      </button> */}
                      <button
                        onClick={() => deleteUser(lead.id)}
                        title="Delete lead"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 transition hover:border-red-500/30 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/30"
                      >
                        <LucideTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CalendarClock className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                    <span>No leads match your current search and filter criteria.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-white/10 p-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {pagination.total === 0 ? "No results" : `Showing ${rangeStart}-${rangeEnd} of ${pagination.total}`}
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {[
            { icon: ChevronsLeft, label: "First page", action: () => setPage(1), disabled: pagination.page <= 1 || loading },
            { icon: ChevronLeft, label: "Previous page", action: () => setPage((p) => Math.max(1, p - 1)), disabled: pagination.page <= 1 || loading },
          ].map(({ icon: Icon, label, action, disabled }) => (
            <button key={label} onClick={action} disabled={disabled} title={label}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          ))}

          <span className="min-w-[80px] text-center text-xs">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          {[
            { icon: ChevronRight, label: "Next page", action: () => setPage((p) => Math.min(pagination.totalPages, p + 1)), disabled: pagination.page >= pagination.totalPages || loading },
            { icon: ChevronsRight, label: "Last page", action: () => setPage(pagination.totalPages), disabled: pagination.page >= pagination.totalPages || loading },
          ].map(({ icon: Icon, label, action, disabled }) => (
            <button key={label} onClick={action} disabled={disabled} title={label}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Payments modal */}
      <AnimatePresence>
        {paymentsFor && (
          <PaymentsModal
            key={paymentsFor.id}
            leadId={paymentsFor.id}
            leadName={paymentsFor.name}
            onClose={() => setPaymentsFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableHeader({
  label, field, sortBy, order, onSort,
}: {
  label: string;
  field: SortBy;
  sortBy: SortBy;
  order: SortOrder;
  onSort: (field: SortBy) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="px-3 py-3 font-semibold">
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 transition hover:text-slate-900 dark:hover:text-white ${active ? "text-slate-900 dark:text-white font-bold" : ""}`}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100 text-sky-500" : "opacity-40"}`} />
        {active && <span className="text-[10px] font-bold text-sky-500">{order === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

