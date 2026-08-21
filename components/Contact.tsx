export default function Contact() {
  return (
    <section
      id="contact"
      className="bg-white py-24"
    >
      <div className="mx-auto max-w-7xl px-6">

        <div className="grid items-center md:grid-cols-2 gap-12">

          {/* LEFT CONTENT */}

          <div>

            <h2 className="text-4xl font-bold text-gray-900">
              Order Your Daily Tiffin
            </h2>

            <p className="mt-5 leading-8 text-gray-600">
              Fresh homemade meals delivered at your doorstep in Jamshedpur.
              Contact us today and start your healthy food journey.
            </p>

            <div className="mt-8 space-y-4">

              <p className="text-lg">
                📍 Jamshedpur, Jharkhand
              </p>

              <p className="text-lg">
                📞 +91 9955672533
              </p>

              <p className="text-lg">
                🕒 Lunch & Dinner Delivery
              </p>

            </div>

            <a
              href="https://wa.me/919955672533"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block rounded-xl bg-green-500 px-8 py-4 font-semibold text-white transition hover:bg-green-600"
            >
              Chat on WhatsApp
            </a>

          </div>

          {/* RIGHT SIDE */}

          <div className="flex min-h-[300px] items-center justify-center rounded-3xl bg-gradient-to-br from-orange-50 to-green-50 p-8 shadow-lg">

            <div className="text-center">

              <div className="text-6xl">
                🍱
              </div>

              <h3 className="mt-5 text-2xl font-bold text-gray-900">
                Ghar Jaisa Khana
              </h3>

              <p className="mt-2 text-gray-600">
                Fresh • Homemade • Delicious
              </p>

              <p className="mt-4 text-sm text-gray-500">
                Contact us on WhatsApp to order your daily tiffin.
              </p>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}