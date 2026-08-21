"use client";

import { motion } from "framer-motion";

export default function WhyChooseUs() {
  const features = [
    {
      icon: "🏠",
      title: "Homemade Taste",
      description:
        "Freshly prepared meals with authentic ghar jaisa taste.",
    },
    {
      icon: "🥗",
      title: "Fresh Ingredients",
      description:
        "We use fresh and quality ingredients for every meal.",
    },
    {
      icon: "🚚",
      title: "Daily Delivery",
      description:
        "Fresh tiffin delivered on time to your doorstep.",
    },
    {
      icon: "❤️",
      title: "Made With Care",
      description:
        "Every meal is prepared with hygiene, care and love.",
    },
  ];

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
            Why Lazzat Tiffin?
          </span>

          <h2 className="mt-5 text-4xl font-bold text-gray-900 md:text-5xl">
            Why Choose Us
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Fresh food, homemade taste and reliable daily service
            for your everyday meals.
          </p>
        </motion.div>

        {/* FEATURES */}
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{
                opacity: 0,
                y: 50,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: index * 0.12,
              }}
              viewport={{
                once: true,
              }}
              whileHover={{
                y: -8,
              }}
              className="rounded-3xl border border-orange-100 bg-orange-50 p-7 text-center shadow-lg"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-3xl">
                {item.icon}
              </div>

              <h3 className="mt-6 text-xl font-bold text-gray-900">
                {item.title}
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}