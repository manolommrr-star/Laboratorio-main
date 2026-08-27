/**
 * @file main.js
 * @description Archivo principal de la aplicación.
 *
 * Este archivo funciona como orquestador del sistema: centraliza referencias del
 * DOM, inicializa listeners y coordina las interacciones entre los módulos de
 * datos, estado y UI.
 *
 * La lógica fue dividida por dominio para facilitar mantenimiento futuro,
 * manteniendo aquí el flujo general y la inicialización del entorno.
 */

// -----------------------------------------------------------------------------
// 1) Referencias del DOM
// -----------------------------------------------------------------------------

// Objeto para centralizar las referencias a los elementos del DOM más utilizados.
const refs = {
    formOrden: document.getElementById("form-orden"),
    buscarPaciente: document.getElementById("buscar-paciente"),
    listaPacientes: document.getElementById("lista-pacientes"),
    nuevoPaciente: document.getElementById("btn-nuevo-paciente"),
    buscarEstudio: document.getElementById("buscar-estudio"),
    listaEstudiosBusqueda: document.getElementById("lista-estudios-busqueda"),
    agregarEstudio: document.getElementById("btn-agregar-estudio"),
    listaEstudios: document.getElementById("lista-estudios"),
    edad: document.getElementById("edad"),
    pago: document.getElementById("pago"),
    total: document.getElementById("total"),
    saldo: document.getElementById("saldo"),
    diaNacimiento: document.getElementById("dia-nacimiento"),
    mesNacimiento: document.getElementById("mes-nacimiento"),
    anioNacimiento: document.getElementById("anio-nacimiento"),
    ordenesPorCapturar: document.querySelector(".capture-panel .orders-list"),
    formResultados: document.getElementById("form-resultados"),
    formAjusteGanancia: document.getElementById("form-ajuste-ganancia"),
    navTabs: document.querySelectorAll(".nav-tab"),
    screenRecepcion: document.getElementById("screen-recepcion"),
    screenHistorial: document.getElementById("screen-historial"),
    screenEstudios: document.getElementById("screen-estudios"),
    historialBuscar: document.getElementById("buscar-historial"),
    filtroReporte: document.getElementById("filtro-reporte"),
    mesReporte: document.getElementById("mes-reporte"),
    btnExportarExcel: document.getElementById("btn-exportar-pdf"),
    fechaActual: document.getElementById("fecha-actual"),
    historyTableBody: document.getElementById("history-table-body"),
    historyEmpty: document.getElementById("history-empty"),
    estudioBuscar: document.getElementById("buscar-estudio-catalogo"),
    estudioTableBody: document.getElementById("catalogo-estudios-body"),
    estudioTableMaquiladoBody: document.getElementById("catalogo-estudios-maquilado-body"),
    formEditorEstudio: document.getElementById("form-editor-estudio"),
    estudioIdInput: document.getElementById("estudio-id"),
    estudioNombreInput: document.getElementById("estudio-nombre"),
    estudioMuestraInput: document.getElementById("estudio-muestra"),
    estudioPrecioInput: document.getElementById("estudio-precio"),
    estudioParametrosEditor: document.getElementById("estudio-parametros-editor"),
    btnNuevoEstudio: document.getElementById("btn-nuevo-estudio"),
    btnAgregarParametro: document.getElementById("btn-agregar-parametro"),
    btnResetEstudio: document.getElementById("btn-reset-estudio"),
    modoDemo: document.getElementById("modo-demo-indicator"),
};

// -----------------------------------------------------------------------------
// 2) Estado global / entorno
// -----------------------------------------------------------------------------

const sistema = {
    modoDemo: false,
};

/**
 * Formatea un número como una cadena de moneda.
 * @param {number} valor - El valor numérico a formatear.
 * @returns {string} El valor formateado como moneda (ej. "$150.00").
 */
function moneda(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

/**
 * Calcula la edad de una persona a partir de su fecha de nacimiento.
 * @param {string} fecha - La fecha de nacimiento en formato "YYYY-MM-DD".
 * @returns {number|string} La edad en años, o un string vacío si la fecha es inválida.
 */
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

/**
 * Normaliza un texto: lo convierte a minúsculas y elimina los acentos.
 * @param {string} texto - El texto a normalizar.
 * @returns {string} El texto normalizado.
 */
// -----------------------------------------------------------------------------
// 3) Utilidades y normalización
// -----------------------------------------------------------------------------

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

function esMaquiladoValor(valor) {
    if (valor === undefined || valor === null || valor === false || valor === 0 || valor === '0') {
        return false;
    }

    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') {
        return ['1', 'true', 'yes', 'y', 'si', 'sí'].includes(valor.trim().toLowerCase());
    }

    return Boolean(valor);
}

function parseAgeRanges(texto) {
    if (!texto || typeof texto !== 'string') return [];
    
    return texto.split(';').map(bloque => {
        const partes = bloque.trim().split(':');
        if (partes.length !== 2) return null;
        
        const edadParte = partes[0].trim();
        const rango = partes[1].trim();
        
        const [desde, hasta] = edadParte.includes('-') 
            ? edadParte.split('-').map(x => x.trim())
            : [edadParte, '+'];
        
        return {
            from: parseInt(desde) || 0,
            to: hasta === '+' ? '+' : (parseInt(hasta) || '+'),
            value: rango
        };
    }).filter(Boolean);
}

function generarFormatoEdad(rangos) {
    if (!Array.isArray(rangos) || rangos.length === 0) return '';
    
    return rangos.map(r => {
        const desde = r.from || 0;
        const hasta = r.to === '+' || r.to === '' ? '+' : r.to;
        const rangoCompleto = hasta === '+' ? desde.toString() : `${desde}-${hasta}`;
        return `${rangoCompleto}: ${r.value}`;
    }).join('; ');
}

function clavePaciente(paciente) {
    const nombre = normalizarValorPaciente(paciente?.nombre || "");
    const apellidoP = normalizarValorPaciente(paciente?.apellidoPaterno || "");
    const apellidoM = normalizarValorPaciente(paciente?.apellidoMaterno || "");
    const fecha = normalizarValorPaciente(paciente?.fechaNacimiento || "");
    const telefono = normalizarValorPaciente(paciente?.telefono || "");
    return `${nombre}|${apellidoP}|${apellidoM}|${fecha}|${telefono}`;
}

// -----------------------------------------------------------------------------
// 4) Pacientes y búsquedas
// -----------------------------------------------------------------------------

function parsearNombrePaciente(texto) {
    const valor = String(texto || "").trim();
    if (!valor) return { nombre: "", apellidoPaterno: "", apellidoMaterno: "" };

    const palabras = valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);

    if (!palabras.length) return { nombre: "", apellidoPaterno: "", apellidoMaterno: "" };
    if (palabras.length === 1) return { nombre: palabras[0], apellidoPaterno: "", apellidoMaterno: "" };
    if (palabras.length === 2) return { nombre: palabras[0], apellidoPaterno: palabras[1], apellidoMaterno: "" };
    if (palabras.length === 3) return { nombre: palabras[0], apellidoPaterno: palabras[1], apellidoMaterno: palabras[2] };

    return {
        nombre: `${palabras[0]} ${palabras[1]}`,
        apellidoPaterno: palabras[2],
        apellidoMaterno: palabras[3]
    };
}

function aplicarNombrePacienteDesdeTexto(texto) {
    const datos = parsearNombrePaciente(texto);
    const nombreInput = document.getElementById("nombre");
    const apPatInput = document.getElementById("apellido-paterno");
    const apMatInput = document.getElementById("apellido-materno");

    if (nombreInput) nombreInput.value = datos.nombre;
    if (apPatInput) apPatInput.value = datos.apellidoPaterno;
    if (apMatInput) apMatInput.value = datos.apellidoMaterno;

    ordenActual.paciente.nombre = datos.nombre;
    ordenActual.paciente.apellidoPaterno = datos.apellidoPaterno;
    ordenActual.paciente.apellidoMaterno = datos.apellidoMaterno;
    return datos;
}

async function guardarPacienteEnCatalogo(paciente, opciones = {}) {
    const { silentDuplicate = false } = opciones;
    if (!paciente || !paciente.nombre || !paciente.apellidoPaterno) return paciente;

    const pacienteNormalizado = {
        ...paciente,
        nombre: String(paciente.nombre ?? "").trim(),
        apellidoPaterno: String(paciente.apellidoPaterno ?? "").trim(),
        apellidoMaterno: String(paciente.apellidoMaterno ?? "").trim(),
        contacto: String(paciente.contacto ?? "").trim(),
        telefono: String(paciente.telefono ?? "").trim(),
    };

    const clave = clavePaciente(pacienteNormalizado);
    const pacienteExistente = pacientes.find((item) => clavePaciente(item) === clave);
    if (pacienteExistente) {
        if (!silentDuplicate) {
            alert(`Ya existe un paciente registrado con esos datos: ${pacienteNormalizado.nombre} ${pacienteNormalizado.apellidoPaterno}. Se usará el registro existente.`);
        }
        return { ...pacienteExistente, ...pacienteNormalizado, id: pacienteExistente.id };
    }

    const nuevoPaciente = {
        id: Date.now(),
        ...pacienteNormalizado,
    };

    try {
        const resp = await fetch('/api/pacientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoPaciente)
        });
        if (resp.ok) {
            const data = await resp.json();
            pacientes.push(data);
            return { ...data, ...pacienteNormalizado };
        }
    } catch (err) {
        console.warn('No se pudo persistir paciente en el servidor:', err);
    }

    pacientes.push(nuevoPaciente);
    return nuevoPaciente;
}

/**
 * Busca pacientes en el catálogo que coincidan con un criterio de búsqueda.
 * @param {string} texto - El texto a buscar en el nombre, apellidos o teléfono del paciente.
 * @returns {Array<object>} Un arreglo de pacientes que coinciden.
 */
function buscarPacientes(texto) {
    const criterio = normalizarTexto(texto.trim());
    if (!criterio) return [];

    return pacientes.filter((paciente) =>
        normalizarTexto(paciente.nombre).includes(criterio) ||
        normalizarTexto(paciente.apellidoPaterno).includes(criterio) ||
        normalizarTexto(paciente.apellidoMaterno || "").includes(criterio) ||
        normalizarTexto(paciente.telefono).includes(criterio)
    );
}

/**
 * Busca estudios en el catálogo que coincidan con un criterio de búsqueda.
 * @param {string} texto - El texto a buscar en el nombre del estudio.
 * @returns {Array<object>} Un arreglo de estudios que coinciden.
 */
function buscarEstudios(texto) {
    const criterio = normalizarTexto(texto.trim());
    if (!criterio) return [];

    return estudios.filter((estudio) =>
        normalizarTexto(estudio.nombre).includes(criterio)
    );
}

/**
 * Limpia y oculta una lista de autocompletado.
 * @param {HTMLElement} lista - El elemento de la lista a ocultar.
 */
function ocultarLista(lista) {
    lista.innerHTML = "";
    lista.style.display = "none";
}

/**
 * Muestra los resultados de la búsqueda de pacientes en una lista de autocompletado.
 * @param {Array<object>} resultados - El arreglo de pacientes a mostrar.
 */
function mostrarResultadosPacientes(resultados) {
    refs.listaPacientes.innerHTML = "";

    if (!resultados.length) {
        refs.listaPacientes.style.display = "none";
        return;
    }

    resultados.forEach((paciente) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "autocomplete-item";
        const edad = calcularEdad(paciente.fechaNacimiento);
        const genero = paciente.sexo === "M" ? "Masculino" : "Femenino";
        const detalles = `${genero}${edad ? `, ${edad} años` : ""}`;
        item.innerHTML = `
            <div class="autocomplete-name">${paciente.nombre} ${paciente.apellidoPaterno} ${paciente.apellidoMaterno || ""}</div>
            <div class="autocomplete-phone">${detalles}</div>
        `;
        item.addEventListener("click", () => seleccionarPaciente(paciente.id));
        refs.listaPacientes.appendChild(item);
    });

    refs.listaPacientes.style.display = "block";
}

/**
 * Selecciona un paciente de la lista de autocompletado y actualiza el formulario.
 * @param {number} id - El ID del paciente seleccionado.
 */
function seleccionarPaciente(id) {
    const paciente = pacientes.find((item) => item.id === id);
    if (!paciente) return;

    ordenActual.paciente = { ...paciente };
    refs.buscarPaciente.value = "";
    ocultarLista(refs.listaPacientes);
    renderPaciente();
}

