"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
};

type Billing = {
  id: string;
  customer_id: string;
  billing_month: string;
  lunch_count: number;
  dinner_count: number;
  lunch_amount: number;
  dinner_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: string;
};

function getToday() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getCurrentMonth() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(date: string) {
  if (!date) return "-";

  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function getMonthName(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
}

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [billing, setBilling] = useState<Billing[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = useMemo(() => getToday(), []);
  const currentMonth = useMemo(() => getCurrentMonth(), []);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        customersResult,
        attendanceResult,
        billingResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, active"),

        supabase
          .from("attendance")
          .select(
            "id, customer_id, attendance_date, lunch, dinner"
          )
          .eq("attendance_date", today),

        supabase
          .from("billing")
          .select(
            "id, customer_id, billing_month, lunch_count, dinner_count, lunch_amount, dinner_amount, total_amount, paid_amount, due_amount, payment_status"
          )
          .eq("billing_month", currentMonth),
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
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeCustomers = customers.filter(
    (customer) => customer.active
  );

  const todayLunch = attendance.filter(
    (item) => item.lunch
  ).length;

  const todayDinner = attendance.filter(
    (item) => item.dinner
  ).length;

  const currentMonthBill = billing.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const currentMonthPaid = billing.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0
  );

  const currentMonthDue = billing.reduce(
    (sum, item) => sum + Number(item.due_amount || 0),
    0
  );

  const unpaidBills = billing.filter(
    (item) => Number(item.due_amount || 0) > 0
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Lazzat Tiffin Admin Panel
            </p>
          </div>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="font-semibold">
              Dashboard Error
            </div>

            <div className="mt-1">
              {error}
            </div>
          </div>
        )}

        {/* CUSTOMER CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Customers"
            value={customers.length}
            subtitle="All customers"
            icon="👥"
            loading={loading}
          />

          <DashboardCard
            title="Active Customers"
            value={activeCustomers.length}
            subtitle="Currently active"
            icon="✓"
            loading={loading}
          />

          <DashboardCard
            title="Today's Lunch"
            value={todayLunch}
            subtitle={formatDate(today)}
            icon="🍱"
            loading={loading}
          />

          <DashboardCard
            title="Today's Dinner"
            value={todayDinner}
            subtitle={formatDate(today)}
            icon="🍽️"
            loading={loading}
          />
        </div>

        {/* BILLING CARDS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyCard
            title="Current Month Bill"
            value={currentMonthBill}
            subtitle={getMonthName(currentMonth)}
            loading={loading}
          />

          <MoneyCard
            title="Paid"
            value={currentMonthPaid}
            subtitle="Received"
            loading={loading}
          />

          <MoneyCard
            title="Due"
            value={currentMonthDue}
            subtitle="Outstanding"
            loading={loading}
          />

          <DashboardCard
            title="Pending Bills"
            value={unpaidBills}
            subtitle="Customers with due"
            icon="₹"
            loading={loading}
          />
        </div>

        {/* QUICK ACTIONS */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Quick Actions
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              title="Add Customer"
              description="Create a new customer"
              href="/admin/customers"
              icon="+"
            />

            <QuickAction
              title="Attendance"
              description="Manage today's attendance"
              href="/admin/attendance"
              icon="✓"
            />

            <QuickAction
              title="Billing"
              description="View and manage bills"
              href="/admin/billing"
              icon="₹"
            />

            <QuickAction
              title="Payments"
              description="Manage customer payments"
              href="/admin/payments"
              icon="💳"
            />
          </div>
        </div>

        {/* TODAY'S ATTENDANCE */}
        <div className="mt-8 rounded-xl bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Today's Attendance
              </h2>

              <p className="text-sm text-gray-500">
                {formatDate(today)}
              </p>
            </div>

            <Link
              href="/admin/attendance"
              className="text-sm font-semibold text-green-600 hover:text-green-700"
            >
              View Attendance →
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading attendance...
            </div>
          ) : attendance.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No attendance records for today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                      Lunch
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                      Dinner
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {attendance.map((item) => {
                    const customer = customers.find(
                      (c) => c.id === item.customer_id
                    );

                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {customer?.name ||
                              "Customer"}
                          </div>

                          {customer?.phone && (
                            <div className="text-xs text-gray-500">
                              {customer.phone}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <AttendanceBadge
                            active={item.lunch}
                          />
                        </td>

                        <td className="px-5 py-4 text-center">
                          <AttendanceBadge
                            active={item.dinner}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MONTH BILLING SUMMARY */}
        <div className="mt-8 rounded-xl bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Current Month Billing
              </h2>

              <p className="text-sm text-gray-500">
                {getMonthName(currentMonth)}
              </p>
            </div>

            <Link
              href="/admin/billing"
              className="text-sm font-semibold text-green-600 hover:text-green-700"
            >
              View Billing →
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading billing...
            </div>
          ) : billing.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No billing records for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                      Lunch
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                      Dinner
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                      Total
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                      Paid
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                      Due
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {billing.map((item) => {
                    const customer = customers.find(
                      (c) => c.id === item.customer_id
                    );

                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {customer?.name ||
                              "Customer"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center text-sm text-gray-600">
                          {item.lunch_count}
                        </td>

                        <td className="px-5 py-4 text-center text-sm text-gray-600">
                          {item.dinner_count}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(
                            Number(
                              item.total_amount || 0
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-green-600">
                          {formatCurrency(
                            Number(
                              item.paid_amount || 0
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-red-600">
                          {formatCurrency(
                            Number(
                              item.due_amount || 0
                            )
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
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  loading,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? "..." : value}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {subtitle}
          </p>
        </div>

        <div className="rounded-lg bg-gray-100 px-3 py-2 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MoneyCard({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string;
  value: number;
  subtitle: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {loading ? "..." : formatCurrency(value)}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {subtitle}
      </p>
    </div>
  );
}

function AttendanceBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Present" : "Absent"}
    </span>
  );
}

function QuickAction({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-green-100 px-3 py-2 text-xl text-green-700">
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-gray-900">
            {title}
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}