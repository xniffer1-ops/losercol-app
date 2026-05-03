"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Cliente = {
  id: number;
  nombre: string;
  ccNit: string;
  telefono?: string;
  correo?: string;
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

type Seccion = {
  id: number;
  nombre: string;
};

type Tarifa = {
  id: number;
  codigo: string;
  descripcion: string;
  valorUnitario: number;
  unidadMedida?: string;
};

type MensajeTipo = "ok" | "error" | "info";
type AnyRecord = Record<string, unknown>;

type PostJsonResult = {
  ok: boolean;
  status: number;
  data: unknown;
  message: string;
};

const isRecord = (value: unknown): value is AnyRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const toStringSafe = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toNumberSafe = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getNestedArray = (record: AnyRecord): unknown[] => {
  const candidates = [record.data, record.items, record.results, record.rows];
  const found = candidates.find((candidate) => Array.isArray(candidate));
  return Array.isArray(found) ? found : [];
};

const extractArrayOfRecords = (value: unknown): AnyRecord[] => {
  if (Array.isArray(value)) return value.filter(isRecord);

  if (isRecord(value)) {
    return getNestedArray(value).filter(isRecord);
  }

  return [];
};

const extractSingleRecord = (value: unknown): AnyRecord | null => {
  if (Array.isArray(value)) return value.find(isRecord) ?? null;

  if (isRecord(value)) {
    if (isRecord(value.data)) return value.data;
    if (Array.isArray(value.data)) return value.data.find(isRecord) ?? null;
    if (isRecord(value.item)) return value.item;
    if (Array.isArray(value.items)) return value.items.find(isRecord) ?? null;
    return value;
  }

  return null;
};

const getErrorMessage = (value: unknown): string => {
  if (!isRecord(value)) return "";

  const candidates = [value.message, value.error, value.detail];
  const found = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0
  );

  return typeof found === "string" ? found : "";
};

const parseJsonSafe = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const fetchArraySafe = async <T,>(
  url: string,
  mapItem: (item: AnyRecord) => T | null
): Promise<T[]> => {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = await parseJsonSafe(response);

    if (!response.ok) return [];

    return extractArrayOfRecords(data)
      .map(mapItem)
      .filter((item): item is T => item !== null);
  } catch {
    return [];
  }
};

const postJsonSafe = async (
  url: string,
  body: unknown
): Promise<PostJsonResult> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await parseJsonSafe(response);

    return {
      ok: response.ok,
      status: response.status,
      data,
      message:
        getErrorMessage(data) ||
        (response.ok ? "" : `La solicitud falló con estado ${response.status}.`),
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      message: "No fue posible conectar con el servidor.",
    };
  }
};

const mapCliente = (item: AnyRecord): Cliente | null => {
  const id = toNumberSafe(item.id);
  const nombre = toStringSafe(item.nombre).trim();
  const ccNit = toStringSafe(item.ccNit ?? item.cc_nit ?? item.nit).trim();
  const telefono = toStringSafe(item.telefono ?? item.celular ?? item.phone).trim();
  const correo = toStringSafe(item.correo ?? item.email).trim();

  if (!id || !nombre) return null;

  return { id, nombre, ccNit, telefono, correo };
};

const mapVehiculo = (item: AnyRecord): Vehiculo | null => {
  const id = toNumberSafe(item.id);
  const placa = toStringSafe(item.placa).trim().toUpperCase();
  const clienteId = toNumberSafe(item.clienteId ?? item.cliente_id);

  if (!id || !placa) return null;

  return { id, placa, clienteId };
};

const mapCentro = (item: AnyRecord): Centro | null => {
  const id = toNumberSafe(item.id);
  const nombre = toStringSafe(item.nombre).trim();

  if (!id || !nombre) return null;

  return { id, nombre };
};

const mapSeccion = (item: AnyRecord): Seccion | null => {
  const id = toNumberSafe(item.id);
  const nombre = toStringSafe(item.nombre).trim();

  if (!id || !nombre) return null;

  return { id, nombre };
};

const mapTarifa = (item: AnyRecord): Tarifa | null => {
  const id = toNumberSafe(item.id);
  const codigo = toStringSafe(item.codigo).trim();
  const descripcion = toStringSafe(item.descripcion).trim();
  const valorUnitario = toNumberSafe(
    item.valorUnitario ?? item.valor_unitario ?? item.valor
  );
  const unidadMedida = toStringSafe(item.unidadMedida ?? item.unidad_medida ?? item.unidad).trim();

  if (!id || !descripcion) return null;

  return { id, codigo, descripcion, valorUnitario, unidadMedida };
};

const mapVehiculoFromResponse = (value: unknown): Vehiculo | null => {
  const record = extractSingleRecord(value);
  return record ? mapVehiculo(record) : null;
};

const mapClienteFromResponse = (value: unknown): Cliente | null => {
  const record = extractSingleRecord(value);
  return record ? mapCliente(record) : null;
};

const valorCarpa = (tipoCarpa: string) => {
  if (tipoCarpa === "Tracto Mula") return 46500;
  if (tipoCarpa === "Doble Troque") return 23150;
  if (tipoCarpa === "Sencillo") return 16950;
  return 0;
};

