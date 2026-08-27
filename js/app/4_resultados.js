/**
 * @file 4_resultados.js
 * @description Maneja la lógica de captura de resultados, incluyendo la generación
 * del formulario dinámico dentro del modal y el guardado de los datos.
 */

/**
 * Obtiene todos los parámetros de un estudio a partir de su plantilla.
 * @param {number} estudioId - El ID del estudio.
 * @returns {Array<object>} Un arreglo con todos los parámetros del estudio.
 */
function obtenerPlantillaDeEstudioReferencia(estudioReferencia) {
    if (!estudioReferencia) return null;

    if (typeof estudioReferencia === 'object') {
        if (typeof resolverPlantillaDeEstudio === 'function') {
            const plantilla = resolverPlantillaDeEstudio(estudioReferencia);
            if (plantilla) return plantilla;
        }

        const plantillaId = estudioReferencia.plantillaId ?? estudioReferencia.id;
        if (plantillaId === undefined || plantillaId === null || plantillaId === '') return null;
        return plantillas[String(plantillaId)] || plantillas[plantillaId] || null;
    }

    const plantillaId = estudioReferencia;
    return plantillas[String(plantillaId)] || plantillas[plantillaId] || null;
}

function obtenerTodosLosParametros(estudioReferencia) {
    const plantilla = obtenerPlantillaDeEstudioReferencia(estudioReferencia);
    if (!plantilla || !plantilla.grupos) return [];
    return plantilla.grupos.flatMap(g => g.parametros || []);
}

function obtenerTipoParametro(parametro) {
    if (!parametro || !parametro.tipo) return 'numero';
    return String(parametro.tipo).toLowerCase();
}

