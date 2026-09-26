"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-green-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 md:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">

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
                href="/request"
                className="rounded-xl border-2 border-green-600 bg-white px-7 py-3.5 text-center font-bold text-green-700 transition hover:bg-green-50"
              >
                Start Now
              </Link>
            </div>

            {/* FEATURES */}
            <div className="mt-10 grid grid-cols-3 gap-3 border-t border-gray-200 pt-7 sm:gap-4">

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
            className="relative"
          >

            {/* DECORATIVE CIRCLES */}
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-orange-200 opacity-60 blur-2xl" />

            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-green-200 opacity-60 blur-2xl" />

            {/* IMAGE */}
            <motion.div
              whileHover={{
                y: -8,
              }}
              transition={{
                duration: 0.3,
              }}
              className="relative rounded-[2rem] bg-white p-2 shadow-2xl sm:p-4"
            >

              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Indian kitchen with freshly prepared homemade food"
                className="h-auto max-h-[520px] w-full rounded-[1.5rem] object-contain sm:max-h-[600px]"
              />

            </motion.div>

            {/* GHAR JAISA KHANA - PHOTO KE NEECHE */}
            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
                delay: 0.6,
              }}
              className="relative mt-4 rounded-2xl bg-white p-4 shadow-xl sm:p-5"
            >

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

            </motion.div>

          </motion.div>

        </div>
      </div>

      {/* BOTTOM DECORATION */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/60 to-transparent" />

    </section>
  );
}