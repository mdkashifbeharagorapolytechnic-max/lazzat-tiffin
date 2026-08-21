"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-green-50">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">

          {/* LEFT CONTENT */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* BADGE */}
            <div className="mb-5 inline-flex items-center rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
              🍱 Fresh • Homemade • Delicious
            </div>

            {/* HEADING */}
            <h1 className="text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Ghar Jaisa
              <span className="block text-orange-500">
                Khana
              </span>
              Aapke Ghar Tak
            </h1>

            {/* DESCRIPTION */}
            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Freshly prepared homemade meals with the taste and
              comfort of ghar ka khana. Healthy, delicious and
              delivered with care by Lazzat Tiffin.
            </p>

            {/* BUTTONS */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="#menu"
                className="rounded-xl bg-orange-500 px-7 py-3.5 text-center font-bold text-white shadow-lg transition hover:bg-orange-600 hover:shadow-xl"
              >
                View Today&apos;s Menu
              </Link>

              <Link
                href="#contact"
                className="rounded-xl border-2 border-green-600 bg-white px-7 py-3.5 text-center font-bold text-green-700 transition hover:bg-green-50"
              >
                Order Now
              </Link>
            </div>

            {/* FEATURES */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-gray-200 pt-7">

              {/* HOMEMADE */}
              <div>
                <div className="text-2xl">
                  🥘
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-800">
                  Homemade
                </p>

                <p className="text-xs text-gray-500">
                  Ghar jaisa taste
                </p>
              </div>

              {/* FRESH FOOD */}
              <div>
                <div className="text-2xl">
                  🥗
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-800">
                  Fresh Food
                </p>

                <p className="text-xs text-gray-500">
                  Freshly prepared
                </p>
              </div>

              {/* DELIVERY */}
              <div>
                <div className="text-2xl">
                  🚚
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-800">
                  Daily Delivery
                </p>

                <p className="text-xs text-gray-500">
                  Fresh to your door
                </p>
              </div>

            </div>
          </motion.div>

          {/* RIGHT IMAGE */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.15,
            }}
            className="relative pb-8"
          >

            {/* DECORATIVE CIRCLES */}
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-orange-200 opacity-60 blur-2xl" />

            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-green-200 opacity-60 blur-2xl" />

            {/* IMAGE CARD */}
            <motion.div
              whileHover={{
                y: -8,
              }}
              transition={{
                duration: 0.3,
              }}
              className="relative overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            >

              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Indian kitchen with freshly prepared homemade food"
                className="h-[420px] w-full object-cover sm:h-[500px]"
              />

              {/* IMAGE OVERLAY */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6">

                <div className="rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur-sm">

                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <p className="text-sm font-semibold text-orange-600">
                        Lazzat Tiffin
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-gray-900">
                        Ghar Jaisa Khana ❤️
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Freshly prepared every day
                      </p>
                    </div>

                    {/* FOOD ICON */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-2xl">
                      🍛
                    </div>

                  </div>

                </div>
              </div>

            </motion.div>

            {/* FRESH & HOMEMADE NOTE */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.5,
                delay: 0.8,
              }}
              className="absolute -bottom-3 -left-4 rounded-2xl bg-white px-5 py-4 shadow-xl sm:-left-6"
            >

              <div className="flex items-center gap-3">

                {/* CHECK ICON */}
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-xl">
                  ✓
                </div>

                {/* TEXT */}
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Fresh & Homemade
                  </p>

                  <p className="text-xs text-gray-500">
                    Made with care
                  </p>
                </div>

              </div>

            </motion.div>

          </motion.div>

        </div>
      </div>

      {/* BOTTOM DECORATION */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/60 to-transparent" />

    </section>
  );
}