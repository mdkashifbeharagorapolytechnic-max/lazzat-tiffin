"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 top-0 z-50 w-full bg-white/90 shadow-sm backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">

        {/* LOGO */}
        <Link
          href="/"
          className="text-2xl font-bold text-orange-600"
        >
          🍱 Lazzat Tiffin
        </Link>

        {/* DESKTOP MENU */}
        <ul className="hidden items-center gap-7 font-medium text-gray-700 md:flex">
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

        {/* DESKTOP ACTIONS */}
        <div className="hidden items-center gap-2 md:flex">

          {/* CUSTOMER LOGIN */}
          <Link
            href="/customer-login"
            className="rounded-xl border border-orange-500 px-4 py-2 font-semibold text-orange-600 transition hover:bg-orange-50"
          >
            👤 Customer Login
          </Link>

          {/* ADMIN LOGIN */}
          <Link
            href="/login"
            className="rounded-xl border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            🔐 Admin
          </Link>

        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="text-3xl text-gray-700 md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
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

            {/* CUSTOMER LOGIN */}
            <li className="border-t border-gray-200 pt-5">
              <Link
                href="/customer-login"
                onClick={() => setOpen(false)}
                className="block rounded-xl border border-orange-500 px-4 py-3 text-center font-semibold text-orange-600 hover:bg-orange-50"
              >
                👤 Customer Login
              </Link>
            </li>

            {/* ADMIN LOGIN */}
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-xl border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 hover:bg-gray-100"
              >
                🔐 Admin Login
              </Link>
            </li>

          </ul>
        </div>
      )}
    </header>
  );
}