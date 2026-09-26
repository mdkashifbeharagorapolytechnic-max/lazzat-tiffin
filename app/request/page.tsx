"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Plan = "lunch" | "dinner" | "both";

export default function CustomerRequestPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
          <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-xl">
            <p className="font-semibold text-gray-700">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <CustomerRequestForm />
    </Suspense>
  );
}

function CustomerRequestForm() {
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [plan, setPlan] = useState<Plan>("both");
  const [startDate, setStartDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const selectedPlan = searchParams.get("plan");

    if (
      selectedPlan === "lunch" ||
      selectedPlan === "dinner" ||
      selectedPlan === "both"
    ) {
      setPlan(selectedPlan);
    }
  }, [searchParams]);

  const lunch = plan === "lunch" || plan === "both";
  const dinner = plan === "dinner" || plan === "both";

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }

    if (!cleanPhone) {
      setError("Please enter your phone number.");
      setLoading(false);
      return;
    }

    if (!cleanAddress) {
      setError("Please enter your delivery address.");
      setLoading(false);
      return;
    }

    if (!startDate) {
      setError("Please select your start date.");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("customer_requests")
        .insert({
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail || null,
          address: cleanAddress,
          plan,
          lunch,
          dinner,
          start_date: startDate,
          status: "pending",
        });

      if (insertError) {
        console.error("Request submit error:", insertError);
        setError(insertError.message);
        return;
      }

      setSuccess(true);

      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setPlan("both");
      setStartDate("");
    } catch (err) {
      console.error(err);
      setError(
        "Unable to submit your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-600">
            ✓
          </div>

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            Request Sent Successfully
          </h1>

          <p className="mt-3 text-gray-600">
            Thank you for choosing Lazzat Tiffin.
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Your plan request has been sent to our admin.
            We will review your request and contact you after
            approval.
          </p>

          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-7 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Submit Another Request
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">

        {/* HEADING */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
            Join Lazzat Tiffin
          </h1>

          <p className="mt-2 text-gray-600">
            Choose your tiffin plan and send us a request.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl md:p-8">

          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* NAME */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Full Name *
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Phone Number *
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError("");
                }}
                placeholder="+91XXXXXXXXXX"
                autoComplete="tel"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />

              <p className="mt-1 text-xs text-gray-500">
                Email will be required when your request is
                approved for customer login.
              </p>
            </div>

            {/* ADDRESS */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Delivery Address *
              </label>

              <textarea
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError("");
                }}
                placeholder="Enter complete delivery address"
                rows={4}
                required
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* PLAN */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Select Plan *
              </label>

              <div className="grid gap-3 md:grid-cols-3">

                {/* LUNCH */}
                <PlanCard
                  title="Lunch Only"
                  description="Lunch meal"
                  selected={plan === "lunch"}
                  onClick={() => {
                    setPlan("lunch");
                    setError("");
                  }}
                />

                {/* DINNER */}
                <PlanCard
                  title="Dinner Only"
                  description="Dinner meal"
                  selected={plan === "dinner"}
                  onClick={() => {
                    setPlan("dinner");
                    setError("");
                  }}
                />

                {/* BOTH */}
                <PlanCard
                  title="Lunch + Dinner"
                  description="Both meals"
                  selected={plan === "both"}
                  onClick={() => {
                    setPlan("both");
                    setError("");
                  }}
                />

              </div>
            </div>

            {/* START DATE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Start Date *
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError("");
                }}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* SELECTED PLAN SUMMARY */}
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm font-semibold text-gray-700">
                Selected Plan
              </p>

              <p className="mt-1 text-xl font-bold text-green-700">
                {plan === "lunch"
                  ? "Lunch Only"
                  : plan === "dinner"
                  ? "Dinner Only"
                  : "Lunch + Dinner"}
              </p>

              <div className="mt-3 text-sm text-gray-600">
                <p>
                  Lunch:{" "}
                  {lunch ? "Included ✓" : "Not included"}
                </p>

                <p className="mt-1">
                  Dinner:{" "}
                  {dinner ? "Included ✓" : "Not included"}
                </p>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-600 px-5 py-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Submitting Request..."
                : "Send Plan Request"}
            </button>

          </form>
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          Your request will be reviewed before your tiffin service
          starts.
        </p>
      </div>
    </main>
  );
}

function PlanCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition ${
        selected
          ? "border-green-600 bg-green-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div
        className={`mb-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          selected
            ? "border-green-600 bg-green-600"
            : "border-gray-300"
        }`}
      >
        {selected && (
          <div className="h-2 w-2 rounded-full bg-white" />
        )}
      </div>

      <p className="font-bold text-gray-900">
        {title}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </button>
  );
}