"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type WalletTransaction = {
  id: string;
  amount: number;
  transaction_type: "credit" | "debit";
  description: string | null;
  created_at: string;
};

type Props = {
  customerId: string;
  customerName: string;
};

export default function AdminCustomerWallet({
  customerId,
  customerName,
}: Props) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [mode, setMode] = useState<"credit" | "debit">("credit");

  useEffect(() => {
    loadWallet();
  }, [customerId]);

  async function loadWallet() {
    setLoading(true);

    try {
      // =====================================================
      // WALLET
      // =====================================================

      const { data: wallet, error: walletError } = await supabase
        .from("customer_wallets")
        .select("balance")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (walletError) {
        console.error(walletError);
        return;
      }

      setBalance(Number(wallet?.balance || 0));

      // =====================================================
      // TRANSACTIONS
      // =====================================================

      const { data: transactionData, error: transactionError } =
        await supabase
          .from("wallet_transactions")
          .select(
            `
              id,
              amount,
              transaction_type,
              description,
              created_at
            `
          )
          .eq("customer_id", customerId)
          .order("created_at", {
            ascending: false,
          })
          .limit(50);

      if (transactionError) {
        console.error(transactionError);
        return;
      }

      setTransactions(transactionData || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleWalletUpdate() {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (mode === "debit" && numericAmount > balance) {
      alert("Wallet balance is insufficient.");
      return;
    }

    setProcessing(true);

    try {
      const functionName =
        mode === "credit"
          ? "add_wallet_credit"
          : "add_wallet_debit";

      const { data, error } = await supabase.rpc(functionName, {
        p_customer_id: customerId,
        p_amount: numericAmount,
        p_description:
          description.trim() ||
          (mode === "credit"
            ? "Money added by admin"
            : "Wallet adjustment by admin"),
        ...(mode === "debit"
          ? {
              p_reference_id: null,
            }
          : {}),
      });

      if (error) {
        console.error(error);

        alert(
          error.message ||
            "Wallet update failed."
        );

        return;
      }

      if (!data?.success) {
        alert("Wallet update failed.");
        return;
      }

      setBalance(Number(data.balance || 0));

      setAmount("");
      setDescription("");

      await loadWallet();

      alert(
        mode === "credit"
          ? `₹${numericAmount.toFixed(
              2
            )} added successfully.`
          : `₹${numericAmount.toFixed(
              2
            )} deducted successfully.`
      );
    } catch (error) {
      console.error(error);

      alert("Something went wrong.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            💰 Wallet
          </h3>

          <p className="text-sm text-gray-500">
            {customerName}
          </p>
        </div>

        <div className="rounded-xl bg-green-50 px-5 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Current Balance
          </p>

          <p className="text-2xl font-extrabold text-green-700">
            ₹{balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* =====================================================
          ADD / DEDUCT
      ===================================================== */}

      <div className="mt-5 rounded-xl bg-gray-50 p-4">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("credit")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              mode === "credit"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            + Add Money
          </button>

          <button
            type="button"
            onClick={() => setMode("debit")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              mode === "debit"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            − Deduct
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {/* AMOUNT */}

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Amount
            </label>

            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              placeholder="Enter amount"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Note
            </label>

            <input
              type="text"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder={
                mode === "credit"
                  ? "e.g. August payment"
                  : "e.g. Bill adjustment"
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* BUTTON */}

          <div className="flex items-end">
            <button
              type="button"
              disabled={processing}
              onClick={handleWalletUpdate}
              className={`w-full rounded-xl px-4 py-3 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === "credit"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {processing
                ? "Processing..."
                : mode === "credit"
                ? "Add Money"
                : "Deduct Money"}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          TRANSACTION HISTORY
      ===================================================== */}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-bold text-gray-900">
            Wallet History
          </h4>

          <button
            type="button"
            onClick={loadWallet}
            className="text-sm font-semibold text-green-600 hover:text-green-700"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
            Loading wallet...
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
            No wallet transactions yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            {transactions.map((transaction) => {
              const isCredit =
                transaction.transaction_type ===
                "credit";

              return (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-2 border-b border-gray-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {transaction.description ||
                        (isCredit
                          ? "Money added"
                          : "Money deducted")}
                    </p>

                    <p className="text-xs text-gray-500">
                      {new Date(
                        transaction.created_at
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <p
                    className={`text-lg font-bold ${
                      isCredit
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {isCredit ? "+" : "−"}₹
                    {Number(
                      transaction.amount
                    ).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}