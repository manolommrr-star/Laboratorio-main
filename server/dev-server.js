// Lightweight development server (no external dependencies)
// - Serves static files from project root
// - Provides simple JSON file-backed REST API under /api/
// Data files: server/data/pacientes.json, estudios.json, plantillas.json, ordenes.json

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const MAX_BODY_BYTES = 5 * 1024 * 1024;

// --- Limites de operacion a largo plazo ---
const DEFAULT_ORDENES_LIMIT = 500; // registros mas recientes que entrega el historial
const MAX_ORDENES_LIMIT = 2000;    // techo duro por peticion

const MAX_BACKUPS = 5;
// Cadencia minima entre respaldos: configurable via variable de entorno
// (default 30 s; util para ajustar equipos lentos o pruebas rapidas)
const BACKUP_INTERVALO_MS = Math.max(1000, parseInt(process.env.BACKUP_INTERVALO_MS || "30000", 10) || 30000);
let _ultimoRespaldoMs = 0;
let _respaldoProgramado = null;

function backupData() {
  const ahora = Date.now();
  if (_respaldoProgramado) return; // ya hay respaldo pendiente: no duplicar
  if (_ultimoRespaldoMs !== 0 && ahora - _ultimoRespaldoMs < BACKUP_INTERVALO_MS) {
    // Vaciado diferido: nunca se pierde el ultimo cambio, solo se agrupa
    _respaldoProgramado = setTimeout(() => {
      _respaldoProgramado = null;
      backupData();
    }, BACKUP_INTERVALO_MS - (ahora - _ultimoRespaldoMs) + 50);
    if (_respaldoProgramado.unref) _respaldoProgramado.unref();
    return;
  }
  _ultimoRespaldoMs = Date.now();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  if (!fs.existsSync(DATA_DIR)) return;
  let backups = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('data-') && f.endsWith('.zip'));
  backups.sort((a, b) => (a < b ? 1 : -1));
  while (backups.length >= MAX_BACKUPS) fs.unlinkSync(path.join(DATA_DIR, backups.pop()));
  const to = path.join(DATA_DIR, `data-${stamp}.zip`);
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  let zip = '';
  for (const f of files) zip += `=== ${f} ===\n${fs.readFileSync(path.join(DATA_DIR, f), 'utf8')}\n\n`;
  fs.writeFileSync(to, zip);
  console.log(`[backup] Respaldado: ${to}`);
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
backupData();

