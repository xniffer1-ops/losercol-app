import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // 🔒 borrar cookie correctamente
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // 🔥 refuerzo extra (algunos navegadores)
  response.cookies.delete("token");

  return response;
}