"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type PublicReviewRow = {
  id: string;
  attendance_date: string;
  customer_id: string;
  customer_name: string | null;

  lunch_rating: number | null;
  lunch_comment: string | null;
  lunch_review_approved: boolean | null;

  dinner_rating: number | null;
  dinner_comment: string | null;
  dinner_review_approved: boolean | null;
};

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  meal: "Lunch" | "Dinner";
  date: string;
};

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("public_customer_reviews")
        .select(
          `
            id,
            attendance_date,
            customer_id,
            customer_name,
            lunch_rating,
            lunch_comment,
            lunch_review_approved,
            dinner_rating,
            dinner_comment,
            dinner_review_approved
          `
        )
        .order("attendance_date", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error loading reviews:", error);
        setReviews([]);
        setLoading(false);
        return;
      }

      const reviewList: Review[] = [];

      (data as PublicReviewRow[] | null)?.forEach((row) => {
        const customerName = row.customer_name?.trim() || "Customer";

        // Lunch review
        if (
          row.lunch_review_approved === true &&
          typeof row.lunch_rating === "number" &&
          row.lunch_rating >= 1 &&
          row.lunch_rating <= 5 &&
          row.lunch_comment?.trim()
        ) {
          reviewList.push({
            id: `${row.id}-lunch`,
            customerName,
            rating: row.lunch_rating,
            comment: row.lunch_comment.trim(),
            meal: "Lunch",
            date: row.attendance_date,
          });
        }

        // Dinner review
        if (
          row.dinner_review_approved === true &&
          typeof row.dinner_rating === "number" &&
          row.dinner_rating >= 1 &&
          row.dinner_rating <= 5 &&
          row.dinner_comment?.trim()
        ) {
          reviewList.push({
            id: `${row.id}-dinner`,
            customerName,
            rating: row.dinner_rating,
            comment: row.dinner_comment.trim(),
            meal: "Dinner",
            date: row.attendance_date,
          });
        }
      });

      reviewList.sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setReviews(reviewList.slice(0, 8));
      setLoading(false);
    };

    fetchReviews();
  }, []);

  if (loading) {
    return (
      <section className="bg-white py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Loading reviews...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-orange-600">
              Customer Reviews
            </p>

            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              What Our Customers Say
            </h2>

            <p className="mt-3 text-gray-600">
              Real feedback from people enjoying Lazzat Tiffin every day.
            </p>
          </motion.div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.05,
                }}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                {/* Stars */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <span
                      key={starIndex}
                      className={
                        starIndex < review.rating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>

                {/* Comment */}
                <p className="mt-3 text-sm leading-6 text-gray-700">
                  “{review.comment}”
                </p>

                {/* Customer */}
                <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                    {review.customerName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {review.customerName}
                    </h3>

                    <p className="text-xs text-gray-500">
                      Lazzat Tiffin Customer • {review.meal}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center">
            <p className="text-gray-500">
              No customer reviews yet.
            </p>
          </div>
        )}

        {/* Bottom message */}
        {reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-500">
              Your feedback helps us serve you better ❤️
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}