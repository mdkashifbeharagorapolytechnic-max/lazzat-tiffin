export default function Reviews() {

  const reviews = [
    {
      name: "Rahul Kumar",
      role: "Student",
      message:
        "Food bilkul ghar jaisa hai. Quality aur taste dono bahut ache hain.",
      rating: "⭐⭐⭐⭐⭐",
    },
    {
      name: "Amit Singh",
      role: "Working Professional",
      message:
        "Office ke busy schedule me Lazzat Tiffin bahut helpful hai.",
      rating: "⭐⭐⭐⭐⭐",
    },
    {
      name: "Neha Sharma",
      role: "Customer",
      message:
        "Fresh food, timely delivery aur reasonable price.",
      rating: "⭐⭐⭐⭐⭐",
    },
  ];

  return (
    <section
      id="reviews"
      className="py-24 bg-orange-50"
    >

      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">

          <h2 className="text-4xl font-bold text-gray-900">
            Customer Reviews
          </h2>

          <p className="text-gray-500 mt-4">
            What our customers say about us.
          </p>

        </div>


        <div className="grid md:grid-cols-3 gap-8">

          {reviews.map((review) => (

            <div
              key={review.name}
              className="bg-white rounded-3xl p-8 shadow-lg hover:-translate-y-2 transition"
            >

              <div className="text-xl mb-4">
                {review.rating}
              </div>


              <p className="text-gray-600 leading-7 mb-6">
                "{review.message}"
              </p>


              <h3 className="font-bold text-lg">
                {review.name}
              </h3>

              <span className="text-sm text-orange-500">
                {review.role}
              </span>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}