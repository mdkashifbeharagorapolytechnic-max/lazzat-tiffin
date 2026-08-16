"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type AddCustomerProps = {
  onCustomerAdded: () => void;
};

export default function AddCustomer({
  onCustomerAdded,
}: AddCustomerProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lunchRate, setLunchRate] = useState("");
  const [dinnerRate, setDinnerRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone) {
      setMessage("Name aur phone number required hai.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("customers").insert({
      name,
      phone,
      address,
      lunch_rate: Number(lunchRate) || 0,
      dinner_rate: Number(dinnerRate) || 0,
      active: true,
    });

    if (error) {
      console.error(error);
      setMessage("Customer add nahi hua. Please try again.");
      setLoading(false);
      return;
    }

    setName("");
    setPhone("");
    setAddress("");
    setLunchRate("");
    setDinnerRate("");

    setMessage("Customer successfully add ho gaya! ✅");

    setLoading(false);
    onCustomerAdded();
  };

  return (
    <div className="mb-8 rounded-xl bg-white p-6 shadow">
      <h2 className="mb-5 text-xl font-bold text-gray-900">
        Add New Customer
      </h2>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <input
          type="text"
          placeholder="Customer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          placeholder="Delivery Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
        />

        <input
          type="number"
          placeholder="Lunch Rate ₹"
          value={lunchRate}
          onChange={(e) => setLunchRate(e.target.value)}
          className="rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="number"
          placeholder="Dinner Rate ₹"
          value={dinnerRate}
          onChange={(e) => setDinnerRate(e.target.value)}
          className="rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 md:col-span-2"
        >
          {loading ? "Adding Customer..." : "Add Customer"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm font-medium text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
}