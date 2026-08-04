export default function Contact() {
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