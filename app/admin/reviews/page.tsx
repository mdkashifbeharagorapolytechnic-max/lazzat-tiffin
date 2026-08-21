"use client";

import { useState } from "react";
import AdminNavbar from "@/components/AdminNavbar";
import { supabase } from "@/lib/supabase";

type Review = {
  id: string;
  attendanceId: string;
  customerName: string;
  date: string;
  meal: "Lunch" | "Dinner";
  rating: number;
  comment: string;
  approved: boolean | null;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [message, setMessage] = useState(
    "Click Load Reviews to load customer reviews."
  );

  // ==========================================
  // LOAD REVIEWS
  // ==========================================

  async function loadReviews() {
    setLoading(true);
    setMessage("Loading reviews...");

    try {
      const {
        data: attendance,
        error: attendanceError,
      } = await supabase
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
        })
        .limit(500);

      if (attendanceError) {
        throw new Error(
          `Attendance error: ${attendanceError.message}`
        );
      }

      const customerIds = Array.from(
        new Set(
          (attendance || [])
            .map((item) => item.customer_id)
            .filter(Boolean)
        )
      );

      let customers: {
        id: string;
        name: string;
      }[] = [];

      if (customerIds.length > 0) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select("id, name")
          .in("id", customerIds);

        if (customerError) {
          throw new Error(
            `Customers error: ${customerError.message}`
          );
        }

        customers = customerData || [];
      }

      const customerMap = new Map<string, string>();

      customers.forEach((customer) => {
        customerMap.set(
          customer.id,
          customer.name
        );
      });

      const reviewList: Review[] = [];

      (attendance || []).forEach((item) => {
        const customerName =
          customerMap.get(item.customer_id) ||
          "Customer";

        // ======================================
        // LUNCH REVIEW
        // ======================================

        if (
          item.lunch_rating !== null &&
          item.lunch_comment &&
          item.lunch_comment.trim() !== ""
        ) {
          reviewList.push({
            id: `${item.id}-lunch`,
            attendanceId: item.id,
            customerName,
            date: item.attendance_date,
            meal: "Lunch",
            rating: item.lunch_rating,
            comment:
              item.lunch_comment.trim(),
            approved:
              item.lunch_review_approved === null
                ? null
                : item.lunch_review_approved === true,
          });
        }

        // ======================================
        // DINNER REVIEW
        // ======================================

        if (
          item.dinner_rating !== null &&
          item.dinner_comment &&
          item.dinner_comment.trim() !== ""
        ) {
          reviewList.push({
            id: `${item.id}-dinner`,
            attendanceId: item.id,
            customerName,
            date: item.attendance_date,
            meal: "Dinner",
            rating: item.dinner_rating,
            comment:
              item.dinner_comment.trim(),
            approved:
              item.dinner_review_approved === null
                ? null
                : item.dinner_review_approved === true,
          });
        }
      });

      setReviews(reviewList);

      setMessage(
        `SUCCESS — Attendance: ${
          attendance?.length || 0
        } | Customers: ${
          customers.length
        } | Reviews: ${reviewList.length}`
      );
    } catch (error) {
      console.error(
        "REVIEWS ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Reviews load nahi ho paye."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // APPROVE / REJECT
  // ==========================================

  async function updateApproval(
    review: Review,
    approved: boolean
  ) {
    if (processingId !== null) {
      return;
    }

    setProcessingId(review.id);

    setMessage(
      approved
        ? `Approving ${review.meal} review...`
        : `Rejecting ${review.meal} review...`
    );

    const column =
      review.meal === "Lunch"
        ? "lunch_review_approved"
        : "dinner_review_approved";

    console.log("REVIEW UPDATE START", {
      attendanceId: review.attendanceId,
      meal: review.meal,
      column,
      value: approved,
    });

    try {
      const { data, error } = await supabase
        .from("attendance")
        .update({
          [column]: approved,
        })
        .eq("id", review.attendanceId)
        .select(
          `id, ${column}`
        )
        .single();

      if (error) {
        console.error(
          "REVIEW UPDATE ERROR:",
          error
        );

        throw new Error(
          error.message
        );
      }

      console.log(
        "REVIEW UPDATE SUCCESS:",
        data
      );

      // ======================================
      // UPDATE UI WITHOUT RELOADING PAGE
      // ======================================

      setReviews((previous) =>
        previous.map((item) =>
          item.id === review.id
            ? {
                ...item,
                approved,
              }
            : item
        )
      );

      setMessage(
        approved
          ? `${review.meal} review approved successfully. ✅`
          : `${review.meal} review rejected successfully. ❌`
      );
    } catch (error) {
      console.error(
        "UPDATE APPROVAL ERROR:",
        error
      );

      alert(
        `Review update nahi hua.\n\n${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`
      );
    } finally {
      setProcessingId(null);
    }
  }

  // ==========================================
  // COUNTS
  // ==========================================

  const pendingReviews = reviews.filter(
    (review) =>
      review.approved === null
  );

  const approvedReviews = reviews.filter(
    (review) =>
      review.approved === true
  );

  const rejectedReviews = reviews.filter(
    (review) =>
      review.approved === false
  );

  // ==========================================
  // UI
  // ==========================================

  return (
    <>
      <AdminNavbar />

      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Customer Reviews
              </h1>

              <p className="mt-1 text-gray-600">
                Customer Lunch aur Dinner
                reviews manage karein.
              </p>
            </div>

            <button
              onClick={loadReviews}
              disabled={loading}
              className="rounded-lg bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : "↻ Load Reviews"}
            </button>

          </div>

          {/* STATUS */}

          <div className="mb-6 rounded-xl bg-white p-5 shadow">

            <p className="text-sm font-semibold text-gray-500">
              Status
            </p>

            <p className="mt-2 font-semibold text-blue-700">
              {message}
            </p>

          </div>

          {/* SUMMARY */}

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">

            {/* TOTAL */}

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                ⭐ Total Reviews
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {reviews.length}
              </p>
            </div>

            {/* PENDING */}

            <div className="rounded-xl bg-yellow-50 p-5 shadow">
              <p className="text-sm font-semibold text-yellow-700">
                ⏳ Pending
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-700">
                {pendingReviews.length}
              </p>
            </div>

            {/* APPROVED */}

            <div className="rounded-xl bg-green-50 p-5 shadow">
              <p className="text-sm font-semibold text-green-700">
                ✓ Approved
              </p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {approvedReviews.length}
              </p>
            </div>

            {/* REJECTED */}

            <div className="rounded-xl bg-red-50 p-5 shadow">
              <p className="text-sm font-semibold text-red-700">
                ✕ Rejected
              </p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {rejectedReviews.length}
              </p>
            </div>

          </div>

          {/* NO REVIEWS */}

          {reviews.length === 0 ? (

            <div className="rounded-xl bg-white p-12 text-center shadow">

              <div className="text-5xl">
                ⭐
              </div>

              <h2 className="mt-4 text-xl font-bold text-gray-900">
                No Reviews Found
              </h2>

              <p className="mt-2 text-gray-500">
                Load Reviews button dabakar
                reviews check karein.
              </p>

            </div>

          ) : (

            /* REVIEWS TABLE */

            <div className="overflow-hidden rounded-xl bg-white shadow">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1100px] text-left">

                  <thead className="bg-gray-900 text-white">

                    <tr>

                      <th className="px-5 py-4">
                        Customer
                      </th>

                      <th className="px-5 py-4">
                        Meal
                      </th>

                      <th className="px-5 py-4">
                        Rating
                      </th>

                      <th className="px-5 py-4">
                        Comment
                      </th>

                      <th className="px-5 py-4">
                        Date
                      </th>

                      <th className="px-5 py-4 text-center">
                        Status
                      </th>

                      <th className="px-5 py-4 text-center">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {reviews.map((review) => (

                      <tr
                        key={review.id}
                        className="border-t hover:bg-gray-50"
                      >

                        {/* CUSTOMER */}

                        <td className="px-5 py-5">
                          <p className="font-bold text-gray-900">
                            {review.customerName}
                          </p>
                        </td>

                        {/* MEAL */}

                        <td className="px-5 py-5">

                          <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">
                            {review.meal ===
                            "Lunch"
                              ? "🍛 Lunch"
                              : "🌙 Dinner"}
                          </span>

                        </td>

                        {/* RATING */}

                        <td className="px-5 py-5">

                          <div className="whitespace-nowrap">

                            {Array.from({
                              length: 5,
                            }).map(
                              (_, index) => (

                                <span
                                  key={index}
                                  className={
                                    index <
                                    review.rating
                                      ? "text-lg"
                                      : "text-lg opacity-20"
                                  }
                                >
                                  ⭐
                                </span>

                              )
                            )}

                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {review.rating}/5
                          </p>

                        </td>

                        {/* COMMENT */}

                        <td className="max-w-md px-5 py-5">

                          <p className="whitespace-normal break-words leading-6 text-gray-700">
                            "{review.comment}"
                          </p>

                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap px-5 py-5 text-gray-600">
                          {review.date}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-5 text-center">

                          {review.approved === true && (

                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                              ✓ Approved
                            </span>

                          )}

                          {review.approved === false && (

                            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                              ✕ Rejected
                            </span>

                          )}

                          {review.approved === null && (

                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-700">
                              ⏳ Pending
                            </span>

                          )}

                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-5">

                          <div className="flex justify-center gap-2">

                            {/* APPROVE */}

                            <button
                              onClick={() =>
                                updateApproval(
                                  review,
                                  true
                                )
                              }
                              disabled={
                                processingId !==
                                null
                              }
                              className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {processingId ===
                              review.id
                                ? "..."
                                : "✓ Approve"}
                            </button>

                            {/* REJECT */}

                            <button
                              onClick={() =>
                                updateApproval(
                                  review,
                                  false
                                )
                              }
                              disabled={
                                processingId !==
                                null
                              }
                              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {processingId ===
                              review.id
                                ? "..."
                                : "✕ Reject"}
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          )}

          {/* INFO */}

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">

            <p className="font-bold text-blue-900">
              💡 Review System
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              Pending = null, Approved = true,
              Rejected = false. Lunch aur Dinner
              reviews separately manage hote hain.
            </p>

          </div>

        </div>
      </main>
    </>
  );
}