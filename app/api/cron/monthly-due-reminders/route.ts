import { NextResponse } from "next/server";
import {
  createCipheriv,
  createPrivateKey,
  createSign,
  createECDH,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Subscription = {
  id: string;
  user_id: string;
  role: "admin" | "customer";
  customer_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type DueCustomer = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  auth_user_id: string | null;
};

const b64url = (value: Buffer | Uint8Array | string) =>
  Buffer.from(value).toString("base64url");

function sendVapidPush(subscription: Subscription, payload: object) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured.");

  const userPublicKey = Buffer.from(subscription.p256dh, "base64url");
  const authSecret = Buffer.from(subscription.auth, "base64url");
  if (userPublicKey.length !== 65 || authSecret.length !== 16) {
    throw new Error("Invalid push subscription key material.");
  }

  const serverEcdh = createECDH("prime256v1");
  serverEcdh.generateKeys();
  const serverPublicKey = serverEcdh.getPublicKey();
  const sharedSecret = serverEcdh.computeSecret(userPublicKey);

  const authInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    userPublicKey,
    serverPublicKey,
  ]);
  const inputKeyMaterial = Buffer.from(
    hkdfSync("sha256", sharedSecret, authSecret, authInfo, 32)
  );
  const salt = randomBytes(16);
  const cek = Buffer.from(
    hkdfSync("sha256", inputKeyMaterial, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16)
  );
  const nonce = Buffer.from(
    hkdfSync("sha256", inputKeyMaterial, salt, Buffer.from("Content-Encoding: nonce\0"), 12)
  );

  const plaintext = Buffer.concat([
    Buffer.from(JSON.stringify(payload), "utf8"),
    Buffer.from([2]),
  ]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(serverPublicKey.length, 20);
  const body = Buffer.concat([header, serverPublicKey, encrypted]);

  const endpointOrigin = new URL(subscription.endpoint).origin;
  const jwtHeader = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const jwtPayload = b64url(Buffer.from(JSON.stringify({
    aud: endpointOrigin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:support@lazzattiffin.com",
  })));
  const unsignedToken = jwtHeader + "." + jwtPayload;
  const rawPublic = Buffer.from(publicKey, "base64url");
  if (rawPublic.length !== 65) throw new Error("Invalid VAPID public key.");
  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: b64url(rawPublic.subarray(1, 33)),
      y: b64url(rawPublic.subarray(33, 65)),
      d: privateKey,
    },
    format: "jwk",
  });
  const signer = createSign("SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  const token = unsignedToken + "." + b64url(signature);

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${token}, k=${publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "2419200",
      Urgency: "normal",
    },
    body,
  });
}

async function sendToSubscriptions(
  subscriptions: Subscription[],
  payload: object
) {
  const outcomes = await Promise.all(subscriptions.map(async (subscription) => {
    try {
      const response = await sendVapidPush(subscription, payload);
      if (response.status === 404 || response.status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", subscription.id);
      }
      return response.ok;
    } catch (error) {
      console.error("Push delivery failed:", error);
      return false;
    }
  }));
  return { sent: outcomes.filter(Boolean).length, failed: outcomes.length - outcomes.filter(Boolean).length };
}

