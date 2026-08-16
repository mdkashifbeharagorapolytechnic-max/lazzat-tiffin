"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  lunch_rate: number | null;
  dinner_rate: number | null;
  active: boolean;
  start_date: string | null;
};

type BillingRow = {
  id?: string;
  customer_id: string;
  billing_month: string;
  lunch_count: number;
  dinner_count: number;
  lunch_rate: number;
  dinner_rate: number;
  lunch_amount: number;
  dinner_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: "pending" | "partial" | "paid";
};

export default function BillingPage() {
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [billing, setBilling] = useState<BillingRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadBilling() {
    try {
      setLoading(true);
      setError("");

      const year = Number(month.slice(0, 4));
      const monthNumber = Number(month.slice(5, 7));

      const monthStart = `${month}-01`;

      const nextMonthDate = new Date(
        year,
        monthNumber,
        1
      );

      const monthEnd = `${nextMonthDate.getFullYear()}-${String(
        nextMonthDate.getMonth() + 1
      ).padStart(2, "0")}-01`;

      // =========================
      // CUSTOMERS
      // =========================

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select(
            "id,name,phone,lunch_rate,dinner_rate,active,start_date"
          )
          .eq("active", true)
          .order("name");

      if (customerError) {
        throw new Error(customerError.message);
      }

      const customerList =
        (customerData || []) as Customer[];

      setCustomers(customerList);

      if (customerList.length === 0) {
        setBilling([]);
        return;
      }

      // =========================
      // ATTENDANCE
      // =========================

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "customer_id,attendance_date,lunch,dinner"
        )
        .gte("attendance_date", monthStart)
        .lt("attendance_date", monthEnd);

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      // =========================
      // EXISTING BILLING
      // =========================

      const {
        data: billingData,
        error: billingError,
      } = await supabase
        .from("billing")
        .select("*")
        .eq("billing_month", monthStart);

      if (billingError) {
        throw new Error(billingError.message);
      }

      // =========================
      // CALCULATE BILLING
      // =========================

      const rows: BillingRow[] =
        customerList.map((customer) => {
          const customerAttendance = (
            attendanceData || []
          ).filter(
            (item) =>
              item.customer_id === customer.id
          );

          const lunchCount =
            customerAttendance.filter(
              (item) => item.lunch === true
            ).length;

          const dinnerCount =
            customerAttendance.filter(
              (item) => item.dinner === true
            ).length;

          const lunchRate = Number(
            customer.lunch_rate || 0
          );

          const dinnerRate = Number(
            customer.dinner_rate || 0
          );

          const lunchAmount =
            lunchCount * lunchRate;

          const dinnerAmount =
            dinnerCount * dinnerRate;

          const totalAmount =
            lunchAmount + dinnerAmount;

          const existing = (
            billingData || []
          ).find(
            (item) =>
              item.customer_id === customer.id
          );

          const paidAmount = Math.max(
            Number(existing?.paid_amount || 0),
            0
          );

          const dueAmount = Math.max(
            totalAmount - paidAmount,
            0
          );

          let paymentStatus:
            | "pending"
            | "partial"
            | "paid" = "pending";

          if (
            totalAmount > 0 &&
            paidAmount >= totalAmount
          ) {
            paymentStatus = "paid";
          } else if (paidAmount > 0) {
            paymentStatus = "partial";
          }

          return {
            id: existing?.id,
            customer_id: customer.id,
            billing_month: monthStart,

            lunch_count: lunchCount,
            dinner_count: dinnerCount,

            lunch_rate: lunchRate,
            dinner_rate: dinnerRate,

            lunch_amount: lunchAmount,
            dinner_amount: dinnerAmount,

            total_amount: totalAmount,

            paid_amount: paidAmount,
            due_amount: dueAmount,

            payment_status: paymentStatus,
          };
        });

      setBilling(rows);
    } catch (err) {
      console.error("Billing error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();
  }, [month]);

  // =========================
  // UPDATE PAID AMOUNT
  // =========================

  function updatePaidAmount(
    customerId: string,
    value: string
  ) {
    const paid = Math.max(
      Number(value || 0),
      0
    );

    setBilling((current) =>
      current.map((row) => {
        if (
          row.customer_id !== customerId
        ) {
          return row;
        }

        const due = Math.max(
          row.total_amount - paid,
          0
        );

        let status:
          | "pending"
          | "partial"
          | "paid" = "pending";

        if (
          row.total_amount > 0 &&
          paid >= row.total_amount
        ) {
          status = "paid";
        } else if (paid > 0) {
          status = "partial";
        }

        return {
          ...row,
          paid_amount: paid,
          due_amount: due,
          payment_status: status,
        };
      })
    );
  }

  // =========================
  // SAVE PAYMENT
  // =========================

  async function savePayment(
    row: BillingRow
  ) {
    try {
      setSaving(row.customer_id);
      setError("");

      const paidAmount = Math.max(
        Number(row.paid_amount || 0),
        0
      );

      const dueAmount = Math.max(
        Number(row.total_amount || 0) -
          paidAmount,
        0
      );

      let paymentStatus:
        | "pending"
        | "partial"
        | "paid" = "pending";

      if (
        row.total_amount > 0 &&
        paidAmount >= row.total_amount
      ) {
        paymentStatus = "paid";
      } else if (paidAmount > 0) {
        paymentStatus = "partial";
      }

      const payload = {
        customer_id: row.customer_id,
        billing_month: row.billing_month,

        lunch_count: row.lunch_count,
        dinner_count: row.dinner_count,

        lunch_rate: row.lunch_rate,
        dinner_rate: row.dinner_rate,

        lunch_amount: row.lunch_amount,
        dinner_amount: row.dinner_amount,

        total_amount: row.total_amount,
        paid_amount: paidAmount,
        due_amount: dueAmount,

        payment_status: paymentStatus,
      };

      // =========================
      // UPDATE
      // =========================

      if (row.id) {
        const { error: updateError } =
          await supabase
            .from("billing")
            .update(payload)
            .eq("id", row.id);

        if (updateError) {
          throw new Error(
            updateError.message
          );
        }
      }

      // =========================
      // INSERT
      // =========================

      else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("billing")
          .insert(payload)
          .select()
          .single();

        if (insertError) {
          throw new Error(
            insertError.message
          );
        }

        setBilling((current) =>
          current.map((item) =>
            item.customer_id ===
            row.customer_id
              ? {
                  ...item,
                  id: data.id,
                }
              : item
          )
        );
      }

      // =========================
      // UPDATE LOCAL STATE
      // =========================

      setBilling((current) =>
        current.map((item) =>
          item.customer_id ===
          row.customer_id
            ? {
                ...item,
                paid_amount: paidAmount,
                due_amount: dueAmount,
                payment_status:
                  paymentStatus,
              }
            : item
        )
      );

      alert(
        "Payment updated successfully."
      );
    } catch (err) {
      console.error(
        "Payment error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Payment update failed."
      );
    } finally {
      setSaving(null);
    }
  }

  // =========================
  // SUMMARY
  // =========================

  const totalBills = billing.reduce(
    (sum, row) =>
      sum + Number(row.total_amount || 0),
    0
  );

  const totalPaid = billing.reduce(
    (sum, row) =>
      sum + Number(row.paid_amount || 0),
    0
  );

  const totalDue = billing.reduce(
    (sum, row) =>
      sum + Number(row.due_amount || 0),
    0
  );

  // =========================
  // UI
  // =========================

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Billing
          </h1>

          <p className="mt-2 text-gray-600">
            Monthly customer billing and payment management
          </p>
        </div>

        {/* MONTH */}

        <div className="mb-6 rounded-xl bg-white p-5 shadow">
          <label className="mb-2 block font-semibold">
            Billing Month
          </label>

          <input
            type="month"
            value={month}
            onChange={(e) =>
              setMonth(e.target.value)
            }
            className="rounded-lg border border-gray-300 p-3"
          />
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            <p className="font-bold">
              Billing Error
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        {/* SUMMARY */}

        {!loading &&
          billing.length > 0 && (
            <div className="mb-6 grid gap-4 md:grid-cols-3">

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">
                  Total Bills
                </p>

                <p className="mt-2 text-2xl font-bold">
                  ₹{totalBills.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">
                  Total Paid
                </p>

                <p className="mt-2 text-2xl font-bold text-green-600">
                  ₹{totalPaid.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">
                  Total Due
                </p>

                <p className="mt-2 text-2xl font-bold text-red-600">
                  ₹{totalDue.toFixed(2)}
                </p>
              </div>

            </div>
          )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-xl bg-white shadow">

          {loading ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold">
                Loading billing...
              </p>
            </div>
          ) : billing.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold">
                No active customers found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-gray-900 text-white">
                  <tr>

                    <th className="px-4 py-4 text-left">
                      Customer
                    </th>

                    <th className="px-4 py-4 text-center">
                      Lunch
                    </th>

                    <th className="px-4 py-4 text-center">
                      Dinner
                    </th>

                    <th className="px-4 py-4 text-right">
                      Lunch ₹
                    </th>

                    <th className="px-4 py-4 text-right">
                      Dinner ₹
                    </th>

                    <th className="px-4 py-4 text-right">
                      Total
                    </th>

                    <th className="px-4 py-4 text-right">
                      Paid
                    </th>

                    <th className="px-4 py-4 text-right">
                      Due
                    </th>

                    <th className="px-4 py-4 text-center">
                      Status
                    </th>

                    <th className="px-4 py-4 text-center">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {billing.map((row) => {

                    const customer =
                      customers.find(
                        (item) =>
                          item.id ===
                          row.customer_id
                      );

                    return (
                      <tr
                        key={row.customer_id}
                        className="border-b hover:bg-gray-50"
                      >

                        {/* CUSTOMER */}

                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {customer?.name ||
                              "Unknown"}
                          </p>

                          <p className="text-sm text-gray-500">
                            {customer?.phone ||
                              ""}
                          </p>
                        </td>

                        {/* LUNCH COUNT */}

                        <td className="px-4 py-4 text-center">
                          {row.lunch_count}
                        </td>

                        {/* DINNER COUNT */}

                        <td className="px-4 py-4 text-center">
                          {row.dinner_count}
                        </td>

                        {/* LUNCH AMOUNT */}

                        <td className="px-4 py-4 text-right">
                          ₹
                          {row.lunch_amount.toFixed(
                            2
                          )}
                        </td>

                        {/* DINNER AMOUNT */}

                        <td className="px-4 py-4 text-right">
                          ₹
                          {row.dinner_amount.toFixed(
                            2
                          )}
                        </td>

                        {/* TOTAL */}

                        <td className="px-4 py-4 text-right font-bold">
                          ₹
                          {row.total_amount.toFixed(
                            2
                          )}
                        </td>

                        {/* PAID */}

                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            value={
                              row.paid_amount
                            }
                            onChange={(e) =>
                              updatePaidAmount(
                                row.customer_id,
                                e.target.value
                              )
                            }
                            className="w-28 rounded-lg border border-gray-300 p-2 text-right"
                          />
                        </td>

                        {/* DUE */}

                        <td className="px-4 py-4 text-right font-bold text-red-600">
                          ₹
                          {row.due_amount.toFixed(
                            2
                          )}
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-4 text-center">

                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              row.payment_status ===
                              "paid"
                                ? "bg-green-100 text-green-700"
                                : row.payment_status ===
                                  "partial"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {row.payment_status ===
                            "paid"
                              ? "Paid"
                              : row.payment_status ===
                                "partial"
                              ? "Partial"
                              : "Pending"}
                          </span>

                        </td>

                        {/* ACTION */}

                        <td className="px-4 py-4">

                          <div className="flex flex-col gap-2">

                            <button
                              onClick={() =>
                                savePayment(row)
                              }
                              disabled={
                                saving ===
                                row.customer_id
                              }
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {saving ===
                              row.customer_id
                                ? "Saving..."
                                : "Save"}
                            </button>

                            <Link
                              href={`/billing/${row.customer_id}`}
                              className="rounded-lg bg-green-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-green-700"
                            >
                              Generate Bill
                            </Link>

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* FORMULA */}

        <div className="mt-6 rounded-xl bg-blue-50 p-5">

          <h2 className="font-bold text-blue-900">
            Billing Formula
          </h2>

          <p className="mt-2 text-blue-800">
            Lunch Amount = Lunch Present × Lunch Rate
          </p>

          <p className="text-blue-800">
            Dinner Amount = Dinner Present × Dinner Rate
          </p>

          <p className="font-semibold text-blue-900">
            Total Bill = Lunch Amount + Dinner Amount
          </p>

          <p className="text-blue-800">
            Due = Total Bill − Paid Amount
          </p>

        </div>

      </div>
    </main>
  );
}