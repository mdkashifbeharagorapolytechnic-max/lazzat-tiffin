"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CustomerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email.");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      setLoading(false);
      return;
    }

    try {
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        console.error("Login error:", loginError);

        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError(
          "Unable to login. Please try again."
        );
        setLoading(false);
        return;
      }

      const {
        data: customer,
        error: customerError,
      } = await supabase
        .from("customers")
        .select(
          "id,active,auth_user_id"
        )
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (customerError) {
        console.error(
          "Customer lookup error:",
          customerError
        );

        await supabase.auth.signOut({
          scope: "local",
        });

        setError(
          "Unable to verify your customer account."
        );

        setLoading(false);
        return;
      }

      if (!customer) {
        await supabase.auth.signOut({
          scope: "local",
        });

        setError(
          "Your customer account is not linked yet. Please contact Lazzat Tiffin."
        );

        setLoading(false);
        return;
      }

      if (!customer.active) {
        await supabase.auth.signOut({
          scope: "local",
        });

        setError(
          "Your customer account is currently inactive."
        );

        setLoading(false);
        return;
      }

      window.location.href = "/customer";
    } catch (err) {
      console.error(err);

      setError(
        "Unable to login. Please try again."
      );

      setLoading(false);
    }
  }

  function openSignup() {
    window.location.href = "/customer-signup";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:p-8">

        {/* HEADER */}

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Lazzat Tiffin
          </h1>

          <p className="mt-2 text-gray-500">
            Customer Login
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

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
              placeholder="customer@example.com"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
            />
          </div>

          {/* PASSWORD */}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>

              <Link
                href="/customer-forgot-password"
                className="text-sm font-semibold text-green-600 hover:text-green-700"
              >
                Forgot Password?
              </Link>
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
            />
          </div>

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Logging in..."
              : "Customer Login"}
          </button>
        </form>

        {/* CREATE ACCOUNT */}

        <div className="mt-6 border-t pt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have a customer login?
          </p>

          <button
            type="button"
            onClick={openSignup}
            className="mt-2 inline-block font-semibold text-green-600 hover:text-green-700"
          >
            Create Customer Account
          </button>
        </div>

        {/* REQUEST PLAN */}

        <div className="mt-4 text-center">
          <Link
            href="/request"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Request a Tiffin Plan
          </Link>
        </div>

        {/* ADMIN LOGIN */}

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Admin Login
          </Link>
        </div>

      </div>
    </main>
  );
}