const defaultStudyCatalog = [
  { id: 1, nombre: 'Biometría Hemática', muestra: 'Sangre Entera', precioSugerido: 150 },
  { id: 2, nombre: 'Ácido Úrico', muestra: 'Suero', precioSugerido: 75 },
  { id: 3, nombre: 'Alaninoaminotransferasa (TGP)', muestra: 'Suero', precioSugerido: 90 },
  { id: 4, nombre: 'Albúmina', muestra: 'Suero', precioSugerido: 90 },
  { id: 5, nombre: 'Amiba en fresco', muestra: 'Heces', precioSugerido: 280 },
  { id: 6, nombre: 'Anti dengue', muestra: 'Suero', precioSugerido: 380 },
  { id: 7, nombre: 'Anti-sífilis', muestra: 'Suero', precioSugerido: 180 },
  { id: 8, nombre: 'Antidopina (6)', muestra: 'Suero', precioSugerido: 400 },
  { id: 9, nombre: 'Antiestreptolisina (ASO)', muestra: 'Suero', precioSugerido: 110 },
  { id: 10, nombre: 'Antígeno prostático', muestra: 'Suero', precioSugerido: 350 },
  { id: 11, nombre: 'Asparto aminotransferasa (TGO)', muestra: 'Suero', precioSugerido: 90 },
  { id: 12, nombre: 'Bilirrubinas (BT, BD, BI)', muestra: 'Suero', precioSugerido: 180 },
  { id: 13, nombre: 'Cistatina C', muestra: 'Suero', precioSugerido: 680 },
  { id: 14, nombre: 'Colesterol', muestra: 'Suero', precioSugerido: 75 },
  { id: 15, nombre: 'Colesterol (HDL)', muestra: 'Suero', precioSugerido: 190 },
  { id: 16, nombre: 'Colesterol y triglicéridos', muestra: 'Suero', precioSugerido: 140 },
  { id: 17, nombre: 'Coprológico', muestra: 'Heces', precioSugerido: 300 },
  { id: 18, nombre: 'Coproparasitoscópico (3 muestras)', muestra: 'Heces', precioSugerido: 250 },
  { id: 19, nombre: 'Coproparasitoscópico único (CPU)', muestra: 'Heces', precioSugerido: 100 },
  { id: 20, nombre: 'Creatinina', muestra: 'Suero', precioSugerido: 75 },
  { id: 21, nombre: 'Curva de tolerancia a la glucosa', muestra: 'Suero', precioSugerido: 350 },
  { id: 22, nombre: 'Deshidrogenasa láctica', muestra: 'Suero', precioSugerido: 90 },
  { id: 23, nombre: 'EGO', muestra: 'Orina', precioSugerido: 80 },
  { id: 24, nombre: 'Eosinófilos en moco nasal', muestra: 'Moco nasal', precioSugerido: 190 },
  { id: 25, nombre: 'FR', muestra: 'Suero', precioSugerido: 110 },
  { id: 26, nombre: 'Glucosa', muestra: 'Suero', precioSugerido: 40 },
  { id: 27, nombre: 'Glucosa postprandial', muestra: 'Suero', precioSugerido: 100 },
  { id: 28, nombre: 'Grupo RH', muestra: 'Suero', precioSugerido: 60 },
  { id: 29, nombre: 'Hb glicosilada', muestra: 'Suero', precioSugerido: 350 },
  { id: 30, nombre: 'HCG', muestra: 'Suero', precioSugerido: 100 },
  { id: 31, nombre: 'HCG cuantitativa', muestra: 'Suero', precioSugerido: 380 },
  { id: 32, nombre: 'Helicobacter pylori', muestra: 'Heces', precioSugerido: 650 },
  { id: 33, nombre: 'Material pediátrico', muestra: 'Mariposa', precioSugerido: 50 },
  { id: 34, nombre: 'Moco fecal', muestra: 'Heces', precioSugerido: 190 },
  { id: 35, nombre: 'PCR', muestra: 'Suero', precioSugerido: 110 },
  { id: 36, nombre: 'Perfil de lípidos', muestra: 'Suero', precioSugerido: 300 },
  { id: 37, nombre: 'Perfil de proteína (PT, ALBU, R A/G)', muestra: 'Suero', precioSugerido: 280 },
  { id: 38, nombre: 'Perfil embarazo (GLU, VIH, VRL, GPO RH)', muestra: 'Suero', precioSugerido: 430 },
  { id: 39, nombre: 'Perfil reumático', muestra: 'Suero', precioSugerido: 380 },
  { id: 40, nombre: 'PFH completas', muestra: 'Suero', precioSugerido: 380 },
  { id: 41, nombre: 'PFH completas II (GGT)', muestra: 'Suero', precioSugerido: 600 },
  { id: 42, nombre: 'Pruebas de funcionamiento hepático (BT, BD, BI, TGO, TGP)', muestra: 'Suero', precioSugerido: 380 },
  { id: 43, nombre: 'QS metabólica', muestra: 'Suero', precioSugerido: 150 },
  { id: 44, nombre: 'QS parcial', muestra: 'Suero', precioSugerido: 150 },
  { id: 45, nombre: 'Química sanguínea 15 elementos', muestra: 'Suero', precioSugerido: 660 },
  { id: 46, nombre: 'Química sanguínea 25 elementos', muestra: 'Suero', precioSugerido: 750 },
  { id: 47, nombre: 'Química sanguínea 4 elementos', muestra: 'Suero', precioSugerido: 215 },
  { id: 48, nombre: 'Química sanguínea completa', muestra: 'Suero', precioSugerido: 280 },
  { id: 49, nombre: 'Reacciones febriles', muestra: 'Suero', precioSugerido: 100 },
  { id: 50, nombre: 'Reticulocitos', muestra: 'Suero', precioSugerido: 100 },
  { id: 51, nombre: 'Sangre oculta en heces', muestra: 'Heces', precioSugerido: 200 },
  { id: 52, nombre: 'Tiempos de coagulación', muestra: 'Plasma citrato', precioSugerido: 220 },
  { id: 53, nombre: 'TP', muestra: 'Plasma citrato', precioSugerido: 120 },
  { id: 54, nombre: 'Triglicéridos', muestra: 'Suero', precioSugerido: 75 },
  { id: 55, nombre: 'TTP', muestra: 'Plasma citrato', precioSugerido: 120 },
  { id: 56, nombre: 'Urea', muestra: 'Suero', precioSugerido: 75 },
  { id: 57, nombre: 'VDRL', muestra: 'Suero', precioSugerido: 150 },
  { id: 58, nombre: 'VIH', muestra: 'Suero', precioSugerido: 150 },
  { id: 59, nombre: 'VSG', muestra: 'Suero', precioSugerido: 100 }
];