/**
 * Rellena los campos del formulario del paciente con los datos del paciente en `ordenActual`.
 */
function renderPaciente() {
    const paciente = ordenActual.paciente;
    document.getElementById("nombre").value = paciente.nombre;
    document.getElementById("apellido-paterno").value = paciente.apellidoPaterno;
    document.getElementById("apellido-materno").value = paciente.apellidoMaterno;

    if (paciente.fechaNacimiento) {
        const [anio, mes, dia] = paciente.fechaNacimiento.split("-");
        refs.anioNacimiento.value = anio;
        refs.mesNacimiento.value = parseInt(mes, 10); // Use month number for value
        refs.diaNacimiento.value = parseInt(dia, 10); // Use day number for value
    } else {
        refs.diaNacimiento.value = "";
        refs.mesNacimiento.value = "";
        refs.anioNacimiento.value = "";
    }

    refs.edad.textContent = calcularEdad(paciente.fechaNacimiento);
    document.getElementById("sexo").value = paciente.sexo;
    document.getElementById("telefono").value = paciente.telefono;
    document.getElementById("contacto").value = paciente.contacto;
}

/**
 * Limpia el formulario del paciente y el objeto `ordenActual.paciente` para un nuevo registro.
 */
function nuevoPaciente() {
    const textoBusqueda = (refs.buscarPaciente?.value || "").trim();
    if (textoBusqueda) {
        const datos = parsearNombrePaciente(textoBusqueda);
        ordenActual.paciente = {
            id: null,
            nombre: datos.nombre,
            apellidoPaterno: datos.apellidoPaterno,
            apellidoMaterno: datos.apellidoMaterno,
            fechaNacimiento: "",
            sexo: "",
            telefono: "",
            contacto: ""
        };
        refs.buscarPaciente.value = "";
        ocultarLista(refs.listaPacientes);
        renderPaciente();
        return;
    }

    ordenActual.paciente = {
        id: null,
        nombre: "",
        apellidoPaterno: "",
        apellidoMaterno: "",
        fechaNacimiento: "",
        sexo: "",
        telefono: "",
        contacto: ""
    };

    refs.buscarPaciente.value = "";
    ocultarLista(refs.listaPacientes);
    renderPaciente();
}

/**
 * Muestra los resultados de la búsqueda de estudios en una lista de autocompletado.
 * @param {Array<object>} resultados - El arreglo de estudios a mostrar.
 */
function mostrarResultadosEstudios(resultados) {
    refs.listaEstudiosBusqueda.innerHTML = "";

    if (!resultados.length) {
        refs.listaEstudiosBusqueda.style.display = "none";
        return;
    }

    resultados.forEach((estudio) => {
        const yaAgregado = ordenActual.estudios.some((item) => item.id === estudio.id);
        const item = document.createElement("button");
        item.type = "button";
        item.className = `autocomplete-item${yaAgregado ? ' disabled' : ''}`;
        item.disabled = yaAgregado;
        item.innerHTML = `
            <div class="autocomplete-name">${estudio.nombre}${yaAgregado ? ' <span style="color: #999; font-size: 0.9em;">(ya agregado)</span>' : ''}</div>
            <div class="autocomplete-phone">${estudio.muestra} · ${moneda(estudio.precioSugerido)}</div>
        `;
        item.addEventListener("click", (e) => {
            if (yaAgregado) {
                e.preventDefault();
                return;
            }
            agregarEstudio(estudio.id);
        });
        refs.listaEstudiosBusqueda.appendChild(item);
    });

    refs.listaEstudiosBusqueda.style.display = "block";
}

/**
 * Agrega un estudio a la orden actual.
 * @param {number} id - El ID del estudio a agregar.
 */
function agregarEstudio(id) {
    const estudio = estudios.find((item) => item.id === id);
    const yaAgregado = ordenActual.estudios.some((item) => item.id === id);
    
    if (!estudio) {
        alert('El estudio no existe en el catálogo.');
        return;
    }
    
    if (yaAgregado) {
        alert(`El estudio "${estudio.nombre}" ya está agregado en esta orden.`);
        return;
    }

    // No inicializar observaciones aquí: solo se permiten al capturar resultados
    const estudioEnOrden = {
        id: estudio.id,
        plantillaId: estudio.plantillaId ?? estudio.id,
        nombre: estudio.nombre,
        muestra: estudio.muestra,
        precioSugerido: estudio.precioSugerido,
        precioCobrado: estudio.precioSugerido,
        resultados: []
    };

    // Preservar la bandera 'maquilado' si el estudio la tiene en el catálogo
    if (typeof estudio.maquilado !== 'undefined') {
        estudioEnOrden.maquilado = esMaquiladoValor(estudio.maquilado);
    }

    ordenActual.estudios.push(estudioEnOrden);

    refs.buscarEstudio.value = "";
    ocultarLista(refs.listaEstudiosBusqueda);
    actualizarCobro();
    renderEstudios();
}


/**
 * Elimina un estudio de la orden actual.
 * @param {number} index - El índice del estudio a eliminar en el arreglo `ordenActual.estudios`.
 */
function eliminarEstudio(index) {
    ordenActual.estudios.splice(index, 1);
    actualizarCobro();
    renderEstudios();
}

/**
 * Actualiza el precio cobrado de un estudio en la orden actual.
 * @param {number} index - El índice del estudio a actualizar.
 * @param {string|number} valor - El nuevo precio.
 */
function actualizarPrecio(index, valor) {
    const precio = Number(valor);
    ordenActual.estudios[index].precioCobrado = Number.isFinite(precio) && precio >= 0 ? precio : 0;
    actualizarCobro();
}

/**
 * Renderiza la tabla de estudios seleccionados para la orden actual.
 */
