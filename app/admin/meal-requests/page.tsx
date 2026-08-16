"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MealChange = {
  id: string;
  customer_id: string;
  change_date: string;
  meal: "lunch" | "dinner";
  action: "cancel" | "restore";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

type RequestRow = MealChange & {
  customer: Customer | null;
};

type FilterStatus =
  | "all"
  | "pending"
  | "approved"
  | "rejected";

export default function MealRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const [filter, setFilter] =
    useState<FilterStatus>("pending");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("meal_changes")
        .select(
          "id, customer_id, change_date, meal, action, reason, status, created_at, reviewed_at"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const changes = (data || []) as MealChange[];

      if (changes.length === 0) {
        setRequests([]);
        return;
      }

      const customerIds = [
        ...new Set(
          changes.map((item) => item.customer_id)
        ),
      ];

      const {
        data: customers,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("id, name, phone")
        .in("id", customerIds);

      if (customerError) {
        throw customerError;
      }

      const customerMap = new Map<string, Customer>();

      (customers || []).forEach((customer) => {
        customerMap.set(customer.id, customer);
      });

      setRequests(
        changes.map((item) => ({
          ...item,
          customer:
            customerMap.get(item.customer_id) || null,
        }))
      );
    } catch (err) {
      console.error("Load meal requests error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load meal requests."
      );
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(
    request: RequestRow
  ) {
    if (actionId) return;

    const confirmed = window.confirm(
      `Approve ${mealLabel(request.meal)} cancellation for ${
        request.customer?.name || "customer"
      } on ${formatDate(request.change_date)}?`
    );

    if (!confirmed) return;

    setActionId(request.id);
    setError("");
    setMessage("");

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "approve_meal_cancellation",
        {
          p_meal_change_id: request.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage(
        `${mealLabel(request.meal)} cancellation approved for ${
          request.customer?.name || "customer"
        }. Billing has been recalculated.`
      );

      console.log(
        "Meal cancellation result:",
        data
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "Approve meal cancellation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve meal request."
      );
    } finally {
      setActionId(null);
    }
  }

  async function rejectRequest(
    request: RequestRow
  ) {
    if (actionId) return;

    const reason = window.prompt(
      `Enter rejection reason for ${
        request.customer?.name || "customer"
      }:`
    );

    if (reason === null) return;

    setActionId(request.id);
    setError("");
    setMessage("");

    try {
      const {
        error: updateError,
      } = await supabase
        .from("meal_changes")
        .update({
          status: "rejected",
          reason:
            reason.trim() || request.reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("status", "pending");

      if (updateError) {
        throw updateError;
      }

      setMessage(
        `${mealLabel(request.meal)} cancellation rejected for ${
          request.customer?.name || "customer"
        }.`
      );

      await loadRequests();
    } catch (err) {
      console.error(
        "Reject meal request error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reject meal request."
      );
    } finally {
      setActionId(null);
    }
  }

  const filteredRequests = useMemo(() => {
    if (filter === "all") {
      return requests;
    }

    return requests.filter(
      (request) => request.status === filter
    );
  }, [requests, filter]);

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "approved"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "rejected"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Meal Requests
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review customer lunch and dinner cancellation requests.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">
              Error
            </div>

            <div className="mt-1">
              {error}
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Pending"
            value={pendingCount}
            className="text-yellow-600"
          />

          <SummaryCard
            title="Approved"
            value={approvedCount}
            className="text-green-600"
          />

          <SummaryCard
            title="Rejected"
            value={rejectedCount}
            className="text-red-600"
          />
        </div>

        {/* FILTERS */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">

            <FilterButton
              label="All"
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />

            <FilterButton
              label={`Pending (${pendingCount})`}
              active={filter === "pending"}
              onClick={() => setFilter("pending")}
            />

            <FilterButton
              label={`Approved (${approvedCount})`}
              active={filter === "approved"}
              onClick={() =>
                setFilter("approved")
              }
            />

            <FilterButton
              label={`Rejected (${rejectedCount})`}
              active={filter === "rejected"}
              onClick={() =>
                setFilter("rejected")
              }
            />

          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-xl bg-white shadow-sm">

          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900">
              Meal Change Requests
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredRequests.length} request
              {filteredRequests.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading meal requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No meal requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px]">

                <thead className="bg-gray-50">
                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Meal
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Request
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Reason
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Requested At
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredRequests.map(
                    (request) => {
                      const processing =
                        actionId === request.id;

                      return (
                        <tr
                          key={request.id}
                          className="align-top hover:bg-gray-50"
                        >

                          {/* CUSTOMER */}
                          <td className="px-5 py-5">
                            <div className="font-semibold text-gray-900">
                              {request.customer
                                ?.name ||
                                "Unknown Customer"}
                            </div>

                            {request.customer
                              ?.phone && (
                              <div className="mt-1 text-xs text-gray-500">
                                {
                                  request.customer
                                    .phone
                                }
                              </div>
                            )}
                          </td>

                          {/* DATE */}
                          <td className="px-5 py-5 text-sm text-gray-700">
                            {formatDate(
                              request.change_date
                            )}
                          </td>

                          {/* MEAL */}
                          <td className="px-5 py-5">
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              {mealLabel(
                                request.meal
                              )}
                            </span>
                          </td>

                          {/* REQUEST */}
                          <td className="px-5 py-5 text-sm font-semibold text-gray-800">
                            {request.action ===
                            "cancel"
                              ? "Cancellation"
                              : "Restore"}
                          </td>

                          {/* REASON */}
                          <td className="max-w-xs px-5 py-5 text-sm text-gray-500">
                            {request.reason ||
                              "-"}
                          </td>

                          {/* REQUESTED AT */}
                          <td className="px-5 py-5 text-sm text-gray-500">
                            {formatDateTime(
                              request.created_at
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-5">
                            <StatusBadge
                              status={
                                request.status
                              }
                            />
                          </td>

                          {/* ACTION */}
                          <td className="px-5 py-5 text-right">

                            {request.status ===
                            "pending" ? (
                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    approveRequest(
                                      request
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {processing
                                    ? "Processing..."
                                    : "Approve"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    rejectRequest(
                                      request
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Reject
                                </button>

                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                Reviewed
                              </span>
                            )}

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-green-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
      Pending
    </span>
  );
}

function mealLabel(
  meal: "lunch" | "dinner"
) {
  return meal === "lunch"
    ? "Lunch"
    : "Dinner";
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] =
    value.split("-");

  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}