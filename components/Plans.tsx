"use client";

import { motion } from "framer-motion";

export default function Plans() {
  const plans = [
    {
      title: "Lunch Plan",
      price: "₹1650",
      subtitle: "Lunch Only",
      features: [
        "Daily Fresh Lunch",
        "Homemade Food",
        "Daily Changing Menu",
        "Fresh Ingredients",
        "Free Delivery",
      ],
    },
    {
      title: "Dinner Plan",
      price: "₹1650",
      subtitle: "Dinner Only",
      features: [
        "Daily Fresh Dinner",
        "Homemade Food",
        "Daily Changing Menu",
        "Fresh Ingredients",
        "Free Delivery",
      ],
    },
    {
      title: "Full Plan",
      price: "₹3000",
      subtitle: "Lunch + Dinner",
      features: [
        "Daily Lunch & Dinner",
        "Fresh Homemade Food",
        "Daily Changing Menu",
        "Fresh Ingredients",
        "Free Delivery",
      ],
    },
  ];

  return (
    <section
      id="plans"
      className="bg-white py-24"
    >
      <div className="mx-auto max-w-7xl px-6">

        {/* HEADING */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-4xl font-bold text-gray-900">
            Our Tiffin Plans
          </h2>

          <p className="mt-4 text-gray-600">
            Choose the meal plan that suits you best.
          </p>
        </motion.div>

        {/* PLANS */}
        <div className="mt-14 grid gap-8 md:grid-cols-3">

          {plans.map((plan, index) => (
            <motion.div
              key={plan.title}
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
                delay: index * 0.15,
              }}
              viewport={{
                once: true,
              }}
              whileHover={{
                y: -10,
                scale: 1.03,
              }}
              className={`relative rounded-3xl p-8 shadow-xl ${
                index === 2
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-gray-900"
              }`}
            >

              {/* POPULAR */}
              {index === 2 && (
                <div className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-500">
                  BEST VALUE
                </div>
              )}

              {/* TITLE */}
              <h3 className="text-2xl font-bold">
                {plan.title}
              </h3>

              {/* SUBTITLE */}
              <p
                className={`mt-2 ${
                  index === 2
                    ? "text-orange-100"
                    : "text-gray-500"
                }`}
              >
                {plan.subtitle}
              </p>

              {/* PRICE */}
              <p className="mt-6 text-4xl font-extrabold">
                {plan.price}

                <span
                  className={`text-base font-normal ${
                    index === 2
                      ? "text-orange-100"
                      : "text-gray-500"
                  }`}
                >
                  /month
                </span>
              </p>

              {/* FEATURES */}
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2"
                  >
                    <span>✅</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CHOOSE PLAN */}
              <a
                href={`https://wa.me/919955672533?text=${encodeURIComponent(
                  `Hello Lazzat Tiffin, I want to choose the ${plan.title} (${plan.subtitle}) for ${plan.price}/month.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-8 inline-block rounded-xl px-8 py-3 font-semibold transition ${
                  index === 2
                    ? "bg-white text-orange-500 hover:bg-orange-50"
                    : "bg-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                Choose Plan
              </a>

            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}