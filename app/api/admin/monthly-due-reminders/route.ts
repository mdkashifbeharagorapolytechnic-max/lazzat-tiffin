import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function previousMonthInIndia() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Please login first." }, { status: 401 });

    const { data: admin } = await supabaseAdmin.from("admin_users")
      .select("user_id").eq("user_id", userId).maybeSingle();
    if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const billingMonth = previousMonthInIndia();
    const [{ data: bills, error: billsError }, { data: customers, error: customersError }] = await Promise.all([
      supabaseAdmin.from("billing").select("customer_id,due_amount")
        .eq("billing_month", billingMonth).gt("due_amount", 0),
      supabaseAdmin.from("customers").select("id,name,phone,active").eq("active", true),
    ]);
    if (billsError) throw billsError;
    if (customersError) throw customersError;

    const customerMap = new Map((customers || []).map((customer) => [customer.id, customer]));
    const reminders = (bills || []).flatMap((bill) => {
      const customer = customerMap.get(bill.customer_id);
      const due = Number(bill.due_amount || 0);
      if (!customer || due <= 0 || !customer.phone) return [];
      return [{ customerId: customer.id, name: customer.name, phone: customer.phone, dueAmount: due }];
    });
    return NextResponse.json({
      billingMonth,
      reminders,
      totalDue: reminders.reduce((sum, item) => sum + item.dueAmount, 0),
    });
  } catch (error) {
    console.error("Monthly due reminder list error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load reminders." }, { status: 500 });
  }
}
