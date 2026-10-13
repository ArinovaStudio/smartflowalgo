import { LoaderCircle } from "lucide-react";

interface UserPortalLoaderProps {
  statusMessage?: string;
  subMessage?: string;
}

export default function UserPortalLoader({
  statusMessage = "Preparing Your Workspace",
  subMessage = "Syncing your trading account and indicators...",
}: UserPortalLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white text-slate-900 dark:bg-[#050811] dark:text-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-6">
        <LoaderCircle className="h-6 w-6 shrink-0 animate-spin text-sky-500 motion-reduce:animate-none" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">{statusMessage}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subMessage}</p>
        </div>
      </div>
    </div>
  );
}