function renderEstudios() {
    refs.listaEstudios.innerHTML = "";

    if (!ordenActual.estudios.length) {
        refs.listaEstudios.innerHTML = '<p class="empty-studies">Aún no hay estudios agregados.</p>';
        return;
    }

    ordenActual.estudios.forEach((estudio, index) => {
            const esMaquilado = esMaquiladoValor(estudio.maquilado);
            const fila = document.createElement("article");
            fila.className = `selected-study${esMaquilado ? ' maquilado' : ''}`;
            fila.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                    <span class="study-name">${estudio.nombre}</span>
                    ${esMaquilado ? '<span class="maquilado-badge">Maquilado</span>' : ''}
                </div>
                <span class="study-sample">${estudio.muestra}</span>
                <strong>${moneda(estudio.precioSugerido)}</strong>
                <input class="study-price" type="number" min="0" step="0.01" value="${estudio.precioCobrado}" aria-label="Precio de ${estudio.nombre}">
                <button type="button" class="remove-study" aria-label="Eliminar ${estudio.nombre}">×</button>
            `;

            // Evitar errores si el elemento no existe por alguna razón
            const priceInput = fila.querySelector(".study-price");
            if (priceInput) priceInput.addEventListener("input", (evento) => actualizarPrecio(index, evento.target.value));
            const removeBtn = fila.querySelector(".remove-study");
            if (removeBtn) removeBtn.addEventListener("click", () => eliminarEstudio(index));
            refs.listaEstudios.appendChild(fila);
        });
}

/**
 * Recalcula el total y el saldo de la orden y actualiza la UI.
 */
function actualizarCobro() {
    ordenActual.pago.total = ordenActual.estudios.reduce(
        (acumulado, estudio) => acumulado + estudio.precioCobrado,
        0
    );
    ordenActual.pago.saldo = Math.max(0, ordenActual.pago.total - ordenActual.pago.pagado);
    renderResumen();
}

/**
 * Actualiza los campos de Total y Saldo en la UI.
 */
function renderResumen() {
    refs.total.textContent = moneda(ordenActual.pago.total);
    refs.saldo.textContent = moneda(ordenActual.pago.saldo);
}

/**
 * Combina los valores de los selects de fecha en un solo string "YYYY-MM-DD" y actualiza la edad.
 */
function unirFecha() {
    const dia = refs.diaNacimiento.value;
    const mes = refs.mesNacimiento.value;
    const anio = refs.anioNacimiento.value;

    if (!dia || !mes || !anio) {
        ordenActual.paciente.fechaNacimiento = "";
        refs.edad.textContent = "";
        return;
    }

    const diaFormateado = String(dia).padStart(2, "0");
    const mesFormateado = String(mes).padStart(2, "0");
    const fecha = `${anio}-${mesFormateado}-${diaFormateado}`;

    ordenActual.paciente.fechaNacimiento = fecha;
    refs.edad.textContent = calcularEdad(fecha);
}

/**
 * Rellena los selects de día, mes y año con sus opciones correspondientes.
 */
function inicializarSelectsFecha() {
    // Poblar días
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        refs.diaNacimiento.appendChild(option);
    }

    // Poblar meses
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    meses.forEach((nombre, index) => {
        const option = document.createElement("option");
        option.value = index + 1;
        option.textContent = nombre;
        refs.mesNacimiento.appendChild(option);
    });

    // Poblar años
    const anioActual = new Date().getFullYear();
    const anioInicio = anioActual - 120;
    for (let i = anioActual; i >= anioInicio; i--) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        refs.anioNacimiento.appendChild(option);
    }
}

// Variable para llevar la cuenta del folio. En una app real, esto lo manejaría el backend.
let proximoFolio = 126; // Folio inicial basado en datos de ejemplo

function extraerNumeroFolio(folio) {
    const match = String(folio ?? "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
}

function generarNuevoFolio() {
    const maxFolioExistente = ordenes.reduce((max, orden) => {
        const numero = extraerNumeroFolio(orden?.folio);
        return Math.max(max, numero);
    }, 0);
    const siguienteNumero = Math.max(proximoFolio, maxFolioExistente + 1);
    proximoFolio = siguienteNumero + 1;
    return `F${String(siguienteNumero).padStart(6, "0")}`;
}

/**
 * Guarda la orden actual: valida los datos, la agrega al arreglo de órdenes y limpia el formulario.
 */
function normalizarOrden(orden) {
    const pagoTotal = Number(orden.pago?.total ?? 0);
    const pagoPagado = Number(orden.pago?.pagado ?? 0);
    const pagoSaldo = Number(orden.pago?.saldo ?? Math.max(0, pagoTotal - pagoPagado));

    const ajustesBase = Array.isArray(orden.ajustes) ? orden.ajustes : [];
    const ajusteCalculado = ajustesBase.length
        ? ajustesBase.reduce((total, ajuste) => total + Number(ajuste.valor ?? (-Math.abs(Number(ajuste.monto ?? 0)))), 0)
        : Number(orden.ajusteGanancia ?? orden.gananciaAjuste ?? 0);

    const estudiosNormalizados = Array.isArray(orden.estudios) ? orden.estudios.map((estudio) => {
        const candidatosPlantilla = [
            estudio.plantillaId,
            estudio.estudioId,
            estudio.id
        ].filter((valor) => valor !== null && valor !== undefined && valor !== "");

        let plantillaId = null;
        for (const valor of candidatosPlantilla) {
            const id = Number(valor);
            if (Number.isFinite(id) && id > 0) {
                const existePlantilla = Boolean(plantillas[String(id)] || plantillas[id]);
                if (existePlantilla) {
                    plantillaId = id;
                    break;
                }
            }
        }

        if (!plantillaId && candidatosPlantilla.length) {
            const fallback = Number(candidatosPlantilla[0]);
            plantillaId = Number.isFinite(fallback) && fallback > 0 ? fallback : null;
        }

        const estudioCatalogo = Array.isArray(estudios)
            ? estudios.find((item) => Number(item.id) === Number(estudio.estudioId ?? estudio.id ?? 0))
            : null;

        return {
            ...estudio,
            plantillaId: plantillaId ?? null,
            estudioId: estudio.estudioId ?? estudio.id ?? null,
            maquilado: esMaquiladoValor(estudio.maquilado ?? estudioCatalogo?.maquilado ?? false),
            resultados: Array.isArray(estudio.resultados) ? estudio.resultados : [],
            precioSugerido: Number(estudio.precioSugerido ?? 0),
            precioCobrado: Number(estudio.precioCobrado ?? estudio.precioSugerido ?? 0),
            observaciones: estudio.observaciones ?? ''
        };
    }) : [];

    const ordenNormalizada = {
        ...orden,
        id: orden.id ?? orden.folio ?? null,
        folio: orden.folio ?? `F${String(proximoFolio).padStart(6, "0")}`,
        fecha: orden.fecha ?? new Date().toISOString(),
        createdAt: orden.createdAt ?? orden.fecha ?? new Date().toISOString(),
        updatedAt: orden.updatedAt ?? new Date().toISOString(),
        estado: normalizarEstadoOrden(orden.estado ?? ESTADOS_ORDEN.POR_CAPTURAR),
        ajusteGanancia: Number(ajusteCalculado ?? 0),
        ajustes: ajustesBase.map((ajuste, index) => ({
            id: ajuste?.id ?? `ajuste-${index}`,
            monto: Number(ajuste?.monto ?? 0),
            valor: Number(ajuste?.valor ?? (-Math.abs(Number(ajuste?.monto ?? 0)))),
            concepto: ajuste?.concepto || 'Ajuste',
            fecha: ajuste?.fecha || ajuste?.createdAt || orden.updatedAt || orden.fecha || new Date().toISOString()
        })),
        ganancia: Number(orden.ganancia ?? (pagoTotal + Number(ajusteCalculado ?? 0))),
        paciente: {
            ...(orden.paciente ?? {}),
            id: orden.paciente?.id ?? null,
            nombre: orden.paciente?.nombre ?? "",
            apellidoPaterno: orden.paciente?.apellidoPaterno ?? "",
            apellidoMaterno: orden.paciente?.apellidoMaterno ?? "",
            fechaNacimiento: orden.paciente?.fechaNacimiento ?? "",
            sexo: orden.paciente?.sexo ?? "",
            telefono: orden.paciente?.telefono ?? "",
            contacto: orden.paciente?.contacto ?? ""
        },
        estudios: estudiosNormalizados,
        pago: {
            total: pagoTotal,
            pagado: pagoPagado,
            saldo: pagoSaldo
        },
        historial: {
            eventos: Array.isArray(orden.historial?.eventos) ? orden.historial.eventos : [],
            ultimaAccion: orden.historial?.ultimaAccion ?? "creada"
        },
        metadatos: {
            ...(orden.metadatos ?? {}),
            origen: orden.metadatos?.origen ?? "recepcion",
            usuario: orden.metadatos?.usuario ?? "admin"
        }
    };

    if (!ordenNormalizada.historial.eventos.length) {
        ordenNormalizada.historial.eventos.push({
            tipo: "creada",
            fecha: ordenNormalizada.createdAt,
            detalle: `Orden ${ordenNormalizada.folio} registrada`
        });
    }

    return ordenNormalizada;
}

function mostrarPantalla(nombre) {
    const pantallas = [
        { key: "recepcion", el: refs.screenRecepcion },
        { key: "historial", el: refs.screenHistorial },
        { key: "estudios", el: refs.screenEstudios }
    ];

    pantallas.forEach(({ key, el }) => {
        const mostrar = key === nombre;
        el.classList.toggle("is-active", mostrar);
    });

    refs.navTabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.screen === nombre);
    });

    if (nombre === "estudios") {
        renderCatalogoEstudios();
    }
}

function escaparHtmlTexto(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obtenerSiguienteIdEstudio() {
    if (!Array.isArray(estudios) || !estudios.length) return 1;
    return Math.max(...estudios.map((estudio) => Number(estudio.id) || 0)) + 1;
}

function resolverPlantillaDeEstudio(estudio) {
    if (!estudio) return null;

    const candidatos = [
        estudio.plantillaId,
        estudio.estudioId,
        estudio.id,
        estudio.estudio?.plantillaId,
        estudio.estudio?.id
    ].filter((valor) => valor !== null && valor !== undefined && valor !== "");

    for (const valor of candidatos) {
        const plantillaId = Number(valor);
        if (Number.isFinite(plantillaId) && plantillaId > 0) {
            const plantilla = plantillas[String(plantillaId)] || plantillas[plantillaId];
            if (plantilla) return plantilla;
        }
    }

    const plantillaId = Number(candidatos[0] ?? 0);
    if (!Number.isFinite(plantillaId) || plantillaId <= 0) return null;
    return plantillas[String(plantillaId)] || plantillas[plantillaId] || null;
}

function normalizarPlantillaEstudio(estudioId, nombre = "", muestra = "") {
    const id = Number(estudioId);
    const plantillaActual = resolverPlantillaDeEstudio({ id, plantillaId: id }) || plantillas[id] || {};
    const grupos = Array.isArray(plantillaActual.grupos) && plantillaActual.grupos.length
        ? plantillaActual.grupos.map((grupo) => ({
            ...grupo,
            nombre: grupo.nombre || "PARÁMETROS",
            parametros: Array.isArray(grupo.parametros) ? grupo.parametros.map((parametro) => ({
                ...parametro,
                tipo: parametro.tipo || "numero",
                nombre: parametro.nombre || "",
                unidad: parametro.unidad || "",
                referencia: parametro.referencia ?? "",
                opciones: Array.isArray(parametro.opciones) ? parametro.opciones : []
            })) : []
        }))
        : [{ nombre: "PARÁMETROS", parametros: [] }];

    const plantilla = {
        nombre: nombre || plantillaActual.nombre || "Nuevo estudio",
        membrete: plantillaActual.membrete || "general",
        grupos,
        observaciones: plantillaActual.observaciones || ""
    };

    plantillas[id] = plantilla;
    return plantilla;
}

function normalizarReferenciaEditor(referencia) {
    if (typeof referencia === "string") {
        return {
            base: referencia,
            m: "",
            f: "",
            edadMin: "",
            edadMax: "",
            edadValor: ""
        };
    }

    if (referencia && typeof referencia === "object") {
        const base = typeof referencia.base === "string"
            ? referencia.base
            : typeof referencia.valor === "string"
                ? referencia.valor
                : typeof referencia.valor !== "undefined"
                    ? String(referencia.valor)
                    : (typeof referencia.min !== "undefined" || typeof referencia.max !== "undefined")
                        ? `${referencia.min ?? ""} - ${referencia.max ?? ""}`
                        : "";

        const porSexo = referencia.porSexo || {};
        const refEdad = referencia.edad;
        let edad = {};
        let edadValor = "";

        if (Array.isArray(refEdad) && refEdad.length) {
            // Array de rangos ({min, max, valor}): reconstruir TODOS los rangos
            // en el texto canónico "min-max: valor; min-max: valor" para que el
            // editor muestre cada rango como una fila independiente.
            edadValor = refEdad
                .map((rango) => {
                    if (!rango || typeof rango !== "object") return "";
                    const min = typeof rango.min !== "undefined" ? String(rango.min) : "";
                    const max = typeof rango.max !== "undefined" ? String(rango.max) : "";
                    const valor = typeof rango.valor !== "undefined" ? String(rango.valor) : "";
                    if (!valor) return "";
                    const etiqueta = max !== "" ? `${min}-${max}` : min;
                    return etiqueta !== "" ? `${etiqueta}: ${valor}` : valor;
                })
                .filter(Boolean)
                .join("; ");
            // Conservar el primer rango para los campos planos de apoyo.
            edad = refEdad.find((rango) => rango && typeof rango === "object") || {};
        } else if (refEdad && typeof refEdad === "object") {
            const claves = Object.keys(refEdad);
            const esIndexadoPorEdad =
                claves.length > 0 &&
                claves.every((clave) => /^\d+(?:\.\d+)?$/.test(clave));

            if (esIndexadoPorEdad) {
                // Objeto indexado por edad mínima: { "50": { valor: "..." } }
                edadValor = claves
                    .map((clave) => {
                        const sub = refEdad[clave];
                        const valor = sub && typeof sub === "object"
                            ? (typeof sub.valor !== "undefined" ? String(sub.valor) : "")
                            : (sub === null || sub === undefined ? "" : String(sub));
                        return valor ? `${clave}: ${valor}` : "";
                    })
                    .filter(Boolean)
                    .join("; ");
            } else {
                // Formato plano { min, max, valor }: convertir al texto canónico
                // para que los límites sobrevivan al guardar desde el editor.
                edad = refEdad;
                if (typeof edad.valor !== "undefined") {
                    const min = typeof edad.min !== "undefined" ? String(edad.min) : "";
                    const max = typeof edad.max !== "undefined" ? String(edad.max) : "";
                    const valor = String(edad.valor);
                    const etiqueta = max !== "" ? `${min}-${max}` : min;
                    edadValor = etiqueta !== "" ? `${etiqueta}: ${valor}` : valor;
                }
            }
        }

        return {
            base: base || "",
            m: typeof porSexo.M === "string" ? porSexo.M : "",
            f: typeof porSexo.F === "string" ? porSexo.F : "",
            edadMin: typeof edad.min !== "undefined" ? String(edad.min) : "",
            edadMax: typeof edad.max !== "undefined" ? String(edad.max) : "",
            edadValor
        };
    }

    return {
        base: "",
        m: "",
        f: "",
        edadMin: "",
        edadMax: "",
        edadValor: ""
    };
}

function serializarReferenciaDesdeFila(fila) {
    const base = fila.querySelector('[data-param-field="referencia-base"]')?.value.trim() || "";
    const usaSexo = !!fila.querySelector('[data-param-field="usar-sexo"]')?.checked;
    const usaEdad = !!fila.querySelector('[data-param-field="usar-edad"]')?.checked;
    const m = fila.querySelector('[data-param-field="referencia-m"]')?.value.trim() || "";
    const f = fila.querySelector('[data-param-field="referencia-f"]')?.value.trim() || "";
    const edadMin = fila.querySelector('[data-param-field="edad-min"]')?.value.trim() || "";
    const edadMax = fila.querySelector('[data-param-field="edad-max"]')?.value.trim() || "";
    const edadValor = fila.querySelector('[data-param-field="edad-valor"]')?.value.trim() || "";

    const referencia = {};
    if (base) referencia.base = base;

    if (usaSexo && (m || f)) {
        referencia.porSexo = {};
        if (m) referencia.porSexo.M = m;
        if (f) referencia.porSexo.F = f;
    }

    if (usaEdad && (edadMin || edadMax || edadValor)) {
        const textoEdad = edadValor.trim();
        const bloques = textoEdad ? textoEdad.split(';').map((bloque) => bloque.trim()).filter(Boolean) : [];
        const rangosConfigurados = bloques
            .map((bloque) => {
                const parte = bloque.split(':');
                if (parte.length < 2) return null;
                const etiqueta = parte.slice(0, -1).join(':').trim();
                const valor = parte.slice(-1)[0].trim();
                if (!valor) return null;

                const etiquetaNormalizada = etiqueta.replace(/\s+/g, '').toLowerCase();
                const matchMinMax = etiqueta.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
                const matchMin = etiqueta.match(/^(\d+(?:\.\d+)?)\+$/);
                const matchMayorIgual = etiqueta.match(/^(?:>=|mayor(?:\s+o\s+igual\s+a)?|>)\s*(\d+(?:\.\d+)?)$/);
                const matchMenorIgual = etiqueta.match(/^(?:<=|menor(?:\s+o\s+igual\s+a)?|<)\s*(\d+(?:\.\d+)?)$/);

                if (matchMinMax) {
                    return { min: Number(matchMinMax[1]), max: Number(matchMinMax[2]), valor };
                }
                if (matchMin) {
                    return { min: Number(matchMin[1]), valor };
                }
                if (matchMayorIgual) {
                    return { min: Number(matchMayorIgual[1]), valor };
                }
                if (matchMenorIgual) {
                    return { max: Number(matchMenorIgual[1]), valor };
                }

                const clave = etiquetaNormalizada.replace(/^(menor|mayor)\s+de\s+/, '').replace(/^(menor|mayor)\s+a\s+/, '').replace(/[^\d.]/g, '');
                if (!clave) return null;
                return { min: Number(clave), valor };
            })
            .filter(Boolean);

        if (rangosConfigurados.length) {
            referencia.edad = rangosConfigurados.length === 1 && typeof rangosConfigurados[0].min === 'number' && typeof rangosConfigurados[0].max === 'undefined'
                ? { [String(rangosConfigurados[0].min)]: { valor: rangosConfigurados[0].valor } }
                : rangosConfigurados;
        } else {
            referencia.edad = {};
            if (edadMin) referencia.edad.min = Number(edadMin);
            if (edadMax) referencia.edad.max = Number(edadMax);
            if (edadValor) referencia.edad.valor = edadValor;
        }
    }

    if (!Object.keys(referencia).length) return "N/A";
    if (Object.keys(referencia).length === 1 && referencia.base) return referencia.base;
    return referencia;
}

function renderEditorParametros(plantilla) {
    const contenedor = refs.estudioParametrosEditor;
    if (!contenedor) return;

    const parametros = [];
    if (plantilla && Array.isArray(plantilla.grupos)) {
        plantilla.grupos.forEach((grupo) => {
            if (Array.isArray(grupo.parametros)) {
                grupo.parametros.forEach((parametro) => parametros.push(parametro));
            }
        });
    }

    if (!parametros.length) {
        contenedor.innerHTML = '<div class="empty-parametros">Aún no hay parámetros. Agrega uno para configurar referencias.</div>';
        return;
    }

    contenedor.innerHTML = parametros.map((parametro, indice) => {
        const nombre = escaparHtmlTexto(parametro.nombre || "");
        const tipo = String(parametro.tipo || "numero");
        const unidad = escaparHtmlTexto(parametro.unidad || "");
        const referencia = normalizarReferenciaEditor(parametro.referencia);
        const usaSexo = !!(parametro.referencia && typeof parametro.referencia === "object" && parametro.referencia.porSexo);
        const usaEdad = !!(parametro.referencia && typeof parametro.referencia === "object" && parametro.referencia.edad);
        const opciones = escaparHtmlTexto(Array.isArray(parametro.opciones) ? parametro.opciones.join(", ") : "");

        return `
            <div class="study-param-row" data-param-index="${indice}">
                <div class="study-param-row-header">
                    <span class="study-param-tag">Parámetro ${indice + 1}</span>
                    <button type="button" class="text-button" data-param-action="remove">Eliminar</button>
                </div>

                <div class="study-param-row-body">
                    <div class="study-param-field">
                        <label>Nombre</label>
                        <input type="text" data-param-field="nombre" value="${nombre}" placeholder="Ej. Hemoglobina" />
                    </div>
                    <div class="study-param-field compact">
                        <label>Tipo</label>
                        <select data-param-field="tipo">
                            <option value="numero" ${tipo === "numero" ? "selected" : ""}>Número</option>
                            <option value="text" ${tipo === "text" ? "selected" : ""}>Texto</option>
                            <option value="textarea" ${tipo === "textarea" ? "selected" : ""}>Área</option>
                            <option value="select" ${tipo === "select" ? "selected" : ""}>Lista</option>
                            <option value="checkbox" ${tipo === "checkbox" ? "selected" : ""}>Sí/No</option>
                        </select>
                    </div>
                    <div class="study-param-field">
                        <label>Unidad</label>
                        <input type="text" data-param-field="unidad" value="${unidad}" placeholder="Ej. g/dL" />
                    </div>
                    <div class="study-param-field wide">
                        <label>Referencia base</label>
                        <input type="text" data-param-field="referencia-base" value="${escaparHtmlTexto(referencia.base)}" placeholder="Ej. 12-16 o 0-100" />
                    </div>
                </div>

                <div class="study-param-reference">
                    <div class="study-param-field checkbox-field">
                        <label>Sexo</label>
                        <label class="inline-toggle"><input type="checkbox" data-param-field="usar-sexo" ${usaSexo ? "checked" : ""}> Usar rango por sexo</label>
                    </div>
                    <div class="study-param-field checkbox-field">
                        <label>Edad</label>
                        <label class="inline-toggle"><input type="checkbox" data-param-field="usar-edad" ${usaEdad ? "checked" : ""}> Usar rangos por edad</label>
                    </div>
                    <div class="study-param-field" style="${usaSexo ? "display: flex" : "display: none"}">
                        <label>Hombre</label>
                        <input type="text" data-param-field="referencia-m" value="${escaparHtmlTexto(referencia.m)}" placeholder="Ej. 13-17" />
                    </div>
                    <div class="study-param-field" style="${usaSexo ? "display: flex" : "display: none"}">
                        <label>Mujer</label>
                        <input type="text" data-param-field="referencia-f" value="${escaparHtmlTexto(referencia.f)}" placeholder="Ej. 12-15" />
                    </div>
                    <div class="age-ranges-editor" style="${usaEdad ? "display: flex" : "display: none"}; flex-direction: column; gap: 12px; padding: 12px; background: var(--blue-pale); border-radius: 10px; border: 1px solid rgba(13, 95, 184, 0.12);">
                       <div style="display: flex; justify-content: space-between; align-items: center;">
                           <label style="margin: 0; font-weight: 700; color: var(--blue-dark);">Rangos por edad</label>
                           <button type="button" class="age-range-add-btn" data-param-field="age-range-add">+ Agregar rango</button>
                       </div>
                       <div class="age-ranges-list" data-param-field="age-ranges-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                           ${(referencia.edadValor ? parseAgeRanges(referencia.edadValor) : []).map((range, i) => `
                               <div class="age-range-item" data-range-index="${i}" style="display: grid; grid-template-columns: 80px 80px 1fr 30px; gap: 8px; align-items: center; padding: 8px; background: var(--white); border: 1px solid var(--border); border-radius: 8px;">
                                   <div>
                                       <label style="display: block; font-size: 10px; color: var(--muted); font-weight: 600; margin-bottom: 2px;">Desde</label>
                                       <input type="number" class="age-range-from" value="${range.from}" min="0" max="120" style="width: 100%; padding: 5px 7px; border: 1px solid var(--border); border-radius: 8px; font-size: 12px;" />
                                   </div>
                                   <div>
                                       <label style="display: block; font-size: 10px; color: var(--muted); font-weight: 600; margin-bottom: 2px;">Hasta</label>
                                       <input type="number" class="age-range-to" value="${range.to === '+' ? '' : range.to}" min="0" max="120" style="width: 100%; padding: 5px 7px; border: 1px solid var(--border); border-radius: 8px; font-size: 12px;" placeholder="o vacío" />
                                   </div>
                                   <div>
                                       <label style="display: block; font-size: 10px; color: var(--muted); font-weight: 600; margin-bottom: 2px;">Rango normal</label>
                                       <input type="text" class="age-range-value" value="${range.value}" placeholder="Ej. 12-16" style="width: 100%; padding: 5px 7px; border: 1px solid var(--border); border-radius: 8px; font-size: 12px;" />
                                   </div>
                                   <button type="button" class="age-range-remove-btn" style="width: 28px; height: 28px; padding: 0; background: #fdecec; color: #b03a30; border: 1px solid #f6d2d2; border-radius: 8px; cursor: pointer; font-weight: 600;">×</button>
                               </div>
                           `).join('')}
                       </div>
                       <input type="hidden" data-param-field="edad-valor" value="${escaparHtmlTexto(referencia.edadValor)}" />
                    </div>
                </div>
            </div>
        `;
    }).join("");

    const alternarCamposOpcionales = (fila, campoToggle, selectorCampos) => {
        const checkbox = fila.querySelector(campoToggle);
        const campos = fila.querySelectorAll(selectorCampos);
        const actualizar = () => {
            campos.forEach((campo) => {
                const contenedorCampo = campo.closest(".study-param-field");
                if (contenedorCampo) {
                    contenedorCampo.style.display = checkbox.checked ? "flex" : "none";
                }
            });
        };
        if (checkbox) {
            checkbox.addEventListener("change", actualizar);
            actualizar();
        }
    };

    contenedor.querySelectorAll(".study-param-row").forEach((fila) => {
        alternarCamposOpcionales(fila, '[data-param-field="usar-sexo"]', '[data-param-field="referencia-m"], [data-param-field="referencia-f"]');
        alternarCamposOpcionales(fila, '[data-param-field="usar-edad"]', '[data-param-field="age-range-add"]');
        inicializarEdadEventos(fila);
    });

    contenedor.querySelectorAll("[data-param-action='remove']").forEach((boton) => {
        boton.addEventListener("click", () => {
            const fila = boton.closest(".study-param-row");
            if (fila) fila.remove();
        });
    });
}

