"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="home"
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 pt-28"
    >
      <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">

        {/* Left Content Animation */}
        <motion.div
          initial={{ opacity: 0, x: -80, y: 30 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 1.2,
            ease: "easeOut",
          }}
        >

          <motion.span
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="inline-block bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-semibold mb-6"
          >
            🍱 Fresh Homemade Food
          </motion.span>


          <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight text-gray-900">

            Healthy Tiffin
            <br />

            Delivered

            <span className="text-orange-500">
              {" "}Daily
            </span>

          </h1>


          <p className="mt-8 text-lg text-gray-600 leading-8">
            Delicious homemade meals prepared with fresh ingredients and
            delivered across Jamshedpur for students, bachelors, offices and
            families.
          </p>


          <div className="flex gap-5 mt-10">

            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="https://wa.me/919955672533"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold transition"
            >
              Order Now
            </motion.a>


            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#plans"
              className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-8 py-4 rounded-xl font-semibold transition"
            >
              View Plans
            </motion.a>

          </div>

        </motion.div>


        {/* Image Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            duration: 1.2,
            ease: "easeOut",
          }}
        >

          <motion.img
            src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900"
            alt="Healthy Food"
            animate={{
              y: [0, -15, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="rounded-3xl shadow-2xl"
          />

        </motion.div>


      </div>
    </section>
  );
}