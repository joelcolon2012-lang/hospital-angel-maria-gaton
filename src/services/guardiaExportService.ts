/**
 * Servicio Oficial de Exportación de Guardia Clínica — Medicina Interna
 * Hospital Regional Dr. Ángel María Gatón
 * 
 * Cumple con Sección 43:
 * - Exportar Guardia en PDF y Word (DOCX / HTML-DOC compatible)
 * - Mantiene el diseño horizontal exacto:
 *   CAMA | PACIENTE | MOTIVO | DIAGNÓSTICOS | PARACLÍNICAS | TRATAMIENTO | PENDIENTES
 * - Membrete institucional oficial y censo resumen
 */

import { Patient, MedicalOrder, LabResult, PendingTask } from '../types';

export interface GuardiaExportData {
  serviceName: string;
  guardDate: string;
  shift: string;
  attendingDoctor: string;
  totalPatients: number;
  totalBeds: number;
  availableBeds: number;
  newAdmissions: number;
  transfers: number;
  discharges: number;
  deaths: number;
  patients: Array<{
    bedCode: string;
    patient?: Patient;
    chiefComplaint: string;
    diagnoses: string[];
    suggestedDiagnoses: string[];
    labs: LabResult[];
    orders: MedicalOrder[];
    pendingTasks: PendingTask[];
  }>;
}

