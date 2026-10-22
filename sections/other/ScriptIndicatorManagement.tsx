"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileCode,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Upload,
  Copy,
  Check,
  Download,
  Code2,
  Sparkles,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileText,
  ShieldAlert,
  SlidersHorizontal,
  CreditCard,
  RotateCcw,
  Filter,
} from "lucide-react";
import { parseTimeframe } from "../../components/user/mt5Timeframes";

export interface ScriptIndicatorItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "TESTING" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  currentVersion: string | null;
  distributionType: string | null;
  isPremium: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    version: string;
    script: string | null;
    releasedAt: string | null;
    createdAt: string;
  }>;
  planAccess: Array<{
    plan: {
      id: string;
      name: string;
      badge: string | null;
      price: number | null;
      monthlyPrice: number | null;
    };
  }>;
  _count: {
    versions: number;
    userAccess: number;
    planAccess: number;
  };
}

interface SummaryStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
  testing: number;
  assignedPlans: number;
}

interface FormState {
  name: string;
  description: string;
  scriptCode: string;
  status: "ACTIVE" | "TESTING" | "DRAFT" | "INACTIVE";
  version: string;
  planIds: string[];
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  scriptCode: "",
  status: "ACTIVE",
  version: "v1.0.0",
  planIds: [],
};

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition-all";

type ScriptDiagnostic = { line: number; message: string; severity: "error" | "warning" };
type TimeframeFinding = { line: number; value: string; suggestions: string[]; start: number; end: number };
type PineCheckState = { status: "idle" | "checking" | "passed" | "failed"; message: string; line?: number };

const SUPPORTED_TIMEFRAMES = [
  { value: "1", minutes: 1 }, { value: "2", minutes: 2 }, { value: "3", minutes: 3 },
  { value: "4", minutes: 4 }, { value: "5", minutes: 5 }, { value: "6", minutes: 6 },
  { value: "10", minutes: 10 }, { value: "12", minutes: 12 }, { value: "15", minutes: 15 },
  { value: "30", minutes: 30 }, { value: "45", minutes: 45 }, { value: "60", minutes: 60 }, { value: "120", minutes: 120 },
  { value: "180", minutes: 180 }, { value: "240", minutes: 240 }, { value: "360", minutes: 360 },
  { value: "480", minutes: 480 }, { value: "720", minutes: 720 }, { value: "1D", minutes: 1440 },
  { value: "1W", minutes: 10080 }, { value: "1M", minutes: 43200 },
];

