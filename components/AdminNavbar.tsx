"use client";

import { useEffect, useMemo, useState } from "react";
import AdminNavbar from "@/components/AdminNavbar";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

type Attendance = {
  id: string;
  customer_id: string;
  attendance_date: string;
  lunch: boolean;
  dinner: boolean;
};

type AttendanceState = {
  lunch: boolean;
  dinner: boolean;
};

export default function AttendancePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceState>
  >({});

  const [selectedDate, setSelectedDate] =
    useState(
      new Date().toISOString().split("T")[0]
    );

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingCustomer, setSavingCustomer] =
    useState<string | null>(null);

  // ==========================================
  // FETCH ACTIVE CUSTOMERS
  // ==========================================

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, active")
      .eq("active", true)
      .order("name");

    if (error) {
      console.error(
        "Customer fetch error:",
        error
      );

      alert("Customers load nahi ho paye.");
      return;
    }

    setCustomers(data || []);
  };

  // ==========================================
  // FETCH ATTENDANCE
  // ==========================================

  const fetchAttendance = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("attendance")
      .select(
        "id, customer_id, attendance_date, lunch, dinner"
      )
      .eq("attendance_date", selectedDate);

    if (error) {
      console.error(
        "Attendance fetch error:",
        error
      );

      alert("Attendance load nahi ho payi.");
      setLoading(false);
      return;
    }

    const attendanceMap: Record<
      string,
      AttendanceState
    > = {};

    customers.forEach((customer) => {
      attendanceMap[customer.id] = {
        lunch: false,
        dinner: false,
      };
    });

    (data || []).forEach(
      (record: Attendance) => {
        attendanceMap[record.customer_id] = {
          lunch: record.lunch === true,
          dinner: record.dinner === true,
        };
      }
    );

    setAttendance(attendanceMap);
    setLoading(false);
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ==========================================
  // LOAD ATTENDANCE AFTER CUSTOMERS LOAD
  // ==========================================

  useEffect(() => {
    if (customers.length > 0) {
      fetchAttendance();
    } else {
      setAttendance({});
      setLoading(false);
    }
  }, [selectedDate, customers]);

  // ==========================================
  // FILTER CUSTOMERS
  // ==========================================

  const filteredCustomers = useMemo(() => {
    const text = search
      .trim()
      .toLowerCase();

    if (!text) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.name
          .toLowerCase()
          .includes(text) ||
        customer.phone
          .toLowerCase()
          .includes(text)
    );
  }, [customers, search]);

  // ==========================================
  // UPDATE LOCAL ATTENDANCE
  // ==========================================

  const toggleMeal = (
    customerId: string,
    meal: "lunch" | "dinner"
  ) => {
    setAttendance((previous) => ({
      ...previous,

      [customerId]: {
        lunch:
          previous[customerId]?.lunch || false,
        dinner:
          previous[customerId]?.dinner || false,
        [meal]:
          !(previous[customerId]?.[meal] || false),
      },
    }));
  };

  // ==========================================
  // SAVE ATTENDANCE
  // ==========================================

  const saveAttendance = async (
    customerId: string
  ) => {
    const customerAttendance =
      attendance[customerId] || {
        lunch: false,
        dinner: false,
      };

    setSavingCustomer(customerId);

    // Check if record already exists
    const { data: existingRecord, error: findError } =
      await supabase
        .from("attendance")
        .select("id")
        .eq("customer_id", customerId)
        .eq("attendance_date", selectedDate)
        .maybeSingle();

    if (findError) {
      console.error(
        "Attendance find error:",
        findError
      );

      alert("Attendance check nahi ho payi.");
      setSavingCustomer(null);
      return;
    }

    let error;

    // ==========================================
    // UPDATE EXISTING
    // ==========================================

    if (existingRecord) {
      const result = await supabase
        .from("attendance")
        .update({
          lunch: customerAttendance.lunch,
          dinner: customerAttendance.dinner,
        })
        .eq("id", existingRecord.id);

      error = result.error;
    }

    // ==========================================
    // INSERT NEW
    // ==========================================

    else {
      const result = await supabase
        .from("attendance")
        .insert({
          customer_id: customerId,
          attendance_date: selectedDate,
          lunch: customerAttendance.lunch,
          dinner: customerAttendance.dinner,
        });

      error = result.error;
    }

    if (error) {
      console.error(
        "Attendance save error:",
        error
      );

      alert(
        "Attendance save nahi ho payi."
      );

      setSavingCustomer(null);
      return;
    }

    setSavingCustomer(null);

    alert("Attendance saved successfully. ✅");

    await fetchAttendance();
  };

  // ==========================================
  // SAVE ALL ATTENDANCE
  // ==========================================

  const saveAllAttendance = async () => {
    if (customers.length === 0) {
      alert("Koi active customer nahi hai.");
      return;
    }

    setSavingCustomer("ALL");

    for (const customer of customers) {
      const customerAttendance =
        attendance[customer.id] || {
          lunch: false,
          dinner: false,
        };

      const { data: existingRecord } =
        await supabase
          .from("attendance")
          .select("id")
          .eq("customer_id", customer.id)
          .eq("attendance_date", selectedDate)
          .maybeSingle();

      if (existingRecord) {
        await supabase
          .from("attendance")
          .update({
            lunch: customerAttendance.lunch,
            dinner: customerAttendance.dinner,
          })
          .eq("id", existingRecord.id);
      } else {
        await supabase
          .from("attendance")
          .insert({
            customer_id: customer.id,
            attendance_date: selectedDate,
            lunch: customerAttendance.lunch,
            dinner: customerAttendance.dinner,
          });
      }
    }

    setSavingCustomer(null);

    alert(
      "All attendance saved successfully. ✅"
    );

    await fetchAttendance();
  };

  // ==========================================
  // COUNTS
  // ==========================================

  const lunchCount = customers.filter(
    (customer) =>
      attendance[customer.id]?.lunch === true
  ).length;

  const dinnerCount = customers.filter(
    (customer) =>
      attendance[customer.id]?.dinner === true
  ).length;

  const absentLunch =
    customers.length - lunchCount;

  const absentDinner =
    customers.length - dinnerCount;

  return (
    <>
      <AdminNavbar />

      <main className="min-h-screen bg-gray-100 p-4 sm:p-6">

        <div className="mx-auto max-w-7xl">

          {/* ==================================
              HEADER
          ================================== */}

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Daily Attendance
              </h1>

              <p className="mt-1 text-gray-600">
                Lunch aur dinner attendance
                manage karein
              </p>
            </div>

            <button
              onClick={saveAllAttendance}
              disabled={
                savingCustomer !== null ||
                customers.length === 0
              }
              className="rounded-lg bg-green-600 px-6 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingCustomer === "ALL"
                ? "Saving..."
                : "💾 Save All Attendance"}
            </button>

          </div>

          {/* ==================================
              DATE + SEARCH
          ================================== */}

          <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow md:grid-cols-2">

            {/* DATE */}

            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Attendance Date
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SEARCH */}

            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Search Customer
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Name or phone..."
                className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

          </div>

          {/* ==================================
              SUMMARY
          ================================== */}

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                👥 Active Customers
              </p>

              <p className="mt-2 text-3xl font-bold">
                {customers.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                🍛 Lunch Present
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {lunchCount}
              </p>

              <p className="text-sm text-gray-500">
                Absent: {absentLunch}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                🌙 Dinner Present
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {dinnerCount}
              </p>

              <p className="text-sm text-gray-500">
                Absent: {absentDinner}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                📅 Date
              </p>

              <p className="mt-2 font-bold text-gray-900">
                {selectedDate}
              </p>
            </div>

          </div>

          {/* ==================================
              CUSTOMER TABLE
          ================================== */}

          <div className="overflow-hidden rounded-xl bg-white shadow">

            {loading ? (
              <div className="p-10 text-center text-gray-500">
                Loading attendance...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-10 text-center">

                <p className="text-gray-500">
                  No active customers found.
                </p>

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[800px] text-left">

                  <thead className="bg-gray-900 text-white">

                    <tr>

                      <th className="px-5 py-4">
                        Customer
                      </th>

                      <th className="px-5 py-4">
                        Phone
                      </th>

                      <th className="px-5 py-4 text-center">
                        🍛 Lunch
                      </th>

                      <th className="px-5 py-4 text-center">
                        🌙 Dinner
                      </th>

                      <th className="px-5 py-4 text-center">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredCustomers.map(
                      (customer) => {

                        const customerAttendance =
                          attendance[
                            customer.id
                          ] || {
                            lunch: false,
                            dinner: false,
                          };

                        return (
                          <tr
                            key={customer.id}
                            className="border-t hover:bg-gray-50"
                          >

                            {/* CUSTOMER */}

                            <td className="px-5 py-4">

                              <p className="font-bold text-gray-900">
                                {customer.name}
                              </p>

                            </td>

                            {/* PHONE */}

                            <td className="px-5 py-4 text-gray-600">
                              {customer.phone}
                            </td>

                            {/* LUNCH */}

                            <td className="px-5 py-4 text-center">

                              <button
                                onClick={() =>
                                  toggleMeal(
                                    customer.id,
                                    "lunch"
                                  )
                                }
                                className={`rounded-lg px-5 py-2 font-bold ${
                                  customerAttendance.lunch
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {customerAttendance.lunch
                                  ? "Present"
                                  : "Absent"}
                              </button>

                            </td>

                            {/* DINNER */}

                            <td className="px-5 py-4 text-center">

                              <button
                                onClick={() =>
                                  toggleMeal(
                                    customer.id,
                                    "dinner"
                                  )
                                }
                                className={`rounded-lg px-5 py-2 font-bold ${
                                  customerAttendance.dinner
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {customerAttendance.dinner
                                  ? "Present"
                                  : "Absent"}
                              </button>

                            </td>

                            {/* SAVE */}

                            <td className="px-5 py-4 text-center">

                              <button
                                onClick={() =>
                                  saveAttendance(
                                    customer.id
                                  )
                                }
                                disabled={
                                  savingCustomer !==
                                    null
                                }
                                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingCustomer ===
                                customer.id
                                  ? "Saving..."
                                  : "Save"}
                              </button>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>

          {/* ==================================
              INFORMATION
          ================================== */}

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">

            <p className="font-bold text-blue-900">
              💡 Attendance System
            </p>

            <p className="mt-2 text-sm text-blue-800">
              Green button = Present. Grey button =
              Absent. Attendance save karne ke baad
              same customer/date ka record update
              hoga, duplicate record nahi banega.
            </p>

          </div>

        </div>

      </main>
    </>
  );
}