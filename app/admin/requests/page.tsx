"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CustomerRequest = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  plan: string;
  lunch: boolean;
  dinner: boolean;
  start_date: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function planLabel(request: CustomerRequest) {
  if (request.lunch && request.dinner) {
    return "Lunch + Dinner";
  }

  if (request.lunch) {
    return "Lunch Only";
  }

  if (request.dinner) {
    return "Dinner Only";
  }

  return request.plan || "Not specified";
}

export default function CustomerRequestsPage() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("customer_requests")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setError(error.message);
      setRequests([]);
      setLoading(false);
      return;
    }

    setRequests((data || []) as CustomerRequest[]);
    setLoading(false);
  }

  async function approveRequest(request: CustomerRequest) {
    const confirmed = window.confirm(
      `Approve ${request.name} as a new customer?`
    );

    if (!confirmed) return;

    setActionId(request.id);
    setError("");
    setMessage("");

    try {
      // Check whether customer with same phone already exists
      const { data: existingCustomer, error: existingError } =
        await supabase
          .from("customers")
          .select("id")
          .eq("phone", request.phone)
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingCustomer) {
        throw new Error(
          "A customer with this phone number already exists."
        );
      }

      // Create customer
      const { error: customerError } = await supabase
        .from("customers")
        .insert({
          name: request.name,
          phone: request.phone,
          address: request.address,
          active: true,
          start_date: request.start_date,
        });

      if (customerError) {
        throw customerError;
      }

      // Mark request approved
      const { error: requestError } = await supabase
        .from("customer_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (requestError) {
        throw requestError;
      }

      setMessage(
        `${request.name} has been approved and added as a customer.`
      );

      await loadRequests();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to approve customer request."
      );
    } finally {
      setActionId(null);
    }
  }

  async function rejectRequest(request: CustomerRequest) {
    const reason = window.prompt(
      `Why are you rejecting ${request.name}'s request?`
    );

    if (reason === null) return;

    setActionId(request.id);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("customer_requests")
      .update({
        status: "rejected",
        admin_note: reason.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setMessage(
        `${request.name}'s request has been rejected.`
      );

      await loadRequests();
    }

    setActionId(null);
  }

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Requests
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review new customer plan requests.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Pending
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {pendingRequests.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Approved
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {
                requests.filter(
                  (request) =>
                    request.status === "approved"
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {
                requests.filter(
                  (request) =>
                    request.status === "rejected"
                ).length
              }
            </p>
          </div>
        </div>

        {/* REQUESTS */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900">
              All Requests
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No customer requests found.
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
                      Contact
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Plan
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Start Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Requested
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
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">
                          {request.name}
                        </div>

                        {request.address && (
                          <div className="mt-1 max-w-xs text-xs text-gray-500">
                            {request.address}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-700">
                          {request.phone}
                        </div>

                        {request.email && (
                          <div className="mt-1 text-xs text-gray-500">
                            {request.email}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {planLabel(request)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {formatDate(request.start_date)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500">
                        {new Date(
                          request.created_at
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={request.status} />

                        {request.admin_note && (
                          <p className="mt-2 max-w-xs text-xs text-gray-500">
                            Note: {request.admin_note}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {request.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                approveRequest(request)
                              }
                              disabled={
                                actionId === request.id
                              }
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionId === request.id
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                rejectRequest(request)
                              }
                              disabled={
                                actionId === request.id
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: CustomerRequest["status"];
}) {
  if (status === "approved") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
      Pending
    </span>
  );
}