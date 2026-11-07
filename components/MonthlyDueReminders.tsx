"use client";

import { useEffect, useState } from "react";

type Reminder = {
  customerId: string;
  name: string;
  phone: string;
  dueAmount: number;
};

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export default function MonthlyDueReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [billingMonth, setBillingMonth] = useState("");
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/monthly-due-reminders")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Reminder list load nahi hui.");
        if (!active) return;
        setReminders(data.reminders || []);
        setBillingMonth(data.billingMonth || "");
        setTotalDue(Number(data.totalDue || 0));
      })
      .catch((err) => { if (active) setError(err.message || "Reminder list load nahi hui."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const monthLabel = billingMonth
    ? new Date(`${billingMonth}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "Previous month";

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">WhatsApp Due Reminders</h2>
          <p className="mt-1 text-sm text-slate-500">{monthLabel} · {reminders.length} customers · Total due {formatMoney(totalDue)}</p>
        </div>
        {reminders.length > 0 && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Lazzat Tiffin payment reminders are ready. Please send each customer reminder individually from the list.")}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-green-700 px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Open WhatsApp
          </a>
        )}
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading reminder list...</p> :
        error ? <p className="mt-4 text-sm text-red-600">{error}</p> :
        reminders.length === 0 ? <p className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">Koi pending due nahi hai. Kisi customer ko reminder nahi bhejna hai.</p> :
        <div className="mt-4 divide-y divide-slate-100">
          {reminders.map((item) => {
            const message = `Namaste ${item.name}, aapka Lazzat Tiffin ka ${monthLabel} bill ${formatMoney(item.dueAmount)} pending hai. Kripya payment kar dein. Dhanyavaad.`;
            const link = `https://wa.me/${whatsappNumber(item.phone)}?text=${encodeURIComponent(message)}`;
            return (
              <div key={item.customerId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.phone} · Due {formatMoney(item.dueAmount)}</p>
                </div>
                <a href={link} target="_blank" rel="noreferrer" className="rounded-lg border border-green-700 px-4 py-2 text-center text-sm font-semibold text-green-700 hover:bg-green-50">
                  Send WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      }
    </section>
  );
}
