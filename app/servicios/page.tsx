"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type jsPDF from "jspdf";

type Cliente = {
  id: number;
  nombre: string;
  ccNit: string;
  telefono?: string;
};

type Vehiculo = {
  id: number;
  placa: string;
  clienteId: number;
};

type Centro = {
  id: number;
  nombre: string;
};

type Tarifa = {
  id: number;
  codigo: string;
  descripcion: string;
  valorUnitario: number;
  unidadMedida: string;
  presentacion: string;
  categoria: string;
  centroOperacionId?: number | null;
  tipoUso?: "terceros" | "interno" | "ambos" | string | null;
};

type OpcionCarpa = {
  etiqueta: string;
  valor: number;
  tarifa: Tarifa;
};

type Seccion = {
  id: number;
  nombre: string;
};

type Servicio = {
  id: number;
  numeroSoporte?: string | null;
  tipoCarpa?: string | null;
  descripcion: string;
  valorUnitario: number;
  cantidad: number;
  subtotal: number;
  reteIva?: boolean;
  valorReteIva?: number;
  totalNeto?: number;
  formaPago?: string | null;
  clienteId: number;
  vehiculoId: number;
  centroOperacionId: number;
  tarifaId?: number | null;
  seccionId?: number | null;
  unidadMedida?: string | null;
  presentacion?: string | null;
  categoria?: string | null;
  createdAt: string;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  centroOperacion?: Centro;
  tarifa?: Tarifa | null;
  seccion?: Seccion | null;
};

type AccionServicios =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "pdf"
  | "whatsapp";

type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "superadmin" | "admin" | "auxiliar" | "operador";
  permisos?: {
    servicios?: Partial<Record<AccionServicios, boolean>>;
    reportes?: {
      exportar?: boolean;
    };
  };
} | null;

type GestionServicio = {
  id: number;
  numeroSoporte: string;
  createdAt: string;
  cliente: string;
  placa: string;
  centro: string;
  descripcion: string;
  totalNeto: number;
};

type SoporteEliminado = {
  id: number;
  originalServicioId: number;
  numeroSoporte: string;
  eliminadoPor: string;
  eliminadoAt: string;
  datos: Record<string, unknown>;
};

const EMAIL_GESTION_SOPORTES = "soporte@losercol.com";

function tienePermisoServicios(user: User, accion: AccionServicios) {
  if (!user) return false;
  if (user.rol === "superadmin") return true;
  return Boolean(user.permisos?.servicios?.[accion]);
}

function puedeExportarExcelServicios(user: User) {
  if (!user) return false;
  if (user.rol === "superadmin") return true;
  return Boolean(user.permisos?.reportes?.exportar || user.permisos?.servicios?.ver);
}

const initialForm = {
  clienteId: "",
  vehiculoId: "",
  centroOperacionId: "",
  seccionId: "",
  tarifaId: "",
  tipoOperacion: "servicioVehiculo",
  tipoCarpa: "",
  formaPago: "efectivo",
  reteIva: false,
  descripcion: "",
  valorUnitario: "",
  cantidad: "",
};

const fechaHoyInput = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = partes.find((parte) => parte.type === "year")?.value || "";
  const month = partes.find((parte) => parte.type === "month")?.value || "";
  const day = partes.find((parte) => parte.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
};

