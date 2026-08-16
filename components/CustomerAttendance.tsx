"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CustomerAttendance() {
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [lunch, setLunch] = useState(false);
  const [dinner, setDinner] = useState(false);

  const [lunchRating, setLunchRating] = useState(0);
  const [dinnerRating, setDinnerRating] = useState(0);

  const [lunchComment, setLunchComment] = useState("");
  const [dinnerComment, setDinnerComment] = useState("");

  const [loading, setLoading] = useState(false);

  const submitAttendance = async () => {
    if (!customerId) {
      alert("Please enter Customer ID.");
      return;
    }

    if (!lunch && !dinner) {
      alert("Please select Lunch or Dinner.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("Attendance").insert({
      customer_id: Number(customerId),
      date,
      lunch,
      dinner,
      lunch_rating: lunch ? lunchRating || null : null,
      lunch_comment: lunchComment || null,
      dinner_rating: dinner ? dinnerRating || null : null,
      dinner_comment: dinnerComment || null,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Attendance save nahi hua. Please try again.");
      return;
    }

    alert("Attendance & feedback successfully saved!");

    setLunch(false);
    setDinner(false);
    setLunchRating(0);
    setDinnerRating(0);
    setLunchComment("");
    setDinnerComment("");
  };

  return (
    <section id="attendance" className="py-20 px-6 bg-orange-50">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-10">
          <p className="text-orange-500 font-semibold mb-2">
            Customer Portal
          </p>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Daily Attendance & Feedback
          </h2>

          <p className="text-gray-600 mt-3">
            Mark your meal attendance and share your feedback.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">

          {/* Customer ID */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer ID
            </label>

            <input
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter your Customer ID"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Date */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Lunch */}
          <div className="border border-orange-100 rounded-2xl p-5 mb-6">

            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  🍱 Lunch
                </h3>

                <p className="text-sm text-gray-500">
                  Will you take lunch today?
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLunch(!lunch)}
                className={`px-5 py-2 rounded-full font-semibold ${
                  lunch
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {lunch ? "Present" : "Absent"}
              </button>
            </div>

            {lunch && (
              <div className="mt-5">

                <label className="block font-semibold text-gray-700 mb-2">
                  Lunch Rating
                </label>

                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setLunchRating(star)}
                      className={`text-3xl ${
                        star <= lunchRating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={lunchComment}
                  onChange={(e) => setLunchComment(e.target.value)}
                  placeholder="How was your lunch today?"
                  className="w-full border border-gray-300 rounded-xl p-3 min-h-[100px] outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            )}
          </div>

          {/* Dinner */}
          <div className="border border-orange-100 rounded-2xl p-5 mb-8">

            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  🍽️ Dinner
                </h3>

                <p className="text-sm text-gray-500">
                  Will you take dinner today?
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDinner(!dinner)}
                className={`px-5 py-2 rounded-full font-semibold ${
                  dinner
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {dinner ? "Present" : "Absent"}
              </button>
            </div>

            {dinner && (
              <div className="mt-5">

                <label className="block font-semibold text-gray-700 mb-2">
                  Dinner Rating
                </label>

                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setDinnerRating(star)}
                      className={`text-3xl ${
                        star <= dinnerRating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={dinnerComment}
                  onChange={(e) => setDinnerComment(e.target.value)}
                  placeholder="How was your dinner today?"
                  className="w-full border border-gray-300 rounded-xl p-3 min-h-[100px] outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={submitAttendance}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-xl transition"
          >
            {loading ? "Saving..." : "Submit Attendance & Feedback"}
          </button>

        </div>
      </div>
    </section>
  );
}