const tipoVehiculoDesdeCarpa = (tipoCarpa: string) => {
  if (tipoCarpa === "Tracto Mula") return "Tracto Mula";
  if (tipoCarpa === "Doble Troque") return "Doble Troque";
  if (tipoCarpa === "Sencillo") return "Sencillo";

  return "Sencillo";
};

type SoportePDFData = {
  numeroSoporte: string;
  fecha: Date;
  cliente: string;
  documento: string;
  telefono?: string;
  placa: string;
  centro: string;
  seccion: string;
  tarifaCodigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  valorUnitario: number;
  tipoCarpa: string;
  valorAdicionalCarpa: number;
  totalConIva: number;
  baseAntesIva: number;
  ivaIncluido: number;
  valorReteIva: number;
  totalNeto: number;
  facturaElectronica: boolean;
};

const formatoDinero = (valor: number) =>
  `$${Math.round(valor || 0).toLocaleString("es-CO")}`;

const obtenerSoloDigitos = (valor: string) => valor.replace(/\D/g, "");

const formatearCantidadKilos = (valor: string) => {
  const digitos = obtenerSoloDigitos(valor);

  if (!digitos) return "";

  return Number(digitos).toLocaleString("es-CO");
};

const convertirKilosAToneladas = (valor: string) => {
  const digitos = obtenerSoloDigitos(valor);

  if (!digitos) return 0;

  const kilos = Number(digitos);

  if (!Number.isFinite(kilos) || kilos <= 0) return 0;

  return kilos / 1000;
};

const formatearToneladas = (valor: number) => {
  return Number(valor || 0).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

const limpiarNombreArchivo = (valor: string) =>
  valor.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);

const normalizarTelefonoWhatsApp = (telefono?: string) => {
  const soloNumeros = String(telefono || "").replace(/\D/g, "");

  if (!soloNumeros || soloNumeros.length < 7) return "";

  if (soloNumeros.startsWith("57") && soloNumeros.length >= 12) {
    return soloNumeros;
  }

  if (soloNumeros.length === 10) {
    return `57${soloNumeros}`;
  }

  return soloNumeros;
};

const cargarImagenComoBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("No se pudo cargar la imagen");
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const descargarSoportePDF = async (soporte: SoportePDFData) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();

  try {
    const logoBase64 = await cargarImagenComoBase64("/logo-losercol.png");
    doc.addImage(logoBase64, "PNG", 14, 10, 52, 24);
  } catch (error) {
    console.warn("No se pudo cargar el logo en el PDF:", error);
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Soporte de servicio", 14, 42);
  doc.text(`No. ${soporte.numeroSoporte}`, 145, 42);

  doc.setDrawColor(30, 30, 30);
  doc.line(14, 47, 196, 47);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 14, 58);
  doc.text("Cliente:", 14, 66);
  doc.text("Documento:", 14, 74);
  doc.text("Factura electrónica:", 14, 82);

  doc.text("Vehículo:", 110, 66);
  doc.text("Centro:", 110, 74);
  doc.text("Sección:", 110, 82);

  doc.setFont("helvetica", "normal");
  doc.text(soporte.fecha.toLocaleDateString("es-CO"), 35, 58);
  doc.text(soporte.cliente || "-", 35, 66);
  doc.text(soporte.documento || "-", 40, 74);
  doc.text(soporte.facturaElectronica ? "Sí requiere" : "No requiere", 60, 82);

  doc.text(soporte.placa || "-", 132, 66);
  doc.text(soporte.centro || "-", 126, 74);
  doc.text(soporte.seccion || "-", 128, 82);

  autoTable(doc, {
    startY: 94,
    head: [
      [
        "Tarifa",
        "Carpa adicional",
        "Descripción",
        "Unidad",
        "Cantidad",
        "Valor unit.",
        "Total con IVA",
      ],
    ],
    body: [
      [
        soporte.tarifaCodigo || "",
        soporte.tipoCarpa || "Sin carpa",
        soporte.descripcion || "",
        soporte.unidad || "",
        formatearToneladas(soporte.cantidad),
        formatoDinero(soporte.valorUnitario),
        formatoDinero(soporte.totalConIva),
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

  const finalTablaY = (doc as unknown as { lastAutoTable?: { finalY?: number } })
    .lastAutoTable?.finalY || 116;

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
      ["Valor unitario con IVA", formatoDinero(soporte.valorUnitario)],
      ["Cantidad", formatearToneladas(soporte.cantidad)],
      ["Valor carpa con IVA", formatoDinero(soporte.valorAdicionalCarpa)],
      ["Total con IVA incluido", formatoDinero(soporte.totalConIva)],
      ["Base antes de IVA", formatoDinero(soporte.baseAntesIva)],
      ["IVA incluido 19%", formatoDinero(soporte.ivaIncluido)],
      [
        "ReteIVA 4%",
        soporte.valorReteIva > 0 ? `-${formatoDinero(soporte.valorReteIva)}` : "$0",
      ],
      ["Total neto", formatoDinero(soporte.totalNeto)],
    ],
    didParseCell: (data) => {
      if (data.row.index === 7) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11;
      }
    },
  });

  const finalResumenY = (doc as unknown as { lastAutoTable?: { finalY?: number } })
    .lastAutoTable?.finalY || finalTablaY + 52;

  const aviso =
    "Si desea solicitar la facturación electrónica envía un correo al: Auxfacturacion@losercol.com o al celular: 3147897436";

  const avisoY = Math.max(finalResumenY + 12, pageHeight - 34);

  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(14, avisoY, 182, 18, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const textoAviso = doc.splitTextToSize(aviso, 174);
  doc.text(textoAviso, 18, avisoY + 7);

  doc.save(`${limpiarNombreArchivo(soporte.numeroSoporte)}_${limpiarNombreArchivo(soporte.placa || "servicio")}.pdf`);
};