const defaultPlantillas = {
  '1': {
    nombre: 'Biometría Hemática',
    membrete: 'general',
    grupos: [
      {
        nombre: 'SERIE BLANCA',
        parametros: [
          {
            nombre: 'Leucocitos',
            unidad: 'x10^3/µL',
            referencia: {
              base: '4.00 - 10.5',
              edad: {
                '0': { valor: '9.1 - 34.0' },
                '1': { valor: '6.0 - 14.0' },
                '2': { valor: '4.00 - 12.0' },
                '10': { valor: '4.00 - 10.5' }
              }
            }
          },
          { nombre: 'Linfocitos', unidad: '%', referencia: '20 - 45' },
          { nombre: 'Segmentados', unidad: '%', referencia: '40 - 70' },
          { nombre: 'Bandas', unidad: '%', referencia: '0 - 5' },
          { nombre: 'Eosinófilos', unidad: '%', referencia: '0 - 5' },
          { nombre: 'Monocitos', unidad: '%', referencia: '2 - 10' },
          { nombre: 'Basófilos', unidad: '%', referencia: '0 - 2' }
        ]
      },
      {
        nombre: 'SERIE ROJA',
        parametros: [
          {
            nombre: 'Eritrocitos',
            unidad: 'x10^6/µL',
            referencia: {
              base: '4.10 - 5.40',
              porSexo: { M: '4.20 - 6.00', F: '4.10 - 5.40' },
              edad: {
                '0': { valor: '4.10 - 6.70' },
                '1': { valor: '3.80 - 5.40' },
                '2': { valor: '4.00 - 5.30' },
                '10': { porSexo: { M: '4.20 - 5.60', F: '4.10 - 5.30' } },
                '18': { porSexo: { M: '4.70 - 6.00', F: '4.20 - 5.40' } }
              }
            }
          },
          {
            nombre: 'Hemoglobina',
            unidad: 'g/dL',
            referencia: {
              base: '12.5 - 16.0',
              porSexo: { M: '13.5 - 18.0', F: '12.5 - 16.0' },
              edad: {
                '0': { valor: '15.0 - 24.0' },
                '1': { valor: '10.5 - 14.0' },
                '2': { valor: '11.5 - 14.5' },
                '10': { porSexo: { M: '12.5 - 16.1', F: '12.0 - 15.0' } },
                '18': { porSexo: { M: '13.5 - 18.0', F: '12.5 - 16.0' } }
              }
            }
          },
          {
            nombre: 'Hematocrito',
            unidad: '%',
            referencia: {
              base: '37.0 - 47.0',
              porSexo: { M: '42.0 - 52.0', F: '37.0 - 47.0' },
              edad: {
                '0': { valor: '44.0 - 70.0' },
                '1': { valor: '32.0 - 42.0' },
                '2': { valor: '33.0 - 43.0' },
                '10': { porSexo: { M: '36.0 - 47.0', F: '35.0 - 45.0' } },
                '18': { porSexo: { M: '42.0 - 52.0', F: '37.0 - 47.0' } }
              }
            }
          },
          {
            nombre: 'VCM',
            unidad: 'fL',
            referencia: {
              base: '78.0 - 100.0',
              edad: {
                '0': { valor: '102.0 - 115.0' },
                '1': { valor: '72.0 - 88.0' },
                '2': { valor: '76.0 - 90.0' },
                '10': { valor: '78.0 - 95.0' },
                '18': { valor: '78.0 - 100.0' }
              }
            }
          },
          {
            nombre: 'HCM',
            unidad: 'pg',
            referencia: {
              base: '27.0 - 31.0',
              edad: {
                '0': { valor: '33.0 - 39.0' },
                '1': { valor: '24.0 - 30.0' },
                '2': { valor: '25.0 - 31.0' },
                '10': { porSexo: { M: '26.0 - 31.0', F: '26.0 - 32.0' } },
                '18': { valor: '27.0 - 31.0' }
              }
            }
          },
          { nombre: 'CHCM', unidad: 'g/dL', referencia: '32.0 - 36.0' },
          {
            nombre: 'RDW',
            unidad: '%',
            referencia: {
              base: '11.5 - 14.0',
              edad: {
                '0': { valor: '10.0 - 16.0' },
                '1': { valor: '11.5 - 16.0' },
                '2': { valor: '11.5 - 15.0' },
                '10': { valor: '11.5 - 14.0' },
                '18': { valor: '11.5 - 14.0' }
              }
            }
          }
        ]
      },
      {
        nombre: 'PLAQUETAS',
        parametros: [
          { nombre: 'Plaquetas', unidad: 'x10^3/µL', referencia: '150 - 400' },
          { nombre: 'MPV', unidad: 'fL', referencia: '7.0 - 11.0' },
          { nombre: 'PCT', unidad: '%', referencia: '0.20 - 0.50' },
          { nombre: 'PDW', unidad: '%', referencia: '10.0 - 28.0' }
        ]
      }
    ],
    observaciones: ''
  }
};

