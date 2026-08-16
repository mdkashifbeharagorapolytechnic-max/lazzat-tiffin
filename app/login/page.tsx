"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LoginMode = "password" | "otp";

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("password");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isEmail = identifier.trim().includes("@");

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function switchMode(newMode: LoginMode) {
    setMode(newMode);
    setOtpSent(false);
    setOtp("");
    clearMessages();
  }

  async function handlePasswordLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    clearMessages();

    const value = identifier.trim();

    if (!value) {
      setError("Email or phone number is required.");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Password is required.");
      setLoading(false);
      return;
    }

    try {
      const result = isEmail
        ? await supabase.auth.signInWithPassword({
            email: value,
            password,
          })
        : await supabase.auth.signInWithPassword({
            phone: value,
            password,
          });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      setError("Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp() {
    if (loading) return;

    const value = identifier.trim();

    if (!value) {
      setError("Email or phone number is required.");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const result = isEmail
        ? await supabase.auth.signInWithOtp({
            email: value,
            options: {
              shouldCreateUser: false,
            },
          })
        : await supabase.auth.signInWithOtp({
            phone: value,
            options: {
              shouldCreateUser: false,
            },
          });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setOtpSent(true);

      setMessage(
        isEmail
          ? "OTP has been sent to your email."
          : "OTP has been sent to your phone."
      );
    } catch (err) {
      console.error(err);
      setError("Unable to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    const value = identifier.trim();
    const code = otp.trim();

    if (!value) {
      setError("Email or phone number is required.");
      return;
    }

    if (!code) {
      setError("Please enter the OTP.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const result = isEmail
        ? await supabase.auth.verifyOtp({
            email: value,
            token: code,
            type: "email",
          })
        : await supabase.auth.verifyOtp({
            phone: value,
            token: code,
            type: "sms",
          });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      window.location.href = "/admin";
    } catch (err) {
      console.error(err);
      setError("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:p-8">
        {/* HEADER */}
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Lazzat Tiffin
          </h1>

          <p className="mt-2 text-gray-500">
            Admin Login
          </p>
        </div>

        {/* LOGIN MODE */}
        <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("password")}
            className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
              mode === "password"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Password
          </button>

          <button
            type="button"
            onClick={() => switchMode("otp")}
            className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${
              mode === "otp"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            OTP
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* PASSWORD LOGIN */}
        {mode === "password" && (
          <form
            onSubmit={handlePasswordLogin}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email or Phone Number
              </label>

              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  clearMessages();
                }}
                placeholder="Email or +91XXXXXXXXXX"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>

                <Link
                  href="/forgot-password"
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
                  clearMessages();
                }}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {/* OTP LOGIN */}
        {mode === "otp" && (
          <>
            {!otpSent ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email or Phone Number
                  </label>

                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      clearMessages();
                    }}
                    placeholder="Email or +91XXXXXXXXXX"
                    autoComplete="username"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>

                <p className="text-center text-xs text-gray-500">
                  OTP will be sent to your email or phone number.
                </p>
              </div>
            ) : (
              <form
                onSubmit={verifyOtp}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Enter 6-Digit OTP
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                      setOtp(value);
                      clearMessages();
                    }}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    clearMessages();
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Change Email / Phone
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}