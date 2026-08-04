"use client";

import { motion } from "framer-motion";

export default function Menu() {

  const menuItems = [
    {
      name: "Dal Rice",
      desc: "Healthy dal with steamed rice",
      image:
        "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
    },
    {
      name: "Chicken Curry",
      desc: "Homemade spicy chicken curry",
      image:
        "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600",
    },
    {
      name: "Roti Sabzi",
      desc: "Fresh roti with seasonal vegetables",
      image:
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
    },
    {
      name: "Biryani",
      desc: "Special aromatic biryani",
      image:
        "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600",
    },
  ];


  return (

    <section
      id="menu"
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
            Today's Menu
          </h2>

          <p className="mt-4 text-gray-600">
            Fresh meals prepared with love every day.
          </p>

        </motion.div>



        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">


          {menuItems.map((item, index) => (

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
                y: -12,
              }}

              className="bg-white rounded-3xl overflow-hidden shadow-lg"

            >


              <img
                src={item.image}
                alt={item.name}
                className="w-full h-52 object-cover"
              />


              <div className="p-6">

                <h3 className="text-xl font-bold text-gray-900">
                  {item.name}
                </h3>


                <p className="text-gray-600 mt-3">
                  {item.desc}
                </p>


                <button
                  className="mt-5 bg-orange-500 text-white px-5 py-2 rounded-xl hover:bg-orange-600 transition"
                >
                  Order Now
                </button>

              </div>


            </motion.div>

          ))}


        </div>


      </div>

    </section>

  );
}