"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function methodLabel(value: string) {
  return paymentMethods.find((item) => item.value === value)?.label || value || "-";
}

export default function PaymentsPage() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError("");

    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("id,customer_id,billing_id,amount,payment_date,payment_method,note,created_at")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (paymentsError) {
      setError(paymentsError.message);
      setHistory([]);
      setLoading(false);
      return;
    }

    if (!paymentsData || paymentsData.length === 0) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const customerIds = [...new Set(paymentsData.map((item) => item.customer_id))];
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("id,name,phone")
      .in("id", customerIds);

    if (customerError) {
      setError(customerError.message);
      setHistory([]);
      setLoading(false);
      return;
    }

    const customerMap = new Map<string, Customer>();
    (customerData || []).forEach((customer) => customerMap.set(customer.id, customer));

    setHistory(paymentsData.map((payment) => ({
      ...payment,
      customer: customerMap.get(payment.customer_id) || null,
    })));
    setLoading(false);
  }

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return history;
    return history.filter((payment) =>
      (payment.customer?.name || "").toLowerCase().includes(query) ||
      (payment.customer?.phone || "").toLowerCase().includes(query)
    );
  }, [history, search]);

  const historyTotal = useMemo(
    () => filteredHistory.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [filteredHistory]
  );

  const customerTotals = useMemo(() => {
    const totals = new Map<string, { name: string; phone: string | null; total: number; count: number }>();
    filteredHistory.forEach((payment) => {
      const id = payment.customer_id;
      const current = totals.get(id) || {
        name: payment.customer?.name || "Unknown Customer",
        phone: payment.customer?.phone || null,
        total: 0,
        count: 0,
      };
      current.total += Number(payment.amount || 0);
      current.count += 1;
      totals.set(id, current);
    });
    return [...totals.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [filteredHistory]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          <p className="mt-1 text-sm text-gray-500">
            All customer payments across every month. New payments are added from Billing.
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Search Customer
          </label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Customer name or phone"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{filteredHistory.length}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Received</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(historyTotal)}</p>
          </div>
        </div>

        <section className="mb-6 rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900">Customer-wise Total</h2>
            <p className="mt-1 text-sm text-gray-500">Each customer's full payment total, without month restrictions.</p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading payment history...</div>
          ) : customerTotals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No payment history found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Payment Entries</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Total Received (All Time)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerTotals.map(([id, customer]) => (
                    <tr key={id}>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{customer.name}</div>
                        {customer.phone && <div className="mt-1 text-xs text-gray-500">{customer.phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-right">{customer.count}</td>
                      <td className="px-5 py-4 text-right font-bold text-green-600">{formatCurrency(customer.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900">Complete Payment History</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredHistory.length} payment entries • All dates and months
            </p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading payment history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No payments found for this customer.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">Method</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm text-gray-600">{formatDate(payment.payment_date)}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{payment.customer?.name || "Unknown Customer"}</div>
                        {payment.customer?.phone && <div className="mt-1 text-xs text-gray-500">{payment.customer.phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-green-600">{formatCurrency(Number(payment.amount || 0))}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{methodLabel(payment.payment_method)}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{payment.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
