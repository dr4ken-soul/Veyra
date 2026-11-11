"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/app/cases", label: "Cases" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/settings", label: "Settings" }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  async function logout() {
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out could not be completed. Try again.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sign out could not be completed. Try again.");
    }
  }

  function active(href: string) {
    return pathname === href || (href === "/app/cases" && pathname.startsWith("/app/cases/"));
  }

  return (
    <div className="app-root">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="app-sidebar">
        <Link className="brand-word sidebar-brand" href="/app/cases">Veyra</Link>
        <p className="workspace-label">LOCAL WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Workspace">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={"sidebar-link " + (active(item.href) ? "is-active" : "")}
            >{item.label}</Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="mode-label">Simulated mode</span>
          <button className="text-button" type="button" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-title">
            <span className="brand-word mobile-brand">Veyra</span>
            <span className="topbar-divider" aria-hidden="true">/</span>
            <span>Local workspace</span>
          </div>
          <div className="topbar-actions">
            <span className="mode-label">Simulated</span>
            <button className="menu-trigger app-menu-trigger" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>Menu</button>
            <button className="text-button desktop-signout" type="button" onClick={logout}>Sign out</button>
          </div>
        </header>
        {logoutError && <p className="toast-error" role="alert">{logoutError}</p>}
        <main className="app-content" id="main-content">{children}</main>
      </div>

      <dialog ref={dialogRef} className="app-menu-dialog" aria-label="Workspace navigation" onClose={() => setMenuOpen(false)}>
        <div className="dialog-head">
          <span className="brand-word">Veyra</span>
          <button className="icon-button" type="button" aria-label="Close workspace menu" onClick={() => setMenuOpen(false)}>Close</button>
        </div>
        <nav className="mobile-app-nav" aria-label="Workspace">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >{item.label}</Link>
          ))}
          <button className="text-button" type="button" onClick={logout}>Sign out</button>
        </nav>
      </dialog>
    </div>
  );
}