const defaultPlantillasExtras = {
  20: {
    nombre: 'Creatinina',
    membrete: 'general',
    grupos: [{ nombre: 'RESULTADOS', parametros: [{ nombre: 'Creatinina', unidad: 'mg/dL', referencia: '0.70 - 1.40' }] }],
    observaciones: ''
  },
  26: {
    nombre: 'Glucosa',
    membrete: 'general',
    grupos: [{ nombre: 'RESULTADOS', parametros: [{ nombre: 'Glucosa', unidad: 'mg/dL', referencia: '60.0 - 110.0' }] }],
    observaciones: ''
  },
  29: {
    nombre: 'Hemoglobina glicosilada',
    membrete: 'general',
    grupos: [{ nombre: 'HEMOGLOBINA GLICOSILADA', parametros: [
      { nombre: 'HbA1c', unidad: '%', referencia: '4.00 - 6.00' },
      { nombre: 'Control pobre', unidad: '%', referencia: '8.00 - 10.00' },
      { nombre: 'Buen control', unidad: '%', referencia: '6.00 - 8.00' },
      { nombre: 'eAG', unidad: 'mg/dL', referencia: 'Sano: <120.00; Prediabetes: 120.00 - 135.00; Diabetes: >135.00' }
    ] }],
    observaciones: ''
  },
  31: {
    nombre: 'HCG cuantitativa',
    membrete: 'general',
    grupos: [{ nombre: 'HCG', parametros: [{ nombre: 'HCG', unidad: 'mUI/mL', referencia: 'Semanas 4-5: 1,500-23,000; 5-6: 3,400-135,300; 6-7: 10,500-161,000; 7-8: 18,000-209,000; 8-9: 37,500-218,000; 9-10: 42,800-219,000; 10-11: 33,700-218,700; 11-12: 21,800-193,200; 12-13: 20,300-166,100; 13-14: 15,400-190,000; 14-26: 2,800-176,100; 26-29: 2,800-144,400' }] }],
    observaciones: ''
  },
  36: {
    nombre: 'Perfil de lípidos',
    membrete: 'general',
    grupos: [{ nombre: 'COLESTEROL Y TRIGLICÉRIDOS', parametros: [
      { nombre: 'Triglicéridos', unidad: 'mg/dL', referencia: 'Óptimo: <150; Límite alto: 150-199; Alto: 200-499; Riesgo alto: >500' },
      { nombre: 'Colesterol total', unidad: 'mg/dL', referencia: 'Óptimo: <200; Límite alto: 200-239; Riesgo alto: >240' },
      { nombre: 'HDL', unidad: 'mg/dL', referencia: 'Óptimo: >60; Riesgo alto: <40' },
      { nombre: 'LDL', unidad: 'mg/dL', referencia: 'Óptimo: <100; Cercano al Óptimo: 100-129; Límite alto: 130-159; Alto: 160-189; Muy alto: >190' },
      { nombre: 'VLDL', unidad: 'mg/dL', referencia: '6.0 - 30.0' },
      { nombre: 'Índice aterogénico', unidad: '', referencia: 'Óptimo: <3.0; Limítrofe: 3.0-5.0; Riesgo alto: >5.0' }
    ] }],
    observaciones: ''
  },
  38: {
    nombre: 'Perfil embarazo',
    membrete: 'general',
    grupos: [{ nombre: 'EMBARAZO', parametros: [
      { nombre: 'Glucosa', unidad: 'mg/dL', referencia: '60.0 - 110.0' },
      { nombre: 'V.D.R.L.', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Reactivo'] },
      { nombre: 'Ac. Anti HIV1/HIV2', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Reactivo'] },
      { nombre: 'Grupo sanguíneo', unidad: '', referencia: 'A, B, AB, O', tipo: 'select', opciones: ['A', 'B', 'AB', 'O'] },
      { nombre: 'Rh', unidad: '', referencia: 'Positivo o Negativo', tipo: 'select', opciones: ['Positivo', 'Negativo'] }
    ] }],
    observaciones: ''
  },
  40: {
    nombre: 'PFH completas',
    membrete: 'general',
    grupos: [{ nombre: 'FUNCIONAMIENTO HEPÁTICO', parametros: [
      { nombre: 'Bilirrubina total', unidad: 'mg/dL', referencia: '0.20 - 1.20' },
      { nombre: 'Bilirrubina directa', unidad: 'mg/dL', referencia: '0.00 - 0.50' },
      { nombre: 'Bilirrubina indirecta', unidad: 'mg/dL', referencia: '0.00 - 1.00' },
      { nombre: 'AST/TGO', unidad: 'U/L', referencia: '3.0 - 33.0' },
      { nombre: 'ALT/TGP', unidad: 'U/L', referencia: '8.0 - 35.0' },
      { nombre: 'Proteínas totales', unidad: 'g/dL', referencia: '5.5 - 8.0' },
      { nombre: 'Albúmina', unidad: 'g/dL', referencia: '3.5 - 4.8' },
      { nombre: 'Globulina', unidad: 'g/dL', referencia: '2.3 - 3.5' },
      { nombre: 'Relación A/G', unidad: '', referencia: '1.0 - 2.3' }
    ] }],
    observaciones: ''
  },
  49: {
    nombre: 'Reacciones febriles',
    membrete: 'general',
    grupos: [{ nombre: 'REACCIONES FEBRILES', parametros: [
      { nombre: 'Tífico H', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Positivo'] },
      { nombre: 'Tífico O', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Positivo'] },
      { nombre: 'Paratífico A', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Positivo'] },
      { nombre: 'Paratífico B', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Positivo'] },
      { nombre: 'Brucella abortus', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Positivo'] },
      { nombre: 'Proteus OX', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Positivo'] }
    ] }],
    observaciones: ''
  },
  52: {
    nombre: 'Tiempos de coagulación',
    membrete: 'general',
    grupos: [{ nombre: 'COAGULACIÓN', parametros: [
      { nombre: 'TP', unidad: 'seg', referencia: '10.0 - 17.0' },
      { nombre: 'INR', unidad: '', referencia: '0.90 - 1.10' },
      { nombre: '% actividad', unidad: '%', referencia: '84%' },
      { nombre: 'TTP', unidad: 'seg', referencia: '20.0 - 40.0' }
    ] }],
    observaciones: ''
  },
  54: {
    nombre: 'Triglicéridos',
    membrete: 'general',
    grupos: [{ nombre: 'RESULTADOS', parametros: [{ nombre: 'Triglicéridos', unidad: 'mg/dL', referencia: 'Óptimo: <150; Límite alto: 150-199; Alto: 200-499; Riesgo alto: >500' }] }],
    observaciones: ''
  },
  56: {
    nombre: 'Urea',
    membrete: 'general',
    grupos: [{ nombre: 'RESULTADOS', parametros: [{ nombre: 'Urea', unidad: 'mg/dL', referencia: '15.0 - 45.0' }] }],
    observaciones: ''
  },
  57: {
    nombre: 'VDRL',
    membrete: 'general',
    grupos: [{ nombre: 'RESULTADOS', parametros: [{ nombre: 'V.D.R.L.', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Reactivo'] }] }],
    observaciones: ''
  },
  58: {
    nombre: 'VIH',
    membrete: 'general',
    grupos: [{ nombre: 'RESULTADOS', parametros: [
      { nombre: 'Ac. Anti HIV1/HIV2', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Reactivo'] },
      { nombre: 'Antígeno HIV p24', unidad: '', referencia: 'Negativo', tipo: 'select', opciones: ['Negativo', 'Reactivo'] }
    ] }],
    observaciones: ''
  }
};
Object.assign(defaultPlantillas, defaultPlantillasExtras);

function loadJson(name, defaultValue) {
  const p = path.join(DATA_DIR, name + '.json');
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.warn('Error reading', p, e);
  }
  fs.writeFileSync(p, JSON.stringify(defaultValue, null, 2), 'utf8');
  return defaultValue;
}

function saveJson(name, data) {
  const p = path.join(DATA_DIR, name + '.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  createBackup();
}

function createBackup() {
  try {
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const src = path.join(DATA_DIR, f);
      const dest = path.join(backupDir, f.replace(/\.json$/, `_${stamp}.json`));
      fs.copyFileSync(src, dest);
    }
    // Keep only the latest 10 backups per file
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    if (backups.length > 10) {
      backups.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
    }
  } catch (e) {
    console.warn('Backup failed:', e);
  }
}

function asignarFolioUnico(orden) {
  const numeroActual = Number(String(orden?.folio ?? '').match(/(\d+)/)?.[1] || 0);
  const numerosExistentes = ordenes.map((item) => Number(String(item?.folio ?? '').match(/(\d+)/)?.[1] || 0));
  const siguiente = Math.max(0, ...numerosExistentes, numeroActual) + 1;
  orden.folio = `F${String(siguiente).padStart(6, '0')}`;
  return orden;
}

function normalizarOrdenPersistencia(orden) {
  if (!orden || typeof orden !== 'object') return orden;

  const pago = orden.pago && typeof orden.pago === 'object' ? orden.pago : {};
  const total = Number(pago.total ?? 0);
  const pagado = Number(pago.pagado ?? 0);
  const saldo = Number(pago.saldo ?? Math.max(0, total - pagado));

  const normalizada = {
    ...orden,
    estado: String(orden.estado ?? 'POR_CAPTURAR').toUpperCase().replace(/\s+/g, '_'),
    pago: {
      total,
      pagado,
      saldo
    },
    historial: orden.historial && typeof orden.historial === 'object' ? {
      ...orden.historial,
      eventos: Array.isArray(orden.historial.eventos) ? orden.historial.eventos : []
    } : { eventos: [] },
    metadatos: orden.metadatos && typeof orden.metadatos === 'object' ? { ...orden.metadatos } : { origen: 'recepcion', usuario: 'admin' }
  };

  delete normalizada.pagos;
  return normalizada;
}

function seedIfEmpty() {
  if (!Array.isArray(loadJson('estudios', [])) || loadJson('estudios', []).length === 0) {
    const estudiosSeed = JSON.parse(JSON.stringify(defaultStudyCatalog));
    fs.writeFileSync(path.join(DATA_DIR, 'estudios.json'), JSON.stringify(estudiosSeed, null, 2), 'utf8');
  }

  const templateSeed = loadJson('plantillas', {});
  if (!templateSeed || Object.keys(templateSeed).length === 0) {
    fs.writeFileSync(path.join(DATA_DIR, 'plantillas.json'), JSON.stringify(JSON.parse(JSON.stringify(defaultPlantillas)), null, 2), 'utf8');
  }
}

let pacientes = loadJson('pacientes', []);
let estudios = loadJson('estudios', []);
let plantillas = loadJson('plantillas', {});
let ordenes = (loadJson('ordenes', []) || []).map(normalizarOrdenPersistencia);

seedIfEmpty();

pacientes = loadJson('pacientes', []);
estudios = loadJson('estudios', []);
plantillas = loadJson('plantillas', {});
ordenes = (loadJson('ordenes', []) || []).map(normalizarOrdenPersistencia);

if (ordenes.length) {
  saveJson('ordenes', ordenes);
  backupData();
}

function sendJson(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function serveStatic(req, res, parsed) {
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > MAX_BYTES) {
      const err = new Error('El cuerpo de la peticion es demasiado grande.');
      err.statusCode = 413;
      reject(err);
      return;
    }

    let body = '';
    let excedido = false;
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (Buffer.byteLength(body) > MAX_BYTES) excedido = true;
    });
    req.on('end', () => {
      if (excedido) {
        const err = new Error('El cuerpo de la peticion es demasiado grande.');
        err.statusCode = 413;
        reject(err);
        return;
      }
      // Rechazar JSON invalido en lugar de guardar datos corruptos
      if (body) {
        try {
          return resolve(JSON.parse(body));
        } catch (e) {
          const err = new Error('Cuerpo invalido: no es JSON valido.');
          err.statusCode = 400;
          return reject(err);
        }
      }
      return resolve(null);
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method;
  // API routes
  if (parsed.pathname.startsWith('/api/')) {
    const parts = parsed.pathname.split('/').filter(Boolean); // ['api', 'ordenes', ':id']
    const resource = parts[1];

    try {
      if (method === 'GET' && resource === 'pacientes') return sendJson(res, pacientes);
      if (method === 'GET' && resource === 'estudios') return sendJson(res, estudios);
      if (method === 'GET' && resource === 'plantillas') return sendJson(res, plantillas);
      if (method === 'GET' && resource === 'ordenes') {
        // Historial acotado: devuelve los N registros mas recientes (paginable)
        const q = parsed.query || {};
        let limite = parseInt(q.limit, 10);
        if (!Number.isFinite(limite) || limite <= 0) limite = DEFAULT_ORDENES_LIMIT;
        limite = Math.min(limite, MAX_ORDENES_LIMIT);
        let lista = ordenes.map(normalizarOrdenPersistencia);
        lista.sort((a, b) => {
          const fa = String(a.createdAt || '');
          const fb = String(b.createdAt || '');
          if (fa !== fb) return fb.localeCompare(fa);
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });
        lista = lista.slice(0, limite);
        return sendJson(res, lista);
      }

      if (method === 'POST' && resource === 'ordenes') {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return sendJson(res, { error: 'El cuerpo de la orden debe ser un objeto JSON.' }, 400);
        }
        // Validaciones minimas de integridad
        const tienePaciente = Boolean(body.paciente && typeof body.paciente === 'object' && body.paciente.nombre);
        const tieneEstudios = Array.isArray(body.estudios) && body.estudios.length > 0;
        if (!tienePaciente) {
          return sendJson(res, { error: 'La orden requiere un paciente con nombre.' }, 400);
        }
        if (!tieneEstudios) {
          return sendJson(res, { error: 'La orden debe incluir al menos un estudio.' }, 400);
        }
        const preparedBody = { ...body, id: body.id ?? Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (!body.folio || ordenes.some((item) => String(item.folio) === String(body.folio))) {
          asignarFolioUnico(preparedBody);
        } else {
          preparedBody.folio = body.folio;
        }
        const prepared = normalizarOrdenPersistencia(preparedBody);
        ordenes.push(prepared);
        saveJson('ordenes', ordenes);
        backupData();
        return sendJson(res, prepared, 201);
      }

      const ESTADOS_VALIDOS_ORDEN = ['POR_CAPTURAR', 'CAPTURADA', 'POR_ENTREGAR', 'ENTREGADA', 'CANCELADA'];
      if (method === 'PUT' && resource === 'ordenes' && parts.length >= 3) {
        const ident = parts[2];
        const body = await parseBody(req) || {};
        let orden = ordenes.find(o => String(o.id) === ident || String(o.folio) === ident);
        if (!orden) orden = ordenes.find(o => String(o.id) === String(Number(ident)));
        if (!orden) return sendJson(res, { error: 'Orden no encontrada' }, 404);

        let nuevoEstado = orden.estado;
        if (body.estado !== undefined && body.estado !== null && body.estado !== '') {
          nuevoEstado = String(body.estado).toUpperCase().replace(/\s+/g, '_');
          if (!ESTADOS_VALIDOS_ORDEN.includes(nuevoEstado)) {
            return sendJson(res, { error: 'Estado invalido: ' + body.estado }, 400);
          }
        }

        const merged = {
          ...orden,
          ...body,
          id: orden.id ?? body.id ?? ident,
          folio: body.folio ?? orden.folio,
          updatedAt: new Date().toISOString(),
          estado: nuevoEstado
        };

        const idx = ordenes.findIndex(o => String(o.id) === String(orden.id) || String(o.folio) === String(orden.folio));
        if (idx >= 0) ordenes[idx] = merged;
        saveJson('ordenes', ordenes);
        backupData();
        return sendJson(res, merged);
      }

      if (method === 'POST' && resource === 'pacientes') {
        const body = await parseBody(req) || {};
        body.id = body.id ?? Date.now();
        pacientes.push(body); saveJson('pacientes', pacientes); return sendJson(res, body, 201);
      }

      if (method === 'PUT' && resource === 'pacientes' && parts.length >= 3) {
        const ident = parts[2];
        const body = await parseBody(req) || {};
        let idx = pacientes.findIndex(p => String(p.id) === ident);
        if (idx === -1) idx = pacientes.findIndex(p => String(p.id) === String(Number(ident)));
        if (idx === -1) return sendJson(res, { error: 'Paciente no encontrado' }, 404);
        pacientes[idx] = { ...pacientes[idx], ...body };
        saveJson('pacientes', pacientes);
        backupData();
        return sendJson(res, pacientes[idx]);
      }

      if (method === 'DELETE' && resource === 'pacientes' && parts.length >= 3) {
        const ident = parts[2];
        const before = pacientes.length;
        pacientes = pacientes.filter(p => String(p.id) !== ident && String(p.id) !== String(Number(ident)));
        saveJson('pacientes', pacientes);
        backupData();
        return sendJson(res, { deleted: before - pacientes.length });
      }

      if (method === 'POST' && resource === 'estudios') {
        const body = await parseBody(req) || {};
        body.id = body.id ?? Date.now();
        estudios.push(body); saveJson('estudios', estudios); return sendJson(res, body, 201);
      }

      if (method === 'PUT' && resource === 'estudios' && parts.length >= 3) {
        const ident = parts[2];
        const body = await parseBody(req) || {};
        let idx = estudios.findIndex(p => String(p.id) === ident);
        if (idx === -1) idx = estudios.findIndex(p => String(p.id) === String(Number(ident)));
        if (idx === -1) return sendJson(res, { error: 'Estudio no encontrado' }, 404);
        estudios[idx] = { ...estudios[idx], ...body };
        saveJson('estudios', estudios);
        backupData();
        return sendJson(res, estudios[idx]);
      }

      if (method === 'DELETE' && resource === 'estudios' && parts.length >= 3) {
        const ident = parts[2];
        const before = estudios.length;
        estudios = estudios.filter(p => String(p.id) !== ident && String(p.id) !== String(Number(ident)));
        saveJson('estudios', estudios);
        backupData();
        return sendJson(res, { deleted: before - estudios.length });
      }

      // Persistir plantillas: aceptar objeto con claves por id o { id, plantilla }
      if (method === 'POST' && resource === 'plantillas') {
        const body = await parseBody(req) || {};
        if (body && typeof body === 'object') {
          if (body.id && body.plantilla) {
            plantillas[String(body.id)] = body.plantilla;
          } else {
            // Merge keys into plantillas (expecting { "1": { ... }, ... })
            Object.keys(body).forEach((k) => {
              plantillas[k] = body[k];
            });
          }
          saveJson('plantillas', plantillas);
          backupData();
          return sendJson(res, body, 201);
        }
      }

      if (method === 'PUT' && resource === 'plantillas' && parts.length >= 3) {
        const ident = parts[2];
        const body = await parseBody(req) || {};
        plantillas[String(ident)] = body;
        saveJson('plantillas', plantillas);
        backupData();
        return sendJson(res, { id: ident, plantilla: body });
      }

      if (method === 'DELETE' && resource === 'plantillas' && parts.length >= 3) {
        const ident = parts[2];
        const existed = !!plantillas[String(ident)];
        delete plantillas[String(ident)];
        saveJson('plantillas', plantillas);
        backupData();
        return sendJson(res, { deleted: existed ? 1 : 0 });
      }

      if (method === 'DELETE' && resource === 'ordenes' && parts.length >= 3) {
        const ident = parts[2];
        const before = ordenes.length;
        ordenes = ordenes.filter(p => String(p.id) !== ident && String(p.id) !== String(Number(ident)) && String(p.folio) !== ident);
        saveJson('ordenes', ordenes);
        backupData();
        return sendJson(res, { deleted: before - ordenes.length });
      }

      return sendJson(res, { error: 'Ruta API no encontrada' }, 404);
    } catch (e) {
      console.error('API error', e);
      return sendJson(res, { error: 'Error interno' }, 500);
    }
  }

  // Non-API: serve static files
  serveStatic(req, res, url.parse(req.url));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Dev server listening on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => { console.log('Shutting down'); server.close(() => process.exit(0)); });
