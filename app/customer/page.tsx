"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  lunch_rate: number;
  dinner_rate: number;
  active: boolean;
  start_date: string | null;
};

type Attendance = {
  id: string;
  customer_id: string;
  attendance_date: string;
  lunch: boolean;
  dinner: boolean;
  lunch_rating: number | null;
  lunch_comment: string | null;
  dinner_rating: number | null;
  dinner_comment: string | null;
  lunch_source: "customer" | "admin";
  dinner_source: "customer" | "admin";
};

type MealChange = {
  id: string;
  change_date: string;
  meal: "lunch" | "dinner";
  action: "cancel" | "restore";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type ExtraMealRequest = {
  id: string;
  customer_id: string;
  meal_date: string;
  meal_type: "lunch" | "dinner";
  quantity: number;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
  start_date: string | null;
  end_date: string | null;
};

type ExtraMealRequestDay = {
  id: string;
  request_id: string;
  meal_date: string;
  meal_type: "lunch" | "dinner";
  included: boolean;
  created_at: string;
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
  generated_at: string;
};

type ExtraMealDaySelection = {
  date: string;
  lunch: boolean;
  dinner: boolean;
};

function getToday() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getCurrentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function formatMonth(value: string | null) {
  if (!value) return "-";

  const [year, month] = value.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatMoney(value: number | null | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getCurrentTimeInMinutes() {
  const date = new Date();

  return date.getHours() * 60 + date.getMinutes();
}

function isBeforeCutoff(meal: "lunch" | "dinner") {
  const now = getCurrentTimeInMinutes();

  if (meal === "lunch") {
    return now < 11 * 60;
  }

  return now < 19 * 60;
}

function getCutoffText(meal: "lunch" | "dinner") {
  return meal === "lunch" ? "11:00 AM" : "7:00 PM";
}

function getDatesBetween(
  startDate: string,
  endDate: string
): string[] {
  if (!startDate || !endDate) {
    return [];
  }

  const dates: string[] = [];

  const current = new Date(
    `${startDate}T00:00:00`
  );

  const end = new Date(
    `${endDate}T00:00:00`
  );

  while (current <= end) {
    dates.push(
      `${current.getFullYear()}-${String(
        current.getMonth() + 1
      ).padStart(2, "0")}-${String(
        current.getDate()
      ).padStart(2, "0")}`
    );

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatLongDate(value: string) {
  const [year, month, day] = value.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerDashboard() {
  const router = useRouter();

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [mealChanges, setMealChanges] = useState<
    MealChange[]
  >([]);

  const [extraMealRequests, setExtraMealRequests] =
    useState<ExtraMealRequest[]>([]);

  const [extraMealRequestDays, setExtraMealRequestDays] =
    useState<Record<string, ExtraMealRequestDay[]>>({});

  const [billing, setBilling] =
    useState<Billing | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [lunchRating, setLunchRating] =
    useState<number>(0);

  const [lunchComment, setLunchComment] =
    useState("");

  const [dinnerRating, setDinnerRating] =
    useState<number>(0);

  const [dinnerComment, setDinnerComment] =
    useState("");

  const [cancelReason, setCancelReason] =
    useState<Record<string, string>>({
      lunch: "",
      dinner: "",
    });

  /* ================================================= */
  /* EXTRA MEAL REQUEST FORM */
  /* ================================================= */

  const [extraMealStartDate, setExtraMealStartDate] =
    useState(getToday());

  const [extraMealEndDate, setExtraMealEndDate] =
    useState(getToday());

  const [extraMealQuantity, setExtraMealQuantity] =
    useState<number>(1);

  const [extraMealNote, setExtraMealNote] =
    useState("");

  const [extraMealDays, setExtraMealDays] =
    useState<ExtraMealDaySelection[]>([]);

  const today = useMemo(() => getToday(), []);

  const currentMonth = useMemo(
    () => getCurrentMonth(),
    []
  );

  /* ================================================= */
  /* CREATE DATE RANGE */
  /* ================================================= */

  useEffect(() => {
    if (!extraMealStartDate || !extraMealEndDate) {
      setExtraMealDays([]);
      return;
    }

    if (
      extraMealEndDate <
      extraMealStartDate
    ) {
      setExtraMealDays([]);
      return;
    }

    const dates = getDatesBetween(
      extraMealStartDate,
      extraMealEndDate
    );

    setExtraMealDays(
      dates.map((date) => ({
        date,
        lunch: true,
        dinner: true,
      }))
    );
  }, [
    extraMealStartDate,
    extraMealEndDate,
  ]);

  useEffect(() => {
    loadCustomerDashboard();
  }, []);

  /* ================================================= */
  /* LOAD DASHBOARD */
  /* ================================================= */

  async function loadCustomerDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/customer-login");
        return;
      }

      const {
        data: customerData,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id,name,phone,address,lunch_rate,dinner_rate,active,start_date"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (customerError) {
        throw customerError;
      }

      if (!customerData) {
        setError(
          "Customer account is not linked yet. Please contact Lazzat Tiffin."
        );

        setLoading(false);
        return;
      }

      if (!customerData.active) {
        setError(
          "Your customer account is currently inactive."
        );

        setLoading(false);
        return;
      }

      setCustomer(customerData as Customer);

      /* ================================================= */
      /* ATTENDANCE */
      /* ================================================= */

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "id,customer_id,attendance_date,lunch,dinner,lunch_rating,lunch_comment,dinner_rating,dinner_comment,lunch_source,dinner_source"
        )
        .eq("customer_id", customerData.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (attendanceError) {
        throw attendanceError;
      }

      setAttendance(
        (attendanceData as Attendance | null) || null
      );

      if (attendanceData) {
        setLunchRating(
          Number(
            attendanceData.lunch_rating || 0
          )
        );

        setLunchComment(
          attendanceData.lunch_comment || ""
        );

        setDinnerRating(
          Number(
            attendanceData.dinner_rating || 0
          )
        );

        setDinnerComment(
          attendanceData.dinner_comment || ""
        );
      }

      /* ================================================= */
      /* MEAL CHANGES */
      /* ================================================= */

      const {
        data: changesData,
        error: changesError,
      } = await supabase
        .from("meal_changes")
        .select(
          "id,change_date,meal,action,reason,status,created_at"
        )
        .eq("customer_id", customerData.id)
        .eq("change_date", today)
        .order("created_at", {
          ascending: false,
        });

      if (changesError) {
        throw changesError;
      }

      setMealChanges(
        (changesData || []) as MealChange[]
      );

      /* ================================================= */
      /* EXTRA MEAL REQUESTS */
      /* ================================================= */

      const {
        data: extraRequestsData,
        error: extraRequestsError,
      } = await supabase
        .from("extra_meal_requests")
        .select(
          "id,customer_id,meal_date,meal_type,quantity,note,status,created_at,approved_at,start_date,end_date"
        )
        .eq("customer_id", customerData.id)
        .order("created_at", {
          ascending: false,
        });

      if (extraRequestsError) {
        throw extraRequestsError;
      }

      const requests =
        (extraRequestsData ||
          []) as ExtraMealRequest[];

      setExtraMealRequests(requests);

      /* ================================================= */
      /* EXTRA MEAL REQUEST DAYS */
      /* ================================================= */

      if (requests.length > 0) {
        const requestIds =
          requests.map(
            (request) => request.id
          );

        const {
          data: requestDaysData,
          error: requestDaysError,
        } = await supabase
          .from("extra_meal_request_days")
          .select(
            "id,request_id,meal_date,meal_type,included,created_at"
          )
          .in(
            "request_id",
            requestIds
          )
          .order("meal_date", {
            ascending: true,
          });

        if (requestDaysError) {
          throw requestDaysError;
        }

        const grouped: Record<
          string,
          ExtraMealRequestDay[]
        > = {};

        (
          (requestDaysData ||
            []) as ExtraMealRequestDay[]
        ).forEach((day) => {
          if (!grouped[day.request_id]) {
            grouped[day.request_id] = [];
          }

          grouped[day.request_id].push(day);
        });

        setExtraMealRequestDays(grouped);
      } else {
        setExtraMealRequestDays({});
      }

      /* ================================================= */
      /* BILLING */
      /* ================================================= */

      const {
        data: billingData,
        error: billingError,
      } = await supabase
        .from("billing")
        .select(
          "id,customer_id,billing_month,lunch_count,dinner_count,lunch_rate,dinner_rate,lunch_amount,dinner_amount,total_amount,paid_amount,due_amount,payment_status,generated_at"
        )
        .eq("customer_id", customerData.id)
        .eq(
          "billing_month",
          currentMonth
        )
        .maybeSingle();

      if (billingError) {
        console.error(
          "Billing error:",
          billingError
        );

        setBilling(null);
      } else {
        setBilling(
          (billingData as Billing | null) ||
            null
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customer dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ================================================= */
  /* LOGOUT */
  /* ================================================= */

  async function logout() {
    await supabase.auth.signOut({
      scope: "local",
    });

    router.replace("/");
    router.refresh();
  }

  /* ================================================= */
  /* MARK MEAL */
  /* ================================================= */

  async function markMeal(
    meal: "lunch" | "dinner",
    value: boolean
  ) {
    if (!customer || saving) return;

    setSaving(true);
    setAction(`${meal}-${value}`);
    setError("");
    setMessage("");

    try {
      const currentData = attendance;

      const payload = {
        customer_id: customer.id,
        attendance_date: today,

        lunch:
          meal === "lunch"
            ? value
            : currentData?.lunch || false,

        dinner:
          meal === "dinner"
            ? value
            : currentData?.dinner || false,

        lunch_rating:
          currentData?.lunch_rating || null,

        lunch_comment:
          currentData?.lunch_comment ||
          null,

        dinner_rating:
          currentData?.dinner_rating || null,

        dinner_comment:
          currentData?.dinner_comment ||
          null,

        lunch_source:
          meal === "lunch" && value
            ? "customer"
            : currentData?.lunch_source ||
              "customer",

        dinner_source:
          meal === "dinner" && value
            ? "customer"
            : currentData?.dinner_source ||
              "customer",
      };

      const { error: upsertError } =
        await supabase
          .from("attendance")
          .upsert(payload, {
            onConflict:
              "customer_id,attendance_date",
          });

      if (upsertError) {
        throw upsertError;
      }

      setMessage(
        `${
          meal === "lunch"
            ? "Lunch"
            : "Dinner"
        } attendance updated.`
      );

      await loadCustomerDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update attendance."
      );
    } finally {
      setSaving(false);
      setAction("");
    }
  }

  /* ================================================= */
  /* SAVE FEEDBACK */
  /* ================================================= */

  async function saveFeedback(
    meal: "lunch" | "dinner"
  ) {
    if (!customer || saving) return;

    const rating =
      meal === "lunch"
        ? lunchRating
        : dinnerRating;

    const comment =
      meal === "lunch"
        ? lunchComment
        : dinnerComment;

    if (rating < 1 || rating > 5) {
      setError(
        `Please select a ${meal} rating from 1 to 5.`
      );

      return;
    }

    setSaving(true);
    setAction(`feedback-${meal}`);
    setError("");
    setMessage("");

    try {
      const existing = attendance;

      const { error: upsertError } =
        await supabase
          .from("attendance")
          .upsert(
            {
              customer_id: customer.id,
              attendance_date: today,

              lunch:
                existing?.lunch || false,

              dinner:
                existing?.dinner || false,

              lunch_rating:
                meal === "lunch"
                  ? rating
                  : existing?.lunch_rating ||
                    null,

              lunch_comment:
                meal === "lunch"
                  ? comment.trim() ||
                    null
                  : existing?.lunch_comment ||
                    null,

              dinner_rating:
                meal === "dinner"
                  ? rating
                  : existing?.dinner_rating ||
                    null,

              dinner_comment:
                meal === "dinner"
                  ? comment.trim() ||
                    null
                  : existing?.dinner_comment ||
                    null,

              lunch_source:
                existing?.lunch_source ||
                "customer",

              dinner_source:
                existing?.dinner_source ||
                "customer",
            },
            {
              onConflict:
                "customer_id,attendance_date",
            }
          );

      if (upsertError) {
        throw upsertError;
      }

      setMessage(
        `${
          meal === "lunch"
            ? "Lunch"
            : "Dinner"
        } feedback saved.`
      );

      await loadCustomerDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save feedback."
      );
    } finally {
      setSaving(false);
      setAction("");
    }
  }

  /* ================================================= */
  /* REQUEST CANCELLATION */
  /* ================================================= */

  async function requestCancellation(
    meal: "lunch" | "dinner"
  ) {
    if (!customer || saving) return;

    if (!isBeforeCutoff(meal)) {
      setError(
        `${
          meal === "lunch"
            ? "Lunch"
            : "Dinner"
        } cancellation is closed after ${getCutoffText(
          meal
        )}.`
      );

      return;
    }

    const existingPending =
      mealChanges.find(
        (item) =>
          item.meal === meal &&
          item.action === "cancel" &&
          item.status === "pending"
      );

    if (existingPending) {
      setMessage(
        `${
          meal === "lunch"
            ? "Lunch"
            : "Dinner"
        } cancellation request is already pending.`
      );

      return;
    }

    setSaving(true);
    setAction(`cancel-${meal}`);
    setError("");
    setMessage("");

    try {
      const { error: insertError } =
        await supabase
          .from("meal_changes")
          .insert({
            customer_id: customer.id,
            change_date: today,
            meal,
            action: "cancel",
            reason:
              cancelReason[
                meal
              ]?.trim() || null,
            status: "pending",
          });

      if (insertError) {
        throw insertError;
      }

      setMessage(
        `${
          meal === "lunch"
            ? "Lunch"
            : "Dinner"
        } cancellation request sent to admin.`
      );

      setCancelReason((current) => ({
        ...current,
        [meal]: "",
      }));

      await loadCustomerDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send cancellation request."
      );
    } finally {
      setSaving(false);
      setAction("");
    }
  }

  function hasPendingCancellation(
    meal: "lunch" | "dinner"
  ) {
    return mealChanges.some(
      (item) =>
        item.meal === meal &&
        item.action === "cancel" &&
        item.status === "pending"
    );
  }

  /* ================================================= */
  /* EXTRA MEAL DAY TOGGLE */
  /* ================================================= */

  function toggleExtraMealDay(
    date: string,
    meal: "lunch" | "dinner"
  ) {
    setExtraMealDays((current) =>
      current.map((item) => {
        if (item.date !== date) {
          return item;
        }

        return {
          ...item,
          [meal]: !item[meal],
        };
      })
    );
  }

  /* ================================================= */
  /* EXTRA MEAL COUNTS */
  /* ================================================= */

  const extraLunchCount =
    extraMealDays.filter(
      (day) => day.lunch
    ).length;

  const extraDinnerCount =
    extraMealDays.filter(
      (day) => day.dinner
    ).length;

  const extraTotalMealCount =
    (extraLunchCount +
      extraDinnerCount) *
    extraMealQuantity;

  /* ================================================= */
  /* SUBMIT EXTRA MEAL REQUEST */
  /* ================================================= */

  async function submitExtraMealRequest() {
    if (!customer || saving) return;

    setError("");
    setMessage("");

    if (!extraMealStartDate) {
      setError(
        "Please select guest start date."
      );
      return;
    }

    if (!extraMealEndDate) {
      setError(
        "Please select guest end date."
      );
      return;
    }

    if (
      extraMealEndDate <
      extraMealStartDate
    ) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    if (
      extraMealStartDate < today
    ) {
      setError(
        "Guest start date cannot be in the past."
      );
      return;
    }

    if (
      !Number.isInteger(
        extraMealQuantity
      ) ||
      extraMealQuantity < 1
    ) {
      setError(
        "Please enter a valid guest quantity."
      );
      return;
    }

    const selectedDays =
      extraMealDays.filter(
        (day) =>
          day.lunch || day.dinner
      );

    if (selectedDays.length === 0) {
      setError(
        "Please select at least one Lunch or Dinner."
      );
      return;
    }

    const hasAnyLunch =
      extraMealDays.some(
        (day) => day.lunch
      );

    const firstMealType =
      hasAnyLunch
        ? "lunch"
        : "dinner";

    setSaving(true);
    setAction("extra-meal-request");

    try {
      /*
       * Legacy columns meal_date and meal_type
       * are still populated so existing table
       * structure remains compatible.
       */

      const { data: requestData, error: requestError } =
        await supabase
          .from("extra_meal_requests")
          .insert({
            customer_id: customer.id,

            meal_date:
              extraMealStartDate,

            meal_type:
              firstMealType,

            quantity:
              extraMealQuantity,

            note:
              extraMealNote.trim() ||
              null,

            status: "pending",

            start_date:
              extraMealStartDate,

            end_date:
              extraMealEndDate,
          })
          .select(
            "id"
          )
          .single();

      if (requestError) {
        throw requestError;
      }

      if (!requestData?.id) {
        throw new Error(
          "Extra meal request was created but request ID was not returned."
        );
      }

      const requestDays =
        selectedDays.flatMap(
          (day) => {
            const rows = [];

            if (day.lunch) {
              rows.push({
                request_id:
                  requestData.id,
                meal_date:
                  day.date,
                meal_type:
                  "lunch",
                included: true,
              });
            }

            if (day.dinner) {
              rows.push({
                request_id:
                  requestData.id,
                meal_date:
                  day.date,
                meal_type:
                  "dinner",
                included: true,
              });
            }

            return rows;
          }
        );

      const {
        error: daysError,
      } = await supabase
        .from(
          "extra_meal_request_days"
        )
        .insert(requestDays);

      if (daysError) {
        /*
         * Parent request created but day insert
         * failed. Show clear error.
         */
        throw daysError;
      }

      setMessage(
        `Extra meal request submitted successfully. ${extraTotalMealCount} extra meal(s) requested. Admin approval is pending.`
      );

      setExtraMealQuantity(1);
      setExtraMealNote("");
      setExtraMealStartDate(today);
      setExtraMealEndDate(today);

      await loadCustomerDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit extra meal request."
      );
    } finally {
      setSaving(false);
      setAction("");
    }
  }

  /* ================================================= */
  /* LOADING */
  /* ================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-gray-600">
            Loading your account...
          </p>
        </div>
      </main>
    );
  }

  /* ================================================= */
  /* ERROR */
  /* ================================================= */

  if (error && !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">

          <h1 className="text-2xl font-bold text-gray-900">
            Customer Account
          </h1>

          <p className="mt-4 text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={logout}
            className="mt-6 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Back to Website
          </button>

        </div>
      </main>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 md:px-8 md:py-8">

      <div className="mx-auto max-w-6xl">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm text-gray-500">
              Welcome back
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              {customer.name}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Lazzat Tiffin Customer Portal
            </p>

          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>

        </div>

        {/* ================================================= */}
        {/* ERROR / SUCCESS */}
        {/* ================================================= */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* ================================================= */}
        {/* MY ACCOUNT + MY PLAN */}
        {/* ================================================= */}

        <div className="grid gap-6 md:grid-cols-2">

          {/* MY ACCOUNT */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-gray-900">
              My Account
            </h2>

            <div className="mt-5 space-y-4 text-sm">

              <div>
                <p className="text-gray-500">
                  Name
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {customer.name}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Phone
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {customer.phone}
                </p>
              </div>

              {customer.address && (
                <div>
                  <p className="text-gray-500">
                    Address
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {customer.address}
                  </p>
                </div>
              )}

              <div>
                <p className="text-gray-500">
                  Account Status
                </p>

                <span className="mt-1 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Active
                </span>
              </div>

            </div>

          </section>

          {/* MY PLAN */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-gray-900">
              My Plan
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <div className="rounded-xl bg-green-50 p-4">

                <p className="text-sm text-gray-600">
                  Lunch Rate
                </p>

                <p className="mt-1 text-2xl font-bold text-green-700">
                  {formatMoney(
                    customer.lunch_rate
                  )}
                </p>

              </div>

              <div className="rounded-xl bg-green-50 p-4">

                <p className="text-sm text-gray-600">
                  Dinner Rate
                </p>

                <p className="mt-1 text-2xl font-bold text-green-700">
                  {formatMoney(
                    customer.dinner_rate
                  )}
                </p>

              </div>

            </div>

            {customer.start_date && (
              <p className="mt-5 text-sm text-gray-500">
                Service started:{" "}
                {formatDate(
                  customer.start_date
                )}
              </p>
            )}

          </section>

        </div>

        {/* ================================================= */}
        {/* TODAY'S MEALS */}
        {/* ================================================= */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">

            <p className="text-sm text-gray-500">
              {formatDate(today)}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Today's Meals
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Mark your meal after receiving/eating it.
            </p>

          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            <MealCard
              title="Lunch"
              emoji="🍱"
              active={
                attendance?.lunch ||
                false
              }
              source={
                attendance?.lunch_source
              }
              rating={lunchRating}
              comment={lunchComment}
              onRatingChange={
                setLunchRating
              }
              onCommentChange={
                setLunchComment
              }
              onMarkTaken={() =>
                markMeal(
                  "lunch",
                  true
                )
              }
              onMarkNotTaken={() =>
                markMeal(
                  "lunch",
                  false
                )
              }
              onSaveFeedback={() =>
                saveFeedback(
                  "lunch"
                )
              }
              onCancel={() =>
                requestCancellation(
                  "lunch"
                )
              }
              cancelReason={
                cancelReason.lunch
              }
              onCancelReasonChange={(
                value
              ) =>
                setCancelReason(
                  (current) => ({
                    ...current,
                    lunch: value,
                  })
                )
              }
              cancellationPending={hasPendingCancellation(
                "lunch"
              )}
              canCancel={isBeforeCutoff(
                "lunch"
              )}
              cutoff={getCutoffText(
                "lunch"
              )}
              action={action}
              saving={saving}
            />

            <MealCard
              title="Dinner"
              emoji="🌙"
              active={
                attendance?.dinner ||
                false
              }
              source={
                attendance?.dinner_source
              }
              rating={dinnerRating}
              comment={dinnerComment}
              onRatingChange={
                setDinnerRating
              }
              onCommentChange={
                setDinnerComment
              }
              onMarkTaken={() =>
                markMeal(
                  "dinner",
                  true
                )
              }
              onMarkNotTaken={() =>
                markMeal(
                  "dinner",
                  false
                )
              }
              onSaveFeedback={() =>
                saveFeedback(
                  "dinner"
                )
              }
              onCancel={() =>
                requestCancellation(
                  "dinner"
                )
              }
              cancelReason={
                cancelReason.dinner
              }
              onCancelReasonChange={(
                value
              ) =>
                setCancelReason(
                  (current) => ({
                    ...current,
                    dinner: value,
                  })
                )
              }
              cancellationPending={hasPendingCancellation(
                "dinner"
              )}
              canCancel={isBeforeCutoff(
                "dinner"
              )}
              cutoff={getCutoffText(
                "dinner"
              )}
              action={action}
              saving={saving}
            />

          </div>

        </section>

        {/* ================================================= */}
        {/* EXTRA MEAL REQUEST */}
        {/* ================================================= */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <div>

            <p className="text-sm font-semibold text-green-600">
              GUEST MEAL
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Request Extra Meals
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Guest ke stay ki date range select karein.
              Har date ka Lunch aur Dinner separately
              select/deselect kar sakte hain.
            </p>

          </div>

          {/* ================================================= */}
          {/* DATE + QUANTITY */}
          {/* ================================================= */}

          <div className="mt-6 grid gap-5 md:grid-cols-3">

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Guest Start Date
              </label>

              <input
                type="date"
                min={today}
                value={
                  extraMealStartDate
                }
                onChange={(e) =>
                  setExtraMealStartDate(
                    e.target.value
                  )
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Guest End Date
              </label>

              <input
                type="date"
                min={
                  extraMealStartDate ||
                  today
                }
                value={
                  extraMealEndDate
                }
                onChange={(e) =>
                  setExtraMealEndDate(
                    e.target.value
                  )
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Guest Quantity
              </label>

              <input
                type="number"
                min="1"
                max="20"
                value={
                  extraMealQuantity
                }
                onChange={(e) =>
                  setExtraMealQuantity(
                    Math.max(
                      1,
                      Number(
                        e.target.value
                      )
                    )
                  )
                }
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

          </div>

          {/* ================================================= */}
          {/* DAILY MEAL SELECTION */}
          {/* ================================================= */}

          {extraMealDays.length > 0 && (
            <div className="mt-6">

              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Select Guest Meals
                  </h3>

                  <p className="text-sm text-gray-500">
                    Default mein Lunch aur Dinner
                    dono selected hain.
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 px-4 py-3 text-sm">

                  <span className="font-semibold text-green-700">
                    {extraLunchCount}
                  </span>{" "}
                  Lunch +{" "}
                  <span className="font-semibold text-green-700">
                    {extraDinnerCount}
                  </span>{" "}
                  Dinner

                  <span className="mx-1">
                    =
                  </span>

                  <span className="font-bold text-green-700">
                    {extraTotalMealCount}
                  </span>{" "}
                  total meals

                </div>

              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">

                <div className="hidden grid-cols-3 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600 sm:grid">

                  <span>Date</span>

                  <span className="text-center">
                    🍱 Lunch
                  </span>

                  <span className="text-center">
                    🌙 Dinner
                  </span>

                </div>

                <div className="divide-y divide-gray-200">

                  {extraMealDays.map(
                    (day) => (
                      <div
                        key={day.date}
                        className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-3 sm:items-center"
                      >

                        <div>
                          <p className="font-semibold text-gray-900">
                            {formatLongDate(
                              day.date
                            )}
                          </p>

                          <p className="text-xs text-gray-400 sm:hidden">
                            Select meals:
                          </p>
                        </div>

                        {/* LUNCH */}

                        <button
                          type="button"
                          onClick={() =>
                            toggleExtraMealDay(
                              day.date,
                              "lunch"
                            )
                          }
                          disabled={saving}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            day.lunch
                              ? "bg-green-600 text-white"
                              : "border border-gray-300 bg-white text-gray-500"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {day.lunch
                            ? "✓ Lunch Included"
                            : "Lunch Skipped"}
                        </button>

                        {/* DINNER */}

                        <button
                          type="button"
                          onClick={() =>
                            toggleExtraMealDay(
                              day.date,
                              "dinner"
                            )
                          }
                          disabled={saving}
                          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            day.dinner
                              ? "bg-green-600 text-white"
                              : "border border-gray-300 bg-white text-gray-500"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {day.dinner
                            ? "✓ Dinner Included"
                            : "Dinner Skipped"}
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>

            </div>
          )}

          {/* ================================================= */}
          {/* NOTE */}
          {/* ================================================= */}

          <div className="mt-6">

            <label className="text-sm font-semibold text-gray-700">
              Note{" "}
              <span className="font-normal text-gray-400">
                (Optional)
              </span>
            </label>

            <textarea
              value={extraMealNote}
              onChange={(e) =>
                setExtraMealNote(
                  e.target.value
                )
              }
              disabled={saving}
              rows={3}
              placeholder="Example: Mere 2 guests 23 August se 28 August tak rahenge."
              className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
            />

          </div>

          {/* ================================================= */}
          {/* REQUEST SUMMARY */}
          {/* ================================================= */}

          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">

            <h3 className="font-bold text-gray-900">
              Request Summary
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-4">

              <div>
                <p className="text-xs text-gray-500">
                  Guest Stay
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(
                    extraMealStartDate
                  )}{" "}
                  →{" "}
                  {formatDate(
                    extraMealEndDate
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Guests
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {extraMealQuantity}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Lunch
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {extraLunchCount} day(s)
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Dinner
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {extraDinnerCount} day(s)
                </p>
              </div>

            </div>

            <div className="mt-4 border-t border-green-200 pt-4">

              <p className="text-sm text-gray-600">
                Total Extra Meals
              </p>

              <p className="mt-1 text-2xl font-bold text-green-700">
                {extraTotalMealCount}
              </p>

            </div>

          </div>

          {/* ================================================= */}
          {/* SUBMIT */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={
              submitExtraMealRequest
            }
            disabled={
              saving ||
              extraMealDays.length ===
                0 ||
              extraTotalMealCount ===
                0
            }
            className="mt-6 w-full rounded-xl bg-green-600 px-5 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action ===
            "extra-meal-request"
              ? "Sending Request..."
              : "Send Extra Meal Request"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-500">
            Request submit hone ke baad admin approval
            required hoga.
          </p>

          {/* ================================================= */}
          {/* REQUEST HISTORY */}
          {/* ================================================= */}

          <div className="mt-8">

            <h3 className="text-xl font-bold text-gray-900">
              My Extra Meal Requests
            </h3>

            {extraMealRequests.length ===
            0 ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
                No extra meal requests yet.
              </div>
            ) : (
              <div className="mt-4 space-y-4">

                {extraMealRequests.map(
                  (request) => {

                    const days =
                      extraMealRequestDays[
                        request.id
                      ] || [];

                    const includedLunch =
                      days.filter(
                        (day) =>
                          day.meal_type ===
                            "lunch" &&
                          day.included
                      ).length;

                    const includedDinner =
                      days.filter(
                        (day) =>
                          day.meal_type ===
                            "dinner" &&
                          day.included
                      ).length;

                    return (
                      <div
                        key={
                          request.id
                        }
                        className="rounded-2xl border border-gray-200 p-5"
                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="text-lg font-bold text-gray-900">
                              Guest Meal Request
                            </p>

                            {request.start_date &&
                              request.end_date && (
                                <p className="mt-1 text-sm text-gray-600">
                                  {formatDate(
                                    request.start_date
                                  )}{" "}
                                  →{" "}
                                  {formatDate(
                                    request.end_date
                                  )}
                                </p>
                              )}

                            <p className="mt-1 text-sm text-gray-600">
                              Guests:{" "}
                              <span className="font-semibold">
                                {
                                  request.quantity
                                }
                              </span>
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              Lunch:{" "}
                              <span className="font-semibold">
                                {
                                  includedLunch
                                }
                              </span>{" "}
                              day(s)
                              {" • "}
                              Dinner:{" "}
                              <span className="font-semibold">
                                {
                                  includedDinner
                                }
                              </span>{" "}
                              day(s)
                            </p>

                            {request.note && (
                              <p className="mt-2 text-sm text-gray-500">
                                Note:{" "}
                                {
                                  request.note
                                }
                              </p>
                            )}

                            <p className="mt-2 text-xs text-gray-400">
                              Requested:{" "}
                              {new Date(
                                request.created_at
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </p>

                          </div>

                          <ExtraMealStatusBadge
                            status={
                              request.status
                            }
                          />

                        </div>

                        {/* REQUEST DAYS */}

                        {days.length >
                          0 && (
                          <div className="mt-5 border-t border-gray-200 pt-4">

                            <p className="mb-3 text-sm font-semibold text-gray-800">
                              Selected Meals
                            </p>

                            <div className="grid gap-2 sm:grid-cols-2">

                              {days.map(
                                (day) => (
                                  <div
                                    key={
                                      day.id
                                    }
                                    className="rounded-lg bg-gray-50 px-3 py-2 text-sm"
                                  >
                                    <span className="font-semibold">
                                      {formatDate(
                                        day.meal_date
                                      )}
                                    </span>

                                    {" — "}

                                    {day.meal_type ===
                                    "lunch"
                                      ? "🍱 Lunch"
                                      : "🌙 Dinner"}
                                  </div>
                                )
                              )}

                            </div>

                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </section>

        {/* ================================================= */}
        {/* TODAY'S MEAL REQUESTS */}
        {/* ================================================= */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            Today's Meal Requests
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your cancellation requests and their status.
          </p>

          {mealChanges.length ===
          0 ? (
            <div className="mt-5 rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
              No meal change requests today.
            </div>
          ) : (
            <div className="mt-5 space-y-3">

              {mealChanges.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div>

                      <p className="font-semibold text-gray-900">
                        {item.meal ===
                        "lunch"
                          ? "Lunch"
                          : "Dinner"}{" "}
                        —{" "}
                        {item.action ===
                        "cancel"
                          ? "Cancellation"
                          : "Restore"}
                      </p>

                      {item.reason && (
                        <p className="mt-1 text-sm text-gray-500">
                          Reason:{" "}
                          {
                            item.reason
                          }
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(
                          item.change_date
                        )}
                      </p>

                    </div>

                    <StatusBadge
                      status={
                        item.status
                      }
                    />

                  </div>
                )
              )}

            </div>
          )}

        </section>

        {/* ================================================= */}
        {/* BILLING */}
        {/* ================================================= */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm text-gray-500">
                Current Billing
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                Billing
              </h2>

            </div>

            {billing && (
              <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {formatMonth(
                  billing.billing_month
                )}
              </span>
            )}

          </div>

          {!billing ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-6 text-center">

              <div className="text-4xl">
                💰
              </div>

              <p className="mt-3 font-semibold text-gray-800">
                No bill generated yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Your billing information will appear here once the monthly bill is generated.
              </p>

            </div>
          ) : (
            <div className="mt-6">

              <div className="grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl bg-gray-50 p-5">

                  <p className="text-sm text-gray-500">
                    Total Bill
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatMoney(
                      billing.total_amount
                    )}
                  </p>

                </div>

                <div className="rounded-xl bg-green-50 p-5">

                  <p className="text-sm text-gray-500">
                    Paid
                  </p>

                  <p className="mt-1 text-2xl font-bold text-green-700">
                    {formatMoney(
                      billing.paid_amount
                    )}
                  </p>

                </div>

                <div className="rounded-xl bg-red-50 p-5">

                  <p className="text-sm text-gray-500">
                    Due
                  </p>

                  <p className="mt-1 text-2xl font-bold text-red-700">
                    {formatMoney(
                      billing.due_amount
                    )}
                  </p>

                </div>

              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">

                <div className="grid grid-cols-4 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 sm:text-sm">
                  <span>Meal</span>
                  <span>Count</span>
                  <span>Rate</span>
                  <span>Amount</span>
                </div>

                <div className="grid grid-cols-4 border-t border-gray-200 px-4 py-4 text-sm">

                  <span className="font-semibold text-gray-900">
                    🍱 Lunch
                  </span>

                  <span>
                    {
                      billing.lunch_count
                    }
                  </span>

                  <span>
                    {formatMoney(
                      billing.lunch_rate
                    )}
                  </span>

                  <span className="font-semibold">
                    {formatMoney(
                      billing.lunch_amount
                    )}
                  </span>

                </div>

                <div className="grid grid-cols-4 border-t border-gray-200 px-4 py-4 text-sm">

                  <span className="font-semibold text-gray-900">
                    🌙 Dinner
                  </span>

                  <span>
                    {
                      billing.dinner_count
                    }
                  </span>

                  <span>
                    {formatMoney(
                      billing.dinner_rate
                    )}
                  </span>

                  <span className="font-semibold">
                    {formatMoney(
                      billing.dinner_amount
                    )}
                  </span>

                </div>

              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm text-gray-500">
                    Payment Status
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {billing.payment_status
                      ? billing.payment_status
                          .charAt(0)
                          .toUpperCase() +
                        billing.payment_status.slice(
                          1
                        )
                      : "Pending"}
                  </p>

                </div>

                <BillingStatus
                  status={
                    billing.payment_status
                  }
                />

              </div>

              {billing.generated_at && (
                <p className="mt-4 text-xs text-gray-400">
                  Bill generated on{" "}
                  {new Date(
                    billing.generated_at
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </p>
              )}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}

/* ===================================================== */
/* MEAL CARD */
/* ===================================================== */

type MealCardProps = {
  title: string;
  emoji: string;
  active: boolean;
  source?: "customer" | "admin";
  rating: number;
  comment: string;
  onRatingChange: (
    rating: number
  ) => void;
  onCommentChange: (
    comment: string
  ) => void;
  onMarkTaken: () => void;
  onMarkNotTaken: () => void;
  onSaveFeedback: () => void;
  onCancel: () => void;
  cancelReason: string;
  onCancelReasonChange: (
    value: string
  ) => void;
  cancellationPending: boolean;
  canCancel: boolean;
  cutoff: string;
  action: string;
  saving: boolean;
};

function MealCard({
  title,
  emoji,
  active,
  source,
  rating,
  comment,
  onRatingChange,
  onCommentChange,
  onMarkTaken,
  onMarkNotTaken,
  onSaveFeedback,
  onCancel,
  cancelReason,
  onCancelReasonChange,
  cancellationPending,
  canCancel,
  cutoff,
  action,
  saving,
}: MealCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="text-xl font-bold text-gray-900">
            {emoji} {title}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Attendance:{" "}
            <span
              className={
                active
                  ? "font-semibold text-green-600"
                  : "font-semibold text-gray-500"
              }
            >
              {active
                ? "Taken"
                : "Not Taken"}
            </span>
          </p>

        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {active
            ? "Present"
            : "Absent"}
        </span>

      </div>

      {source && (
        <p className="mt-2 text-xs text-gray-400">
          Recorded by:{" "}
          {source === "customer"
            ? "You"
            : "Admin"}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">

        <button
          type="button"
          onClick={onMarkTaken}
          disabled={saving}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            active
              ? "bg-green-600 text-white"
              : "border border-green-600 text-green-700 hover:bg-green-50"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {action ===
          `${title.toLowerCase()}-true`
            ? "Saving..."
            : "Meal Taken"}
        </button>

        <button
          type="button"
          onClick={onMarkNotTaken}
          disabled={saving}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            !active
              ? "bg-gray-700 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {action ===
          `${title.toLowerCase()}-false`
            ? "Saving..."
            : "Not Taken"}
        </button>

      </div>

      {/* CANCELLATION */}

      <div className="mt-5 rounded-xl bg-gray-50 p-4">

        <p className="text-sm font-semibold text-gray-800">
          Cancel {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Cancellation is allowed before{" "}
          {cutoff}.
        </p>

        <textarea
          value={cancelReason}
          onChange={(e) =>
            onCancelReasonChange(
              e.target.value
            )
          }
          placeholder="Reason (optional)"
          rows={2}
          disabled={
            saving ||
            !canCancel ||
            cancellationPending
          }
          className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
        />

        <button
          type="button"
          onClick={onCancel}
          disabled={
            saving ||
            !canCancel ||
            cancellationPending
          }
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancellationPending
            ? "Cancellation Pending"
            : !canCancel
            ? `Cancellation Closed (${cutoff})`
            : action ===
              `cancel-${title.toLowerCase()}`
            ? "Sending..."
            : `Request ${title} Cancellation`}
        </button>

      </div>

      {/* FEEDBACK */}

      <div className="mt-5 border-t pt-5">

        <h4 className="font-semibold text-gray-900">
          How was your{" "}
          {title.toLowerCase()}?
        </h4>

        <div className="mt-3 flex gap-1">

          {[1, 2, 3, 4, 5].map(
            (star) => (
              <button
                key={star}
                type="button"
                onClick={() =>
                  onRatingChange(
                    star
                  )
                }
                className={`text-2xl ${
                  star <= rating
                    ? "text-yellow-400"
                    : "text-gray-300"
                }`}
                aria-label={`${star} star`}
              >
                ★
              </button>
            )
          )}

        </div>

        <textarea
          value={comment}
          onChange={(e) =>
            onCommentChange(
              e.target.value
            )
          }
          placeholder={`Comment about your ${title.toLowerCase()}...`}
          rows={3}
          className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />

        <button
          type="button"
          onClick={onSaveFeedback}
          disabled={
            saving ||
            rating < 1 ||
            rating > 5
          }
          className="mt-3 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {action ===
          `feedback-${title.toLowerCase()}`
            ? "Saving..."
            : "Save Feedback"}
        </button>

      </div>

    </div>
  );
}

/* ===================================================== */
/* MEAL REQUEST STATUS */
/* ===================================================== */

function StatusBadge({
  status,
}: {
  status:
    | "pending"
    | "approved"
    | "rejected";
}) {
  if (status === "approved") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
      Pending
    </span>
  );
}

/* ===================================================== */
/* EXTRA MEAL STATUS */
/* ===================================================== */

function ExtraMealStatusBadge({
  status,
}: {
  status:
    | "pending"
    | "approved"
    | "rejected";
}) {
  if (status === "approved") {
    return (
      <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-xs font-semibold text-green-700">
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="w-fit rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="w-fit rounded-full bg-yellow-100 px-4 py-2 text-xs font-semibold text-yellow-700">
      Pending
    </span>
  );
}

/* ===================================================== */
/* BILLING STATUS */
/* ===================================================== */

function BillingStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    (status || "").toLowerCase();

  if (
    normalized === "paid" ||
    normalized === "complete" ||
    normalized === "completed"
  ) {
    return (
      <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
        Paid
      </span>
    );
  }

  if (
    normalized === "partial" ||
    normalized === "partially_paid"
  ) {
    return (
      <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-700">
        Partially Paid
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
      Due
    </span>
  );
}