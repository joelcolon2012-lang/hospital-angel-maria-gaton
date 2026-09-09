# Emergencia Clínica — DR COLON

Aplicación Web Progresiva (PWA) móvil, estructurada y de alto rendimiento diseñada específicamente para el trabajo médico en salas de urgencias y emergencias hospitalarias.

---

## 🌟 Características Principales

### 1. Tablero de Urgencias & Triaje en Tiempo Real
- **Semáforo y Niveles de Triaje**: Clasificación visual del Nivel I (Rojo / Reanimación) al Nivel V (Azul / No Urgente).
- **Control de Pacientes por Estado**: *Activos, En observación, Pendientes de estudios, Reevaluación, Ingresados, Referidos y Alta Médica*.
- **Ordenamiento Multicriterio**: Por gravedad de triaje, hora de llegada, nombre o cubículo/cama.
- **Detección Preventiva de Duplicados**: Alerta inteligente al registrar pacientes con nombre, cédula o expediente ya existente, evitando registros duplicados accidentales.

### 2. Triaje y Constantes Vitales con Detección de Valores Críticos
- Cálculo automatizado de **Presión Arterial Media (PAM)** y de **Índice de Masa Corporal (IMC)**.
- **Escala de Coma de Glasgow** interactiva (Ocular, Verbal, Motor -> Total /15).
- **Escala Visual Analógica de Dolor (EVA)** de 0 a 10 con selector táctil.
- Destaque visual en rojo para signos vitales patológicos (hipotensión, taquicardia severa, desaturación, hipo/hiperglucemia).
- Registro estricto de alergias, sospecha de embarazo y anticoagulación.

### 3. Historia Clínica Estructurada con Dictado por Voz
- Secciones colapsables: *Motivo de consulta, Historia de la enfermedad actual (HDA), Antecedentes (patológicos, quirúrgicos, alérgicos, medicamentos habituales, tóxicos, familiares, ginecoobstétricos), Examen físico segmentario (General, CV, Resp, Abdominal, Neuro, Extremidades) e Impresión diagnóstica*.
- **Soporte de Dictado por Voz Manos Libres** (Web Speech API) directamente en cada campo de texto para dictar la nota mientras se examina al paciente.

### 4. Galería de Imágenes Médicas, ECG y Comparador Lado a Lado
- Clasificación por categorías: *Electrocardiograma, Radiografía, Tomografía, Ultrasonido (POCUS), Laboratorio, Fotografía clínica*.
- Captura directa desde la cámara del móvil o carga de archivos locales.
- **Visor Clínico Fullscreen**: Zoom progresivo, rotación a 90° para ECGs apaisados y descarga del archivo original.
- **Herramienta de Comparación Doble**: Permite comparar dos estudios clínicos lado a lado en pantalla partida (ej. ECG basal de ingreso vs ECG de control evolutivo).

### 5. Paraclínicos y Analíticas Estructuradas
- Paneles divididos: *Marcadores cardiacos (Troponina hs, CPK), Hemograma, Química sanguínea, Función renal, Función hepática, Coagulación, Gases arteriales, Orina*.
- Marcadores de alerta inmediata para valores normales, altos, bajos o de pánico/críticos.

### 6. Motor de Apoyo Diagnóstico y Detección de Signos de Alarma
- **Algoritmo de Orientación Clínica**: Analiza el motivo de consulta, signos vitales, antecedentes y laboratorios para calcular diagnósticos diferenciales con puntuación de coincidencia.
- **Detección de Banderas Rojas**: Alertando sobre choque, infartos, sepsis (qSOFA), ictus (código ACV) o abdomen agudo.
- **Detección de Datos Faltantes**: Avisa qué paraclínicos o estudios faltan para confirmar o descartar una sospecha diagnóstica grave.
- **Aviso Legal Permanente**: *"Requiere validación médica por el profesional actuante. No sustituye el juicio médico ni los protocolos institucionales"*.

### 7. Órdenes Médicas con Alerta Cruzada de Alergias
- Prescripción rápida de soluciones, fármacos, dosis, vías y horarios.
- **Motor Anti-Alergias en Tiempo Real**: Si el médico prescribe un fármaco perteneciente a una familia a la cual el paciente es alérgico (ej. Penicilinas, AINEs, Sulfas), el sistema dispara una **Alerta Roja de Seguridad** exigiendo justificación clínica obligatoria para continuar.

### 8. Evoluciones Cronológicas Inmutables
- Formato SOAP ágil con captura automática de constantes vitales, cambios clínicos, conducta y programación de la próxima hora de reevaluación.
- Historial inmutable para auditoría médico-legal.

### 9. Generador de Documentos Clínicos y Exportación PDF
- Plantillas para: *Historia Clínica Completa, Nota de Ingreso y Triaje, Nota de Reevaluación, Resumen de Referimiento y Traslado, Epicrisis y Alta Médica*.
- Selección personalizada de secciones.
- **Copiado al Portapapeles con 1 Clic**: Formato limpio para pegar directamente en sistemas hospitalarios existentes.
- **Generación de PDF**: Formato membretado profesional listo para imprimir o compartir.

### 10. Conexión & Sincronización con Google Drive
- Botón directo **"Guardar en Google Drive"** en el generador de documentos para subir automáticamente los PDFs clínicos a la nube del médico.
- Organización automática de carpetas: `Mi unidad / Emergencia Dr Colon / Pacientes / [Código - Nombre] /`.
- **Copia de Seguridad Completa**: Exportación de toda la base de datos de pacientes a Google Drive en formato JSON y restauración de emergencias.
- Funciona tanto con credenciales de Google OAuth 2.0 como con un modo de demostración instantáneo para pruebas sin fricción.

### 11. Funcionamiento Offline-First & Privacidad Hospitalaria
- Base de datos local de alto rendimiento con **Dexie.js (IndexedDB)**: Los datos se guardan al instante en el dispositivo móvil y nunca se pierden, incluso en sótanos o zonas sin señal de internet.
- **Escudo de Privacidad Automático**: Al cambiar de aplicación o minimizar la ventana, la pantalla se desenfoca de inmediato para resguardar la confidencialidad de los datos médicos.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend & PWA**: React 18, TypeScript, Vite.
- **Estilos & Ergonomía Móvil**: Tailwind CSS con paleta clínica médica (Azul petróleo `#0F4C5C`, Marfil/Gris suave `#F8FAFC`).
- **Iconografía**: `lucide-react`.
- **Almacenamiento Local**: Dexie.js (IndexedDB).
- **Generación de Documentos**: jsPDF.
- **Servicios en la Nube**: Google Identity Services (GIS) & Google Drive API v3.
- **Reconocimiento de Voz**: Web Speech API nativa.

---

## 🚀 Instalación y Puesta en Marcha

1. Asegúrate de tener instalado **Node.js (versión 18 o superior)**.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Para compilar para producción:
   ```bash
   npm run build
   npm run preview
   ```
5. Abre en tu navegador móvil o de escritorio:
   ```
   http://localhost:3000
   ```

---

## 🔒 Privacidad y Aviso Legal
*Herramienta de documentación y apoyo clínico. No sustituye el juicio médico ni los protocolos institucionales.*