"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RequestStatus = "pending" | "approved" | "rejected";

type ExtraMealRequest = {
  id: string;
  customer_id: string;
  start_date: string | null;
  end_date: string | null;
  quantity: number;
  status: RequestStatus;
  note: string | null;
  created_at: string;
  approved_at: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

type ExtraMealRequestDay = {
  id: string;
  request_id: string;
  meal_date: string;
  meal_type: "lunch" | "dinner";
  included: boolean;
  created_at: string;
};

type RequestWithDetails = ExtraMealRequest & {
  customer: Customer | null;
  days: ExtraMealRequestDay[];
};

type FilterType = "all" | RequestStatus;

/* ===================================================== */
/* DATE HELPERS */
/* ===================================================== */

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatLongDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* ===================================================== */
/* MEAL HELPERS */
/* ===================================================== */

function getIncludedDays(request: RequestWithDetails) {
  return request.days.filter((day) => day.included);
}

function getLunchCount(request: RequestWithDetails) {
  return getIncludedDays(request).filter(
    (day) => day.meal_type === "lunch"
  ).length;
}

function getDinnerCount(request: RequestWithDetails) {
  return getIncludedDays(request).filter(
    (day) => day.meal_type === "dinner"
  ).length;
}

/*
 * Actual unique calendar days.
 *
 * Example:
 *
 * 23 Aug Lunch
 * 23 Aug Dinner
 * 24 Aug Lunch
 * 24 Aug Dinner
 *
 * = 2 meal days
 */
function getActualMealDays(request: RequestWithDetails) {
  const uniqueDates = new Set(
    getIncludedDays(request).map((day) => day.meal_date)
  );

  return uniqueDates.size;
}

/*
 * Meal slots means individual lunch/dinner selections.
 *
 * Example:
 *
 * 23 Lunch
 * 23 Dinner
 * 24 Lunch
 * 24 Dinner
 *
 * = 4 meal slots
 */
function getSelectedMealSlots(request: RequestWithDetails) {
  return getIncludedDays(request).length;
}

/*
 * Total guest meals:
 *
 * selected meal slots × guest quantity
 */
function getTotalGuestMeals(request: RequestWithDetails) {
  return (
    getSelectedMealSlots(request) *
    Number(request.quantity || 0)
  );
}

/* ===================================================== */
/* STATUS BADGE */
/* ===================================================== */

function StatusBadge({
  status,
}: {
  status: RequestStatus;
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        ✓ Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        ✕ Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
      ⏳ Pending
    </span>
  );
}

/* ===================================================== */
/* MAIN PAGE */
/* ===================================================== */

export default function ExtraMealRequestsPage() {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);

  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [filter, setFilter] =
    useState<FilterType>("all");

  /* =================================================== */
  /* LOAD REQUESTS */
  /* =================================================== */

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      /*
       * LOAD REQUESTS
       */

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from("extra_meal_requests")
        .select(
          `
          id,
          customer_id,
          start_date,
          end_date,
          quantity,
          status,
          note,
          created_at,
          approved_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (requestError) {
        throw requestError;
      }

      const rawRequests =
        (requestData || []) as ExtraMealRequest[];

      if (rawRequests.length === 0) {
        setRequests([]);
        return;
      }

      /*
       * LOAD CUSTOMERS
       */

      const customerIds = Array.from(
        new Set(
          rawRequests.map(
            (request) => request.customer_id
          )
        )
      );

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("id,name,phone")
        .in("id", customerIds);

      if (customerError) {
        throw customerError;
      }

      const customerMap: Record<
        string,
        Customer
      > = {};

      (
        (customerData || []) as Customer[]
      ).forEach((customer) => {
        customerMap[customer.id] = customer;
      });

      /*
       * LOAD MEAL DAYS
       */

      const requestIds =
        rawRequests.map(
          (request) => request.id
        );

      const {
        data: daysData,
        error: daysError,
      } = await supabase
        .from("extra_meal_request_days")
        .select(
          `
          id,
          request_id,
          meal_date,
          meal_type,
          included,
          created_at
          `
        )
        .in("request_id", requestIds)
        .order("meal_date", {
          ascending: true,
        })
        .order("meal_type", {
          ascending: true,
        });

      if (daysError) {
        throw daysError;
      }

      const daysMap: Record<
        string,
        ExtraMealRequestDay[]
      > = {};

      (
        (daysData || []) as ExtraMealRequestDay[]
      ).forEach((day) => {
        if (!daysMap[day.request_id]) {
          daysMap[day.request_id] = [];
        }

        daysMap[day.request_id].push(day);
      });

      /*
       * COMBINE EVERYTHING
       */

      const finalRequests: RequestWithDetails[] =
        rawRequests.map((request) => ({
          ...request,

          customer:
            customerMap[
              request.customer_id
            ] || null,

          days:
            daysMap[request.id] || [],
        }));

      setRequests(finalRequests);
    } catch (err) {
      console.error(
        "Extra meal request load error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load extra meal requests."
      );

      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  /* =================================================== */
  /* SUMMARY COUNTS */
  /* =================================================== */

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "pending"
      ).length,
    [requests]
  );

  const approvedCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "approved"
      ).length,
    [requests]
  );

  const rejectedCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "rejected"
      ).length,
    [requests]
  );

  /* =================================================== */
  /* FILTER */
  /* =================================================== */

  const filteredRequests = useMemo(() => {
    if (filter === "all") {
      return requests;
    }

    return requests.filter(
      (request) =>
        request.status === filter
    );
  }, [requests, filter]);

  /* =================================================== */
  /* UPDATE STATUS */
  /* =================================================== */

  async function updateRequestStatus(
    requestId: string,
    status: RequestStatus
  ) {
    if (processingId) return;

    setProcessingId(requestId);
    setError("");
    setSuccess("");

    try {
      const updateData: {
        status: RequestStatus;
        approved_at?: string | null;
      } = {
        status,
      };

      if (status === "approved") {
        updateData.approved_at =
          new Date().toISOString();
      }

      if (status === "rejected") {
        updateData.approved_at = null;
      }

      const {
        error: updateError,
      } = await supabase
        .from("extra_meal_requests")
        .update(updateData)
        .eq("id", requestId);

      if (updateError) {
        throw updateError;
      }

      if (status === "approved") {
        setSuccess(
          "Extra meal request approved successfully."
        );
      } else if (status === "rejected") {
        setSuccess(
          "Extra meal request rejected successfully."
        );
      }

      await loadRequests();
    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update request status."
      );
    } finally {
      setProcessingId(null);
    }
  }

  /* =================================================== */
  /* REFRESH */
  /* =================================================== */

  async function refreshRequests() {
    setSuccess("");
    setError("");

    await loadRequests();

    setSuccess(
      "Extra meal requests refreshed successfully."
    );
  }

  /* =================================================== */
  /* LOADING */
  /* =================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

            <h1 className="mt-5 text-xl font-bold text-gray-900">
              Loading Extra Meal Requests...
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Please wait.
            </p>

          </div>
        </div>
      </main>
    );
  }

  /* =================================================== */
  /* PAGE */
  /* =================================================== */

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <header className="mb-6 rounded-2xl bg-gray-900 px-6 py-7 text-white shadow-sm">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-sm font-semibold tracking-wide text-green-400">
                ADMIN PANEL
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Extra Meal Requests
              </h1>

              <p className="mt-2 text-sm text-gray-300">
                Manage customer guest meal requests.
              </p>

            </div>

            <button
              type="button"
              onClick={refreshRequests}
              disabled={loading}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ↻ Refresh
            </button>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="font-bold">
                Error
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={loadRequests}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>

          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">

            <p className="font-bold">
              Success
            </p>

            <p className="mt-1 text-sm">
              {success}
            </p>

          </div>
        )}

        {/* SUMMARY */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">

          <SummaryCard
            title="Pending"
            count={pendingCount}
            description="Requests waiting for approval"
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            textClass="text-yellow-600"
            ringClass="ring-yellow-400"
          />

          <SummaryCard
            title="Approved"
            count={approvedCount}
            description="Approved guest requests"
            active={filter === "approved"}
            onClick={() => setFilter("approved")}
            textClass="text-green-600"
            ringClass="ring-green-400"
          />

          <SummaryCard
            title="Rejected"
            count={rejectedCount}
            description="Rejected guest requests"
            active={filter === "rejected"}
            onClick={() => setFilter("rejected")}
            textClass="text-red-600"
            ringClass="ring-red-400"
          />

        </section>

        {/* FILTERS */}

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="flex flex-wrap gap-2">

            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All ({requests.length})
            </FilterButton>

            <FilterButton
              active={filter === "pending"}
              onClick={() => setFilter("pending")}
            >
              Pending ({pendingCount})
            </FilterButton>

            <FilterButton
              active={filter === "approved"}
              onClick={() => setFilter("approved")}
            >
              Approved ({approvedCount})
            </FilterButton>

            <FilterButton
              active={filter === "rejected"}
              onClick={() => setFilter("rejected")}
            >
              Rejected ({rejectedCount})
            </FilterButton>

          </div>

        </section>

        {/* REQUESTS */}

        <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-2xl font-bold text-gray-900">
                Requests
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {filteredRequests.length}
                </span>{" "}
                request
                {filteredRequests.length !== 1
                  ? "s"
                  : ""}
              </p>

            </div>

            <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">
              Total: {requests.length}
            </div>

          </div>

          {filteredRequests.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">

              <div className="text-5xl">
                📋
              </div>

              <h3 className="mt-4 text-lg font-bold text-gray-800">
                No requests found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {filter === "all"
                  ? "There are no extra meal requests yet."
                  : `There are no ${filter} extra meal requests.`}
              </p>

            </div>
          ) : (
            <div className="mt-6 space-y-5">

              {filteredRequests.map((request) => {

                const lunchCount =
                  getLunchCount(request);

                const dinnerCount =
                  getDinnerCount(request);

                const actualMealDays =
                  getActualMealDays(request);

                const selectedMealSlots =
                  getSelectedMealSlots(request);

                const totalGuestMeals =
                  getTotalGuestMeals(request);

                const quantity =
                  Number(request.quantity || 0);

                const isProcessing =
                  processingId === request.id;

                const includedDays =
                  getIncludedDays(request);

                return (
                  <article
                    key={request.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                  >

                    {/* REQUEST HEADER */}

                    <div className="border-b border-gray-200 bg-gray-50 p-5">

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-xl font-bold text-gray-900">
                              {request.customer?.name ||
                                "Unknown Customer"}
                            </h3>

                            <StatusBadge
                              status={request.status}
                            />

                          </div>

                          <p className="mt-1 text-sm text-gray-500">
                            {request.customer?.phone ||
                              "Phone not available"}
                          </p>

                          <p className="mt-2 text-xs text-gray-400">
                            Request ID: {request.id}
                          </p>

                        </div>

                        <div className="text-left lg:text-right">

                          <p className="text-xs text-gray-500">
                            Requested
                          </p>

                          <p className="mt-1 text-sm font-semibold text-gray-700">
                            {formatDateTime(
                              request.created_at
                            )}
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* MAIN DETAILS */}

                    <div className="p-5">

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">

                        <InfoBox
                          label="Guest Stay"
                          value={
                            request.start_date &&
                            request.end_date
                              ? `${formatDate(
                                  request.start_date
                                )} → ${formatDate(
                                  request.end_date
                                )}`
                              : request.start_date
                              ? formatDate(
                                  request.start_date
                                )
                              : "-"
                          }
                        />

                        <InfoBox
                          label="Guest Quantity"
                          value={`${quantity} guest${
                            quantity !== 1
                              ? "s"
                              : ""
                          }`}
                        />

                        <InfoBox
                          label="Meal Days"
                          value={`${actualMealDays} day${
                            actualMealDays !== 1
                              ? "s"
                              : ""
                          }`}
                        />

                        <InfoBox
                          label="Lunch"
                          value={`${lunchCount} slot${
                            lunchCount !== 1
                              ? "s"
                              : ""
                          }`}
                        />

                        <InfoBox
                          label="Dinner"
                          value={`${dinnerCount} slot${
                            dinnerCount !== 1
                              ? "s"
                              : ""
                          }`}
                        />

                        <InfoBox
                          label="Total Guest Meals"
                          value={`${totalGuestMeals}`}
                          highlight
                        />

                      </div>

                      {/* MEAL SUMMARY */}

                      <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                          <div>

                            <p className="text-sm font-bold text-gray-800">
                              Meal Summary
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">

                              <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-green-700 shadow-sm">
                                🍱 Lunch: {lunchCount}
                              </span>

                              <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-green-700 shadow-sm">
                                🌙 Dinner: {dinnerCount}
                              </span>

                              <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                                📅 Meal Days: {actualMealDays}
                              </span>

                              <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                                🍽️ Meal Slots:{" "}
                                {selectedMealSlots}
                              </span>

                            </div>

                          </div>

                          <div className="rounded-xl bg-white px-5 py-3 text-center shadow-sm">

                            <p className="text-xs font-semibold text-gray-500">
                              Calculation
                            </p>

                            <p className="mt-1 text-lg font-bold text-green-700">
                              {selectedMealSlots} ×{" "}
                              {quantity} ={" "}
                              {totalGuestMeals}
                            </p>

                            <p className="text-xs text-gray-500">
                              meal slots × guests
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* REQUEST NOTE */}

                      {request.note && (
                        <div className="mt-5 rounded-xl bg-gray-50 p-4">

                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Customer Note
                          </p>

                          <p className="mt-1 text-sm text-gray-700">
                            {request.note}
                          </p>

                        </div>
                      )}

                      {/* MEAL DETAILS */}

                      <div className="mt-6">

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                          <div>

                            <h4 className="text-lg font-bold text-gray-900">
                              Meal Details
                            </h4>

                            <p className="mt-1 text-sm text-gray-500">
                              Every selected lunch and dinner is shown separately.
                            </p>

                          </div>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            {selectedMealSlots} meal slot
                            {selectedMealSlots !== 1
                              ? "s"
                              : ""}
                          </span>

                        </div>

                        {includedDays.length === 0 ? (
                          <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
                            No selected meal-day records found for this request.
                          </div>
                        ) : (
                          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">

                            <div className="hidden grid-cols-4 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 sm:grid">

                              <div>
                                Date
                              </div>

                              <div>
                                Meal
                              </div>

                              <div>
                                Guest Quantity
                              </div>

                              <div>
                                Total Meals
                              </div>

                            </div>

                            <div className="divide-y divide-gray-200">

                              {includedDays.map((day) => (

                                <div
                                  key={day.id}
                                  className="grid gap-2 px-4 py-4 sm:grid-cols-4 sm:items-center sm:gap-4"
                                >

                                  <div>

                                    <p className="text-sm font-bold text-gray-900">
                                      {formatLongDate(
                                        day.meal_date
                                      )}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-400">
                                      {day.meal_date}
                                    </p>

                                  </div>

                                  <div>

                                    {day.meal_type ===
                                    "lunch" ? (
                                      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                        🍱 Lunch
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                        🌙 Dinner
                                      </span>
                                    )}

                                  </div>

                                  <div>

                                    <span className="text-sm font-semibold text-gray-700">
                                      {quantity} guest
                                      {quantity !== 1
                                        ? "s"
                                        : ""}
                                    </span>

                                  </div>

                                  <div>

                                    <span className="text-sm font-bold text-green-700">
                                      {quantity} meal
                                      {quantity !== 1
                                        ? "s"
                                        : ""}
                                    </span>

                                  </div>

                                </div>

                              ))}

                            </div>

                          </div>
                        )}

                      </div>

                      {/* APPROVAL INFO */}

                      {request.approved_at && (
                        <p className="mt-5 text-xs text-gray-400">
                          Approved on{" "}
                          {formatDateTime(
                            request.approved_at
                          )}
                        </p>
                      )}

                      {/* ACTIONS */}

                      <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">

                        {request.status !==
                          "approved" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateRequestStatus(
                                request.id,
                                "approved"
                              )
                            }
                            disabled={
                              processingId !== null
                            }
                            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing
                              ? "Processing..."
                              : "✓ Approve"}
                          </button>
                        )}

                        {request.status !==
                          "rejected" && (
                          <button
                            type="button"
                            onClick={() =>
                              updateRequestStatus(
                                request.id,
                                "rejected"
                              )
                            }
                            disabled={
                              processingId !== null
                            }
                            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing
                              ? "Processing..."
                              : "✕ Reject"}
                          </button>
                        )}

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}

/* ===================================================== */
/* SUMMARY CARD */
/* ===================================================== */

function SummaryCard({
  title,
  count,
  description,
  active,
  onClick,
  textClass,
  ringClass,
}: {
  title: string;
  count: number;
  description: string;
  active: boolean;
  onClick: () => void;
  textClass: string;
  ringClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md ${
        active
          ? `ring-2 ${ringClass}`
          : ""
      }`}
    >
      <p className="text-sm font-semibold text-gray-500">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${textClass}`}
      >
        {count}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {description}
      </p>
    </button>
  );
}

/* ===================================================== */
/* FILTER BUTTON */
/* ===================================================== */

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-green-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

/* ===================================================== */
/* INFO BOX */
/* ===================================================== */

function InfoBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${
        highlight
          ? "border border-green-200 bg-green-50"
          : "bg-gray-50"
      }`}
    >
      <p className="text-xs font-semibold text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
          highlight
            ? "text-green-700"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}