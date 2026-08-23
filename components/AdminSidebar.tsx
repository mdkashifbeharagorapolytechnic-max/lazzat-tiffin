"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const menuItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: "📊",
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: "👥",
  },
  {
    name: "Attendance",
    href: "/admin/attendance",
    icon: "📅",
  },
  {
    name: "Billing",
    href: "/admin/billing",
    icon: "💰",
  },
  {
    name: "Payments",
    href: "/admin/payments",
    icon: "💳",
  },
  {
    name: "Today Menu",
    href: "/admin/menu",
    icon: "🍽️",
  },
  {
    name: "Meal Requests",
    href: "/admin/meal-requests",
    icon: "🍱",
  },
  {
    name: "Extra Meal Requests",
    href: "/admin/extra-meal-requests",
    icon: "👨‍👩‍👧‍👦",
  },
  {
    name: "Reviews",
    href: "/admin/reviews",
    icon: "⭐",
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: "📈",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: "⚙️",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();

    setMobileOpen(false);

    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  }

  function handleMenuClick() {
    setMobileOpen(false);
  }

  return (
    <>
      {/* ===================================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ===================================================== */}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-gray-200 bg-white lg:flex lg:flex-col">

        {/* LOGO */}
        <div className="border-b border-gray-200 px-6 py-6">
          <div className="text-2xl font-extrabold text-green-600">
            LAZZAT TIFFIN
          </div>

          <div className="mt-1 text-sm font-medium text-gray-500">
            Admin Panel
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-1">

            {menuItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-lg">
                    {item.icon}
                  </span>

                  <span>{item.name}</span>
                </Link>
              );
            })}

          </div>
        </nav>

        {/* LOGOUT */}
        <div className="border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <span className="text-lg">
              🚪
            </span>

            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ===================================================== */}
      {/* MOBILE TOP BAR */}
      {/* ===================================================== */}

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm lg:hidden">

        {/* HAMBURGER */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin menu"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-2xl text-green-700 transition hover:bg-green-100"
        >
          ☰
        </button>

        {/* TITLE */}
        <div className="text-center">
          <div className="text-lg font-extrabold text-green-600">
            LAZZAT TIFFIN
          </div>

          <div className="text-xs font-medium text-gray-500">
            Admin Panel
          </div>
        </div>

        {/* LOGOUT */}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600 transition hover:bg-red-100"
        >
          🚪
        </button>
      </div>

      {/* ===================================================== */}
      {/* MOBILE OVERLAY */}
      {/* ===================================================== */}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ===================================================== */}
      {/* MOBILE LEFT DRAWER */}
      {/* ===================================================== */}

      <aside
        className={`fixed left-0 top-0 z-[60] flex h-screen w-72 flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* DRAWER HEADER */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-5">

          <div>
            <div className="text-xl font-extrabold text-green-600">
              LAZZAT TIFFIN
            </div>

            <div className="mt-1 text-xs font-medium text-gray-500">
              Admin Panel
            </div>
          </div>

          {/* CLOSE */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl text-gray-700 transition hover:bg-gray-200"
          >
            ✕
          </button>

        </div>

        {/* MOBILE MENU */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">

          <div className="space-y-1">

            {menuItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMenuClick}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                    active
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex w-7 justify-center text-xl">
                    {item.icon}
                  </span>

                  <span>{item.name}</span>
                </Link>
              );
            })}

          </div>

        </nav>

        {/* MOBILE LOGOUT */}
        <div className="border-t border-gray-200 p-4">

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <span className="flex w-7 justify-center text-xl">
              🚪
            </span>

            <span>Logout</span>
          </button>

        </div>

      </aside>
    </>
  );
}