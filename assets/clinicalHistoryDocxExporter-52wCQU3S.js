import{P as B,k as h,F as b,j as H}from"./hospitalNoteGenerator-Cjcvw3ef.js";import{a as z,d as j}from"./index-A2uuLhCx.js";function N(t=""){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function a(t,o,s=!1,r=100){const c=N(t),E=N(o);return`
    <w:p>
      <w:pPr>
        <w:spacing w:before="60" w:after="${r}" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="both"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          ${s?'<w:u w:val="single"/>':""}
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${c}${o?": ":""}</w:t>
      </w:r>
      ${o?`
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${E}</w:t>
      </w:r>`:""}
    </w:p>
  `}function p(t,o=200,s=100){const r=N(t.toUpperCase());return`
    <w:p>
      <w:pPr>
        <w:spacing w:before="${o}" w:after="${s}" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          <w:u w:val="single"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${r}</w:t>
      </w:r>
    </w:p>
  `}function u(t,o=!1,s=100){const r=N(t);return`
    <w:p>
      <w:pPr>
        <w:spacing w:before="40" w:after="${s}" w:line="240" w:lineRule="auto"/>
        ${o?'<w:jc w:val="center"/>':'<w:jc w:val="both"/>'}
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${r}</w:t>
      </w:r>
    </w:p>
  `}async function X(){const t="clinical-history-template.docx",s=[`./templates/${t}`,`./templates/${t}`,`templates/${t}`,`/templates/${t}`];for(const r of s)try{const c=await fetch(r);if(c.ok){const E=await c.arrayBuffer();if(E&&E.byteLength>1e3)return E}}catch{}return h(H[t])}async function V(t){try{let o=null;const s=["./hospital_logo.jpg","/hospital_logo.jpg","hospital_logo.jpg"];try{const r=await j.settings.get("hospital_identity_settings");r&&r.value&&r.value.logoUrl&&s.unshift(r.value.logoUrl)}catch{}for(const r of s)try{const c=await fetch(r);if(c.ok&&(o=await c.arrayBuffer(),o&&o.byteLength>500))break}catch{}!o&&b&&(o=h(b)),o&&(t.file("word/media/image1.png")&&t.file("word/media/image1.png",o),t.file("word/media/image1.jpg")&&t.file("word/media/image1.jpg",o))}catch(o){console.warn("Advertencia logo DOCX:",o)}}function k(t,o){const s=URL.createObjectURL(t),r=document.createElement("a");r.href=s,r.download=o,document.body.appendChild(r),r.click(),document.body.removeChild(r),setTimeout(()=>URL.revokeObjectURL(s),4e3)}function Z(t){const o=(t.generalData.nombre||"PACIENTE").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,""),r=(t.generalData.fechaIngreso||"").replace(/[/]/g,"-")||new Date().toISOString().slice(0,10);return`HC_${o}_${r}.docx`}async function K(t){var L,P;const o=await X(),s=new B(o);await V(s);let r=(L=s.file("word/document.xml"))==null?void 0:L.asText();if(!r)throw new Error("No se encontró word/document.xml en la plantilla");const c=r.indexOf("</w:drawing>");let E="",f="";if(c!==-1){const l=r.indexOf("</w:p>",c);l!==-1&&(E=r.substring(0,l+6))}if(!E){const l=r.indexOf("<w:body>")+8;E=r.substring(0,l)}const D=r.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);D?f=D[0]:f=`
      <w:sectPr>
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/>
      </w:sectPr>
    `;let e="";e+=`
    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="160" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          <w:u w:val="single"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
        <w:t xml:space="preserve">HISTORIA CLÍNICA</w:t>
      </w:r>
    </w:p>
  `,e+=p("DATOS GENERALES",160,80);const w=t.generalData;e+=a("NOMBRE",w.nombre),e+=a("ESTADO CIVIL",w.estadoCivil),e+=a("EDAD",w.edad),e+=a("RAZA",w.raza),e+=a("SEXO",w.sexo),e+=a("RELIGIÓN",w.religion),e+=a("ESCOLARIDAD",w.escolaridad),e+=a("SALA",w.sala),e+=a("FUENTE",w.fuente),e+=a("FECHA INGRESO",w.fechaIngreso),e+=a("HORA",w.hora),e+=a("PROCEDENCIA",w.procedencia),e+=p("MOTIVOS DE CONSULTA:",180,80),t.chiefComplaints&&t.chiefComplaints.length>0?t.chiefComplaints.forEach(l=>{e+=u(l.toUpperCase())}):e+=u("NO REGISTRADO"),e+=p("HISTORIA DE LA ENFERMEDAD ACTUAL:",180,80),e+=u(t.presentIllness||"PENDIENTE DE EVALUACIÓN."),e+=p("ANTECEDENTES PERSONALES PATOLÓGICOS:",180,80);const A=t.pathologicalHistory;e+=a("NIÑEZ",A.childhood||"NEGADOS."),e+=a("ADOLESCENCIA",A.adolescence||"NEGADOS."),e+=a("ADULTEZ",A.adulthood||"NO REGISTRADOS."),e+=a("ANTECEDENTES HOSPITALARIOS",A.hospitalizations||"NEGADOS."),e+=a("ANTECEDENTES QUIRÚRGICOS",A.surgeries||"NEGADOS."),e+=a("ANTECEDENTES TRAUMÁTICOS",A.trauma||"NEGADOS."),e+=a("TRANSFUSIONALES",A.transfusions||"NEGADOS."),e+=a("ANTECEDENTES ALÉRGICOS",A.allergies||"NEGADOS.");let T="NEGADOS.";A.medications&&A.medications.length>0&&(T=A.medications.map(l=>`${l.name.toUpperCase()} ${l.dose} ${l.unit} ${l.route} ${l.frequency}`).join(", ")),e+=a("ANTECEDENTES MEDICAMENTOSOS",T),e+=p("ANTECEDENTES PERSONALES NO PATOLÓGICOS:",180,80);const C=t.nonPathologicalHistory,R=C.tobacco;let d="NEGADO.";R&&R.consumes&&(d=`${R.cigarettesPerDay} CIGARRILLOS AL DÍA DURANTE ${R.yearsSmoking} AÑOS PARA UN IPA DE ${R.packYears}.`),e+=a("TABACO",d),e+=a("CAFÉ",C.coffee||"NEGADO."),e+=a("ALCOHOL",C.alcohol||"NEGADO."),e+=a("DROGAS ILÍCITAS",C.illicitDrugs||"NEGADOS."),e+=a("TÉ",C.tea||"1 TAZA OCASIONAL."),e+=a("TRABAJOS ANTERIORES",C.previousJobs||"NO ESPECIFICADO."),e+=a("EXPOSICIÓN A TÓXICOS",C.toxicExposure||"NEGADA."),e+=p("ANTECEDENTES PERSONALES HEREDOFAMILIARES:",180,80);const S=t.familyHistory,$=S.father.alive?`VIVO, ${S.father.morbidities||"SIN PATOLOGÍA REFERIDA."}`:`FALLECIDO, CAUSA: ${S.father.causeOfDeath||"NO ESPECIFICADA"}.`,_=S.mother.alive?`VIVA, ${S.mother.morbidities||"SIN PATOLOGÍA REFERIDA."}`:`FALLECIDA, CAUSA: ${S.mother.causeOfDeath||"NO ESPECIFICADA"}.`;e+=a("PADRE",$),e+=a("MADRE",_),e+=a("HERMANOS",`${S.siblings.count} HERMANOS. ${S.siblings.details||""}`),e+=a("HIJOS",`${S.children.count} HIJOS. ${S.children.details||""}`),e+=p("ESFERA PSICOSOCIAL:",180,80);const m=t.psychosocialHistory;e+=a("INGRESOS MENSUALES AL HOGAR",m.monthlyIncome||"NO ESPECIFICADOS.");const O=m.housing,v=m.narrativeText||`VIVIENDA ${O.housingType}, TECHO DE ${O.roofMaterial}, PAREDES DE ${O.wallMaterial}, PISO DE ${O.floorMaterial}, ${O.roomCount} HABITACIONES PARA ${O.personCount} PERSONAS, ${O.bathroomCount} BAÑO (${O.bathroomLocation}), AGUA: ${O.waterSource}, BASURA: ${O.trashDisposal}.`;e+=a("VIVIENDA",v),e+=p("REVISIÓN POR SISTEMAS:",180,80);const i=t.reviewOfSystems;e+=a("CARDIOVASCULAR",i.cardiovascular.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.cardiovascular.notes),e+=a("PULMONAR",i.pulmonary.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.pulmonary.notes),e+=a("GASTROINTESTINAL",i.gastrointestinal.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.gastrointestinal.notes),e+=a("GENITOURINARIO",i.genitourinary.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.genitourinary.notes),e+=a("ENDOCRINOMETABÓLICO",i.endocrinometabolic.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.endocrinometabolic.notes),e+=a("NEUROSENSORIAL",i.neurosensory.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.neurosensory.notes),e+=a("MUSCULOESQUELÉTICO",i.musculoskeletal.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.musculoskeletal.notes),e+=a("HEMATOLÓGICO",i.hematologic.status==="NORMAL"?"SIN PATOLOGÍAS REFERIDAS.":i.hematologic.notes),e+=p("EXAMEN FÍSICO",200,80),e+=a("ESTADO GENERAL",t.generalStatus.generalStatusSummary||"ALERTA, CONSCIENTE, EN REGULARES CONDICIONES.");const I=t.vitalSigns,G=`TA: ${I.systolicBP||"--"}/${I.diastolicBP||"--"} MMHG, FC: ${I.heartRate||"--"} L/M, FR: ${I.respiratoryRate||"--"} R/M, TEMP: ${I.temperature||"--"} °C, SPO2: ${I.oxygenSaturation||"--"}% (AIRE AMBIENTE)${I.bmi?`, IMC: ${I.bmi} KG/M²`:""}.`;e+=u(G,!1,80);const n=t.physicalExam;e+=a("CABEZA",n.head),e+=a("OJOS",n.eyes),e+=a("OÍDOS",n.ears),e+=a("NARIZ",n.nose),e+=a("BOCA",n.mouth),e+=a("CUELLO",n.neck),e+=a("TÓRAX",n.thorax),e+=a("PULMONES",n.lungs),e+=a("CORAZÓN",n.heart),e+=a("ABDOMEN",n.abdomen),e+=a("GENITALES EXTERNOS",n.externalGenitals),e+=a("PIEL Y ANEXOS",n.skin),e+=a("EXTREMIDADES SUPERIORES",n.upperExtremities),e+=a("EXTREMIDADES INFERIORES",n.lowerExtremities);const M=((P=t.neurologicalExam)==null?void 0:P.narrativeText)||n.neurological||"ALERTA, CONSCIENTE, ORIENTADO EN LAS TRES ESFERAS DEL SENSORIO. GLASGOW 15/15.";e+=a("NEUROLÓGICO",M),e+=p("DIAGNÓSTICOS:",200,80),t.diagnoses&&t.diagnoses.length>0?t.diagnoses.forEach((l,y)=>{e+=u(`${y+1}. ${l.name.toUpperCase()}`)}):e+=u("1. DIAGNÓSTICO EN ESTUDIO");const g=z.getActiveDoctorSignature();e+=`
    <w:p>
      <w:pPr>
        <w:spacing w:before="360" w:after="40" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">____________________________________________</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:b/><w:bCs/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">${N(g.name.toUpperCase())}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="40" w:after="200" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
        </w:rPr>
        <w:t xml:space="preserve">${N(g.exequatur)} &bull; ${N(g.specialty||"MEDICINA INTERNA")}</w:t>
      </w:r>
    </w:p>
  `;const x=`${E}${e}${f}</w:body></w:document>`;s.file("word/document.xml",x);const F=s.generate({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",compression:"DEFLATE"}),U=Z(t);k(F,U)}export{K as g};