export function exportGuardiaToWord(data: GuardiaExportData) {
  const patientRows = data.patients.map((p) => {
    const pat = p.patient;
    const bedStr = p.bedCode;
    const patName = pat ? pat.fullName.toUpperCase() : 'CAMAS DISPONIBLE';
    const patDetails = pat
      ? `${pat.age || '--'}a • ${pat.sex || '--'} • Récord: ${pat.medicalRecordNumber || pat.internalCode || '--'}<br><small style="color: #64748b;">Ingreso: ${pat.arrivalDateTime || '--'}</small>`
      : '<span style="color: #10b981; font-weight: bold;">DISPONIBLE</span>';

    const chiefComplaint = p.chiefComplaint || pat?.chiefComplaint || '--';

    const activeDx = p.diagnoses.map(d => `• ${d}`).join('<br>');
    const sugDx = p.suggestedDiagnoses.length > 0
      ? `<div style="margin-top: 4px; padding: 3px 6px; background-color: #fef3c7; border-left: 2px solid #f59e0b; font-size: 8.5pt;"><strong>[Sugeridos Lab]:</strong><br>${p.suggestedDiagnoses.map(s => `• ${s}`).join('<br>')}</div>`
      : '';
    const diagCell = `${activeDx || 'En estudio'}${sugDx}`;

    // Paraclínicas en orden cronológico inverso
    const labsByTime = new Map<string, string[]>();
    p.labs.forEach(l => {
      const dateKey = (l.timestamp || '').slice(0, 10) || 'Reciente';
      const list = labsByTime.get(dateKey) || [];
      const flagSymbol = l.flag === 'alto' ? ' ↑' : l.flag === 'bajo' ? ' ↓' : l.flag === 'critico' ? ' 🔴' : '';
      list.push(`${l.parameter}: ${l.value}${l.unit ? ' ' + l.unit : ''}${flagSymbol}`);
      labsByTime.set(dateKey, list);
    });

    let labCell = '';
    labsByTime.forEach((items, dateKey) => {
      labCell += `<div style="margin-bottom: 4px; font-size: 8.5pt;"><strong>[${dateKey}]:</strong><br>${items.join(' • ')}</div>`;
    });
    if (!labCell) labCell = '<span style="color: #94a3b8;">Sin analíticas cargadas</span>';

    // Tratamiento
    const ordersStr = p.orders.map(o => {
      const abxDay = o.treatmentDay ? ` <strong>[D-${o.treatmentDay}]</strong>` : '';
      return `• <strong>${o.name}</strong> ${o.dose || ''} ${o.route || ''} ${o.frequency || ''}${abxDay}`;
    }).join('<br>') || '<span style="color: #94a3b8;">Sin órdenes activas</span>';

    // Pendientes
    const tasksStr = p.pendingTasks.map(t => {
      const isUrgent = t.priority === 'URGENTE';
      const isDone = t.status === 'REALIZADO';
      const bg = isUrgent ? 'background-color: #fee2e2; color: #991b1b;' : isDone ? 'background-color: #dcfce7; color: #166534;' : 'background-color: #f1f5f9; color: #334155;';
      return `<div style="margin-bottom: 3px; padding: 2px 4px; border-radius: 3px; font-size: 8pt; ${bg}">
        [${t.priority}] ${t.description} (${t.status})
      </div>`;
    }).join('') || '<span style="color: #94a3b8;">Sin pendientes</span>';

    return `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 6px; font-weight: bold; background-color: #f8fafc; text-align: center; width: 65px; border-right: 1px solid #cbd5e1;">
          ${bedStr}
        </td>
        <td style="padding: 6px; width: 140px; border-right: 1px solid #cbd5e1;">
          <strong>${patName}</strong><br>${patDetails}
        </td>
        <td style="padding: 6px; width: 130px; font-size: 8.5pt; border-right: 1px solid #cbd5e1;">
          ${chiefComplaint}
        </td>
        <td style="padding: 6px; width: 170px; font-size: 8.5pt; border-right: 1px solid #cbd5e1;">
          ${diagCell}
        </td>
        <td style="padding: 6px; width: 180px; border-right: 1px solid #cbd5e1;">
          ${labCell}
        </td>
        <td style="padding: 6px; width: 180px; font-size: 8.5pt; border-right: 1px solid #cbd5e1;">
          ${ordersStr}
        </td>
        <td style="padding: 6px; width: 150px; border-right: 1px solid #cbd5e1;">
          ${tasksStr}
        </td>
      </tr>
    `;
  }).join('');

  const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Entrega de Guardia - ${data.serviceName}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 11.0in 8.5in; /* Horizontal / Landscape */
      margin: 0.5in 0.5in 0.5in 0.5in;
      mso-header-margin: 0.3in;
      mso-footer-margin: 0.3in;
    }
    div.Section1 { page: Section1; }
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 9pt; color: #0f172a; margin: 0; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background-color: #0f4c5c; color: white; padding: 6px; font-size: 8.5pt; text-align: left; border: 1px solid #0f4c5c; }
    .header-box { border-bottom: 2px solid #0f4c5c; padding-bottom: 8px; margin-bottom: 8px; }
    .census-box { background-color: #f1f5f9; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 8.5pt; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
<div class="Section1">
  <div class="header-box" style="text-align: center;">
    <h2 style="margin: 0; color: #0f4c5c; font-size: 14pt; text-transform: uppercase;">
      HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN
    </h2>
    <h3 style="margin: 2px 0 0 0; color: #334155; font-size: 11pt;">
      ENTREGA DE GUARDIA CLÍNICA — ${data.serviceName.toUpperCase()}
    </h3>
    <div style="font-size: 8.5pt; color: #64748b; margin-top: 3px;">
      Fecha: <strong>${data.guardDate}</strong> • Turno: <strong>${data.shift}</strong> • Médico Responsable: <strong>${data.attendingDoctor}</strong>
    </div>
  </div>

  <table style="width: 100%; margin-bottom: 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 8.5pt;">
    <tr>
      <td style="padding: 4px 8px;"><strong>Pacientes en Planta:</strong> ${data.totalPatients}</td>
      <td style="padding: 4px 8px;"><strong>Total Camas:</strong> ${data.totalBeds}</td>
      <td style="padding: 4px 8px;"><strong>Camas Disponibles:</strong> <span style="color: #10b981; font-weight: bold;">${data.availableBeds}</span></td>
      <td style="padding: 4px 8px;"><strong>Nuevos Ingresos:</strong> ${data.newAdmissions}</td>
      <td style="padding: 4px 8px;"><strong>Traslados:</strong> ${data.transfers}</td>
      <td style="padding: 4px 8px;"><strong>Altas:</strong> ${data.discharges}</td>
      <td style="padding: 4px 8px;"><strong>Defunciones:</strong> ${data.deaths}</td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 65px; text-align: center;">CAMA</th>
        <th style="width: 140px;">PACIENTE</th>
        <th style="width: 130px;">MOTIVO DE CONSULTA</th>
        <th style="width: 170px;">DIAGNÓSTICOS</th>
        <th style="width: 180px;">PARACLÍNICAS</th>
        <th style="width: 180px;">TRATAMIENTO</th>
        <th style="width: 150px;">PENDIENTES</th>
      </tr>
    </thead>
    <tbody>
      ${patientRows}
    </tbody>
  </table>

  <div style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 7.5pt; color: #94a3b8; text-align: center;">
    Hospital Regional Dr. Ángel María Gatón • Sistema Clínico de Guardia • Documento generado automáticamente el ${new Date().toLocaleString('es-DO')}
  </div>
</div>
</body>
</html>
`;

  const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `GUARDIA_${data.serviceName.replace(/\s+/g, '_')}_${data.guardDate.replace(/\//g, '-')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const printGuardiaPdf = (data: GuardiaExportData) => printGuardiaSheet(data);

export function printGuardiaSheet(data: GuardiaExportData) {
  const printWindow = window.open('', '_blank', 'width=1150,height=750');
  if (!printWindow) {
    alert('Permita ventanas emergentes para imprimir la hoja de guardia.');
    return;
  }

  const patientRows = data.patients.map(p => {
    const pat = p.patient;
    const bedStr = p.bedCode;
    const patName = pat ? pat.fullName.toUpperCase() : 'CAMAS DISPONIBLE';
    const patDetails = pat
      ? `${pat.age || '--'}a • ${pat.sex || '--'} • Récord: ${pat.medicalRecordNumber || pat.internalCode || '--'}`
      : '<span style="color: #059669; font-weight: bold;">DISPONIBLE</span>';

    const chiefComplaint = p.chiefComplaint || pat?.chiefComplaint || '--';
    const activeDx = p.diagnoses.map(d => `• ${d}`).join('<br>');
    const sugDx = p.suggestedDiagnoses.length > 0
      ? `<div style="margin-top: 3px; padding: 2px 4px; background-color: #fef3c7; border-left: 2px solid #f59e0b; font-size: 7.5pt;"><strong>[Sugeridos Lab]:</strong><br>${p.suggestedDiagnoses.map(s => `• ${s}`).join('<br>')}</div>`
      : '';

    const labsByTime = new Map<string, string[]>();
    p.labs.forEach(l => {
      const dateKey = (l.timestamp || '').slice(0, 10) || 'Reciente';
      const list = labsByTime.get(dateKey) || [];
      const flag = l.flag === 'critico' ? ' 🔴' : l.flag === 'alto' ? ' ↑' : l.flag === 'bajo' ? ' ↓' : '';
      list.push(`${l.parameter}: ${l.value}${flag}`);
      labsByTime.set(dateKey, list);
    });

    let labCell = '';
    labsByTime.forEach((items, dateKey) => {
      labCell += `<div style="margin-bottom: 2px; font-size: 7.5pt;"><strong>${dateKey}:</strong> ${items.join(' • ')}</div>`;
    });
    if (!labCell) labCell = '<span style="color: #94a3b8;">Sin analíticas</span>';

    const ordersStr = p.orders.map(o => {
      const day = o.treatmentDay ? ` <strong>[D-${o.treatmentDay}]</strong>` : '';
      return `• ${o.name} ${o.dose || ''} ${o.frequency || ''}${day}`;
    }).join('<br>') || '<span style="color: #94a3b8;">Sin órdenes</span>';

    const tasksStr = p.pendingTasks.map(t => {
      const isUrgent = t.priority === 'URGENTE';
      const isDone = t.status === 'REALIZADO';
      const color = isUrgent ? '#b91c1c' : isDone ? '#15803d' : '#334155';
      const check = isDone ? '✓ ' : '';
      return `<div style="font-size: 7.5pt; color: ${color}; margin-bottom: 2px;">• ${check}[${t.priority}] ${t.description}</div>`;
    }).join('') || '<span style="color: #94a3b8;">Sin pendientes</span>';

    return `
      <tr>
        <td style="text-align: center; font-weight: bold; background-color: #f8fafc;">${bedStr}</td>
        <td><strong>${patName}</strong><br><small>${patDetails}</small></td>
        <td><small>${chiefComplaint}</small></td>
        <td><small>${activeDx}${sugDx}</small></td>
        <td>${labCell}</td>
        <td><small>${ordersStr}</small></td>
        <td>${tasksStr}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Entrega de Guardia - ${data.serviceName}</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8pt; color: #0f172a; margin: 0; padding: 0; }
        .header { text-align: center; border-bottom: 2px solid #0f4c5c; padding-bottom: 4px; margin-bottom: 6px; }
        h1 { margin: 0; font-size: 13pt; color: #0f4c5c; text-transform: uppercase; }
        h2 { margin: 2px 0 0 0; font-size: 10pt; color: #334155; }
        .census { display: flex; justify-content: space-around; background-color: #f1f5f9; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 8pt; margin-bottom: 6px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #0f4c5c; color: white; padding: 4px; text-align: left; font-size: 8pt; border: 1px solid #cbd5e1; }
        td { padding: 4px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 8pt; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 4px;">
        <button onclick="window.print()" style="padding: 4px 12px; background: #0f4c5c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          IMPRIMIR / GUARDAR EN PDF
        </button>
      </div>
      <div class="header">
        <h1>HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN</h1>
        <h2>ENTREGA DE GUARDIA CLÍNICA — ${data.serviceName.toUpperCase()}</h2>
        <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">
          Fecha: <strong>${data.guardDate}</strong> • Turno: <strong>${data.shift}</strong> • Médico Responsable: <strong>${data.attendingDoctor}</strong>
        </div>
      </div>

      <div class="census">
        <span>Pacientes: ${data.totalPatients}</span>
        <span>Camas: ${data.totalBeds}</span>
        <span style="color: #059669;">Disponibles: ${data.availableBeds}</span>
        <span>Ingresos: ${data.newAdmissions}</span>
        <span>Traslados: ${data.transfers}</span>
        <span>Altas: ${data.discharges}</span>
        <span>Defunciones: ${data.deaths}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 55px; text-align: center;">CAMA</th>
            <th style="width: 140px;">PACIENTE</th>
            <th style="width: 130px;">MOTIVO</th>
            <th style="width: 160px;">DIAGNÓSTICOS</th>
            <th style="width: 180px;">PARACLÍNICAS</th>
            <th style="width: 180px;">TRATAMIENTO</th>
            <th style="width: 150px;">PENDIENTES</th>
          </tr>
        </thead>
        <tbody>
          ${patientRows}
        </tbody>
      </table>
    </body>
    </html>
  `);

  printWindow.document.close();
}
