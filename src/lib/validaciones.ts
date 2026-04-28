export function limpiarTexto(valor: unknown) {
  return String(valor || "").trim();
}

export function limpiarPlaca(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validarCcNit(valor: string) {
  return /^[A-Za-z0-9.-]{4,20}$/.test(valor);
}

export function validarTelefono(valor: string) {
  return /^[0-9+\-\s]{7,20}$/.test(valor);
}

export function validarRol(valor: string) {
  return valor === "admin" || valor === "operador";
}

export function validarTipoVehiculo(valor: string) {
  return ["TM", "DT", "SC", "TB"].includes(valor);
}

export function validarFormaPago(valor: string) {
  return ["credito", "efectivo", "transferencia"].includes(valor);
}