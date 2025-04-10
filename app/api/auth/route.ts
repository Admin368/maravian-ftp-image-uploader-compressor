import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const pagePassword = process.env.PAGE_PASSWORD;

  if (password === pagePassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
