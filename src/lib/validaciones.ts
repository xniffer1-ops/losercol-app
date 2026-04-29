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
  return limpio === "admin" || limpio === "operador";
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
  ].includes(limpio);
}

export function validarFormaPago(valor: string) {
  const limpio = limpiarTexto(valor).toLowerCase();
  return ["credito", "efectivo", "transferencia"].includes(limpio);
}

export function validarNumeroPositivo(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0;
}