export function limpiarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

export function limpiarPlaca(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function validarEmail(email: string) {
  const limpio = limpiarTexto(email).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio);
}

export function validarCcNit(valor: string) {
  const limpio = limpiarTexto(valor);
  return /^[A-Za-z0-9.-]{4,30}$/.test(limpio);
}

export function validarTelefono(valor: string) {
  const limpio = limpiarTexto(valor);
  return /^[0-9+\-\s]{7,20}$/.test(limpio);
}

export function validarRol(valor: string) {
  const limpio = limpiarTexto(valor).toLowerCase();
  return limpio === "admin" || limpio === "operador" || limpio === "superadmin";
}

export function validarTipoVehiculo(valor: string) {
  const limpio = limpiarTexto(valor);
  return [
    "TM",
    "DT",
    "SC",
    "TB",
    "Tracto Mula",
    "Doble Troque",
    "Sencillo",
    "Turbo",
    "Movimiento interno",
  ].includes(limpio);
}

export function normalizarFormaPago(valor: unknown) {
  const limpio = limpiarTexto(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "");

  if (limpio === "credito") return "credito";
  if (limpio === "efectivo") return "efectivo";
  if (limpio === "transferencia") return "transferencia";
  if (limpio === "no_aplica" || limpio === "no aplica" || limpio === "n/a") {
    return "no_aplica";
  }

  return limpio || "no_aplica";
}

export function validarFormaPago(valor: string) {
  const limpio = normalizarFormaPago(valor);
  return ["credito", "efectivo", "transferencia", "no_aplica"].includes(limpio);
}

export function validarNumeroPositivo(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0;
}
