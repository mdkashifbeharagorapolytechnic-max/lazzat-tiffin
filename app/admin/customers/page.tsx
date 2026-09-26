"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  lunch_rate: number | null;
  dinner_rate: number | null;
  active: boolean;
  start_date: string | null;
  created_at: string;
  auth_user_id: string | null;
};

type CustomerWallet = {
  id: string;
  customer_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

type LoginResult = {
  success?: boolean;
  alreadyLinked?: boolean;
  existingUser?: boolean;
  linkedUser?: boolean;
  userId?: string;
  email?: string | null;
  password?: string;
  message?: string;
  error?: string;
};

type WalletAction = "credit" | "debit";

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  lunch_rate: "",
  dinner_rate: "",
  start_date: "",
  active: true,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wallets, setWallets] = useState<
    Record<string, number>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [error, setError] = useState("");

  const [creatingLoginId, setCreatingLoginId] =
    useState<string | null>(null);

  // ==================================================
  // WALLET STATE
  // ==================================================

  const [walletModalOpen, setWalletModalOpen] =
    useState(false);

  const [walletCustomer, setWalletCustomer] =
    useState<Customer | null>(null);

  const [walletAction, setWalletAction] =
    useState<WalletAction>("credit");

  const [walletAmount, setWalletAmount] =
    useState("");

  const [walletDescription, setWalletDescription] =
    useState("");

  const [walletSaving, setWalletSaving] =
    useState(false);

  const [walletError, setWalletError] =
    useState("");

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ==================================================
  // FETCH CUSTOMERS + WALLETS
  // ==================================================

  async function fetchCustomers() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const customerList =
        (data || []) as Customer[];

      setCustomers(customerList);

      await fetchWallets(customerList);
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customers."
      );

      setCustomers([]);
      setWallets({});
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // FETCH WALLETS
  // ==================================================

  async function fetchWallets(
    customerList: Customer[]
  ) {
    if (customerList.length === 0) {
      setWallets({});
      return;
    }

    const customerIds =
      customerList.map(
        (customer) => customer.id
      );

    const { data, error } = await supabase
      .from("customer_wallets")
      .select(
        "id, customer_id, balance, created_at, updated_at"
      )
      .in("customer_id", customerIds);

    if (error) {
      console.error(
        "Wallet fetch error:",
        error
      );

      setWallets({});
      return;
    }

    const walletMap: Record<
      string,
      number
    > = {};

    (data || []).forEach(
      (wallet: CustomerWallet) => {
        walletMap[wallet.customer_id] =
          Number(wallet.balance || 0);
      }
    );

    setWallets(walletMap);
  }

  // ==================================================
  // GET WALLET BALANCE
  // ==================================================

  function getWalletBalance(
    customerId: string
  ) {
    return Number(
      wallets[customerId] || 0
    );
  }

  // ==================================================
  // ADD FORM
  // ==================================================

  function openAddForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
    });
    setError("");
    setShowForm(true);
  }

  // ==================================================
  // EDIT FORM
  // ==================================================

  function openEditForm(
    customer: Customer
  ) {
    setEditingId(customer.id);

    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      lunch_rate:
        customer.lunch_rate !== null
          ? String(customer.lunch_rate)
          : "",
      dinner_rate:
        customer.dinner_rate !== null
          ? String(customer.dinner_rate)
          : "",
      start_date:
        customer.start_date || "",
      active: customer.active,
    });

    setError("");
    setShowForm(true);
  }

  // ==================================================
  // CLOSE CUSTOMER FORM
  // ==================================================

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({
      ...emptyForm,
    });
    setError("");
  }

  // ==================================================
  // SAVE CUSTOMER
  // ==================================================

  async function saveCustomer(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError(
        "Customer name is required."
      );
      return;
    }

    setSaving(true);
    setError("");

    const customerData = {
      name: form.name.trim(),

      phone:
        form.phone.trim() || null,

      address:
        form.address.trim() || null,

      lunch_rate: form.lunch_rate
        ? Number(form.lunch_rate)
        : null,

      dinner_rate: form.dinner_rate
        ? Number(form.dinner_rate)
        : null,

      start_date:
        form.start_date || null,

      active: form.active,
    };

    try {
      if (editingId) {
        const { error } =
          await supabase
            .from("customers")
            .update(customerData)
            .eq("id", editingId);

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from("customers")
            .insert([customerData]);

        if (error) {
          throw error;
        }
      }

      closeForm();

      await fetchCustomers();
    } catch (err: unknown) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==================================================
  // DELETE CUSTOMER
  // ==================================================

  async function deleteCustomer(
    id: string
  ) {
    const customer =
      customers.find(
        (item) => item.id === id
      );

    if (!customer) return;

    const confirmed =
      window.confirm(
        `Delete "${customer.name}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("customers")
        .delete()
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchCustomers();
  }

  // ==================================================
  // TOGGLE ACTIVE
  // ==================================================

  async function toggleActive(
    customer: Customer
  ) {
    const { error } =
      await supabase
        .from("customers")
        .update({
          active: !customer.active,
        })
        .eq("id", customer.id);

    if (error) {
      alert(error.message);
      return;
    }

    setCustomers((current) =>
      current.map((item) =>
        item.id === customer.id
          ? {
              ...item,
              active: !item.active,
            }
          : item
      )
    );
  }

  // ==================================================
  // CREATE / LINK LOGIN ACCOUNT
  // ==================================================

  async function createLoginAccount(
    customer: Customer
  ) {
    if (creatingLoginId) return;

    let existingEmail = "";

    if (!customer.auth_user_id) {
      const emailInput =
        window.prompt(
          `Existing Supabase Auth email for ${customer.name}\n\n` +
            `If this customer already has an account in Authentication → Users, enter that email.\n\n` +
            `For ATIF enter:\nmdkashifrazaansari333@gmail.com\n\n` +
            `Leave blank for a new login account.`
        );

      if (emailInput === null) {
        return;
      }

      existingEmail =
        emailInput.trim();
    }

    const confirmed =
      window.confirm(
        existingEmail
          ? `Link the existing Auth account ${existingEmail} to "${customer.name}"?`
          : `Create a new login account for "${customer.name}"?`
      );

    if (!confirmed) return;

    setCreatingLoginId(customer.id);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/create-login-account",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              customerId:
                customer.id,

              existingEmail:
                existingEmail || null,
            }),
          }
        );

      const result: LoginResult =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create login account."
        );
      }

      if (result.linkedUser) {
        alert(
          `Login account successfully linked.\n\n` +
            `Customer: ${customer.name}\n` +
            `Email: ${result.email || existingEmail}`
        );

        await fetchCustomers();

        return;
      }

      if (result.alreadyLinked) {
        alert(
          `${customer.name} already has a login account.`
        );

        await fetchCustomers();

        return;
      }

      if (
        result.email &&
        result.password
      ) {
        alert(
          `LOGIN ACCOUNT CREATED\n\n` +
            `Customer: ${customer.name}\n\n` +
            `Email: ${result.email}\n` +
            `Password: ${result.password}\n\n` +
            `Please save these credentials securely.`
        );
      } else {
        alert(
          result.message ||
            "Login account created successfully."
        );
      }

      await fetchCustomers();
    } catch (err: unknown) {
      console.error(
        "Create login error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create login account."
      );
    } finally {
      setCreatingLoginId(null);
    }
  }

  // ==================================================
  // OPEN WALLET MODAL
  // ==================================================

  function openWalletModal(
    customer: Customer,
    action: WalletAction
  ) {
    setWalletCustomer(customer);
    setWalletAction(action);
    setWalletAmount("");
    setWalletDescription("");
    setWalletError("");
    setWalletModalOpen(true);
  }

  // ==================================================
  // CLOSE WALLET MODAL
  // ==================================================

  function closeWalletModal() {
    if (walletSaving) return;

    setWalletModalOpen(false);
    setWalletCustomer(null);
    setWalletAmount("");
    setWalletDescription("");
    setWalletError("");
  }

  // ==================================================
  // WALLET TRANSACTION
  // ==================================================

  async function submitWalletTransaction(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!walletCustomer) {
      return;
    }

    const amount =
      Number(walletAmount);

    if (
      !walletAmount.trim() ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      setWalletError(
        "Please enter a valid amount greater than ₹0."
      );
      return;
    }

    if (
      walletAction === "debit" &&
      amount >
        getWalletBalance(
          walletCustomer.id
        )
    ) {
      setWalletError(
        "Debit amount cannot be greater than the customer's wallet balance."
      );
      return;
    }

    setWalletSaving(true);
    setWalletError("");

    try {
      if (
        walletAction === "credit"
      ) {
        const { data, error } =
          await supabase.rpc(
            "add_customer_wallet_credit",
            {
              p_customer_id:
                walletCustomer.id,

              p_amount: amount,

              p_description:
                walletDescription.trim() ||
                "Wallet credit added by admin",

              p_payment_id: null,

              p_reference_type:
                "admin",

              p_reference_id: null,
            }
          );

        if (error) {
          throw error;
        }

        console.log(
          "Wallet credit result:",
          data
        );
      } else {
        const { data, error } =
          await supabase.rpc(
            "add_customer_wallet_debit",
            {
              p_customer_id:
                walletCustomer.id,

              p_amount: amount,

              p_description:
                walletDescription.trim() ||
                "Wallet debit added by admin",

              p_reference_type:
                "admin",

              p_reference_id: null,
            }
          );

        if (error) {
          throw error;
        }

        console.log(
          "Wallet debit result:",
          data
        );
      }

      alert(
        walletAction === "credit"
          ? `₹${amount.toFixed(
              2
            )} added to ${walletCustomer.name}'s wallet successfully.`
          : `₹${amount.toFixed(
              2
            )} deducted from ${walletCustomer.name}'s wallet successfully.`
      );

      closeWalletModal();

      await fetchCustomers();
    } catch (err: unknown) {
      console.error(
        "Wallet transaction error:",
        err
      );

      setWalletError(
        err instanceof Error
          ? err.message
          : "Unable to update wallet."
      );
    } finally {
      setWalletSaving(false);
    }
  }

  // ==================================================
  // SEARCH
  // ==================================================

  const filteredCustomers =
    useMemo(() => {
      const text =
        search
          .toLowerCase()
          .trim();

      if (!text) {
        return customers;
      }

      return customers.filter(
        (customer) =>
          customer.name
            ?.toLowerCase()
            .includes(text) ||
          customer.phone
            ?.toLowerCase()
            .includes(text) ||
          customer.address
            ?.toLowerCase()
            .includes(text)
      );
    }, [customers, search]);

  // ==================================================
  // TOTAL WALLET BALANCE
  // ==================================================

  const totalWalletBalance =
    useMemo(() => {
      return customers.reduce(
        (total, customer) =>
          total +
          getWalletBalance(
            customer.id
          ),
        0
      );
    }, [customers, wallets]);

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-[1600px]">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customers
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your Lazzat Tiffin customers
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white shadow hover:bg-green-700"
          >
            + Add Customer
          </button>
        </div>

        {/* ================================================= */}
        {/* WALLET SUMMARY */}
        {/* ================================================= */}

        <div className="mb-6 grid gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">
              Total Customers
            </div>

            <div className="mt-2 text-3xl font-bold text-gray-900">
              {customers.length}
            </div>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">
              Total Wallet Balance
            </div>

            <div className="mt-2 text-3xl font-bold text-green-600">
              ₹
              {totalWalletBalance.toFixed(
                2
              )}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">
              Active Customers
            </div>

            <div className="mt-2 text-3xl font-bold text-blue-600">
              {
                customers.filter(
                  (customer) =>
                    customer.active
                ).length
              }
            </div>
          </div>

        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && !showForm && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <input
            type="text"
            placeholder="Search by name, phone or address..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
        </div>

        {/* ================================================= */}
        {/* CUSTOMER FORM */}
        {/* ================================================= */}

        {showForm && (
          <div className="mb-8 rounded-xl bg-white p-5 shadow-md md:p-7">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId
                  ? "Edit Customer"
                  : "Add Customer"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={
                saveCustomer
              }
            >
              <div className="grid gap-5 md:grid-cols-2">

                {/* NAME */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Customer Name *
                  </label>

                  <input
                    type="text"
                    value={
                      form.name
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter customer name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    required
                  />
                </div>

                {/* PHONE */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={
                      form.phone
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        phone: e.target.value,
                      })
                    }
                    placeholder="Enter phone number"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* ADDRESS */}

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address
                  </label>

                  <textarea
                    value={
                      form.address
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        address:
                          e.target.value,
                      })
                    }
                    placeholder="Enter customer address"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* LUNCH */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Lunch Rate
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.lunch_rate
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lunch_rate:
                          e.target.value,
                      })
                    }
                    placeholder="₹ per lunch"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* DINNER */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Dinner Rate
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.dinner_rate
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dinner_rate:
                          e.target.value,
                      })
                    }
                    placeholder="₹ per dinner"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* START DATE */}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      form.start_date
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        start_date:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* ACTIVE */}

                <div className="flex items-center">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={
                        form.active
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          active:
                            e.target.checked,
                        })
                      }
                      className="h-5 w-5 rounded border-gray-300 text-green-600"
                    />

                    <span className="font-medium text-gray-700">
                      Active Customer
                    </span>
                  </label>
                </div>

              </div>

              {/* FORM BUTTONS */}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Customer"
                    : "Save Customer"}
                </button>

              </div>
            </form>
          </div>
        )}

        {/* ================================================= */}
        {/* CUSTOMER LIST */}
        {/* ================================================= */}

        <div className="rounded-xl bg-white shadow-sm">

          <div className="border-b border-gray-100 p-5">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Customer List
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Wallet balance is maintained separately from billing.
                </p>
              </div>

              <span className="text-sm text-gray-500">
                {filteredCustomers.length} customer
                {filteredCustomers.length !==
                1
                  ? "s"
                  : ""}
              </span>

            </div>

          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading customers...
            </div>
          ) : filteredCustomers.length ===
            0 ? (
            <div className="p-10 text-center">

              <p className="text-gray-500">
                {search
                  ? "No customers found."
                  : "No customers added yet."}
              </p>

              {!search && (
                <button
                  onClick={
                    openAddForm
                  }
                  className="mt-4 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700"
                >
                  + Add First Customer
                </button>
              )}

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1450px]">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Phone
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lunch
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dinner
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Wallet
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Start Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Login
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredCustomers.map(
                    (customer) => {
                      const balance =
                        getWalletBalance(
                          customer.id
                        );

                      return (
                        <tr
                          key={
                            customer.id
                          }
                          className="hover:bg-gray-50"
                        >

                          {/* CUSTOMER */}

                          <td className="px-5 py-4">

                            <div className="font-semibold text-gray-900">
                              {
                                customer.name
                              }
                            </div>

                            {customer.address && (
                              <div className="mt-1 max-w-xs truncate text-xs text-gray-500">
                                {
                                  customer.address
                                }
                              </div>
                            )}

                          </td>

                          {/* PHONE */}

                          <td className="px-5 py-4 text-sm text-gray-600">
                            {customer.phone ||
                              "-"}
                          </td>

                          {/* LUNCH */}

                          <td className="px-5 py-4 text-sm font-medium text-gray-700">
                            {customer.lunch_rate !==
                            null
                              ? `₹${customer.lunch_rate}`
                              : "-"}
                          </td>

                          {/* DINNER */}

                          <td className="px-5 py-4 text-sm font-medium text-gray-700">
                            {customer.dinner_rate !==
                            null
                              ? `₹${customer.dinner_rate}`
                              : "-"}
                          </td>

                          {/* WALLET */}

                          <td className="px-5 py-4">

                            <div
                              className={`mb-2 text-lg font-bold ${
                                balance >
                                0
                                  ? "text-green-600"
                                  : balance <
                                    0
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              ₹
                              {balance.toFixed(
                                2
                              )}
                            </div>

                            <div className="flex gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  openWalletModal(
                                    customer,
                                    "credit"
                                  )
                                }
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                              >
                                + Add
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openWalletModal(
                                    customer,
                                    "debit"
                                  )
                                }
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                              >
                                − Deduct
                              </button>

                            </div>

                          </td>

                          {/* START DATE */}

                          <td className="px-5 py-4 text-sm text-gray-600">
                            {customer.start_date ||
                              "-"}
                          </td>

                          {/* LOGIN */}

                          <td className="px-5 py-4">

                            {customer.auth_user_id ? (
                              <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                Login Active
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  createLoginAccount(
                                    customer
                                  )
                                }
                                disabled={
                                  creatingLoginId ===
                                  customer.id
                                }
                                className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {creatingLoginId ===
                                customer.id
                                  ? "Creating..."
                                  : "Create Login"}
                              </button>
                            )}

                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">

                            <button
                              onClick={() =>
                                toggleActive(
                                  customer
                                )
                              }
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                customer.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {customer.active
                                ? "Active"
                                : "Inactive"}
                            </button>

                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">

                            <div className="flex justify-end gap-2">

                              <button
                                onClick={() =>
                                  openEditForm(
                                    customer
                                  )
                                }
                                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  deleteCustomer(
                                    customer.id
                                  )
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>
      </div>

      {/* ================================================= */}
      {/* WALLET MODAL */}
      {/* ================================================= */}

      {walletModalOpen &&
        walletCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div
                className={`rounded-t-2xl p-5 ${
                  walletAction ===
                  "credit"
                    ? "bg-green-600"
                    : "bg-red-600"
                }`}
              >

                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {walletAction ===
                      "credit"
                        ? "Add Money"
                        : "Deduct Money"}
                    </h2>

                    <p className="mt-1 text-sm text-white/80">
                      {
                        walletCustomer.name
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeWalletModal
                    }
                    disabled={
                      walletSaving
                    }
                    className="text-2xl text-white/80 hover:text-white disabled:opacity-50"
                  >
                    ×
                  </button>

                </div>

              </div>

              {/* CURRENT BALANCE */}

              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">

                <div className="flex items-center justify-between">

                  <span className="text-sm font-medium text-gray-500">
                    Current Wallet Balance
                  </span>

                  <span className="text-xl font-bold text-gray-900">
                    ₹
                    {getWalletBalance(
                      walletCustomer.id
                    ).toFixed(2)}
                  </span>

                </div>

              </div>

              {/* FORM */}

              <form
                onSubmit={
                  submitWalletTransaction
                }
                className="p-5"
              >

                {walletError && (
                  <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {walletError}
                  </div>
                )}

                {/* AMOUNT */}

                <div className="mb-5">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Amount
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-500">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        walletAmount
                      }
                      onChange={(e) =>
                        setWalletAmount(
                          e.target.value
                        )
                      }
                      placeholder="0.00"
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 py-3 pl-9 pr-4 text-lg font-semibold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      required
                    />

                  </div>

                </div>

                {/* DESCRIPTION */}

                <div className="mb-6">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Description
                  </label>

                  <textarea
                    value={
                      walletDescription
                    }
                    onChange={(e) =>
                      setWalletDescription(
                        e.target.value
                      )
                    }
                    placeholder={
                      walletAction ===
                      "credit"
                        ? "Example: Cash payment received"
                        : "Example: Adjustment / correction"
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                </div>

                {/* PREVIEW */}

                {walletAmount &&
                  Number(
                    walletAmount
                  ) > 0 && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">

                      <div className="flex items-center justify-between text-sm">

                        <span className="text-gray-500">
                          Current Balance
                        </span>

                        <span className="font-semibold text-gray-800">
                          ₹
                          {getWalletBalance(
                            walletCustomer.id
                          ).toFixed(
                            2
                          )}
                        </span>

                      </div>

                      <div className="my-2 border-t border-gray-200" />

                      <div className="flex items-center justify-between text-sm">

                        <span className="text-gray-500">
                          {walletAction ===
                          "credit"
                            ? "Adding"
                            : "Deducting"}
                        </span>

                        <span
                          className={`font-semibold ${
                            walletAction ===
                            "credit"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {walletAction ===
                          "credit"
                            ? "+"
                            : "-"}
                          ₹
                          {Number(
                            walletAmount
                          ).toFixed(
                            2
                          )}
                        </span>

                      </div>

                      <div className="my-2 border-t border-gray-200" />

                      <div className="flex items-center justify-between">

                        <span className="font-semibold text-gray-700">
                          New Balance
                        </span>

                        <span className="text-lg font-bold text-gray-900">
                          ₹
                          {(
                            walletAction ===
                            "credit"
                              ? getWalletBalance(
                                  walletCustomer.id
                                ) +
                                Number(
                                  walletAmount
                                )
                              : getWalletBalance(
                                  walletCustomer.id
                                ) -
                                Number(
                                  walletAmount
                                )
                          ).toFixed(2)}
                        </span>

                      </div>

                    </div>
                  )}

                {/* BUTTONS */}

                <div className="flex gap-3">

                  <button
                    type="button"
                    onClick={
                      closeWalletModal
                    }
                    disabled={
                      walletSaving
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      walletSaving
                    }
                    className={`flex-1 rounded-lg px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      walletAction ===
                      "credit"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {walletSaving
                      ? "Processing..."
                      : walletAction ===
                        "credit"
                      ? "Add Money"
                      : "Deduct Money"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}
    </div>
  );
}