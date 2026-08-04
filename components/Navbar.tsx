"use client";

import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50">

      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">

        <h1 className="text-2xl font-bold text-orange-600">
          🍱 Lazzat Tiffin
        </h1>


        {/* Desktop Menu */}
        <ul className="hidden md:flex items-center gap-8 text-gray-700 font-medium">

          <li>
            <a href="#home" className="hover:text-orange-500">
              Home
            </a>
          </li>

          <li>
            <a href="#plans" className="hover:text-orange-500">
              Plans
            </a>
          </li>

          <li>
            <a href="#menu" className="hover:text-orange-500">
              Menu
            </a>
          </li>

          <li>
            <a href="#reviews" className="hover:text-orange-500">
              Reviews
            </a>
          </li>

          <li>
            <a href="#contact" className="hover:text-orange-500">
              Contact
            </a>
          </li>

        </ul>


        <div className="flex items-center gap-4">

          <a
            href="https://wa.me/919955672533"
            className="hidden md:block bg-orange-500 text-white px-5 py-2 rounded-xl hover:bg-orange-600"
          >
            Order Now
          </a>


          {/* Mobile Button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-3xl"
          >
            ☰
          </button>

        </div>

      </nav>


      {/* Mobile Menu */}

      {open && (

        <div className="md:hidden bg-white shadow-lg px-6 py-5">

          <ul className="space-y-5 text-gray-700 font-medium">

            <li>
              <a href="#home" onClick={() => setOpen(false)}>
                Home
              </a>
            </li>

            <li>
              <a href="#plans" onClick={() => setOpen(false)}>
                Plans
              </a>
            </li>

            <li>
              <a href="#menu" onClick={() => setOpen(false)}>
                Menu
              </a>
            </li>

            <li>
              <a href="#reviews" onClick={() => setOpen(false)}>
                Reviews
              </a>
            </li>

            <li>
              <a href="#contact" onClick={() => setOpen(false)}>
                Contact
              </a>
            </li>

          </ul>

        </div>

      )}

    </header>
  );
}