"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import type { PortalUser, UserIndicator } from "./types";

interface PortalContextValue {
    user: PortalUser | null;
    indicators: UserIndicator[];
    loading: boolean;
    error: string | null;

    theme: "light" | "dark";
    toggleTheme: () => void;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
    mobileMenuOpen: boolean;
    setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;

    selectedIndicatorIds: string[];
    toggleIndicatorSelection: (id: string, name?: string) => void;
    clearIndicatorSelection: () => void;
    handleApplyAndLaunch: (indicator: UserIndicator) => void;
    appliedToast: string | null;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    // ── Data state (moved from the old page.tsx's UserDashboardClient) ──
    const [user, setUserData] = useState<PortalUser | null>(null);
    const [indicators, setIndicators] = useState<UserIndicator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch("/api/user/dashboard");

                if (!response.ok) {
                    throw new Error("Failed to fetch user data");
                }

                const data = await response.json();

                setUserData(data.user);
                setIndicators(data.indicators ?? []);
            } catch (err) {
                console.error("Error fetching user:", err);
                setError("Failed to load user data");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    // ── UI state (from the old UserPortal.tsx) ──
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([]);
    const [appliedToast, setAppliedToast] = useState<string | null>(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        const initialTheme = savedTheme || "light";
        setTheme(initialTheme);
        document.documentElement.classList.toggle("dark", initialTheme === "dark");
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        window.location.reload();
    };

    const toggleIndicatorSelection = (id: string, name?: string) => {
        setSelectedIndicatorIds((prev) => {
            const exists = prev[0] === id;
            const next = exists ? [] : [id];
            if (!exists && name) {
                setAppliedToast(`Added "${name}" to Live Chart!`);
                setTimeout(() => setAppliedToast(null), 2500);
            }
            return next;
        });
    };

    const clearIndicatorSelection = () => setSelectedIndicatorIds([]);

    const handleApplyAndLaunch = (indicator: UserIndicator) => {
        setSelectedIndicatorIds([indicator.id]);
        setAppliedToast(`Loaded "${indicator.name}" on Live Chart!`);
        setTimeout(() => setAppliedToast(null), 2500);
        router.push("/user/chart");
    };

    return (
        <PortalContext.Provider
            value={{
                user, indicators, loading, error,
                theme, toggleTheme,
                sidebarCollapsed, setSidebarCollapsed,
                mobileMenuOpen, setMobileMenuOpen,
                selectedIndicatorIds, toggleIndicatorSelection, clearIndicatorSelection,
                handleApplyAndLaunch, appliedToast,
            }}
        >
            {children}
        </PortalContext.Provider>
    );
}

export function usePortal() {
    const ctx = useContext(PortalContext);
    if (!ctx) throw new Error("usePortal must be used within a PortalProvider");
    return ctx;
}