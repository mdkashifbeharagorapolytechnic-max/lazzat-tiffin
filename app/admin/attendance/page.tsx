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

  // ---------------------------------------
  // LOAD CUSTOMERS + ATTENDANCE
  // ---------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, lunch_rate, dinner_rate, active")
      .eq("active", true)
      .order("name");

    if (customerError) {
      console.error("CUSTOMER ERROR:", customerError);
      alert("Customers load nahi ho rahe.");
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
      console.error("ATTENDANCE LOAD ERROR:", attendanceError);
      alert("Attendance load nahi ho rahi.");
      setLoading(false);
      return;
    }

    const attendanceMap: Record<string, AttendanceRecord> = {};

    (attendanceData || []).forEach((record) => {
      attendanceMap[record.customer_id] = {
        customer_id: record.customer_id,
        lunch: record.lunch === true,
        dinner: record.dinner === true,
      };
    });

    setAttendance(attendanceMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // ---------------------------------------
  // SAVE ATTENDANCE
  // UPDATE EXISTING / INSERT NEW
  // ---------------------------------------
  const saveAttendance = async (
    customerId: string,
    lunch: boolean,
    dinner: boolean
  ) => {
    setSavingId(customerId);

    try {
      // Check whether attendance already exists
      const { data: existingRecord, error: findError } =
        await supabase
          .from("attendance")
          .select("id")
          .eq("customer_id", customerId)
          .eq("attendance_date", selectedDate)
          .maybeSingle();

      if (findError) {
        console.error("FIND ATTENDANCE ERROR:", findError);
        alert(`Attendance check failed: ${findError.message}`);
        return;
      }

      // ---------------------------------------
      // EXISTING RECORD -> UPDATE
      // ---------------------------------------
      if (existingRecord) {
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            lunch,
            dinner,
          })
          .eq("id", existingRecord.id);

        if (updateError) {
          console.error("UPDATE ATTENDANCE ERROR:", updateError);
          alert(`Attendance update failed: ${updateError.message}`);
          return;
        }
      }

      // ---------------------------------------
      // NO RECORD -> INSERT
      // ---------------------------------------
      else {
        const { error: insertError } = await supabase
          .from("attendance")
          .insert({
            customer_id: customerId,
            attendance_date: selectedDate,
            lunch,
            dinner,
          });

        if (insertError) {
          console.error("INSERT ATTENDANCE ERROR:", insertError);
          alert(`Attendance insert failed: ${insertError.message}`);
          return;
        }
      }

      // ---------------------------------------
      // UPDATE UI IMMEDIATELY
      // ---------------------------------------
      setAttendance((prev) => ({
        ...prev,
        [customerId]: {
          customer_id: customerId,
          lunch,
          dinner,
        },
      }));
    } catch (error) {
      console.error("ATTENDANCE SAVE ERROR:", error);
      alert("Attendance save nahi hui.");
    } finally {
      setSavingId(null);
    }
  };

  // ---------------------------------------
  // GET CUSTOMER ATTENDANCE
  // ---------------------------------------
  const getAttendance = (
    customerId: string
  ): AttendanceRecord => {
    return (
      attendance[customerId] || {
        customer_id: customerId,
        lunch: false,
        dinner: false,
      }
    );
  };

  // ---------------------------------------
  // TOGGLE LUNCH
  // ---------------------------------------
  const toggleLunch = (customerId: string) => {
    const record = getAttendance(customerId);

    saveAttendance(
      customerId,
      !record.lunch,
      record.dinner
    );
  };

  // ---------------------------------------
  // TOGGLE DINNER
  // ---------------------------------------
  const toggleDinner = (customerId: string) => {
    const record = getAttendance(customerId);

    saveAttendance(
      customerId,
      record.lunch,
      !record.dinner
    );
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Daily Attendance
          </h1>

          <p className="mt-2 text-gray-600">
            Lunch aur Dinner attendance manage karein
          </p>
        </div>

        {/* DATE */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow">
          <label className="mb-2 block font-semibold text-gray-700">
            Select Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <p className="mt-2 text-sm text-gray-500">
            Purani date select karke bhi Present / Absent
            attendance change kar sakte hain.
          </p>
        </div>

        {/* TABLE */}
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
                    const record = getAttendance(
                      customer.id
                    );

                    const isSaving =
                      savingId === customer.id;

                    return (
                      <tr
                        key={customer.id}
                        className="border-t"
                      >

                        {/* CUSTOMER */}
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {customer.name}
                        </td>

                        {/* PHONE */}
                        <td className="px-5 py-4 text-gray-600">
                          {customer.phone}
                        </td>

                        {/* LUNCH */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              toggleLunch(customer.id)
                            }
                            disabled={isSaving}
                            className={`min-w-[120px] rounded-lg px-5 py-2 font-semibold transition ${
                              record.lunch
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            } ${
                              isSaving
                                ? "cursor-not-allowed opacity-50"
                                : ""
                            }`}
                          >
                            {record.lunch
                              ? "Present ✓"
                              : "Absent"}
                          </button>
                        </td>

                        {/* DINNER */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              toggleDinner(customer.id)
                            }
                            disabled={isSaving}
                            className={`min-w-[120px] rounded-lg px-5 py-2 font-semibold transition ${
                              record.dinner
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            } ${
                              isSaving
                                ? "cursor-not-allowed opacity-50"
                                : ""
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