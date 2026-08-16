import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword() {
  const random = Math.random().toString(36).slice(-8);
  return `Lazzat@${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerId = body?.customerId;
    const existingEmail = body?.existingEmail?.trim().toLowerCase();

    if (!customerId) {
      return NextResponse.json(
        {
          error: "Customer ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // GET CUSTOMER
    // --------------------------------------------------

    const { data: customer, error: customerError } =
      await supabaseAdmin
        .from("customers")
        .select(
          "id,name,phone,address,auth_user_id,active"
        )
        .eq("id", customerId)
        .single();

    if (customerError || !customer) {
      return NextResponse.json(
        {
          error: "Customer not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // ALREADY LINKED
    // --------------------------------------------------

    if (customer.auth_user_id) {
      return NextResponse.json({
        success: true,
        alreadyLinked: true,
        message:
          "This customer already has a login account.",
        userId: customer.auth_user_id,
      });
    }

    // --------------------------------------------------
    // GET ALL AUTH USERS
    // --------------------------------------------------

    const {
      data: usersData,
      error: usersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      console.error(usersError);

      return NextResponse.json(
        {
          error:
            "Unable to check Supabase authentication users.",
        },
        { status: 500 }
      );
    }

    let existingUser = null;

    // --------------------------------------------------
    // OPTION 1:
    // ADMIN PROVIDES EXISTING EMAIL
    // --------------------------------------------------

    if (existingEmail) {
      existingUser =
        usersData.users.find(
          (user) =>
            user.email?.toLowerCase() ===
            existingEmail
        ) || null;

      if (!existingUser) {
        return NextResponse.json(
          {
            error:
              `No Supabase Auth user found with email "${existingEmail}". ` +
              `Please check the email in Authentication → Users.`,
          },
          { status: 404 }
        );
      }
    }

    // --------------------------------------------------
    // OPTION 2:
    // TRY CUSTOMER PHONE GENERATED EMAIL
    // FOR NEW ACCOUNTS
    // --------------------------------------------------

    let generatedEmail: string | null = null;

    if (!existingUser) {
      const phone =
        customer.phone?.replace(/\D/g, "") || "";

      if (!phone) {
        return NextResponse.json(
          {
            error:
              "Customer phone number is required to create a new login account.",
          },
          { status: 400 }
        );
      }

      generatedEmail = `${phone}@lazzattiffin.local`;

      existingUser =
        usersData.users.find(
          (user) =>
            user.email?.toLowerCase() ===
            generatedEmail?.toLowerCase()
        ) || null;
    }

    // --------------------------------------------------
    // EXISTING AUTH USER FOUND
    // --------------------------------------------------

    if (existingUser) {
      const userId = existingUser.id;

      // Link existing Auth account to customer.
      const { error: linkError } =
        await supabaseAdmin
          .from("customers")
          .update({
            auth_user_id: userId,
          })
          .eq("id", customer.id);

      if (linkError) {
        console.error(linkError);

        return NextResponse.json(
          {
            error:
              "Auth user found, but customer could not be linked: " +
              linkError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        existingUser: true,
        alreadyLinked: false,
        linkedUser: true,
        userId,
        email: existingUser.email,
        message:
          "Existing login account successfully linked to customer.",
      });
    }

    // --------------------------------------------------
    // CREATE NEW AUTH USER
    // --------------------------------------------------

    if (!generatedEmail) {
      return NextResponse.json(
        {
          error: "Unable to generate login email.",
        },
        { status: 400 }
      );
    }

    const password = generatePassword();

    const {
      data: createdUser,
      error: createUserError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email: generatedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          customer_id: customer.id,
          customer_name: customer.name,
          phone: customer.phone,
        },
      });

    if (createUserError || !createdUser.user) {
      console.error(createUserError);

      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Unable to create login account.",
        },
        { status: 500 }
      );
    }

    const userId = createdUser.user.id;

    // --------------------------------------------------
    // LINK NEW AUTH USER TO CUSTOMER
    // --------------------------------------------------

    const { error: linkError } =
      await supabaseAdmin
        .from("customers")
        .update({
          auth_user_id: userId,
        })
        .eq("id", customer.id);

    if (linkError) {
      console.error(linkError);

      // Roll back Auth user if customer linking fails.
      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      return NextResponse.json(
        {
          error:
            "Login account was created, but customer could not be linked: " +
            linkError.message,
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      existingUser: false,
      alreadyLinked: false,
      linkedUser: false,
      userId,
      email: generatedEmail,
      password,
      message:
        "New login account created successfully.",
    });
  } catch (error) {
    console.error(
      "Create login account API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}