function abrirEditorEstudio(estudioId) {
    const idSolicitado = estudioId !== null && typeof estudioId !== "undefined" ? Number(estudioId) : null;
    estudioEnEdicionActual = idSolicitado;
    marcarFilaEstudioEnEdicion();
    let estudio = null;

    if (idSolicitado !== null && !Number.isNaN(idSolicitado)) {
        estudio = estudios.find((item) => Number(item.id) === idSolicitado) || null;
    }

    // El botón de eliminar solo se habilita al editar un estudio ya existente
    const estudioExistia = Boolean(estudio);

    if (!estudio) {
        const nuevoId = obtenerSiguienteIdEstudio();
        estudio = {
            id: nuevoId,
            nombre: "",
            muestra: "",
            precioSugerido: 0
        };
        estudios.push(estudio);
    }

    const plantilla = normalizarPlantillaEstudio(estudio.id, estudio.nombre, estudio.muestra);

    if (refs.estudioIdInput) refs.estudioIdInput.value = String(estudio.id);
    if (refs.estudioNombreInput) refs.estudioNombreInput.value = estudio.nombre || "";
    if (refs.estudioMuestraInput) refs.estudioMuestraInput.value = estudio.muestra || "";
    if (refs.estudioPrecioInput) refs.estudioPrecioInput.value = Number(estudio.precioSugerido || 0);
    // aplicar estado maquilado en el editor
    try { const maquChk = document.getElementById('estudio-maquilado'); if (maquChk) maquChk.checked = esMaquiladoValor(estudio.maquilado); } catch (e) { }

    renderEditorParametros(plantilla);

    const botonEliminar = document.getElementById("btn-eliminar-estudio");
    if (botonEliminar) {
        botonEliminar.hidden = !estudioExistia;
        botonEliminar.dataset.nombreEstudio = estudio.nombre || "";
    }
}

function agregarParametroVacio() {
    if (!refs.estudioParametrosEditor) return;

    const fila = document.createElement("div");
    fila.className = "study-param-row";
    fila.innerHTML = `
        <div class="study-param-row-header">
            <span class="study-param-tag">Parámetro nuevo</span>
            <button type="button" class="text-button" data-param-action="remove">Eliminar</button>
        </div>

        <div class="study-param-row-body">
            <div class="study-param-field">
                <label>Nombre</label>
                <input type="text" data-param-field="nombre" value="Nuevo parámetro" placeholder="Ej. Hemoglobina" />
            </div>
            <div class="study-param-field compact">
                <label>Tipo</label>
                <select data-param-field="tipo">
                    <option value="numero" selected>Número</option>
                    <option value="text">Texto</option>
                    <option value="textarea">Área</option>
                    <option value="select">Lista</option>
                    <option value="checkbox">Sí/No</option>
                </select>
            </div>
            <div class="study-param-field">
                <label>Unidad</label>
                <input type="text" data-param-field="unidad" value="" placeholder="Ej. g/dL" />
            </div>
            <div class="study-param-field wide">
                <label>Referencia base</label>
                <input type="text" data-param-field="referencia-base" value="" placeholder="Ej. 12-16 o 0-100" />
            </div>
        </div>

        <div class="study-param-reference">
            <div class="study-param-field checkbox-field">
                <label>Sexo</label>
                <label class="inline-toggle"><input type="checkbox" data-param-field="usar-sexo"> Usar rango por sexo</label>
            </div>
            <div class="study-param-field checkbox-field">
                <label>Edad</label>
                <label class="inline-toggle"><input type="checkbox" data-param-field="usar-edad"> Usar rangos por edad</label>
            </div>
            <div class="study-param-field" style="display: none">
                <label>Hombre</label>
                <input type="text" data-param-field="referencia-m" value="" placeholder="Ej. 13-17" />
            </div>
            <div class="study-param-field" style="display: none">
                <label>Mujer</label>
                <input type="text" data-param-field="referencia-f" value="" placeholder="Ej. 12-15" />
            </div>
            <div class="age-ranges-editor" style="display: none; flex-direction: column; gap: 12px; padding: 12px; background: var(--blue-pale); border-radius: 10px; border: 1px solid rgba(13, 95, 184, 0.12);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="margin: 0; font-weight: 700; color: var(--blue-dark);">Rangos por edad</label>
                    <button type="button" class="age-range-add-btn" data-param-field="age-range-add">+ Agregar rango</button>
                </div>
                <div class="age-ranges-list" data-param-field="age-ranges-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                </div>
                <input type="hidden" data-param-field="edad-valor" value="" />
            </div>
        </div>
    `;

    const boton = fila.querySelector("[data-param-action='remove']");
    boton.addEventListener("click", () => fila.remove());

    const alternarCamposOpcionales = (campoToggle, selectorCampos) => {
        const checkbox = fila.querySelector(campoToggle);
        const campos = fila.querySelectorAll(selectorCampos);
        if (!checkbox) return;
        const actualizar = () => {
            campos.forEach((campo) => {
                const contenedorCampo = campo.closest(".study-param-field");
                if (contenedorCampo) {
                    contenedorCampo.style.display = checkbox.checked ? "flex" : "none";
                }
            });
        };
        checkbox.addEventListener("change", actualizar);
        actualizar();
    };

    alternarCamposOpcionales('[data-param-field="usar-sexo"]', '[data-param-field="referencia-m"], [data-param-field="referencia-f"]');
    alternarCamposOpcionales('[data-param-field="usar-edad"]', '[data-param-field="age-range-add"]');
    
    inicializarEdadEventos(fila);

    // Quitar el mensaje de estado vacio al agregar el primer parametro
    const vacio = refs.estudioParametrosEditor.querySelector(".empty-parametros");
    if (vacio) vacio.remove();

    refs.estudioParametrosEditor.appendChild(fila);
    // Mantener a la vista la fila recien agregada (evita saltos bruscos)
    try { fila.scrollIntoView({ block: "nearest" }); } catch (e) { }
}

