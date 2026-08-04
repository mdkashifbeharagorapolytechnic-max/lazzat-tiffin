export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">

      <div className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-3 gap-10">

          <div>
            <h2 className="text-2xl font-bold text-orange-400">
              🍱 Lazzat Tiffin
            </h2>

            <p className="mt-4 text-gray-400 leading-7">
              Homemade taste, healthy meals and fresh tiffin delivery
              for students, professionals and families.
            </p>
          </div>


          <div>
            <h3 className="text-xl font-semibold mb-4">
              Quick Links
            </h3>

            <ul className="space-y-3 text-gray-400">

              <li>Home</li>
              <li>Plans</li>
              <li>Menu</li>
              <li>Reviews</li>
              <li>Contact</li>

            </ul>

          </div>


          <div>

            <h3 className="text-xl font-semibold mb-4">
              Contact
            </h3>

            <div className="space-y-3 text-gray-400">

              <p>📍 Jamshedpur, Jharkhand</p>

              <p>📞 +91 9955672533</p>

              <p>🍱 Lunch & Dinner Service</p>

            </div>

          </div>

        </div>


        <div className="border-t border-gray-700 mt-10 pt-6 text-center text-gray-400">

          © {new Date().getFullYear()} Lazzat Tiffin. All Rights Reserved.

        </div>


      </div>

    </footer>
  );
}