import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                request.cookies.set(
                  name,
                  value
                );

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

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  // ============================================
  // PROTECTED ADMIN AREA
  // ============================================

  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login"
  ) {
    if (!user) {
      const loginUrl =
        request.nextUrl.clone();

      loginUrl.pathname =
        "/admin/login";

      return NextResponse.redirect(
        loginUrl
      );
    }
  }

  // ============================================
  // PROTECTED CUSTOMER AREA
  // ============================================

  if (
    pathname.startsWith("/customer") &&
    pathname !== "/customer/login"
  ) {
    if (!user) {
      const loginUrl =
        request.nextUrl.clone();

      loginUrl.pathname =
        "/customer/login";

      return NextResponse.redirect(
        loginUrl
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/customer/:path*",
  ],
};