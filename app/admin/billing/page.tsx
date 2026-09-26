"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  lunch_rate: number | null;
  dinner_rate: number | null;
  start_date: string | null;
};

type Attendance = {
  id: string;
  customer_id: string;
  attendance_date: string;
  lunch: boolean;
  dinner: boolean;
};

type Billing = {
  id: string;
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
  payment_status: string;
  generated_at: string | null;
};

type BillingRow = {
  customer: Customer;
  lunchCount: number;
  dinnerCount: number;
  lunchRate: number;
  dinnerRate: number;
  lunchAmount: number;
  dinnerAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  billingId: string | null;
};

function getCurrentMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getBillingMonthDate(month: string) {
  return `${month}-01`;
}

function getMonthStart(month: string) {
  return `${month}-01`;
}

function getNextMonthStart(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  const date = new Date(year, monthNumber, 1);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}-01`;
}

function formatCurrency(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonth(month: string) {
  if (!month) return "";

  const [year, monthNumber] = month.split("-").map(Number);

  const date = new Date(year, monthNumber - 1, 1);

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getStatus(
  totalAmount: number,
  paidAmount: number
) {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);

  if (total <= 0) {
    return "pending";
  }

  if (paid >= total) {
    return "paid";
  }

  if (paid > 0) {
    return "partial";
  }

  return "pending";
}

export default function AdminBillingPage() {
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [existingBilling, setExistingBilling] = useState<Billing[]>(
    []
  );

  const [paidAmounts, setPaidAmounts] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState<string | null>(
    null
  );
  const [generatingCustomer, setGeneratingCustomer] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadBillingData() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const monthStart = getMonthStart(selectedMonth);
      const nextMonthStart = getNextMonthStart(selectedMonth);

      const [
        customersResult,
        attendanceResult,
        billingResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id,name,phone,active,lunch_rate,dinner_rate,start_date"
          )
          .eq("active", true)
          .order("name", { ascending: true }),

        supabase
          .from("attendance")
          .select(
            "id,customer_id,attendance_date,lunch,dinner"
          )
          .gte("attendance_date", monthStart)
          .lt("attendance_date", nextMonthStart),

        supabase
          .from("billing")
          .select(
            "id,customer_id,billing_month,lunch_count,dinner_count,lunch_rate,dinner_rate,lunch_amount,dinner_amount,total_amount,paid_amount,due_amount,payment_status,generated_at"
          )
          .eq("billing_month", getBillingMonthDate(selectedMonth)),
      ]);

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (attendanceResult.error) {
        throw attendanceResult.error;
      }

      if (billingResult.error) {
        throw billingResult.error;
      }

      setCustomers(customersResult.data || []);
      setAttendance(attendanceResult.data || []);
      setExistingBilling(billingResult.data || []);

      const initialPaid: Record<string, string> = {};

      (billingResult.data || []).forEach((bill) => {
        initialPaid[bill.customer_id] = String(
          Number(bill.paid_amount || 0)
        );
      });

      setPaidAmounts(initialPaid);
    } catch (err: any) {
      console.error("Billing load error:", err);

      setError(
        err?.message ||
          "Billing data load nahi ho paya."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBillingData();
  }, [selectedMonth]);

  const billingRows = useMemo<BillingRow[]>(() => {
    return customers.map((customer) => {
      const customerAttendance = attendance.filter(
        (item) => item.customer_id === customer.id
      );

      const lunchCount = customerAttendance.filter(
        (item) => item.lunch === true
      ).length;

      const dinnerCount = customerAttendance.filter(
        (item) => item.dinner === true
      ).length;

      const lunchRate = Number(
        customer.lunch_rate || 0
      );

      const dinnerRate = Number(
        customer.dinner_rate || 0
      );

      const lunchAmount = lunchCount * lunchRate;
      const dinnerAmount = dinnerCount * dinnerRate;

      const totalAmount =
        lunchAmount + dinnerAmount;

      const savedBill = existingBilling.find(
        (bill) =>
          bill.customer_id === customer.id
      );

      const paidAmount = Number(
        paidAmounts[customer.id] ??
          savedBill?.paid_amount ??
          0
      );

      const dueAmount = Math.max(
        totalAmount - paidAmount,
        0
      );

      const paymentStatus = getStatus(
        totalAmount,
        paidAmount
      );

      return {
        customer,
        lunchCount,
        dinnerCount,
        lunchRate,
        dinnerRate,
        lunchAmount,
        dinnerAmount,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus,
        billingId: savedBill?.id || null,
      };
    });
  }, [
    customers,
    attendance,
    existingBilling,
    paidAmounts,
  ]);

  const summary = useMemo(() => {
    return billingRows.reduce(
      (result, row) => {
        result.total += row.totalAmount;
        result.paid += row.paidAmount;
        result.due += row.dueAmount;

        return result;
      },
      {
        total: 0,
        paid: 0,
        due: 0,
      }
    );
  }, [billingRows]);

  function updatePaidAmount(
    customerId: string,
    value: string
  ) {
    if (value === "") {
      setPaidAmounts((prev) => ({
        ...prev,
        [customerId]: "",
      }));

      return;
    }

    const numericValue = value.replace(
      /[^0-9.]/g,
      ""
    );

    setPaidAmounts((prev) => ({
      ...prev,
      [customerId]: numericValue,
    }));
  }

  async function savePayment(row: BillingRow) {
    try {
      setSavingCustomer(row.customer.id);
      setError("");
      setSuccess("");

      const paidAmount = Math.max(
        Number(paidAmounts[row.customer.id] || 0),
        0
      );

      const dueAmount = Math.max(
        row.totalAmount - paidAmount,
        0
      );

      const paymentStatus = getStatus(
        row.totalAmount,
        paidAmount
      );

      const billingMonth =
        getBillingMonthDate(selectedMonth);

      const existing = existingBilling.find(
        (bill) =>
          bill.customer_id === row.customer.id
      );

      if (existing) {
        const { error: updateError } =
          await supabase
            .from("billing")
            .update({
              paid_amount: paidAmount,
              due_amount: dueAmount,
              payment_status: paymentStatus,
            })
            .eq("id", existing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } =
          await supabase
            .from("billing")
            .insert({
              customer_id: row.customer.id,
              billing_month: billingMonth,
              lunch_count: row.lunchCount,
              dinner_count: row.dinnerCount,
              lunch_rate: row.lunchRate,
              dinner_rate: row.dinnerRate,
              lunch_amount: row.lunchAmount,
              dinner_amount: row.dinnerAmount,
              total_amount: row.totalAmount,
              paid_amount: paidAmount,
              due_amount: dueAmount,
              payment_status: paymentStatus,
              generated_at: new Date().toISOString(),
            });

        if (insertError) {
          throw insertError;
        }
      }

      setSuccess(
        `Payment saved for ${row.customer.name}.`
      );

      await loadBillingData();
    } catch (err: any) {
      console.error("Save payment error:", err);

      setError(
        err?.message ||
          "Payment save nahi ho paya."
      );
    } finally {
      setSavingCustomer(null);
    }
  }

  async function generateBill(row: BillingRow) {
    try {
      setGeneratingCustomer(row.customer.id);
      setError("");
      setSuccess("");

      const billingMonth =
        getBillingMonthDate(selectedMonth);

      const paidAmount = Math.max(
        Number(paidAmounts[row.customer.id] || 0),
        0
      );

      const dueAmount = Math.max(
        row.totalAmount - paidAmount,
        0
      );

      const paymentStatus = getStatus(
        row.totalAmount,
        paidAmount
      );

      const existing = existingBilling.find(
        (bill) =>
          bill.customer_id === row.customer.id
      );

      if (existing) {
        const { error: updateError } =
          await supabase
            .from("billing")
            .update({
              billing_month: billingMonth,
              lunch_count: row.lunchCount,
              dinner_count: row.dinnerCount,
              lunch_rate: row.lunchRate,
              dinner_rate: row.dinnerRate,
              lunch_amount: row.lunchAmount,
              dinner_amount: row.dinnerAmount,
              total_amount: row.totalAmount,
              paid_amount: paidAmount,
              due_amount: dueAmount,
              payment_status: paymentStatus,
              generated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } =
          await supabase
            .from("billing")
            .insert({
              customer_id: row.customer.id,
              billing_month: billingMonth,
              lunch_count: row.lunchCount,
              dinner_count: row.dinnerCount,
              lunch_rate: row.lunchRate,
              dinner_rate: row.dinnerRate,
              lunch_amount: row.lunchAmount,
              dinner_amount: row.dinnerAmount,
              total_amount: row.totalAmount,
              paid_amount: paidAmount,
              due_amount: dueAmount,
              payment_status: paymentStatus,
              generated_at: new Date().toISOString(),
            });

        if (insertError) {
          throw insertError;
        }
      }

      setSuccess(
        `Bill generated for ${row.customer.name}.`
      );

      await loadBillingData();
    } catch (err: any) {
      console.error("Generate bill error:", err);

      setError(
        err?.message ||
          "Bill generate nahi ho paya."
      );
    } finally {
      setGeneratingCustomer(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-4 text-slate-900 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />

              <p className="text-slate-600">
                Billing loading...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Billing
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monthly customer billing and payment management
          </p>
        </section>

        {/* Month Selector */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="max-w-xs">
            <label
              htmlFor="billing-month"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Billing Month
            </label>

            <input
              id="billing-month"
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Billing Error
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            title="Total Bills"
            value={summary.total}
            type="normal"
          />

          <SummaryCard
            title="Total Paid"
            value={summary.paid}
            type="paid"
          />

          <SummaryCard
            title="Total Due"
            value={summary.due}
            type="due"
          />
        </section>

        {/* Billing Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {formatMonth(selectedMonth)} Billing
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Lunch and dinner charges are calculated from actual
              attendance.
            </p>
          </div>

          {billingRows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-slate-700">
                No active customers found.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add an active customer to generate billing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-4 font-semibold">
                      Customer
                    </th>

                    <th className="px-4 py-4 text-center font-semibold">
                      Lunch
                    </th>

                    <th className="px-4 py-4 text-center font-semibold">
                      Dinner
                    </th>

                    <th className="px-4 py-4 text-right font-semibold">
                      Lunch Rate
                    </th>

                    <th className="px-4 py-4 text-right font-semibold">
                      Dinner Rate
                    </th>

                    <th className="px-4 py-4 text-right font-semibold">
                      Lunch Amount
                    </th>

                    <th className="px-4 py-4 text-right font-semibold">
                      Dinner Amount
                    </th>

                    <th className="px-4 py-4 text-right font-semibold">
                      Total
                    </th>

                    <th className="px-4 py-4 text-right font-semibold">
                      Paid
                    </th>

                    <th className="px-4 py-4 text-right font-semibold">
                      Due
                    </th>

                    <th className="px-4 py-4 text-center font-semibold">
                      Status
                    </th>

                    <th className="px-4 py-4 text-center font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {billingRows.map((row) => (
                    <tr
                      key={row.customer.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* Customer */}
                      <td className="px-4 py-5">
                        <div className="font-semibold text-slate-900">
                          {row.customer.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {row.customer.phone || "-"}
                        </div>
                      </td>

                      {/* Lunch Count */}
                      <td className="px-4 py-5 text-center font-medium text-slate-800">
                        {row.lunchCount}
                      </td>

                      {/* Dinner Count */}
                      <td className="px-4 py-5 text-center font-medium text-slate-800">
                        {row.dinnerCount}
                      </td>

                      {/* Lunch Rate */}
                      <td className="px-4 py-5 text-right text-slate-700">
                        {formatCurrency(row.lunchRate)}
                      </td>

                      {/* Dinner Rate */}
                      <td className="px-4 py-5 text-right text-slate-700">
                        {formatCurrency(row.dinnerRate)}
                      </td>

                      {/* Lunch Amount */}
                      <td className="px-4 py-5 text-right font-medium text-slate-900">
                        {formatCurrency(row.lunchAmount)}
                      </td>

                      {/* Dinner Amount */}
                      <td className="px-4 py-5 text-right font-medium text-slate-900">
                        {formatCurrency(row.dinnerAmount)}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-5 text-right font-bold text-slate-900">
                        {formatCurrency(row.totalAmount)}
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            paidAmounts[row.customer.id] ??
                            ""
                          }
                          onChange={(event) =>
                            updatePaidAmount(
                              row.customer.id,
                              event.target.value
                            )
                          }
                          className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          placeholder="0"
                        />
                      </td>

                      {/* Due */}
                      <td className="px-4 py-5 text-right font-bold text-red-600">
                        {formatCurrency(row.dueAmount)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-5 text-center">
                        <StatusBadge
                          status={row.paymentStatus}
                        />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-5">
                        <div className="flex min-w-[130px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              savePayment(row)
                            }
                            disabled={
                              savingCustomer ===
                                row.customer.id ||
                              generatingCustomer ===
                                row.customer.id
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingCustomer ===
                            row.customer.id
                              ? "Saving..."
                              : "Save"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              generateBill(row)
                            }
                            disabled={
                              savingCustomer ===
                                row.customer.id ||
                              generatingCustomer ===
                                row.customer.id
                            }
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {generatingCustomer ===
                            row.customer.id
                              ? "Generating..."
                              : "Generate Bill"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  type,
}: {
  title: string;
  value: number;
  type: "normal" | "paid" | "due";
}) {
  const valueClass =
    type === "paid"
      ? "text-emerald-600"
      : type === "due"
      ? "text-red-600"
      : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${valueClass}`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "paid") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Paid
      </span>
    );
  }

  if (status === "partial") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        Partial
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
      Pending
    </span>
  );
}