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
  Moon,
  Sun,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOutAndRedirect } from "@/lib/auth/signOut";

interface AppHeaderProps {
  userEmail: string;
  variant?: "sidebar" | "compact";
}

const SIDEBAR_COLLAPSE_STORAGE_KEY = "ai-midi-sidebar-collapsed";
const THEME_STORAGE_KEY = "ai-midi-theme";
type ThemeMode = "dark" | "light";

const desktopNavItems = [
  { href: "/", label: "Generate", icon: House },
  { href: "/generations", label: "Generations", icon: History },
  { href: "/account", label: "Account", icon: User },
];

const applyTheme = (theme: ThemeMode) => {
  document.documentElement.setAttribute("data-theme", theme);
};

const AppHeader: React.FC<AppHeaderProps> = ({
  userEmail,
  variant = "sidebar",
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState<ThemeMode>("dark");
  const [hasLoadedSidebarPreference, setHasLoadedSidebarPreference] =
    React.useState(false);
  const [hasLoadedThemePreference, setHasLoadedThemePreference] =
    React.useState(false);

  React.useEffect(() => {
    const savedState = window.localStorage.getItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
    );
    setIsSidebarCollapsed(savedState === "1");
    setHasLoadedSidebarPreference(true);
  }, []);

  React.useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const normalizedTheme: ThemeMode = savedTheme === "light" ? "light" : "dark";

    setThemeMode(normalizedTheme);
    applyTheme(normalizedTheme);
    setHasLoadedThemePreference(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoadedSidebarPreference) return;

    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      isSidebarCollapsed ? "1" : "0",
    );
  }, [isSidebarCollapsed, hasLoadedSidebarPreference]);

  React.useEffect(() => {
    if (!hasLoadedThemePreference) return;

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyTheme(themeMode);
  }, [themeMode, hasLoadedThemePreference]);

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

  const handleThemeToggle = () => {
    setThemeMode((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  };

  const themeToggleLabel =
    themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme";

  if (variant === "compact") {
    return (
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex w-full max-w-6xl items-start justify-between px-4 pt-4 sm:px-6 md:px-8 md:pt-6">
          <Link
            href="/"
            className="pointer-events-auto rounded-2xl border border-surface-600/60 bg-surface-900/70 px-4 py-3 backdrop-blur-xl transition-colors hover:border-surface-500/70"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
              AI MIDI
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              Composer
            </p>
          </Link>

          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <nav className="items-center gap-1 rounded-2xl border border-surface-600/60 bg-surface-900/70 p-1 backdrop-blur-xl sm:flex">
                {desktopNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] transition-colors ${
                        isActive
                          ? "bg-surface-700 text-text-primary"
                          : "text-text-secondary hover:bg-surface-800 hover:text-text-primary"
                      }`}
                    >
                      <Icon size={13} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-1 rounded-2xl border border-surface-600/60 bg-surface-900/70 p-1 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary"
                  aria-label={themeToggleLabel}
                  title={themeToggleLabel}
                >
                  {themeMode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    isSigningOut
                      ? "cursor-not-allowed bg-surface-700 text-text-muted"
                      : "text-text-secondary hover:bg-surface-700 hover:text-text-primary"
                  }`}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  {isSigningOut ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LogOut size={15} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-surface-600/60 bg-surface-900/70 p-1 backdrop-blur-xl sm:hidden">
              <button
                type="button"
                onClick={handleThemeToggle}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary"
                aria-label={themeToggleLabel}
                title={themeToggleLabel}
              >
                {themeMode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isSigningOut
                    ? "cursor-not-allowed bg-surface-700 text-text-muted"
                    : "text-text-secondary hover:bg-surface-700 hover:text-text-primary"
                }`}
                aria-label="Sign out"
                title="Sign out"
              >
                {isSigningOut ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <LogOut size={15} />
                )}
              </button>
            </div>

            <nav className="flex items-center gap-1 rounded-2xl border border-surface-600/60 bg-surface-900/70 p-1 backdrop-blur-xl sm:hidden">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-surface-700 text-text-primary"
                        : "text-text-secondary hover:bg-surface-800 hover:text-text-primary"
                    }`}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon size={14} />
                  </Link>
                );
              })}
            </nav>

            {signOutError && (
              <p className="max-w-xs rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {signOutError}
              </p>
            )}
          </div>
        </div>
      </header>
    );
  }

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

              <div
                className={`flex ${
                  isSidebarCollapsed
                    ? "flex-col items-center gap-2"
                    : "items-center gap-2"
                }`}
              >
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

            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={handleThemeToggle}
                className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded border border-surface-600 bg-surface-800 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-surface-500 hover:text-text-primary"
                aria-label={themeToggleLabel}
                title={themeToggleLabel}
              >
                {themeMode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                <span>{themeMode === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
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
