/**
 * Módulo de estudios
 * ------------------
 * Agrupa la lógica relacionada con la búsqueda de estudios, la edición del
 * catálogo y la preparación del editor de parámetros.
 *
 * Este archivo permite separar el dominio "estudio" del flujo general de la UI
 * sin cambiar la funcionalidad actual de la aplicación.
 */

window.LaboratorioModules = window.LaboratorioModules || {};
window.LaboratorioModules.estudios = window.LaboratorioModules.estudios || {};

function esMaquiladoCatalogo(valor) {
    if (valor === undefined || valor === null || valor === false || valor === 0 || valor === '0') return false;
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return ['1', 'true', 'yes', 'y', 'si', 'sí'].includes(valor.trim().toLowerCase());
    return Boolean(valor);
}

window.LaboratorioModules.estudios.buscarEstudios = function buscarEstudios(texto) {
    const criterio = normalizarTexto(texto.trim());
    if (!criterio) return [];

    return estudios.filter((estudio) =>
        normalizarTexto(estudio.nombre).includes(criterio)
    );
};

window.LaboratorioModules.estudios.normalizarPlantillaEstudio = function normalizarPlantillaEstudio(estudioId, nombre, muestra) {
    return {
        id: estudioId,
        nombre: nombre || "",
        muestra: muestra || "",
        grupos: []
    };
};

window.LaboratorioModules.estudios.obtenerSiguienteIdEstudio = function obtenerSiguienteIdEstudio() {
    const ids = estudios.map((estudio) => Number(estudio.id) || 0);
    return ids.length ? Math.max(...ids) + 1 : 1;
};

window.LaboratorioModules.estudios.renderCatalogoEstudios = function renderCatalogoEstudios() {
    // Este módulo conserva la lógica del catálogo para facilitar el mantenimiento
    // futuro sin mezclar la UI del catálogo con el resto del flujo principal.
    const filtro = (document.getElementById("buscar-estudio-catalogo")?.value || "").trim().toLowerCase();
    const estudiosFiltrados = estudios.filter((estudio) => {
        const texto = `${estudio.nombre} ${estudio.muestra}`.toLowerCase();
        return !filtro || texto.includes(filtro);
    });

    const tablaNormal = document.getElementById("catalogo-estudios-body");
    const tablaMaquilado = document.getElementById("catalogo-estudios-maquilado-body");

    if (tablaNormal) tablaNormal.innerHTML = "";
    if (tablaMaquilado) tablaMaquilado.innerHTML = "";

    estudiosFiltrados.forEach((estudio) => {
        const fila = document.createElement("tr");
        const plantilla = typeof resolverPlantillaDeEstudio === "function" ? resolverPlantillaDeEstudio(estudio) : (plantillas[estudio.plantillaId] || plantillas[estudio.id]);
        const cantidadParametros = plantilla && Array.isArray(plantilla.grupos)
            ? plantilla.grupos.reduce((total, grupo) => total + (Array.isArray(grupo.parametros) ? grupo.parametros.length : 0), 0)
            : 0;

        fila.innerHTML = `
            <td><strong>${estudio.nombre}</strong></td>
            <td>${estudio.muestra}</td>
            <td>${moneda(estudio.precioSugerido)}</td>
            <td>${cantidadParametros}</td>
        `;

        const bloque = esMaquiladoCatalogo(estudio.maquilado) ? tablaMaquilado : tablaNormal;
        if (bloque) bloque.appendChild(fila);
    });
};
