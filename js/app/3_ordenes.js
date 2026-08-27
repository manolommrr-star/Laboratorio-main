/**
 * @file 3_ordenes.js
 * @description Contiene las funciones para gestionar el ciclo de vida de las órdenes
 * (cambiar estados) y para renderizar su representación visual en el tablero (tarjetas).
 */

/**
 * Genera el código HTML para una tarjeta de orden.
 * La tarjeta muestra información clave como el folio, paciente, estudios y estado del pago.
 * También incluye botones de acción ('Capturar', 'Imprimir', 'Editar') según el estado de la orden.
 * @param {object} orden - El objeto de la orden para el cual se creará la tarjeta.
 * @returns {string} El string HTML de la tarjeta.
 */
function crearTarjetaOrden(orden) {
    const ordenSegura = orden || {};
    const paciente = ordenSegura.paciente || {};
    const estudios = Array.isArray(ordenSegura.estudios) ? ordenSegura.estudios : [];
    const pago = ordenSegura.pago || {};
    const nombreCompleto = [paciente.nombre, paciente.apellidoPaterno, paciente.apellidoMaterno]
        .filter(Boolean)
        .join(" ")
        .trim() || "Paciente sin nombre";
    const tiempo = ordenSegura.fecha ? new Date(ordenSegura.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : "Sin hora";
    const estado = normalizarEstadoOrden(ordenSegura.estado);
    const folio = ordenSegura.folio || "Sin folio";
    const saldo = Number(pago.saldo ?? 0);

    let botones = '';

    if (estado === ESTADOS_ORDEN.POR_CAPTURAR) {
        botones = `<button type="button" class="primary-action" data-folio="${folio}" data-accion="capturar">Capturar resultados</button>`;
    } else if (estado === ESTADOS_ORDEN.POR_ENTREGAR) {
        botones = `
            <div class="card-actions">
                <button type="button" class="primary-action" data-folio="${folio}" data-accion="imprimir">Imprimir</button>
                <button type="button" class="secondary-action" data-folio="${folio}" data-accion="editar">Editar</button>
                <button type="button" class="secondary-action" data-folio="${folio}" data-accion="ajustar-ganancia">Ajustar ganancia</button>
                <button type="button" class="deliver-action" data-folio="${folio}" data-accion="liquidar">Liquidar y entregar</button>
            </div>
        `;
    }

    let infoSaldo = '';
    if (saldo > 0 && estado !== ESTADOS_ORDEN.ENTREGADA) {
        infoSaldo = `
            <div class="debt">
                <span>Adeudo</span>
                <strong>${moneda(saldo)}</strong>
            </div>`;
    } else if (estado !== ESTADOS_ORDEN.ENTREGADA) {
        infoSaldo = `<div class="paid">Pagado ✓</div>`;
    }

    const estudiosHtml = estudios.length
        ? estudios.map((estudio) => `<p>🧪 ${estudio?.nombre || "Estudio sin nombre"}</p>`).join("")
        : '<p>🧪 Sin estudios asociados</p>';

    return `
        <article class="order-card" data-folio="${folio}">
            <div class="card-top">
                <strong>${folio}</strong>
                <time>${tiempo}</time>
            </div>
            <h4>${nombreCompleto}</h4>
            <div class="card-studies">
                <span class="card-label">Estudios</span>
                ${estudiosHtml}
            </div>
            ${infoSaldo}
            ${botones}
        </article>
    `;
}

/**
 * Actualiza el tablero completo, renderizando todas las órdenes en sus columnas correspondientes.
 * Limpia las columnas y vuelve a dibujar las tarjetas basadas en el estado actual del arreglo `ordenes`.
 */
function renderizarTablero() {
    const porCapturarContenedor = document.querySelector('.capture-panel .orders-list');
    const porEntregarContenedor = document.querySelector('.delivery-panel .orders-list');

    if (!porCapturarContenedor || !porEntregarContenedor) return;

    porCapturarContenedor.innerHTML = '';
    porEntregarContenedor.innerHTML = '';

    const ordenesPorCapturar = ordenes.filter(o => normalizarEstadoOrden(o.estado) === ESTADOS_ORDEN.POR_CAPTURAR);
    const ordenesPorEntregar = ordenes.filter(o => normalizarEstadoOrden(o.estado) === ESTADOS_ORDEN.POR_ENTREGAR);

    // Renderizar tarjetas en la columna "Por Capturar"
    ordenesPorCapturar.forEach(orden => {
        const tarjetaHtml = crearTarjetaOrden(orden);
        porCapturarContenedor.insertAdjacentHTML('beforeend', tarjetaHtml);
    });

    // Renderizar tarjetas en la columna "Por Entregar"
    ordenesPorEntregar.forEach(orden => {
        const tarjetaHtml = crearTarjetaOrden(orden);
        const tarjetaElement = document.createElement('div');
        tarjetaElement.innerHTML = tarjetaHtml;
        porEntregarContenedor.appendChild(tarjetaElement.firstElementChild);
    });

    // Actualizar los contadores numéricos de cada columna
    document.querySelector('.capture-panel .badge').textContent = ordenesPorCapturar.length;
    document.querySelector('.delivery-panel .badge').textContent = ordenesPorEntregar.length;
}