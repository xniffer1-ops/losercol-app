import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getUser } from "@/src/lib/auth";
import {
  esUsuarioGestionSoportes,
  normalizarNumeroSoporte,
  numeroDesdeSoporte,
} from "@/src/lib/soporte-gestion";
import { registrarAccion } from "@/src/lib/historial";

async function autorizar() {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  if (user.rol !== "superadmin" && !user.permisos?.servicios?.editar) {
    return {
      user,
      denied: NextResponse.json(
        { error: "No tienes permiso para gestionar soportes" },
        { status: 403 }
      ),
    };
  }

  return { user, denied: null };
}

function serializarServicio(servicio: any) {
  return {
    id: servicio.id,
    numeroSoporte: servicio.numeroSoporte || `SP-${String(servicio.id).padStart(6, "0")}`,
    createdAt: servicio.createdAt,
    cliente: servicio.cliente?.nombre || "",
    placa: servicio.vehiculo?.placa || "",
    centro: servicio.centroOperacion?.nombre || "",
    descripcion: servicio.descripcion || "",
    totalNeto: Number(servicio.totalNeto || servicio.subtotal || 0),
  };
}

export async function GET(req: Request) {
  const { denied } = await autorizar();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();

  const where: any = {};

  if (q) {
    const numero = normalizarNumeroSoporte(q);
    const condiciones: any[] = [
      { numeroSoporte: { contains: q.toUpperCase() } },
      { cliente: { nombre: { contains: q, mode: "insensitive" } } },
      { vehiculo: { placa: { contains: q.toUpperCase() } } },
    ];

    if (numero) condiciones.unshift({ numeroSoporte: numero });

    where.OR = condiciones;
  }

  const [servicios, eliminados, configuracion] = await Promise.all([
    prisma.servicio.findMany({
      where,
      include: {
        cliente: { select: { nombre: true } },
        vehiculo: { select: { placa: true } },
        centroOperacion: { select: { nombre: true } },
      },
      orderBy: { id: "desc" },
      take: 200,
    }),
    prisma.soporteEliminado.findMany({
      where: q
        ? {
            restaurado: false,
            OR: [
              { numeroSoporte: { contains: q.toUpperCase() } },
              { eliminadoPor: { contains: q, mode: "insensitive" } },
            ],
          }
        : { restaurado: false },
      orderBy: { id: "desc" },
      take: 200,
    }),
    prisma.configuracionSoporte.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, siguienteNumero: 1, prefijo: "SP-" },
    }),
  ]);

  return NextResponse.json({
    siguienteNumero: Number(configuracion.siguienteNumero || 1),
    servicios: servicios.map(serializarServicio),
    eliminados: eliminados.map((item) => ({
      id: item.id,
      originalServicioId: item.originalServicioId,
      numeroSoporte: item.numeroSoporte,
      eliminadoPor: item.eliminadoPor,
      eliminadoAt: item.eliminadoAt,
      datos: item.datos,
    })),
  });
}

