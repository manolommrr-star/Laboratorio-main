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
            return dataUrl;
        } catch (error) {
            console.warn(`Logo no disponible en ${ruta}`, error);
        }
    }

    return null;
}

function dibujarLogo(doc, x, y, logoData) {
    if (logoData) {
        doc.addImage(logoData, 'PNG', x, y, 36, 22);
        return;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('García LABORATORIO', x, y + 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Laboratorio de Análisis Clínicos', x, y + 16);
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
    const logoWidth = 36;

    dibujarLogo(doc, logoX, logoY, logoData);

    const textRightX = pageWidth - 15;
    const textLeftX = logoX + logoWidth + 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Laboratorio de Análisis Clínicos', textLeftX, logoY + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Q.F.B. Elia Edith García García - Ced. Prof. 6061749', textLeftX, logoY + 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Av. 5 de Mayo #5 Col. Centro. Teocelo, Ver.', textRightX, pageHeight - 15, { align: 'right' });
    doc.text('Email: qfbelia_garcia@hotmail.com', textRightX, pageHeight - 10, { align: 'right' });
}

const dibujadoresMembrete = {
    general: dibujarMembreteGeneral,
};

function dibujarFirma(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const yPosition = pageHeight - 22;
    const centerX = pageWidth / 2;

    doc.setDrawColor(0, 0, 0);
    doc.line(centerX - 30, yPosition, centerX + 30, yPosition);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Q.F.B. Elia Edith García García', centerX, yPosition + 5, { align: 'center' });
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

    let yOffset = 35;
    doc.line(15, yOffset, 195, yOffset);
    yOffset += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre del Paciente:', 15, yOffset);
    doc.setFont('helvetica', 'normal');
    doc.text(nombreCompleto, 55, yOffset);

    yOffset += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Edad:', 15, yOffset);
    doc.setFont('helvetica', 'normal');
    doc.text(`${edadPaciente} años`, 30, yOffset);

    doc.setFont('helvetica', 'bold');
    doc.text('Género:', 70, yOffset);
    doc.setFont('helvetica', 'normal');
    doc.text(generoPaciente, 90, yOffset);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', 130, yOffset);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaOrden, 145, yOffset);
    yOffset += 4;

    doc.line(15, yOffset, 195, yOffset);
    yOffset += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const pageWidth = (doc.internal.pageSize && doc.internal.pageSize.getWidth)
        ? doc.internal.pageSize.getWidth()
        : doc.internal.pageSize.width;
    doc.text((estudio.nombre || 'Estudio').toUpperCase(), pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 13;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 230, 230);
    doc.rect(15, yOffset - 5, 180, 7, 'F');
    doc.text('PARÁMETRO', 20, yOffset);
    doc.text('RESULTADO', 80, yOffset);
    doc.text('VALOR DE REFERENCIA', 135, yOffset);
    yOffset += 7;

    const plantilla = obtenerPlantillaEstudio(estudio);
    const edad = typeof window.calcularEdad === 'function' ? Number(window.calcularEdad(paciente.fechaNacimiento)) : 0;

    if (plantilla && plantilla.grupos) {
        plantilla.grupos.forEach((grupo) => {
            const parametros = Array.isArray(grupo.parametros) ? grupo.parametros : [];
            const espacioNecesario = 7 + (parametros.length * 6) + 2;

            if (yOffset + espacioNecesario > doc.internal.pageSize.height - 40) {
                doc.addPage();
                const tipoMembrete = plantilla.membrete || 'general';
                const dibujarMembrete = dibujadoresMembrete[tipoMembrete];
                if (typeof dibujarMembrete === 'function') {
                    dibujarMembrete(doc, orden, logoData);
                }
                yOffset = 35;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFillColor(23, 105, 194);
            doc.rect(15, yOffset - 4, 180, 6, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(grupo.nombre, 20, yOffset);
            yOffset += 7;

            parametros.forEach((param) => {
                const res = Array.isArray(estudio.resultados)
                    ? estudio.resultados.find((item) => String(item.nombre || '').toLowerCase() === String(param.nombre || '').toLowerCase())
                    : null;
                const resultadoTexto = res && res.resultado !== undefined ? String(res.resultado) : '';
                const referenciaTexto = resolverReferenciaTexto(param, paciente, edad);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(String(param.nombre || 'Sin nombre'), 20, yOffset);
                doc.text(resultadoTexto, 85, yOffset, { align: 'center' });
                doc.text(String(referenciaTexto || ''), 150, yOffset, { align: 'center' });
                yOffset += 6;
            });

            yOffset += 2;
        });
    } else {
        const resultados = Array.isArray(estudio.resultados) ? estudio.resultados : [];
        if (resultados.length) {
            resultados.forEach((resultado) => {
                if (yOffset + 8 > doc.internal.pageSize.height - 40) {
                    doc.addPage();
                    const dibujarMembrete = dibujadoresMembrete.general;
                    if (typeof dibujarMembrete === 'function') dibujarMembrete(doc, orden, logoData);
                    yOffset = 35;
                }

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(String(resultado.nombre || 'Resultado'), 20, yOffset);
                doc.text(String(resultado.resultado || ''), 85, yOffset, { align: 'center' });
                doc.text(String(resultado.referencia || ''), 150, yOffset, { align: 'center' });
                yOffset += 6;
            });
        }
    }

    if (estudio.observaciones) {
        const pageHeight = (doc.internal.pageSize && doc.internal.pageSize.getHeight)
            ? doc.internal.pageSize.getHeight()
            : doc.internal.pageSize.height;
        const espacioReservadoFirma = 38;
        const observacionesSplit = doc.splitTextToSize(estudio.observaciones, 170);
        const alturaObservaciones = (observacionesSplit.length * 5) + 10;

        if (yOffset + alturaObservaciones > pageHeight - espacioReservadoFirma) {
            doc.addPage();
            const tipoMembrete = plantilla?.membrete || 'general';
            const dibujarMembrete = dibujadoresMembrete[tipoMembrete];
            if (typeof dibujarMembrete === 'function') {
                dibujarMembrete(doc, orden, logoData);
            }
            yOffset = 35;
        }

        yOffset += 8;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('OBSERVACIONES:', 15, yOffset);
        doc.setFont('helvetica', 'normal');
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