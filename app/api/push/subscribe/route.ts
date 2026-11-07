import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subscription = body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Please login first." }, { status: 401 });

    const { data: admin } = await supabaseAdmin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    let role: "admin" | "customer";
    let customerId: string | null = null;

    if (admin) {
      role = "admin";
    } else {
      const { data: customer, error } = await supabaseAdmin
        .from("customers").select("id,active").eq("auth_user_id", userId).maybeSingle();
      if (error || !customer || !customer.active) {
        return NextResponse.json({ error: "Customer account not found or inactive." }, { status: 403 });
      }
      role = "customer";
      customerId = customer.id;
    }

    const { error: saveError } = await supabaseAdmin.from("push_subscriptions").upsert({
      user_id: userId,
      role,
      customer_id: customerId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: request.headers.get("user-agent"),
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

    if (saveError) throw saveError;
    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Push subscription error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save subscription." }, { status: 500 });
  }
}