function escaparHtml(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function resolverReferenciaPorSexo(referencia, sexo) {
    if (!referencia || typeof referencia !== 'object') return null;
    if (typeof referencia.porSexo !== 'object') return null;

    const sexoNormalizado = String(sexo ?? '').toUpperCase();
    if (sexoNormalizado === 'M' && typeof referencia.porSexo.M !== 'undefined') {
        return referencia.porSexo.M;
    }
    if (sexoNormalizado === 'F' && typeof referencia.porSexo.F !== 'undefined') {
        return referencia.porSexo.F;
    }
    return null;
}

function resolverReferenciaEdad(edicion, edad) {
    if (!edicion || !Number.isFinite(Number(edad))) return null;
    const edadNumero = Number(edad);

    if (Array.isArray(edicion)) {
        for (const rango of edicion) {
            if (!rango || typeof rango !== 'object') continue;
            const min = Number(rango.min ?? -Infinity);
            const max = Number(rango.max ?? Infinity);
            if (edadNumero >= min && edadNumero <= max) {
                return rango;
            }
        }
        return null;
    }

    if (edicion && typeof edicion === 'object' && !('min' in edicion) && !('max' in edicion)) {
        const entradas = Object.entries(edicion)
            .map(([clave, valor]) => ({
                clave,
                valor,
                numero: Number(clave)
            }))
            .filter((entrada) => Number.isFinite(entrada.numero));

        if (entradas.length) {
            entradas.sort((a, b) => a.numero - b.numero);
            for (let i = 0; i < entradas.length; i += 1) {
                const entradaActual = entradas[i];
                const siguiente = entradas[i + 1];
                const rangoInicio = entradaActual.numero;
                const rangoFin = siguiente ? siguiente.numero : Infinity;
                if (edadNumero >= rangoInicio && edadNumero < rangoFin) {
                    return entradaActual.valor;
                }
            }
            return entradas[entradas.length - 1].valor;
        }
    }

    const min = Number(edicion.min ?? -Infinity);
    const max = Number(edicion.max ?? Infinity);
    if (edadNumero >= min && edadNumero <= max) {
        return edicion;
    }
    return null;
}

function resolverReferenciaParametro(parametro, paciente, edad) {
    if (!parametro) return 'N/A';

    if (typeof parametro.referencia === 'function') {
        return String(parametro.referencia(paciente?.sexo, edad, paciente || {}));
    }

    if (typeof parametro.referencia === 'string') {
        return parametro.referencia;
    }

    if (parametro.referencia && typeof parametro.referencia === 'object') {
        if (typeof parametro.referencia.valor === 'function') {
            return String(parametro.referencia.valor(paciente?.sexo, edad, paciente || {}));
        }

        if (parametro.referencia.edad && Number.isFinite(Number(edad))) {
            const rangoEdad = resolverReferenciaEdad(parametro.referencia.edad, edad);
            if (rangoEdad) {
                const referenciaEspecifica = resolverReferenciaPorSexo(rangoEdad, paciente?.sexo);
                if (referenciaEspecifica) {
                    return String(referenciaEspecifica);
                }

                const valorRango = typeof rangoEdad === 'object' && rangoEdad !== null ? rangoEdad.valor : rangoEdad;
                if (valorRango && typeof valorRango === 'object') {
                    const referenciaValor = resolverReferenciaPorSexo(valorRango, paciente?.sexo);
                    if (referenciaValor) {
                        return String(referenciaValor);
                    }
                    if (typeof valorRango.base !== 'undefined') {
                        return String(valorRango.base);
                    }
                    if (typeof valorRango.valor !== 'undefined') {
                        return String(valorRango.valor);
                    }
                }

                if (typeof rangoEdad.valor !== 'undefined') {
                    return String(rangoEdad.valor);
                }
                if (typeof rangoEdad === 'string' || typeof rangoEdad === 'number') {
                    return String(rangoEdad);
                }
            }
        }

        const sexoReferencia = resolverReferenciaPorSexo(parametro.referencia, paciente?.sexo);
        if (sexoReferencia) {
            return String(sexoReferencia);
        }

        if (typeof parametro.referencia.base !== 'undefined') {
            return String(parametro.referencia.base);
        }

        if (typeof parametro.referencia.valor !== 'undefined') {
            return String(parametro.referencia.valor);
        }

        if (typeof parametro.referencia.min !== 'undefined' || typeof parametro.referencia.max !== 'undefined') {
            const min = parametro.referencia.min ?? 'N/A';
            const max = parametro.referencia.max ?? 'N/A';
            return `${min} - ${max}`;
        }
    }

    return 'N/A';
}

function leerValorResultado(input, tipoParametro) {
    if (!input) return '';

    switch (tipoParametro) {
        case 'checkbox':
            return input.checked ? 'Sí' : 'No';
        case 'select':
            return input.value || '';
        case 'textarea':
            return input.value || '';
        default:
            return input.value || '';
    }
}

function renderizarInputParametro(parametro, inputName, valorActual) {
    const tipo = obtenerTipoParametro(parametro);
    const valor = escaparHtml(valorActual ?? '');
    const placeholder = parametro?.placeholder ? `placeholder="${escaparHtml(parametro.placeholder)}"` : '';
    const step = parametro?.step ? `step="${escaparHtml(parametro.step)}"` : '';

    switch (tipo) {
        case 'select': {
            const opciones = Array.isArray(parametro.opciones) ? parametro.opciones : [];
            const opcionesHtml = opciones.map((opcion) => {
                const valorOpcion = escaparHtml(opcion);
                const seleccionado = String(valorActual ?? '') === String(opcion) ? 'selected' : '';
                return `<option value="${valorOpcion}" ${seleccionado}>${valorOpcion}</option>`;
            }).join('');

            return `
                <select name="${inputName}" class="result-input" ${placeholder}>
                    <option value="">Seleccionar</option>
                    ${opcionesHtml}
                </select>
            `;
        }
        case 'textarea':
            return `<textarea name="${inputName}" class="result-input" ${placeholder}>${valor}</textarea>`;
        case 'checkbox':
            return `
                <label class="result-checkbox">
                    <input type="checkbox" name="${inputName}" ${String(valorActual ?? '').toLowerCase() === 'si' || String(valorActual ?? '').toLowerCase() === 'true' ? 'checked' : ''} />
                    Sí
                </label>
            `;
        default:
            return `<input type="${tipo === 'numero' ? 'number' : 'text'}" name="${inputName}" value="${valor}" class="result-input" ${placeholder} ${step} autocomplete="off" />`;
    }
}

/**
 * Genera el HTML para el formulario de captura de resultados de una orden.
 * Crea dinámicamente los campos de entrada para cada parámetro de cada estudio en la orden.
 * @param {object} orden - La orden para la cual se generará el formulario.
 * @returns {string} El string HTML del formulario.
 */
function generarFormularioResultados(orden) {
    const paciente = orden.paciente;
    if (!paciente) return '<p>No se han proporcionado datos del paciente.</p>';
    if (!orden.estudios || orden.estudios.length === 0) {
        return '<p>Esta orden no tiene estudios asignados.</p>';
    }

    const edad = calcularEdad(paciente.fechaNacimiento);
    let html = '';

    // Itera sobre cada estudio en la orden y crea una sección de formulario para él.
    orden.estudios.forEach(estudio => {
        const parametros = obtenerTodosLosParametros(estudio);
        if (!parametros.length) return; // Saltar si un estudio no tiene plantilla

        // Título de la sección para este estudio
        html += `<h3 class="form-study-title">${escaparHtml(estudio.nombre)}</h3>`;

        html += `
            <div class="results-form-header">
                <span>Parámetro</span>
                <span>Resultado</span>
                <span>Unidad</span>
                <span>Valor de Referencia</span>
            </div>
            <div class="results-form-body">
        `;

        parametros.forEach(param => {
            const valorReferencia = resolverReferenciaParametro(param, paciente, edad);
            const resultadoGuardado = estudio.resultados ? estudio.resultados.find(r => r.nombre === param.nombre) : null;
            const valorActual = resultadoGuardado ? resultadoGuardado.resultado : '';
            const inputName = `estudio_${estudio.id}_resultado_${param.nombre.replace(/\s+/g, '_')}`;
            const inputHtml = renderizarInputParametro(param, inputName, valorActual);

            html += `
                <div class="results-form-row">
                    <label>${escaparHtml(param.nombre)}</label>
                    ${inputHtml}
                    <span>${escaparHtml(param.unidad || '')}</span>
                    <span>${escaparHtml(valorReferencia)}</span>
                </div>
            `;
        });

        html += '</div>'; // Cierre de results-form-body

        // Observaciones por estudio
        const obsName = `estudio_${estudio.id}_observaciones`;
        const obsValor = escaparHtml(estudio.observaciones || '');
        html += `
            <div class="results-form-observaciones">
                <label style="display:block;margin-top:8px;font-weight:700;font-size:12px">Observaciones</label>
                <textarea name="${obsName}" class="result-observaciones" placeholder="Agregar observaciones para este estudio">${obsValor}</textarea>
            </div>
        `;

    });

    return html;
}

/**
 * Muestra el modal para la captura de resultados.
 * @param {object} orden - La orden cuyos resultados se van a capturar o editar.
 */
function mostrarModalResultados(orden) {
    const modal = document.getElementById('modal-resultados');
    const contenido = document.getElementById('modal-resultados-contenido');
    const form = document.getElementById('form-resultados');

    document.getElementById('modal-folio').textContent = orden.folio;
    document.getElementById('modal-estudio-nombre').textContent = "Múltiples estudios";

    contenido.innerHTML = generarFormularioResultados(orden);

    if (form) {
        form.replaceWith(form.cloneNode(true));
    }

    const formActual = document.getElementById('form-resultados');
    if (formActual) {
        formActual.onreset = null;
        formActual.onsubmit = (evento) => {
            evento.preventDefault();
            guardarResultados(orden);
        };

        const botonGuardar = formActual.querySelector('button[type="submit"]');
        if (botonGuardar) {
            botonGuardar.onclick = (evento) => {
                evento.preventDefault();
                evento.stopPropagation();
                guardarResultados(orden);
            };
        }
    }

    modal.style.display = 'flex';
}

/**
 * Cierra el modal de captura de resultados.
 */
function cerrarModalResultados() {
    const modal = document.getElementById('modal-resultados');
    modal.style.display = 'none';
}

/**
 * Recolecta los datos del formulario del modal y los guarda en el objeto de la orden en memoria.
 * Después de guardar, actualiza el estado de la orden a 'POR_ENTREGAR'.
 * @param {object} orden - La orden a la que se le guardarán los resultados.
 */
async function guardarResultados(orden) {
    const ordenEnMemoria = ordenes.find(o => o.folio === orden.folio);
    if (!ordenEnMemoria) return;

    const form = document.getElementById('form-resultados');
    const paciente = ordenEnMemoria.paciente;
    const edad = calcularEdad(paciente.fechaNacimiento);

    // Itera sobre cada estudio de la orden para recolectar y guardar sus resultados.
    ordenEnMemoria.estudios.forEach(estudio => {
        const parametros = obtenerTodosLosParametros(estudio);
        const nuevosResultados = [];

        parametros.forEach((param) => {
            const inputName = `estudio_${estudio.id}_resultado_${param.nombre.replace(/\s+/g, '_')}`;
            const inputResultado = form.querySelector(`[name="${inputName}"]`);
            const valorReferencia = resolverReferenciaParametro(param, paciente, edad);
            nuevosResultados.push({
                nombre: param.nombre,
                resultado: leerValorResultado(inputResultado, obtenerTipoParametro(param)),
                unidad: param.unidad || '',
                referencia: valorReferencia,
            });
        });
        estudio.resultados = nuevosResultados;
        // Guardar observaciones si vienen en el formulario
        const obsName = `estudio_${estudio.id}_observaciones`;
        const obsInput = form.querySelector(`[name="${obsName}"]`);
        if (obsInput) {
            estudio.observaciones = obsInput.value || '';
        }
    });

    // Si la orden estaba pendiente de captura, la marca como lista para entregar.
    if (normalizarEstadoOrden(ordenEnMemoria.estado) === 'POR_CAPTURAR') {
        ordenEnMemoria.estado = ESTADOS_ORDEN.POR_ENTREGAR;
    }
    ordenEnMemoria.updatedAt = new Date().toISOString();

    try {
        const persistida = await persistirOrdenServidor(ordenEnMemoria);
        if (persistida) {
            const idx = ordenes.findIndex(o => o.folio === ordenEnMemoria.folio);
            if (idx >= 0) {
                ordenes[idx] = normalizarOrden(persistida);
            }
        }
    } catch (err) {
        console.warn('No se pudo guardar resultados en la base de datos:', err);
    }

    renderizarTablero();
    renderHistorial();
    cerrarModalResultados();
}