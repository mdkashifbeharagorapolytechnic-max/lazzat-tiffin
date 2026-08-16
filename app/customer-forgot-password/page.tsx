"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email.");
      setLoading(false);
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/customer-update-password`,
        }
      );

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setMessage(
        "Password reset link has been sent to your email. Please check your inbox and spam folder."
      );
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Lazzat Tiffin
          </h1>

          <p className="mt-2 text-gray-500">
            Customer Password Reset
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Customer Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="customer@example.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Sending..."
              : "Send Password Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/customer-login"
            className="text-sm font-semibold text-green-600 hover:text-green-700"
          >
            ← Back to Customer Login
          </Link>
        </div>
      </div>
    </main>
  );
}