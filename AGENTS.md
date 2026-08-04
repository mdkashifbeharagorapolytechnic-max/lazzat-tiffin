<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="home"
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 pt-28"
    >
      <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">

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
            <span className="text-orange-500"> Daily</span>
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
              href="https://wa.me/919955672533?text=Hello%20Lazzat%20Tiffin,%20I%20want%20to%20order%20a%20tiffin%20plan."
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
}"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="home"
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 pt-28"
    >
      <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">

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
            <span className="text-orange-500"> Daily</span>
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
              href="https://wa.me/919955672533?text=Hello%20Lazzat%20Tiffin,%20I%20want%20to%20order%20a%20tiffin%20plan."
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
}export default function Contact() {
  return (
    <section
      id="contact"
      className="py-24 bg-white"
    >

      <div className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-2 gap-12 items-center">


          <div>

            <h2 className="text-4xl font-bold text-gray-900">
              Order Your Daily Tiffin
            </h2>


            <p className="mt-5 text-gray-600 leading-8">
              Fresh homemade meals delivered at your doorstep in Jamshedpur.
              Contact us today and start your healthy food journey.
            </p>


            <div className="mt-8 space-y-4 text-lg">

              <p>
                📍 Jamshedpur, Jharkhand
              </p>

              <p>
                📞 +91 9955672533
              </p>

              <p>
                🕒 Lunch & Dinner Delivery
              </p>

            </div>


            <a
              href="https://wa.me/919955672533?text=Hello%20Lazzat%20Tiffin,%20I%20want%20more%20details%20about%20your%20tiffin%20service."
              target="_blank"
              className="inline-block mt-8 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold transition"
            >
              Chat on WhatsApp
            </a>


          </div>



          <div className="bg-orange-50 rounded-3xl p-8 shadow-lg">


            <h3 className="text-2xl font-bold mb-6">
              Quick Enquiry
            </h3>


            <form className="space-y-5">


              <input
                type="text"
                placeholder="Your Name"
                className="w-full p-4 rounded-xl border outline-none focus:border-orange-500"
              />


              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full p-4 rounded-xl border outline-none focus:border-orange-500"
              />


              <textarea
                placeholder="Your Message"
                rows={4}
                className="w-full p-4 rounded-xl border outline-none focus:border-orange-500"
              />


              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-semibold transition"
              >
                Submit Request
              </button>


            </form>


          </div>


        </div>


      </div>


    </section>
  );
}