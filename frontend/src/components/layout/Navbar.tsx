import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/libs/utils";
import { useAuth } from "@/features/auth/store";
import { useUnseenCount } from "@/features/files/hooks";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/files", label: "My Files" },
  { to: "/shared", label: "Shared with me" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const unseen = useUnseenCount(!!user?.emailVerified).data ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn("relative text-sm", isActive ? "font-medium text-black" : "text-neutral-500 hover:text-black");

  const links = LINKS.map(({ to, label }) => (
    <NavLink key={to} to={to} className={linkClass} onClick={() => setMenuOpen(false)}>
      {label}
      {to === "/shared" && unseen > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
          {unseen > 9 ? "9+" : unseen}
          <span className="sr-only"> new</span>
        </span>
      )}
    </NavLink>
  ));

  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/dashboard" className="font-semibold tracking-tight">SecuShare</Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">{links}</nav>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-sm text-neutral-600 lg:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" asChild aria-label="Settings">
            <NavLink to="/settings"><Settings className="h-4 w-4" /></NavLink>
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {menuOpen && <nav className="flex flex-col gap-3 border-t px-4 py-3 md:hidden" aria-label="Main">{links}</nav>}
    </header>
  );
}
