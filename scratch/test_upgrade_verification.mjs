// Polyfill localStorage for Node.js testing environment
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };
}

import { strokeRegistryService } from '../src/services/strokeRegistryService.ts';
import { historyPlantaImportEngine } from '../src/services/historyPlantaImportEngine.ts';

async function runTests() {
  console.log('=====================================================');
  console.log('INICIANDO AUDITORÍA Y TESTS DE LAS 4 ÁREAS MEJORADAS');
  console.log('=====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // =========================================================
  // 1. ÁREA 1: HISTORIA CLÍNICA DE PLANTA INTELIGENTE
  // =========================================================
  console.log('--- TEST 1: Motor de Importación Planta & Regla Anti-Alucinación ---');

  const mockPatient = {
    id: 'pat-test-01',
    internalCode: 'EMG-2026-001',
    fullName: 'JUAN PÉREZ RODRÍGUEZ',
    age: 68,
    sex: 'M',
    triageLevel: 2,
    status: 'activos',
    chiefComplaint: 'Cefalea súbita y debilidad hemicuerpo derecho',
    arrivalDateTime: '2026-09-19T14:30:00Z',
    provenance: 'Domicilio',
    cubicle: 'Cama 3',
    attendingDoctor: 'Dr. Joel Colón'
  };

  const sampleClinicalNote = `
    PACIENTE: JUAN PÉREZ RODRÍGUEZ
    EDAD: 68 AÑOS. SEXO: MASCULINO.
    MOTIVO DE CONSULTA: DEBILIDAD EN BRAZO Y PIERNA DERECHA, DIFICULTAD PARA HABLAR.
    HISTORIA DE LA ENFERMEDAD ACTUAL:
    Paciente masculino de 68 años con antecedente de hipertensión arterial mal controlada que inicia hoy a las 11:30 AM con disartria y hemiparesia derecha faciobraquiocrural súbita.
    SIGNOS VITALES:
    TA: 170/100 mmHg, FC: 84 lpm, FR: 18 rpm, Temp: 36.6 C, SatO2: 97%.
    EXAMEN FÍSICO:
    Abdomen blando, depresible, no doloroso.
    Tórax simétrico, pulmones limpios. Ruidos cardíacos rítmicos.
    Neurológico: Paciente alerta, disártrico, hemiparesia derecha 3/5.
    IMPRESIÓN DIAGNÓSTICA:
    1. EVENTO CEREBROVASCULAR ISQUÉMICO AGUDO EN TERRITORIO DE ARTERIA CEREBRAL MEDIA IZQUIERDA.
    2. CRISIS HIPERTENSIVA TIPO URGENCIAS.
  `;

  const parsed = historyPlantaImportEngine.processRawText(sampleClinicalNote, mockPatient, 'Nota_Prueba.txt', 'txt', 'EMERGENCIA');

  assert(parsed !== null, 'Motor de importación devuelve resultado estructurado');
  assert(parsed.confidenceSummary.altaCount > 0, `Campos con confianza ALTA detectados (${parsed.confidenceSummary.altaCount})`);
  assert(parsed.confidenceSummary.notDocumentedCount > 0, `Campos NO DOCUMENTADOS asignados correctamente (${parsed.confidenceSummary.notDocumentedCount})`);
  
  // Regla estricta anti-alucinación: Antecedentes quirúrgicos o ginecológicos no estaban en la nota
  assert(
    parsed.extractedHistory.pathologicalHistory.surgeries.includes('NEGADOS') || 
    parsed.extractedHistory.pathologicalHistory.surgeries.includes('NO DOCUMENTADO'),
    'Regla Anti-Alucinación: Antecedentes quirúrgicos ausentes marcados como NEGADOS/NO DOCUMENTADOS'
  );
  assert(
    parsed.extractedHistory.vitalSigns.systolicBP === 170,
    `Signos vitales extraídos fielmente: TA sistólica = ${parsed.extractedHistory.vitalSigns.systolicBP} mmHg`
  );
  assert(
    parsed.detectedDiagnoses.length >= 1,
    `Diagnósticos clínicos detectados correctamente (${parsed.detectedDiagnoses.length})`
  );

  // =========================================================
  // 2. ÁREA 4: MÓDULO ESTADÍSTICO DE EVENTOS CEREBROVASCULARES (EVC)
  // =========================================================
  console.log('\n--- TEST 2: Módulo Estadístico EVC & 3 Entidades Independientes ---');

  // Test de detección de palabras clave
  const evcDetected1 = strokeRegistryService.detectStrokeKeywords('Paciente con diagnóstico de EVC ISQUEMICO en ACM');
  const evcDetected2 = strokeRegistryService.detectStrokeKeywords('Sospecha de AIT con amaurosis fugaz transitoria');
  const evcDetected3 = strokeRegistryService.detectStrokeKeywords('Paciente con hematoma intraparenquimatoso hemorrágico');
  const evcDetected4 = strokeRegistryService.detectStrokeKeywords('Dolor abdominal tipo cólico por gastroenteritis');

  assert(evcDetected1 === true, 'Detector reconoce "EVC ISQUEMICO"');
  assert(evcDetected2 === true, 'Detector reconoce "AIT"');
  assert(evcDetected3 === true, 'Detector reconoce "hematoma intraparenquimatoso"');
  assert(evcDetected4 === false, 'Detector rechaza diagnósticos no vasculares (gastroenteritis)');

  // Test de cálculo de KPIs con entidades independientes
  const mockStrokeRecords = [
    {
      id: 'stk-1',
      patientId: 'p1',
      patientName: 'Pedro Martínez',
      age: 64,
      sex: 'M',
      strokeType: 'ISQUEMICO',
      service: 'Emergencias',
      eventDate: '2026-09-10',
      ischemicData: {
        nihssArrival: 12,
        nihssDischarge: 4,
        timeFromOnsetHours: 2,
        withinTherapeuticWindow: true,
        thrombolysisPerformed: true,
        doorToNeedleMinutes: 42,
        modifiedRankinDischarge: 1,
        disposition: 'INGRESO_SALA'
      },
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z'
    },
    {
      id: 'stk-2',
      patientId: 'p2',
      patientName: 'Rosa Altagracia',
      age: 72,
      sex: 'F',
      strokeType: 'ISQUEMICO',
      service: 'Emergencias',
      eventDate: '2026-09-12',
      ischemicData: {
        nihssArrival: 18,
        nihssDischarge: 14,
        timeFromOnsetHours: 7,
        withinTherapeuticWindow: false,
        thrombolysisPerformed: false,
        modifiedRankinDischarge: 4,
        disposition: 'INGRESO_SALA'
      },
      createdAt: '2026-09-12T10:00:00Z',
      updatedAt: '2026-09-12T10:00:00Z'
    },
    {
      id: 'stk-3',
      patientId: 'p3',
      patientName: 'Ramón Santos',
      age: 58,
      sex: 'M',
      strokeType: 'HEMORRAGICO',
      service: 'Emergencias',
      eventDate: '2026-09-14',
      hemorrhagicData: {
        location: 'GANGLIOS_BASALES',
        glasgowScore: 13,
        ichScore: 2,
        bleedingVolumeMl: 22,
        intraventricularExtension: false,
        surgicalProcedure: 'CONSERVADOR',
        icuAdmission: true,
        modifiedRankinDischarge: 3,
        inHospitalMortality: false
      },
      createdAt: '2026-09-14T10:00:00Z',
      updatedAt: '2026-09-14T10:00:00Z'
    },
    {
      id: 'stk-4',
      patientId: 'p4',
      patientName: 'Carmen Díaz',
      age: 65,
      sex: 'F',
      strokeType: 'AIT',
      service: 'Emergencias',
      eventDate: '2026-09-16',
      tiaData: {
        abcd2Score: 5,
        symptomDurationMinutes: 40,
        antiplateletTherapy: 'DOBLE_ANTIAGREGACION',
        disposition: 'OBSERVACION'
      },
      createdAt: '2026-09-16T10:00:00Z',
      updatedAt: '2026-09-16T10:00:00Z'
    }
  ];

  const kpis = strokeRegistryService.computeKpiMetrics(mockStrokeRecords);

  assert(kpis.totalEvents === 4, 'Total de eventos = 4');
  assert(kpis.totalIschemic === 2, 'Total Isquémico = 2 (separado)');
  assert(kpis.totalHemorrhagic === 1, 'Total Hemorrágico = 1 (separado)');
  assert(kpis.totalTia === 1, 'Total AIT = 1 (separado)');
  assert(kpis.thrombolysisCount === 1, 'Pacientes trombolizados = 1');
  assert(kpis.thrombolysisPercentage === 50, 'Tasa de trombolisis isquémica = 50% (1 de 2)');
  assert(kpis.averageDoorToNeedleMinutes === 42, 'Tiempo puerta-aguja promedio = 42 minutos');
  assert(kpis.sexDistribution.male === 2 && kpis.sexDistribution.female === 2, 'Distribución de sexo: 2 Hombres, 2 Mujeres');

  console.log('\n=====================================================');
  console.log(`RESULTADO DE AUDITORÍA: ${passedTests} de ${totalTests} pruebas superadas con éxito`);
  console.log('=====================================================');
}

runTests().catch(err => {
  console.error('Error durante la ejecución del test:', err);
  process.exit(1);
});
