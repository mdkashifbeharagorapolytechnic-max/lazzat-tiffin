"use client";

import Link from "next/link";

export default function AdminNavbar() {
  return (
    <nav className="w-full bg-gray-900 px-4 py-4 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/admin"
          className="text-xl font-bold"
        >
          Lazzat Tiffin Admin
        </Link>

        <div className="flex gap-4 text-sm font-semibold">
          <Link
            href="/admin"
            className="hover:text-orange-400"
          >
            Dashboard
          </Link>

          <Link
            href="/admin/attendance"
            className="hover:text-orange-400"
          >
            Attendance
          </Link>

          <Link
            href="/admin/reviews"
            className="hover:text-orange-400"
          >
            Reviews
          </Link>
        </div>
      </div>
    </nav>
  );
}