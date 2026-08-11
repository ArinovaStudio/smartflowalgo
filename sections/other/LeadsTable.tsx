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
} from "lucide-react";
import PaymentsModal from "./PaymentModel";

type AccType = "FREE" | "PAID";
export interface Lead {
  srn: number;
  id: string;
  name: string;
  tradingViewId: string | null;
  mobile: string;
  email: string;
  planType?: AccType;
  createdAt: string; // ISO string
  version?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type PlanFilter = "ALL" | "FREE" | "PAID";
type SortBy = "createdAt" | "name";
type SortOrder = "asc" | "desc";

interface LeadsTableProps {
  initialData: any[];
  initialTotal: number;
  pageSize: number;
}

export default function LeadsTable({
  initialData,
  initialTotal,
  pageSize,
}: LeadsTableProps) {
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
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
  // Which lead's payments modal is open, if any.
  const [paymentsFor, setPaymentsFor] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search box so we're not firing a request per keystroke.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(
      () => setDebouncedSearch(search.trim()),
      350,
    );
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, planFilter, sortBy, order]);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, planFilter, sortBy, order]);

  async function fetchLeads() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (planFilter !== "ALL") params.set("planType", planFilter);

      const res = await fetch(`/api/get-leads?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load leads");
        return;
      }

      setLeads(data.data);
      setPagination(data.pagination);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(field: SortBy) {
    if (sortBy === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setOrder("desc");
    }
  }

  const rangeStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  const deleteUser = async (id: string) => {
    setLoading(true);
    const del = await fetch(`/api/save-data?id=${id}`, {
      method: "DELETE",
    });
    const data = await del.json();
    console.log(data);

    if (del.ok) {
      window.location.reload();
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, mobile, TradingView ID..."
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="ALL">All plans</option>
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
          </select>

          <button
            onClick={fetchLeads}
            disabled={loading}
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-x-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          </div>
        )}

        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">S No.</th>
              <SortableHeader
                label="Name"
                field="name"
                sortBy={sortBy}
                order={order}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium">TradingView ID</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <SortableHeader
                label="Joined"
                field="createdAt"
                sortBy={sortBy}
                order={order}
                onSort={toggleSort}
              />
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="group text-slate-200 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 text-slate-400">{lead.srn}</td>
                <td className="px-4 py-3 font-medium text-white">
                  {lead.name}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  <div className="flex items-center gap-2 group justify-between">
                    <span>{lead.tradingViewId}</span>
                    <button
                      onClick={() => handleCopy(lead.tradingViewId as string)}
                      className="p-1 opacity-0 group-hover:opacity-100 transition-all rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 cursor-pointer focus:outline-none"
                      title="Copy to clipboard"
                    >
                      {copiedId === lead.tradingViewId ? (
                        // Checkmark Icon (Success state)
                        <svg
                          xmlns="http://w3.org"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4 text-emerald-500"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : (
                        // Copy Icon (Default state)
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 256 256"
                        >
                          <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{lead.version}</td>
                <td className="px-4 py-3 text-slate-400">{lead.mobile}</td>
                <td className="px-4 py-3 text-slate-400">{lead.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${lead.planType === "PAID"
                      ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/30"
                      : "bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-500/30"
                      }`}
                  >
                    {lead.planType === "PAID" ? "Paid" : "Free"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                  {new Date(lead.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPaymentsFor({ id: lead.id, name: lead.name })
                      }
                      title="View payments"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-sky-500/30 hover:text-sky-300"
                    >
                      <Receipt size={14} />
                    </button>
                    <button
                      onClick={() => deleteUser(lead.id)}
                      title="Delete lead"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-red-500/30 hover:text-red-300"
                    >
                      <LucideTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && leads.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No leads match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 border-t border-white/10 p-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {pagination.total === 0
            ? "No results"
            : `Showing ${rangeStart}-${rangeEnd} of ${pagination.total}`}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={pagination.page <= 1 || loading}
            title="First page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page <= 1 || loading}
            title="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[80px] text-center">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={pagination.page >= pagination.totalPages || loading}
            title="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => setPage(pagination.totalPages)}
            disabled={pagination.page >= pagination.totalPages || loading}
            title="Last page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
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
  label,
  field,
  sortBy,
  order,
  onSort,
}: {
  label: string;
  field: SortBy;
  sortBy: SortBy;
  order: SortOrder;
  onSort: (field: SortBy) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1 transition hover:text-white ${active ? "text-white" : ""
          }`}
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`}
        />
        {active && (
          <span className="text-[10px]">{order === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );
}
