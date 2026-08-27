/**
 * @file 2_estado.js
 * @description Define el estado central de la aplicación.
 * Estas variables globales almacenan los datos dinámicos mientras la app está en uso.
 */

/**
 * @const {object} ESTADOS_ORDEN
 * @description Define los posibles estados que puede tener una orden.
 * Usar constantes evita errores por escribir mal los strings.
 */
const ESTADOS_ORDEN = {
    POR_CAPTURAR: "POR_CAPTURAR",
    POR_ENTREGAR: "POR_ENTREGAR",
    ENTREGADA: "ENTREGADA",
};

function normalizarEstadoOrden(estado) {
    const valor = String(estado ?? "").trim().toUpperCase();
    if (valor === "POR_CAPTURAR" || valor === "CAPTURAR") return ESTADOS_ORDEN.POR_CAPTURAR;
    if (valor === "POR_ENTREGAR" || valor === "ENTREGAR") return ESTADOS_ORDEN.POR_ENTREGAR;
    if (valor === "ENTREGADA" || valor === "LIQUIDADA") return ESTADOS_ORDEN.ENTREGADA;
    return ESTADOS_ORDEN.POR_CAPTURAR;
}

/**
 * @var {object} ordenActual
 * @description Objeto que almacena los datos de la orden que se está creando o editando
 * en el formulario de recepción. La UI se actualiza en base a este objeto.
 */
const ordenActual = {

    id: null,
    folio: null,
    fecha: null,
    estado: ESTADOS_ORDEN.POR_CAPTURAR,
    createdAt: null,
    updatedAt: null,
    paciente: {
        id: null,
        nombre: "",
        apellidoPaterno: "",
        apellidoMaterno: "",
        fechaNacimiento: "",
        sexo: "",
        telefono: "",
        contacto: ""
    },
    estudios: [],
    pago: {
        total: 0,
        pagado: 0,
        saldo: 0
    },
    historial: {
        eventos: [],
        ultimaAccion: "creada"
    },
    metadatos: {
        origen: "recepcion",
        usuario: "admin"
    }
};

/**
 * @var {Array<object>} ordenes
 * @description Arreglo que funciona como nuestra "base de datos" en memoria.
 * Aquí se almacenan todas las órdenes que se han guardado durante la sesión.
 */
const ordenes = [];