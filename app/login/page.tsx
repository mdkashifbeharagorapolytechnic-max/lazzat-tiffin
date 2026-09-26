"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LoginMode = "password" | "otp";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] =
    useState<LoginMode>("password");

  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [otp, setOtp] =
    useState("");

  const [otpSent, setOtpSent] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const isEmail =
    identifier.trim().includes("@");

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function switchMode(
    newMode: LoginMode
  ) {
    setMode(newMode);
    setOtpSent(false);
    setOtp("");
    clearMessages();
  }

  // =====================================================
  // CHECK ADMIN USER
  // =====================================================

  async function checkAdminUser(
    userId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Admin check error:",
        error
      );

      throw new Error(
        `Admin verification failed: ${error.message}`
      );
    }

    if (!data) {
      await supabase.auth.signOut();

      throw new Error(
        "This account is not registered as an admin."
      );
    }

    return true;
  }

  // =====================================================
  // PASSWORD LOGIN
  // =====================================================

  async function handlePasswordLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    clearMessages();

    const value =
      identifier.trim();

    if (!value) {
      setError(
        "Email or phone number is required."
      );

      setLoading(false);
      return;
    }

    if (!password) {
      setError(
        "Password is required."
      );

      setLoading(false);
      return;
    }

    try {
      // ===============================================
      // SIGN IN
      // ===============================================

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
        throw new Error(
          result.error.message
        );
      }

      if (!result.data.session) {
        throw new Error(
          "Login successful but no authentication session was created."
        );
      }

      const user =
        result.data.user;

      if (!user) {
        throw new Error(
          "Login successful but user information was not returned."
        );
      }

      console.log(
        "LOGIN USER:",
        user.id
      );

      console.log(
        "LOGIN SESSION:",
        result.data.session
      );

      // ===============================================
      // VERIFY ADMIN
      // ===============================================

      await checkAdminUser(
        user.id
      );

      // ===============================================
      // CHECK SESSION AGAIN
      // ===============================================

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Authentication session could not be saved. Please try logging in again."
        );
      }

      console.log(
        "SAVED SESSION:",
        session
      );

      // ===============================================
      // GO ADMIN
      // ===============================================

      router.replace("/admin");

      router.refresh();

    } catch (err) {
      console.error(
        "Password login error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // SEND OTP
  // =====================================================

  async function sendOtp() {
    if (loading) return;

    const value =
      identifier.trim();

    if (!value) {
      setError(
        "Email or phone number is required."
      );

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
        throw new Error(
          result.error.message
        );
      }

      setOtpSent(true);

      setMessage(
        isEmail
          ? "OTP has been sent to your email."
          : "OTP has been sent to your phone."
      );

    } catch (err) {
      console.error(
        "Send OTP error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // VERIFY OTP
  // =====================================================

  async function verifyOtp(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    const value =
      identifier.trim();

    const code =
      otp.trim();

    if (!value) {
      setError(
        "Email or phone number is required."
      );

      return;
    }

    if (!code) {
      setError(
        "Please enter the OTP."
      );

      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        "Please enter the 6-digit OTP."
      );

      return;
    }

    setLoading(true);
    clearMessages();

    try {
      // ===============================================
      // VERIFY OTP
      // ===============================================

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
        throw new Error(
          result.error.message
        );
      }

      if (!result.data.session) {
        throw new Error(
          "OTP verified but no authentication session was created."
        );
      }

      const user =
        result.data.user;

      if (!user) {
        throw new Error(
          "OTP verified but user information was not returned."
        );
      }

      console.log(
        "OTP USER:",
        user.id
      );

      console.log(
        "OTP SESSION:",
        result.data.session
      );

      // ===============================================
      // VERIFY ADMIN
      // ===============================================

      await checkAdminUser(
        user.id
      );

      // ===============================================
      // CHECK SAVED SESSION
      // ===============================================

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Authentication session could not be saved."
        );
      }

      console.log(
        "OTP SAVED SESSION:",
        session
      );

      // ===============================================
      // GO ADMIN
      // ===============================================

      router.replace("/admin");

      router.refresh();

    } catch (err) {
      console.error(
        "OTP verification error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

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
            onClick={() =>
              switchMode("password")
            }
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
            onClick={() =>
              switchMode("otp")
            }
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

        {/* MESSAGE */}

        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* =============================================
            PASSWORD LOGIN
        ============================================= */}

        {mode === "password" && (

          <form
            onSubmit={
              handlePasswordLogin
            }
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
                  setIdentifier(
                    e.target.value
                  );

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

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(
                      e.target.value
                    );

                    clearMessages();
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3l18 18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.58 10.58a2 2 0 002.84 2.84"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.88 4.24A10.94 10.94 0 0112 4c5 0 8.27 4.11 9.5 6a11.3 11.3 0 01-3.03 3.44"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.61 6.61C4.83 7.82 3.59 9.36 3 10c1.23 1.89 4.5 6 9 6 1.17 0 2.25-.25 3.21-.68"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                      />
                    </svg>
                  )}
                </button>

              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

        )}

        {/* =============================================
            OTP LOGIN
        ============================================= */}

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
                      setIdentifier(
                        e.target.value
                      );

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
                  {loading
                    ? "Sending OTP..."
                    : "Send OTP"}
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

                      const value =
                        e.target.value
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
                  {loading
                    ? "Verifying..."
                    : "Verify OTP"}
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