function verifyPineScript(source: string) {
  const diagnostics: ScriptDiagnostic[] = [];
  const timeframes: TimeframeFinding[] = [];
  if (!source.trim()) return { diagnostics, timeframes };

  const lines = source.split(/\r?\n/);
  if (!lines.some((line) => /^\s*\/\/@version\s*=\s*\d+/i.test(line))) {
    diagnostics.push({ line: 1, severity: "error", message: "Missing Pine version directive (for example, //@version=6)." });
  }
  if (!/\b(?:indicator|strategy|library)\s*\(/.test(source)) {
    diagnostics.push({ line: 1, severity: "error", message: "Missing indicator(), strategy(), or library() declaration." });
  }

  const sanitized = source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "\"\"")
    .split(/\r?\n/).map((line) => line.replace(/\/\/.*$/, "")).join("\n");
  const stack: Array<{ char: string; line: number }> = [];
  let lineNumber = 1;
  for (const char of sanitized) {
    if (char === "\n") { lineNumber += 1; continue; }
    if (char === "(" || char === "[" || char === "{") stack.push({ char, line: lineNumber });
    if (char === ")" || char === "]" || char === "}") {
      const expected = char === ")" ? "(" : char === "]" ? "[" : "{";
      const last = stack.pop();
      if (!last || last.char !== expected) diagnostics.push({ line: lineNumber, severity: "error", message: `Unexpected closing delimiter "${char}".` });
    }
  }
  for (const open of stack) diagnostics.push({ line: open.line, severity: "error", message: `Unclosed delimiter "${open.char}".` });

  const securityPattern = /\b(?:request\s*\.\s*)?security\s*\(\s*[^,]+,\s*(?:(["'])([^"']+)\1|([A-Za-z_]\w*))/g;
  let match: RegExpExecArray | null;
  while ((match = securityPattern.exec(source))) {
    let raw = (match[2] ?? "").trim();
    let valueStart = -1;
    if (!raw && match[3]) {
      const variable = match[3].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const assignment = new RegExp(`\\b${variable}\\s*=\\s*(['"])([^'"]+)\\1`).exec(source);
      raw = assignment?.[2]?.trim() ?? "";
      if (!raw) continue; // Dynamic timeframe expressions cannot be statically classified.
      valueStart = assignment!.index + assignment![0].lastIndexOf(assignment![2]);
    } else {
      const quotedValue = `${match[1]}${match[2]}${match[1]}`;
      valueStart = match.index + match[0].lastIndexOf(quotedValue) + 1;
    }
    const line = source.slice(0, valueStart).split(/\r?\n/).length;
    const timeframe = parseTimeframe(raw);
    if (timeframe && timeframe.kind !== "sec") continue;
    const minutes = /^\d+$/.test(raw) ? Number(raw) :
      /^\d+S$/i.test(raw) ? Number(raw.slice(0, -1)) / 60 :
      /^\d+D$/i.test(raw) ? Number(raw.slice(0, -1)) * 1440 :
      /^\d+W$/i.test(raw) ? Number(raw.slice(0, -1)) * 10080 :
      /^\d+M$/i.test(raw) ? Number(raw.slice(0, -1)) * 43200 : NaN;
    if (!Number.isFinite(minutes)) {
      timeframes.push({ line, value: raw, suggestions: [], start: valueStart, end: valueStart + raw.length });
      continue;
    }
    const closest = [...SUPPORTED_TIMEFRAMES].sort((a, b) => Math.abs(a.minutes - minutes) - Math.abs(b.minutes - minutes));
    const distance = Math.abs(closest[0].minutes - minutes);
    timeframes.push({ line, value: raw, suggestions: closest.filter((item) => Math.abs(item.minutes - minutes) === distance).slice(0, 2).map((item) => item.value), start: valueStart, end: valueStart + raw.length });
  }
  return { diagnostics, timeframes };
}

export default function ScriptIndicatorManagement() {
  const [indicators, setIndicators] = useState<ScriptIndicatorItem[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    total: 0,
    active: 0,
    inactive: 0,
    draft: 0,
    testing: 0,
    assignedPlans: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  // Create / Edit Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<ScriptIndicatorItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [codeSourceMode, setCodeSourceMode] = useState<"UPLOAD" | "EDITOR">("EDITOR");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pineCheck, setPineCheck] = useState<PineCheckState>({ status: "idle", message: "" });
  const pineCheckRunRef = useRef(0);
  const scriptEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const lineGutterRef = useRef<HTMLDivElement | null>(null);
  const [activeScriptLine, setActiveScriptLine] = useState<number | null>(null);

  // Quick View / Copy Code Modal
  const [viewingScript, setViewingScript] = useState<{
    name: string;
    version: string;
    code: string;
  } | null>(null);

  // Delete Modal
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status updating indicator ID
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AbortController ref to cancel obsolete in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search with faster 250ms response
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  useEffect(() => {
    fetchIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, statusFilter, planFilter]);

  useEffect(() => {
    fetchPlans();
  }, []);

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
    // Cancel any ongoing fetch request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (planFilter !== "ALL") params.set("planId", planFilter);

      const res = await fetch(`/api/admin/scripts?${params.toString()}`, {
        signal: controller.signal,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load script indicators");
      }

      setIndicators(json.data || []);
      if (json.summary) setSummary(json.summary);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Ignore aborted requests
      }
      setError(err.message || "Failed to load script indicators");
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }

  function handleCopy(text: string, id: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  function goToScriptLine(line: number) {
    const editor = scriptEditorRef.current;
    if (!editor || !Number.isFinite(line)) return;
    const targetLine = Math.max(1, Math.min(line, form.scriptCode.split("\n").length));
    const offset = form.scriptCode.split("\n").slice(0, targetLine - 1).reduce((total, item) => total + item.length + 1, 0);
    editor.focus();
    editor.setSelectionRange(offset, offset);
    setActiveScriptLine(targetLine);
    requestAnimationFrame(() => {
      if (lineGutterRef.current) lineGutterRef.current.scrollTop = editor.scrollTop;
    });
  }

  function applyTimeframeSuggestion(finding: TimeframeFinding, suggestion: string) {
    setForm((previous) => {
      if (previous.scriptCode.slice(finding.start, finding.end) !== finding.value) return previous;
      return {
        ...previous,
        scriptCode: previous.scriptCode.slice(0, finding.start) + suggestion + previous.scriptCode.slice(finding.end),
      };
    });
  }

  function handleDownloadCode(name: string, version: string, code: string) {
    if (!code) return;
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    element.download = `${sanitizedName}_${version || "v1"}.pine`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function openCreateModal() {
    setEditingIndicator(null);
    setForm(EMPTY_FORM);
    setCodeSourceMode("EDITOR");
    setUploadedFileName(null);
    setFormError(null);
    setPineCheck({ status: "idle", message: "" });
    setFormModalOpen(true);
  }

  function openEditModal(ind: ScriptIndicatorItem) {
    setEditingIndicator(ind);
    const latestScript = ind.versions[0]?.script || "";
    setForm({
      name: ind.name,
      description: ind.description || "",
      scriptCode: latestScript,
      status: ind.status === "ARCHIVED" ? "INACTIVE" : ind.status,
      version: ind.currentVersion || "v1.0.0",
      planIds: ind.planAccess.map((p) => p.plan.id),
    });
    setCodeSourceMode("EDITOR");
    setUploadedFileName(null);
    setFormError(null);
    setPineCheck({ status: "idle", message: "" });
    setFormModalOpen(true);
  }

  // Handle local file upload (.txt, .pine, etc.)
  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".txt") && !file.name.endsWith(".pine") && !file.name.endsWith(".ps")) {
      setFormError("Please upload a .txt or .pine file containing Pine Script code.");
      return;
    }

    setUploadedFileName(file.name);
    setFormError(null);
    setPineCheck({ status: "checking", message: "PineTS is checking the uploaded script…" });

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setForm((prev) => ({
          ...prev,
          scriptCode: content,
          // Suggest name from file name if name is empty
          name: prev.name ? prev.name : file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
        }));
      }
    };
    reader.onerror = () => {
      setFormError("Failed to read the selected file. Please try again.");
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Please enter an indicator name");
      return;
    }

    if (!form.scriptCode.trim()) {
      setFormError("Please upload a text file or enter Pine Script code");
      return;
    }

    if (pineCheck.status === "checking" || pineCheck.status === "idle") {
      setFormError("Wait for the PineTS script check to finish before saving.");
      return;
    }
    if (pineCheck.status === "failed") {
      setFormError(`PineTS could not run this script: ${pineCheck.message}`);
      return;
    }

    setSubmitting(true);
    try {
      const url = editingIndicator
        ? `/api/admin/scripts/${editingIndicator.id}`
        : "/api/admin/scripts";
      const method = editingIndicator ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save Pine script indicator");
      }

      setFormModalOpen(false);
      await fetchIndicators();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong saving the indicator");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatusChange(
    indicatorId: string,
    newStatus: "ACTIVE" | "TESTING" | "DRAFT" | "INACTIVE"
  ) {
    setStatusUpdatingId(indicatorId);
    try {
      const res = await fetch(`/api/admin/scripts/${indicatorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update status");
      }
      setIndicators((prev) =>
        prev.map((ind) => (ind.id === indicatorId ? { ...ind, status: newStatus } : ind))
      );
      // Update stats
      await fetchIndicators();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteModalId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/scripts/${deleteModalId}`, { method: "DELETE" });
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
  const scriptVerification = verifyPineScript(form.scriptCode);

  useEffect(() => {
    if (!formModalOpen || !form.scriptCode.trim()) {
      setPineCheck({ status: "idle", message: "" });
      return;
    }

    const runId = ++pineCheckRunRef.current;
    let session: { stop: () => void } | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    setPineCheck({ status: "checking", message: "Waiting for code edits to finish…" });

    const runCheck = async () => {
      try {
        const { PineEngine } = await import("@luxalgo/vela-pinets");
        const engine = new PineEngine();
        const prepared = await engine.prepare(form.scriptCode, `admin-verifier-${runId}`);
        const now = Date.now();
        const bars = Array.from({ length: 250 }, (_, index) => {
          const close = 1.08 + Math.sin(index / 8) * 0.006 + index * 0.00001;
          return {
            time: now - (250 - index) * 5 * 60_000,
            open: close - 0.0004,
            high: close + 0.001,
            low: close - 0.001,
            close,
            volume: 1000 + index * 3,
          };
        });

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            if (timeout) clearTimeout(timeout);
            if (error) reject(error); else resolve();
          };
          timeout = setTimeout(() => {
            session?.stop();
            finish(new Error("PineTS check timed out after 20 seconds."));
          }, 20_000);
          session = engine.execute({
            prepared,
            market: { symbol: "EURUSD", timeframe: "5m" },
            bars,
            mode: "static",
          }, {
            onModel: () => undefined,
            onDone: () => finish(),
            onError: (error) => finish(error),
          });
        });

        if (!cancelled && pineCheckRunRef.current === runId) {
          setPineCheck({ status: "passed", message: "PineTS prepared and executed this script on sample bars." });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown PineTS error.";
        const line = /\bline\s+(\d+)\b/i.exec(message)?.[1];
        if (!cancelled && pineCheckRunRef.current === runId) setPineCheck({ status: "failed", message, line: line ? Number(line) : undefined });
      }
    };

    const debounce = setTimeout(() => {
      setPineCheck({ status: "checking", message: "Preparing and running with PineTS…" });
      void runCheck();
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
      if (timeout) clearTimeout(timeout);
      session?.stop();
    };
  }, [form.scriptCode, formModalOpen]);

  const firstIssueLine = pineCheck.status === "failed" ? pineCheck.line : undefined;
  const firstTimeframeLine = scriptVerification.timeframes[0]?.line;

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500">
              <FileCode className="h-4 w-4" />
            </div>
            <span>Pine Script Indicators</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create and distribute Pine Script indicator codes with zero extra clutter. Upload a .txt/.pine file or code directly, set plan access, and manage lifecycle states.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            type="button"
            onClick={fetchIndicators}
            disabled={loading}
            title="Refresh indicators"
            className=" inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 " >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>

          {/* Create */}
          <button
            type="button"
            onClick={openCreateModal}
            className=" inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 text-sm font-medium text-white hover:bg-sky-400 active:bg-sky-600 transition-all duration-200 cursor-pointer " >
            <Plus className="h-4 w-4" />
            <span className="whitespace-nowrap">Create Indicator</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Indicators</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total}</span>
            <span className="text-xs text-sky-500 font-bold">Scripts</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Live</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-500">{summary.active}</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Testing / Draft</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-500">
              {summary.testing + summary.draft}
            </span>
            <span className="text-[11px] text-amber-500 font-semibold">Pending</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned To Plans</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-500">{summary.assignedPlans}</span>
            <span className="text-[11px] text-indigo-500 font-semibold">Mappings</span>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by indicator name or script content..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Dropdown / Pills */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE (Live)</option>
                <option value="TESTING">TESTING (QA)</option>
                <option value="DRAFT">DRAFT (WIP)</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Assigned Plans Filter Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Plan:
              </span>
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="ALL">All Plans</option>
                <option value="UNASSIGNED">Unassigned (No Plans)</option>
                {availablePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Show:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {(debouncedSearch || statusFilter !== "ALL" || planFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                  setStatusFilter("ALL");
                  setPlanFilter("ALL");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Tags Bar */}
        {(debouncedSearch || statusFilter !== "ALL" || planFilter !== "ALL") && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3 text-sky-500" /> Active Filters:
            </span>

            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-semibold">
                <span>Search: &quot;{debouncedSearch}&quot;</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                  }}
                  className="hover:text-sky-800 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                <span>Status: {statusFilter}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className="hover:text-emerald-800 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {planFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold">
                <span>
                  Plan:{" "}
                  {planFilter === "UNASSIGNED"
                    ? "Unassigned"
                    : availablePlans.find((p) => p.id === planFilter)?.name || planFilter}
                </span>
                <button
                  type="button"
                  onClick={() => setPlanFilter("ALL")}
                  className="hover:text-indigo-800 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <span className="text-[11px] text-slate-400 ml-auto">
              Found <strong className="text-slate-900 dark:text-white font-bold">{total}</strong> matching indicator{total === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {/* ── Table / Indicators List ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/90 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Indicator Name</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Pine Script Code</th>
                <th className="px-4 py-3">Assigned Plans</th>
                <th className="px-4 py-3">Current State</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && indicators.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-sky-500 mb-2" />
                    Loading Pine Script indicators...
                  </td>
                </tr>
              )}

              {error && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-red-500">
                    <AlertCircle className="h-5 w-5 mx-auto mb-1.5" />
                    {error}
                  </td>
                </tr>
              )}

              {indicators.map((ind) => {
                const latestVersion = ind.versions[0];
                const scriptText = latestVersion?.script || "";
                const lineCount = scriptText ? scriptText.split("\n").length : 0;
                const charCount = scriptText ? scriptText.length : 0;

                return (
                  <tr
                    key={ind.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Indicator Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 shrink-0 mt-0.5">
                          <Code2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {ind.name}
                          </p>
                          {ind.description ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {ind.description}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Created {new Date(ind.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Version */}
                    <td className="px-4 py-3.5 text-xs">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-[11px]">
                        {ind.currentVersion || "v1.0.0"}
                      </span>
                    </td>

                    {/* Pine Script Code Preview & Quick Copy */}
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingScript({
                              name: ind.name,
                              version: ind.currentVersion || "v1.0.0",
                              code: scriptText,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-500 transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 text-sky-500" />
                          <span>{lineCount} lines ({charCount} B)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(scriptText, ind.id)}
                          title="Copy Pine Script Code"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-sky-500 hover:border-sky-500/40 transition-colors cursor-pointer"
                        >
                          {copiedId === ind.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Assigned Plans */}
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
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
                          <span className="text-slate-400 italic text-[11px]">All Plans / Unassigned</span>
                        )}
                      </div>
                    </td>

                    {/* Current State / Status dropdown */}
                    <td className="px-4 py-3.5">
                      <div className="relative inline-block">
                        <select
                          value={ind.status}
                          disabled={statusUpdatingId === ind.id}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              ind.id,
                              e.target.value as "ACTIVE" | "TESTING" | "DRAFT" | "INACTIVE"
                            )
                          }
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider border cursor-pointer focus:outline-none transition-all ${ind.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : ind.status === "TESTING"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                : ind.status === "DRAFT"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                            }`}
                        >
                          <option value="ACTIVE" className="text-emerald-500 font-bold">
                            ACTIVE
                          </option>
                          <option value="TESTING" className="text-blue-500 font-bold">
                            TESTING
                          </option>
                          <option value="DRAFT" className="text-amber-500 font-bold">
                            DRAFT
                          </option>
                          <option value="INACTIVE" className="text-slate-500 font-bold">
                            INACTIVE
                          </option>
                        </select>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingScript({
                              name: ind.name,
                              version: ind.currentVersion || "v1.0.0",
                              code: scriptText,
                            })
                          }
                          title="View Pine Script"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-500 transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
{/* 
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadCode(
                              ind.name,
                              ind.currentVersion || "v1.0.0",
                              scriptText
                            )
                          }
                          title="Download .pine File"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-500 transition-colors cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                        </button> */}

                        <button
                          type="button"
                          onClick={() => openEditModal(ind)}
                          title="Edit Indicator & Code"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-sky-500/40 hover:text-sky-500 transition-colors cursor-pointer"
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
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    <FileCode className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    No Pine script indicators found. Click &quot;Create Pine Indicator&quot; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
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

      {/* ==================== CREATE / EDIT MODAL ==================== */}
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
              className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-sky-500" />
                    <span>{editingIndicator ? `Edit: ${editingIndicator.name}` : "Create Pine Script Indicator"}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload a .txt/.pine file or write Pine Script code directly, select subscription plans, and configure status.
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
                {/* 1. Basic Info */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Indicator Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. SmartFlow Algo Trend Oscillator"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Version Tag
                      </label>
                      <input
                        type="text"
                        value={form.version}
                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                        placeholder="v1.0.0"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Brief Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="e.g. Breakout and pullback momentum strategy with EMA filters"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* 2. Pine Script Code Options */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                      Pine Script Source Code *
                    </label>

                    {/* 2 Option Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setCodeSourceMode("UPLOAD")}
                        className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${codeSourceMode === "UPLOAD"
                            ? "bg-sky-500 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>1. Upload .txt / .pine File</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCodeSourceMode("EDITOR")}
                        className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${codeSourceMode === "EDITOR"
                            ? "bg-sky-500 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        <span>2. Write in Code Editor</span>
                      </button>
                    </div>
                  </div>

                  {/* Option 1: Upload File Component */}
                  {codeSourceMode === "UPLOAD" && (
                    <div className="border-2 border-dashed border-sky-500/30 rounded-xl p-5 bg-sky-500/5 dark:bg-sky-950/20 text-center relative hover:border-sky-500/60 transition-colors">
                      <input
                        type="file"
                        accept=".txt,.pine,.ps"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="h-7 w-7 mx-auto text-sky-500 mb-2" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {uploadedFileName
                          ? `Loaded: ${uploadedFileName}`
                          : "Click or drag & drop to upload .txt or .pine file"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        The script will automatically be extracted and loaded into the code editor below.
                      </p>
                    </div>
                  )}

                  {/* Option 2 / Shared Code Editor Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>
                        {form.scriptCode ? `${form.scriptCode.split("\n").length} lines • ${form.scriptCode.length} chars` : "No code entered"}
                      </span>
                      {form.scriptCode && (
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, scriptCode: "" }))}
                          className="text-red-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex h-64 min-h-[160px] resize-y overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/30">
                      <div
                        ref={lineGutterRef}
                        aria-hidden="true"
                        className="w-12 shrink-0 overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-slate-200/60 dark:bg-slate-950/60 px-2 py-3.5 text-right font-mono text-xs leading-5 text-slate-400 select-none"
                      >
                        {form.scriptCode.split("\n").map((_, index) => {
                          const line = index + 1;
                          const isIssueLine = line === firstIssueLine || scriptVerification.timeframes.some((item) => item.line === line);
                          return (
                            <button
                              key={line}
                              type="button"
                              tabIndex={-1}
                              onClick={() => goToScriptLine(line)}
                              className={`block w-full leading-5 hover:text-sky-500 ${isIssueLine ? "font-bold text-amber-500" : ""} ${activeScriptLine === line ? "text-sky-500" : ""}`}
                              title={`Go to line ${line}`}
                            >{line}</button>
                          );
                        })}
                      </div>
                      <textarea
                        ref={scriptEditorRef}
                        required
                        value={form.scriptCode}
                        onChange={(e) => {
                          setActiveScriptLine(null);
                          setForm((previous) => ({ ...previous, scriptCode: e.target.value }));
                        }}
                        onScroll={(e) => {
                          if (lineGutterRef.current) lineGutterRef.current.scrollTop = e.currentTarget.scrollTop;
                        }}
                        placeholder={`//@version=5\nindicator("My Indicator", overlay=true)\n\n// Write or paste Pine Script code here...`}
                        spellCheck={false}
                        wrap="off"
                        className="no-scrollbar h-full min-h-full min-w-0 flex-1 resize-none overflow-auto border-0 bg-transparent p-3.5 font-mono text-xs leading-5 text-slate-800 dark:text-slate-200 focus:outline-none"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                      />
                    </div>
                    {form.scriptCode.trim() && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/50 p-3 space-y-2" aria-live="polite">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {pineCheck.status === "passed" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            : pineCheck.status === "failed" ? <AlertCircle className="h-4 w-4 text-red-500" />
                              : <Loader2 className="h-4 w-4 animate-spin text-sky-500" />}
                          PineTS verification
                          <span className="font-normal text-slate-400">(same engine as the chart, sample data)</span>
                        </div>
                        {pineCheck.message && (
                          <p className={`text-xs ${pineCheck.status === "failed" ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>
                            {pineCheck.line ? <button type="button" onClick={() => goToScriptLine(pineCheck.line!)} className="font-semibold underline underline-offset-2">Line {pineCheck.line}:</button> : null}
                            {pineCheck.line ? ` ${pineCheck.message}` : pineCheck.message}
                          </p>
                        )}
                        {scriptVerification.timeframes.map((item, index) => (
                          <div key={`timeframe-${index}`} className="flex flex-wrap items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                            <span>
                              <button type="button" onClick={() => goToScriptLine(item.line)} className="font-semibold underline underline-offset-2">Line {item.line}:</button>{" "}
                              timeframe “{item.value}” is unsupported. {item.suggestions.length > 0 ? "Use:" : "Choose a supported minute, daily, weekly, or monthly timeframe."}
                            </span>
                            {item.suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => applyTimeframeSuggestion(item, suggestion)}
                                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                                title={`Replace only this timeframe value with ${suggestion}`}
                              >{suggestion}</button>
                            ))}
                          </div>
                        ))}
                        {scriptVerification.timeframes.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">No unsupported literal request.security timeframes found.</p>}
                        {/* <p className="text-[10px] text-slate-400">A successful sample run does not guarantee identical results on live chart data or TradingView.</p> */}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Assign Plans */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-sky-500 uppercase tracking-wider">
                      Choose Subscription Plans
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {form.planIds.length === 0
                        ? "Available to all / public"
                        : `${form.planIds.length} plan(s) selected`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availablePlans.map((plan) => {
                      const isSelected = form.planIds.includes(plan.id);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => togglePlanSelection(plan.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${isSelected
                              ? "bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400"
                              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                            }`}
                        >
                          <span className="truncate">{plan.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-sky-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Current State / Status */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-bold text-sky-500 uppercase tracking-wider mb-1">
                    Current State / Status
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: "ACTIVE", label: "ACTIVE", desc: "Live to users", color: "emerald" },
                        { id: "TESTING", label: "TESTING", desc: "QA testing only", color: "blue" },
                        { id: "DRAFT", label: "DRAFT", desc: "Work in progress", color: "amber" },
                        { id: "INACTIVE", label: "INACTIVE", desc: "Disabled", color: "slate" },
                      ] as const
                    ).map((st) => {
                      const isCurrent = form.status === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setForm({ ...form, status: st.id })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${isCurrent
                              ? "bg-sky-500/10 border-sky-500 ring-1 ring-sky-500/30"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                            }`}
                        >
                          <p
                            className={`text-xs font-bold ${isCurrent ? "text-sky-500" : "text-slate-700 dark:text-slate-300"
                              }`}
                          >
                            {st.label}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{st.desc}</p>
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
                    disabled={submitting || pineCheck.status === "checking" || pineCheck.status === "idle" || pineCheck.status === "failed"}
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

      {/* ==================== VIEW & COPY SCRIPT MODAL ==================== */}
      <AnimatePresence>
        {viewingScript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setViewingScript(null)}
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-sky-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {viewingScript.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">Version: {viewingScript.version}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(viewingScript.code, "modal")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    {copiedId === "modal" ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  {/* <button
                    type="button"
                    onClick={() =>
                      handleDownloadCode(
                        viewingScript.name,
                        viewingScript.version,
                        viewingScript.code
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button> */}

                  <button
                    type="button"
                    onClick={() => setViewingScript(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div
                className="flex-1 overflow-auto rounded-xl bg-slate-100 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 no-scrollbar"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre leading-relaxed">
                  {viewingScript.code || "// No script code available for this version."}
                </pre>
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
                  Delete Pine Indicator
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete this Pine Script indicator? This will remove its source code versions and all assigned plan permissions.
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