export default function ServiciosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [user, setUser] = useState<User>(null);

  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [placaBusqueda, setPlacaBusqueda] = useState("");
  const [centroBusqueda, setCentroBusqueda] = useState("");
  const [tipoUsoBusqueda, setTipoUsoBusqueda] = useState("");
  const [fechaInicio, setFechaInicio] = useState(fechaHoyInput());
  const [fechaFin, setFechaFin] = useState(fechaHoyInput());
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [gestionAbierta, setGestionAbierta] = useState(false);
  const [gestionBusqueda, setGestionBusqueda] = useState("");
  const [gestionSiguiente, setGestionSiguiente] = useState("");
  const [gestionServicios, setGestionServicios] = useState<GestionServicio[]>([]);
  const [gestionEliminados, setGestionEliminados] = useState<SoporteEliminado[]>([]);
  const [gestionCargando, setGestionCargando] = useState(false);
  const [gestionMensaje, setGestionMensaje] = useState("");
  const [gestionEditandoNumero, setGestionEditandoNumero] = useState<Record<number, string>>({});

  const numeroSoporte = (s: Servicio) =>
    s.numeroSoporte || `SP-${String(s.id).padStart(6, "0")}`;

  const normalizarTextoComparacion = (valor: string) =>
    valor
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const valorCarpaLegacy = (tipo: string) => {
    if (tipo === "Tracto Mula") return 46500;
    if (tipo === "Media Tracto Mula") return 23250;
    if (tipo === "Doble Troque") return 23150;
    if (tipo === "Media Doble Troque") return 11575;
    if (tipo === "Sencillo") return 16950;
    if (tipo === "Media Sencillo") return 8475;
    return 0;
  };

  const esTarifaDeCarpa = useCallback((tarifa: Tarifa) => {
    const codigo = tarifa.codigo.toUpperCase().trim();
    const texto = normalizarTextoComparacion(
      `${tarifa.codigo} ${tarifa.descripcion} ${tarifa.presentacion || ""} ${tarifa.categoria || ""}`
    );

    return (
      codigo === "LS009" ||
      codigo === "LS010" ||
      codigo === "LS011" ||
      codigo.startsWith("CARPA_") ||
      texto.includes("carpa") ||
      texto.includes("carpe y descarpe") ||
      texto.includes("descarpe")
    );
  }, []);

  const nombreCarpaDesdeTarifa = useCallback((tarifa: Tarifa) => {
    const texto = normalizarTextoComparacion(
      `${tarifa.descripcion} ${tarifa.presentacion || ""} ${tarifa.codigo}`
    );

    const esMedia = texto.includes("media");

    if (texto.includes("tracto")) return esMedia ? "Media Tracto Mula" : "Tracto Mula";
    if (texto.includes("doble")) return esMedia ? "Media Doble Troque" : "Doble Troque";
    if (texto.includes("sencillo")) return esMedia ? "Media Sencillo" : "Sencillo";

    return tarifa.descripcion || tarifa.presentacion || tarifa.codigo;
  }, []);

  const valorCarpaDesdeOpciones = (tipo: string, opciones: OpcionCarpa[]) => {
    const texto = normalizarTextoComparacion(tipo);
    const encontrada = opciones.find((opcion) => {
      const etiqueta = normalizarTextoComparacion(opcion.etiqueta);
      const descripcion = normalizarTextoComparacion(opcion.tarifa.descripcion || "");
      const presentacion = normalizarTextoComparacion(opcion.tarifa.presentacion || "");
      const codigo = normalizarTextoComparacion(opcion.tarifa.codigo || "");

      return (
        etiqueta === texto ||
        descripcion === texto ||
        presentacion === texto ||
        codigo === texto
      );
    });

    if (encontrada) return encontrada.valor;
    return valorCarpaLegacy(tipo);
  };

  const IVA_PORCENTAJE = 0.19;
  const RETEIVA_PORCENTAJE = 0.04;

  const redondearPesos = (valor: number) => Math.round(valor);

  const valorSinIva = (valorConIva: number) =>
    redondearPesos(Number(valorConIva || 0) / (1 + IVA_PORCENTAJE));

  const calcularValoresServicio = (s: Servicio) => {
    const valorGuardado = Number(s.valorUnitario || 0);
    const valorTarifaConIva = Number(s.tarifa?.valorUnitario || 0);
    const valorUnitario =
      valorTarifaConIva > 0 && Math.abs(valorGuardado - valorTarifaConIva) <= 1
        ? valorSinIva(valorTarifaConIva)
        : valorGuardado;
    const cantidad = Number(s.cantidad || 0);
    const valorServicio = redondearPesos(valorUnitario * cantidad);
    const opcionesCarpaServicio = tarifas
      .filter(esTarifaDeCarpa)
      .filter((tarifa) => tarifa.centroOperacionId === s.centroOperacionId)
      .map((tarifa) => ({
        etiqueta: nombreCarpaDesdeTarifa(tarifa),
        valor: Number(tarifa.valorUnitario || 0),
        tarifa,
      }));
    const valorAdicionalCarpaConIva = redondearPesos(
      valorCarpaDesdeOpciones(s.tipoCarpa || "", opcionesCarpaServicio)
    );
    const valorAdicionalCarpa = valorSinIva(valorAdicionalCarpaConIva);

    // Se muestra primero la base sin IVA; el IVA 19% se calcula sobre esa base.
    const baseAntesIva = redondearPesos(valorServicio + valorAdicionalCarpa);
    const ivaIncluido = redondearPesos(baseAntesIva * IVA_PORCENTAJE);
    const totalConIva = redondearPesos(baseAntesIva + ivaIncluido);

    // Retefuente 4% sobre subtotal sin IVA.
    const valorReteIva = s.reteIva
      ? redondearPesos(baseAntesIva * RETEIVA_PORCENTAJE)
      : 0;

    const totalNeto = redondearPesos(totalConIva - valorReteIva);

    return {
      valorUnitario,
      cantidad,
      valorServicio,
      valorAdicionalCarpa,
      totalConIva,
      baseAntesIva,
      ivaIncluido,
      valorReteIva,
      totalNeto,
    };
  };

  const cargarImagenComoBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      img.src = url;
    });
  };

  const agregarMarcaAguaPDF = (doc: jsPDF, texto = "LOSERCOL") => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const docConEstado = doc as any;

    if (docConEstado.saveGraphicsState) {
      docConEstado.saveGraphicsState();
    }

    // Más visible, pero sigue siendo fondo.
    if (docConEstado.GState && docConEstado.setGState) {
      docConEstado.setGState(new docConEstado.GState({ opacity: 0.24 }));
    }

    // Marca principal grande al centro.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(78);
    doc.setTextColor(185, 185, 185);

    doc.text(texto, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });

    // Dos marcas adicionales suaves para que atraviese mejor toda la hoja.
    doc.setFontSize(38);
    doc.setTextColor(205, 205, 205);

    doc.text(texto, pageWidth / 2, pageHeight / 2 - 70, {
      align: "center",
      angle: 45,
    });

    doc.text(texto, pageWidth / 2, pageHeight / 2 + 70, {
      align: "center",
      angle: 45,
    });

    if (docConEstado.restoreGraphicsState) {
      docConEstado.restoreGraphicsState();
    }

    doc.setTextColor(17, 17, 17);
  };

  const crearMarcaAguaSuperiorBase64 = (
    logoUrl: string,
    texto = "LOSERCOL"
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");

        // Proporción similar a una hoja A4 para que cubra toda la página.
        canvas.width = 900;
        canvas.height = 1273;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear canvas de marca de agua"));
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-45 * Math.PI) / 180);

        // Texto principal gris claro encima de la factura.
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "bold 145px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(texto, 0, 0);

        // Logo gris claro encima, en la misma diagonal.
        ctx.globalAlpha = 0.16;
        ctx.filter = "grayscale(1) contrast(0.85)";
        ctx.drawImage(img, -210, -235, 420, 170);

        // Repeticiones suaves para dificultar falsificación sin tapar datos.
        ctx.globalAlpha = 0.11;
        ctx.filter = "grayscale(1) contrast(0.75)";
        ctx.drawImage(img, -190, -520, 380, 155);
        ctx.drawImage(img, -190, 365, 380, 155);

        ctx.globalAlpha = 0.10;
        ctx.filter = "none";
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "bold 72px Arial";
        ctx.fillText(texto, 0, -350);
        ctx.fillText(texto, 0, 350);

        ctx.restore();

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => reject(new Error("No se pudo cargar el logo para marca de agua"));
      img.src = logoUrl;
    });
  };

  const crearQRVerificacionBase64 = async (url: string): Promise<string> => {
    const QRCode = await import("qrcode");

    return QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 240,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    });
  };

  const cargarUsuario = async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  const cargarCatalogos = async () => {
    const [c1, c2, c3, c4, c5] = await Promise.all([
      fetch("/api/clientes", { cache: "no-store" }),
      fetch("/api/vehiculos", { cache: "no-store" }),
      fetch("/api/centros", { cache: "no-store" }),
      fetch("/api/tarifas", { cache: "no-store" }),
      fetch("/api/secciones", { cache: "no-store" }),
    ]);

    const dataClientes = await c1.json();
    const dataVehiculos = await c2.json();
    const dataCentros = await c3.json();
    const dataTarifas = await c4.json();
    const dataSecciones = await c5.json();

    setClientes(Array.isArray(dataClientes) ? dataClientes : []);
    setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
    setCentros(Array.isArray(dataCentros) ? dataCentros : []);
    setTarifas(Array.isArray(dataTarifas) ? dataTarifas : []);
    setSecciones(Array.isArray(dataSecciones) ? dataSecciones : []);
  };

  const cargarServicios = async () => {
    const params = new URLSearchParams();

    if (placaBusqueda.trim()) params.set("placa", placaBusqueda.trim());
    if (centroBusqueda) params.set("centroOperacionId", centroBusqueda);
    if (tipoUsoBusqueda) params.set("tipoUso", tipoUsoBusqueda);
    if (fechaInicio) params.set("fechaInicio", fechaInicio);
    if (fechaFin) params.set("fechaFin", fechaFin);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/servicios${query}`, { cache: "no-store" });
    const data = await res.json();

    setServicios(Array.isArray(data) ? data : []);
  };

  const esUsuarioGestionSoportes =
    String(user?.email || "").trim().toLowerCase() === EMAIL_GESTION_SOPORTES;

  const cargarGestionSoportes = async (busqueda = gestionBusqueda) => {
    if (!esUsuarioGestionSoportes) return;

    try {
      setGestionCargando(true);
      setGestionMensaje("");

      const params = new URLSearchParams();
      if (busqueda.trim()) params.set("q", busqueda.trim());

      const res = await fetch(`/api/soportes/gestion?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        setGestionMensaje(data.error || "No se pudo cargar la gestión de soportes");
        return;
      }

      setGestionSiguiente(String(data.siguienteNumero || 1));
      setGestionServicios(Array.isArray(data.servicios) ? data.servicios : []);
      setGestionEliminados(Array.isArray(data.eliminados) ? data.eliminados : []);

      setGestionEditandoNumero((prev) => {
        const next = { ...prev };
        for (const servicio of Array.isArray(data.servicios) ? data.servicios : []) {
          if (!(servicio.id in next)) next[servicio.id] = servicio.numeroSoporte;
        }
        return next;
      });
    } catch {
      setGestionMensaje("Error de conexión con la gestión de soportes");
    } finally {
      setGestionCargando(false);
    }
  };

  const cambiarNumeroSoporteGestion = async (servicio: GestionServicio) => {
    const nuevoNumero = gestionEditandoNumero[servicio.id] || servicio.numeroSoporte;

    try {
      setGestionCargando(true);
      setGestionMensaje("");

      const res = await fetch("/api/soportes/gestion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "cambiarNumero",
          servicioId: servicio.id,
          nuevoNumero,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGestionMensaje(data.error || "No se pudo cambiar el soporte");
        return;
      }

      setGestionMensaje(
        `${data.anterior} fue cambiado a ${data.numeroSoporte}. Se actualizaron ${data.serviciosActualizados} servicio(s).`
      );
      await cargarGestionSoportes();
      await cargarServicios();
    } catch {
      setGestionMensaje("Error de conexión");
    } finally {
      setGestionCargando(false);
    }
  };

  const guardarSiguienteNumeroGestion = async () => {
    try {
      setGestionCargando(true);
      setGestionMensaje("");

      const res = await fetch("/api/soportes/gestion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "siguienteNumero",
          siguienteNumero: Number(gestionSiguiente),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGestionMensaje(data.error || "No se pudo guardar el consecutivo");
        return;
      }

      setGestionSiguiente(String(data.siguienteNumero));
      setGestionMensaje(
        `El próximo soporte quedó configurado como SP-${String(data.siguienteNumero).padStart(6, "0")}.`
      );
    } catch {
      setGestionMensaje("Error de conexión");
    } finally {
      setGestionCargando(false);
    }
  };

  const recuperarSoporteGestion = async (
    soporte: string,
    nuevoNumero = soporte
  ) => {
    const ok = window.confirm(
      `¿Recuperar ${soporte} y volverlo a registrar como ${nuevoNumero}?`
    );
    if (!ok) return;

    try {
      setGestionCargando(true);
      setGestionMensaje("");

      const res = await fetch("/api/soportes/gestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "recuperar",
          numeroSoporte: soporte,
          nuevoNumero,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGestionMensaje(data.error || "No se pudo recuperar el soporte");
        return;
      }

      setGestionMensaje(
        `${data.numeroOriginal} fue recuperado como ${data.nuevoNumero} (${data.serviciosRecuperados} servicio(s)).`
      );
      await cargarGestionSoportes();
      await cargarServicios();
    } catch {
      setGestionMensaje("Error de conexión");
    } finally {
      setGestionCargando(false);
    }
  };

  const abrirGestionSoportes = async () => {
    const nuevoEstado = !gestionAbierta;
    setGestionAbierta(nuevoEstado);
    if (nuevoEstado) {
      await cargarGestionSoportes();
    }
  };

  const cargarTodo = async () => {
    try {
      await Promise.all([cargarUsuario(), cargarCatalogos(), cargarServicios()]);
    } catch {
      setMensaje("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
    // La carga inicial debe ejecutarse una sola vez al montar la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const actualizarVista = () => {
      setIsMobile(window.innerWidth <= 760);
    };

    actualizarVista();
    window.addEventListener("resize", actualizarVista);

    return () => window.removeEventListener("resize", actualizarVista);
  }, []);

  const puedeCrear = tienePermisoServicios(user, "crear");
  const puedeEditar = tienePermisoServicios(user, "editar");
  const puedeEliminar = tienePermisoServicios(user, "eliminar");
  const puedePdf = tienePermisoServicios(user, "pdf");
  const puedeWhatsApp = tienePermisoServicios(user, "whatsapp");
  const puedeExportarExcel = puedeExportarExcelServicios(user);

  const normalizarTipoUsoTarifa = (tarifa?: Tarifa | null) => {
    const tipo = String(tarifa?.tipoUso || "terceros").toLowerCase().trim();
    if (tipo === "interno" || tipo === "movimiento interno") return "interno";
    if (tipo === "ambos" || tipo === "general") return "ambos";
    return "terceros";
  };

  const tipoUsoFormulario = form.tipoOperacion === "movimientoInterno" ? "interno" : "terceros";

  const vehiculosFiltrados = useMemo(() => {
    return vehiculos.filter((v) => v.clienteId === Number(form.clienteId));
  }, [vehiculos, form.clienteId]);

  const tarifasFiltradasFormulario = useMemo(() => {
    const centroId = Number(form.centroOperacionId);
    if (!centroId) return [];

    return tarifas
      .filter((tarifa) => tarifa.centroOperacionId === centroId)
      .filter((tarifa) => !esTarifaDeCarpa(tarifa))
      .filter((tarifa) => {
        const tipo = normalizarTipoUsoTarifa(tarifa);
        return tipo === "ambos" || tipo === tipoUsoFormulario;
      });
  }, [tarifas, form.centroOperacionId, tipoUsoFormulario, esTarifaDeCarpa]);

  const opcionesCarpaFormulario = useMemo<OpcionCarpa[]>(() => {
    const centroId = Number(form.centroOperacionId);
    if (!centroId) return [];

    return tarifas
      .filter(esTarifaDeCarpa)
      .filter((tarifa) => tarifa.centroOperacionId === centroId)
      .map((tarifa) => ({
        etiqueta: nombreCarpaDesdeTarifa(tarifa),
        valor: Number(tarifa.valorUnitario || 0),
        tarifa,
      }))
      .filter((opcion) => opcion.valor > 0)
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
  }, [tarifas, form.centroOperacionId, esTarifaDeCarpa, nombreCarpaDesdeTarifa]);

  const valorAdicionalCarpa = valorCarpaDesdeOpciones(
    form.tipoCarpa,
    opcionesCarpaFormulario
  );

  const valorUnitarioPreviewSinIva = valorSinIva(Number(form.valorUnitario || 0));
  const valorServicioPreview = redondearPesos(
    valorUnitarioPreviewSinIva * Number(form.cantidad || 0)
  );
  const valorAdicionalCarpaSinIva = valorSinIva(valorAdicionalCarpa);

  const baseAntesIvaPreview = redondearPesos(valorServicioPreview + valorAdicionalCarpaSinIva);
  const ivaIncluidoPreview = redondearPesos(baseAntesIvaPreview * IVA_PORCENTAJE);
  const subtotalPreview = redondearPesos(baseAntesIvaPreview + ivaIncluidoPreview);
  const retefuentePreview = form.reteIva
    ? redondearPesos(baseAntesIvaPreview * RETEIVA_PORCENTAJE)
    : 0;
  const totalNetoPreview = redondearPesos(subtotalPreview - retefuentePreview);

  const totalServicios = servicios.length;

  const totalFacturado = servicios.reduce((acc, s) => {
    const valores = calcularValoresServicio(s);
    return acc + Number(valores.totalNeto || s.totalNeto || s.subtotal || 0);
  }, 0);

  const totalCantidad = servicios.reduce(
    (acc, s) => acc + Number(s.cantidad || 0),
    0
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      const checked = e.target.checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "clienteId") {
      setForm((prev) => ({
        ...prev,
        clienteId: value,
        vehiculoId: "",
      }));
      return;
    }

    if (name === "centroOperacionId" || name === "tipoOperacion") {
      setForm((prev) => ({
        ...prev,
        [name]: value,
        tarifaId: "",
        tipoCarpa: name === "centroOperacionId" ? "" : prev.tipoCarpa,
        descripcion: "",
        valorUnitario: "",
      }));
      return;
    }

    if (name === "tarifaId") {
      const tarifa = tarifasFiltradasFormulario.find((t) => t.id === Number(value));

      setForm((prev) => ({
        ...prev,
        tarifaId: value,
        descripcion: tarifa?.descripcion || "",
        valorUnitario: tarifa ? String(tarifa.valorUnitario) : "",
      }));

      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditandoId(null);
  };

  const guardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (editandoId && !puedeEditar) {
      setMensaje("No tienes permiso para editar servicios");
      return;
    }

    if (!editandoId && !puedeCrear) {
      setMensaje("No tienes permiso para crear servicios");
      return;
    }

    if (
      !form.clienteId ||
      !form.vehiculoId ||
      !form.centroOperacionId ||
      !form.seccionId ||
      !form.tarifaId ||
      !form.cantidad
    ) {
      setMensaje("Completa todos los campos");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        clienteId: Number(form.clienteId),
        vehiculoId: Number(form.vehiculoId),
        centroOperacionId: Number(form.centroOperacionId),
        seccionId: Number(form.seccionId),
        tarifaId: Number(form.tarifaId),
        tipoOperacion: form.tipoOperacion,
        tipoCarpa: form.tipoCarpa,
        formaPago: form.formaPago,
        reteIva: form.reteIva,
        cantidad: Number(form.cantidad),
      };

      const res = await fetch(
        editandoId ? `/api/servicios/${editandoId}` : "/api/servicios",
        {
          method: editandoId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.error || "Error al guardar servicio");
        return;
      }

      setMensaje(editandoId ? "Servicio actualizado" : "Servicio guardado");
      resetForm();
      await cargarServicios();
    } catch {
      setMensaje("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const editarServicio = (s: Servicio) => {
    if (!puedeEditar) {
      setMensaje("No tienes permiso para editar servicios");
      return;
    }

    const tarifaOriginal = s.tarifa || tarifas.find((t) => t.id === s.tarifaId);
    const valorUnitarioConIva = tarifaOriginal?.valorUnitario
      ? Number(tarifaOriginal.valorUnitario)
      : redondearPesos(Number(s.valorUnitario || 0) * (1 + IVA_PORCENTAJE));

    setEditandoId(s.id);
    setForm({
      clienteId: String(s.clienteId),
      vehiculoId: String(s.vehiculoId),
      centroOperacionId: String(s.centroOperacionId),
      seccionId: s.seccionId ? String(s.seccionId) : "",
      tarifaId: s.tarifaId ? String(s.tarifaId) : "",
      tipoOperacion: normalizarTipoUsoTarifa(tarifaOriginal) === "interno" ? "movimientoInterno" : "servicioVehiculo",
      tipoCarpa: s.tipoCarpa || "",
      formaPago: s.formaPago || "credito",
      reteIva: Boolean(s.reteIva),
      descripcion: tarifaOriginal?.descripcion || s.descripcion,
      valorUnitario: valorUnitarioConIva ? String(valorUnitarioConIva) : "",
      cantidad: String(s.cantidad),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarServicio = async (id: number) => {
    if (!puedeEliminar) {
      setMensaje("No tienes permiso para eliminar servicios");
      return;
    }

    const ok = window.confirm("¿Seguro que quieres eliminar este servicio?");
    if (!ok) return;

    const res = await fetch("/api/servicios", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMensaje(data.error || "Error al eliminar");
      return;
    }

    setMensaje("Servicio eliminado");
    await cargarServicios();
  };

  const buscar = async () => {
    setLoading(true);
    await cargarServicios();
    setLoading(false);
  };

  const limpiarFiltros = async () => {
    const hoy = fechaHoyInput();

    setPlacaBusqueda("");
    setCentroBusqueda("");
    setTipoUsoBusqueda("");
    setFechaInicio(hoy);
    setFechaFin(hoy);
    setLoading(true);

    const res = await fetch(
      `/api/servicios?fechaInicio=${hoy}&fechaFin=${hoy}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setServicios(Array.isArray(data) ? data : []);

    setLoading(false);
  };

  const exportarExcel = async () => {
    if (!puedeExportarExcel) {
      alert("No tienes permiso para exportar Excel.");
      return;
    }

    if (servicios.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const data = servicios.map((s) => {
      const valores = calcularValoresServicio(s);

      return {
        Soporte: numeroSoporte(s),
        Fecha: new Date(s.createdAt).toLocaleDateString("es-CO"),
        Cliente: s.cliente?.nombre || "",
        Documento: s.cliente?.ccNit || "",
        Vehiculo: s.vehiculo?.placa || "",
        Centro: s.centroOperacion?.nombre || "",
        Seccion: s.seccion?.nombre || "",
        Tarifa: s.tarifa?.codigo || (s.descripcion?.toUpperCase().includes("CARPA") ? "CARPA" : ""),
        "Carpa adicional": s.tipoCarpa || "",
        "Forma de pago": s.formaPago || "credito",
        Descripcion: s.descripcion,
        Unidad: s.unidadMedida || "",
        Cantidad: valores.cantidad,
        "Valor unitario sin IVA": valores.valorUnitario,
        "Valor servicio sin IVA": valores.valorServicio,
        "Valor carpa sin IVA": valores.valorAdicionalCarpa,
        "Subtotal": valores.baseAntesIva,
        "Total con IVA": valores.totalConIva,
        "IVA 19%": valores.ivaIncluido,
        "Retefuente 4%": valores.valorReteIva,
        "Total neto": valores.totalNeto,
      };
    });

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");

    XLSX.writeFile(workbook, "servicios.xlsx");
  };

  const exportarPDF = async (s: Servicio) => {
    if (!puedePdf) {
      alert("No tienes permiso para descargar PDF.");
      return;
    }

    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new JsPDF();

    const pageHeight = doc.internal.pageSize.getHeight();
    const soporte = numeroSoporte(s);
    const valores = calcularValoresServicio(s);

    try {
      const logoBase64 = await cargarImagenComoBase64("/logo-losercol.png");
      doc.addImage(logoBase64, "PNG", 14, 10, 52, 24);
    } catch (error) {
      console.warn("No se pudo cargar el logo en el PDF:", error);
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Soporte de servicio", 14, 42);

    doc.setFont("helvetica", "bold");
    doc.text(`No. ${soporte}`, 145, 42);

    doc.setDrawColor(30, 30, 30);
    doc.line(14, 47, 196, 47);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 14, 58);
    doc.text("Cliente:", 14, 66);
    doc.text("Documento:", 14, 74);

    doc.text("Vehículo:", 110, 66);
    doc.text("Centro:", 110, 74);
    doc.text("Sección:", 110, 82);

    doc.setFont("helvetica", "normal");
    doc.text(new Date(s.createdAt).toLocaleDateString("es-CO"), 35, 58);
    doc.text(s.cliente?.nombre || "-", 35, 66);
    doc.text(s.cliente?.ccNit || "-", 40, 74);

    doc.text(s.vehiculo?.placa || "-", 132, 66);
    doc.text(s.centroOperacion?.nombre || "-", 126, 74);
    doc.text(s.seccion?.nombre || "-", 128, 82);

    autoTable(doc, {
      startY: 94,
      head: [
        [
          "Tarifa",
          "Carpa adicional",
          "Descripción",
          "Unidad",
          "Cantidad",
          "Valor unit. sin IVA",
          "Subtotal",
        ],
      ],
      body: [
        [
          s.tarifa?.codigo || (s.descripcion?.toUpperCase().includes("CARPA") ? "CARPA" : ""),
          s.tipoCarpa || "Sin carpa",
          s.descripcion || "",
          s.unidadMedida || "",
          valores.cantidad.toLocaleString("es-CO"),
          `$${valores.valorUnitario.toLocaleString("es-CO")}`,
          `$${valores.baseAntesIva.toLocaleString("es-CO")}`,
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [245, 196, 0],
        textColor: [17, 17, 17],
        fontStyle: "bold",
      },
    });

    const finalTablaY = (doc as any).lastAutoTable?.finalY || 116;

    autoTable(doc, {
      startY: finalTablaY + 8,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: {
          fontStyle: "bold",
          cellWidth: 80,
        },
        1: {
          halign: "right",
        },
      },
      body: [
        [
          "Valor unitario sin IVA",
          `$${valores.valorUnitario.toLocaleString("es-CO")}`,
        ],
        ["Cantidad", valores.cantidad.toLocaleString("es-CO")],
        [
          "Valor carpa sin IVA",
          `$${valores.valorAdicionalCarpa.toLocaleString("es-CO")}`,
        ],
        [
          "Subtotal sin IVA",
          `$${valores.baseAntesIva.toLocaleString("es-CO")}`,
        ],
        [
          "Retefuente 4%",
          valores.valorReteIva > 0
            ? `-$${valores.valorReteIva.toLocaleString("es-CO")}`
            : "$0",
        ],
        [
          "IVA 19%",
          `$${valores.ivaIncluido.toLocaleString("es-CO")}`,
        ],
        ["Total neto", `$${valores.totalNeto.toLocaleString("es-CO")}`],
      ],
      didParseCell: (data) => {
        if (data.row.index === 6) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 11;
        }
      },
    });

    try {
      const marcaAguaBase64 = await crearMarcaAguaSuperiorBase64("/logo-losercol.png");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeightFinal = doc.internal.pageSize.getHeight();

      // Se agrega al final para que quede por ENCIMA del contenido.
      doc.addImage(marcaAguaBase64, "PNG", 0, 0, pageWidth, pageHeightFinal);
    } catch (error) {
      console.warn("No se pudo cargar la marca de agua superior:", error);

      // Respaldo: si falla el logo, al menos coloca texto encima.
      agregarMarcaAguaPDF(doc);
    }

    try {
      const urlVerificacion = `${window.location.origin}/verificar/${encodeURIComponent(
        soporte
      )}`;
      const qrBase64 = await crearQRVerificacionBase64(urlVerificacion);

      const qrSize = 27;
      const qrX = 168;
      const qrY = pageHeight - 68;

      // Fondo blanco para que el QR siempre sea legible aunque tenga marca de agua encima.
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(210, 210, 210);
      doc.roundedRect(qrX - 3, qrY - 10, qrSize + 6, qrSize + 18, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(17, 17, 17);
      doc.text("Verificar soporte", qrX + qrSize / 2, qrY - 4, {
        align: "center",
      });

      // El QR se agrega al final para que quede por encima de la marca de agua y se pueda escanear.
      doc.addImage(qrBase64, "PNG", qrX, qrY, qrSize, qrSize);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(soporte, qrX + qrSize / 2, qrY + qrSize + 5, {
        align: "center",
      });
    } catch (error) {
      console.warn("No se pudo crear el QR de verificación:", error);
    }

    doc.save(`${soporte}_${s.vehiculo?.placa || "servicio"}.pdf`);
  };

  const normalizarTelefonoWhatsApp = (telefono?: string) => {
    const soloNumeros = String(telefono || "").replace(/\D/g, "");

    if (!soloNumeros || soloNumeros.length < 7) return "";
    if (soloNumeros.startsWith("57") && soloNumeros.length >= 12) return soloNumeros;
    if (soloNumeros.length === 10) return `57${soloNumeros}`;

    return soloNumeros;
  };

  const reenviarWhatsApp = async (s: Servicio) => {
    if (!puedeWhatsApp) {
      alert("No tienes permiso para enviar por WhatsApp.");
      return;
    }

    await exportarPDF(s);

    const telefono = normalizarTelefonoWhatsApp(s.cliente?.telefono);

    if (!telefono) {
      alert("El cliente no tiene un teléfono válido para WhatsApp.");
      return;
    }

    const mensaje = `Hola, cordial saludo.\n\nAdjunto soporte de servicio LOSERCOL No. ${numeroSoporte(s)}.\n\nGracias.`;
    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <main style={isMobile ? { ...styles.page, ...styles.pageMobile } : styles.page}>
      <div style={isMobile ? { ...styles.topBar, ...styles.topBarMobile } : styles.topBar}>
        <div>
          <h1 style={styles.title}>Servicios</h1>
          {user && (
            <p style={styles.roleText}>
              Usuario: <strong>{user.nombre}</strong> | Rol:{" "}
              <strong>{user.rol}</strong>
            </p>
          )}
        </div>
      </div>

      {esUsuarioGestionSoportes && (
        <section style={styles.gestionSection}>
          <div style={styles.gestionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Gestión de soportes</h2>
              <p style={styles.gestionSubtitle}>
                Acceso exclusivo para soporte@losercol.com: cambiar consecutivos, configurar el próximo número y recuperar soportes eliminados.
              </p>
            </div>
            <button onClick={() => void abrirGestionSoportes()} style={styles.secondaryButton}>
              {gestionAbierta ? "Cerrar gestión" : "Abrir gestión"}
            </button>
          </div>

          {gestionAbierta && (
            <div style={styles.gestionBody}>
              <div style={styles.gestionConfig}>
                <div>
                  <strong>Próximo consecutivo</strong>
                  <div style={styles.gestionHint}>
                    Se guardará como SP-{String(Number(gestionSiguiente || 1)).padStart(6, "0")}.
                  </div>
                </div>
                <div style={styles.gestionConfigRow}>
                  <input
                    type="number"
                    min={1}
                    value={gestionSiguiente}
                    onChange={(e) => setGestionSiguiente(e.target.value)}
                    style={styles.input}
                  />
                  <button
                    onClick={() => void guardarSiguienteNumeroGestion()}
                    style={styles.saveButton}
                    disabled={gestionCargando}
                  >
                    Guardar próximo
                  </button>
                </div>
              </div>

              <div style={styles.gestionSearchRow}>
                <input
                  value={gestionBusqueda}
                  onChange={(e) => setGestionBusqueda(e.target.value)}
                  placeholder="Buscar SP-000445, placa o cliente..."
                  style={styles.input}
                />
                <button
                  onClick={() => void cargarGestionSoportes()}
                  style={styles.secondaryButton}
                  disabled={gestionCargando}
                >
                  Buscar
                </button>
              </div>

              {gestionMensaje && <div style={styles.infoBox}>{gestionMensaje}</div>}

              <div style={isMobile ? styles.gestionGridMobile : styles.gestionGrid}>
                <div style={styles.gestionPanel}>
                  <h3 style={styles.gestionPanelTitle}>Soportes actuales</h3>
                  {gestionServicios.length === 0 ? (
                    <div style={styles.empty}>No hay resultados.</div>
                  ) : (
                    <div style={styles.gestionList}>
                      {(() => {
                        const vistos = new Set<string>();
                        return gestionServicios.map((servicio) => {
                          if (vistos.has(servicio.numeroSoporte)) return null;
                          vistos.add(servicio.numeroSoporte);

                          return (
                            <div key={servicio.id} style={styles.gestionRow}>
                              <div>
                                <strong>{servicio.numeroSoporte}</strong>
                                <div style={styles.gestionHint}>
                                  {servicio.placa || "-"} · {servicio.cliente || "-"} · {servicio.descripcion || "-"}
                                </div>
                              </div>
                              <div style={styles.gestionActionRow}>
                                <input
                                  value={
                                    gestionEditandoNumero[servicio.id] ||
                                    servicio.numeroSoporte
                                  }
                                  onChange={(e) =>
                                    setGestionEditandoNumero((prev) => ({
                                      ...prev,
                                      [servicio.id]: e.target.value,
                                    }))
                                  }
                                  style={styles.gestionNumberInput}
                                />
                                <button
                                  onClick={() =>
                                    void cambiarNumeroSoporteGestion(servicio)
                                  }
                                  style={styles.editButton}
                                  disabled={gestionCargando}
                                >
                                  Cambiar
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                <div style={styles.gestionPanel}>
                  <h3 style={styles.gestionPanelTitle}>Soportes eliminados / recuperación</h3>
                  {gestionEliminados.length === 0 ? (
                    <div style={styles.empty}>No hay soportes pendientes de recuperación.</div>
                  ) : (
                    <div style={styles.gestionList}>
                      {(() => {
                        const vistos = new Set<string>();
                        return gestionEliminados.map((item) => {
                          if (vistos.has(item.numeroSoporte)) return null;
                          vistos.add(item.numeroSoporte);

                          return (
                            <div key={item.id} style={styles.gestionRow}>
                              <div>
                                <strong>{item.numeroSoporte}</strong>
                                <div style={styles.gestionHint}>
                                  Eliminado {new Date(item.eliminadoAt).toLocaleString("es-CO")}
                                </div>
                              </div>
                              <div style={styles.gestionActionRow}>
                                <input
                                  defaultValue={item.numeroSoporte}
                                  id={`recuperar-${item.id}`}
                                  style={styles.gestionNumberInput}
                                />
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(
                                      `recuperar-${item.id}`
                                    ) as HTMLInputElement | null;
                                    void recuperarSoporteGestion(
                                      item.numeroSoporte,
                                      input?.value || item.numeroSoporte
                                    );
                                  }}
                                  style={styles.saveButton}
                                  disabled={gestionCargando}
                                >
                                  Recuperar
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section style={styles.filtersCard}>
        <h2 style={styles.sectionTitle}>Búsqueda y filtros</h2>

        <div style={isMobile ? styles.filtersGridMobile : styles.filtersGrid}>
          <input
            placeholder="Buscar placa"
            value={placaBusqueda}
            onChange={(e) => setPlacaBusqueda(e.target.value.toUpperCase())}
            style={styles.input}
          />

          <select
            value={centroBusqueda}
            onChange={(e) => setCentroBusqueda(e.target.value)}
            style={styles.input}
          >
            <option value="">Todos los centros</option>
            {centros.map((centro) => (
              <option key={centro.id} value={centro.id}>
                {centro.nombre}
              </option>
            ))}
          </select>

          <select
            value={tipoUsoBusqueda}
            onChange={(e) => setTipoUsoBusqueda(e.target.value)}
            style={styles.input}
          >
            <option value="">Todos los tipos</option>
            <option value="terceros">Cobro a terceros</option>
            <option value="interno">Movimiento interno</option>
          </select>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={styles.input}
          />

          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            style={styles.input}
          />

          <button onClick={buscar} style={styles.secondaryButton}>
            Buscar
          </button>

          <button onClick={limpiarFiltros} style={styles.secondaryButton}>
            Limpiar
          </button>

          {puedeExportarExcel && (
            <button onClick={exportarExcel} style={styles.excelButton}>
              Exportar Excel
            </button>
          )}
        </div>
      </section>

      <section style={isMobile ? styles.dashboardMobile : styles.dashboard}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total servicios</div>
          <div style={styles.statValue}>{totalServicios}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total facturado</div>
          <div style={styles.statValue}>
            ${totalFacturado.toLocaleString("es-CO")}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total cantidad</div>
          <div style={styles.statValue}>
            {totalCantidad.toLocaleString("es-CO")}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Centro filtrado</div>
          <div style={styles.statValue}>{centroBusqueda ? centros.find((c) => c.id === Number(centroBusqueda))?.nombre || "Centro" : "Todos"}</div>
        </div>
      </section>

      <div style={isMobile ? styles.layoutMobile : styles.layout}>
        <section style={styles.tableSection}>
          <div style={isMobile ? styles.tableHeaderMobile : styles.tableHeader}>
            <span>Soporte</span>
            <span>Sección</span>
            <span>Cliente</span>
            <span>Vehículo</span>
            <span>Centro</span>
            <span>Descripción</span>
            <span>Factura</span>
            <span>Total neto</span>
            <span>Acciones</span>
          </div>

          {loading ? (
            <div style={styles.empty}>Cargando servicios...</div>
          ) : servicios.length === 0 ? (
            <div style={styles.empty}>No hay servicios guardados</div>
          ) : (
            servicios.map((s) => {
              const valores = calcularValoresServicio(s);
              const totalMostrar = valores.totalNeto || Number(s.totalNeto || s.subtotal || 0);
              const descripcionCompleta = `${s.descripcion || "-"}${
                s.tipoCarpa ? ` + Carpa ${s.tipoCarpa}` : ""
              }`;

              if (isMobile) {
                return (
                  <div key={s.id} style={styles.mobileServiceCard}>
                    <div style={styles.mobileCardTop}>
                      <div>
                        <div style={styles.mobileLabel}>Soporte</div>
                        <strong style={styles.mobileSupport}>{numeroSoporte(s)}</strong>
                      </div>

                    </div>

                    <div style={styles.mobileInfoGrid}>
                      <div>
                        <span style={styles.mobileLabel}>Cliente</span>
                        <strong>{s.cliente?.nombre || "-"}</strong>
                      </div>

                      <div>
                        <span style={styles.mobileLabel}>Placa</span>
                        <strong>{s.vehiculo?.placa || "-"}</strong>
                      </div>

                      <div>
                        <span style={styles.mobileLabel}>Centro</span>
                        <strong>{s.centroOperacion?.nombre || "-"}</strong>
                      </div>

                      <div>
                        <span style={styles.mobileLabel}>Sección</span>
                        <strong>{s.seccion?.nombre || "-"}</strong>
                      </div>
                    </div>

                    <div style={styles.mobileDescription}>
                      <span style={styles.mobileLabel}>Servicio</span>
                      <strong>{descripcionCompleta}</strong>
                    </div>

                    <div style={styles.mobileTotalRow}>
                      <span>Total neto</span>
                      <strong>${Number(totalMostrar || 0).toLocaleString("es-CO")}</strong>
                    </div>

                    <div style={styles.actionsMobile}>
                      {puedePdf && (
                        <button
                          onClick={() => void exportarPDF(s)}
                          style={styles.pdfButtonMobile}
                        >
                          PDF
                        </button>
                      )}

                      {puedeWhatsApp && (
                        <button
                          onClick={() => void reenviarWhatsApp(s)}
                          style={styles.whatsappButtonMobile}
                        >
                          WhatsApp
                        </button>
                      )}

                      {puedeEditar && (
                        <button
                          onClick={() => editarServicio(s)}
                          style={styles.editButtonMobile}
                        >
                          Editar
                        </button>
                      )}

                      {puedeEliminar && (
                        <button
                          onClick={() => eliminarServicio(s.id)}
                          style={styles.deleteButtonMobile}
                        >
                          Eliminar
                        </button>
                      )}

                      {!puedePdf && !puedeWhatsApp && !puedeEditar && !puedeEliminar && (
                        <span style={styles.noActions}>Solo consulta</span>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={s.id} style={styles.tableRow}>
                  <span>{numeroSoporte(s)}</span>
                  <span>{s.seccion?.nombre || "-"}</span>
                  <span>{s.cliente?.nombre || "-"}</span>
                  <span>{s.vehiculo?.placa || "-"}</span>
                  <span>{s.centroOperacion?.nombre || "-"}</span>
                  <span>{descripcionCompleta}</span>

                  <span>${Number(totalMostrar || 0).toLocaleString("es-CO")}</span>

                  <div style={styles.actions}>
                    {puedePdf && (
                      <button
                        onClick={() => void exportarPDF(s)}
                        style={styles.pdfButton}
                      >
                        PDF
                      </button>
                    )}

                    {puedeWhatsApp && (
                      <button
                        onClick={() => void reenviarWhatsApp(s)}
                        style={styles.whatsappButton}
                      >
                        WhatsApp
                      </button>
                    )}

                    {puedeEditar && (
                      <button
                        onClick={() => editarServicio(s)}
                        style={styles.editButton}
                      >
                        Editar
                      </button>
                    )}

                    {puedeEliminar && (
                      <button
                        onClick={() => eliminarServicio(s.id)}
                        style={styles.deleteButton}
                      >
                        Eliminar
                      </button>
                    )}

                    {!puedePdf && !puedeWhatsApp && !puedeEditar && !puedeEliminar && (
                      <span style={styles.noActions}>Solo consulta</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.sectionTitle}>
            {editandoId ? "Editar servicio" : "Adicionar servicio"}
          </h2>

          {!editandoId && !puedeCrear && (
            <div style={styles.infoBox}>
              Este usuario puede consultar servicios, pero no tiene permiso para crear nuevos soportes.
            </div>
          )}

          <form onSubmit={guardarServicio} style={styles.form}>
            <select
              name="clienteId"
              value={form.clienteId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} - {c.ccNit}
                </option>
              ))}
            </select>

            <select
              name="vehiculoId"
              value={form.vehiculoId}
              onChange={handleChange}
              style={styles.input}
              disabled={!form.clienteId}
            >
              <option value="">
                {form.clienteId
                  ? "Selecciona vehículo"
                  : "Primero selecciona cliente"}
              </option>
              {vehiculosFiltrados.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa}
                </option>
              ))}
            </select>

            <select
              name="centroOperacionId"
              value={form.centroOperacionId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona centro</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              name="seccionId"
              value={form.seccionId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Selecciona sección</option>
              {secciones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>

            <select
              name="tipoOperacion"
              value={form.tipoOperacion}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="servicioVehiculo">Cobro a terceros</option>
              <option value="movimientoInterno">Movimiento interno</option>
            </select>

            <select
              name="tarifaId"
              value={form.tarifaId}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">
                {form.centroOperacionId ? "Selecciona tarifa" : "Primero selecciona centro"}
              </option>
              {tarifasFiltradasFormulario.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.codigo} - {t.descripcion} - $
                  {Number(t.valorUnitario).toLocaleString("es-CO")}
                </option>
              ))}
            </select>

            <select
              name="tipoCarpa"
              value={form.tipoCarpa}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Sin carpa adicional</option>
              {!form.centroOperacionId && (
                <option value="" disabled>
                  Primero selecciona centro
                </option>
              )}
              {form.centroOperacionId && opcionesCarpaFormulario.length === 0 && (
                <option value="" disabled>
                  No hay carpas configuradas para este centro
                </option>
              )}
              {opcionesCarpaFormulario.map((opcion) => (
                <option key={opcion.tarifa.id} value={opcion.etiqueta}>
                  {opcion.etiqueta} - ${opcion.valor.toLocaleString("es-CO")}
                </option>
              ))}
            </select>

            <select
              name="formaPago"
              value={form.formaPago}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="credito">Crédito</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>

            <label style={styles.checkboxRow}>
              <input
                name="reteIva"
                type="checkbox"
                checked={Boolean(form.reteIva)}
                onChange={handleChange}
              />
              <span>Aplica Retefuente 4%</span>
            </label>

            <input
              value={form.descripcion}
              placeholder="Descripción"
              readOnly
              style={styles.input}
            />

            <input
              value={form.valorUnitario}
              placeholder="Valor unitario"
              readOnly
              style={styles.input}
            />

            <input
              name="cantidad"
              type="number"
              placeholder="Cantidad"
              value={form.cantidad}
              onChange={handleChange}
              style={styles.input}
            />

            {form.tipoCarpa && (
              <div style={styles.preview}>
                Carpa adicional:{" "}
                <strong>
                  ${valorAdicionalCarpa.toLocaleString("es-CO")}
                </strong>
              </div>
            )}

            <div style={styles.preview}>
              <div style={styles.previewLine}>
                <span>Valor servicio sin IVA</span>
                <strong>${valorServicioPreview.toLocaleString("es-CO")}</strong>
              </div>
              <div style={styles.previewLine}>
                <span>Valor carpa sin IVA</span>
                <strong>${valorAdicionalCarpaSinIva.toLocaleString("es-CO")}</strong>
              </div>
              <div style={styles.previewLine}>
                <span>Subtotal</span>
                <strong>${baseAntesIvaPreview.toLocaleString("es-CO")}</strong>
              </div>
              <div style={styles.previewLine}>
                <span>Retefuente 4%</span>
                <strong>
                  {retefuentePreview > 0
                    ? `-$${retefuentePreview.toLocaleString("es-CO")}`
                    : "$0"}
                </strong>
              </div>
              <div style={styles.previewLine}>
                <span>IVA 19%</span>
                <strong>${ivaIncluidoPreview.toLocaleString("es-CO")}</strong>
              </div>
              <div style={styles.previewTotalLine}>
                <span>Total neto</span>
                <strong>${totalNetoPreview.toLocaleString("es-CO")}</strong>
              </div>
            </div>

            <button
              type="submit"
              style={styles.saveButton}
              disabled={saving || (editandoId ? !puedeEditar : !puedeCrear)}
            >
              {saving
                ? "Guardando..."
                : editandoId
                ? "Actualizar servicio"
                : "Guardar servicio"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={resetForm}
                style={styles.secondaryButton}
              >
                Cancelar edición
              </button>
            )}

            {mensaje && <p style={styles.message}>{mensaje}</p>}
          </form>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f2f2f2",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    color: "#111",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "34px",
    color: "#111",
  },
  roleText: {
    margin: "8px 0 0 0",
    color: "#374151",
    fontSize: "14px",
  },
  backLink: {
    textDecoration: "none",
    color: "#0b5cab",
    fontWeight: 700,
  },
  filtersCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "18px",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "14px",
    color: "#111",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr",
    gap: "12px",
  },
  dashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
    marginBottom: "18px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "18px",
  },
  statLabel: {
    color: "#555",
    fontSize: "14px",
    marginBottom: "8px",
  },
  statValue: {
    color: "#111",
    fontSize: "24px",
    fontWeight: 700,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
    alignItems: "start",
  },
  tableSection: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns:
      "0.9fr 1fr 1.1fr 0.8fr 0.9fr 1.6fr 1fr 0.9fr 1.7fr",
    gap: "10px",
    background: "#f5c400",
    padding: "14px",
    fontWeight: 700,
    color: "#111",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns:
      "0.9fr 1fr 1.1fr 0.8fr 0.9fr 1.6fr 1fr 0.9fr 1.7fr",
    gap: "10px",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    alignItems: "center",
    background: "#fff",
    color: "#111",
  },
  formCard: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "20px",
  },
  form: {
    display: "grid",
    gap: "12px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    width: "100%",
    background: "#fff",
    color: "#111",
  },
  preview: {
    background: "#f7f7f7",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "12px",
    color: "#111",
    display: "grid",
    gap: "8px",
  },
  previewLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "14px",
  },
  previewTotalLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    borderTop: "1px solid #ddd",
    paddingTop: "10px",
    fontSize: "16px",
    fontWeight: 900,
  },
  actions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  saveButton: {
    background: "#f5c400",
    color: "#111",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  excelButton: {
    background: "#1d6f42",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  pdfButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  editButton: {
    background: "#fff",
    color: "#111",
    border: "1px solid #bbb",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  whatsappButton: {
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f7f7f7",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "12px",
    color: "#111",
    fontWeight: 700,
  },
  gestionSection: {
    background: "#fff",
    border: "2px solid #111827",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "18px",
  },
  gestionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  gestionSubtitle: {
    margin: "4px 0 0",
    color: "#475569",
    fontSize: "13px",
  },
  gestionBody: {
    marginTop: "16px",
    display: "grid",
    gap: "14px",
  },
  gestionConfig: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px",
  },
  gestionConfigRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  gestionSearchRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
  },
  gestionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  gestionGridMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "14px",
  },
  gestionPanel: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
  },
  gestionPanelTitle: {
    margin: 0,
    padding: "12px",
    background: "#f1f5f9",
    fontSize: "15px",
  },
  gestionList: {
    display: "grid",
  },
  gestionRow: {
    display: "grid",
    gap: "8px",
    padding: "12px",
    borderTop: "1px solid #e5e7eb",
  },
  gestionActionRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
    alignItems: "center",
  },
  gestionNumberInput: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "9px",
    fontWeight: 700,
  },
  gestionHint: {
    marginTop: "3px",
    color: "#64748b",
    fontSize: "12px",
  },

  pageMobile: {
    padding: "14px",
  },
  topBarMobile: {
    flexDirection: "column",
    gap: "12px",
  },
  filtersGridMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
  },
  dashboardMobile: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "10px",
    marginBottom: "18px",
  },
  layoutMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "18px",
    alignItems: "start",
  },
  tableHeaderMobile: {
    display: "none",
  },
  mobileServiceCard: {
    background: "#fff",
    borderTop: "1px solid #eee",
    padding: "14px",
    display: "grid",
    gap: "12px",
  },
  mobileCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },
  mobileLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "3px",
  },
  mobileSupport: {
    color: "#111827",
    fontSize: "18px",
  },
  mobileInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  mobileDescription: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "10px",
  },
  mobileTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#111827",
    color: "#fff",
    borderRadius: "12px",
    padding: "12px",
    fontWeight: 900,
  },
  actionsMobile: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
  },
  pdfButtonMobile: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 10px",
    cursor: "pointer",
    fontWeight: 900,
  },
  editButtonMobile: {
    background: "#fff",
    color: "#111",
    border: "1px solid #bbb",
    borderRadius: "10px",
    padding: "12px 10px",
    cursor: "pointer",
    fontWeight: 900,
  },
  deleteButtonMobile: {
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 10px",
    cursor: "pointer",
    fontWeight: 900,
  },
  whatsappButtonMobile: {
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 10px",
    cursor: "pointer",
    fontWeight: 900,
  },
  noActions: {
    color: "#64748b",
    fontWeight: 700,
    fontSize: "13px",
  },
  infoBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: "8px",
    padding: "12px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  message: {
    margin: 0,
    fontWeight: 700,
    color: "#111",
  },
  empty: {
    padding: "18px",
    color: "#111",
  },
};