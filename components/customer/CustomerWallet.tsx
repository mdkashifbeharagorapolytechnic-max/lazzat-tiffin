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
};

export default function CustomerWallet({
  customerId,
}: Props) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<
    WalletTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] =
    useState(false);

  useEffect(() => {
    loadWallet();
  }, [customerId]);

  async function loadWallet() {
    setLoading(true);

    try {
      // =====================================================
      // WALLET
      // =====================================================

      const { data: wallet, error: walletError } =
        await supabase
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
      // TRANSACTION HISTORY
      // =====================================================

      const {
        data: transactionData,
        error: transactionError,
      } = await supabase
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

  return (
    <div className="mt-5 rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5">
      {/* =====================================================
          WALLET HEADER
      ===================================================== */}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-green-700">
            💰 Wallet Balance
          </p>

          <p className="mt-1 text-3xl font-extrabold text-gray-900">
            ₹{balance.toFixed(2)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Available wallet balance
          </p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
          💰
        </div>
      </div>

      {/* =====================================================
          HISTORY BUTTON
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          setShowHistory((value) => !value)
        }
        className="mt-5 w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-bold text-green-700 transition hover:bg-green-50"
      >
        {showHistory
          ? "Hide Wallet History"
          : "View Wallet History"}
      </button>

      {/* =====================================================
          HISTORY
      ===================================================== */}

      {showHistory && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-bold text-gray-900">
              Wallet History
            </h4>

            <button
              type="button"
              onClick={loadWallet}
              className="text-xs font-semibold text-green-600"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl bg-white p-4 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-center text-sm text-gray-500">
              No wallet transactions yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {transactions.map((transaction) => {
                const isCredit =
                  transaction.transaction_type ===
                  "credit";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {transaction.description ||
                          (isCredit
                            ? "Money added"
                            : "Money deducted")}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(
                          transaction.created_at
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`font-bold ${
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

                      <p className="text-[11px] text-gray-400">
                        {isCredit
                          ? "Credit"
                          : "Debit"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}