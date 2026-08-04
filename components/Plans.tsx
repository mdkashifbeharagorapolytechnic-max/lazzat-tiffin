"use client";

import { motion } from "framer-motion";

export default function Plans() {

  const plans = [
    {
      title: "Veg + Non Veg Plan",
      price: "₹3000 - ₹3500",
      features: [
        "Lunch & Dinner",
        "Fresh Homemade Food",
        "Daily Changing Menu",
        "Free Delivery",
      ],
    },
    {
      title: "Only Veg Plan",
      price: "₹1650",
      features: [
        "Veg Lunch / Dinner",
        "Healthy Homemade Meals",
        "Fresh Ingredients",
        "Affordable Monthly Plan",
      ],
    },
    {
      title: "Only Non Veg Plan",
      price: "₹2000",
      features: [
        "Non Veg Lunch / Dinner",
        "Chicken Special Meals",
        "Quality Ingredients",
        "Monthly Subscription",
      ],
    },
  ];


  return (
    <section
      id="plans"
      className="py-24 bg-white"
    >

      <div className="max-w-7xl mx-auto px-6">


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
            Choose your perfect meal plan.
          </p>

        </motion.div>



        <div className="grid md:grid-cols-3 gap-8 mt-14">


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

              className={`rounded-3xl p-8 shadow-xl ${
                index === 0
                ? "bg-orange-500 text-white"
                : "bg-orange-50 text-gray-900"
              }`}
            >

              <h3 className="text-2xl font-bold">
                {plan.title}
              </h3>


              <p className="text-4xl font-extrabold mt-6">
                {plan.price}

                <span className="text-base font-normal">
                  /month
                </span>
              </p>


              <ul className="mt-8 space-y-4">

                {plan.features.map((feature) => (
                  <li key={feature}>
                    ✅ {feature}
                  </li>
                ))}

              </ul>


              <a
                href="https://wa.me/919955672533?text=Hello%20Lazzat%20Tiffin,%20I%20want%20to%20know%20about%20your%20plans."
                className={`inline-block mt-8 px-8 py-3 rounded-xl font-semibold ${
                  index === 0
                  ? "bg-white text-orange-500"
                  : "bg-orange-500 text-white"
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