import { NextResponse } from "next/server";

export async function GET() {
  // Get the API key from environment variables
  const apiKey = process.env.PAGE_PASSWORD;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ key: apiKey });
}
