"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 top-0 z-50 w-full bg-white/95 shadow-sm backdrop-blur-md">
      <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">

        {/* MOBILE HEADER */}
        <div className="relative flex items-center justify-center md:hidden">

          {/* MENU BUTTON */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="absolute left-0 text-3xl text-gray-700"
          >
            {open ? "✕" : "☰"}
          </button>

          {/* LOGO */}
          <Link
            href="/"
            className="text-xl font-bold text-orange-600 sm:text-2xl"
          >
            🍱 Lazzat Tiffin
          </Link>

        </div>

        {/* MOBILE LOGIN BUTTONS */}
        <div className="mt-3 flex justify-center gap-2 md:hidden">

          <Link
            href="/customer-login"
            className="rounded-lg border border-orange-500 px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 sm:px-4 sm:text-sm"
          >
            👤 Customer Login
          </Link>

          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 sm:px-4 sm:text-sm"
          >
            🔐 Admin Login
          </Link>

        </div>

        {/* DESKTOP NAVBAR */}
        <div className="hidden items-center md:flex">

          {/* LOGO */}
          <Link
            href="/"
            className="text-2xl font-bold text-orange-600"
          >
            🍱 Lazzat Tiffin
          </Link>

          {/* DESKTOP MENU */}
          <ul className="ml-auto flex items-center gap-7 font-medium text-gray-700">

            <li>
              <a
                href="#home"
                className="transition hover:text-orange-500"
              >
                Home
              </a>
            </li>

            <li>
              <a
                href="#plans"
                className="transition hover:text-orange-500"
              >
                Plans
              </a>
            </li>

            <li>
              <a
                href="#menu"
                className="transition hover:text-orange-500"
              >
                Menu
              </a>
            </li>

            <li>
              <a
                href="#reviews"
                className="transition hover:text-orange-500"
              >
                Reviews
              </a>
            </li>

            <li>
              <a
                href="#contact"
                className="transition hover:text-orange-500"
              >
                Contact
              </a>
            </li>

          </ul>

          {/* DESKTOP LOGIN */}
          <div className="ml-6 flex items-center gap-2">

            <Link
              href="/customer-login"
              className="rounded-xl border border-orange-500 px-4 py-2 font-semibold text-orange-600 transition hover:bg-orange-50"
            >
              👤 Customer Login
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              🔐 Admin
            </Link>

          </div>

        </div>
      </nav>

      {/* MOBILE MENU */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-6 py-5 shadow-lg md:hidden">

          <ul className="space-y-5 font-medium text-gray-700">

            <li>
              <a
                href="#home"
                onClick={() => setOpen(false)}
                className="block hover:text-orange-500"
              >
                Home
              </a>
            </li>

            <li>
              <a
                href="#plans"
                onClick={() => setOpen(false)}
                className="block hover:text-orange-500"
              >
                Plans
              </a>
            </li>

            <li>
              <a
                href="#menu"
                onClick={() => setOpen(false)}
                className="block hover:text-orange-500"
              >
                Menu
              </a>
            </li>

            <li>
              <a
                href="#reviews"
                onClick={() => setOpen(false)}
                className="block hover:text-orange-500"
              >
                Reviews
              </a>
            </li>

            <li>
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="block hover:text-orange-500"
              >
                Contact
              </a>
            </li>

          </ul>
        </div>
      )}
    </header>
  );
}