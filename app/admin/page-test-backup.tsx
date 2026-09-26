"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
};

export default function AdminDashboard() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    testAdminAccess();
  }, []);

  async function testAdminAccess() {
    try {
      setLoading(true);
      setError("");

      // ============================================
      // 1. CHECK AUTH SESSION
      // ============================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          `Session Error: ${sessionError.message}`
        );
      }

      if (!session) {
        setError(
          "NO AUTH SESSION FOUND. Please login to admin first."
        );
        return;
      }

      setUserId(session.user.id);
      setEmail(session.user.email || "No email");

      console.log("ADMIN SESSION:", session);

      // ============================================
      // 2. CHECK CURRENT USER
      // ============================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(
          `User Error: ${userError.message}`
        );
      }

      if (!user) {
        setError(
          "AUTH USER NOT FOUND. Please login again."
        );
        return;
      }

      console.log("CURRENT USER:", user);

      // ============================================
      // 3. CHECK ADMIN_USERS
      // ============================================

      const {
        data: adminData,
        error: adminError,
      } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id);

      if (adminError) {
        console.error(
          "ADMIN USERS ERROR:",
          adminError
        );
      }

      console.log(
        "ADMIN USER RECORD:",
        adminData
      );

      // ============================================
      // 4. LOAD CUSTOMERS
      // ============================================

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id,name,phone,active"
        )
        .order("name");

      if (customerError) {
        throw new Error(
          `Customers Error: ${customerError.message}`
        );
      }

      console.log(
        "CUSTOMERS FROM SUPABASE:",
        customerData
      );

      // ============================================
      // 5. CHECK CUSTOMER RESULT
      // ============================================

      if (!customerData) {
        setCustomers([]);
        return;
      }

      setCustomers(
        customerData as Customer[]
      );
    } catch (err) {
      console.error(
        "ADMIN TEST ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeCustomers =
    customers.filter(
      (customer) => customer.active
    );

  return (
    <main className="min-h-screen bg-gray-100 p-6">

      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div className="mb-6 rounded-2xl bg-gray-900 p-6 text-white shadow">

          <h1 className="text-3xl font-bold">
            Admin Dashboard Test
          </h1>

          <p className="mt-2 text-gray-300">
            Authentication and Supabase customer access test
          </p>

        </div>

        {/* AUTH */}

        <div className="mb-6 rounded-2xl bg-white p-6 shadow">

          <h2 className="text-xl font-bold text-gray-900">
            1. Authentication
          </h2>

          {loading ? (
            <p className="mt-4 text-gray-500">
              Checking authentication...
            </p>
          ) : userId ? (
            <div className="mt-4 space-y-2">

              <div className="rounded-lg bg-green-50 p-4">

                <p className="font-semibold text-green-700">
                  ✅ AUTH SESSION FOUND
                </p>

              </div>

              <div>
                <span className="font-semibold">
                  User ID:
                </span>

                <p className="mt-1 break-all rounded bg-gray-100 p-3 text-sm">
                  {userId}
                </p>
              </div>

              <div>
                <span className="font-semibold">
                  Email:
                </span>

                <p className="mt-1 rounded bg-gray-100 p-3">
                  {email}
                </p>
              </div>

            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">

              <p className="font-bold">
                ❌ NO AUTH SESSION
              </p>

              <p className="mt-1">
                Please login to admin first.
              </p>

            </div>
          )}

        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700">

            <h2 className="text-xl font-bold">
              TEST FAILED
            </h2>

            <p className="mt-2 whitespace-pre-wrap">
              {error}
            </p>

          </div>
        )}

        {/* CUSTOMERS */}

        <div className="mb-6 rounded-2xl bg-white p-6 shadow">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-bold text-gray-900">
                2. Customers
              </h2>

              <p className="mt-1 text-gray-500">
                Customers returned by Supabase
              </p>

            </div>

            <button
              type="button"
              onClick={testAdminAccess}
              disabled={loading}
              className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading
                ? "Testing..."
                : "Test Again"}
            </button>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-blue-50 p-5">

              <p className="text-sm text-blue-700">
                Total Customers
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-900">
                {customers.length}
              </p>

            </div>

            <div className="rounded-xl bg-green-50 p-5">

              <p className="text-sm text-green-700">
                Active Customers
              </p>

              <p className="mt-2 text-3xl font-bold text-green-900">
                {activeCustomers.length}
              </p>

            </div>

          </div>

        </div>

        {/* CUSTOMER LIST */}

        {customers.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white shadow">

            <div className="border-b p-5">

              <h2 className="text-xl font-bold">
                Customer Data
              </h2>

            </div>

            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-gray-900 text-white">

                  <tr>

                    <th className="px-5 py-4 text-left">
                      Name
                    </th>

                    <th className="px-5 py-4 text-left">
                      Phone
                    </th>

                    <th className="px-5 py-4 text-center">
                      Active
                    </th>

                    <th className="px-5 py-4 text-left">
                      ID
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {customers.map(
                    (customer) => (
                      <tr
                        key={customer.id}
                        className="border-b hover:bg-gray-50"
                      >

                        <td className="px-5 py-4 font-semibold">
                          {customer.name}
                        </td>

                        <td className="px-5 py-4">
                          {customer.phone || "-"}
                        </td>

                        <td className="px-5 py-4 text-center">

                          {customer.active ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                              INACTIVE
                            </span>
                          )}

                        </td>

                        <td className="px-5 py-4">

                          <span className="break-all text-xs text-gray-500">
                            {customer.id}
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

        {/* NO CUSTOMER */}

        {!loading &&
          userId &&
          customers.length === 0 &&
          !error && (
            <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-yellow-800">

              <h2 className="text-xl font-bold">
                ⚠️ No Customers Returned
              </h2>

              <p className="mt-2">
                Supabase authentication is working,
                but the customers SELECT query returned
                0 rows.
              </p>

            </div>
          )}

      </div>

    </main>
  );
}