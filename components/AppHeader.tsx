"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  History,
  House,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOutAndRedirect } from "@/lib/auth/signOut";

interface AppHeaderProps {
  userEmail: string;
}

const SIDEBAR_COLLAPSE_STORAGE_KEY = "ai-midi-sidebar-collapsed";

const desktopNavItems = [
  { href: "/", label: "Generate", icon: House },
  { href: "/generations", label: "Generations", icon: History },
  { href: "/account", label: "Account", icon: User },
];

const AppHeader: React.FC<AppHeaderProps> = ({ userEmail }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [hasLoadedSidebarPreference, setHasLoadedSidebarPreference] =
    React.useState(false);

  React.useEffect(() => {
    const savedState = window.localStorage.getItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
    );
    setIsSidebarCollapsed(savedState === "1");
    setHasLoadedSidebarPreference(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoadedSidebarPreference) return;

    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      isSidebarCollapsed ? "1" : "0",
    );
  }, [isSidebarCollapsed, hasLoadedSidebarPreference]);

  const navItemClass = (isActive: boolean, isCollapsed: boolean) =>
    `flex items-center rounded-md py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
      isActive
        ? "bg-surface-700 text-text-primary"
        : "text-text-muted hover:bg-surface-800 hover:text-text-primary"
    } ${isCollapsed ? "justify-center px-2" : "gap-2 px-3"}`;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      const supabase = createClient();
      await signOutAndRedirect(supabase, router);
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Failed to sign out.",
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <header className="md:hidden sticky top-0 z-50 border-b border-surface-600/50 bg-surface-900/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                AI MIDI
              </p>
              <p className="text-sm font-medium text-text-primary">Generator</p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isSigningOut
                  ? "bg-surface-700 text-text-muted cursor-not-allowed"
                  : "bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary"
              }`}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>

          <nav className="mt-3 flex items-center gap-2">
            <Link href="/" className={navItemClass(pathname === "/", false)}>
              Generate
            </Link>
            <Link
              href="/generations"
              className={navItemClass(pathname === "/generations", false)}
            >
              Generations
            </Link>
            <Link
              href="/account"
              className={navItemClass(pathname === "/account", false)}
            >
              Account
            </Link>
          </nav>

          <p className="mt-3 truncate text-xs text-text-muted">{userEmail}</p>

          {signOutError && (
            <p className="mt-2 text-xs text-red-400">{signOutError}</p>
          )}
        </div>
      </header>

      <aside
        className={`hidden md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col md:border-r md:border-surface-600/50 md:bg-surface-900/95 md:backdrop-blur-sm ${
          isSidebarCollapsed ? "md:w-20 md:basis-20" : "md:w-72 md:basis-72"
        }`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`border-b border-surface-600/50 ${
              isSidebarCollapsed ? "px-2 py-4" : "px-6 pt-8 pb-6"
            }`}
          >
            <div
              className={`flex ${
                isSidebarCollapsed
                  ? "justify-center"
                  : "items-start justify-between gap-4"
              }`}
            >
              {!isSidebarCollapsed && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">
                    AI MIDI
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-text-primary">
                    Generator
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    Prompt, generate, and save structured MIDI ideas from a
                    single workspace.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className={`rounded-md border border-surface-600 bg-surface-800 text-text-secondary hover:text-text-primary hover:border-surface-500 transition-colors ${
                  isSidebarCollapsed ? "p-2" : "p-2.5"
                }`}
                aria-label={
                  isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
                title={
                  isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen size={16} />
                ) : (
                  <PanelLeftClose size={16} />
                )}
              </button>
            </div>

            {isSidebarCollapsed && (
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                AI
              </p>
            )}
          </div>

          <nav
            className={`px-3 py-5 flex flex-col gap-1 ${
              isSidebarCollapsed ? "items-center" : ""
            }`}
          >
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navItemClass(
                    pathname === item.href,
                    isSidebarCollapsed,
                  )}
                  title={isSidebarCollapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <Icon size={15} className="shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div
            className={`mt-auto border-t border-surface-600/50 ${
              isSidebarCollapsed ? "px-2 py-4" : "px-4 py-5"
            }`}
          >
            {!isSidebarCollapsed && (
              <p className="truncate text-xs text-text-muted mb-3">
                {userEmail}
              </p>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={`rounded text-xs font-medium transition-colors ${
                isSigningOut
                  ? "bg-surface-700 text-text-muted cursor-not-allowed"
                  : "bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary"
              } ${isSidebarCollapsed ? "h-10 w-10 mx-auto flex items-center justify-center" : "w-full px-3 py-2"}`}
              title={isSidebarCollapsed ? "Sign out" : undefined}
              aria-label="Sign out"
            >
              {isSidebarCollapsed ? (
                isSigningOut ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <LogOut size={15} />
                )
              ) : (
                <>{isSigningOut ? "Signing out..." : "Sign out"}</>
              )}
            </button>

            {signOutError && !isSidebarCollapsed && (
              <p className="mt-2 text-xs text-red-400">{signOutError}</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppHeader;
