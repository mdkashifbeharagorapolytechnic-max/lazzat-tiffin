"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CustomerSignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSignup(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    const phoneDigits = cleanPhone.replace(/\D/g, "");

    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (!cleanName) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }

    if (phoneDigits.length < 10) {
      setError("Please enter a valid phone number.");
      setLoading(false);
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // ---------------------------------------------
      // SECURE CUSTOMER CHECK
      // ---------------------------------------------

      const {
        data: customer,
        error: customerError,
      } = await supabase.rpc(
        "check_customer_for_signup",
        {
          input_phone: phoneDigits,
        }
      );

      if (customerError) {
        console.error(
          "Customer verification error:",
          customerError
        );

        setError(
          "Unable to verify your customer account."
        );

        setLoading(false);
        return;
      }

      const matchedCustomer = Array.isArray(customer)
        ? customer[0]
        : customer;

      // ---------------------------------------------
      // CUSTOMER NOT FOUND
      // ---------------------------------------------

      if (!matchedCustomer) {
        setError(
          "No customer account was found with this phone number. Please contact Lazzat Tiffin."
        );

        setLoading(false);
        return;
      }

      // ---------------------------------------------
      // CUSTOMER INACTIVE
      // ---------------------------------------------

      if (!matchedCustomer.active) {
        setError(
          "Your customer account is currently inactive."
        );

        setLoading(false);
        return;
      }

      // ---------------------------------------------
      // ALREADY LINKED
      // ---------------------------------------------

      if (matchedCustomer.auth_user_id) {
        setError(
          "This customer already has a login account. Please use Customer Login."
        );

        setLoading(false);
        return;
      }

      // ---------------------------------------------
      // CREATE AUTH ACCOUNT
      // ---------------------------------------------

      const {
        data,
        error: signupError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (signupError) {
        console.error(
          "Signup error:",
          signupError
        );

        setError(
          signupError.message ||
            "Unable to create your account."
        );

        setLoading(false);
        return;
      }

      if (!data.user) {
        setError(
          "Account could not be created. Please try again."
        );

        setLoading(false);
        return;
      }

      // ---------------------------------------------
      // EMAIL CONFIRMATION
      // ---------------------------------------------

      if (!data.session) {
        setSuccess(
          "Account created successfully. Please check your email and confirm your account before logging in."
        );

        setLoading(false);
        return;
      }

      // ---------------------------------------------
      // VERIFY TRIGGER LINK
      // ---------------------------------------------

      let linked = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        const {
          data: verifyData,
          error: verifyError,
        } = await supabase.rpc(
          "check_customer_for_signup",
          {
            input_phone: phoneDigits,
          }
        );

        if (verifyError) {
          console.error(
            "Customer link verification error:",
            verifyError
          );
        }

        const verifiedCustomer =
          Array.isArray(verifyData)
            ? verifyData[0]
            : verifyData;

        if (
          verifiedCustomer?.auth_user_id ===
          data.user.id
        ) {
          linked = true;
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );
      }

      // ---------------------------------------------
      // LINK FAILED
      // ---------------------------------------------

      if (!linked) {
        await supabase.auth.signOut({
          scope: "local",
        });

        setError(
          "Your account was created, but it could not be linked to your Lazzat Tiffin customer account."
        );

        setLoading(false);
        return;
      }

      // ---------------------------------------------
      // SUCCESS
      // ---------------------------------------------

      setSuccess(
        "Account created successfully. Opening your customer portal..."
      );

      setTimeout(() => {
        router.replace("/customer");
      }, 1000);
    } catch (err) {
      console.error(
        "Customer signup error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account."
      );

      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:p-8">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Lazzat Tiffin
          </h1>

          <p className="mt-2 text-gray-500">
            Create Customer Account
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSignup}
          className="space-y-5"
        >

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Full Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Enter your name"
              autoComplete="name"
              required
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Registered Phone Number
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              placeholder="Enter your registered phone"
              autoComplete="tel"
              required
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
            />

            <p className="mt-2 text-xs text-gray-500">
              Use the phone number already registered with Lazzat Tiffin.
            </p>
          </div>

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

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              required
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter password again"
              autoComplete="new-password"
              required
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Creating Account..."
              : "Create Customer Account"}
          </button>
        </form>

        <div className="mt-6 border-t pt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have a customer account?
          </p>

          <Link
            href="/customer-login"
            className="mt-2 inline-block font-semibold text-green-600 hover:text-green-700"
          >
            Customer Login
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/request"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Request a Tiffin Plan
          </Link>
        </div>

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