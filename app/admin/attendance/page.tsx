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
  start_date: string | null;
};

type AttendanceRecord = {
  customer_id: string;
  lunch: boolean;
  dinner: boolean;
  extra_lunch_count: number;
  extra_dinner_count: number;
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
  const [guestDraft, setGuestDraft] = useState<Record<string, { lunch?: string; dinner?: string }>>({});

  // ---------------------------------------
  // LOAD CUSTOMERS + ATTENDANCE
  // ---------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select(
        "id, name, phone, lunch_rate, dinner_rate, active, start_date"
      )
      .eq("active", true)
      .order("name");

    if (customerError) {
      console.error("CUSTOMER ERROR:", customerError);
      alert("Customers load nahi ho rahe.");
      setLoading(false);
      return;
    }

    // ---------------------------------------
    // FILTER CUSTOMERS BY START DATE
    // ---------------------------------------
    const filteredCustomers = (customerData || []).filter((customer) => {
      // Agar start_date nahi hai to customer show hoga
      if (!customer.start_date) {
        return true;
      }

      // Customer sirf start date ya uske baad show hoga
      return selectedDate >= customer.start_date;
    });

    setCustomers(filteredCustomers);

    // ---------------------------------------
    // LOAD ATTENDANCE FOR SELECTED DATE
    // ---------------------------------------
    const { data: attendanceData, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("customer_id, lunch, dinner, extra_lunch_count, extra_dinner_count")
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
        extra_lunch_count: Number(record.extra_lunch_count || 0),
        extra_dinner_count: Number(record.extra_dinner_count || 0),
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
    dinner: boolean,
    extraLunchCount?: number,
    extraDinnerCount?: number
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
            extra_lunch_count: Math.max(0, Math.floor(extraLunchCount ?? getAttendance(customerId).extra_lunch_count)),
            extra_dinner_count: Math.max(0, Math.floor(extraDinnerCount ?? getAttendance(customerId).extra_dinner_count)),
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
            extra_lunch_count: Math.max(0, Math.floor(extraLunchCount ?? 0)),
            extra_dinner_count: Math.max(0, Math.floor(extraDinnerCount ?? 0)),
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
      const savedExtraLunch = Math.max(0, Math.floor(extraLunchCount ?? getAttendance(customerId).extra_lunch_count));
      const savedExtraDinner = Math.max(0, Math.floor(extraDinnerCount ?? getAttendance(customerId).extra_dinner_count));
      setAttendance((prev) => ({
        ...prev,
        [customerId]: {
          customer_id: customerId,
          lunch,
          dinner,
          extra_lunch_count: savedExtraLunch,
          extra_dinner_count: savedExtraDinner,
        },
      }));
      setGuestDraft((prev) => {
        const next = { ...prev };
        delete next[customerId];
        return next;
      });
    } catch (error) {
      console.error("ATTENDANCE SAVE ERROR:", error);
      alert("Attendance save nahi hui.");
    } finally {
      setSavingId(null);
    }
  };

  const updateGuestDraft = (customerId: string, meal: "lunch" | "dinner", value: string) => {
    setGuestDraft((prev) => ({
      ...prev,
      [customerId]: { ...prev[customerId], [meal]: value },
    }));
  };

  const saveGuestCount = (customerId: string, meal: "lunch" | "dinner") => {
    const record = getAttendance(customerId);
    const value = guestDraft[customerId]?.[meal];
    if (value === undefined) return;
    const count = Math.max(0, Math.floor(Number(value) || 0));
    saveAttendance(
      customerId,
      record.lunch,
      record.dinner,
      meal === "lunch" ? count : record.extra_lunch_count,
      meal === "dinner" ? count : record.extra_dinner_count
    );
  };

  // ---------------------------------------
  // MOVE SELECTED DATE BY ONE DAY
  // ---------------------------------------
  const changeDate = (days: number) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
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
        extra_lunch_count: 0,
        extra_dinner_count: 0,
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => changeDate(-1)}
              aria-label="Previous day"
              title="Previous day"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-2xl font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              ‹
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={() => changeDate(1)}
              aria-label="Next day"
              title="Next day"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-2xl font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              ›
            </button>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Customer ki attendance uski start date se pehle
            available nahi hogi.
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
              Is date ke liye koi active customer available nahi hai.
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
                    <th className="px-5 py-4 text-center">
                      Guest Lunch
                    </th>
                    <th className="px-5 py-4 text-center">
                      Guest Dinner
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

                        {/* GUEST / EXTRA MEALS */}
                        <td className="px-5 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={guestDraft[customer.id]?.lunch ?? String(record.extra_lunch_count)}
                            onChange={(event) => updateGuestDraft(customer.id, "lunch", event.target.value)}
                            onBlur={() => saveGuestCount(customer.id, "lunch")}
                            disabled={isSaving}
                            aria-label={`Guest lunch meals for ${customer.name}`}
                            className="w-20 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center font-semibold text-amber-800"
                          />
                          <p className="mt-1 text-xs text-amber-700">Extra lunch</p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={guestDraft[customer.id]?.dinner ?? String(record.extra_dinner_count)}
                            onChange={(event) => updateGuestDraft(customer.id, "dinner", event.target.value)}
                            onBlur={() => saveGuestCount(customer.id, "dinner")}
                            disabled={isSaving}
                            aria-label={`Guest dinner meals for ${customer.name}`}
                            className="w-20 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center font-semibold text-amber-800"
                          />
                          <p className="mt-1 text-xs text-amber-700">Extra dinner</p>
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