"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminNotifications from "@/components/AdminNotifications";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
};

type Attendance = {
  id: string;
  customer_id: string;
  attendance_date: string;
  lunch: boolean;
  dinner: boolean;
  lunch_source: string | null;
  dinner_source: string | null;
};

type Billing = {
  id: string;
  customer_id: string;
  billing_month: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
  generated_at: string | null;
};

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function formatCurrency(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(month: string) {
  if (!month) return "-";

  const parsed = new Date(month);

  if (Number.isNaN(parsed.getTime())) {
    return month;
  }

  return parsed.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [billing, setBilling] = useState<Billing[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const today = getToday();
      const currentMonth = getCurrentMonth();

      const [
        customersResult,
        attendanceResult,
        billingResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id,name,phone,active")
          .order("name", { ascending: true }),

        supabase
          .from("attendance")
          .select(
            "id,customer_id,attendance_date,lunch,dinner,lunch_source,dinner_source"
          )
          .eq("attendance_date", today),

        supabase
          .from("billing")
          .select(
            "id,customer_id,billing_month,total_amount,paid_amount,due_amount,payment_status,generated_at"
          )
          .eq("billing_month", currentMonth)
          .order("generated_at", { ascending: false }),
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
      setBilling(billingResult.data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Dashboard loading error:", err);

      setError(
        err?.message ||
          "Dashboard data load nahi ho paya."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeCustomers = useMemo(() => {
    return customers.filter((customer) => customer.active);
  }, [customers]);

  const todayLunch = useMemo(() => {
    return attendance.filter((item) => item.lunch).length;
  }, [attendance]);

  const todayDinner = useMemo(() => {
    return attendance.filter((item) => item.dinner).length;
  }, [attendance]);

  const monthTotal = useMemo(() => {
    return billing.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );
  }, [billing]);

  const monthPaid = useMemo(() => {
    return billing.reduce(
      (sum, item) => sum + Number(item.paid_amount || 0),
      0
    );
  }, [billing]);

  const monthDue = useMemo(() => {
    return billing.reduce(
      (sum, item) => sum + Number(item.due_amount || 0),
      0
    );
  }, [billing]);

  const pendingBills = useMemo(() => {
    return billing.filter(
      (item) =>
        Number(item.due_amount || 0) > 0 ||
        item.payment_status !== "paid"
    ).length;
  }, [billing]);

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();

    customers.forEach((customer) => {
      map.set(customer.id, customer);
    });

    return map;
  }, [customers]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-4 text-slate-900 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />

              <p className="text-slate-600">
                Dashboard loading...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Lazzat Tiffin
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Admin Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Business overview and daily operations
            </p>

            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-400">
                Last updated:{" "}
                {lastUpdated.toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </section>

        {/* Notifications */}
        <AdminNotifications />

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Dashboard Error
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        {/* Main Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Active Customers"
            value={activeCustomers.length}
            icon="👥"
            description="Currently active customers"
          />

          <DashboardCard
            title="Today's Lunch"
            value={todayLunch}
            icon="🍱"
            description="Lunch meals marked"
          />

          <DashboardCard
            title="Today's Dinner"
            value={todayDinner}
            icon="🍽️"
            description="Dinner meals marked"
          />

          <DashboardCard
            title="Pending Bills"
            value={pendingBills}
            icon="💳"
            description="Bills with outstanding amount"
          />
        </section>

        {/* Billing Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MoneyCard
            title="Current Month Total"
            value={monthTotal}
            icon="₹"
            description={formatMonth(getCurrentMonth())}
          />

          <MoneyCard
            title="Current Month Paid"
            value={monthPaid}
            icon="✓"
            description="Amount received"
          />

          <MoneyCard
            title="Current Month Due"
            value={monthDue}
            icon="!"
            description="Outstanding amount"
          />
        </section>

        {/* Quick Actions */}
        <section>
          <div className="mb-3">
            <h2 className="text-xl font-semibold text-slate-900">
              Quick Actions
            </h2>

            <p className="text-sm text-slate-500">
              Quickly access common admin tasks
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/admin/customers"
              title="Customers"
              description="Manage customer accounts"
              icon="👥"
            />

            <QuickAction
              href="/admin/attendance"
              title="Attendance"
              description="Manage daily meals"
              icon="📋"
            />

            <QuickAction
              href="/admin/billing"
              title="Billing"
              description="View and manage bills"
              icon="💰"
            />

            <QuickAction
              href="/admin/payments"
              title="Payments"
              description="Track customer payments"
              icon="💳"
            />

            <QuickAction
              href="/admin/extra-meal-requests"
              title="Meal Requests"
              description="Review extra meal requests"
              icon="🍱"
            />

            <QuickAction
              href="/admin/reviews"
              title="Reviews"
              description="View customer reviews"
              icon="⭐"
            />

            <QuickAction
              href="/admin/reports"
              title="Reports"
              description="View business reports"
              icon="📊"
            />

            <QuickAction
              href="/admin/settings"
              title="Settings"
              description="Manage admin settings"
              icon="⚙️"
            />
          </div>
        </section>

        {/* Today's Attendance */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Today&apos;s Attendance
              </h2>

              <p className="text-sm text-slate-500">
                {formatDate(getToday())}
              </p>
            </div>

            <Link
              href="/admin/attendance"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View Attendance →
            </Link>
          </div>

          {attendance.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No attendance records found for today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Customer
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Phone
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Lunch
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Dinner
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Source
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {attendance.map((item) => {
                    const customer = customerMap.get(
                      item.customer_id
                    );

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {customer?.name ||
                              "Unknown Customer"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {customer?.phone || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <AttendanceBadge
                            active={item.lunch}
                            label="Lunch"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <AttendanceBadge
                            active={item.dinner}
                            label="Dinner"
                          />
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="font-medium text-slate-700">
                                Lunch:
                              </span>{" "}
                              {item.lunch_source || "customer"}
                            </div>

                            <div>
                              <span className="font-medium text-slate-700">
                                Dinner:
                              </span>{" "}
                              {item.dinner_source || "customer"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Current Month Billing */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Current Month Billing
              </h2>

              <p className="text-sm text-slate-500">
                {formatMonth(getCurrentMonth())}
              </p>
            </div>

            <Link
              href="/admin/billing"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View Billing →
            </Link>
          </div>

          {billing.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No billing records found for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Customer
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Total
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Paid
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Due
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Status
                    </th>

                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Generated
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {billing.map((item) => {
                    const customer = customerMap.get(
                      item.customer_id
                    );

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {customer?.name ||
                              "Unknown Customer"}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {customer?.phone || ""}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatCurrency(item.total_amount)}
                        </td>

                        <td className="px-5 py-4 text-emerald-600">
                          {formatCurrency(item.paid_amount)}
                        </td>

                        <td className="px-5 py-4 text-amber-600">
                          {formatCurrency(item.due_amount)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.payment_status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.payment_status === "partial"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.payment_status || "pending"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(item.generated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function MoneyCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(value)}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function AttendanceBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? `✓ ${label}` : `— ${label}`}
    </span>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg transition group-hover:bg-emerald-100">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}