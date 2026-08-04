"use client";

import { motion } from "framer-motion";

export default function Reviews() {

  const reviews = [
    {
      name: "Ayaan Khan",
      role: "Student",
      review:
        "Lazzat Tiffin ka khana bilkul ghar jaisa lagta hai. Quality aur taste dono bahut ache hain.",
      rating: "⭐⭐⭐⭐⭐",
    },
    {
      name: "Fatima Rahman",
      role: "Working Professional",
      review:
        "Daily fresh food aur time par delivery milti hai. Office ke liye best option hai.",
      rating: "⭐⭐⭐⭐⭐",
    },
    {
      name: "Mohammad Arshad",
      role: "Bachelor",
      review:
        "Biryani aur chicken dishes ka taste bahut lajawab hai. Highly recommended.",
      rating: "⭐⭐⭐⭐⭐",
    },
    {
      name: "Sana Ahmed",
      role: "Student",
      review:
        "Affordable price me healthy aur tasty food milta hai. Service bhi bahut achhi hai.",
      rating: "⭐⭐⭐⭐⭐",
    },
  ];


  return (
    <section
      id="reviews"
      className="py-24 bg-orange-50"
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
            Customer Reviews
          </h2>

          <p className="mt-4 text-gray-600">
            Our customers love our homemade taste.
          </p>

        </motion.div>



        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">


          {reviews.map((item, index) => (

            <motion.div

              key={item.name}

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
              }}

              className="bg-white rounded-3xl p-7 shadow-lg"

            >

              <div className="text-xl">
                {item.rating}
              </div>


              <p className="mt-5 text-gray-600 leading-7">
                "{item.review}"
              </p>


              <h3 className="mt-6 font-bold text-gray-900">
                {item.name}
              </h3>


              <p className="text-orange-500">
                {item.role}
              </p>


            </motion.div>

          ))}


        </div>


      </div>

    </section>
  );
}