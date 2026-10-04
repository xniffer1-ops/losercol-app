import { NextResponse } from "next/server";
import { getUser } from "@/src/lib/auth";
import { tienePermiso, type AccionPermiso, type ModuloPermiso } from "@/src/lib/permisos";
import { prisma } from "@/src/lib/prisma";
import { tienePermisoCentro } from "@/src/lib/permisos-centros";

type WhatsAppBody = {
  telefono?: unknown;
  numeroSoporte?: unknown;
  pdfBase64?: unknown;
  fileName?: unknown;
  caption?: unknown;
};

function limpiarTexto(valor: unknown) {
  return String(valor || "").trim();
}

function normalizarTelefonoWhatsApp(telefono: unknown) {
  const soloNumeros = String(telefono || "").replace(/\D/g, "");

  if (!soloNumeros || soloNumeros.length < 7) return "";
  if (soloNumeros.startsWith("57") && soloNumeros.length >= 12) return soloNumeros;
  if (soloNumeros.length === 10) return `57${soloNumeros}`;

  return soloNumeros;
}

function limpiarBase64Pdf(valor: unknown) {
  const texto = limpiarTexto(valor);
  if (!texto) return "";

  // Acepta data URI completo: data:application/pdf;base64,JVBER...
  const partes = texto.split(",");
  return partes.length > 1 ? partes[partes.length - 1] : texto;
}

function nombreArchivoSeguro(valor: unknown, numeroSoporte: string) {
  const nombre = limpiarTexto(valor) || `${numeroSoporte || "soporte"}.pdf`;
  const limpio = nombre.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return limpio.toLowerCase().endsWith(".pdf") ? limpio : `${limpio}.pdf`;
}

async function requirePermisoWhatsApp() {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  if (user.rol === "superadmin") {
    return { user, denied: null };
  }

  const permisosPermitidos: Array<[ModuloPermiso, AccionPermiso]> = [
    ["servicios", "whatsapp"],
    ["servicioRapido", "crear"],
  ];

  const permitido = permisosPermitidos.some(([modulo, accion]) =>
    tienePermiso(user.permisos, modulo, accion)
  );

  if (!permitido) {
    return {
      denied: NextResponse.json(
        { error: "No tienes permiso para enviar soportes por WhatsApp" },
        { status: 403 }
      ),
    };
  }

  return { user, denied: null };
}

export async function POST(req: Request) {
  const { user, denied } = await requirePermisoWhatsApp();
  if (denied || !user) return denied ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = (await req.json()) as WhatsAppBody;

    const apiUrl = limpiarTexto(process.env.EVOLUTION_API_URL).replace(/\/$/, "");
    const apiKey = limpiarTexto(process.env.EVOLUTION_API_KEY);
    const instance = limpiarTexto(process.env.EVOLUTION_INSTANCE);

    if (!apiUrl || !apiKey || !instance) {
      return NextResponse.json(
        {
          error:
            "Faltan variables de entorno: EVOLUTION_API_URL, EVOLUTION_API_KEY o EVOLUTION_INSTANCE",
        },
        { status: 500 }
      );
    }

    const telefono = normalizarTelefonoWhatsApp(body.telefono);
    const numeroSoporte = limpiarTexto(body.numeroSoporte);
    const media = limpiarBase64Pdf(body.pdfBase64);

    if (numeroSoporte) {
      const servicio = await prisma.servicio.findFirst({
        where: { numeroSoporte },
        select: { centroOperacionId: true },
      });

      if (
        servicio &&
        !tienePermisoCentro(user, servicio.centroOperacionId, "whatsapp")
      ) {
        return NextResponse.json(
          { error: "No tienes permiso para enviar soportes por WhatsApp desde este centro" },
          { status: 403 }
        );
      }
    }
    const fileName = nombreArchivoSeguro(body.fileName, numeroSoporte);
    const caption =
      limpiarTexto(body.caption) ||
      `Hola, cordial saludo.\n\nAdjunto soporte de servicio LOSERCOL No. ${numeroSoporte}.\n\nGracias.`;

    if (!telefono) {
      return NextResponse.json(
        { error: "El cliente no tiene un teléfono válido para WhatsApp" },
        { status: 400 }
      );
    }

    if (!media) {
      return NextResponse.json(
        { error: "No se recibió el PDF en base64" },
        { status: 400 }
      );
    }

    const endpoint = `${apiUrl}/message/sendMedia/${encodeURIComponent(instance)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: telefono,
        mediatype: "document",
        mimetype: "application/pdf",
        caption,
        media,
        fileName,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Evolution API no pudo enviar el PDF por WhatsApp",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Error POST /api/whatsapp/enviar-soporte:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al enviar soporte por WhatsApp",
      },
      { status: 500 }
    );
  }
}
