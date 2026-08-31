/**
 * @file 5_pdf.js
 * @description Genera el reporte PDF con el estilo previo del laboratorio,
 * manteniendo la compatibilidad con plantillas, logo y referencias.
 */

function esEstudioMaquilado(estudio) {
    if (!estudio) return false;

    const valorDirecto = estudio.maquilado;
    if (valorDirecto !== undefined && valorDirecto !== null) {
        if (typeof valorDirecto === 'boolean') return valorDirecto;
        if (typeof valorDirecto === 'number') return valorDirecto === 1;
        if (typeof valorDirecto === 'string') {
            return ['1', 'true', 'yes', 'y', 'si', 'sí'].includes(valorDirecto.trim().toLowerCase());
        }
        if (Boolean(valorDirecto)) return true;
    }

    const idEstudio = estudio.estudioId ?? estudio.id ?? estudio.estudio?.id ?? null;
    if (idEstudio !== null && Array.isArray(window.estudios)) {
        const catalogo = window.estudios.find((item) => Number(item.id) === Number(idEstudio));
        if (catalogo && catalogo.maquilado !== undefined && catalogo.maquilado !== null) {
            return ['1', 'true', 'yes', 'y', 'si', 'sí'].includes(String(catalogo.maquilado).trim().toLowerCase()) || Boolean(catalogo.maquilado) || Number(catalogo.maquilado) === 1;
        }
    }

    return false;
}

function obtenerPlantillaEstudio(estudioId) {
    if (!window.plantillas) return null;

    if (typeof estudioId === 'object' && estudioId) {
        const plantillaId = estudioId.plantillaId ?? estudioId.id ?? estudioId.plantilla ?? null;
        if (plantillaId !== undefined && plantillaId !== null && plantillaId !== '') {
            return window.plantillas[String(plantillaId)] || window.plantillas[plantillaId] || null;
        }
    }

    return window.plantillas[String(estudioId)] || window.plantillas[estudioId] || null;
}

// ---------------------------------------------------------------------------
// Paleta, tipografía y medidas del reporte (diseño "RESULTADOS EN PAPEL")
// ---------------------------------------------------------------------------
const PDF_COLORES = {
    azul: [23, 105, 194],
    azulClaro: [229, 238, 250],
    grisPanel: [243, 245, 247],
    grisLinea: [214, 219, 226],
    texto: [33, 37, 41],
    textoSuave: [95, 103, 114],
    blanco: [255, 255, 255],
};

// Serif para el contenido (formal), sans para cabeceras y barras (legible).
const PDF_FUENTES = {
    cuerpo: 'helvetica',
    estructura: 'helvetica',
};

const PDF_TAMANIOS = {
    nombreLab: 15,
    quimico: 10.5,
    pie: 8,
    pacienteValor: 10.5,
    tituloEstudio: 15,
    cabeceraTabla: 9,
    grupoTitulo: 9.5,
    filaNombre: 10,
    filaResultado: 11,
    filaReferencia: 10,
    observaciones: 10,
    firma: 11,
    cedula: 8.5,
};

// Dimensiones naturales del logo (para escalar sin deformar).
let __logoMedidas = { w: 0, h: 0 };

async function cargarLogoDataUrl() {
    const rutas = ['assets/logo.PNG', './assets/logo.PNG', 'logo.PNG', 'logo.png', './logo.PNG', './logo.png'];

    for (const ruta of rutas) {
        try {
            const respuesta = await fetch(ruta, { cache: 'no-store' });
            if (!respuesta.ok) continue;
            const blob = await respuesta.blob();
            if (!blob || blob.size === 0) continue;
            const reader = new FileReader();
            const dataUrl = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // Capturar las dimensiones reales del logo (mantiene la proporción).
            try {
                const img = new Image();
                const medidas = await new Promise((resolve, reject) => {
                    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
                    img.onerror = reject;
                    img.src = dataUrl;
                });
                if (medidas && medidas.w && medidas.h) {
                    __logoMedidas = { w: medidas.w, h: medidas.h };
                }
            } catch (error) {
                console.warn('No se pudieron leer las dimensiones del logo', error);
            }

            return dataUrl;
        } catch (error) {
            console.warn(`Logo no disponible en ${ruta}`, error);
        }
    }

    return null;
}

