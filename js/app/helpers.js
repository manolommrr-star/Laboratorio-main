/*
 * Módulo de utilidades compartidas.
 *
 * Aquí se mantienen las funciones pequeñas y reutilizables para:
 * - formateo de moneda
 * - cálculo de edad
 * - normalización de texto
 * - helpers de validación y serialización
 *
 * Este archivo existe para mantener el código más legible y facilitar su
 * mantenimiento futuro sin mezclar lógica de negocio con funciones auxiliares.
 */

function moneda(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

function calcularEdad(fecha) {
    if (!fecha) return "";
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const diferenciaMeses = hoy.getMonth() - nacimiento.getMonth();

    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }

    return edad >= 0 ? edad : "";
}

function normalizarTexto(texto) {
    if (!texto) return "";
    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarTextoFormulario(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarValorPaciente(valor) {
    if (valor === null || valor === undefined) return "";
    return normalizarTexto(String(valor).trim());
}

function clavePaciente(paciente) {
    const nombre = normalizarValorPaciente(paciente?.nombre || "");
    const apellidoP = normalizarValorPaciente(paciente?.apellidoPaterno || "");
    const apellidoM = normalizarValorPaciente(paciente?.apellidoMaterno || "");
    const fecha = normalizarValorPaciente(paciente?.fechaNacimiento || "");
    const telefono = normalizarValorPaciente(paciente?.telefono || "");
    return `${nombre}|${apellidoP}|${apellidoM}|${fecha}|${telefono}`;
}
