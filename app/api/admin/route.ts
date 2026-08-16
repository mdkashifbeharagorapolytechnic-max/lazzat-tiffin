import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = body?.requestId;

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required." },
        { status: 400 }
      );
    }

    // Check current logged-in user
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only authentication check.
          },
        },
      }
    );

    const { data: claimsData } =
      await supabase.auth.getClaims();

    const adminUserId = claimsData?.claims?.sub;

    if (!adminUserId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Verify admin authorization
    const { data: adminRecord, error: adminError } =
      await supabaseAdmin
        .from("admin_users")
        .select("user_id")
        .eq("user_id", adminUserId)
        .maybeSingle();

    if (adminError || !adminRecord) {
      return NextResponse.json(
        { error: "Not authorized as admin." },
        { status: 403 }
      );
    }

    // Get request
    const { data: customerRequest, error: requestError } =
      await supabaseAdmin
        .from("customer_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

    if (requestError) {
      return NextResponse.json(
        { error: requestError.message },
        { status: 500 }
      );
    }

    if (!customerRequest) {
      return NextResponse.json(
        { error: "Customer request not found." },
        { status: 404 }
      );
    }

    if (customerRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been reviewed." },
        { status: 400 }
      );
    }

    if (!customerRequest.email) {
      return NextResponse.json(
        {
          error:
            "Customer email is required before approval.",
        },
        { status: 400 }
      );
    }

    // Check duplicate email
    const { data: existingCustomers, error: existingError } =
      await supabaseAdmin
        .from("customers")
        .select("id, auth_user_id")
        .eq("phone", customerRequest.phone);

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existingCustomers && existingCustomers.length > 0) {
      return NextResponse.json(
        {
          error:
            "A customer with this phone number already exists.",
        },
        { status: 400 }
      );
    }

    // Create Auth user with a temporary random password.
    // Customer can later use Forgot Password to set their own password.
    const temporaryPassword =
      `${crypto.randomUUID()}A1!`;

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: customerRequest.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        name: customerRequest.name,
        phone: customerRequest.phone,
        role: "customer",
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Unable to create customer auth account.",
        },
        { status: 400 }
      );
    }

    const authUserId = authData.user.id;

    // Create customer record.
    // Rates are intentionally left at 0 until the admin sets
    // the customer's actual rates.
    const { error: customerError } =
      await supabaseAdmin
        .from("customers")
        .insert({
          auth_user_id: authUserId,
          name: customerRequest.name,
          phone: customerRequest.phone,
          address: customerRequest.address,
          lunch_rate: customerRequest.lunch
            ? 0
            : 0,
          dinner_rate: customerRequest.dinner
            ? 0
            : 0,
          active: true,
          start_date: customerRequest.start_date,
        });

    if (customerError) {
      // Roll back Auth user if customer insert fails.
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      );

      return NextResponse.json(
        { error: customerError.message },
        { status: 500 }
      );
    }

    // Mark request approved.
    const { error: updateError } =
      await supabaseAdmin
        .from("customer_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (updateError) {
      // Remove created customer and auth account
      // if request approval update fails.
      await supabaseAdmin
        .from("customers")
        .delete()
        .eq("auth_user_id", authUserId);

      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      );

      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId: authUserId,
      message:
        "Customer approved and account created successfully.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}