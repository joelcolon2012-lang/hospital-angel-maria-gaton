import{a as N}from"./hospitalNoteGenerator-FFrMke3d.js";import{F as b}from"./templatesFallback-CWPlzzWl.js";function u(t,i,s="Documento Médico"){const a=`
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${s}</title>
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
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #0f172a;
    }
    .hospital-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .hospital-logo-h {
      font-family: 'Arial Black', 'Arial', sans-serif;
      font-size: 24pt;
      font-weight: 900;
      color: #0284c7;
      display: inline-block;
      vertical-align: middle;
      margin-right: 8px;
    }
    .hospital-title-wrap {
      display: inline-block;
      vertical-align: middle;
      text-align: left;
    }
    .hospital-label {
      font-size: 8pt;
      font-weight: bold;
      color: #0e7490;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .hospital-name {
      font-size: 13pt;
      font-weight: bold;
      color: #0284c7;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      color: #1e293b;
      margin-top: 15px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .patient-meta-box {
      font-size: 9.5pt;
      font-weight: bold;
      color: #1e293b;
      border-bottom: 1.5pt solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .section-heading {
      font-weight: bold;
      color: #0f172a;
      margin-top: 12px;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 10.5pt;
    }
    .narrative-body {
      text-align: justify;
      font-size: 10.5pt;
      line-height: 1.45;
      margin-bottom: 14px;
    }
    .bullet-item {
      margin-left: 18px;
      font-weight: bold;
      font-size: 10pt;
      line-height: 1.4;
    }
    .numbered-item {
      margin-left: 18px;
      font-size: 10pt;
      line-height: 1.4;
    }
    .note-box {
      margin-top: 12px;
      font-size: 10pt;
      font-style: italic;
      color: #334155;
    }
    .footer-stamp {
      margin-top: 40px;
      border-top: 1pt solid #94a3b8;
      width: 250px;
      text-align: center;
      font-size: 9pt;
      padding-top: 4px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${i}
  </div>
</body>
</html>
  `,r=new Blob(["\uFEFF"+a],{type:"application/msword;charset=utf-8"}),o=URL.createObjectURL(r),e=document.createElement("a");e.href=o,e.download=t.endsWith(".doc")?t:`${t}.doc`,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(o)}function $(t,i=[]){const s=t.arrivalDateTime?new Date(t.arrivalDateTime):new Date,a=s.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}),r=s.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}),o=N(t,i),e=(n,p)=>{const m=o.indexOf(n);if(m===-1)return"";const l=o.substring(m+n.length);if(!p)return l.trim();const g=l.indexOf(p);return g===-1?l.trim():l.substring(0,g).trim()},d=e("MEDIDAS GENERALES:","DIAGNOSTICO:"),h=e("DIAGNOSTICO:","SIGNOS VITALES:"),f=e("SIGNOS VITALES:","MEDICACIÓN:"),v=e("MEDICACIÓN:","PARACLÍNICOS:"),x=e("PARACLÍNICOS:","IMÁGENES:"),S=e("IMÁGENES:","NOTA:"),c=e("NOTA:"),A=h.split(`
`).map(n=>n.replace(/^[•\-\*]\s*/,"").trim()).filter(Boolean),E=v.split(`
`).map(n=>n.trim()).filter(Boolean);let w=`
    <div class="hospital-header" style="text-align: center; margin-bottom: 20px;">
      <img src="data:image/jpeg;base64,${b}" width="280" style="width: 280px; max-width: 100%; height: auto; display: block; margin: 0 auto;" alt="Hospital Regional Dr. Ángel María Gatón" />
    </div>

    <div class="doc-title">ORDEN MEDICA</div>

    <div class="patient-meta-box">
      NOMBRE: ${t.fullName.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp;
      EDAD: ${t.age||"--"} AÑOS &nbsp;&nbsp;&nbsp;&nbsp;
      EMERGENCIA: CUB ${t.cubicle} &nbsp;&nbsp;&nbsp;&nbsp;
      FECHA: ${a} &nbsp;&nbsp;&nbsp;&nbsp;
      HORA: ${r}
    </div>

    <p><span class="section-heading">MEDIDAS GENERALES:</span> ${d}</p>

    <p class="section-heading">DIAGNOSTICO:</p>
    ${A.map(n=>`<div class="bullet-item">• &nbsp;${n}</div>`).join("")}
    <br/>

    <p><span class="section-heading">SIGNOS VITALES:</span> ${f}</p>

    <p class="section-heading">MEDICACIÓN:</p>
    ${E.map(n=>`<div class="numbered-item">${n}</div>`).join("")}
    <br/>

    <p><span class="section-heading">PARACLÍNICOS:</span> ${x}</p>
    <p><span class="section-heading">IMÁGENES:</span> ${S}</p>

    ${c?`<div class="note-box"><strong>NOTA:</strong> ${c}</div>`:""}

    <br/><br/>
    <table style="width: 100%; margin-top: 30px; border: none;">
      <tr>
        <td style="width: 50%; text-align: center;">
          <div style="border-top: 1pt solid #000; width: 220px; margin: 0 auto; padding-top: 4px; font-size: 9pt; font-weight: bold;">
            Firma y Sello Médico Tratante<br/>
            Dr. Colón — Medicina Interna / Emergencias
          </div>
        </td>
        <td style="width: 50%; text-align: center;">
          <div style="border-top: 1pt solid #000; width: 220px; margin: 0 auto; padding-top: 4px; font-size: 9pt; font-weight: bold;">
            Recibido Enfermería
          </div>
        </td>
      </tr>
    </table>
  `;const I=`Orden_Medica_${t.fullName.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.doc`;u(I,w,`Orden Médica - ${t.fullName}`)}function D(t){const i=t.clinicalHistory;if(!i)return;const s=new Date,a=s.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}),r=s.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}),o=i.physicalExam||{general:"",cardiovascular:"",respiratory:"",abdominal:"",neurological:"",extremities:""};let e=`
    <div class="hospital-header" style="text-align: center; margin-bottom: 20px;">
      <img src="data:image/jpeg;base64,${b}" width="280" style="width: 280px; max-width: 100%; height: auto; display: block; margin: 0 auto;" alt="Hospital Regional Dr. Ángel María Gatón" />
    </div>

    <div class="doc-title">HISTORIA CLÍNICA Y EXAMEN FÍSICO</div>

    <div class="patient-meta-box">
      PACIENTE: ${t.fullName.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp;
      EDAD: ${t.age||"--"} AÑOS &nbsp;&nbsp;&nbsp;&nbsp;
      CÉDULA / EXP: ${t.medicalRecordNumber||t.idDocument||"S/N"} &nbsp;&nbsp;&nbsp;&nbsp;
      FECHA: ${a} ${r}
    </div>

    <p class="section-heading">1. MOTIVO DE CONSULTA</p>
    <div class="narrative-body">${i.reasonForConsultation||"No especificado"}</div>

    <p class="section-heading">2. HISTORIA DE LA ENFERMEDAD ACTUAL (HDA)</p>
    <div class="narrative-body">${i.currentIllnessHistory||"No especificado"}</div>

    <p class="section-heading">3. ANTECEDENTES</p>
    <div class="bullet-item">• <strong>Patológicos:</strong> ${i.pathologicalHistory||"Negados"}</div>
    <div class="bullet-item">• <strong>Quirúrgicos:</strong> ${i.surgicalHistory||"Negados"}</div>
    <div class="bullet-item">• <strong>Alergias:</strong> ${i.allergicHistory||"Negadas"}</div>
    <div class="bullet-item">• <strong>Medicamentos habituales:</strong> ${i.habitualMedications||"Ninguno"}</div>
    <div class="bullet-item">• <strong>Hábitos tóxicos:</strong> ${i.toxicHabits||"Negados"}</div>
    <div class="bullet-item">• <strong>Familiares:</strong> ${i.familyHistory||"No especificados"}</div>
    <br/>

    <p class="section-heading">4. EXAMEN FÍSICO POR SISTEMAS</p>
    <div class="bullet-item">• <strong>General:</strong> ${o.general||"Normal"}</div>
    <div class="bullet-item">• <strong>Cardiovascular:</strong> ${o.cardiovascular||"R1 y R2 rítmicos sin soplos"}</div>
    <div class="bullet-item">• <strong>Respiratorio:</strong> ${o.respiratory||"Murmullo vesicular conservado"}</div>
    <div class="bullet-item">• <strong>Abdomen:</strong> ${o.abdominal||"Blando, depresible, no doloroso"}</div>
    <div class="bullet-item">• <strong>Neurológico:</strong> ${o.neurological||"Glasgow 15/15, sin déficit focal"}</div>
    <div class="bullet-item">• <strong>Extremidades:</strong> ${o.extremities||"Simétricas, sin edemas"}</div>
    <br/>

    <p class="section-heading">5. IMPRESIÓN CLÍNICA DIAGNÓSTICA</p>
    <div class="narrative-body"><strong>${i.clinicalImpression||"En estudio"}</strong></div>

    <p class="section-heading">6. PLAN DIAGNÓSTICO Y TERAPÉUTICO</p>
    <div class="narrative-body">${i.diagnosticAndTherapeuticPlan||"Monitoreo y tratamiento hospitalario"}</div>

    <br/><br/>
    <table style="width: 100%; margin-top: 35px; border: none;">
      <tr>
        <td style="text-align: right;">
          <div style="border-top: 1pt solid #000; width: 250px; margin-left: auto; text-align: center; padding-top: 4px; font-size: 9pt; font-weight: bold;">
            Firma y Sello Médico Tratante<br/>
            Dr. Colón — Medicina Interna / Emergencias
          </div>
        </td>
      </tr>
    </table>
  `;const d=`Historia_Clinica_${t.fullName.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.doc`;u(d,e,`Historia Clínica - ${t.fullName}`)}export{$ as a,D as e};
