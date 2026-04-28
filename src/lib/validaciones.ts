// ===============================
// LIMPIEZA DE TEXTO
// ===============================
export function limpiarTexto(valor: any): string {
  if (!valor) return "";
  return String(valor).trim();
}

// ===============================
// VALIDAR NÚMERO POSITIVO
// ===============================
export function validarNumeroPositivo(valor: any, campo: string): number {
  const numero = Number(valor);

  if (isNaN(numero) || numero <= 0) {
    throw new Error(`${campo} debe ser un número mayor a 0`);
  }

  return numero;
}

// ===============================
// VALIDAR TEXTO REQUERIDO
// ===============================
export function validarTextoRequerido(valor: any, campo: string): string {
  const texto = limpiarTexto(valor);

  if (!texto) {
    throw new Error(`${campo} es obligatorio`);
  }

  return texto;
}

// ===============================
// VALIDAR EMAIL
// ===============================
export function validarEmail(email: string): string {
  const limpio = limpiarTexto(email);

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(limpio)) {
    throw new Error("Correo inválido");
  }

  return limpio;
}

// ===============================
// VALIDAR FORMA DE PAGO
// ===============================
export function validarFormaPago(valor: string): string {
  const permitido = ["efectivo", "transferencia", "credito"];

  const limpio = limpiarTexto(valor).toLowerCase();

  if (!permitido.includes(limpio)) {
    throw new Error("Forma de pago inválida");
  }

  return limpio;
}

// ===============================
// VALIDAR PLACA
// ===============================
export function validarPlaca(placa: string): string {
  const limpio = limpiarTexto(placa).toUpperCase();

  if (limpio.length < 5) {
    throw new Error("Placa inválida");
  }

  return limpio;
}

// ===============================
// VALIDAR CC/NIT
// ===============================
export function validarCcNit(valor: any): string {
  const limpio = limpiarTexto(valor);

  if (!/^\d+$/.test(limpio)) {
    throw new Error("CC/NIT debe ser numérico");
  }

  return limpio;
}

// ===============================
// VALIDAR TELÉFONO
// ===============================
export function validarTelefono(valor: any): string {
  const limpio = limpiarTexto(valor);

  if (!/^\d{7,15}$/.test(limpio)) {
    throw new Error("Teléfono inválido");
  }

  return limpio;
}