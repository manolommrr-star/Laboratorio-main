/*
 * Módulo de arranque y control del sistema.
 *
 * Aquí vive la lógica del entorno de ejecución:
 * - detección de conexión con la API / DB
 * - indicador visual de modo demo
 * - carga inicial de datos desde el backend
 *
 * Esta separación ayuda a que el archivo principal se concentre en la UI y en
 * los eventos, mientras que el arranque se mantiene aislado y fácil de probar.
 */

function servidorLocalDisponible() {
    const protocolo = window.location.protocol || "";
    const hostname = (window.location.hostname || "").toLowerCase();
    const hostLocal = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "[::1]",
        "::",
        "[::]"
    ];

    const esHostLocal = hostLocal.includes(hostname) || hostname.includes("localhost");
    const esIpLocalPrivada = /^((10\.)|(172\.(1[6-9]|2[0-9]|3[0-1]))|(192\.168\.)|(169\.254\.))/.test(hostname);

    return protocolo.startsWith("http") && (esHostLocal || esIpLocalPrivada);
}

function actualizarIndicadorModoDemo() {
    const badge = refs?.modoDemo;
    if (!badge) return;

    const esDemo = Boolean(sistema?.modoDemo);
    badge.hidden = !esDemo;
    badge.style.display = esDemo ? "inline-flex" : "none";
    badge.setAttribute("aria-label", esDemo ? "Sistema en modo demo" : "Sistema conectado");
}

async function cargarDatosIniciales() {
    const esArchivoLocal = window.location.protocol === "file:";
    const esServidorLocal = servidorLocalDisponible();
    const apiBase = (window.location.origin && window.location.origin !== "null")
        ? window.location.origin
        : (esServidorLocal ? "http://localhost:3000" : "http://localhost:3000");
    let huboConexion = false;

    sistema.modoDemo = true;
    actualizarIndicadorModoDemo();

    try {
        const [pResp, eResp, plResp, oResp] = await Promise.all([
            fetch(`${apiBase}/api/pacientes`, { cache: "no-store" }).catch(() => null),
            fetch(`${apiBase}/api/estudios`, { cache: "no-store" }).catch(() => null),
            fetch(`${apiBase}/api/plantillas`, { cache: "no-store" }).catch(() => null),
            fetch(`${apiBase}/api/ordenes?limit=500`, { cache: "no-store" }).catch(() => null)
        ]);

        huboConexion = [pResp, eResp, plResp, oResp].some((resp) => resp && resp.ok);

        if (pResp && pResp.ok) {
            const pacs = await pResp.json();
            if (Array.isArray(pacs)) {
                pacientes.length = 0;
                pacs.forEach((p) => pacientes.push(p));
            }
        }

        if (eResp && eResp.ok) {
            const ests = await eResp.json();
            if (Array.isArray(ests)) {
                estudios.length = 0;
                ests.forEach((e) => estudios.push(e));
            }
        }

        if (plResp && plResp.ok) {
            const pls = await plResp.json();
            const plantillaMap = {};

            if (Array.isArray(pls)) {
                pls.forEach((item) => {
                    const key = item && (item.id ?? item.plantillaId ?? item.key);
                    if (key === undefined || key === null || key === "") return;
                    const plantilla = item.plantilla ?? item.template ?? item.json ?? item;
                    if (plantilla && typeof plantilla === "object") {
                        plantillaMap[String(key)] = plantilla;
                    }
                });
            } else if (pls && typeof pls === "object") {
                Object.keys(pls).forEach((k) => {
                    const value = pls[k];
                    if (value && typeof value === "object") {
                        plantillaMap[k] = value;
                    }
                });
            }

            if (Object.keys(plantillaMap).length) {
                Object.keys(plantillas).forEach((k) => delete plantillas[k]);
                Object.keys(plantillaMap).forEach((k) => {
                    plantillas[k] = plantillaMap[k];
                });
            }
        }

        if (oResp && oResp.ok) {
            const ords = await oResp.json();
            if (Array.isArray(ords)) {
                ordenes.length = 0;
                ords.forEach((o) => {
                    try { ordenes.push(normalizarOrden(o)); } catch (e) { console.warn("Orden inválida al normalizar desde API", e); }
                });
                const maxFolioExistente = ordenes.reduce((max, orden) => Math.max(max, extraerNumeroFolio(orden?.folio)), 0);
                proximoFolio = Math.max(proximoFolio, maxFolioExistente + 1);
            }
        }
    } catch (err) {
        console.warn("Error cargando datos iniciales desde API, usando datos locales:", err);
    }

    sistema.modoDemo = !huboConexion;
    if (!esArchivoLocal && esServidorLocal && huboConexion) {
        sistema.modoDemo = false;
    }
    if (esArchivoLocal && huboConexion) {
        sistema.modoDemo = false;
    }

    window.__LABORATORIO_MODE__ = sistema.modoDemo ? "demo" : "live";
    actualizarIndicadorModoDemo();
}