function dibujarLogo(doc, x, y, logoData) {
    if (logoData) {
        // Escala dentro de una caja de 42 x 22 mm conservando la proporción.
        const ratio = (__logoMedidas.w && __logoMedidas.h)
            ? __logoMedidas.h / __logoMedidas.w
            : 22 / 36;
        const altoMax = 22;
        const anchoMax = 42;
        let ancho = altoMax / ratio;
        let alto = altoMax;
        if (ancho > anchoMax) {
            ancho = anchoMax;
            alto = ancho * ratio;
        }
        const yCentrada = y + ((altoMax - alto) / 2);
        doc.addImage(logoData, 'PNG', x, yCentrada, ancho, alto);
        return ancho + 8; // separación con el texto del membrete
    }

    doc.setFont(PDF_FUENTES.estructura, 'bold');
    doc.setFontSize(16);
    doc.text('García LABORATORIO', x, y + 10);
    doc.setFontSize(9);
    doc.setFont(PDF_FUENTES.estructura, 'normal');
    doc.text('Laboratorio de Análisis Clínicos', x, y + 16);
    return 48;
}

function dibujarMembreteGeneral(doc, orden, logoData) {
    const pageWidth = (doc.internal.pageSize && doc.internal.pageSize.getWidth)
        ? doc.internal.pageSize.getWidth()
        : doc.internal.pageSize.width;
    const pageHeight = (doc.internal.pageSize && doc.internal.pageSize.getHeight)
        ? doc.internal.pageSize.getHeight()
        : doc.internal.pageSize.height;

    const logoX = 15;
    const logoY = 10;
    const textoX = logoX + dibujarLogo(doc, logoX, logoY, logoData);
    const textoDerechaX = pageWidth - 15;

    // Nombre del laboratorio
    doc.setFont(PDF_FUENTES.cuerpo, 'bold');
    doc.setFontSize(PDF_TAMANIOS.nombreLab);
    doc.setTextColor(PDF_COLORES.azul[0], PDF_COLORES.azul[1], PDF_COLORES.azul[2]);
    doc.text('Laboratorio de Análisis Clínicos', textoDerechaX, logoY + 11, { align: 'right' });

    // Línea de la química responsable
    doc.setFont(PDF_FUENTES.cuerpo, 'italic');
    doc.setFontSize(PDF_TAMANIOS.quimico);
    doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
    doc.text('Q.F.B. Elia Edith García García  ·  Ced. Prof. 6061749', textoDerechaX, logoY + 17, { align: 'right' });

    // Pie de página (contacto)
    doc.setFont(PDF_FUENTES.cuerpo, 'italic');
    doc.setFontSize(PDF_TAMANIOS.pie);
    doc.setTextColor(PDF_COLORES.textoSuave[0], PDF_COLORES.textoSuave[1], PDF_COLORES.textoSuave[2]);
    doc.text('Av. 5 de Mayo #5 Col. Centro. Teocelo, Ver.', textoDerechaX, pageHeight - 15, { align: 'right' });
    doc.text('Email: qfbelia_garcia@hotmail.com', textoDerechaX, pageHeight - 9.5, { align: 'right' });

    // Regla decorativa doble bajo el membrete
    doc.setDrawColor(PDF_COLORES.azul[0], PDF_COLORES.azul[1], PDF_COLORES.azul[2]);
    doc.setLineWidth(0.7);
    doc.line(15, 32, 195, 32);
    doc.setDrawColor(PDF_COLORES.grisLinea[0], PDF_COLORES.grisLinea[1], PDF_COLORES.grisLinea[2]);
    doc.setLineWidth(0.25);
    doc.line(15, 33.2, 195, 33.2);
}