function agregarRangoEdad(fila) {
    const ageRangesList = fila.querySelector('[data-param-field="age-ranges-list"]');
    if (!ageRangesList) return;
    
    const nuevoRango = document.createElement('div');
    nuevoRango.className = 'age-range-item';
    nuevoRango.style.cssText = 'display: grid; grid-template-columns: 80px 80px 1fr 30px; gap: 8px; align-items: center; padding: 8px; background: var(--white); border: 1px solid var(--border); border-radius: 8px;';
    
    nuevoRango.innerHTML = `
        <div>
            <label style="display: block; font-size: 10px; color: var(--muted); font-weight: 600; margin-bottom: 2px;">Desde</label>
            <input type="number" class="age-range-from" value="0" min="0" max="120" style="width: 100%; padding: 5px 7px; border: 1px solid var(--border); border-radius: 8px; font-size: 12px;" />
        </div>
        <div>
            <label style="display: block; font-size: 10px; color: var(--muted); font-weight: 600; margin-bottom: 2px;">Hasta</label>
            <input type="number" class="age-range-to" value="" min="0" max="120" style="width: 100%; padding: 5px 7px; border: 1px solid var(--border); border-radius: 8px; font-size: 12px;" placeholder="o vacío" />
        </div>
        <div>
            <label style="display: block; font-size: 10px; color: var(--muted); font-weight: 600; margin-bottom: 2px;">Rango normal</label>
            <input type="text" class="age-range-value" value="" placeholder="Ej. 12-16" style="width: 100%; padding: 5px 7px; border: 1px solid var(--border); border-radius: 8px; font-size: 12px;" />
        </div>
        <button type="button" class="age-range-remove-btn" style="width: 28px; height: 28px; padding: 0; background: #fdecec; color: #b03a30; border: 1px solid #f6d2d2; border-radius: 8px; cursor: pointer; font-weight: 600;">×</button>
    `;
    
    ageRangesList.appendChild(nuevoRango);
    actualizarFormatoEdad(fila);
}

function actualizarFormatoEdad(fila) {
    const ageRangesList = fila.querySelector('[data-param-field="age-ranges-list"]');
    const edadValorInput = fila.querySelector('[data-param-field="edad-valor"]');
    
    if (!ageRangesList || !edadValorInput) return;
    
    const rangos = Array.from(ageRangesList.querySelectorAll('.age-range-item')).map(item => ({
        from: parseInt(item.querySelector('.age-range-from').value) || 0,
        to: item.querySelector('.age-range-to').value ? parseInt(item.querySelector('.age-range-to').value) : '+',
        value: item.querySelector('.age-range-value').value
    }));
    
    edadValorInput.value = generarFormatoEdad(rangos);
}

function inicializarEdadEventos(fila) {
    const ageRangesList = fila.querySelector('[data-param-field="age-ranges-list"]');
    const ageRangeAddBtn = fila.querySelector('[data-param-field="age-range-add"]');
    const usarEdadCheckbox = fila.querySelector('[data-param-field="usar-edad"]');
    const ageRangesEditor = fila.querySelector('.age-ranges-editor');
    
    if (!ageRangesList || !ageRangeAddBtn || !usarEdadCheckbox) return;
    
    // Mostrar/ocultar editor según el checkbox
    usarEdadCheckbox.addEventListener('change', () => {
        if (ageRangesEditor) {
            ageRangesEditor.style.display = usarEdadCheckbox.checked ? 'flex' : 'none';
        }
    });
    
    // Botón agregar rango
    ageRangeAddBtn.addEventListener('click', () => agregarRangoEdad(fila));
    
    // Event listener para eliminar rangos y actualizar formato
    ageRangesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('age-range-remove-btn')) {
            e.target.closest('.age-range-item').remove();
            actualizarFormatoEdad(fila);
        }
    });
    
    ageRangesList.addEventListener('change', () => {
        actualizarFormatoEdad(fila);
    });
}

var estudioEnEdicionActual = null;
function marcarFilaEstudioEnEdicion() {
    document.querySelectorAll(".study-catalog-row").forEach((fila) => {
        fila.classList.toggle("is-editing", fila.dataset.estudioId === String(estudioEnEdicionActual));
    });
}

function renderCatalogoEstudios() {
    if (!refs.estudioTableBody) return;

    const criterio = normalizarTexto(refs.estudioBuscar ? refs.estudioBuscar.value : "");
    const estudiosFiltrados = estudios.filter((estudio) => {
        if (!criterio) return true;
        return normalizarTexto(estudio.nombre).includes(criterio) || normalizarTexto(estudio.muestra).includes(criterio);
    });

    // Limpiar ambas tablas
    const vacio = '<tr><td colspan="4" class="empty-row">No hay estudios que coincidan con la búsqueda.</td></tr>';
    const tablaNormal = refs.estudioTableBody;
    const tablaMaquilado = refs.estudioTableMaquiladoBody;
    if (tablaNormal) tablaNormal.innerHTML = "";
    if (tablaMaquilado) tablaMaquilado.innerHTML = "";

    let cuentaNormal = 0;
    let cuentaMaquilado = 0;

    estudiosFiltrados.forEach((estudio) => {
        const plantilla = normalizarPlantillaEstudio(estudio.id, estudio.nombre, estudio.muestra);
        const totalParametros = (plantilla.grupos || []).reduce((total, grupo) => total + (Array.isArray(grupo.parametros) ? grupo.parametros.length : 0), 0);
        const fila = document.createElement("tr");
        fila.className = "study-catalog-row";
        fila.dataset.estudioId = String(estudio.id);
        fila.innerHTML = `
            <td>
                <button type="button" class="study-link-button" data-estudio-id="${estudio.id}">${escaparHtmlTexto(estudio.nombre)}</button>
            </td>
            <td><span class="study-muestra">${escaparHtmlTexto(estudio.muestra || "-")}</span></td>
            <td class="col-precio">${moneda(estudio.precioSugerido || 0)}</td>
            <td class="col-params"><span class="param-count${totalParametros ? "" : " param-count-none"}">${totalParametros}</span></td>
        `;

        fila.querySelector(".study-link-button").addEventListener("click", () => abrirEditorEstudio(estudio.id));

        if (esMaquiladoValor(estudio.maquilado)) {
            if (tablaMaquilado) { tablaMaquilado.appendChild(fila); cuentaMaquilado++; }
        } else {
            if (tablaNormal) { tablaNormal.appendChild(fila); cuentaNormal++; }
        }
    });

    if (tablaNormal && !cuentaNormal) tablaNormal.innerHTML = vacio;
    if (tablaMaquilado && !cuentaMaquilado) tablaMaquilado.innerHTML = vacio;

    // Contadores por seccion
    const encabezados = document.querySelectorAll(".study-catalog-table-wrap h3");
    if (encabezados[0]) encabezados[0].textContent = "Estudios (" + cuentaNormal + ")";
    if (encabezados[1]) encabezados[1].textContent = "Estudios maquilados (" + cuentaMaquilado + ")";

    marcarFilaEstudioEnEdicion();
}

async function guardarEstudioDesdeEditor() {
    if (!refs.estudioNombreInput || !refs.estudioMuestraInput || !refs.estudioPrecioInput) return;

    const estudioId = Number(refs.estudioIdInput ? refs.estudioIdInput.value : 0) || obtenerSiguienteIdEstudio();
    const nombre = refs.estudioNombreInput.value.trim() || "Nuevo estudio";
    const muestra = refs.estudioMuestraInput.value.trim() || "Sin muestra";
    const precio = Number(refs.estudioPrecioInput.value) || 0;
    const maquilado = !!document.getElementById('estudio-maquilado') && document.getElementById('estudio-maquilado').checked;

    // Validar que el estudio no sea duplicado por nombre
    const estudioExistente = estudios.find((item) => Number(item.id) === estudioId);
    const duplicadoPorNombre = estudios.find((item) => 
        Number(item.id) !== estudioId && 
        normalizarTexto(item.nombre) === normalizarTexto(nombre)
    );

    if (duplicadoPorNombre) {
        alert(`Ya existe un estudio con el nombre "${nombre}". Por favor, usa otro nombre.`);
        return;
    }

    let estudio = estudioExistente;
    if (!estudio) {
        estudio = { id: estudioId, nombre, muestra, precioSugerido: precio, maquilado };
        estudios.push(estudio);
    } else {
        estudio.nombre = nombre;
        estudio.muestra = muestra;
        estudio.precioSugerido = precio;
        estudio.maquilado = maquilado;
    }

    const parametros = [];
    if (refs.estudioParametrosEditor) {
        refs.estudioParametrosEditor.querySelectorAll(".study-param-row").forEach((fila) => {
            const nombreParametro = fila.querySelector('[data-param-field="nombre"]')?.value.trim();
            if (!nombreParametro) return;

            const tipo = fila.querySelector('[data-param-field="tipo"]')?.value || "numero";
            const unidad = fila.querySelector('[data-param-field="unidad"]')?.value.trim() || "";
            const referencia = serializarReferenciaDesdeFila(fila);
            const opcionesTexto = fila.querySelector('[data-param-field="opciones"]')?.value || "";
            const opciones = opcionesTexto
                .split(",")
                .map((valor) => valor.trim())
                .filter(Boolean);

            const parametro = {
                nombre: nombreParametro,
                tipo,
                unidad,
                referencia,
            };

            if (opciones.length) parametro.opciones = opciones;
            parametros.push(parametro);
        });
    }

    const plantilla = {
        nombre,
        membrete: "general",
        grupos: [{ nombre: "PARÁMETROS", parametros }],
        observaciones: ""
    };

    // Actualizar plantillas localmente para que el editor las use de inmediato
    plantillas[estudioId] = plantilla;

    // Intentar persistir el estudio y la plantilla en el servidor (si está disponible)
    try {        const resp = await fetch('/api/estudios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: estudio.id, nombre: estudio.nombre, muestra: estudio.muestra, precioSugerido: estudio.precioSugerido, maquilado: esMaquiladoValor(estudio.maquilado) })
        });
        if (resp.ok) {
            const saved = await resp.json();
            // Asegurar que el id local coincide con el del servidor (si fue reasignado)
            estudio.id = saved.id ?? estudio.id;
            // Asegurar que la bandera maquilado se sincronice con el servidor
            if (typeof saved.maquilado !== 'undefined') estudio.maquilado = esMaquiladoValor(saved.maquilado);
        }
    } catch (e) {
        console.warn('No se pudo persistir estudio en el servidor:', e);
    }

    try {
        // Enviar la plantilla asociada al servidor (server acepta { "<id>": plantilla } o { id, plantilla })
        const resp2 = await fetch('/api/plantillas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [estudio.id]: plantilla })
        });
        if (resp2.ok) {
            // opcional: actualizar plantillas con lo que el servidor responda
            const saved = await resp2.json();
            if (saved && typeof saved === 'object') {
                Object.keys(saved).forEach(k => { plantillas[k] = saved[k]; });
            }
        }
    } catch (e) {
        console.warn('No se pudo persistir plantilla en el servidor:', e);
    }

    renderCatalogoEstudios();
    renderEstudios();
    abrirEditorEstudio(estudio.id);
}

/**
 * Elimina desde el editor el estudio actualmente cargado.
 * Requiere doble confirmación antes de aplicar el cambio:
 * 1) confirm() explicativo de consecuencias; 2) prompt donde el usuario debe
 * escribir "ELIMINAR". Solo visible cuando se edita un estudio existente.
 */
