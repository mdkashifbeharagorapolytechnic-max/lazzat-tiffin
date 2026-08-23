"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  icon: string;
  color: string;
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    try {
      setError("");

      /*
       * =====================================================
       * LOAD ALL ADMIN NOTIFICATIONS
       * =====================================================
       */

      const [
        customerRequestsResult,
        mealChangesResult,
        extraMealRequestsResult,
        reviewsResult,
      ] = await Promise.all([
        /*
         * CUSTOMER REQUESTS
         */
        supabase
          .from("customer_requests")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        /*
         * MEAL CANCELLATION REQUESTS
         */
        supabase
          .from("meal_changes")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        /*
         * EXTRA MEAL / GUEST REQUESTS
         */
        supabase
          .from("extra_meal_requests")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        /*
         * CUSTOMER REVIEWS
         *
         * Reviews are treated as notifications.
         * No status column is required here.
         */
        supabase
          .from("reviews")
          .select("id", {
            count: "exact",
            head: true,
          }),
      ]);

      /*
       * =====================================================
       * ERROR CHECK
       * =====================================================
       */

      if (customerRequestsResult.error) {
        throw customerRequestsResult.error;
      }

      if (mealChangesResult.error) {
        throw mealChangesResult.error;
      }

      if (extraMealRequestsResult.error) {
        throw extraMealRequestsResult.error;
      }

      if (reviewsResult.error) {
        /*
         * If reviews table does not exist, show the other
         * notifications instead of breaking the dashboard.
         */
        console.warn(
          "Customer reviews notification unavailable:",
          reviewsResult.error.message
        );
      }

      /*
       * =====================================================
       * COUNTS
       * =====================================================
       */

      const customerRequestCount =
        customerRequestsResult.count || 0;

      const mealChangeCount =
        mealChangesResult.count || 0;

      const extraMealRequestCount =
        extraMealRequestsResult.count || 0;

      const reviewCount =
        reviewsResult.error
          ? 0
          : reviewsResult.count || 0;

      /*
       * =====================================================
       * BUILD NOTIFICATION LIST
       * =====================================================
       */

      const newNotifications: NotificationItem[] = [];

      /*
       * CUSTOMER REQUESTS
       */

      if (customerRequestCount > 0) {
        newNotifications.push({
          id: "customer-requests",
          title: "New Customer Requests",
          description:
            "Customers are waiting for approval.",
          count: customerRequestCount,
          href: "/admin/requests",
          icon: "👤",
          color:
            "border-blue-200 bg-blue-50 text-blue-700",
        });
      }

      /*
       * MEAL CANCELLATION REQUESTS
       */

      if (mealChangeCount > 0) {
        newNotifications.push({
          id: "meal-changes",
          title: "Meal Cancellation Requests",
          description:
            "Customers have requested meal changes or cancellations.",
          count: mealChangeCount,
          href: "/admin/meal-requests",
          icon: "🍱",
          color:
            "border-orange-200 bg-orange-50 text-orange-700",
        });
      }

      /*
       * EXTRA MEAL REQUESTS
       */

      if (extraMealRequestCount > 0) {
        newNotifications.push({
          id: "extra-meal-requests",
          title: "Extra Meal Requests",
          description:
            "Customers have requested extra meals for their guests.",
          count: extraMealRequestCount,
          href: "/admin/extra-meal-requests",
          icon: "👥",
          color:
            "border-green-200 bg-green-50 text-green-700",
        });
      }

      /*
       * CUSTOMER REVIEWS
       */

      if (reviewCount > 0) {
        newNotifications.push({
          id: "customer-reviews",
          title: "Customer Reviews",
          description:
            "Customers have submitted reviews and feedback.",
          count: reviewCount,
          href: "/admin/reviews",
          icon: "⭐",
          color:
            "border-yellow-200 bg-yellow-50 text-yellow-700",
        });
      }

      setNotifications(newNotifications);
    } catch (err) {
      console.error(
        "Admin notifications error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * INITIAL LOAD + AUTO REFRESH
   * =====================================================
   */

  useEffect(() => {
    loadNotifications();

    /*
     * AUTO REFRESH EVERY 30 SECONDS
     */
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /*
   * =====================================================
   * TOTAL NOTIFICATIONS
   * =====================================================
   */

  const totalNotifications =
    notifications.reduce(
      (sum, item) => sum + item.count,
      0
    );

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl">
            🔔
          </div>

          <div>
            <h2 className="font-bold text-gray-900">
              Notifications
            </h2>

            <p className="text-sm text-gray-500">
              Checking new requests and reviews...
            </p>
          </div>
        </div>
      </section>
    );
  }

  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (error) {
    return (
      <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-red-800">
              Notifications
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={loadNotifications}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  /*
   * =====================================================
   * NO NOTIFICATIONS
   * =====================================================
   */

  if (notifications.length === 0) {
    return (
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-xl">
            ✓
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900">
                Notifications
              </h2>

              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                0
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              No pending requests or new reviews.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /*
   * =====================================================
   * NOTIFICATIONS
   * =====================================================
   */

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
      {/* HEADER */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-xl">
            🔔

            {totalNotifications > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                {totalNotifications}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Notifications
            </h2>

            <p className="text-sm text-gray-500">
              Requests and customer reviews
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadNotifications}
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          ↻ Refresh
        </button>
      </div>

      {/* NOTIFICATION LIST */}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {notifications.map((notification) => (
          <Link
            key={notification.id}
            href={notification.href}
            className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${notification.color}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl shadow-sm">
                  {notification.icon}
                </div>

                <div>
                  <h3 className="font-bold">
                    {notification.title}
                  </h3>

                  <p className="mt-1 text-xs opacity-80">
                    {notification.description}
                  </p>
                </div>
              </div>

              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-sm font-bold shadow-sm">
                {notification.count}
              </span>
            </div>

            <div className="mt-4 text-xs font-bold">
              View Details →
            </div>
          </Link>
        ))}
      </div>

      {/* TOTAL */}

      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">
            Total Notifications
          </span>

          <span className="text-lg font-bold text-gray-900">
            {totalNotifications}
          </span>
        </div>
      </div>
    </section>
  );
}