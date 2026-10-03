import { redirect } from "next/navigation";
import { getUser } from "@/src/lib/auth";
import { tienePermiso, type AccionPermiso, type ModuloPermiso } from "@/src/lib/permisos";

export async function requirePagePermiso(
  modulo: ModuloPermiso,
  accion: AccionPermiso = "ver"
) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
    throw new Error("No autenticado");
  }

  if (user.rol !== "superadmin" && !tienePermiso(user.permisos, modulo, accion)) {
    redirect("/?error=sin-permiso");
  }

  return user;
}
