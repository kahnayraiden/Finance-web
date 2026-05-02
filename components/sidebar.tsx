"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  RefreshCw,
  Wallet,
  Settings2,
  FlaskConical,
  LogOut,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "Subscriptions",
    href: "/subscriptions",
    icon: RefreshCw,
  },
  {
    label: "Credit Cards",
    href: "/credit-cards",
    icon: CreditCard,
  },
];

const toolNavItems = [
  {
    label: "Email Parser",
    href: "/email-test",
    icon: FlaskConical,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings2,
  },
];

export default function Sidebar({ role }: { role: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">FinanceApp</h1>
            <p className="text-xs text-slate-400">Personal Finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="pt-4 pb-2">
          <div className="h-px bg-slate-100" />
          <p className="text-xs font-medium text-slate-400 mt-3 mb-1 px-3">Tools</p>
        </div>

        {toolNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Admin Section */}
        {role === "admin" && (
          <>
            <div className="pt-4 pb-2">
              <div className="h-px bg-slate-100" />
              <p className="text-xs font-medium text-slate-400 mt-3 mb-1 px-3">Admin</p>
            </div>
            <Link
              href="/admin/users"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                pathname === "/admin/users"
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Users
                className={cn(
                  "h-5 w-5 transition-colors",
                  pathname === "/admin/users" ? "text-blue-600" : "text-slate-400"
                )}
              />
              User Management
            </Link>
          </>
        )}

        {/* Logout */}
        <div className="pt-4 pb-2">
          <div className="h-px bg-slate-100" />
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="h-5 w-5 text-red-500" />
          Logout
        </button>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Quick Stats</p>
          <p className="text-sm text-slate-700">Track your finances with ease.</p>
        </div>
      </div>
    </aside>
  );
}
