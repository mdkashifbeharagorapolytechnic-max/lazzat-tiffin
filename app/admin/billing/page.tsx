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
  extra_lunch_count: number;
  extra_dinner_count: number;
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

type Payment = {
  id: string;
  billing_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  note: string | null;
};

type BillingRow = {
  customer: Customer;
  payments: Payment[];
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

  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false);

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
            "id,customer_id,attendance_date,lunch,dinner,extra_lunch_count,extra_dinner_count"
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

      const bills = billingResult.data || [];
      const billIds = bills.map((bill) => bill.id);
      let paymentRows: Payment[] = [];

      if (billIds.length > 0) {
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .select("id,billing_id,amount,payment_date,payment_method,note")
          .in("billing_id", billIds)
          .order("payment_date", { ascending: false });

        if (paymentError) throw paymentError;
        paymentRows = (paymentData || []) as Payment[];
      }

      setCustomers(customersResult.data || []);
      setAttendance(attendanceResult.data || []);
      setExistingBilling(bills);
      setPayments(paymentRows);

      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const dates: Record<string, string> = {};
      const methods: Record<string, string> = {};
      (customersResult.data || []).forEach((customer) => {
        dates[customer.id] = todayString;
        methods[customer.id] = "cash";
      });
      setPaymentDates(dates);
      setPaymentMethods(methods);
      setPaymentAmounts({});
      setPaymentNotes({});
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
      const extraLunchCount = customerAttendance.reduce(
        (sum, item) => sum + Number(item.extra_lunch_count || 0), 0
      );
      const extraDinnerCount = customerAttendance.reduce(
        (sum, item) => sum + Number(item.extra_dinner_count || 0), 0
      );

      const savedBill = existingBilling.find(
        (bill) =>
          bill.customer_id === customer.id
      );

      // Keep the rates saved on an existing bill so that
      // changing a customer's current rates does not rewrite
      // historical months when the bill is viewed or regenerated.
      // Preserve a valid historical rate, but recover from legacy
      // saved bills that contain a zero rate when the customer has a rate.
      const savedLunchRate = Number(savedBill?.lunch_rate ?? 0);
      const savedDinnerRate = Number(savedBill?.dinner_rate ?? 0);
      const currentLunchRate = Number(customer.lunch_rate ?? 0);
      const currentDinnerRate = Number(customer.dinner_rate ?? 0);

      const lunchRate =
        savedLunchRate > 0 ? savedLunchRate : currentLunchRate;
      const dinnerRate =
        savedDinnerRate > 0 ? savedDinnerRate : currentDinnerRate;

      const lunchAmount = lunchCount * lunchRate;
      const dinnerAmount = dinnerCount * dinnerRate;
      const extraLunchAmount = extraLunchCount * lunchRate;
      const extraDinnerAmount = extraDinnerCount * dinnerRate;

      const totalAmount =
        lunchAmount + dinnerAmount + extraLunchAmount + extraDinnerAmount;

      const customerPayments = payments.filter(
        (payment) => payment.billing_id === savedBill?.id
      );
      const paidAmount = customerPayments.length > 0
        ? customerPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
        : Number(savedBill?.paid_amount || 0);

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
        payments: customerPayments,
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
        billingId: savedBill?.id || null,
      };
    });
  }, [
    customers,
    attendance,
    existingBilling,
    payments,
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

  async function savePayment(row: BillingRow) {
    try {
      setSavingCustomer(row.customer.id);
      setError("");
      setSuccess("");

      const amount = Number(paymentAmounts[row.customer.id] || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount sahi se enter karein.");
      }
      if (amount > row.dueAmount) {
        throw new Error(`Payment due amount ${formatCurrency(row.dueAmount)} se zyada nahi ho sakta.`);
      }

      let billingId = row.billingId;
      if (!billingId) {
        const { data: createdBill, error: createError } = await supabase
          .from("billing")
          .insert({
            customer_id: row.customer.id,
            billing_month: getBillingMonthDate(selectedMonth),
            lunch_count: row.lunchCount,
            dinner_count: row.dinnerCount,
            extra_lunch_count: row.extraLunchCount,
            extra_dinner_count: row.extraDinnerCount,
            extra_lunch_amount: row.extraLunchAmount,
            extra_dinner_amount: row.extraDinnerAmount,
            lunch_rate: row.lunchRate,
            dinner_rate: row.dinnerRate,
            lunch_amount: row.lunchAmount,
            dinner_amount: row.dinnerAmount,
            total_amount: row.totalAmount,
            paid_amount: 0,
            due_amount: row.totalAmount,
            payment_status: getStatus(row.totalAmount, 0),
            generated_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (createError) throw createError;
        billingId = createdBill.id;
      }

      const { error: paymentError } = await supabase.rpc("record_admin_payment", {
        p_billing_id: billingId,
        p_amount: amount,
        p_payment_date: paymentDates[row.customer.id],
        p_payment_method: paymentMethods[row.customer.id] || "cash",
        p_note: paymentNotes[row.customer.id] || null,
      });
      if (paymentError) throw paymentError;

      setPaymentAmounts((current) => ({ ...current, [row.customer.id]: "" }));
      setPaymentNotes((current) => ({ ...current, [row.customer.id]: "" }));
      setSuccess(`${formatCurrency(amount)} payment ${row.customer.name} ke bill mein add ho gaya.`);
      await loadBillingData();
    } catch (err: any) {
      console.error("Record billing payment error:", err);
      setError(err?.message || "Payment save nahi ho paya.");
    } finally {
      setSavingCustomer(null);
    }
  }

  function startEditingPayment(payment: Payment) {
    setEditingPayment({ ...payment });
    setError("");
    setSuccess("");
  }

  async function saveEditedPayment() {
    if (!editingPayment) return;

    try {
      setSavingPaymentEdit(true);
      setError("");
      setSuccess("");

      const amount = Number(editingPayment.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount 0 se zyada hona chahiye.");
      }
      if (!editingPayment.payment_date) {
        throw new Error("Payment date select karein.");
      }

      const { data: updatedPayment, error: paymentError } = await supabase
        .from("payments")
        .update({
          amount,
          payment_date: editingPayment.payment_date,
          payment_method: editingPayment.payment_method || "cash",
          note: editingPayment.note || null,
        })
        .eq("id", editingPayment.id)
        .select("id")
        .maybeSingle();

      if (paymentError) throw paymentError;
      if (!updatedPayment) {
        throw new Error("Payment update nahi hua. Admin permission check karein.");
      }

      if (editingPayment.billing_id) {
        const { data: bill, error: billReadError } = await supabase
          .from("billing")
          .select("id,total_amount")
          .eq("id", editingPayment.billing_id)
          .single();
        if (billReadError) throw billReadError;

        const { data: billPayments, error: paymentsReadError } = await supabase
          .from("payments")
          .select("amount")
          .eq("billing_id", editingPayment.billing_id);
        if (paymentsReadError) throw paymentsReadError;

        const paidAmount = (billPayments || []).reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0
        );
        const totalAmount = Number(bill.total_amount || 0);
        const { error: billUpdateError } = await supabase
          .from("billing")
          .update({
            paid_amount: paidAmount,
            due_amount: Math.max(totalAmount - paidAmount, 0),
            payment_status: getStatus(totalAmount, paidAmount),
          })
          .eq("id", editingPayment.billing_id);
        if (billUpdateError) throw billUpdateError;
      }

      setEditingPayment(null);
      setSuccess("Payment details successfully update ho gaye.");
      await loadBillingData();
    } catch (err: any) {
      console.error("Edit billing payment error:", err);
      setError(err?.message || "Payment update nahi ho paya.");
    } finally {
      setSavingPaymentEdit(false);
    }
  }

  async function generateBill(row: BillingRow) {
    try {
      setGeneratingCustomer(row.customer.id);
      setError("");
      setSuccess("");

      const billingMonth =
        getBillingMonthDate(selectedMonth);

      const paidAmount = row.paidAmount;

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
              extra_lunch_count: row.extraLunchCount,
              extra_dinner_count: row.extraDinnerCount,
              extra_lunch_amount: row.extraLunchAmount,
              extra_dinner_amount: row.extraDinnerAmount,
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
              extra_lunch_count: row.extraLunchCount,
              extra_dinner_count: row.extraDinnerCount,
              extra_lunch_amount: row.extraLunchAmount,
              extra_dinner_amount: row.extraDinnerAmount,
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

        {editingPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <h2 className="text-lg font-bold text-slate-900">Edit Payment</h2>
              <p className="mt-1 text-sm text-slate-500">Amount, date, method aur note update karein.</p>
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Amount
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editingPayment.amount}
                    onChange={(event) => setEditingPayment((current) => current ? { ...current, amount: Number(event.target.value) } : current)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Payment Date
                  <input
                    type="date"
                    value={editingPayment.payment_date}
                    onChange={(event) => setEditingPayment((current) => current ? { ...current, payment_date: event.target.value } : current)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Payment Method
                  <select
                    value={editingPayment.payment_method || "cash"}
                    onChange={(event) => setEditingPayment((current) => current ? { ...current, payment_method: event.target.value } : current)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Note (optional)
                  <input
                    type="text"
                    value={editingPayment.note || ""}
                    onChange={(event) => setEditingPayment((current) => current ? { ...current, note: event.target.value } : current)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Note"
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  disabled={savingPaymentEdit}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditedPayment}
                  disabled={savingPaymentEdit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingPaymentEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
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

                    <th className="px-4 py-4 text-center font-semibold">
                      Guest Lunch
                    </th>

                    <th className="px-4 py-4 text-center font-semibold">
                      Guest Dinner
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
                      Payment / Action
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

                      {/* Guest Meal Counts */}
                      <td className="px-4 py-5 text-center font-semibold text-amber-800">
                        {row.extraLunchCount} <span className="text-xs">({formatCurrency(row.extraLunchAmount)})</span>
                      </td>
                      <td className="px-4 py-5 text-center font-semibold text-amber-800">
                        {row.extraDinnerCount} <span className="text-xs">({formatCurrency(row.extraDinnerAmount)})</span>
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
                      <td className="px-4 py-5 text-right font-semibold text-emerald-700">
                        {formatCurrency(row.paidAmount)}
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
                        <div className="flex min-w-[230px] flex-col gap-2">
                          <input
                            type="number"
                            min="0.01"
                            max={row.dueAmount}
                            step="0.01"
                            value={paymentAmounts[row.customer.id] || ""}
                            onChange={(event) => setPaymentAmounts((current) => ({ ...current, [row.customer.id]: event.target.value }))}
                            placeholder="Payment amount"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          <input
                            type="date"
                            value={paymentDates[row.customer.id] || ""}
                            onChange={(event) => setPaymentDates((current) => ({ ...current, [row.customer.id]: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          <select
                            value={paymentMethods[row.customer.id] || "cash"}
                            onChange={(event) => setPaymentMethods((current) => ({ ...current, [row.customer.id]: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="card">Card</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            type="text"
                            value={paymentNotes[row.customer.id] || ""}
                            onChange={(event) => setPaymentNotes((current) => ({ ...current, [row.customer.id]: event.target.value }))}
                            placeholder="Note (optional)"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
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
                              : "Add Payment"}
                          </button>

                          <div className="max-h-24 overflow-y-auto rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                            <p className="mb-1 font-semibold">Payment History</p>
                            {row.payments.length > 0 ? row.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center justify-between gap-2 border-b border-slate-200 py-1 last:border-0">
                                <span>
                                  {payment.payment_date.split("-").reverse().join("/")} — {formatCurrency(Number(payment.amount))}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => startEditingPayment(payment)}
                                  className="rounded px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                              </div>
                            )) : <p>No payments recorded</p>}
                          </div>
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