const abrirWhatsAppSoporte = (telefono: string | undefined, numeroSoporte: string) => {
  const telefonoWhatsApp = normalizarTelefonoWhatsApp(telefono);

  if (!telefonoWhatsApp) return false;

  const mensaje = `Hola, cordial saludo.\n\nAdjunto soporte de servicio LOSERCOL No. ${numeroSoporte}.\n\nGracias.`;
  const url = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};


export default function ServicioRapidoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);

  const [placa, setPlaca] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteFueManual, setClienteFueManual] = useState(false);
  const [vehiculoId, setVehiculoId] = useState("");
  const [centroOperacionId, setCentroOperacionId] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [tarifaId, setTarifaId] = useState("");
  const [busquedaTarifa, setBusquedaTarifa] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipoCarpa, setTipoCarpa] = useState("");
  const [formaPago, setFormaPago] = useState("credito");

  const [aplicaReteIva, setAplicaReteIva] = useState(false);
  const [facturaElectronica, setFacturaElectronica] = useState(false);

  const [crearClienteAbierto, setCrearClienteAbierto] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteDocumento, setNuevoClienteDocumento] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [nuevoClienteCorreo, setNuevoClienteCorreo] = useState("");

  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<MensajeTipo>("info");

  const placaRef = useRef<HTMLInputElement>(null);
  const cantidadRef = useRef<HTMLInputElement>(null);

  const mostrarMensaje = (texto: string, tipo: MensajeTipo) => {
    setMensaje(texto);
    setMensajeTipo(tipo);
  };

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);

    const [clientesData, vehiculosData, centrosData, seccionesData, tarifasData] =
      await Promise.all([
        fetchArraySafe<Cliente>("/api/clientes", mapCliente),
        fetchArraySafe<Vehiculo>("/api/vehiculos", mapVehiculo),
        fetchArraySafe<Centro>("/api/centros", mapCentro),
        fetchArraySafe<Seccion>("/api/secciones", mapSeccion),
        fetchArraySafe<Tarifa>("/api/tarifas", mapTarifa),
      ]);

    setClientes(clientesData);
    setVehiculos(vehiculosData);
    setCentros(centrosData);
    setSecciones(seccionesData);
    setTarifas(tarifasData);

    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    placaRef.current?.focus();
  }, []);

  const placaNormalizada = useMemo(() => placa.trim().toUpperCase(), [placa]);

  const vehiculoEncontrado = useMemo(() => {
    if (!placaNormalizada) return null;

    return (
      vehiculos.find(
        (vehiculo) => vehiculo.placa.toUpperCase() === placaNormalizada
      ) ?? null
    );
  }, [placaNormalizada, vehiculos]);

  const clienteSugerido = useMemo(() => {
    if (!vehiculoEncontrado) return null;

    return (
      clientes.find((cliente) => cliente.id === vehiculoEncontrado.clienteId) ??
      null
    );
  }, [clientes, vehiculoEncontrado]);

  const clienteSeleccionado = useMemo(() => {
    return clientes.find((cliente) => cliente.id === Number(clienteId)) ?? null;
  }, [clienteId, clientes]);

  const centroSeleccionado = useMemo(() => {
    return centros.find((centro) => centro.id === Number(centroOperacionId)) ?? null;
  }, [centroOperacionId, centros]);

  const seccionSeleccionada = useMemo(() => {
    return secciones.find((seccion) => seccion.id === Number(seccionId)) ?? null;
  }, [seccionId, secciones]);

  useEffect(() => {
    if (!placaNormalizada) {
      setVehiculoId("");

      if (!clienteFueManual) {
        setClienteId("");
      }

      return;
    }

    if (vehiculoEncontrado) {
      const sugeridoId = String(vehiculoEncontrado.clienteId);
      setVehiculoId(String(vehiculoEncontrado.id));

      if (!clienteFueManual) {
        setClienteId(sugeridoId);
      }

      return;
    }

    setVehiculoId("");

    if (!clienteFueManual) {
      setClienteId("");
    }
  }, [placaNormalizada, vehiculoEncontrado, clienteFueManual]);

  const tarifaSeleccionada = useMemo(() => {
    return tarifas.find((tarifa) => tarifa.id === Number(tarifaId)) ?? null;
  }, [tarifaId, tarifas]);

  const tarifasFiltradas = useMemo(() => {
    const texto = busquedaTarifa.trim().toLowerCase();

    if (!texto) return tarifas;

    return tarifas.filter((tarifa) => {
      const combinado = `${tarifa.codigo} - ${tarifa.descripcion}`.toLowerCase();

      return (
        tarifa.codigo.toLowerCase().includes(texto) ||
        tarifa.descripcion.toLowerCase().includes(texto) ||
        combinado.includes(texto)
      );
    });
  }, [busquedaTarifa, tarifas]);

  useEffect(() => {
    const texto = busquedaTarifa.trim().toLowerCase();

    if (!texto) return;

    const tarifaExacta = tarifas.find((tarifa) => {
      const codigo = tarifa.codigo.toLowerCase();
      const descripcion = tarifa.descripcion.toLowerCase();
      const combinado = `${tarifa.codigo} - ${tarifa.descripcion}`.toLowerCase();

      return texto === codigo || texto === descripcion || texto === combinado;
    });

    const tarifaUnica =
      tarifasFiltradas.length === 1 ? tarifasFiltradas[0] : null;

    const tarifaParaSeleccionar = tarifaExacta ?? tarifaUnica;

    if (
      tarifaParaSeleccionar &&
      tarifaId !== String(tarifaParaSeleccionar.id)
    ) {
      setTarifaId(String(tarifaParaSeleccionar.id));
    }
  }, [busquedaTarifa, tarifas, tarifasFiltradas, tarifaId]);

  const cantidadNumero = convertirKilosAToneladas(cantidad);

  const valorServicio = (tarifaSeleccionada?.valorUnitario ?? 0) * cantidadNumero;

  const IVA_PORCENTAJE = 0.19;
  const RETEIVA_PORCENTAJE = 0.04;

  const redondearPesos = (valor: number) => Math.round(valor);

  const valorAdicionalCarpa = redondearPesos(valorCarpa(tipoCarpa));

  // La tarifa y la carpa YA tienen IVA incluido.
  const subtotalBruto = redondearPesos(valorServicio + valorAdicionalCarpa);

  // Base antes de IVA.
  const baseAntesIva = redondearPesos(subtotalBruto / (1 + IVA_PORCENTAJE));

  // IVA incluido dentro del subtotal.
  const ivaIncluido = redondearPesos(subtotalBruto - baseAntesIva);

  // ReteIVA sobre la base antes de IVA.
  const valorReteIva = aplicaReteIva
    ? redondearPesos(baseAntesIva * RETEIVA_PORCENTAJE)
    : 0;

  const totalNeto = redondearPesos(subtotalBruto - valorReteIva);

  const limpiarFormulario = () => {
    setPlaca("");
    setClienteId("");
    setClienteFueManual(false);
    setVehiculoId("");
    setTarifaId("");
    setBusquedaTarifa("");
    setCantidad("");
    setTipoCarpa("");
    setFormaPago("credito");
    setAplicaReteIva(false);
    setFacturaElectronica(false);
    setMensaje("");
    setMensajeTipo("info");
    placaRef.current?.focus();
  };

  const crearClienteRapido = async () => {
    setMensaje("");

    const nombre = nuevoClienteNombre.trim();
    const documento = nuevoClienteDocumento.trim();
    const telefono = nuevoClienteTelefono.trim();
    const correo = nuevoClienteCorreo.trim();

    if (!nombre || !documento) {
      mostrarMensaje(
        "Para crear cliente rápido, nombre y documento son obligatorios.",
        "error"
      );
      return;
    }

    setCreandoCliente(true);

    const respuesta = await postJsonSafe("/api/clientes", {
      nombre,
      ccNit: documento,
      telefono: telefono || "No registrado",
      correo: correo || "sin-correo@losercol.com",
      formaPago: formaPago || "credito",
    });

    if (!respuesta.ok) {
      mostrarMensaje(
        respuesta.message || "No fue posible crear el cliente.",
        "error"
      );
      setCreandoCliente(false);
      return;
    }

    let clienteCreado = mapClienteFromResponse(respuesta.data);

    if (!clienteCreado) {
      const clientesActualizados = await fetchArraySafe<Cliente>(
        "/api/clientes",
        mapCliente
      );

      setClientes(clientesActualizados);

      clienteCreado =
        clientesActualizados.find((cliente) => cliente.ccNit === documento) ??
        null;
    }

    if (!clienteCreado) {
      mostrarMensaje(
        "Cliente creado, pero no pude seleccionarlo automáticamente. Recarga la página si no aparece.",
        "info"
      );
      setCreandoCliente(false);
      setCrearClienteAbierto(false);
      return;
    }

    setClientes((prev) => {
      const existe = prev.some((cliente) => cliente.id === clienteCreado.id);
      return existe ? prev : [clienteCreado, ...prev];
    });

    setClienteId(String(clienteCreado.id));
    setClienteFueManual(true);
    setNuevoClienteNombre("");
    setNuevoClienteDocumento("");
    setNuevoClienteTelefono("");
    setNuevoClienteCorreo("");
    setCrearClienteAbierto(false);
    setCreandoCliente(false);

    mostrarMensaje("Cliente creado y seleccionado correctamente.", "ok");
  };

  const guardar = async () => {
    setMensaje("");

    if (!placaNormalizada) {
      mostrarMensaje("La placa es obligatoria.", "error");
      placaRef.current?.focus();
      return;
    }

    if (!clienteId) {
      mostrarMensaje("Selecciona un cliente o créalo rápido.", "error");
      return;
    }

    if (!centroOperacionId) {
      mostrarMensaje("Selecciona un centro de operación.", "error");
      return;
    }

    if (!seccionId) {
      mostrarMensaje("Selecciona una sección.", "error");
      return;
    }

    if (!tarifaId) {
      mostrarMensaje("Selecciona una tarifa.", "error");
      return;
    }

    if (!cantidad || cantidadNumero <= 0) {
      mostrarMensaje("La cantidad en kilos debe ser mayor que cero.", "error");
      cantidadRef.current?.focus();
      return;
    }

    setGuardando(true);

    let vehiculoFinalId = vehiculoId;

    if (!vehiculoFinalId) {
      const respuestaVehiculo = await postJsonSafe("/api/vehiculos", {
        placa: placaNormalizada,
        clienteId: Number(clienteId),
        tipoVehiculo: tipoVehiculoDesdeCarpa(tipoCarpa),
      });

      if (!respuestaVehiculo.ok) {
        mostrarMensaje(
          respuestaVehiculo.message || "No fue posible crear el vehículo.",
          "error"
        );
        setGuardando(false);
        return;
      }

      const nuevoVehiculo = mapVehiculoFromResponse(respuestaVehiculo.data);

      if (!nuevoVehiculo || !nuevoVehiculo.id) {
        mostrarMensaje(
          "El vehículo se intentó crear, pero la respuesta no devolvió un id válido.",
          "error"
        );
        setGuardando(false);
        return;
      }

      const vehiculoNormalizado: Vehiculo = {
        ...nuevoVehiculo,
        placa: nuevoVehiculo.placa || placaNormalizada,
        clienteId: nuevoVehiculo.clienteId || Number(clienteId),
      };

      vehiculoFinalId = String(vehiculoNormalizado.id);
      setVehiculoId(vehiculoFinalId);

      setVehiculos((prev) => {
        const yaExiste = prev.some(
          (vehiculo) => vehiculo.id === vehiculoNormalizado.id
        );
        return yaExiste ? prev : [vehiculoNormalizado, ...prev];
      });
    }

    const respuestaServicio = await postJsonSafe("/api/servicios", {
      clienteId: Number(clienteId),
      vehiculoId: Number(vehiculoFinalId),
      centroOperacionId: Number(centroOperacionId),
      seccionId: Number(seccionId),
      tarifaId: Number(tarifaId),
      cantidad: cantidadNumero,
      tipoCarpa: tipoCarpa.trim() || null,
      formaPago,
      reteIva: aplicaReteIva,
      facturaElectronica,
    });

    if (!respuestaServicio.ok) {
      mostrarMensaje(
        respuestaServicio.message || "Ocurrió un error al guardar el servicio.",
        "error"
      );
      setGuardando(false);
      return;
    }

    const servicioCreado = extractSingleRecord(respuestaServicio.data);
    const numeroSoporte =
      toStringSafe(servicioCreado?.numeroSoporte).trim() ||
      `SP-${String(toNumberSafe(servicioCreado?.id)).padStart(6, "0")}`;

    const soportePDF: SoportePDFData = {
      numeroSoporte,
      fecha: new Date(),
      cliente: clienteSeleccionado?.nombre || "-",
      documento: clienteSeleccionado?.ccNit || "-",
      telefono: clienteSeleccionado?.telefono,
      placa: placaNormalizada,
      centro: centroSeleccionado?.nombre || "-",
      seccion: seccionSeleccionada?.nombre || "-",
      tarifaCodigo: tarifaSeleccionada?.codigo || "",
      descripcion: tarifaSeleccionada?.descripcion || "",
      unidad: tarifaSeleccionada?.unidadMedida || "Tonelada",
      cantidad: cantidadNumero,
      valorUnitario: tarifaSeleccionada?.valorUnitario || 0,
      tipoCarpa: tipoCarpa || "Sin carpa",
      valorAdicionalCarpa,
      totalConIva: subtotalBruto,
      baseAntesIva,
      ivaIncluido,
      valorReteIva,
      totalNeto,
      facturaElectronica,
    };

    try {
      await descargarSoportePDF(soportePDF);
    } catch (error) {
      console.error("Error descargando soporte PDF:", error);
    }

    const whatsappAbierto = abrirWhatsAppSoporte(
      clienteSeleccionado?.telefono,
      numeroSoporte
    );

    mostrarMensaje(
      whatsappAbierto
        ? "Servicio guardado. Se descargó el soporte y se abrió WhatsApp con el mensaje listo."
        : "Servicio guardado. Se descargó el soporte, pero este cliente no tiene teléfono válido para WhatsApp.",
      whatsappAbierto ? "ok" : "info"
    );
    setGuardando(false);

    setPlaca("");
    setClienteId("");
    setClienteFueManual(false);
    setVehiculoId("");
    setTarifaId("");
    setBusquedaTarifa("");
    setCantidad("");
    setTipoCarpa("");
    setFormaPago("credito");
    setAplicaReteIva(false);
    setFacturaElectronica(false);
    placaRef.current?.focus();
  };

  const seleccionarTarifa = (tarifa: Tarifa) => {
    setTarifaId(String(tarifa.id));
    setBusquedaTarifa(`${tarifa.codigo} - ${tarifa.descripcion}`.trim());
    cantidadRef.current?.focus();
  };

  const mensajeStyle =
    mensajeTipo === "error"
      ? styles.messageError
      : mensajeTipo === "ok"
      ? styles.messageOk
      : styles.messageInfo;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.compactTop}>
          <Link href="/" style={styles.backMiniButton}>
            ← Volver al menú
          </Link>
        </div>

        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void guardar();
          }}
        >
          <div style={styles.grid}>
            <div style={styles.field}>
              <label htmlFor="placa" style={styles.label}>
                Placa *
              </label>

              <input
                id="placa"
                ref={placaRef}
                value={placa}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setPlaca(event.target.value.toUpperCase())
                }
                placeholder="ABC123"
                autoComplete="off"
                style={styles.input}
              />

              <small style={styles.helper}>
                {vehiculoEncontrado
                  ? `Vehículo encontrado. Cliente sugerido: ${
                      clienteSugerido?.nombre || "sin nombre"
                    }.`
                  : placaNormalizada
                  ? "Placa nueva: se creará el vehículo al guardar."
                  : "Escribe la placa para buscar el vehículo."}
              </small>
            </div>

            <div style={styles.field}>
              <label htmlFor="cliente" style={styles.label}>
                Cliente *
              </label>

              <select
                id="cliente"
                value={clienteId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  setClienteId(event.target.value);
                  setClienteFueManual(true);
                }}
                style={styles.select}
              >
                <option value="">Selecciona cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                    {cliente.ccNit ? ` - ${cliente.ccNit}` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCrearClienteAbierto((prev) => !prev)}
                style={styles.quickLink}
              >
                {crearClienteAbierto
                  ? "Cerrar creación rápida"
                  : "+ Crear cliente rápido"}
              </button>

              <small style={styles.helper}>
                {clienteSugerido
                  ? clienteId && Number(clienteId) !== clienteSugerido.id
                    ? `Sugerido por placa: ${clienteSugerido.nombre}. Puedes dejar el cliente actual.`
                    : `Sugerido por placa: ${clienteSugerido.nombre}.`
                  : "Puedes escoger cualquier cliente para este servicio."}
              </small>
            </div>

            <div style={styles.field}>
              <label htmlFor="centro" style={styles.label}>
                Centro *
              </label>

              <select
                id="centro"
                value={centroOperacionId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setCentroOperacionId(event.target.value)
                }
                style={styles.select}
              >
                <option value="">Selecciona centro</option>
                {centros.map((centro) => (
                  <option key={centro.id} value={centro.id}>
                    {centro.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label htmlFor="seccion" style={styles.label}>
                Sección *
              </label>

              <select
                id="seccion"
                value={seccionId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setSeccionId(event.target.value)
                }
                style={styles.select}
              >
                <option value="">Selecciona sección</option>
                {secciones.map((seccion) => (
                  <option key={seccion.id} value={seccion.id}>
                    {seccion.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {crearClienteAbierto && (
            <div style={styles.quickCreateBox}>
              <h3 style={styles.quickTitle}>Crear cliente rápido</h3>

              <div style={styles.gridQuick}>
                <input
                  value={nuevoClienteNombre}
                  onChange={(event) => setNuevoClienteNombre(event.target.value)}
                  placeholder="Nombre del cliente"
                  style={styles.input}
                />

                <input
                  value={nuevoClienteDocumento}
                  onChange={(event) =>
                    setNuevoClienteDocumento(event.target.value)
                  }
                  placeholder="Documento / NIT"
                  style={styles.input}
                />

                <input
                  value={nuevoClienteTelefono}
                  onChange={(event) =>
                    setNuevoClienteTelefono(event.target.value)
                  }
                  placeholder="Teléfono opcional"
                  style={styles.input}
                />

                <input
                  value={nuevoClienteCorreo}
                  onChange={(event) => setNuevoClienteCorreo(event.target.value)}
                  placeholder="Correo opcional"
                  style={styles.input}
                />
              </div>

              <button
                type="button"
                disabled={creandoCliente}
                onClick={() => void crearClienteRapido()}
                style={
                  creandoCliente ? styles.smallButtonDisabled : styles.smallButton
                }
              >
                {creandoCliente ? "Creando..." : "Crear y seleccionar cliente"}
              </button>
            </div>
          )}

          <div style={styles.searchBlock}>
            <label htmlFor="tarifa-busqueda" style={styles.label}>
              Buscar tarifa *
            </label>

            <input
              id="tarifa-busqueda"
              value={busquedaTarifa}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setBusquedaTarifa(event.target.value);
                setTarifaId("");
              }}
              placeholder="Código o descripción"
              autoComplete="off"
              style={styles.input}
            />
          </div>

          <div style={styles.tarifasWrap}>
            {tarifasFiltradas.slice(0, 12).map((tarifa) => {
              const seleccionada = tarifaId === String(tarifa.id);

              return (
                <button
                  key={tarifa.id}
                  type="button"
                  onClick={() => seleccionarTarifa(tarifa)}
                  style={
                    seleccionada
                      ? { ...styles.tarifaCard, ...styles.tarifaCardSelected }
                      : styles.tarifaCard
                  }
                >
                  <span style={styles.tarifaCodigo}>
                    {tarifa.codigo || "SIN CÓDIGO"}
                  </span>
                  <span style={styles.tarifaDescripcion}>
                    {tarifa.descripcion}
                  </span>
                  <span style={styles.tarifaValor}>
                    ${tarifa.valorUnitario.toLocaleString("es-CO")}
                  </span>
                </button>
              );
            })}

            {!tarifasFiltradas.length && (
              <div style={styles.emptyState}>
                No se encontraron tarifas con ese criterio.
              </div>
            )}
          </div>

          <div style={styles.gridSecondary}>
            <div style={styles.field}>
              <label htmlFor="cantidad" style={styles.label}>
                Cantidad en kilos *
              </label>

              <input
                id="cantidad"
                ref={cantidadRef}
                type="text"
                inputMode="numeric"
                value={cantidad}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const valor = event.target.value.replace(/[^0-9.,]/g, "");
                  setCantidad(valor);
                }}
                onBlur={() => setCantidad((prev) => formatearCantidadKilos(prev))}
                placeholder="34.000"
                autoComplete="off"
                style={styles.input}
              />

              <small style={styles.helper}>
                Escribe kilos: 34000 o 34.000 se calculan como 34 toneladas.
              </small>
            </div>

            <div style={styles.field}>
              <label htmlFor="tipoCarpa" style={styles.label}>
                Tipo de carpa
              </label>

              <select
                id="tipoCarpa"
                value={tipoCarpa}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setTipoCarpa(event.target.value)
                }
                style={styles.select}
              >
                <option value="">Sin carpa / no aplica</option>
                <option value="Tracto Mula">Carpa de tractomula</option>
                <option value="Sencillo">Carpa de sencillo</option>
                <option value="Doble Troque">Carpa de doble troque</option>
              </select>
            </div>

            <div style={styles.field}>
              <label htmlFor="formaPago" style={styles.label}>
                Forma de pago
              </label>

              <select
                id="formaPago"
                value={formaPago}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setFormaPago(event.target.value)
                }
                style={styles.select}
              >
                <option value="credito">Crédito</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          <div style={styles.fastOptionsGrid}>
            <div style={styles.toggleCard}>
              <span style={styles.toggleTitle}>ReteIVA 4%</span>

              <div style={styles.toggleGroup}>
                <button
                  type="button"
                  onClick={() => setAplicaReteIva(false)}
                  style={
                    !aplicaReteIva
                      ? { ...styles.toggleButton, ...styles.toggleButtonActive }
                      : styles.toggleButton
                  }
                >
                  No
                </button>

                <button
                  type="button"
                  onClick={() => setAplicaReteIva(true)}
                  style={
                    aplicaReteIva
                      ? { ...styles.toggleButton, ...styles.toggleButtonActive }
                      : styles.toggleButton
                  }
                >
                  Sí
                </button>
              </div>
            </div>

            <div style={styles.toggleCard}>
              <span style={styles.toggleTitle}>Factura electrónica</span>

              <div style={styles.toggleGroup}>
                <button
                  type="button"
                  onClick={() => setFacturaElectronica(false)}
                  style={
                    !facturaElectronica
                      ? { ...styles.toggleButton, ...styles.toggleButtonActive }
                      : styles.toggleButton
                  }
                >
                  No
                </button>

                <button
                  type="button"
                  onClick={() => setFacturaElectronica(true)}
                  style={
                    facturaElectronica
                      ? { ...styles.toggleButton, ...styles.toggleButtonActive }
                      : styles.toggleButton
                  }
                >
                  Sí
                </button>
              </div>
            </div>
          </div>

          <div style={styles.summaryBox}>
            <div style={styles.summaryHeader}>
              <span style={styles.summaryHeaderTitle}>Resumen para cobrar</span>
              <span style={styles.summaryHeaderBadge}>
                {formaPago === "credito"
                  ? "Crédito"
                  : formaPago === "efectivo"
                  ? "Efectivo"
                  : "Transferencia"}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Servicio</span>
              <span style={styles.summaryValue}>
                {tarifaSeleccionada
                  ? `${tarifaSeleccionada.codigo} - ${tarifaSeleccionada.descripcion}`
                  : "Aún no has seleccionado una tarifa"}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Valor unitario</span>
              <span style={styles.summaryValue}>
                {formatoDinero(tarifaSeleccionada?.valorUnitario || 0)}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Cantidad calculada</span>
              <span style={styles.summaryValue}>
                {formatearToneladas(cantidadNumero)}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Valor servicio</span>
              <span style={styles.summaryValue}>
                {formatoDinero(valorServicio)}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Valor carpa</span>
              <span style={styles.summaryValue}>
                {formatoDinero(valorAdicionalCarpa)}
              </span>
            </div>

            <div style={styles.summaryDivider} />

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Subtotal con IVA incluido</span>
              <span style={styles.summaryValueStrong}>
                {formatoDinero(subtotalBruto)}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>ReteIVA 4%</span>
              <span style={styles.summaryValue}>
                {valorReteIva > 0 ? `- ${formatoDinero(valorReteIva)}` : "$0"}
              </span>
            </div>

            <div style={styles.summaryTotalRow}>
              <span style={styles.summaryTotalLabel}>Total a cobrar</span>
              <span style={styles.summaryTotalValue}>
                {formatoDinero(totalNeto)}
              </span>
            </div>

            <div style={styles.summaryDivider} />

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Base antes de IVA</span>
              <span style={styles.summaryValue}>
                {formatoDinero(baseAntesIva)}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>IVA incluido 19%</span>
              <span style={styles.summaryValue}>
                {formatoDinero(ivaIncluido)}
              </span>
            </div>

            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Factura electrónica</span>
              <span style={styles.summaryValue}>
                {facturaElectronica ? "Sí requiere" : "No requiere"}
              </span>
            </div>
          </div>

          {cargandoDatos && (
            <div style={styles.messageInfo}>Cargando catálogos...</div>
          )}

          {!!mensaje && (
            <div role="status" aria-live="polite" style={mensajeStyle}>
              {mensaje}
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={limpiarFormulario}
              disabled={guardando}
              style={styles.secondaryButton}
            >
              Limpiar
            </button>

            <button
              type="submit"
              disabled={guardando || cargandoDatos}
              style={
                guardando || cargandoDatos
                  ? styles.primaryButtonDisabled
                  : styles.primaryButton
              }
            >
              {guardando ? "Guardando..." : "Guardar servicio"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: "1100px",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "clamp(18px, 3vw, 28px)",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
    border: "1px solid #e5e7eb",
  },
  compactTop: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: "18px",
  },
  backMiniButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "38px",
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid #d7dce4",
    background: "#ffffff",
    color: "#0f5fb8",
    fontSize: "13px",
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fff7cc",
    color: "#7c5c00",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(28px, 5vw, 38px)",
    lineHeight: 1.1,
    color: "#0f172a",
  },
  totalPanel: {
    minWidth: "220px",
    background: "#0f172a",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: "1 1 220px",
    maxWidth: "320px",
  },
  totalLabel: {
    fontSize: "13px",
    opacity: 0.8,
  },
  totalValue: {
    fontSize: "30px",
    lineHeight: 1.1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  gridSecondary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginTop: "18px",
  },
  gridQuick: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "10px",
  },
  fastOptionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
    marginTop: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1e293b",
  },
  helper: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.45,
  },
  input: {
    width: "100%",
    minHeight: "52px",
    border: "1px solid #d7dce4",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "16px",
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    minHeight: "52px",
    border: "1px solid #d7dce4",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "16px",
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  },
  quickLink: {
    width: "fit-content",
    border: "none",
    background: "transparent",
    color: "#0f5fb8",
    fontWeight: 800,
    padding: 0,
    cursor: "pointer",
    fontSize: "13px",
  },
  quickCreateBox: {
    marginTop: "16px",
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    borderRadius: "16px",
    padding: "14px",
  },
  quickTitle: {
    margin: "0 0 12px",
    color: "#0f172a",
    fontSize: "16px",
  },
  searchBlock: {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  tarifasWrap: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  tarifaCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "12px 14px",
    minWidth: "220px",
    flex: "1 1 220px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    cursor: "pointer",
    textAlign: "left",
  },
  tarifaCardSelected: {
    border: "1px solid #facc15",
    boxShadow: "0 0 0 3px rgba(250, 204, 21, 0.25)",
    background: "#fffdf1",
  },
  tarifaCodigo: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#92400e",
    textTransform: "uppercase",
  },
  tarifaDescripcion: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.4,
  },
  tarifaValor: {
    fontSize: "13px",
    color: "#475569",
  },
  emptyState: {
    width: "100%",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "14px",
    color: "#64748b",
    background: "#f8fafc",
  },
  toggleCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "14px",
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  toggleTitle: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#0f172a",
  },
  toggleGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  toggleButton: {
    flex: "1 1 90px",
    minHeight: "44px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
    padding: "10px 14px",
  },
  toggleButtonActive: {
    background: "#0f172a",
    color: "#ffffff",
    border: "1px solid #0f172a",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)",
  },
  summaryBox: {
    marginTop: "20px",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  summaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "4px",
  },
  summaryHeaderTitle: {
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: 900,
  },
  summaryHeaderBadge: {
    background: "#0f172a",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 900,
  },
  summaryDivider: {
    height: "1px",
    background: "#e2e8f0",
    margin: "2px 0",
  },
  summaryTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    borderRadius: "14px",
    background: "#0f172a",
    color: "#ffffff",
    padding: "14px 16px",
    marginTop: "2px",
  },
  summaryTotalLabel: {
    fontSize: "16px",
    fontWeight: 900,
  },
  summaryTotalValue: {
    fontSize: "24px",
    fontWeight: 900,
    textAlign: "right",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: "14px",
  },
  summaryValue: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 600,
    textAlign: "right",
  },
  summaryValueStrong: {
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 900,
    textAlign: "right",
  },
  messageInfo: {
    marginTop: "18px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
  },
  messageOk: {
    marginTop: "18px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
  },
  messageError: {
    marginTop: "18px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
  },
  actions: {
    marginTop: "22px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    flexWrap: "wrap",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    padding: "14px 18px",
    borderRadius: "12px",
    fontWeight: 800,
    cursor: "pointer",
    minWidth: "120px",
  },
  primaryButton: {
    border: "none",
    background: "#facc15",
    color: "#111827",
    padding: "14px 22px",
    borderRadius: "12px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(250, 204, 21, 0.25)",
    minWidth: "200px",
  },
  primaryButtonDisabled: {
    border: "none",
    background: "#fde68a",
    color: "#52525b",
    padding: "14px 22px",
    borderRadius: "12px",
    fontWeight: 900,
    cursor: "not-allowed",
    minWidth: "200px",
  },
  smallButton: {
    marginTop: "12px",
    border: "none",
    background: "#0f172a",
    color: "#ffffff",
    padding: "12px 14px",
    borderRadius: "12px",
    fontWeight: 800,
    cursor: "pointer",
  },
  smallButtonDisabled: {
    marginTop: "12px",
    border: "none",
    background: "#94a3b8",
    color: "#ffffff",
    padding: "12px 14px",
    borderRadius: "12px",
    fontWeight: 800,
    cursor: "not-allowed",
  },
};