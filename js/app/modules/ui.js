/**
 * Módulo de UI / tablero
 * ----------------------
 * Esta capa encapsula las funciones visuales del tablero y la estructura del
 * flujo principal de recepción, sin mezclar la lógica de negocio con el render.
 */

window.LaboratorioModules = window.LaboratorioModules || {};
window.LaboratorioModules.ui = window.LaboratorioModules.ui || {};

window.LaboratorioModules.ui.renderizarTablero = function renderizarTablero() {
    const porCapturarContenedor = document.querySelector(".capture-panel .orders-list");
    const porEntregarContenedor = document.querySelector(".delivery-panel .orders-list");

    if (!porCapturarContenedor || !porEntregarContenedor) return;

    porCapturarContenedor.innerHTML = "";
    porEntregarContenedor.innerHTML = "";

    const ordenesPorCapturar = Array.isArray(ordenes)
        ? ordenes.filter((o) => normalizarEstadoOrden(o?.estado) === ESTADOS_ORDEN.POR_CAPTURAR)
        : [];
    const ordenesPorEntregar = Array.isArray(ordenes)
        ? ordenes.filter((o) => normalizarEstadoOrden(o?.estado) === ESTADOS_ORDEN.POR_ENTREGAR)
        : [];

    ordenesPorCapturar.forEach((orden) => {
        try {
            porCapturarContenedor.insertAdjacentHTML("beforeend", crearTarjetaOrden(orden));
        } catch (error) {
            console.warn("No se pudo renderizar una tarjeta de orden por capturar:", error, orden);
        }
    });

    ordenesPorEntregar.forEach((orden) => {
        try {
            const tarjeta = document.createElement("div");
            tarjeta.innerHTML = crearTarjetaOrden(orden);
            const tarjetaElement = tarjeta.firstElementChild;
            if (tarjetaElement) porEntregarContenedor.appendChild(tarjetaElement);
        } catch (error) {
            console.warn("No se pudo renderizar una tarjeta de orden por entregar:", error, orden);
        }
    });

    const badgeCaptura = document.querySelector(".capture-panel .badge");
    const badgeEntrega = document.querySelector(".delivery-panel .badge");

    if (badgeCaptura) badgeCaptura.textContent = ordenesPorCapturar.length;
    if (badgeEntrega) badgeEntrega.textContent = ordenesPorEntregar.length;
};
