"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  lunch_rate: number;
  dinner_rate: number;
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
  payment_status: "pending" | "partial" | "paid";
};

type Attendance = {
  lunch: boolean;
  dinner: boolean;
  extra_lunch_count: number;
  extra_dinner_count: number;
  attendance_date: string;
};

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  note: string | null;
  created_at: string;
};

type Report = {
  customer: Customer;
  billing: Billing | null;

  lunchCount: number;
  dinnerCount: number;
  extraLunchCount: number;
  extraDinnerCount: number;
  extraLunchAmount: number;
  extraDinnerAmount: number;

  lunchRate: number;
  dinnerRate: number;
  lunchAmount: number;
  dinnerAmount: number;
  totalAmount: number;

  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;

  payments: Payment[];
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  card: "Card",
  other: "Other",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function formatMonth(value: string) {
  if (!value) return "";

  return new Date(`${value}-01T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
}

export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [report, setReport] = useState<Report | null>(null);

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [loadingReport, setLoadingReport] =
    useState(false);

  const [error, setError] = useState("");

  async function fetchCustomers() {
    setLoadingCustomers(true);
    setError("");

    const { data, error } = await supabase
      .from("customers")
      .select(
        "id, name, phone, address, lunch_rate, dinner_rate"
      )
      .order("name");

    if (error) {
      console.error("Customer fetch error:", error);
      setError(error.message);
      setCustomers([]);
      setLoadingCustomers(false);
      return;
    }

    const customerList = data || [];

    setCustomers(customerList);

    if (customerList.length > 0) {
      setSelectedCustomer((current) =>
        current || customerList[0].id
      );
    }

    setLoadingCustomers(false);
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function generateReport() {
    if (!selectedCustomer) {
      setReport(null);
      return;
    }

    setLoadingReport(true);
    setError("");

    const customer = customers.find(
      (item) => item.id === selectedCustomer
    );

    if (!customer) {
      setReport(null);
      setLoadingReport(false);
      return;
    }

    const monthStart = `${selectedMonth}-01`;

    const nextMonthDate = new Date(
      Number(selectedMonth.slice(0, 4)),
      Number(selectedMonth.slice(5, 7)),
      1
    );

    const monthEnd = `${nextMonthDate.getFullYear()}-${String(
      nextMonthDate.getMonth() + 1
    ).padStart(2, "0")}-01`;

    try {
      const [
        attendanceResult,
        billingResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("attendance")
          .select(
            "lunch, dinner, extra_lunch_count, extra_dinner_count, attendance_date"
          )
          .eq("customer_id", selectedCustomer)
          .gte("attendance_date", monthStart)
          .lt("attendance_date", monthEnd)
          .order("attendance_date", {
            ascending: true,
          }),

        supabase
          .from("billing")
          .select(
            "id, customer_id, billing_month, lunch_count, dinner_count, extra_lunch_count, extra_dinner_count, extra_lunch_amount, extra_dinner_amount, lunch_rate, dinner_rate, lunch_amount, dinner_amount, total_amount, paid_amount, due_amount, payment_status"
          )
          .eq("customer_id", selectedCustomer)
          .eq("billing_month", `${monthStart}`)
          .maybeSingle(),

        supabase
          .from("payments")
          .select(
            "id, amount, payment_date, payment_method, note, created_at"
          )
          .eq("customer_id", selectedCustomer)
          .gte("payment_date", monthStart)
          .lt("payment_date", monthEnd)
          .order("payment_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (attendanceResult.error) {
        throw attendanceResult.error;
      }

      if (billingResult.error) {
        throw billingResult.error;
      }

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      const attendanceData =
        attendanceResult.data || [];

      const billing = billingResult.data;

      const payments = paymentsResult.data || [];

      // Attendance counts must come from the attendance records.
      // A previously generated bill can contain stale zero counts.
      const lunchCount = attendanceData.filter(
        (item: Attendance) => item.lunch === true
      ).length;

      const dinnerCount = attendanceData.filter(
        (item: Attendance) => item.dinner === true
      ).length;
      const extraLunchCount = attendanceData.reduce(
        (sum: number, item: Attendance) => sum + Number(item.extra_lunch_count || 0), 0
      );
      const extraDinnerCount = attendanceData.reduce(
        (sum: number, item: Attendance) => sum + Number(item.extra_dinner_count || 0), 0
      );

      // A saved zero value can be a legacy billing bug, not a real charge.
      // Preserve valid historical rates and amounts; recalculate only missing/zero values.
      const savedLunchRate = Number(billing?.lunch_rate ?? 0);
      const savedDinnerRate = Number(billing?.dinner_rate ?? 0);
      const lunchRate =
        savedLunchRate > 0
          ? savedLunchRate
          : Number(customer.lunch_rate ?? 0);
      const dinnerRate =
        savedDinnerRate > 0
          ? savedDinnerRate
          : Number(customer.dinner_rate ?? 0);

      const calculatedLunchAmount = lunchCount * lunchRate;
      const calculatedDinnerAmount = dinnerCount * dinnerRate;
      const extraLunchAmount = extraLunchCount * lunchRate;
      const extraDinnerAmount = extraDinnerCount * dinnerRate;

      const savedLunchAmount = Number(billing?.lunch_amount ?? 0);
      const savedDinnerAmount = Number(billing?.dinner_amount ?? 0);
      const lunchAmount =
        savedLunchAmount > 0
          ? savedLunchAmount
          : calculatedLunchAmount;
      const dinnerAmount =
        savedDinnerAmount > 0
          ? savedDinnerAmount
          : calculatedDinnerAmount;

      const calculatedTotal = lunchAmount + dinnerAmount + extraLunchAmount + extraDinnerAmount;
      const savedTotalAmount = Number(billing?.total_amount ?? 0);
      const totalAmount =
        savedTotalAmount > 0
          ? Math.max(savedTotalAmount, calculatedTotal)
          : calculatedTotal;

      const paidAmount = Math.max(
        Number(billing?.paid_amount ?? 0),
        0
      );
      const dueAmount = Math.max(totalAmount - paidAmount, 0);

      let paymentStatus = "Pending";
      if (totalAmount > 0 && paidAmount >= totalAmount) {
        paymentStatus = "Paid";
      } else if (paidAmount > 0) {
        paymentStatus = "Partial";
      }

      setReport({
        customer,
        billing: billing || null,

        lunchCount,
        dinnerCount,
        extraLunchCount,
        extraDinnerCount,
        extraLunchAmount,
        extraDinnerAmount,

        lunchRate,
        dinnerRate,
        lunchAmount,
        dinnerAmount,
        totalAmount,

        paidAmount,
        dueAmount,
        paymentStatus,

        payments: payments as Payment[],
      });
    } catch (err: any) {
      console.error("Report generation error:", err);

      setError(
        err?.message ||
          "Unable to generate customer report."
      );

      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }

  useEffect(() => {
    if (selectedCustomer && customers.length > 0) {
      generateReport();
    }
  }, [
    selectedCustomer,
    selectedMonth,
    customers,
  ]);

  const paymentHistoryTotal = useMemo(() => {
    return (
      report?.payments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      ) || 0
    );
  }, [report]);

  function sendWhatsAppBill() {
    if (!report) return;

    const paymentLines =
      report.payments.length > 0
        ? report.payments
            .map(
              (payment) =>
                `${formatDate(
                  payment.payment_date
                )} - ${formatCurrency(
                  Number(payment.amount)
                )} (${paymentMethodLabels[
                  payment.payment_method
                ] || payment.payment_method})`
            )
            .join("\n")
        : "No payments recorded";

    const message = `
*LAZZAT TIFFIN*
━━━━━━━━━━━━━━━━━━━━
*Monthly Statement - ${formatMonth(
      selectedMonth
    )}*

*Customer:* ${report.customer.name}
*Phone:* ${report.customer.phone}

*LUNCH*
${report.lunchCount} × ₹${report.lunchRate} = ${formatCurrency(
      report.lunchAmount
    )}

*DINNER*
${report.dinnerCount} × ₹${report.dinnerRate} = ${formatCurrency(
      report.dinnerAmount
    )}

*GUEST / EXTRA MEALS*
Lunch: ${report.extraLunchCount} × ₹${report.lunchRate} = ${formatCurrency(report.extraLunchAmount)}
Dinner: ${report.extraDinnerCount} × ₹${report.dinnerRate} = ${formatCurrency(report.extraDinnerAmount)}

━━━━━━━━━━━━━━━━━━━━
*TOTAL BILL:* ${formatCurrency(
      report.totalAmount
    )}
*PAID:* ${formatCurrency(report.paidAmount)}
*DUE:* ${formatCurrency(report.dueAmount)}

*STATUS:* ${report.paymentStatus.toUpperCase()}

*PAYMENT HISTORY*
${paymentLines}

━━━━━━━━━━━━━━━━━━━━
Thank you for choosing
*Lazzat Tiffin*

Fresh Homemade Food
Healthy Tiffin Delivered Daily
    `.trim();

    const phone = report.customer.phone.replace(
      /\D/g,
      ""
    );

    const whatsappPhone =
      phone.length === 10
        ? `91${phone}`
        : phone;

    const whatsappUrl =
      `https://wa.me/${whatsappPhone}` +
      `?text=${encodeURIComponent(message)}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Customer Monthly Statement
          </h1>

          <p className="mt-2 text-gray-600">
            Attendance, billing and payment history
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* FILTERS */}
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow md:grid-cols-2">
          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              Customer
            </label>

            {loadingCustomers ? (
              <div className="rounded-lg border bg-gray-50 px-4 py-3 text-gray-500">
                Loading customers...
              </div>
            ) : (
              <select
                value={selectedCustomer}
                onChange={(e) =>
                  setSelectedCustomer(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                <option value="">
                  Select Customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-2 block font-semibold text-gray-700">
              Month
            </label>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* LOADING */}
        {loadingReport && (
          <div className="mb-6 rounded-xl bg-white p-8 text-center shadow">
            <p className="font-medium text-gray-700">
              Generating statement...
            </p>
          </div>
        )}

        {/* EMPTY */}
        {!loadingReport &&
          !report &&
          selectedCustomer && (
            <div className="rounded-xl bg-white p-8 text-center shadow">
              <p className="text-gray-500">
                No statement available.
              </p>
            </div>
          )}

        {/* REPORT */}
        {!loadingReport && report && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            {/* HEADER */}
            <div className="bg-gray-900 p-6 text-white">
              <h2 className="text-2xl font-bold">
                LAZZAT TIFFIN
              </h2>

              <p className="mt-1 text-gray-300">
                Monthly Statement
              </p>

              <p className="mt-4 text-lg font-semibold">
                {formatMonth(selectedMonth)}
              </p>
            </div>

            {/* CUSTOMER */}
            <div className="border-b p-6">
              <p className="text-sm text-gray-500">
                Customer
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {report.customer.name}
              </p>

              <p className="mt-1 text-gray-600">
                Phone: {report.customer.phone}
              </p>

              {report.customer.address && (
                <p className="mt-1 text-gray-600">
                  Address: {report.customer.address}
                </p>
              )}
            </div>

            {/* MEALS */}
            <div className="grid gap-0 border-b md:grid-cols-2">
              <div className="border-b p-6 md:border-b-0 md:border-r">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Lunch
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {report.lunchCount} meals × ₹
                      {report.lunchRate}
                    </p>
                  </div>

                  <p className="text-xl font-bold">
                    {formatCurrency(
                      report.lunchAmount
                    )}
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Dinner
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {report.dinnerCount} meals × ₹
                      {report.dinnerRate}
                    </p>
                  </div>

                  <p className="text-xl font-bold">
                    {formatCurrency(
                      report.dinnerAmount
                    )}
                  </p>
                </div>
              </div>
              <div className="border-t border-amber-200 bg-amber-50 p-6 md:col-span-2">
                <h3 className="font-bold text-amber-900">Guest / Extra Meals</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-900">Guest Lunch: {report.extraLunchCount} × ₹{report.lunchRate}</span>
                    <span className="font-bold text-amber-900">{formatCurrency(report.extraLunchAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-900">Guest Dinner: {report.extraDinnerCount} × ₹{report.dinnerRate}</span>
                    <span className="font-bold text-amber-900">{formatCurrency(report.extraDinnerAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BILL SUMMARY */}
            <div className="bg-gray-50 p-6">
              <div className="flex justify-between py-2">
                <span className="font-semibold">
                  Total Bill
                </span>

                <span className="font-bold">
                  {formatCurrency(
                    report.totalAmount
                  )}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="font-semibold">
                  Paid
                </span>

                <span className="font-bold text-green-600">
                  {formatCurrency(
                    report.paidAmount
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t pt-4 text-lg">
                <span className="font-bold">
                  Due
                </span>

                <span className="font-bold text-red-600">
                  {formatCurrency(
                    report.dueAmount
                  )}
                </span>
              </div>
            </div>

            {/* STATUS */}
            <div className="p-6 text-center">
              <span
                className={`inline-block rounded-full px-5 py-2 font-bold ${
                  report.paymentStatus === "Paid"
                    ? "bg-green-100 text-green-700"
                    : report.paymentStatus === "Partial"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {report.paymentStatus}
              </span>
            </div>

            {/* PAYMENT HISTORY */}
            <div className="border-t p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Payment History
                  </h3>

                  <p className="text-sm text-gray-500">
                    {report.payments.length} payment
                    {report.payments.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <p className="font-bold text-green-600">
                  Received:{" "}
                  {formatCurrency(
                    paymentHistoryTotal
                  )}
                </p>
              </div>

              {report.payments.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-500">
                  No payment history for this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px]">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                          Date
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                          Amount
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                          Method
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                          Note
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {report.payments.map(
                        (payment) => (
                          <tr key={payment.id}>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatDate(
                                payment.payment_date
                              )}
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-green-600">
                              {formatCurrency(
                                Number(
                                  payment.amount
                                )
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-700">
                              {paymentMethodLabels[
                                payment
                                  .payment_method
                              ] ||
                                payment.payment_method}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-500">
                              {payment.note || "-"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* WHATSAPP */}
            <div className="px-6 pb-6">
              <button
                onClick={sendWhatsAppBill}
                className="w-full rounded-xl bg-green-600 px-5 py-4 text-lg font-bold text-white transition hover:bg-green-700"
              >
                Send Statement on WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}