const dibujadoresMembrete = {
    general: dibujarMembreteGeneral,
};

function dibujarFirma(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const yPosition = pageHeight - 28;
    const centerX = pageWidth / 2;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.line(centerX - 32, yPosition, centerX + 32, yPosition);

    doc.setFont(PDF_FUENTES.cuerpo, 'bold');
    doc.setFontSize(PDF_TAMANIOS.firma);
    doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
    doc.text('Q.F.B. Elia Edith García García', centerX, yPosition + 5, { align: 'center' });

    doc.setFont(PDF_FUENTES.cuerpo, 'normal');
    doc.setFontSize(PDF_TAMANIOS.cedula);
    doc.setTextColor(PDF_COLORES.textoSuave[0], PDF_COLORES.textoSuave[1], PDF_COLORES.textoSuave[2]);
    doc.text('Ced. Prof. 6061749', centerX, yPosition + 9.5, { align: 'center' });
}

function resolverReferenciaTexto(parametro, paciente, edad) {
    if (typeof window.resolverReferenciaParametro === 'function') {
        return window.resolverReferenciaParametro(parametro, paciente, edad);
    }
    return '';
}

function _drawStudyContentOnPage(doc, orden, estudio, logoData) {
    const paciente = OrdenPaciente(orden);
    const nombreCompleto = `${paciente.nombre || ''} ${paciente.apellidoPaterno || ''} ${paciente.apellidoMaterno || ''}`.trim() || 'Paciente no disponible';
    const fechaOrden = new Date(orden.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const edadPaciente = typeof window.calcularEdad === 'function' ? window.calcularEdad(paciente.fechaNacimiento) : '';
    const generoPaciente = paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : 'N/A';

    const pageHeight = (doc.internal.pageSize && doc.internal.pageSize.getHeight)
        ? doc.internal.pageSize.getHeight()
        : doc.internal.pageSize.height;
    const pageWidth = (doc.internal.pageSize && doc.internal.pageSize.getWidth)
        ? doc.internal.pageSize.getWidth()
        : doc.internal.pageSize.width;

    let yOffset = 42;

    // ---------- Datos del paciente ----------
    doc.setFont(PDF_FUENTES.cuerpo, 'bold');
    doc.setFontSize(PDF_TAMANIOS.pacienteValor);
    doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
    doc.text('Paciente:', 15, yOffset);
    doc.setFont(PDF_FUENTES.cuerpo, 'normal');
    doc.text(nombreCompleto, 45, yOffset);
    yOffset += 5.5;

    doc.setFont(PDF_FUENTES.cuerpo, 'bold');
    doc.text('Edad:', 15, yOffset);
    doc.setFont(PDF_FUENTES.cuerpo, 'normal');
    doc.text(`${edadPaciente} años`, 30, yOffset);

    doc.setFont(PDF_FUENTES.cuerpo, 'bold');
    doc.text('Género:', 70, yOffset);
    doc.setFont(PDF_FUENTES.cuerpo, 'normal');
    doc.text(generoPaciente, 90, yOffset);

    doc.setFont(PDF_FUENTES.cuerpo, 'bold');
    doc.text('Fecha:', 130, yOffset);
    doc.setFont(PDF_FUENTES.cuerpo, 'normal');
    doc.text(fechaOrden, 145, yOffset);
    yOffset += 8;

    // ---------- Título del estudio ----------
    const tituloEstudio = (estudio.nombre || 'Estudio').toUpperCase();
    doc.setFont(PDF_FUENTES.cuerpo, 'bold');
    doc.setFontSize(PDF_TAMANIOS.tituloEstudio);
    doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
    doc.text(tituloEstudio, pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 10;

    // ---------- Tabla de resultados ----------
    const plantilla = obtenerPlantillaEstudio(estudio);
    const edad = typeof window.calcularEdad === 'function' ? Number(window.calcularEdad(paciente.fechaNacimiento)) : 0;

    // Cabecera de columnas
    doc.setFont(PDF_FUENTES.estructura, 'bold');
    doc.setFontSize(PDF_TAMANIOS.cabeceraTabla);
    doc.setFillColor(PDF_COLORES.grisPanel[0], PDF_COLORES.grisPanel[1], PDF_COLORES.grisPanel[2]);
    doc.rect(15, yOffset - 5, 180, 8, 'F');
    doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
    doc.text('PARÁMETRO', 20, yOffset);
    doc.text('RESULTADO', 85, yOffset, { align: 'center' });
    doc.text('VALOR DE REFERENCIA', 150, yOffset, { align: 'center' });
    yOffset += 8;

    if (plantilla && plantilla.grupos) {
        plantilla.grupos.forEach((grupo) => {
            const parametros = Array.isArray(grupo.parametros) ? grupo.parametros : [];
            const espacioNecesario = 8 + (parametros.length * 7) + 3;

            if (yOffset + espacioNecesario > pageHeight - 42) {
                doc.addPage();
                const tipoMembrete = plantilla.membrete || 'general';
                const dibujarMembrete = dibujadoresMembrete[tipoMembrete];
                if (typeof dibujarMembrete === 'function') {
                    dibujarMembrete(doc, orden, logoData);
                }
                yOffset = 42;
            }

            // Los grupos llamados "PARÁMETROS" (los que crea el editor) repiten la
            // cabecera de la tabla, por lo que se omiten. Los demás títulos de
            // grupo (p. ej. "SERIE BLANCA") sí se dibujan.
            const tituloGrupo = String(grupo.nombre || '').trim().toUpperCase();
            const tituloNormalizado = tituloGrupo
                .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I')
                .replace(/Ó/g, 'O').replace(/Ú/g, 'U');
            const esGrupoParametros = tituloNormalizado === 'PARAMETROS' || tituloNormalizado === 'PARAMETRO';
            if (!esGrupoParametros) {
                doc.setFont(PDF_FUENTES.estructura, 'bold');
                doc.setFontSize(PDF_TAMANIOS.grupoTitulo);
                doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
                doc.text(tituloGrupo, 20, yOffset);
                yOffset += 7;
            }

            parametros.forEach((param) => {
                const res = Array.isArray(estudio.resultados)
                    ? estudio.resultados.find((item) => String(item.nombre || '').toLowerCase() === String(param.nombre || '').toLowerCase())
                    : null;
                const resultadoTexto = res && res.resultado !== undefined ? String(res.resultado) : '';
                const referenciaTexto = resolverReferenciaTexto(param, paciente, edad);

                doc.setFont(PDF_FUENTES.cuerpo, 'bold');
                doc.setFontSize(PDF_TAMANIOS.filaNombre);
                doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
                doc.text(String(param.nombre || 'Sin nombre'), 20, yOffset);
                doc.setFontSize(PDF_TAMANIOS.filaResultado);
                doc.text(resultadoTexto, 85, yOffset, { align: 'center' });
                doc.setFont(PDF_FUENTES.cuerpo, 'normal');
                doc.setFontSize(PDF_TAMANIOS.filaReferencia);
                doc.text(String(referenciaTexto || ''), 150, yOffset, { align: 'center' });

                // Linea guia sutil para que las filas queden derechitas
                doc.setDrawColor(PDF_COLORES.grisLinea[0], PDF_COLORES.grisLinea[1], PDF_COLORES.grisLinea[2]);
                doc.setLineWidth(0.15);
                doc.line(15, yOffset + 3.5, 195, yOffset + 3.5);
                yOffset += 7;
            });

            yOffset += 2;
        });
    } else {
        const resultados = Array.isArray(estudio.resultados) ? estudio.resultados : [];
        if (resultados.length) {
            resultados.forEach((resultado) => {
                if (yOffset + 9 > pageHeight - 42) {
                    doc.addPage();
                    const dibujarMembrete = dibujadoresMembrete.general;
                    if (typeof dibujarMembrete === 'function') dibujarMembrete(doc, orden, logoData);
                    yOffset = 42;
                }

                doc.setFont(PDF_FUENTES.cuerpo, 'bold');
                doc.setFontSize(PDF_TAMANIOS.filaNombre);
                doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
                doc.text(String(resultado.nombre || 'Resultado'), 20, yOffset);
                doc.setFontSize(PDF_TAMANIOS.filaResultado);
                doc.text(String(resultado.resultado || ''), 85, yOffset, { align: 'center' });
                doc.setFont(PDF_FUENTES.cuerpo, 'normal');
                doc.setFontSize(PDF_TAMANIOS.filaReferencia);
                doc.text(String(resultado.referencia || ''), 150, yOffset, { align: 'center' });

                doc.setDrawColor(PDF_COLORES.grisLinea[0], PDF_COLORES.grisLinea[1], PDF_COLORES.grisLinea[2]);
                doc.setLineWidth(0.15);
                doc.line(15, yOffset + 3.5, 195, yOffset + 3.5);
                yOffset += 7;
            });
        }
    }

    if (estudio.observaciones) {
        const espacioReservadoFirma = 40;
        const observacionesSplit = doc.splitTextToSize(estudio.observaciones, 170);
        const alturaObservaciones = (observacionesSplit.length * 5.3) + 12;

        if (yOffset + alturaObservaciones > pageHeight - espacioReservadoFirma) {
            doc.addPage();
            const tipoMembrete = plantilla?.membrete || 'general';
            const dibujarMembrete = dibujadoresMembrete[tipoMembrete];
            if (typeof dibujarMembrete === 'function') {
                dibujarMembrete(doc, orden, logoData);
            }
            yOffset = 42;
        }

        yOffset += 9;
        doc.setFont(PDF_FUENTES.cuerpo, 'bold');
        doc.setFontSize(PDF_TAMANIOS.observaciones);
        doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
        doc.text('OBSERVACIONES:', 15, yOffset);
        doc.setFont(PDF_FUENTES.cuerpo, 'normal');
        doc.setTextColor(PDF_COLORES.texto[0], PDF_COLORES.texto[1], PDF_COLORES.texto[2]);
        doc.text(observacionesSplit, 15, yOffset + 5);
    }

    dibujarFirma(doc);
}

function OrdenPaciente(orden) {
    if (!orden || !orden.paciente) return {};
    return orden.paciente;
}

async function imprimirResultados(orden) {
    if (!orden) {
        alert('No hay datos de la orden para exportar.');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('La librería de PDF no está disponible.');
        return;
    }

    const estudiosImprimibles = (orden.estudios || []).filter((estudio) => !esEstudioMaquilado(estudio));
    if (!estudiosImprimibles.length) {
        alert('No hay estudios imprimibles en esta orden (todos son maquilados o no tienen resultados).');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const logoData = await cargarLogoDataUrl();

    estudiosImprimibles.forEach((estudio, index) => {
        if (index > 0) {
            doc.addPage();
        }

        const plantillaEstudio = obtenerPlantillaEstudio(estudio);
        const tipoMembrete = plantillaEstudio?.membrete || 'general';
        const dibujarMembrete = dibujadoresMembrete[tipoMembrete];
        if (typeof dibujarMembrete === 'function') {
            dibujarMembrete(doc, orden, logoData);
        }

        _drawStudyContentOnPage(doc, orden, estudio, logoData);
    });

    try {
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
    } catch (error) {
        try {
            doc.save((orden.folio ? `resultado_${orden.folio}.pdf` : 'resultado.pdf'));
        } catch (fallbackError) {
            console.error('Error al abrir/guardar PDF', fallbackError);
            alert('No se pudo generar el PDF en este navegador.');
        }
    }
}

window.imprimirResultados = imprimirResultados;