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
  extra_lunch_count: number;
  extra_dinner_count: number;
  lunch_rating: number | null;
  lunch_comment: string | null;
  dinner_rating: number | null;
  dinner_comment: string | null;
  lunch_source: "customer" | "admin";
  dinner_source: "customer" | "admin";
};

type Billing = {
  id: string;
  customer_id: string;
  billing_month: string;
  lunch_count: number;
  dinner_count: number;
  extra_lunch_count: number;
  extra_dinner_count: number;
  extra_lunch_amount: number;
  extra_dinner_amount: number;
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

type HistoryRow = {
  date: string;
  attendance: Attendance | null;
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
    const attendanceMap = new Map<string, Attendance>();
    attendanceHistory.forEach((record) => {
      if (isDateInRange(record.attendance_date, historyRange.start, historyRange.end)) {
        attendanceMap.set(record.attendance_date, record);
      }
    });

    return Array.from(attendanceMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, attendance]) => ({ date, attendance }));
  }, [attendanceHistory, historyRange]);

  /* ================================================= */
  /* HISTORY SUMMARY */
  /* ================================================= */

  const historySummary = useMemo(() => {
    const lunchCount = filteredHistory.filter((row) => row.attendance?.lunch).length;
    const dinnerCount = filteredHistory.filter((row) => row.attendance?.dinner).length;
    const extraLunchCount = filteredHistory.reduce((sum, row) => sum + Number(row.attendance?.extra_lunch_count || 0), 0);
    const extraDinnerCount = filteredHistory.reduce((sum, row) => sum + Number(row.attendance?.extra_dinner_count || 0), 0);
    return {
      lunchCount,
      dinnerCount,
      extraLunchCount,
      extraDinnerCount,
      customerMeals: lunchCount + dinnerCount,
      totalMeals: lunchCount + dinnerCount,
      extraLunchCount,
      extraDinnerCount,
    };
  }, [filteredHistory]);

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
          "id,customer_id,attendance_date,lunch,dinner,extra_lunch_count,extra_dinner_count,lunch_rating,lunch_comment,dinner_rating,dinner_comment,lunch_source,dinner_source"
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
          "id,customer_id,billing_month,lunch_count,dinner_count,extra_lunch_count,extra_dinner_count,extra_lunch_amount,extra_dinner_amount,lunch_rate,dinner_rate,lunch_amount,dinner_amount,total_amount,paid_amount,due_amount,payment_status,generated_at"
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
  /* DOWNLOAD MEAL HISTORY PDF */
  /* ================================================= */

  function downloadMealHistoryPdf() {
    if (!customer || filteredHistory.length === 0) return;

    const escapeHtml = (value: string) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return value.replace(/[&<>"']/g, (character) => entities[character] || character);
    };

    const lunchRate = Number(customer.lunch_rate || 0);
    const dinnerRate = Number(customer.dinner_rate || 0);
    const lunchAmount = historySummary.lunchCount * lunchRate;
    const dinnerAmount = historySummary.dinnerCount * dinnerRate;
    const extraLunchAmount = historySummary.extraLunchCount * lunchRate;
    const extraDinnerAmount = historySummary.extraDinnerCount * dinnerRate;
    const totalAmount = lunchAmount + dinnerAmount + extraLunchAmount + extraDinnerAmount;

    const rows = [...filteredHistory].reverse().map((row) => {
      const record = row.attendance;
      const lunch = Boolean(record?.lunch);
      const dinner = Boolean(record?.dinner);
      const feedback = [
        record?.lunch_rating ? `Lunch: ${record.lunch_rating}/5${record.lunch_comment ? ` — ${record.lunch_comment}` : ""}` : "",
        record?.dinner_rating ? `Dinner: ${record.dinner_rating}/5${record.dinner_comment ? ` — ${record.dinner_comment}` : ""}` : "",
      ].filter(Boolean).join("<br>") || "—";

      return `
        <tr>
          <td>${formatLongDate(row.date)}</td>
          <td class="${lunch ? "taken" : "not-taken"}">${lunch ? "Taken" : "Not taken"}</td>
          <td class="${dinner ? "taken" : "not-taken"}">${dinner ? "Taken" : "Not taken"}</td>
          <td>Guest lunch: ${Number(record?.extra_lunch_count || 0)}, guest dinner: ${Number(record?.extra_dinner_count || 0)}</td>
          <td>${escapeHtml(feedback)}</td>
        </tr>`;
    }).join("");

    const printWindow = window.open("", "_blank", "width=1000,height=750");
    if (!printWindow) {
      setError("Please allow pop-ups for this website, then try downloading the PDF again.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lazzat Tiffin - Meal History</title>
          <style>
            @page { size: A4; margin: 16mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #17211b; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16834a; padding-bottom: 14px; }
            .brand { color: #147a43; font-size: 23px; font-weight: 800; letter-spacing: .5px; }
            .subtitle { margin-top: 4px; color: #65736a; font-size: 11px; }
            .doc-label { text-align: right; color: #34443a; font-size: 12px; font-weight: 700; }
            h2 { margin: 18px 0 10px; font-size: 15px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; padding: 13px; background: #f3f8f4; border: 1px solid #dce9df; border-radius: 7px; }
            .label { color: #6b776f; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; }
            .value { margin-top: 3px; font-size: 11px; font-weight: 700; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin: 14px 0; }
            .stat { padding: 11px; border: 1px solid #e0e8e2; border-radius: 7px; }
            .stat strong { display: block; margin-top: 5px; font-size: 17px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { padding: 9px 8px; text-align: left; background: #eaf3ed; color: #234b33; font-size: 10px; }
            td { padding: 8px; border-bottom: 1px solid #e6ece8; vertical-align: top; line-height: 1.45; }
            .taken { color: #147a43; font-weight: 700; }
            .not-taken { color: #778078; }
            .totals { width: 52%; margin: 16px 0 0 auto; }
            .totals td { padding: 6px 8px; }
            .grand td { border-top: 2px solid #16834a; font-size: 13px; font-weight: 800; }
            .note { margin-top: 18px; color: #778078; font-size: 9px; }
            .footer { margin-top: 24px; padding-top: 9px; border-top: 1px solid #e2e8e3; color: #78837b; font-size: 9px; text-align: center; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="brand">LAZZAT TIFFIN</div><div class="subtitle">Customer Meal Record</div></div>
            <div class="doc-label">MEAL HISTORY<br><span style="font-weight:400">Generated on ${new Date().toLocaleDateString("en-IN")}</span></div>
          </div>
          <h2>Customer Details</h2>
          <div class="details">
            <div><div class="label">Customer Name</div><div class="value">${escapeHtml(customer.name)}</div></div>
            <div><div class="label">Phone</div><div class="value">${escapeHtml(customer.phone || "—")}</div></div>
            <div><div class="label">Address</div><div class="value">${escapeHtml(customer.address || "—")}</div></div>
            <div><div class="label">Selected Period</div><div class="value">${formatDate(historyRange.start)} to ${formatDate(historyRange.end)}</div></div>
          </div>
          <h2>Meal Summary</h2>
          <div class="summary">
            <div class="stat"><div class="label">Lunch Meals</div><strong>${historySummary.lunchCount}</strong><div>Rate: ${formatMoney(lunchRate)}</div></div>
            <div class="stat"><div class="label">Dinner Meals</div><strong>${historySummary.dinnerCount}</strong><div>Rate: ${formatMoney(dinnerRate)}</div></div>
            <div class="stat"><div class="label">Total Meals</div><strong>${historySummary.totalMeals}</strong><div>Combined amount: ${formatMoney(totalAmount)}</div></div>
          </div>
          <h2>Date-wise Attendance</h2>
          <table>
            <thead><tr><th style="width:20%">Date</th><th>Lunch</th><th>Dinner</th><th>Guest / Extra</th><th>Meal Feedback</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <table class="totals">
            <tbody>
              <tr><td>Lunch: ${historySummary.lunchCount} × ${formatMoney(lunchRate)}</td><td style="text-align:right">${formatMoney(lunchAmount)}</td></tr>
              <tr><td>Dinner: ${historySummary.dinnerCount} × ${formatMoney(dinnerRate)}</td><td style="text-align:right">${formatMoney(dinnerAmount)}</td></tr>
              <tr><td>Guest Lunch: ${historySummary.extraLunchCount} × ${formatMoney(lunchRate)}</td><td style="text-align:right">${formatMoney(extraLunchAmount)}</td></tr>
              <tr><td>Guest Dinner: ${historySummary.extraDinnerCount} × ${formatMoney(dinnerRate)}</td><td style="text-align:right">${formatMoney(extraDinnerAmount)}</td></tr>
              <tr class="grand"><td>Total Meal Amount</td><td style="text-align:right">${formatMoney(totalAmount)}</td></tr>
            </tbody>
          </table>
          <div class="note">This report reflects attendance records available for the selected period. Amounts are calculated using the customer's current meal rates.</div>
          <div class="footer">LAZZAT TIFFIN · Thank you for choosing us</div>
          <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setError("");
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
        {/* MEAL HISTORY */}
        {/* ================================================= */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-green-600">MEAL RECORD</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">Meal History</h2>
              <p className="mt-1 text-sm text-gray-500">
                Month select karein ya custom date range select karke apna meal record dekhein.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadMealHistoryPdf}
              disabled={!customer || filteredHistory.length === 0}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">↓</span>
              Download PDF
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Filter Attendance</p>
                <p className="mt-1 text-xs text-gray-500">Month-wise ya custom date range choose karein.</p>
              </div>
              <div className="flex rounded-xl border border-gray-200 bg-white p-1">
                <button type="button" onClick={() => setHistoryFilterMode("month")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${historyFilterMode === "month" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>Month</button>
                <button type="button" onClick={() => setHistoryFilterMode("custom")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${historyFilterMode === "custom" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>Date Range</button>
              </div>
            </div>

            {historyFilterMode === "month" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Select Month</label>
                  <input type="month" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm" />
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs text-gray-500">Showing</p>
                  <p className="mt-1 font-semibold text-gray-900">{formatDate(historyRange.start)} → {formatDate(historyRange.end)}</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">From Date</label>
                  <input type="date" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">To Date</label>
                  <input type="date" value={historyEndDate} min={historyStartDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <HistorySummaryCard title="Lunch" value={historySummary.lunchCount} icon="🍱" />
            <HistorySummaryCard title="Dinner" value={historySummary.dinnerCount} icon="🌙" />
            <HistorySummaryCard title="Guest Meals" value={historySummary.extraLunchCount + historySummary.extraDinnerCount} icon="👥" guest />
          </div>

          {filteredHistory.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-gray-50 p-8 text-center">
              <div className="text-4xl">📅</div>
              <p className="mt-3 font-semibold text-gray-800">No meal history found</p>
              <p className="mt-1 text-sm text-gray-500">Is date range mein attendance record available nahi hai.</p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
              <div className="hidden grid-cols-4 bg-gray-50 px-5 py-4 text-sm font-semibold text-gray-600 md:grid">
                <span>Date</span><span className="text-center">🍱 Lunch</span><span className="text-center">🌙 Dinner</span><span className="text-center">👥 Guest / Extra</span>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredHistory.map((row) => (
                  <div key={row.date} className="grid grid-cols-1 gap-4 bg-white px-5 py-5 md:grid-cols-4 md:items-center">
                    <p className="font-semibold text-gray-900">{formatLongDate(row.date)}</p>
                    <div className="text-left md:text-center">
                      <p className="mb-1 text-xs text-gray-400 md:hidden">Lunch</p>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${row.attendance?.lunch ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{row.attendance?.lunch ? "✓ Taken" : "Not Taken"}</span>
                    </div>
                    <div className="text-left md:text-center">
                      <p className="mb-1 text-xs text-gray-400 md:hidden">Guest / Extra Meals</p>
                      <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Lunch: {Number(row.attendance?.extra_lunch_count || 0)} · Dinner: {Number(row.attendance?.extra_dinner_count || 0)}</span>
                    </div>
                    <div className="text-left md:text-center">
                      <p className="mb-1 text-xs text-gray-400 md:hidden">Dinner</p>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${row.attendance?.dinner ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{row.attendance?.dinner ? "✓ Taken" : "Not Taken"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500">
            Showing {formatDate(historyRange.start)} to {formatDate(historyRange.end)}
          </div>
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
                <div className="grid grid-cols-4 border-t border-amber-200 bg-amber-50 px-4 py-4 text-sm">
                  <span className="font-semibold text-amber-900">👥 Guest Lunch</span>
                  <span>{Number(billing.extra_lunch_count || 0)}</span>
                  <span>{formatMoney(billing.lunch_rate)}</span>
                  <span className="font-semibold text-amber-900">{formatMoney(billing.extra_lunch_amount || 0)}</span>
                </div>
                <div className="grid grid-cols-4 border-t border-amber-200 bg-amber-50 px-4 py-4 text-sm">
                  <span className="font-semibold text-amber-900">👥 Guest Dinner</span>
                  <span>{Number(billing.extra_dinner_count || 0)}</span>
                  <span>{formatMoney(billing.dinner_rate)}</span>
                  <span className="font-semibold text-amber-900">{formatMoney(billing.extra_dinner_amount || 0)}</span>
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