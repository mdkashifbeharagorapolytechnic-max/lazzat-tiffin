"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminNotifications() {
  const [customerRequests, setCustomerRequests] =
    useState(0);

  const [mealRequests, setMealRequests] =
    useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    const [
      customerResult,
      mealResult,
    ] = await Promise.all([
      supabase
        .from("customer_requests")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "pending"),

      supabase
        .from("meal_changes")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "pending"),
    ]);

    setCustomerRequests(
      customerResult.count || 0
    );

    setMealRequests(
      mealResult.count || 0
    );

    setLoading(false);
  }

  const total =
    customerRequests + mealRequests;

  return (
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            🔔 Notifications
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Pending requests that need your attention
          </p>
        </div>

        {!loading && (
          <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600">
            {total}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-5 text-sm text-gray-500">
          Checking notifications...
        </div>
      ) : total === 0 ? (
        <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          ✓ No pending notifications.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* CUSTOMER REQUESTS */}
          <Link
            href="/admin/requests"
            className="group rounded-xl border border-gray-200 p-5 transition hover:border-green-300 hover:bg-green-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  New Customer Requests
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {customerRequests}
                </p>
              </div>

              <div className="rounded-xl bg-yellow-100 px-4 py-3 text-2xl">
                👤
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-green-600 group-hover:text-green-700">
              Review Requests →
            </p>
          </Link>

          {/* MEAL REQUESTS */}
          <Link
            href="/admin/meal-requests"
            className="group rounded-xl border border-gray-200 p-5 transition hover:border-green-300 hover:bg-green-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Meal Cancellation Requests
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {mealRequests}
                </p>
              </div>

              <div className="rounded-xl bg-red-100 px-4 py-3 text-2xl">
                🍽️
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-green-600 group-hover:text-green-700">
              Review Meal Requests →
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}