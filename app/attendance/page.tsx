"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string;
  lunch_rate: number;
  dinner_rate: number;
  active: boolean;
};

type AttendanceRecord = {
  customer_id: string;
  lunch: boolean;
  dinner: boolean;
};

export default function AttendancePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceRecord>
  >({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const { data: customerData, error: customerError } =
      await supabase
        .from("customers")
        .select("*")
        .eq("active", true)
        .order("name");

    if (customerError) {
      console.error(customerError);
      setLoading(false);
      return;
    }

    setCustomers(customerData || []);

    const { data: attendanceData, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("customer_id, lunch, dinner")
        .eq("attendance_date", selectedDate);

    if (attendanceError) {
      console.error(attendanceError);
      setLoading(false);
      return;
    }

    const attendanceMap: Record<string, AttendanceRecord> = {};

    (attendanceData || []).forEach((record) => {
      attendanceMap[record.customer_id] = {
        customer_id: record.customer_id,
        lunch: record.lunch,
        dinner: record.dinner,
      };
    });

    setAttendance(attendanceMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const saveAttendance = async (
    customerId: string,
    lunch: boolean,
    dinner: boolean
  ) => {
    setSavingId(customerId);

    const { error } = await supabase
      .from("attendance")
      .upsert(
        {
          customer_id: customerId,
          attendance_date: selectedDate,
          lunch,
          dinner,
        },
        {
          onConflict: "customer_id,attendance_date",
        }
      );

    if (error) {
      console.error(error);
      alert("Attendance save nahi hui.");
      setSavingId(null);
      return;
    }

    setAttendance((prev) => ({
      ...prev,
      [customerId]: {
        customer_id: customerId,
        lunch,
        dinner,
      },
    }));

    setSavingId(null);
  };

  const getAttendance = (customerId: string) => {
    return (
      attendance[customerId] || {
        customer_id: customerId,
        lunch: false,
        dinner: false,
      }
    );
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Daily Attendance
          </h1>

          <p className="mt-2 text-gray-600">
            Lunch aur Dinner attendance manage karein
          </p>
        </div>

        {/* Date */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow">
          <label className="mb-2 block font-semibold text-gray-700">
            Select Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Attendance Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow">

          {loading ? (
            <div className="p-6 text-gray-500">
              Loading attendance...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-6 text-gray-500">
              No active customers found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4">
                      Customer
                    </th>

                    <th className="px-5 py-4">
                      Phone
                    </th>

                    <th className="px-5 py-4 text-center">
                      Lunch
                    </th>

                    <th className="px-5 py-4 text-center">
                      Dinner
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {customers.map((customer) => {
                    const record = getAttendance(customer.id);

                    return (
                      <tr
                        key={customer.id}
                        className="border-t"
                      >

                        <td className="px-5 py-4 font-medium">
                          {customer.name}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {customer.phone}
                        </td>

                        <td className="px-5 py-4 text-center">

                          <button
                            onClick={() =>
                              saveAttendance(
                                customer.id,
                                !record.lunch,
                                record.dinner
                              )
                            }
                            disabled={savingId === customer.id}
                            className={`rounded-lg px-5 py-2 font-semibold transition ${
                              record.lunch
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {record.lunch
                              ? "Present ✓"
                              : "Absent"}
                          </button>

                        </td>

                        <td className="px-5 py-4 text-center">

                          <button
                            onClick={() =>
                              saveAttendance(
                                customer.id,
                                record.lunch,
                                !record.dinner
                              )
                            }
                            disabled={savingId === customer.id}
                            className={`rounded-lg px-5 py-2 font-semibold transition ${
                              record.dinner
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {record.dinner
                              ? "Present ✓"
                              : "Absent"}
                          </button>

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
    </main>
  );
}