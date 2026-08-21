import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Supabase SMS Hook received:", body);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("SMS Hook Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      {
        status: 400,
      }
    );
  }
}