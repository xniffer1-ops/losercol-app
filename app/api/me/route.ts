import { NextResponse } from "next/server";
import { getUser } from "@/src/lib/auth";

export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json(null);
  }

  return NextResponse.json(user);
}