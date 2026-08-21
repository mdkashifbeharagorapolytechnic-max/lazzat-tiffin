"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  meal: "Lunch" | "Dinner";
};

type AttendanceRecord = {
  id: string;
  customer_id: string;
  attendance_date: string;
  lunch_rating: number | null;
  lunch_comment: string | null;
  dinner_rating: number | null;
  dinner_comment: string | null;
  lunch_review_approved: boolean | null;
  dinner_review_approved: boolean | null;
};

type Customer = {
  id: string;
  name: string;
};

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    setLoading(true);

    try {
      // Supabase client is loaded only in the browser.
      const { supabase } = await import("@/lib/supabase");

      const { data: customers, error: customersError } =
        await supabase
          .from("customers")
          .select("id, name");

      if (customersError) {
        console.error("Customer fetch error:", customersError);
        setReviews([]);
        return;
      }

      const { data: attendance, error: attendanceError } =
        await supabase
          .from("attendance")
          .select(`
            id,
            customer_id,
            attendance_date,
            lunch_rating,
            lunch_comment,
            dinner_rating,
            dinner_comment,
            lunch_review_approved,
            dinner_review_approved
          `)
          .order("attendance_date", {
            ascending: false,
          });

      if (attendanceError) {
        console.error("Review fetch error:", attendanceError);
        setReviews([]);
        return;
      }

      const customerMap = new Map<string, string>();

      (customers || []).forEach((customer: Customer) => {
        customerMap.set(customer.id, customer.name);
      });

      const reviewList: Review[] = [];

      (attendance || []).forEach(
        (record: AttendanceRecord) => {
          const customerName =
            customerMap.get(record.customer_id) || "Customer";

          // LUNCH
          if (
            record.lunch_rating &&
            record.lunch_rating >= 1 &&
            record.lunch_comment &&
            record.lunch_comment.trim() &&
            record.lunch_review_approved === true
          ) {
            reviewList.push({
              id: `${record.id}-lunch`,
              customerName,
              rating: record.lunch_rating,
              comment: record.lunch_comment.trim(),
              meal: "Lunch",
            });
          }

          // DINNER
          if (
            record.dinner_rating &&
            record.dinner_rating >= 1 &&
            record.dinner_comment &&
            record.dinner_comment.trim() &&
            record.dinner_review_approved === true
          ) {
            reviewList.push({
              id: `${record.id}-dinner`,
              customerName,
              rating: record.dinner_rating,
              comment: record.dinner_comment.trim(),
              meal: "Dinner",
            });
          }
        }
      );

      setReviews(reviewList.slice(0, 8));
    } catch (error) {
      console.error("Unexpected review error:", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="reviews"
      className="bg-orange-50 py-24"
    >
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
            ❤️ Customer Feedback
          </span>

          <h2 className="mt-5 text-4xl font-bold text-gray-900 md:text-5xl">
            Customer Reviews
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Real feedback from our Lazzat Tiffin customers.
          </p>
        </motion.div>

        {/* LOADING */}
        {loading && (
          <div className="mt-14 text-center">
            <div className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-4 text-gray-600 shadow">
              <span className="animate-spin">⏳</span>
              Loading customer reviews...
            </div>
          </div>
        )}

        {/* NO REVIEWS */}
        {!loading && reviews.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mx-auto mt-14 max-w-2xl rounded-3xl border border-orange-100 bg-white p-10 text-center shadow-lg"
          >
            <div className="text-5xl">⭐</div>

            <h3 className="mt-4 text-xl font-bold text-gray-900">
              Customer Reviews Coming Soon
            </h3>

            <p className="mt-2 text-gray-600">
              Approved customer reviews will appear here.
            </p>
          </motion.div>
        )}

        {/* REVIEWS */}
        {!loading && reviews.length > 0 && (
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.08,
                }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="rounded-3xl bg-white p-7 shadow-lg"
              >
                {/* STARS */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map(
                    (_, starIndex) => (
                      <span
                        key={starIndex}
                        className={
                          starIndex < review.rating
                            ? "text-lg"
                            : "text-lg opacity-20"
                        }
                      >
                        ⭐
                      </span>
                    )
                  )}
                </div>

                {/* REVIEW */}
                <p className="mt-5 min-h-[110px] leading-7 text-gray-600">
                  "{review.comment}"
                </p>

                {/* MEAL */}
                <div className="mt-4">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                    {review.meal === "Lunch"
                      ? "🍛 Lunch"
                      : "🌙 Dinner"}
                  </span>
                </div>

                {/* CUSTOMER */}
                <div className="mt-6 flex items-center gap-3 border-t border-orange-100 pt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                    {review.customerName
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900">
                      {review.customerName}
                    </h3>

                    <p className="text-xs text-gray-500">
                      Lazzat Tiffin Customer
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* BOTTOM */}
        {!loading && reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="mx-auto mt-14 max-w-3xl rounded-3xl bg-orange-500 p-8 text-center text-white shadow-xl"
          >
            <div className="text-3xl">
              ⭐⭐⭐⭐⭐
            </div>

            <h3 className="mt-4 text-2xl font-bold">
              Taste You Can Trust
            </h3>

            <p className="mx-auto mt-3 max-w-xl text-orange-50">
              Fresh ingredients, homemade taste and hygienic
              preparation — that's what makes Lazzat Tiffin special.
            </p>
          </motion.div>
        )}

      </div>
    </section>
  );
}