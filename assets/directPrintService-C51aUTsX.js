import{p as O,k as N,q as C,F as v,b as u,e as D,g as I}from"./hospitalNoteGenerator-DKgyj7kG.js";function S(d){const{patient:e,content:i,docType:t="emergencia",orders:s=[],labs:o=[],studies:r=[]}=d;if(e&&(t==="emergencia"||t==="sala"||t==="orden"||t==="combinada")){const a=i&&i.trim()?O(i,t,e):N(t,e,s,o,r);C(a);return}let n="./hospital_logo.jpg";try{const a=localStorage.getItem("hospital_custom_logo");a?n=a:v&&(n="data:image/jpeg;base64,"+v)}catch{n="data:image/jpeg;base64,"+v}const _=((e==null?void 0:e.fullName)||"PACIENTE").toUpperCase(),p=e!=null&&e.age?`${e.age} AÑOS`:"--",c=(e==null?void 0:e.cubicle)||"CUBÍCULO 1",f=e!=null&&e.arrivalDateTime?new Date(e.arrivalDateTime):new Date,g=f.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}),m=f.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0});let E="";if(t==="combinada"){const a=(e==null?void 0:e.status)==="ingresados"||!!(e!=null&&e.cubicle)&&!e.cubicle.toLowerCase().includes("emerg")&&!e.cubicle.toLowerCase().includes("cub"),A=(i&&i.includes("MEDIDAS GENERALES:")?i.split(/={10,}|\[HOJA OFICIAL|\[SALTO DE PÁGINA/i)[0].trim():a?u(e,s,o,r):D(e,s,o,r)).replace(/^[\s\S]*?(?:HOSPITAL|DR\.\s+ÁNGEL\s+MARÍA\s+GATÓN)[\s\S]*?(?:HORA:[^\n]+\n+)/i,"").replace(/____________________________________[\s\S]*$/g,"").trim(),h=(i&&i.includes("MEDIDAS GENERALES:")?i.slice(i.indexOf("MEDIDAS GENERALES:")):I(e,s)).replace(/^[\s\S]*?(?=MEDIDAS GENERALES:)/i,"").replace(/____________________________________[\s\S]*$/g,"").trim();E=`
      <!-- PÁGINA 1: NOTA DE INGRESO -->
      <div class="print-page">
        <div class="header-logo-container">
          <img src="${n}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">${a?"NOTA DE RECIBIMIENTO":"NOTA DE INGRESO EMERGENCIA"}</div>
        <div class="patient-header-line">
          NOMBRE: ${_} &nbsp;&nbsp; EDAD: ${p} &nbsp;&nbsp; ${a?`SALA: ${c}`:`EMERGENCIA: CUB ${c}`} &nbsp;&nbsp; FECHA: ${g} &nbsp;&nbsp; HORA: ${m}
        </div>
        <div class="content-body">${b(A)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>

      <!-- PÁGINA 2: HOJA DE ORDEN MÉDICA OFICIAL -->
      <div class="print-page page-break">
        <div class="header-logo-container">
          <img src="${n}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">ORDEN MEDICA</div>
        <div class="patient-header-line">
          NOMBRE: ${_} &nbsp;&nbsp; EDAD: ${p} &nbsp;&nbsp; EMERGENCIA: CUB ${c} &nbsp;&nbsp; FECHA: ${g} &nbsp;&nbsp; HORA: ${m}
        </div>
        <div class="content-body">${b(h)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>
    `}else if(t==="orden"){const l=(i||(e?I(e,s):"")).replace(/^[\s\S]*?(?=MEDIDAS GENERALES:)/i,"").replace(/____________________________________[\s\S]*$/g,"").trim();E=`
      <div class="print-page">
        <div class="header-logo-container">
          <img src="${n}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">ORDEN MEDICA</div>
        <div class="patient-header-line">
          NOMBRE: ${_} &nbsp;&nbsp; EDAD: ${p} &nbsp;&nbsp; EMERGENCIA: CUB ${c} &nbsp;&nbsp; FECHA: ${g} &nbsp;&nbsp; HORA: ${m}
        </div>
        <div class="content-body">${b(l)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>
    `}else{let a="NOTA DE INGRESO EMERGENCIA";t==="sala"?a="NOTA DE RECIBIMIENTO":t==="historia"?a="HISTORIA CLÍNICA Y EXAMEN FÍSICO":t==="evolucion"&&(a="NOTA DE EVOLUCIÓN MÉDICA");let l=i||"";!l&&e&&(t==="sala"?l=u(e,s,o,r):l=D(e,s,o,r));const A=l.replace(/^[\s\S]*?(?:HOSPITAL|DR\.\s+ÁNGEL\s+MARÍA\s+GATÓN)[\s\S]*?(?:HORA:[^\n]+\n+)/i,"").replace(/____________________________________[\s\S]*$/g,"").trim();E=`
      <div class="print-page">
        <div class="header-logo-container">
          <img src="${n}" alt="Hospital Regional Dr. Ángel María Gatón" class="header-logo-img" />
        </div>
        <div class="doc-title">${a}</div>
        <div class="patient-header-line">
          NOMBRE: ${_} &nbsp;&nbsp; EDAD: ${p} &nbsp;&nbsp; ${t==="sala"?`SALA: ${c}`:`EMERGENCIA: CUB ${c}`} &nbsp;&nbsp; FECHA: ${g} &nbsp;&nbsp; HORA: ${m}
        </div>
        <div class="content-body">${b(A)}</div>
        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-label">FIRMA DEL MEDICO</div>
        </div>
      </div>
    `}$(E,`${t.toUpperCase()}_${_}`)}function b(d){return d.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function $(d,e){var s;let i=document.getElementById("hospital-print-iframe");i||(i=document.createElement("iframe"),i.id="hospital-print-iframe",i.setAttribute("style","position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;border:none;"),document.body.appendChild(i));const t=((s=i.contentWindow)==null?void 0:s.document)||i.contentDocument;if(!t){window.print();return}t.open(),t.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${e}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 14mm 16mm 14mm 16mm;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page {
          width: 100%;
          margin: 0 auto;
          background: #ffffff;
        }
        .page-break {
          page-break-before: always;
          break-before: page;
          margin-top: 15mm;
        }
        .header-logo-container {
          text-align: center;
          margin-bottom: 6px;
        }
        .header-logo-img {
          max-height: 52px;
          max-width: 320px;
          object-fit: contain;
          margin: 0 auto;
          display: block;
        }
        .doc-title {
          text-align: center;
          font-size: 11.5pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 4px 0 8px 0;
          color: #000000;
        }
        .patient-header-line {
          font-size: 9.5pt;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid #000000;
          padding-bottom: 4px;
          margin-bottom: 10px;
          color: #000000;
          line-height: 1.35;
        }
        .content-body {
          font-size: 9.5pt;
          line-height: 1.45;
          text-align: justify;
          white-space: pre-wrap;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          color: #000000;
          margin-bottom: 24px;
        }
        .signature-section {
          margin-top: 30px;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .signature-line {
          width: 230px;
          margin: 0 auto 4px auto;
          border-top: 1px solid #000000;
        }
        .signature-label {
          font-size: 8.5pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #000000;
        }
      </style>
    </head>
    <body>
      ${d}
    </body>
    </html>
  `),t.close(),setTimeout(()=>{var o,r;try{(o=i.contentWindow)==null||o.focus(),(r=i.contentWindow)==null||r.print()}catch(n){console.warn("Iframe print error, falling back to window.print()",n),window.print()}},80)}export{S as p};