async function eliminarEstudioDesdeEditor() {
    const botonEliminar = document.getElementById("btn-eliminar-estudio");
    if (botonEliminar && botonEliminar.hidden) return;

    const valorId = refs.estudioIdInput && refs.estudioIdInput.value ? Number(refs.estudioIdInput.value) : NaN;
    if (Number.isNaN(valorId)) return;

    const nombreObtenido = (botonEliminar && botonEliminar.dataset.nombreEstudio)
        || (refs.estudioNombreInput && refs.estudioNombreInput.value)
        || "";
    const etiqueta = nombreObtenido && nombreObtenido.trim()
        ? `"${nombreObtenido.trim()}"`
        : `con ID ${valorId}`;

    // Primera confirmación: advertencia general
    if (!window.confirm(`¿Deseas eliminar el estudio ${etiqueta} del catálogo?\n\nTambién se borrará su plantilla de resultados. Esta acción no se puede deshacer.`)) {
        return;
    }

    // Segunda confirmación: verificación escrita explícita
    const respuesta = window.prompt(`Confirma escribiendo "ELIMINAR" para borrar definitivamente el estudio ${etiqueta}:`);
    if (!respuesta || respuesta.trim().toUpperCase() !== "ELIMINAR") {
        alert("La eliminación fue cancelada: la palabra clave no coincide.");
        return;
    }

    // Persistir la eliminación en el servidor (mejor esfuerzo; igual funciona en memoria)
    try {
        await fetch(`/api/estudios/${encodeURIComponent(String(valorId))}`, { method: "DELETE" });
    } catch (error) {
        console.warn("No se pudo eliminar el estudio en el servidor:", error);
    }

    try {
        await fetch(`/api/plantillas/${encodeURIComponent(String(valorId))}`, { method: "DELETE" });
    } catch (error) {
        console.warn("No se pudo eliminar la plantilla en el servidor:", error);
    }

    // Reflejar los cambios en memoria
    const indice = estudios.findIndex((item) => Number(item.id) === valorId);
    if (indice >= 0) estudios.splice(indice, 1);
    if (plantillas && typeof plantillas === "object") delete plantillas[valorId];

    // Recargar catálogos y regresar el editor a modo de captura nueva
    renderCatalogoEstudios();
    renderEstudios();
    abrirEditorEstudio(null);
}

