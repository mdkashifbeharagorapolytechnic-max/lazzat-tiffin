"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
};

type Billing = {
  id: string;
  customer_id: string;
  billing_month: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
};

type Payment = {
  id: string;
  customer_id: string;
  billing_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  note: string | null;
  created_at: string;
};

type PaymentRow = Billing & {
  customer: Customer | null;
};

type HistoryRow = Payment & {
  customer: Customer | null;
};

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function getCurrentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function getToday() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function methodLabel(value: string) {
  const method = paymentMethods.find(
    (item) => item.value === value
  );

  return method?.label || value;
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");

  const [paymentAmounts, setPaymentAmounts] = useState<
    Record<string, string>
  >({});

  const [paymentDates, setPaymentDates] = useState<
    Record<string, string>
  >({});

  const [paymentMethodsMap, setPaymentMethodsMap] =
    useState<Record<string, string>>({});

  const [notes, setNotes] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(
    null
  );

  const [historyLoading, setHistoryLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPayments();
  }, [month]);

  useEffect(() => {
    loadHistory();
  }, [month]);

  async function loadPayments() {
    setLoading(true);
    setError("");

    const { data: billingData, error: billingError } =
      await supabase
        .from("billing")
        .select(
          "id, customer_id, billing_month, total_amount, paid_amount, due_amount"
        )
        .eq("billing_month", month)
        .order("generated_at", {
          ascending: false,
        });

    if (billingError) {
      console.error(billingError);
      setError(billingError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    if (!billingData || billingData.length === 0) {
      setRows([]);
      setPaymentAmounts({});
      setPaymentDates({});
      setPaymentMethodsMap({});
      setNotes({});
      setLoading(false);
      return;
    }

    const customerIds = [
      ...new Set(
        billingData.map((item) => item.customer_id)
      ),
    ];

    const { data: customerData, error: customerError } =
      await supabase
        .from("customers")
        .select("id, name, phone")
        .in("id", customerIds);

    if (customerError) {
      console.error(customerError);
      setError(customerError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const customerMap = new Map<string, Customer>();

    (customerData || []).forEach((customer) => {
      customerMap.set(customer.id, customer);
    });

    const combinedRows: PaymentRow[] = billingData.map(
      (billing) => ({
        ...billing,
        customer:
          customerMap.get(billing.customer_id) || null,
      })
    );

    setRows(combinedRows);

    const amounts: Record<string, string> = {};
    const dates: Record<string, string> = {};
    const methods: Record<string, string> = {};
    const noteValues: Record<string, string> = {};

    combinedRows.forEach((row) => {
      amounts[row.id] = "";
      dates[row.id] = getToday();
      methods[row.id] = "cash";
      noteValues[row.id] = "";
    });

    setPaymentAmounts(amounts);
    setPaymentDates(dates);
    setPaymentMethodsMap(methods);
    setNotes(noteValues);

    setLoading(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);

    const { data: paymentsData, error: paymentsError } =
      await supabase
        .from("payments")
        .select(
          "id, customer_id, billing_id, amount, payment_date, payment_method, note, created_at"
        )
        .order("payment_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

    if (paymentsError) {
      console.error(paymentsError);
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    if (!paymentsData || paymentsData.length === 0) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const customerIds = [
      ...new Set(
        paymentsData.map((item) => item.customer_id)
      ),
    ];

    const { data: customerData } = await supabase
      .from("customers")
      .select("id, name, phone")
      .in("id", customerIds);

    const customerMap = new Map<string, Customer>();

    (customerData || []).forEach((customer) => {
      customerMap.set(customer.id, customer);
    });

    const combinedHistory: HistoryRow[] =
      paymentsData.map((payment) => ({
        ...payment,
        customer:
          customerMap.get(payment.customer_id) || null,
      }));

    setHistory(combinedHistory);
    setHistoryLoading(false);
  }

  async function recordPayment(row: PaymentRow) {
    setError("");
    setMessage("");

    const amount = Number(paymentAmounts[row.id]);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    const due = Number(row.due_amount || 0);

    if (due <= 0) {
      setError("This bill is already fully paid.");
      return;
    }

    if (amount > due) {
      setError(
        `Payment cannot be more than the due amount of ${formatCurrency(
          due
        )}.`
      );
      return;
    }

    const paymentDate =
      paymentDates[row.id] || getToday();

    const paymentMethod =
      paymentMethodsMap[row.id] || "cash";

    const note = notes[row.id] || null;

    setSavingId(row.id);

    const { data, error: rpcError } =
      await supabase.rpc(
        "record_admin_payment",
        {
          p_billing_id: row.id,
          p_amount: amount,
          p_payment_date: paymentDate,
          p_payment_method: paymentMethod,
          p_note: note,
        }
      );

    if (rpcError) {
      console.error(rpcError);
      setError(rpcError.message);
      setSavingId(null);
      return;
    }

    console.log("Payment recorded:", data);

    setMessage(
      `${formatCurrency(amount)} received from ${
        row.customer?.name || "customer"
      }.`
    );

    await Promise.all([
      loadPayments(),
      loadHistory(),
    ]);

    setSavingId(null);
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) => {
      const name =
        row.customer?.name?.toLowerCase() || "";

      const phone =
        row.customer?.phone?.toLowerCase() || "";

      return (
        name.includes(query) ||
        phone.includes(query)
      );
    });
  }, [rows, search]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((payment) => {
      const paymentMonth =
        payment.payment_date.slice(0, 7);

      const selectedMonth = month.slice(0, 7);

      const matchesMonth =
        paymentMonth === selectedMonth;

      if (!matchesMonth) return false;

      if (!query) return true;

      const name =
        payment.customer?.name?.toLowerCase() || "";

      const phone =
        payment.customer?.phone?.toLowerCase() || "";

      return (
        name.includes(query) ||
        phone.includes(query)
      );
    });
  }, [history, search, month]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (result, row) => {
        result.bill += Number(row.total_amount || 0);
        result.paid += Number(row.paid_amount || 0);
        result.due += Number(row.due_amount || 0);

        return result;
      },
      {
        bill: 0,
        paid: 0,
        due: 0,
      }
    );
  }, [filteredRows]);

  const historyTotal = useMemo(() => {
    return filteredHistory.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );
  }, [filteredHistory]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Payments
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Record payments and maintain permanent payment history.
          </p>
        </div>

        {/* FILTERS */}
        <div className="mb-6 grid gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Billing Month
            </label>

            <input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => {
                setMonth(`${e.target.value}-01`);
                setMessage("");
                setError("");
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search Customer
            </label>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or phone"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
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
              Total Bill
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(totals.bill)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Paid
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(totals.paid)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Due
            </p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(totals.due)}
            </p>
          </div>
        </div>

        {/* RECORD PAYMENT */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900">
              Record Payment
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {formatMonth(month)}
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading billing records...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No billing records found for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Bill
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Paid
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Due
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Method
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Note
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRows.map((row) => {
                    const due = Number(
                      row.due_amount || 0
                    );

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {row.customer?.name ||
                              "Unknown Customer"}
                          </div>

                          {row.customer?.phone && (
                            <div className="mt-1 text-xs text-gray-500">
                              {row.customer.phone}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-medium">
                          {formatCurrency(
                            Number(row.total_amount || 0)
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-medium text-green-600">
                          {formatCurrency(
                            Number(row.paid_amount || 0)
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-red-600">
                          {formatCurrency(due)}
                        </td>

                        <td className="px-5 py-4">
                          {due > 0 ? (
                            <input
                              type="number"
                              min="1"
                              max={due}
                              step="1"
                              value={
                                paymentAmounts[row.id] || ""
                              }
                              onChange={(e) => {
                                setPaymentAmounts(
                                  (current) => ({
                                    ...current,
                                    [row.id]:
                                      e.target.value,
                                  })
                                );
                              }}
                              placeholder="Amount"
                              className="w-28 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                          ) : (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Fully Paid
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {due > 0 && (
                            <input
                              type="date"
                              value={
                                paymentDates[row.id] ||
                                getToday()
                              }
                              onChange={(e) => {
                                setPaymentDates(
                                  (current) => ({
                                    ...current,
                                    [row.id]:
                                      e.target.value,
                                  })
                                );
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {due > 0 && (
                            <select
                              value={
                                paymentMethodsMap[row.id] ||
                                "cash"
                              }
                              onChange={(e) => {
                                setPaymentMethodsMap(
                                  (current) => ({
                                    ...current,
                                    [row.id]:
                                      e.target.value,
                                  })
                                );
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            >
                              {paymentMethods.map(
                                (method) => (
                                  <option
                                    key={method.value}
                                    value={method.value}
                                  >
                                    {method.label}
                                  </option>
                                )
                              )}
                            </select>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {due > 0 && (
                            <input
                              type="text"
                              value={notes[row.id] || ""}
                              onChange={(e) => {
                                setNotes((current) => ({
                                  ...current,
                                  [row.id]:
                                    e.target.value,
                                }));
                              }}
                              placeholder="Optional"
                              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {due > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                recordPayment(row)
                              }
                              disabled={
                                savingId === row.id
                              }
                              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingId === row.id
                                ? "Saving..."
                                : "Record"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAYMENT HISTORY */}
        <div className="mt-8 rounded-xl bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Payment History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {formatMonth(month)} •{" "}
                {filteredHistory.length} payment
                {filteredHistory.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="text-sm font-semibold text-green-600">
              Received: {formatCurrency(historyTotal)}
            </div>
          </div>

          {historyLoading ? (
            <div className="p-10 text-center text-gray-500">
              Loading payment history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No payments recorded for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Method
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                      Note
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(payment.payment_date)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">
                          {payment.customer?.name ||
                            "Unknown Customer"}
                        </div>

                        {payment.customer?.phone && (
                          <div className="mt-1 text-xs text-gray-500">
                            {payment.customer.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-green-600">
                        {formatCurrency(
                          Number(payment.amount || 0)
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {methodLabel(
                          payment.payment_method
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500">
                        {payment.note || "-"}
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