function previousMonthInIndia() {
  const now = new Date();
  const indiaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const firstOfCurrentMonth = new Date(indiaDate.getFullYear(), indiaDate.getMonth(), 1);
  firstOfCurrentMonth.setMonth(firstOfCurrentMonth.getMonth() - 1);
  return `${firstOfCurrentMonth.getFullYear()}-${String(firstOfCurrentMonth.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const billingMonth = previousMonthInIndia();
    const [{ data: bills, error: billsError }, { data: customers, error: customersError }, { data: subscriptions, error: subscriptionsError }] =
      await Promise.all([
        supabaseAdmin.from("billing")
          .select("id,customer_id,billing_month,due_amount")
          .eq("billing_month", billingMonth)
          .gt("due_amount", 0),
        supabaseAdmin.from("customers")
          .select("id,name,phone,active,auth_user_id"),
        supabaseAdmin.from("push_subscriptions")
          .select("id,user_id,role,customer_id,endpoint,p256dh,auth"),
      ]);

    if (billsError) throw billsError;
    if (customersError) throw customersError;
    if (subscriptionsError) throw subscriptionsError;

    const customerMap = new Map<string, DueCustomer>(
      (customers || []).map((customer) => [customer.id, customer as DueCustomer])
    );
    const dueBills = (bills || []).filter((bill) => Number(bill.due_amount) > 0);
    const totalDue = dueBills.reduce((sum, bill) => sum + Number(bill.due_amount || 0), 0);
    const adminSubscriptions = (subscriptions || []).filter((item) => item.role === "admin") as Subscription[];
    const customerSubscriptions = (subscriptions || []).filter((item) => item.role === "customer") as Subscription[];

    const adminKey = `admin-monthly-due:${billingMonth}`;
    const { data: adminLog } = await supabaseAdmin.from("push_notification_log")
      .select("id,status").eq("notification_key", adminKey).maybeSingle();
    let adminResult = { sent: 0, failed: 0 };
    if (dueBills.length > 0 && adminLog?.status !== "sent" && adminSubscriptions.length > 0) {
      adminResult = await sendToSubscriptions(adminSubscriptions, {
        title: "Lazzat Tiffin – Payment Due",
        body: `${dueBills.length} customers ka ₹${totalDue.toLocaleString("en-IN")} payment due hai. WhatsApp reminder list ready hai.`,
        url: "/admin/billing",
        tag: adminKey,
      });
      await supabaseAdmin.from("push_notification_log").upsert({
        notification_key: adminKey,
        notification_type: "admin_monthly_due",
        billing_month: billingMonth,
        due_amount: totalDue,
        status: adminResult.sent > 0 ? "sent" : "failed",
        error_message: adminResult.failed ? `${adminResult.failed} device(s) failed` : null,
      }, { onConflict: "notification_key" });
    }

    let customerSent = 0;
    let customerFailed = 0;
    for (const bill of dueBills) {
      const customer = customerMap.get(bill.customer_id);
      if (!customer?.active || !customer.auth_user_id) continue;
      const matchingSubscriptions = customerSubscriptions.filter((item) => item.customer_id === customer.id);
      if (!matchingSubscriptions.length) continue;

      const notificationKey = `customer-monthly-due:${billingMonth}:${customer.id}`;
      const { data: existingLog } = await supabaseAdmin.from("push_notification_log")
        .select("id,status").eq("notification_key", notificationKey).maybeSingle();
      if (existingLog?.status === "sent") continue;

      const due = Number(bill.due_amount);
      const result = await sendToSubscriptions(matchingSubscriptions, {
        title: "Lazzat Tiffin – Bill Due",
        body: `${billingMonth.slice(0, 7)} ka ₹${due.toLocaleString("en-IN")} payment pending hai. Kripya payment kar dein.`,
        url: "/customer",
        tag: notificationKey,
      });
      customerSent += result.sent;
      customerFailed += result.failed;
      await supabaseAdmin.from("push_notification_log").upsert({
        notification_key: notificationKey,
        recipient_user_id: customer.auth_user_id,
        customer_id: customer.id,
        notification_type: "customer_monthly_due",
        billing_month: billingMonth,
        due_amount: due,
        status: result.sent > 0 ? "sent" : "failed",
        error_message: result.failed ? `${result.failed} device(s) failed` : null,
      }, { onConflict: "notification_key" });
    }

    return NextResponse.json({
      success: true,
      billingMonth,
      dueCustomers: dueBills.length,
      totalDue,
      admin: adminResult,
      customerDevicesSent: customerSent,
      customerDevicesFailed: customerFailed,
    });
  } catch (error) {
    console.error("Monthly due reminder job failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reminder job failed." }, { status: 500 });
  }
}