function renderFechaActual() {
    if (!refs.fechaActual) return;
    const ahora = new Date();
    refs.fechaActual.textContent = ahora.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function obtenerAjustesOrden(orden) {
    if (Array.isArray(orden?.ajustes) && orden.ajustes.length) {
        return orden.ajustes.map((ajuste, index) => ({
            id: ajuste?.id ?? `ajuste-${index}`,
            monto: Number(ajuste?.monto ?? 0),
            valor: Number(ajuste?.valor ?? (-Math.abs(Number(ajuste?.monto ?? 0)))),
            concepto: ajuste?.concepto || 'Ajuste',
            fecha: ajuste?.fecha || ajuste?.createdAt || orden?.updatedAt || orden?.fecha || new Date().toISOString()
        }));
    }

    const ajusteBase = Number(orden?.ajusteGanancia ?? orden?.gananciaAjuste ?? 0);
    if (ajusteBase === 0) return [];

    return [{
        id: `ajuste-${orden?.folio || 'manual'}`,
        monto: Math.abs(ajusteBase),
        valor: ajusteBase,
        concepto: 'Ajuste manual',
        fecha: orden?.updatedAt || orden?.fecha || new Date().toISOString()
    }];
}

function obtenerGananciaOrden(orden) {
    const cobro = Number(orden.pago?.total ?? 0);
    const ajuste = Number(orden.ajusteGanancia ?? orden.gananciaAjuste ?? obtenerAjustesOrden(orden).reduce((total, item) => total + Number(item.valor ?? 0), 0) ?? 0);
    return cobro + ajuste;
}

function registrarAjusteGanancia(orden, monto, concepto) {
    if (!orden || !Number.isFinite(Number(monto)) || Number(monto) <= 0) return null;

    const cantidad = Number(monto);
    const valor = -Math.abs(cantidad);
    const detalleAjuste = {
        id: `ajuste-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        monto: cantidad,
        valor,
        concepto: String(concepto || 'Ajuste de ganancia').trim() || 'Ajuste de ganancia',
        fecha: new Date().toISOString()
    };

    const ajustes = Array.isArray(orden.ajustes) ? orden.ajustes : [];
    ajustes.push(detalleAjuste);
    orden.ajustes = ajustes;
    orden.ajusteGanancia = ajustes.reduce((total, ajuste) => total + Number(ajuste.valor ?? 0), 0);
    orden.ganancia = Number(orden.pago?.total ?? 0) + Number(orden.ajusteGanancia ?? 0);
    orden.updatedAt = new Date().toISOString();
    orden.historial = orden.historial || { eventos: [] };
    orden.historial.ultimaAccion = 'ajuste';
    orden.historial.eventos.push({
        tipo: 'ajuste',
        fecha: orden.updatedAt,
        detalle: `${detalleAjuste.concepto}: ${moneda(cantidad)} descontado de la ganancia`
    });
    return detalleAjuste;
}

function obtenerRangoReporte(periodo = 'diario', mesReporte = '') {
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setHours(23, 59, 59, 999);

    const inicio = new Date(fin);

    if (periodo === 'semanal') {
        inicio.setDate(fin.getDate() - 6);
        inicio.setHours(0, 0, 0, 0);
    } else if (periodo === 'mensual') {
        const mes = mesReporte ? new Date(`${mesReporte}-01T00:00:00`) : new Date(fin.getFullYear(), fin.getMonth(), 1);
        inicio.setTime(new Date(mes.getFullYear(), mes.getMonth(), 1, 0, 0, 0, 0).getTime());
        fin.setTime(new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59, 999).getTime());
    } else {
        inicio.setHours(0, 0, 0, 0);
    }

    return { inicio, fin };
}

function obtenerOrdenesDelPeriodo(periodo = 'diario', mesReporte = '') {
    const { inicio, fin } = obtenerRangoReporte(periodo, mesReporte);
    return ordenes.filter((orden) => {
        const fechaOrden = new Date(orden.fecha || orden.createdAt || Date.now());
        return fechaOrden >= inicio && fechaOrden <= fin;
    });
}

function exportarReporteExcel(periodo = 'diario', mesReporte = '') {
    if (!window.XLSX) {
        alert('La exportación a Excel no está disponible en este navegador.');
        return;
    }

    if (periodo === 'mensual' && !mesReporte) {
        alert('Selecciona el mes para exportar el reporte mensual.');
        return;
    }

    const { inicio, fin } = obtenerRangoReporte(periodo, mesReporte);
    const ordenesReporte = obtenerOrdenesDelPeriodo(periodo, mesReporte);
    const filas = ordenesReporte.map((orden) => {
        const paciente = `${orden.paciente?.nombre ?? ''} ${orden.paciente?.apellidoPaterno ?? ''} ${orden.paciente?.apellidoMaterno ?? ''}`.trim();
        const fecha = new Date(orden.fecha || orden.createdAt || Date.now()).toLocaleDateString('es-MX');
        const total = Number(orden.pago?.total ?? 0);
        const ganancia = obtenerGananciaOrden(orden);
        const estado = orden.estado === ESTADOS_ORDEN.POR_ENTREGAR ? 'Por entregar' : orden.estado === ESTADOS_ORDEN.ENTREGADA ? 'Entregada' : 'Por capturar';
        return {
            Folio: orden.folio || '',
            Paciente: paciente || 'Sin nombre',
            Fecha: fecha,
            Estudios: (orden.estudios || []).map((estudio) => estudio.nombre).join(', '),
            Cobro: total,
            Ganancia: ganancia,
            Estado: estado,
            Ajuste: Number(orden.ajusteGanancia ?? orden.gananciaAjuste ?? 0),
        };
    });

    const totalOrdenes = filas.length;
    const totalCobro = filas.reduce((suma, fila) => suma + Number(fila.Cobro || 0), 0);
    const totalGanancia = filas.reduce((suma, fila) => suma + Number(fila.Ganancia || 0), 0);
    const totalAjustes = filas.reduce((suma, fila) => suma + Number(fila.Ajuste || 0), 0);

    const nombrePeriodo = periodo === 'diario'
        ? 'Reporte del día'
        : periodo === 'semanal'
            ? 'Reporte semanal'
            : 'Reporte mensual';

    const hoja = XLSX.utils.aoa_to_sheet([
        [nombrePeriodo],
        [`Periodo: ${inicio.toLocaleDateString('es-MX')} - ${fin.toLocaleDateString('es-MX')}`],
        [],
        ['Folio', 'Paciente', 'Fecha', 'Estudios', 'Cobro', 'Ganancia', 'Estado', 'Ajuste']
    ]);

    const filasSheet = filas.map((fila) => [
        fila.Folio,
        fila.Paciente,
        fila.Fecha,
        fila.Estudios,
        fila.Cobro,
        fila.Ganancia,
        fila.Estado,
        fila.Ajuste,
    ]);
    XLSX.utils.sheet_add_aoa(hoja, filasSheet, { origin: 'A5' });

    const resumenFila = 5 + filasSheet.length + 2;
    XLSX.utils.sheet_add_aoa(hoja, [
        ['Estadísticas finales'],
        ['Total de órdenes', totalOrdenes],
        ['Total cobrado', totalCobro],
        ['Total ganancia', totalGanancia],
        ['Total ajustes', totalAjustes],
        ['Promedio por orden', totalOrdenes ? totalCobro / totalOrdenes : 0]
    ], { origin: `A${resumenFila}` });

    hoja['!cols'] = [
        { wch: 16 },
        { wch: 30 },
        { wch: 14 },
        { wch: 38 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 }
    ];
    hoja['!freeze'] = { xSplit: 0, ySplit: 4 };

    const estiloTitulo = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
        fill: { fgColor: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };
    const estiloSubtitulo = {
        font: { bold: true, color: { rgb: '1F1F1F' }, sz: 10 },
        fill: { fgColor: { rgb: 'EAF2F8' } },
        alignment: { horizontal: 'left' }
    };
    const estiloCabecera = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        fill: { fgColor: { rgb: '2F75B5' } },
        border: {
            top: { style: 'thin', color: { rgb: 'D9E2F3' } },
            bottom: { style: 'thin', color: { rgb: 'D9E2F3' } },
            left: { style: 'thin', color: { rgb: 'D9E2F3' } },
            right: { style: 'thin', color: { rgb: 'D9E2F3' } }
        },
        alignment: { horizontal: 'center', vertical: 'center' }
    };
    const estiloResumenTitulo = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
        fill: { fgColor: { rgb: '5B9BD5' } },
        alignment: { horizontal: 'center' }
    };
    const estiloResumen = {
        font: { bold: true, color: { rgb: '1F1F1F' }, sz: 10 },
        fill: { fgColor: { rgb: 'F2F2F2' } },
        border: {
            top: { style: 'thin', color: { rgb: 'D9D9D9' } },
            bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
            left: { style: 'thin', color: { rgb: 'D9D9D9' } },
            right: { style: 'thin', color: { rgb: 'D9D9D9' } }
        }
    };

    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'].forEach((celda) => {
        if (hoja[celda]) hoja[celda].s = estiloTitulo;
    });

    ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2'].forEach((celda) => {
        if (hoja[celda]) hoja[celda].s = estiloSubtitulo;
    });

    ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4'].forEach((celda) => {
        if (hoja[celda]) hoja[celda].s = estiloCabecera;
    });

    const resumenTituloCell = `A${resumenFila}`;
    const resumenLabelCells = [`A${resumenFila + 1}`, `A${resumenFila + 2}`, `A${resumenFila + 3}`, `A${resumenFila + 4}`, `A${resumenFila + 5}`];
    const resumenValueCells = [`B${resumenFila + 1}`, `B${resumenFila + 2}`, `B${resumenFila + 3}`, `B${resumenFila + 4}`, `B${resumenFila + 5}`];

    if (hoja[resumenTituloCell]) hoja[resumenTituloCell].s = estiloResumenTitulo;
    resumenLabelCells.forEach((celda) => { if (hoja[celda]) hoja[celda].s = estiloResumen; });
    resumenValueCells.forEach((celda) => { if (hoja[celda]) hoja[celda].s = estiloResumen; });

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
    XLSX.writeFile(libro, `reporte-${periodo}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function cerrarDetalleHistorial() {
    const modal = document.getElementById("modal-historial-detalle");
    if (modal) {
        modal.classList.remove("is-open");
        modal.classList.add("hidden");
    }
}

function mostrarModalAjusteGanancia(orden) {
    const modal = document.getElementById("modal-ajuste-ganancia");
    const title = document.getElementById("ajuste-ganancia-title");
    if (!modal || !title || !orden) return;

    modal.dataset.folio = orden.folio || "";
    title.textContent = orden.folio || "Orden";
    const montoInput = document.getElementById("ajuste-ganancia-monto");
    const conceptoInput = document.getElementById("ajuste-ganancia-concepto");
    if (montoInput) montoInput.value = "";
    if (conceptoInput) conceptoInput.value = "";
    modal.classList.remove("hidden");
    modal.classList.add("is-open");
}

function cerrarModalAjusteGanancia() {
    const modal = document.getElementById("modal-ajuste-ganancia");
    if (modal) {
        modal.classList.remove("is-open");
        modal.classList.add("hidden");
    }
}

async function guardarAjusteGanancia(evento) {
    evento.preventDefault();

    const modal = document.getElementById("modal-ajuste-ganancia");
    const folio = modal?.dataset.folio;
    const orden = ordenes.find((item) => item.folio === folio);
    if (!orden) return;

    const montoInput = document.getElementById("ajuste-ganancia-monto");
    const conceptoInput = document.getElementById("ajuste-ganancia-concepto");
    const monto = Number(montoInput?.value ?? 0);
    const concepto = String(conceptoInput?.value ?? "").trim();

    if (!Number.isFinite(monto) || monto <= 0) {
        alert('Ingresa un monto válido mayor a cero.');
        return;
    }

    if (!concepto) {
        alert('Escribe un concepto para el ajuste.');
        return;
    }

    registrarAjusteGanancia(orden, monto, concepto);
    await persistirOrdenServidor(orden);
    cerrarModalAjusteGanancia();
    renderizarTablero();
    renderHistorial();
}

function reimprimirOrdenDesdeDetalle() {
    const modal = document.getElementById("modal-historial-detalle");
    if (!modal || !modal.dataset.ordenFolio) return;

    const orden = ordenes.find((item) => item.folio === modal.dataset.ordenFolio);
    if (!orden) return;

    if (typeof window.imprimirResultados === 'function') {
        window.imprimirResultados(orden);
    }
}

async function persistirOrdenServidor(orden) {
    if (!orden || !orden.folio) return null;

    const identificador = orden.id ?? orden.folio;
    const payload = normalizarOrden({ ...orden, updatedAt: new Date().toISOString() });

    try {
        const resp = await fetch(`/api/ordenes/${encodeURIComponent(identificador)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const error = await resp.text().catch(() => '');
            throw new Error(error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        return normalizarOrden(data);
    } catch (err) {
        console.warn('No se pudo sincronizar la orden con el servidor:', err);
        return null;
    }
}

function abrirDetalleHistorial(orden) {
    const modal = document.getElementById("modal-historial-detalle");
    const title = document.getElementById("history-detail-title");
    const content = document.getElementById("history-detail-content");
    if (!modal || !title || !content || !orden) return;

    modal.dataset.ordenFolio = orden.folio || "";
    modal.classList.remove("hidden");

    const paciente = `${orden.paciente?.nombre ?? ""} ${orden.paciente?.apellidoPaterno ?? ""} ${orden.paciente?.apellidoMaterno ?? ""}`.trim() || "Sin nombre";
    const fecha = new Date(orden.fecha || orden.createdAt || Date.now());
    const estudios = (orden.estudios ?? []).map((estudio) => {
        const precio = Number(estudio.precioCobrado ?? estudio.precio ?? 0);
        const resultados = Array.isArray(estudio.resultados) && estudio.resultados.length
            ? `<small>Resultados: ${estudio.resultados.length}</small>`
            : '<small>Sin resultados</small>';
        return `
            <li>
                <div><strong>${estudio.nombre || "Estudio"}</strong></div>
                <div>${resultados}</div>
                <div>${moneda(precio)}</div>
            </li>
        `;
    }).join("") || "<li>Sin estudios registrados.</li>";
    const ajustes = obtenerAjustesOrden(orden);
    const ajustesHtml = ajustes.length
        ? `<ul class="history-detail-list">${ajustes.map((ajuste) => `
            <li>
                <div><strong>${escaparHtmlTexto(ajuste.concepto || "Ajuste")}</strong></div>
                <small>${new Date(ajuste.fecha || Date.now()).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })} · ${moneda(Math.abs(Number(ajuste.monto ?? 0)))}</small>
            </li>
        `).join("")}</ul>`
        : '<p class="empty-row">Sin ajustes de ganancia.</p>';

    const estadoNormalizado = normalizarEstadoOrden(orden.estado);
    const estadoTexto = estadoNormalizado === ESTADOS_ORDEN.POR_ENTREGAR ? "Por entregar" : estadoNormalizado === ESTADOS_ORDEN.ENTREGADA ? "Entregada" : "Por capturar";
    const total = Number(orden.pago?.total ?? 0);
    const pagado = Number(orden.pago?.pagado ?? orden.pago?.total ?? 0);
    const saldo = Number(orden.pago?.saldo ?? Math.max(0, total - pagado));

    title.textContent = `${orden.folio || "Orden"}`;
    content.innerHTML = `
        <div class="history-detail-grid">
            <div>
                <span class="detail-label">Paciente</span>
                <strong>${paciente}</strong>
            </div>
            <div>
                <span class="detail-label">Fecha</span>
                <strong>${fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
            </div>
            <div>
                <span class="detail-label">Estado</span>
                <strong>${estadoTexto}</strong>
            </div>
            <div>
                <span class="detail-label">Cobro</span>
                <strong>${moneda(total)}</strong>
            </div>
            <div>
                <span class="detail-label">Pagado</span>
                <strong>${moneda(pagado)}</strong>
            </div>
            <div>
                <span class="detail-label">Saldo</span>
                <strong>${moneda(saldo)}</strong>
            </div>
        </div>
        <div class="history-detail-section">
            <span class="detail-label">Estudios</span>
            <ul class="history-detail-list">${estudios}</ul>
        </div>
        <div class="history-detail-section">
            <span class="detail-label">Ajustes</span>
            ${ajustesHtml}
        </div>
    `;

    modal.classList.add("is-open");

    const reimprimirBtn = document.getElementById("btn-reimprimir-historial");
    if (reimprimirBtn) {
        reimprimirBtn.onclick = () => reimprimirOrdenDesdeDetalle();
    }
}

function renderHistorial() {
    if (!refs.historyTableBody) return;

    const periodoActual = refs.filtroReporte ? refs.filtroReporte.value : 'diario';
    const mesReporte = refs.mesReporte ? refs.mesReporte.value : '';
    const busqueda = (refs.historialBuscar?.value || "").trim().toLowerCase();
        const ordenesPeriodo = obtenerOrdenesDelPeriodo(periodoActual, mesReporte);
    const ordenesOrdenadas = [...ordenesPeriodo].sort((a, b) => {
        const fechaA = new Date(a.fecha || a.createdAt || 0).getTime();
        const fechaB = new Date(b.fecha || b.createdAt || 0).getTime();
        return fechaB - fechaA;
    });

    const ordenesFiltradas = busqueda
        ? ordenesOrdenadas.filter((orden) => {
            const paciente = `${orden.paciente?.nombre ?? ""} ${orden.paciente?.apellidoPaterno ?? ""} ${orden.paciente?.apellidoMaterno ?? ""}`.trim().toLowerCase();
            return paciente.includes(busqueda) || (orden.folio || "").toLowerCase().includes(busqueda);
        })
        : ordenesOrdenadas;

    refs.historyTableBody.innerHTML = "";
    const totalOrdenes = ordenesFiltradas.length;
    const pacientesUnicos = new Set(ordenesFiltradas.map((orden) => {
        const paciente = orden.paciente || {};
        return `${paciente.nombre ?? ""}-${paciente.apellidoPaterno ?? ""}-${paciente.apellidoMaterno ?? ""}`.toLowerCase();
    }).filter(Boolean)).size;
    const ingresos = ordenesFiltradas.reduce((acumulado, orden) => acumulado + Number(orden.pago?.total ?? 0), 0);

    const totalOrdenesEl = document.getElementById("history-total-ordenes");
    const totalPacientesEl = document.getElementById("history-total-pacientes");
    const totalIngresosEl = document.getElementById("history-total-ingresos");
    const totalIngresosLabelEl = document.getElementById("history-total-ingresos-label");

    if (totalIngresosLabelEl) {
        totalIngresosLabelEl.textContent = 'Ingresos del día';
    }

    if (totalOrdenesEl) totalOrdenesEl.textContent = String(totalOrdenes);
    if (totalPacientesEl) totalPacientesEl.textContent = String(pacientesUnicos);
    if (totalIngresosEl) totalIngresosEl.textContent = moneda(ingresos);

    if (!totalOrdenes) {
        refs.historyEmpty.style.display = "block";
        return;
    }

    refs.historyEmpty.style.display = "none";

    ordenesFiltradas.forEach((orden) => {
        const fila = document.createElement("tr");
        const paciente = `${orden.paciente?.nombre ?? ""} ${orden.paciente?.apellidoPaterno ?? ""} ${orden.paciente?.apellidoMaterno ?? ""}`.trim();
        const estudios = (orden.estudios ?? []).length;
        const total = Number(orden.pago?.total ?? 0);
        const ganancia = obtenerGananciaOrden(orden);
        const estadoNormalizado = normalizarEstadoOrden(orden.estado);
        const estadoTexto = estadoNormalizado === ESTADOS_ORDEN.POR_ENTREGAR ? "Por entregar" : estadoNormalizado === ESTADOS_ORDEN.ENTREGADA ? "Entregada" : "Por capturar";
        const estadoClase = estadoNormalizado === ESTADOS_ORDEN.POR_ENTREGAR ? "status-green" : estadoNormalizado === ESTADOS_ORDEN.ENTREGADA ? "status-gray" : "status-blue";

        const fechaOrden = new Date(orden.fecha || orden.createdAt || Date.now());
        const fechaLabel = fechaOrden.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const horaLabel = fechaOrden.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });

        fila.innerHTML = `
            <td><span class="history-folio-badge">${orden.folio || "Sin folio"}</span></td>
            <td>
                <div class="history-patient-cell">
                    <span class="history-patient-name">${paciente || "Sin nombre"}</span>
                    <small class="history-patient-meta">${estudios} estudio${estudios === 1 ? "" : "s"}</small>
                </div>
            </td>
            <td>
                <div class="history-date-cell">
                    <span>${fechaLabel}</span>
                    <small>${horaLabel}</small>
                </div>
            </td>
            <td><span class="history-study-pill">${estudios}</span></td>
            <td><div class="history-money"><strong>${moneda(total)}</strong></div></td>
            <td><div class="history-money history-money-gain"><strong>${moneda(ganancia)}</strong></div></td>
            <td><span class="history-status ${estadoClase}">${estadoTexto}</span></td>
            <td>
                <div class="history-actions-cell">
                    <button type="button" class="history-print-button" data-folio="${orden.folio}" data-accion="imprimir">PDF</button>
                </div>
            </td>
        `;

        fila.addEventListener("click", (evento) => {
            if (evento.target.closest("button")) return;
            abrirDetalleHistorial(orden);
        });

        const printButton = fila.querySelector(".history-print-button");
        printButton?.addEventListener("click", (evento) => {
            evento.stopPropagation();
            if (typeof window.imprimirResultados === 'function') {
                window.imprimirResultados(orden);
            }
        });

        refs.historyTableBody.appendChild(fila);
    });
}

async function guardarOrden() {
    // Sincronizar datos del paciente desde el formulario a ordenActual
    ordenActual.paciente.nombre = String(document.getElementById("nombre").value || "").trim();
    ordenActual.paciente.apellidoPaterno = String(document.getElementById("apellido-paterno").value || "").trim();
    ordenActual.paciente.apellidoMaterno = String(document.getElementById("apellido-materno").value || "").trim();
    ordenActual.paciente.sexo = document.getElementById("sexo").value;
    ordenActual.paciente.telefono = String(document.getElementById("telefono").value || "").trim();
    ordenActual.paciente.contacto = String(document.getElementById("contacto").value || "").trim();

    // No debe existir una orden sin estudios en ningún punto del flujo.
    if (!Array.isArray(ordenActual.estudios) || ordenActual.estudios.length === 0) {
        alert("La orden debe incluir al menos un estudio antes de guardarse.");
        return;
    }

    if (!ordenActual.paciente.nombre) {
        alert("Para guardar la orden debe completar al menos el nombre del paciente.");
        return;
    }

    const pacienteCatalogado = await guardarPacienteEnCatalogo(ordenActual.paciente, { silentDuplicate: Boolean(ordenActual.paciente?.id) });
    ordenActual.paciente = { ...ordenActual.paciente, ...pacienteCatalogado };
    
    // Asignar folio y fecha justo antes de guardar (el servidor puede devolver un folio definitivo)
    ordenActual.folio = generarNuevoFolio();
    ordenActual.fecha = new Date().toISOString();
    ordenActual.createdAt = ordenActual.fecha;
    ordenActual.updatedAt = ordenActual.fecha;
    ordenActual.pago.total = ordenActual.estudios.reduce((acumulado, estudio) => acumulado + estudio.precioCobrado, 0);
    ordenActual.pago.pagado = Number.isFinite(Number(refs.pago.value)) ? Number(refs.pago.value) : 0;
    ordenActual.pago.saldo = Math.max(0, ordenActual.pago.total - ordenActual.pago.pagado);
    ordenActual.ajusteGanancia = Number(ordenActual.ajusteGanancia ?? 0);
    ordenActual.ganancia = ordenActual.pago.total + ordenActual.ajusteGanancia;

    // 1. Validar que haya un paciente y al menos un estudio.
    if (!ordenActual.paciente.nombre || ordenActual.estudios.length === 0) {
        alert("Por favor, complete los datos del paciente y agregue al menos un estudio.");
        return;
    }

    // 2. Clonar la orden actual y normalizarla para enviar al servidor
    const nuevaOrden = normalizarOrden(structuredClone(ordenActual));
    nuevaOrden.ajusteGanancia = Number(nuevaOrden.ajusteGanancia ?? 0);
    nuevaOrden.ganancia = nuevaOrden.pago.total + nuevaOrden.ajusteGanancia;

    // Intentar persistir en el servidor. Si falla, guardar en memoria como respaldo.
    let ordenGuardada = null;
    try {
        const resp = await fetch('/api/ordenes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaOrden)
        });

        if (resp.ok) {
            const data = await resp.json();
            ordenGuardada = normalizarOrden({ ...nuevaOrden, ...(data || {}) });
        } else {
            console.warn('Error al guardar orden en el servidor:', resp.statusText);
        }
    } catch (err) {
        console.warn('No se pudo conectar con el servidor, guardando en memoria:', err);
    }

    // Si no se obtuvo respuesta válida del servidor, usar la orden localmente.
    if (!ordenGuardada) {
        ordenGuardada = nuevaOrden;
    }

    ordenes.push(ordenGuardada);
    proximoFolio = Math.max(proximoFolio, extraerNumeroFolio(ordenGuardada.folio) + 1);

    // 3. Renderizar el tablero y historial actualizado
    renderizarTablero();
    renderHistorial();

    // 4. Limpiar el formulario para la siguiente orden
    refs.formOrden.reset();
    nuevoPaciente();
    ordenActual.estudios = [];
    ordenActual.folio = null;
    ordenActual.fecha = null;
    ordenActual.createdAt = null;
    ordenActual.updatedAt = null;
    ordenActual.estado = ESTADOS_ORDEN.POR_CAPTURAR;
    ordenActual.pago = { total: 0, pagado: 0, saldo: 0 };
    ordenActual.ajusteGanancia = 0;
    ordenActual.ganancia = 0;
    actualizarCobro();
    renderEstudios();
}

/**
 * Inicializa todos los event listeners de la aplicación.
 */
function inicializarListeners() {
    refs.buscarPaciente.addEventListener("input", () => {
        const valor = refs.buscarPaciente.value.trim();
        if (!valor) {
            ocultarLista(refs.listaPacientes);
            return;
        }

        const resultados = buscarPacientes(valor);
        if (resultados.length === 1) {
            const paciente = resultados[0];
            const nombreCompleto = `${paciente.nombre ?? ""} ${paciente.apellidoPaterno ?? ""} ${paciente.apellidoMaterno ?? ""}`.trim();
            if (normalizarTexto(nombreCompleto) === normalizarTexto(valor) || normalizarTexto(paciente.telefono) === normalizarTexto(valor)) {
                seleccionarPaciente(paciente.id);
                refs.buscarPaciente.value = "";
                return;
            }
        }

        const exactMatch = resultados.find((paciente) => {
            const nombreCompleto = `${paciente.nombre ?? ""} ${paciente.apellidoPaterno ?? ""} ${paciente.apellidoMaterno ?? ""}`.trim();
            return normalizarTexto(nombreCompleto) === normalizarTexto(valor);
        });

        if (exactMatch) {
            seleccionarPaciente(exactMatch.id);
            refs.buscarPaciente.value = "";
            return;
        }

        mostrarResultadosPacientes(resultados);
    });

    refs.nuevoPaciente.addEventListener("click", () => {
        const valor = refs.buscarPaciente.value.trim();
        if (valor) {
            const datos = parsearNombrePaciente(valor);
            const nombreCompleto = `${datos.nombre} ${datos.apellidoPaterno} ${datos.apellidoMaterno}`.trim();
            const match = pacientes.find((paciente) => {
                const pacienteNombre = `${paciente.nombre ?? ""} ${paciente.apellidoPaterno ?? ""} ${paciente.apellidoMaterno ?? ""}`.trim();
                return normalizarTexto(pacienteNombre) === normalizarTexto(nombreCompleto);
            });

            if (match) {
                alert(`Ya existe un paciente registrado con ese nombre: ${match.nombre} ${match.apellidoPaterno}. Se seleccionará automáticamente.`);
                seleccionarPaciente(match.id);
                refs.buscarPaciente.value = "";
                return;
            }

            nuevoPaciente();
            return;
        }

        nuevoPaciente();
    });

    refs.buscarEstudio.addEventListener("input", () => {
        mostrarResultadosEstudios(buscarEstudios(refs.buscarEstudio.value));
    });

    refs.agregarEstudio.addEventListener("click", () => {
        const resultados = buscarEstudios(refs.buscarEstudio.value);
        if (resultados.length === 1) agregarEstudio(resultados[0].id);
    });

    refs.pago.addEventListener("input", () => {
        const pago = Number(refs.pago.value);
        ordenActual.pago.pagado = Number.isFinite(pago) && pago >= 0 ? pago : 0;
        actualizarCobro();
    });

    refs.diaNacimiento.addEventListener("input", unirFecha);
    refs.mesNacimiento.addEventListener("input", unirFecha);
    refs.anioNacimiento.addEventListener("input", unirFecha);

    [
        document.getElementById("nombre"),
        document.getElementById("apellido-paterno"),
        document.getElementById("apellido-materno"),
        document.getElementById("contacto")
    ].forEach((campo) => {
        if (!campo) return;
        campo.addEventListener("blur", () => {
            campo.value = normalizarTextoFormulario(campo.value);
        });
    });

    refs.formOrden.addEventListener("submit", (evento) => {
        evento.preventDefault();
        guardarOrden();
    });

    refs.navTabs.forEach((tab) => {
        tab.addEventListener("click", () => mostrarPantalla(tab.dataset.screen));
    });

    if (refs.historialBuscar) {
        refs.historialBuscar.addEventListener("input", () => renderHistorial());
    }

    if (refs.formAjusteGanancia) {
        refs.formAjusteGanancia.addEventListener("submit", guardarAjusteGanancia);
    }

    document.querySelectorAll("[data-close-gain-adjustment]").forEach((boton) => {
        boton.addEventListener("click", cerrarModalAjusteGanancia);
    });

    function actualizarReporteMensual() {
        const esMensual = refs.filtroReporte && refs.filtroReporte.value === 'mensual';
        if (refs.mesReporte) {
            refs.mesReporte.disabled = !esMensual;
            if (!esMensual && refs.mesReporte.value) {
                refs.mesReporte.value = '';
            }
        }
    }

    if (refs.filtroReporte) {
        if (refs.mesReporte) {
            const hoy = new Date();
            refs.mesReporte.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
        }

        refs.filtroReporte.addEventListener("change", () => {
            actualizarReporteMensual();
            renderHistorial();
        });
        actualizarReporteMensual();
    }

    if (refs.btnExportarExcel) {
        refs.btnExportarExcel.addEventListener("click", () => {
            const periodo = refs.filtroReporte ? refs.filtroReporte.value : 'diario';
            const mesReporte = refs.mesReporte ? refs.mesReporte.value : '';
            exportarReporteExcel(periodo, mesReporte);
        });
    }

    if (refs.estudioBuscar) {
        refs.estudioBuscar.addEventListener("input", () => renderCatalogoEstudios());
    }

    if (refs.btnNuevoEstudio) {
        refs.btnNuevoEstudio.addEventListener("click", () => abrirEditorEstudio(null));
    }

    if (refs.btnAgregarParametro) {
        refs.btnAgregarParametro.addEventListener("click", () => agregarParametroVacio());
    }

    if (refs.btnResetEstudio) {
        refs.btnResetEstudio.addEventListener("click", () => abrirEditorEstudio(null));
    }

    const botonEliminarEstudio = document.getElementById("btn-eliminar-estudio");
    if (botonEliminarEstudio) {
        botonEliminarEstudio.addEventListener("click", () => eliminarEstudioDesdeEditor());
    }

    if (refs.formEditorEstudio) {
        refs.formEditorEstudio.addEventListener("submit", (evento) => {
            evento.preventDefault();
            guardarEstudioDesdeEditor();
        });
    }

    document.addEventListener("click", manejarClicsGlobales);
}

/**
 * Maneja los clics en todo el documento para acciones como seleccionar en autocompletado,
 * abrir modales o imprimir reportes.
 * @param {Event} evento - El objeto del evento de clic.
 */
function manejarClicsGlobales(evento) {
    const closeDetailButton = evento.target.closest("[data-close-history-detail]");
    if (closeDetailButton) {
        cerrarDetalleHistorial();
        return;
    }

    const closeGainButton = evento.target.closest("[data-close-gain-adjustment]");
    if (closeGainButton) {
        cerrarModalAjusteGanancia();
        return;
    }

    // Ocultar listas de autocompletado si se hace clic fuera de ellas
    if (!evento.target.closest(".patient-tools")) ocultarLista(refs.listaPacientes);
    if (!evento.target.closest(".study-search")) ocultarLista(refs.listaEstudiosBusqueda);

    // Manejar clics en los botones de acción de las tarjetas
    const accion = evento.target.dataset.accion;
    const folio = evento.target.dataset.folio;

    if (accion && folio) {
        const orden = ordenes.find(o => o.folio === folio);
        if (!orden) return;

        switch (accion) {
            case 'capturar':
            case 'editar':
                mostrarModalResultados(orden);
                break;
            case 'imprimir':
                if (typeof window.imprimirResultados === 'function') {
                    window.imprimirResultados(orden);
                    return;
                }
                imprimirResultados(orden);
                break;
            case 'ajustar-ganancia':
                mostrarModalAjusteGanancia(orden);
                break;
            case 'liquidar': {
                const total = Number(orden.pago?.total ?? 0);
                const pagado = Number(orden.pago?.pagado ?? 0);
                const saldo = Math.max(0, total - pagado);
                if (saldo > 0) {
                    const confirmado = confirm(
                        `Orden ${orden.folio} tiene saldo pendiente de ${moneda(saldo)}.\n¿Confirmas la entrega sin recibir el saldo restante?`
                    );
                    if (!confirmado) return;
                }
                orden = cambiarEstadoOrden(orden, ESTADOS_ORDEN.ENTREGADA);
                orden.historial = orden.historial || { eventos: [] };
                orden.historial.ultimaAccion = "entregada";
                orden.historial.eventos.push({
                    tipo: "entregada",
                    fecha: orden.updatedAt,
                    detalle: `Orden ${orden.folio} liquidada y entregada`
                });
                persistirOrdenServidor(orden).finally(() => {
                    renderizarTablero();
                    renderHistorial();
                });
                break;
            }
        }
    }
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---

// El arranque del entorno y la detección de modo demo se centralizan en
// app-runtime.js para evitar estados contradictorios al cargar la app desde la
// API local o desde archivos estáticos.

inicializarSelectsFecha();
inicializarListeners();
renderFechaActual();
actualizarIndicadorModoDemo();

cargarDatosIniciales().then(() => {
    renderEstudios();
    renderResumen();
    renderHistorial();
    renderizarTablero();
    renderCatalogoEstudios();
    mostrarPantalla("recepcion");
});
