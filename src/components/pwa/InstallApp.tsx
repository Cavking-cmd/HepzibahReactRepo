import { useEffect, useState } from "react";
import { Download, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import churchLogo from "@/assets/church-logo.png";

const DISMISS_KEY = "pwa-install-dismissed-v1";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

  function isIosSafari(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
  }

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallApp({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault(); // swallow browser's native bar; we show our own button
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already running as an installed app → nothing to offer.
  if (isStandalone()) return null;

  const showAndroidInstall = !!deferred;
  const showIosHelp = isIosSafari() && !dismissed && !showAndroidInstall;
  if (!showAndroidInstall && !showIosHelp) return null;

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    }
    setDeferred(null);
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="sm" className={`gap-1.5 text-xs ${className ?? ""}`}>
            <Download className="h-3.5 w-3.5" /> Install app
          </Button>
        }
      />
      <SheetContent side="bottom" className="pb-[calc(env(safe-area-inset-bottom)+1rem)] rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <img
              src={churchLogo}
              alt=""
              className="h-12 w-12 rounded-full object-contain bg-white p-1 ring-1 ring-border"
            />
            <div>
              <SheetTitle>Install RCCG Hephzibah Parish</SheetTitle>
              <SheetDescription>Open it like an app — with its own icon, full screen, and offline shell.</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {showAndroidInstall ? (
            <Button className="w-full" onClick={handleInstall}>
              <Download className="mr-2 h-4 w-4" /> Install now
            </Button>
          ) : (
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Tap the <span className="inline-flex items-center gap-1 font-medium text-foreground"><Monitor className="h-3.5 w-3.5" /> Share</span> button in Safari.</li>
              <li>2. Choose <span className="font-medium text-foreground">Add to Home Screen</span>.</li>
              <li>3. Tap <span className="font-medium text-foreground">Add</span> — the church icon appears on your home screen.</li>
            </ol>
          )}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
          >
            Not now
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}