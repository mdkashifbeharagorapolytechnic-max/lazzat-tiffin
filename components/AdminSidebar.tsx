"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    name: "Meal Requests",
    href: "/admin/meal-requests",
    icon: "🍱",
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
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

      {/* MOBILE TOP BAR */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 lg:hidden">

        <div>
          <div className="text-lg font-extrabold text-green-600">
            LAZZAT TIFFIN
          </div>

          <div className="text-xs text-gray-500">
            Admin Panel
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
        >
          Logout
        </button>
      </div>

      {/* MOBILE MENU */}
      <div className="border-b border-gray-200 bg-white px-3 py-3 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">

          {menuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                  active
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <span>{item.icon}</span>

                <span>{item.name}</span>
              </Link>
            );
          })}

        </div>
      </div>
    </>
  );
}