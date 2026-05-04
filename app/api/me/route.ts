import { NextResponse } from "next/server";
import { getUser } from "@/src/lib/auth";

const crearRespuestaSinCache = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

export async function GET() {
  const user = await getUser();

  if (!user) {
    return crearRespuestaSinCache(null, { status: 401 });
  }

  return crearRespuestaSinCache({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  });
}