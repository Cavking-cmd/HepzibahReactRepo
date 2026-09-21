import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Thin, non-blocking banner shown while the device has lost its network
 * connection. The app keeps working (static shell + previously loaded UI are
 * served from the service worker), but live data cannot be fetched — the
 * banner makes that state explicit instead of silently showing stale data.
 *
 * Auth-safe: this component only reads navigator.onLine / online-offline
 * events. It never touches the API, tokens, or localStorage.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    function onOnline() { setOnline(true); }
    function onOffline() { setOnline(false); }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white shadow-md"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px))", height: "auto", boxSizing: "border-box" }}
    >
      <span className="flex items-center gap-1.5">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        You&rsquo;re offline &mdash; live data can&rsquo;t be fetched right now
      </span>
    </div>
  );
}
