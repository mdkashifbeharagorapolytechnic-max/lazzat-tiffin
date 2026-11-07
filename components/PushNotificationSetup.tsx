"use client";

import { useEffect, useState } from "react";

type Props = { role: "admin" | "customer" };

function decodeBase64Url(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export default function PushNotificationSetup({ role }: Props) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const available = typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(available);
    if (available) setPermission(Notification.permission);
  }, []);

  async function enableNotifications() {
    setBusy(true);
    setMessage("");
    try {
      if (!supported) throw new Error("Is browser mein push notifications supported nahi hain.");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push notification setup abhi complete nahi hua hai.");
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") throw new Error("Notification permission allow karein.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(publicKey),
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Subscription save nahi hua.");
      setMessage("Notifications is device par ON ho gayi hain.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Setup nahi ho paya.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <section className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-emerald-900">Phone Notifications</h3>
          <p className="mt-1 text-sm text-emerald-800">
            {permission === "granted" ? "Is device par notification permission allowed hai." : "Monthly bill reminder phone ke notification bar mein paane ke liye ON karein."}
          </p>
          {message && <p className="mt-2 text-sm text-emerald-900">{message}</p>}
        </div>
        <button type="button" onClick={enableNotifications} disabled={busy || permission === "denied"}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Setting up..." : permission === "granted" ? "Enable on this device" : "Enable Notifications"}
        </button>
      </div>
    </section>
  );
}
