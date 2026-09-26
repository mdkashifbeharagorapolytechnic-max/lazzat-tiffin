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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

          {/* FULL NAME */}

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

          {/* PHONE */}

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
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Password
            </label>

            <div className="relative">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                required
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 0 0 2.25 12c1.5 4.5 5.25 7.5 9.75 7.5 1.61 0 3.12-.39 4.45-1.08M6.23 6.23A10.45 10.45 0 0 1 12 4.5c4.5 0 8.25 3 9.75 7.5a10.5 10.5 0 0 1-2.01 3.44M3 3l18 18"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.88 9.88a3 3 0 1 0 4.24 4.24"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12 18 19.5 12 19.5 2.25 12 2.25 12Z"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter password again"
                autoComplete="new-password"
                required
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (prev) => !prev
                  )
                }
                disabled={loading}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showConfirmPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 0 0 2.25 12c1.5 4.5 5.25 7.5 9.75 7.5 1.61 0 3.12-.39 4.45-1.08M6.23 6.23A10.45 10.45 0 0 1 12 4.5c4.5 0 8.25 3 9.75 7.5a10.5 10.5 0 0 1-2.01 3.44M3 3l18 18"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.88 9.88a3 3 0 1 0 4.24 4.24"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12 18 19.5 12 19.5 2.25 12 2.25 12Z"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* SUBMIT */}

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

        {/* CUSTOMER LOGIN */}

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