export async function PATCH(req: Request) {
  const { user, denied } = await autorizar();
  if (denied) return denied;

  try {
    const body = await req.json();
    const accion = String(body.accion || "").trim();

    if (accion === "cambiarNumero") {
      const servicioId = Number(body.servicioId);
      const nuevoNumero = normalizarNumeroSoporte(body.nuevoNumero);

      if (!servicioId || !nuevoNumero) {
        return NextResponse.json(
          { error: "Servicio y número de soporte válido son obligatorios" },
          { status: 400 }
        );
      }

      const servicio = await prisma.servicio.findUnique({
        where: { id: servicioId },
        select: { id: true, numeroSoporte: true },
      });

      if (!servicio) {
        return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
      }

      const anterior =
        servicio.numeroSoporte || `SP-${String(servicio.id).padStart(6, "0")}`;

      if (anterior === nuevoNumero) {
        return NextResponse.json({ ok: true, numeroSoporte: nuevoNumero });
      }

      const ocupado = await prisma.servicio.findFirst({
        where: {
          numeroSoporte: nuevoNumero,
          id: { not: servicioId },
        },
        select: { id: true },
      });

      if (ocupado) {
        return NextResponse.json(
          { error: `El soporte ${nuevoNumero} ya está asignado a otro servicio.` },
          { status: 409 }
        );
      }

      const archivosActivos = await prisma.soporteEliminado.count({
        where: { numeroSoporte: nuevoNumero, restaurado: false },
      });

      if (archivosActivos > 0) {
        return NextResponse.json(
          {
            error:
              `El soporte ${nuevoNumero} está en recuperación. Recupéralo primero o usa otro consecutivo.`,
          },
          { status: 409 }
        );
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        const resultado = await tx.servicio.updateMany({
          where: { numeroSoporte: anterior },
          data: { numeroSoporte: nuevoNumero },
        });

        await tx.soporte.updateMany({
          where: { numero: anterior },
          data: { numero: nuevoNumero },
        });

        if (resultado.count === 0) {
          await tx.servicio.update({
            where: { id: servicioId },
            data: { numeroSoporte: nuevoNumero },
          });
        }

        const numero = numeroDesdeSoporte(nuevoNumero);
        if (numero) {
          const config = await tx.configuracionSoporte.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1, siguienteNumero: 1, prefijo: "SP-" },
          });

          if (numero >= Number(config.siguienteNumero || 1)) {
            await tx.configuracionSoporte.update({
              where: { id: 1 },
              data: { siguienteNumero: numero + 1 },
            });
          }
        }

        return resultado.count || 1;
      });

      await registrarAccion(
        "EDITAR",
        "Soportes",
        `Cambió ${anterior} a ${nuevoNumero} en ${actualizado} servicio(s)`
      );

      return NextResponse.json({
        ok: true,
        anterior,
        numeroSoporte: nuevoNumero,
        serviciosActualizados: actualizado,
      });
    }

    if (accion === "siguienteNumero") {
      const numero = Number(body.siguienteNumero);

      if (!Number.isSafeInteger(numero) || numero <= 0) {
        return NextResponse.json(
          { error: "El siguiente consecutivo debe ser un número entero mayor a 0" },
          { status: 400 }
        );
      }

      const numeroSoporte = `SP-${String(numero).padStart(6, "0")}`;

      const ocupado =
        (await prisma.servicio.findFirst({
          where: { numeroSoporte },
          select: { id: true },
        })) ||
        (await prisma.soporte.findFirst({
          where: { numero: numeroSoporte },
          select: { id: true },
        }));

      if (ocupado) {
        return NextResponse.json(
          { error: `${numeroSoporte} ya existe. Elige un consecutivo libre.` },
          { status: 409 }
        );
      }

      const eliminado = await prisma.soporteEliminado.findFirst({
        where: { numeroSoporte, restaurado: false },
        select: { id: true },
      });

      if (eliminado) {
        return NextResponse.json(
          { error: `${numeroSoporte} está en recuperación. Recupéralo antes de usarlo.` },
          { status: 409 }
        );
      }

      await prisma.configuracionSoporte.upsert({
        where: { id: 1 },
        update: { siguienteNumero: numero },
        create: { id: 1, siguienteNumero: numero, prefijo: "SP-" },
      });

      await registrarAccion(
        "EDITAR",
        "Soportes",
        `Configuró el siguiente consecutivo como ${numeroSoporte}`
      );

      return NextResponse.json({ ok: true, siguienteNumero: numero });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error PATCH /api/soportes/gestion:", error);
    return NextResponse.json({ error: "No se pudo actualizar el soporte" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, denied } = await autorizar();
  if (denied) return denied;

  try {
    const body = await req.json();
    const accion = String(body.accion || "").trim();

    if (accion !== "recuperar") {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

    const numeroOriginal = normalizarNumeroSoporte(body.numeroSoporte);
    const nuevoNumero = normalizarNumeroSoporte(body.nuevoNumero || numeroOriginal);

    if (!numeroOriginal || !nuevoNumero) {
      return NextResponse.json({ error: "Número de soporte inválido" }, { status: 400 });
    }

    const eliminados = await prisma.soporteEliminado.findMany({
      where: { numeroSoporte: numeroOriginal, restaurado: false },
      orderBy: { id: "asc" },
    });

    if (eliminados.length === 0) {
      return NextResponse.json(
        { error: `No hay servicios eliminados para recuperar de ${numeroOriginal}` },
        { status: 404 }
      );
    }

    const datos = eliminados.map((item) => {
      if (!item.datos || typeof item.datos !== "object" || Array.isArray(item.datos)) {
        throw new Error(`El respaldo de ${item.numeroSoporte} está incompleto.`);
      }

      const raw = item.datos as Record<string, unknown>;

      return {
        item,
        raw,
      };
    });

    const ids = datos.map(({ item }) => item.originalServicioId);
    const idExistente = await prisma.servicio.findFirst({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (idExistente) {
      return NextResponse.json(
        { error: `No se puede recuperar ${numeroOriginal}: el ID de servicio ${idExistente.id} ya existe.` },
        { status: 409 }
      );
    }

    const conflicto =
      (await prisma.servicio.findFirst({
        where: { numeroSoporte: nuevoNumero },
        select: { id: true },
      })) ||
      (await prisma.soporte.findFirst({
        where: { numero: nuevoNumero },
        select: { id: true },
      }));

    if (conflicto) {
      return NextResponse.json(
        { error: `El soporte ${nuevoNumero} ya está ocupado.` },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const { item, raw } of datos) {
        const id = Number(raw.id);
        const clienteId = Number(raw.clienteId);
        const vehiculoId = Number(raw.vehiculoId);
        const centroOperacionId = Number(raw.centroOperacionId);
        const tarifaId = raw.tarifaId == null ? null : Number(raw.tarifaId);
        const seccionId = raw.seccionId == null ? null : Number(raw.seccionId);

        if (!id || !clienteId || !vehiculoId || !centroOperacionId) {
          throw new Error(`El respaldo de ${numeroOriginal} tiene datos inválidos.`);
        }

        await tx.servicio.create({
          data: {
            id,
            numeroSoporte: nuevoNumero,
            descripcion: String(raw.descripcion || ""),
            valorUnitario: Number(raw.valorUnitario || 0),
            cantidad: Number(raw.cantidad || 0),
            subtotal: Number(raw.subtotal || 0),
            reteIva: Boolean(raw.reteIva),
            valorReteIva: Number(raw.valorReteIva || 0),
            totalNeto: Number(raw.totalNeto || 0),
            facturaElectronica: Boolean(raw.facturaElectronica),
            clienteId,
            vehiculoId,
            centroOperacionId,
            tarifaId,
            seccionId,
            tipoCarpa: raw.tipoCarpa == null ? null : String(raw.tipoCarpa),
            formaPago: raw.formaPago == null ? null : String(raw.formaPago),
            unidadMedida: raw.unidadMedida == null ? null : String(raw.unidadMedida),
            presentacion: raw.presentacion == null ? null : String(raw.presentacion),
            categoria: raw.categoria == null ? null : String(raw.categoria),
            facturado: Boolean(raw.facturado),
            createdAt: raw.createdAt ? new Date(String(raw.createdAt)) : undefined,
            soporteId: raw.soporteId == null ? null : Number(raw.soporteId),
          },
        });

        await tx.soporteEliminado.update({
          where: { id: item.id },
          data: {
            restaurado: true,
            restauradoPor: user.email,
            restauradoAt: new Date(),
          },
        });
      }

      const numero = numeroDesdeSoporte(nuevoNumero);
      if (numero) {
        const config = await tx.configuracionSoporte.upsert({
          where: { id: 1 },
          update: {},
          create: { id: 1, siguienteNumero: 1, prefijo: "SP-" },
        });

        if (numero >= Number(config.siguienteNumero || 1)) {
          await tx.configuracionSoporte.update({
            where: { id: 1 },
            data: { siguienteNumero: numero + 1 },
          });
        }
      }
    });

    await registrarAccion(
      "RECUPERAR",
      "Soportes",
      `Recuperó ${numeroOriginal} como ${nuevoNumero} (${datos.length} servicio(s))`
    );

    return NextResponse.json({
      ok: true,
      numeroOriginal,
      nuevoNumero,
      serviciosRecuperados: datos.length,
    });
  } catch (error) {
    console.error("Error POST /api/soportes/gestion:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo recuperar el soporte",
      },
      { status: 500 }
    );
  }
}
