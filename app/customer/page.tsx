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

type CustomerWallet = {
  id: string;
  customer_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
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

type HistoryRow = {
  date: string;
  attendance: Attendance | null;
  guestRequests: {
    request: ExtraMealRequest;
    days: ExtraMealRequestDay[];
  }[];
};

function getToday() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function getMonthStart(value: string) {
  return `${value}-01`;
}

function getMonthEnd(value: string) {
  const [year, month] = value.split("-").map(Number);

  const lastDay = new Date(
    year,
    month,
    0
  ).getDate();

  return `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;
}

function isDateInRange(
  date: string,
  start: string,
  end: string
) {
  return date >= start && date <= end;
}

export default function CustomerDashboard() {
  const router = useRouter();

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [attendanceHistory, setAttendanceHistory] =
    useState<Attendance[]>([]);

  const [mealChanges, setMealChanges] =
    useState<MealChange[]>([]);

  const [extraMealRequests, setExtraMealRequests] =
    useState<ExtraMealRequest[]>([]);

  const [extraMealRequestDays, setExtraMealRequestDays] =
    useState<Record<string, ExtraMealRequestDay[]>>({});

  const [billing, setBilling] =
    useState<Billing | null>(null);

  const [billingHistory, setBillingHistory] =
    useState<Billing[]>([]);

  const [selectedBillingMonth, setSelectedBillingMonth] =
    useState(() => getCurrentMonth());

  const [walletBalance, setWalletBalance] =
    useState<number>(0);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [action, setAction] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

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
  /* HISTORY FILTER */
  /* ================================================= */

  const [historyMonth, setHistoryMonth] =
    useState(() => {
      const date = new Date();

      return `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
    });

  const [historyStartDate, setHistoryStartDate] =
    useState(() => {
      const date = new Date();

      return `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-01`;
    });

  const [historyEndDate, setHistoryEndDate] =
    useState(getToday());

  const [historyFilterMode, setHistoryFilterMode] =
    useState<"month" | "custom">("month");

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

  const [showExtraMealHistory, setShowExtraMealHistory] =
    useState(false);

  const today = useMemo(
    () => getToday(),
    []
  );

  /* ================================================= */
  /* HISTORY RANGE */
  /* ================================================= */

  const historyRange = useMemo(() => {
    if (historyFilterMode === "month") {
      return {
        start: getMonthStart(historyMonth),
        end: getMonthEnd(historyMonth),
      };
    }

    return {
      start: historyStartDate,
      end: historyEndDate,
    };
  }, [
    historyFilterMode,
    historyMonth,
    historyStartDate,
    historyEndDate,
  ]);

  /* ================================================= */
  /* SELECTED BILLING MONTH */
  /* ================================================= */

  useEffect(() => {
    const selectedBill =
      billingHistory.find(
        (item) =>
          item.billing_month ===
          selectedBillingMonth
      ) || null;

    setBilling(selectedBill);
  }, [
    billingHistory,
    selectedBillingMonth,
  ]);

  /* ================================================= */
  /* FILTERED HISTORY */
  /* ================================================= */

  const filteredHistory = useMemo<HistoryRow[]>(() => {
    const attendanceMap = new Map<
      string,
      Attendance
    >();

    attendanceHistory.forEach((record) => {
      attendanceMap.set(
        record.attendance_date,
        record
      );
    });

    const guestMap = new Map<
      string,
      {
        request: ExtraMealRequest;
        days: ExtraMealRequestDay[];
      }[]
    >();

    extraMealRequests.forEach((request) => {
      if (request.status !== "approved") {
        return;
      }

      const days =
        extraMealRequestDays[request.id] || [];

      days.forEach((day) => {
        if (!day.included) {
          return;
        }

        if (
          !guestMap.has(day.meal_date)
        ) {
          guestMap.set(
            day.meal_date,
            []
          );
        }

        const current =
          guestMap.get(
            day.meal_date
          )!;

        let existing =
          current.find(
            (item) =>
              item.request.id ===
              request.id
          );

        if (!existing) {
          existing = {
            request,
            days: [],
          };

          current.push(existing);
        }

        existing.days.push(day);
      });
    });

    const allDates = new Set<string>();

    attendanceHistory.forEach((record) => {
      if (
        isDateInRange(
          record.attendance_date,
          historyRange.start,
          historyRange.end
        )
      ) {
        allDates.add(
          record.attendance_date
        );
      }
    });

    guestMap.forEach((_, date) => {
      if (
        isDateInRange(
          date,
          historyRange.start,
          historyRange.end
        )
      ) {
        allDates.add(date);
      }
    });

    return Array.from(allDates)
      .sort((a, b) =>
        b.localeCompare(a)
      )
      .map((date) => ({
        date,
        attendance:
          attendanceMap.get(date) ||
          null,
        guestRequests:
          guestMap.get(date) ||
          [],
      }));
  }, [
    attendanceHistory,
    extraMealRequests,
    extraMealRequestDays,
    historyRange,
  ]);

  /* ================================================= */
  /* HISTORY SUMMARY */
  /* ================================================= */

  const historySummary = useMemo(() => {
    let lunchCount = 0;
    let dinnerCount = 0;

    let guestLunchMeals = 0;
    let guestDinnerMeals = 0;

    filteredHistory.forEach((row) => {
      if (row.attendance?.lunch) {
        lunchCount++;
      }

      if (row.attendance?.dinner) {
        dinnerCount++;
      }

      row.guestRequests.forEach(
        ({ request, days }) => {
          const quantity =
            Number(request.quantity) || 0;

          days.forEach((day) => {
            if (!day.included) return;

            if (
              day.meal_type ===
              "lunch"
            ) {
              guestLunchMeals += quantity;
            }

            if (
              day.meal_type ===
              "dinner"
            ) {
              guestDinnerMeals += quantity;
            }
          });
        }
      );
    });

    return {
      lunchCount,
      dinnerCount,
      customerMeals:
        lunchCount + dinnerCount,
      guestLunchMeals,
      guestDinnerMeals,
      guestMeals:
        guestLunchMeals +
        guestDinnerMeals,
      totalMeals:
        lunchCount +
        dinnerCount +
        guestLunchMeals +
        guestDinnerMeals,
    };
  }, [filteredHistory]);

  /* ================================================= */
  /* CREATE EXTRA MEAL DATE RANGE */
  /* ================================================= */

  useEffect(() => {
    if (
      !extraMealStartDate ||
      !extraMealEndDate
    ) {
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
        router.replace(
          "/customer-login"
        );
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
        .eq(
          "auth_user_id",
          user.id
        )
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

      setCustomer(
        customerData as Customer
      );

      /* ================================================= */
      /* TODAY ATTENDANCE */
      /* ================================================= */

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "id,customer_id,attendance_date,lunch,dinner,lunch_rating,lunch_comment,dinner_rating,dinner_comment,lunch_source,dinner_source"
        )
        .eq(
          "customer_id",
          customerData.id
        )
        .eq(
          "attendance_date",
          today
        )
        .maybeSingle();

      if (attendanceError) {
        throw attendanceError;
      }

      setAttendance(
        (attendanceData as Attendance | null) ||
          null
      );

      if (attendanceData) {
        setLunchRating(
          Number(
            attendanceData.lunch_rating ||
              0
          )
        );

        setLunchComment(
          attendanceData.lunch_comment ||
            ""
        );

        setDinnerRating(
          Number(
            attendanceData.dinner_rating ||
              0
          )
        );

        setDinnerComment(
          attendanceData.dinner_comment ||
            ""
        );
      }

      /* ================================================= */
      /* FULL ATTENDANCE HISTORY */
      /* ================================================= */

      const {
        data: attendanceHistoryData,
        error:
          attendanceHistoryError,
      } = await supabase
        .from("attendance")
        .select(
          "id,customer_id,attendance_date,lunch,dinner,lunch_rating,lunch_comment,dinner_rating,dinner_comment,lunch_source,dinner_source"
        )
        .eq(
          "customer_id",
          customerData.id
        )
        .order(
          "attendance_date",
          {
            ascending: false,
          }
        );

      if (attendanceHistoryError) {
        throw attendanceHistoryError;
      }

      setAttendanceHistory(
        (attendanceHistoryData ||
          []) as Attendance[]
      );

      /* ================================================= */
      /* MEAL CHANGES - TODAY */
      /* ================================================= */

      const {
        data: changesData,
        error: changesError,
      } = await supabase
        .from("meal_changes")
        .select(
          "id,change_date,meal,action,reason,status,created_at"
        )
        .eq(
          "customer_id",
          customerData.id
        )
        .eq(
          "change_date",
          today
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

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
        .from(
          "extra_meal_requests"
        )
        .select(
          "id,customer_id,meal_date,meal_type,quantity,note,status,created_at,approved_at,start_date,end_date"
        )
        .eq(
          "customer_id",
          customerData.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (extraRequestsError) {
        throw extraRequestsError;
      }

      const requests =
        (extraRequestsData ||
          []) as ExtraMealRequest[];

      setExtraMealRequests(
        requests
      );

      /* ================================================= */
      /* EXTRA MEAL REQUEST DAYS */
      /* ================================================= */

      if (requests.length > 0) {
        const requestIds =
          requests.map(
            (request) =>
              request.id
          );

        const {
          data: requestDaysData,
          error: requestDaysError,
        } = await supabase
          .from(
            "extra_meal_request_days"
          )
          .select(
            "id,request_id,meal_date,meal_type,included,created_at"
          )
          .in(
            "request_id",
            requestIds
          )
          .order(
            "meal_date",
            {
              ascending: true,
            }
          );

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
          if (
            !grouped[
              day.request_id
            ]
          ) {
            grouped[
              day.request_id
            ] = [];
          }

          grouped[
            day.request_id
          ].push(day);
        });

        setExtraMealRequestDays(
          grouped
        );
      } else {
        setExtraMealRequestDays({});
      }

      /* ================================================= */
      /* CUSTOMER WALLET */
      /* ================================================= */

      const {
        data: walletData,
        error: walletError,
      } = await supabase
        .from("customer_wallets")
        .select(
          "id,customer_id,balance,created_at,updated_at"
        )
        .eq(
          "customer_id",
          customerData.id
        )
        .maybeSingle();

      if (walletError) {
        console.error(
          "Wallet error:",
          walletError
        );

        setWalletBalance(0);
      } else {
        setWalletBalance(
          Number(
            (walletData as CustomerWallet | null)?.balance ||
              0
          )
        );
      }

      /* ================================================= */
      /* BILLING HISTORY */
      /* ================================================= */

      const {
        data: billingData,
        error: billingError,
      } = await supabase
        .from("billing")
        .select(
          "id,customer_id,billing_month,lunch_count,dinner_count,lunch_rate,dinner_rate,lunch_amount,dinner_amount,total_amount,paid_amount,due_amount,payment_status,generated_at"
        )
        .eq(
          "customer_id",
          customerData.id
        )
        .order(
          "billing_month",
          { ascending: false }
        );

      if (billingError) {
        console.error(
          "Billing error:",
          billingError
        );

        setBillingHistory([]);
        setBilling(null);
      } else {
        const bills =
          (billingData || []) as Billing[];

        setBillingHistory(bills);

        const selectedBill =
          bills.find(
            (item) =>
              item.billing_month ===
              selectedBillingMonth
          ) || bills[0] || null;

        if (selectedBill) {
          setSelectedBillingMonth(
            selectedBill.billing_month
          );
        }

        setBilling(selectedBill);
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
  /* WALLET DEBIT */
  /* ================================================= */

  async function debitMealFromWallet(
    meal: "lunch" | "dinner",
    attendanceId: string
  ) {
    if (!customer) {
      throw new Error(
        "Customer account is not available."
      );
    }

    const rate =
      meal === "lunch"
        ? Number(customer.lunch_rate)
        : Number(customer.dinner_rate);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(
        `${meal === "lunch" ? "Lunch" : "Dinner"} rate is invalid.`
      );
    }

    const referenceType =
      meal === "lunch"
        ? "meal_lunch"
        : "meal_dinner";

    const { data, error } =
      await supabase.rpc(
        "add_customer_wallet_debit",
        {
          p_customer_id:
            customer.id,

          p_amount:
            rate,

          p_description:
            `${meal === "lunch" ? "Lunch" : "Dinner"} meal - ${today}`,

          p_reference_type:
            referenceType,

          p_reference_id:
            attendanceId,
        }
      );

    if (error) {
      throw error;
    }

    const newBalance =
      Number(data);

    if (Number.isFinite(newBalance)) {
      setWalletBalance(
        newBalance
      );
    }
  }

  /* ================================================= */
  /* WALLET CREDIT / REFUND */
  /* ================================================= */

  async function refundMealToWallet(
    meal: "lunch" | "dinner",
    attendanceId: string
  ) {
    if (!customer) {
      throw new Error(
        "Customer account is not available."
      );
    }

    const rate =
      meal === "lunch"
        ? Number(customer.lunch_rate)
        : Number(customer.dinner_rate);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(
        `${meal === "lunch" ? "Lunch" : "Dinner"} rate is invalid.`
      );
    }

    const referenceType =
      meal === "lunch"
        ? "meal_lunch_refund"
        : "meal_dinner_refund";

    const { data, error } =
      await supabase.rpc(
        "add_customer_wallet_credit",
        {
          p_customer_id:
            customer.id,

          p_amount:
            rate,

          p_description:
            `${meal === "lunch" ? "Lunch" : "Dinner"} meal reversal - ${today}`,

          p_payment_id:
            null,

          p_reference_type:
            referenceType,

          p_reference_id:
            attendanceId,
        }
      );

    if (error) {
      throw error;
    }

    const newBalance =
      Number(data);

    if (Number.isFinite(newBalance)) {
      setWalletBalance(
        newBalance
      );
    }
  }

  /* ================================================= */
  /* MARK MEAL */
  /* ================================================= */

  async function markMeal(
    meal: "lunch" | "dinner",
    value: boolean
  ) {
    if (!customer || saving) return;

    const previousValue =
      meal === "lunch"
        ? attendance?.lunch || false
        : attendance?.dinner || false;

    if (
      previousValue === value
    ) {
      setMessage(
        `${
          meal === "lunch"
            ? "Lunch"
            : "Dinner"
        } is already ${
          value
            ? "marked as taken"
            : "marked as not taken"
        }.`
      );

      return;
    }

    setSaving(true);
    setAction(
      `${meal}-${value}`
    );
    setError("");
    setMessage("");

    try {
      const currentData =
        attendance;

      const payload = {
        customer_id:
          customer.id,

        attendance_date:
          today,

        lunch:
          meal === "lunch"
            ? value
            : currentData?.lunch ||
              false,

        dinner:
          meal === "dinner"
            ? value
            : currentData?.dinner ||
              false,

        lunch_rating:
          currentData?.lunch_rating ||
          null,

        lunch_comment:
          currentData?.lunch_comment ||
          null,

        dinner_rating:
          currentData?.dinner_rating ||
          null,

        dinner_comment:
          currentData?.dinner_comment ||
          null,

        lunch_source:
          meal === "lunch"
            ? "customer"
            : currentData?.lunch_source ||
              "customer",

        dinner_source:
          meal === "dinner"
            ? "customer"
            : currentData?.dinner_source ||
              "customer",
      };

      const {
        data: savedAttendance,
        error: upsertError,
      } = await supabase
        .from("attendance")
        .upsert(
          payload,
          {
            onConflict:
              "customer_id,attendance_date",
          }
        )
        .select(
          "id,customer_id,attendance_date,lunch,dinner,lunch_rating,lunch_comment,dinner_rating,dinner_comment,lunch_source,dinner_source"
        )
        .single();

      if (upsertError) {
        throw upsertError;
      }

      if (!savedAttendance?.id) {
        throw new Error(
          "Attendance was updated but attendance ID was not returned."
        );
      }

      /*
       * Wallet transaction is done only when
       * the meal state actually changes.
       *
       * false -> true = debit
       * true -> false = refund
       */
      if (value) {
        await debitMealFromWallet(
          meal,
          savedAttendance.id
        );
      } else {
        await refundMealToWallet(
          meal,
          savedAttendance.id
        );
      }

      setMessage(
        value
          ? `${
              meal === "lunch"
                ? "Lunch"
                : "Dinner"
            } marked as taken. ${formatMoney(
              meal === "lunch"
                ? customer.lunch_rate
                : customer.dinner_rate
            )} deducted from your wallet.`
          : `${
              meal === "lunch"
                ? "Lunch"
                : "Dinner"
            } marked as not taken. The meal amount has been returned to your wallet.`
      );

      await loadCustomerDashboard();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update attendance and wallet."
      );

      /*
       * If wallet operation fails after attendance
       * was updated, reload the dashboard so the UI
       * reflects the actual database state.
       */
      await loadCustomerDashboard();
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

    if (
      rating < 1 ||
      rating > 5
    ) {
      setError(
        `Please select a ${meal} rating from 1 to 5.`
      );

      return;
    }

    setSaving(true);
    setAction(
      `feedback-${meal}`
    );
    setError("");
    setMessage("");

    try {
      const existing =
        attendance;

      const {
        error: upsertError,
      } = await supabase
        .from("attendance")
        .upsert(
          {
            customer_id:
              customer.id,

            attendance_date:
              today,

            lunch:
              existing?.lunch ||
              false,

            dinner:
              existing?.dinner ||
              false,

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
          item.action ===
            "cancel" &&
          item.status ===
            "pending"
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
    setAction(
      `cancel-${meal}`
    );
    setError("");
    setMessage("");

    try {
      const {
        error: insertError,
      } = await supabase
        .from("meal_changes")
        .insert({
          customer_id:
            customer.id,

          change_date:
            today,

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

      setCancelReason(
        (current) => ({
          ...current,
          [meal]: "",
        })
      );

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
        item.action ===
          "cancel" &&
        item.status ===
          "pending"
    );
  }

  /* ================================================= */
  /* EXTRA MEAL DAY TOGGLE */
  /* ================================================= */

  function toggleExtraMealDay(
    date: string,
    meal: "lunch" | "dinner"
  ) {
    setExtraMealDays(
      (current) =>
        current.map((item) => {
          if (
            item.date !== date
          ) {
            return item;
          }

          return {
            ...item,
            [meal]:
              !item[meal],
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
      extraMealStartDate <
      today
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
          day.lunch ||
          day.dinner
      );

    if (
      selectedDays.length === 0
    ) {
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
    setAction(
      "extra-meal-request"
    );

    try {
      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from(
          "extra_meal_requests"
        )
        .insert({
          customer_id:
            customer.id,

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
        .select("id")
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
            const rows: {
              request_id: string;
              meal_date: string;
              meal_type:
                | "lunch"
                | "dinner";
              included: boolean;
            }[] = [];

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
        .insert(
          requestDays
        );

      if (daysError) {
        throw daysError;
      }

      setMessage(
        `Extra meal request submitted successfully. ${extraTotalMealCount} extra meal(s) requested. Admin approval is pending.`
      );

      setExtraMealQuantity(1);
      setExtraMealNote("");
      setExtraMealStartDate(
        today
      );
      setExtraMealEndDate(
        today
      );

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
        {/* WALLET */}
        {/* ================================================= */}

        <section className="mt-6 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-green-100">
                MY WALLET
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Wallet Balance
              </h2>

              <p className="mt-1 text-sm text-green-100">
                Your balance automatically changes when a meal is taken or reversed.
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 px-6 py-4 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-green-100">
                Available Balance
              </p>

              <p className="mt-1 text-3xl font-bold">
                {formatMoney(walletBalance)}
              </p>
            </div>
          </div>

          {walletBalance > 0 && (
            <div className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm text-green-50">
              You have {formatMoney(walletBalance)} available in your wallet.
            </div>
          )}

          {walletBalance === 0 && (
            <div className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm text-green-50">
              Your wallet balance is currently ₹0. Any amount added by admin will appear here.
            </div>
          )}
        </section>

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
              rating={
                lunchRating
              }
              comment={
                lunchComment
              }
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
              canCancel={
                isBeforeCutoff(
                  "lunch"
                )
              }
              cutoff={
                getCutoffText(
                  "lunch"
                )
              }
              action={
                action
              }
              saving={
                saving
              }
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
              rating={
                dinnerRating
              }
              comment={
                dinnerComment
              }
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
              canCancel={
                isBeforeCutoff(
                  "dinner"
                )
              }
              cutoff={
                getCutoffText(
                  "dinner"
                )
              }
              action={
                action
              }
              saving={
                saving
              }
            />

          </div>
        </section>

        {/* ================================================= */}
        {/* MEAL HISTORY */}
        {/* ================================================= */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <div>
            <p className="text-sm font-semibold text-green-600">
              MEAL RECORD
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Meal History
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Month select karein ya custom date-to-date
              range select karke apna complete meal record
              dekhein. Approved guest meals bhi isi history
              mein highlight honge.
            </p>
          </div>

          {/* HISTORY FILTER */}

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Filter Attendance
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Month-wise ya custom date range choose karein.
                </p>
              </div>

              <div className="flex rounded-xl border border-gray-200 bg-white p-1">

                <button
                  type="button"
                  onClick={() =>
                    setHistoryFilterMode(
                      "month"
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    historyFilterMode ===
                    "month"
                      ? "bg-green-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Month
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setHistoryFilterMode(
                      "custom"
                    )
                  }
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    historyFilterMode ===
                    "custom"
                      ? "bg-green-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Date Range
                </button>

              </div>

            </div>

            {historyFilterMode ===
            "month" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Select Month
                  </label>

                  <input
                    type="month"
                    value={
                      historyMonth
                    }
                    onChange={(e) =>
                      setHistoryMonth(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs text-gray-500">
                    Showing
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {formatDate(
                      historyRange.start
                    )}{" "}
                    →{" "}
                    {formatDate(
                      historyRange.end
                    )}
                  </p>
                </div>

              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    From Date
                  </label>

                  <input
                    type="date"
                    value={
                      historyStartDate
                    }
                    onChange={(e) =>
                      setHistoryStartDate(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    To Date
                  </label>

                  <input
                    type="date"
                    value={
                      historyEndDate
                    }
                    min={
                      historyStartDate
                    }
                    onChange={(e) =>
                      setHistoryEndDate(
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

              </div>
            )}

          </div>

          {/* HISTORY SUMMARY */}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            <HistorySummaryCard
              title="Lunch"
              value={
                historySummary.lunchCount
              }
              icon="🍱"
            />

            <HistorySummaryCard
              title="Dinner"
              value={
                historySummary.dinnerCount
              }
              icon="🌙"
            />

            <HistorySummaryCard
              title="My Meals"
              value={
                historySummary.customerMeals
              }
              icon="👤"
            />

            <HistorySummaryCard
              title="Guest Meals"
              value={
                historySummary.guestMeals
              }
              icon="👥"
              guest
            />

            <HistorySummaryCard
              title="Total Meals"
              value={
                historySummary.totalMeals
              }
              icon="🍽️"
            />

          </div>

          {/* HISTORY TABLE */}

          {filteredHistory.length ===
          0 ? (
            <div className="mt-6 rounded-2xl bg-gray-50 p-8 text-center">

              <div className="text-4xl">
                📅
              </div>

              <p className="mt-3 font-semibold text-gray-800">
                No meal history found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Is date range mein attendance ya approved
                guest meal record available nahi hai.
              </p>

            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">

              <div className="hidden grid-cols-5 bg-gray-50 px-5 py-4 text-sm font-semibold text-gray-600 md:grid">

                <span>Date</span>

                <span className="text-center">
                  🍱 Lunch
                </span>

                <span className="text-center">
                  🌙 Dinner
                </span>

                <span className="text-center">
                  My Total
                </span>

                <span className="text-center">
                  Guest
                </span>

              </div>

              <div className="divide-y divide-gray-200">

                {filteredHistory.map(
                  (row) => {
                    const customerLunch =
                      row.attendance
                        ?.lunch
                        ? 1
                        : 0;

                    const customerDinner =
                      row.attendance
                        ?.dinner
                        ? 1
                        : 0;

                    const customerTotal =
                      customerLunch +
                      customerDinner;

                    let guestLunch =
                      0;

                    let guestDinner =
                      0;

                    row.guestRequests.forEach(
                      ({
                        request,
                        days,
                      }) => {
                        days.forEach(
                          (day) => {
                            if (
                              !day.included
                            ) {
                              return;
                            }

                            if (
                              day.meal_type ===
                              "lunch"
                            ) {
                              guestLunch +=
                                Number(
                                  request.quantity
                                ) || 0;
                            }

                            if (
                              day.meal_type ===
                              "dinner"
                            ) {
                              guestDinner +=
                                Number(
                                  request.quantity
                                ) || 0;
                            }
                          }
                        );
                      }
                    );

                    const guestTotal =
                      guestLunch +
                      guestDinner;

                    return (
                      <div
                        key={row.date}
                        className={`px-5 py-5 ${
                          guestTotal >
                          0
                            ? "bg-amber-50/60"
                            : "bg-white"
                        }`}
                      >

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:items-center">

                          <div>
                            <p className="font-semibold text-gray-900">
                              {formatLongDate(
                                row.date
                              )}
                            </p>

                            {guestTotal >
                              0 && (
                              <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                👥 Guest Meal
                              </span>
                            )}
                          </div>

                          <div className="text-left md:text-center">

                            <p className="mb-1 text-xs text-gray-400 md:hidden">
                              Lunch
                            </p>

                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                row.attendance
                                  ?.lunch
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {row.attendance
                                ?.lunch
                                ? "✓ Taken"
                                : "Not Taken"}
                            </span>

                          </div>

                          <div className="text-left md:text-center">

                            <p className="mb-1 text-xs text-gray-400 md:hidden">
                              Dinner
                            </p>

                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                row.attendance
                                  ?.dinner
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {row.attendance
                                ?.dinner
                                ? "✓ Taken"
                                : "Not Taken"}
                            </span>

                          </div>

                          <div className="text-left md:text-center">

                            <p className="mb-1 text-xs text-gray-400 md:hidden">
                              My Total
                            </p>

                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                customerTotal >
                                0
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {
                                customerTotal
                              }{" "}
                              meal
                              {customerTotal !==
                              1
                                ? "s"
                                : ""}
                            </span>

                          </div>

                          <div className="text-left md:text-center">

                            <p className="mb-1 text-xs text-gray-400 md:hidden">
                              Guest Meals
                            </p>

                            {guestTotal >
                            0 ? (
                              <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                                +{guestTotal}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">
                                —
                              </span>
                            )}

                          </div>

                        </div>

                        {guestTotal >
                          0 && (
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                              <div>
                                <p className="text-sm font-bold text-amber-900">
                                  👥 Approved Guest Meal
                                </p>

                                <p className="mt-1 text-xs text-amber-700">
                                  Guest meals are included in
                                  this day's meal record.
                                </p>
                              </div>

                              <span className="w-fit rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                                {guestTotal} Guest Meal
                                {guestTotal !==
                                1
                                  ? "s"
                                  : ""}
                              </span>

                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">

                              {guestLunch >
                                0 && (
                                <div className="rounded-xl bg-white p-3">

                                  <p className="text-xs text-gray-500">
                                    🍱 Guest Lunch
                                  </p>

                                  <p className="mt-1 font-bold text-gray-900">
                                    {guestLunch}{" "}
                                    meal
                                    {guestLunch !==
                                    1
                                      ? "s"
                                      : ""}
                                  </p>

                                </div>
                              )}

                              {guestDinner >
                                0 && (
                                <div className="rounded-xl bg-white p-3">

                                  <p className="text-xs text-gray-500">
                                    🌙 Guest Dinner
                                  </p>

                                  <p className="mt-1 font-bold text-gray-900">
                                    {guestDinner}{" "}
                                    meal
                                    {guestDinner !==
                                    1
                                      ? "s"
                                      : ""}
                                  </p>

                                </div>
                              )}

                            </div>

                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">

            <p>
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {formatDate(
                  historyRange.start
                )}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-700">
                {formatDate(
                  historyRange.end
                )}
              </span>
            </p>

            <p>
              Approved guest meals are highlighted in{" "}
              <span className="font-semibold text-amber-700">
                yellow
              </span>
              .
            </p>

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

          {extraMealDays.length >
            0 && (
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

          <div className="mt-6">

            <label className="text-sm font-semibold text-gray-700">
              Note{" "}
              <span className="font-normal text-gray-400">
                (Optional)
              </span>
            </label>

            <textarea
              value={
                extraMealNote
              }
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
                  {extraLunchCount}{" "}
                  day(s)
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Dinner
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {extraDinnerCount}{" "}
                  day(s)
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

          <div className="mt-8">

            <button
              type="button"
              onClick={() =>
                setShowExtraMealHistory(
                  (current) =>
                    !current
                )
              }
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition hover:bg-gray-100"
            >

              <div>
                <p className="font-semibold text-gray-900">
                  Guest Request History
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {extraMealRequests.length} request
                  {extraMealRequests.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  submitted
                </p>
              </div>

              <span className="text-lg text-gray-500">
                {showExtraMealHistory
                  ? "▲"
                  : "▼"}
              </span>

            </button>

            {showExtraMealHistory && (
              <div className="mt-4 space-y-4">

                {extraMealRequests.length ===
                0 ? (
                  <div className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
                    No extra meal requests yet.
                  </div>
                ) : (
                  extraMealRequests.map(
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

                              {request.approved_at && (
                                <p className="mt-1 text-xs text-gray-400">
                                  Approved:{" "}
                                  {new Date(
                                    request.approved_at
                                  ).toLocaleString(
                                    "en-IN"
                                  )}
                                </p>
                              )}

                            </div>

                            <ExtraMealStatusBadge
                              status={
                                request.status
                              }
                            />

                          </div>

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

                                      {" × "}

                                      <span className="font-semibold">
                                        {
                                          request.quantity
                                        }
                                      </span>

                                    </div>
                                  )
                                )}

                              </div>

                            </div>
                          )}

                        </div>
                      );
                    }
                  )
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

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Monthly Billing
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                My Bills
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select any generated month to view your complete bill and previous billing history.
              </p>
            </div>

            {billingHistory.length > 0 && (
              <div className="w-full lg:w-64">
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Select Billing Month
                </label>

                <select
                  value={selectedBillingMonth}
                  onChange={(e) =>
                    setSelectedBillingMonth(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  {billingHistory.map((item) => (
                    <option
                      key={item.id}
                      value={item.billing_month}
                    >
                      {formatMonth(
                        item.billing_month
                      )}
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>

          {billingHistory.length === 0 ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-6 text-center">
              <div className="text-4xl">💰</div>

              <p className="mt-3 font-semibold text-gray-800">
                No bills generated yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Your monthly billing history will appear here once a bill is generated.
              </p>
            </div>
          ) : !billing ? (
            <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
              <div className="text-3xl">📄</div>

              <p className="mt-3 font-semibold text-gray-800">
                No bill generated for {formatMonth(
                  selectedBillingMonth
                )}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Select another month to view its generated bill.
              </p>
            </div>
          ) : (
            <div className="mt-6">

              <div className="mb-5 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Selected Bill
                  </p>
                  <p className="mt-1 text-lg font-bold text-blue-900">
                    {formatMonth(
                      billing.billing_month
                    )}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                  Generated
                </span>
              </div>

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
                  <span>{billing.lunch_count}</span>
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
                  <span>{billing.dinner_count}</span>
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
                        billing.payment_status.slice(1)
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
                  Bill generated on {new Date(
                    billing.generated_at
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </p>
              )}

              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-800">
                  Billing History
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {billingHistory.length} generated month{billingHistory.length !== 1 ? "s" : ""} available. Use the month selector above to switch between bills.
                </p>
              </div>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

/* ===================================================== */
/* HISTORY SUMMARY CARD */
/* ===================================================== */

function HistorySummaryCard({
  title,
  value,
  icon,
  guest = false,
}: {
  title: string;
  value: number;
  icon: string;
  guest?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        guest
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-white"
      }`}
    >

      <div className="flex items-center justify-between">

        <p className="text-sm text-gray-500">
          {title}
        </p>

        <span className="text-xl">
          {icon}
        </span>

      </div>

      <p
        className={`mt-2 text-2xl font-bold ${
          guest
            ? "text-amber-700"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        meal{value !== 1 ? "s" : ""}
      </p>

    </div>
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
  const mealKey =
    title.toLowerCase();

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
          onClick={
            onMarkTaken
          }
          disabled={saving}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            active
              ? "bg-green-600 text-white"
              : "border border-green-600 text-green-700 hover:bg-green-50"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {action ===
          `${mealKey}-true`
            ? "Saving..."
            : "Meal Taken"}
        </button>

        <button
          type="button"
          onClick={
            onMarkNotTaken
          }
          disabled={saving}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
            !active
              ? "bg-gray-700 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {action ===
          `${mealKey}-false`
            ? "Saving..."
            : "Not Taken"}
        </button>

      </div>

      {/* ================================================= */}
      {/* CANCELLATION */}
      {/* ================================================= */}

      <div className="mt-5 rounded-xl bg-gray-50 p-4">

        <p className="text-sm font-semibold text-gray-800">
          Cancel {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Cancellation is allowed before{" "}
          {cutoff}.
        </p>

        <textarea
          value={
            cancelReason
          }
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
              `cancel-${mealKey}`
            ? "Sending..."
            : `Request ${title} Cancellation`}
        </button>

      </div>

      {/* ================================================= */}
      {/* FEEDBACK */}
      {/* ================================================= */}

      <div className="mt-5 border-t pt-5">

        <h4 className="font-semibold text-gray-900">
          How was your{" "}
          {mealKey}?
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
          value={
            comment
          }
          onChange={(e) =>
            onCommentChange(
              e.target.value
            )
          }
          placeholder={`Comment about your ${mealKey}...`}
          rows={3}
          className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />

        <button
          type="button"
          onClick={
            onSaveFeedback
          }
          disabled={
            saving ||
            rating < 1 ||
            rating > 5
          }
          className="mt-3 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {action ===
          `feedback-${mealKey}`
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
    normalized ===
      "partially_paid"
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