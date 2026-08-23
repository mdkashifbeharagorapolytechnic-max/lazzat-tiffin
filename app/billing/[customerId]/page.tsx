"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  lunch_rate: number | null;
  dinner_rate: number | null;
  active: boolean;
};

type Bill = {
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
  payment_status: "pending" | "partial" | "paid";
};

export default function CustomerBillPage() {
  const params = useParams();
  const customerId = params.customerId as string;

  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [bill, setBill] =
    useState<Bill | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBill() {
    try {
      setLoading(true);
      setError("");

      const billingMonth = `${month}-01`;

      // =========================
      // CUSTOMER
      // =========================

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select(
            "id,name,phone,address,lunch_rate,dinner_rate,active"
          )
          .eq("id", customerId)
          .single();

      if (customerError) {
        throw new Error(customerError.message);
      }

      setCustomer(customerData);

      // =========================
      // BILL
      // =========================

      const { data: billData, error: billError } =
        await supabase
          .from("billing")
          .select("*")
          .eq("customer_id", customerId)
          .eq("billing_month", billingMonth)
          .maybeSingle();

      if (billError) {
        throw new Error(billError.message);
      }

      setBill(billData);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load bill."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) {
      loadBill();
    }
  }, [customerId, month]);

  // =========================
  // PRINT / PDF
  // =========================

  function printBill() {
    window.print();
  }

  // =========================
  // WHATSAPP
  // =========================

  function sendWhatsApp() {
    if (!customer) {
      alert("Customer information not available.");
      return;
    }

    if (!bill) {
      alert(
        "No billing record found for this month."
      );
      return;
    }

    const phone =
      customer.phone?.replace(/\D/g, "");

    if (!phone) {
      alert(
        "Customer phone number is not available."
      );
      return;
    }

    const whatsappNumber =
      phone.length === 10
        ? `91${phone}`
        : phone;

    const monthName = new Date(
      `${month}-01T00:00:00`
    ).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    const status =
      bill.payment_status === "paid"
        ? "✅ PAID"
        : bill.payment_status === "partial"
        ? "🟡 PARTIAL PAYMENT"
        : "🔴 PAYMENT PENDING";

    const message = `
🍱 *LAZZAT TIFFIN*
━━━━━━━━━━━━━━━━━━━━

🧾 *MONTHLY BILL*

👤 *Customer:* ${customer.name}
📅 *Month:* ${monthName}

━━━━━━━━━━━━━━━━━━━━

🍛 *LUNCH*

Tiffins: ${bill.lunch_count}
Rate: ₹${bill.lunch_rate}
Amount: ₹${bill.lunch_amount}

🌙 *DINNER*

Tiffins: ${bill.dinner_count}
Rate: ₹${bill.dinner_rate}
Amount: ₹${bill.dinner_amount}

━━━━━━━━━━━━━━━━━━━━

💰 *BILL SUMMARY*

Total Bill: ₹${bill.total_amount}
Paid: ₹${bill.paid_amount}
Due: ₹${bill.due_amount}

Status: ${status}

━━━━━━━━━━━━━━━━━━━━

Thank you for choosing *Lazzat Tiffin* ❤️

Fresh Homemade Food
Healthy Tiffin Delivered Daily

📞 Contact: 9955672533
📍 Jamshedpur

Please contact us if you have any questions regarding your bill.
`;

    const whatsappUrl =
      `https://wa.me/${whatsappNumber}?text=` +
      encodeURIComponent(message);

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">

        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />

          <h1 className="text-xl font-bold">
            Loading Bill...
          </h1>

          <p className="mt-2 text-gray-500">
            Please wait
          </p>

        </div>

      </main>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">

        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

          <h1 className="text-xl font-bold">
            Billing Error
          </h1>

          <p className="mt-2">
            {error}
          </p>

        </div>

      </main>
    );
  }

  // =========================
  // PAGE
  // =========================

  return (
    <main className="min-h-screen bg-gray-100 p-6">

      {/* ACTION BAR */}

      <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center gap-3 print:hidden">

        <input
          type="month"
          value={month}
          onChange={(e) =>
            setMonth(e.target.value)
          }
          className="rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-green-500"
        />

        <button
          onClick={printBill}
          className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800"
        >
          🖨️ Print / PDF
        </button>

        <button
          onClick={sendWhatsApp}
          className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
        >
          📱 WhatsApp Bill
        </button>

      </div>

      {/* BILL */}

      <div
        id="bill"
        className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl print:rounded-none print:shadow-none"
      >

        {/* HEADER */}

        <div className="bg-gray-900 px-8 py-8 text-center text-white">

          <h1 className="text-3xl font-bold tracking-wide">
            LAZZAT TIFFIN
          </h1>

          <p className="mt-2 text-gray-300">
            Fresh Homemade Food
          </p>

          <p className="text-gray-300">
            Healthy Tiffin Delivered Daily
          </p>

        </div>

        <div className="p-8">

          {/* CUSTOMER INFORMATION */}

          <div className="grid gap-6 border-b pb-6 md:grid-cols-2">

            <div>

              <p className="text-sm font-medium text-gray-500">
                CUSTOMER
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                {customer?.name}
              </h2>

              {customer?.phone && (
                <p className="mt-1 text-gray-600">
                  📞 {customer.phone}
                </p>
              )}

              {customer?.address && (
                <p className="mt-1 text-gray-600">
                  📍 {customer.address}
                </p>
              )}

            </div>

            <div className="md:text-right">

              <p className="text-sm font-medium text-gray-500">
                BILLING MONTH
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {new Date(
                  `${month}-01T00:00:00`
                ).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </p>

            </div>

          </div>

          {/* BILL TABLE */}

          <div className="mt-8 overflow-hidden rounded-xl border">

            <table className="w-full">

              <thead className="bg-gray-900 text-white">

                <tr>

                  <th className="px-4 py-4 text-left">
                    Item
                  </th>

                  <th className="px-4 py-4 text-center">
                    Tiffins
                  </th>

                  <th className="px-4 py-4 text-right">
                    Rate
                  </th>

                  <th className="px-4 py-4 text-right">
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                {/* LUNCH */}

                <tr className="border-b">

                  <td className="px-4 py-5">

                    <div className="font-semibold">
                      🍛 Lunch
                    </div>

                  </td>

                  <td className="px-4 py-5 text-center">
                    {bill?.lunch_count || 0}
                  </td>

                  <td className="px-4 py-5 text-right">
                    ₹{bill?.lunch_rate || 0}
                  </td>

                  <td className="px-4 py-5 text-right font-semibold">
                    ₹{bill?.lunch_amount || 0}
                  </td>

                </tr>

                {/* DINNER */}

                <tr>

                  <td className="px-4 py-5">

                    <div className="font-semibold">
                      🌙 Dinner
                    </div>

                  </td>

                  <td className="px-4 py-5 text-center">
                    {bill?.dinner_count || 0}
                  </td>

                  <td className="px-4 py-5 text-right">
                    ₹{bill?.dinner_rate || 0}
                  </td>

                  <td className="px-4 py-5 text-right font-semibold">
                    ₹{bill?.dinner_amount || 0}
                  </td>

                </tr>

              </tbody>

            </table>

          </div>

          {/* SUMMARY */}

          <div className="mt-8 ml-auto max-w-sm">

            <div className="space-y-4">

              <div className="flex justify-between text-gray-600">

                <span>
                  Lunch Amount
                </span>

                <span>
                  ₹{bill?.lunch_amount || 0}
                </span>

              </div>

              <div className="flex justify-between text-gray-600">

                <span>
                  Dinner Amount
                </span>

                <span>
                  ₹{bill?.dinner_amount || 0}
                </span>

              </div>

              <div className="border-t pt-4">

                <div className="flex justify-between text-xl font-bold">

                  <span>
                    Total Bill
                  </span>

                  <span>
                    ₹{bill?.total_amount || 0}
                  </span>

                </div>

              </div>

              <div className="flex justify-between text-green-600">

                <span>
                  Paid
                </span>

                <span className="font-bold">
                  ₹{bill?.paid_amount || 0}
                </span>

              </div>

              <div className="flex justify-between text-xl font-bold text-red-600">

                <span>
                  Due
                </span>

                <span>
                  ₹{bill?.due_amount || 0}
                </span>

              </div>

            </div>

          </div>

          {/* STATUS */}

          <div className="mt-8 text-center">

            <span
              className={`inline-flex rounded-full px-6 py-3 font-bold ${
                bill?.payment_status === "paid"
                  ? "bg-green-100 text-green-700"
                  : bill?.payment_status === "partial"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >

              {bill?.payment_status === "paid"
                ? "✅ PAID"
                : bill?.payment_status === "partial"
                ? "🟡 PARTIAL PAYMENT"
                : "🔴 PAYMENT PENDING"}

            </span>

          </div>

          {/* FOOTER */}

          <div className="mt-10 border-t pt-6 text-center">

            <p className="font-semibold text-gray-800">
              Thank you for choosing Lazzat Tiffin ❤️
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Fresh • Homemade • Hygienic
            </p>

            <p className="mt-2 text-sm text-gray-500">
              📞 9955672533 • 📍 Jamshedpur
            </p>

          </div>

        </div>

      </div>

      {/* PRINT CSS */}

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          @page {
            size: A4;
            margin: 12mm;
          }

          #bill {
            width: 100%;
            max-width: none;
          }
        }
      `}</style>

    </main>
  );
}