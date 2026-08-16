import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function proxy(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const pathname =
    request.nextUrl.pathname;

  // ==================================================
  // PUBLIC ROUTES
  // ==================================================

  const publicRoutes = [
    "/",
    "/request",

    // Admin authentication
    "/login",
    "/forgot-password",
    "/update-password",

    // Customer authentication
    "/customer-login",
    "/customer-signup",
    "/customer-forgot-password",
    "/customer-update-password",
  ];

  const isPublicRoute =
    publicRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`
        )
    );

  // ==================================================
  // PUBLIC PAGE HANDLING
  // ==================================================

  if (isPublicRoute) {
    // ----------------------------------------------
    // ADMIN LOGIN
    // ----------------------------------------------

    if (pathname === "/login") {
      const { data } =
        await supabase.auth.getClaims();

      const userId =
        data?.claims?.sub;

      if (userId) {
        const {
          data: adminUser,
        } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (adminUser) {
          return NextResponse.redirect(
            new URL(
              "/admin",
              request.url
            )
          );
        }
      }
    }

    return response;
  }

  // ==================================================
  // ADMIN PROTECTION
  // ==================================================

  if (
    pathname.startsWith("/admin")
  ) {
    const { data } =
      await supabase.auth.getClaims();

    const userId =
      data?.claims?.sub;

    // Not logged in
    if (!userId) {
      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
      );
    }

    // Check admin authorization
    const {
      data: adminUser,
      error,
    } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !adminUser) {
      return NextResponse.redirect(
        new URL(
          "/login?error=not-admin",
          request.url
        )
      );
    }

    return response;
  }

  // ==================================================
  // CUSTOMER PROTECTION
  // ==================================================

  if (
    pathname.startsWith("/customer")
  ) {
    const { data } =
      await supabase.auth.getClaims();

    const userId =
      data?.claims?.sub;

    // Not logged in
    if (!userId) {
      return NextResponse.redirect(
        new URL(
          "/customer-login",
          request.url
        )
      );
    }

    return response;
  }

  // ==================================================
  // DEFAULT
  // ==================================================

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};