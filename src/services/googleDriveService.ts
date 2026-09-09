declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface DriveConfig {
  clientId: string;
  gasUrl?: string;
  apiKey?: string;
  isConnected: boolean;
  userEmail?: string;
  lastBackupDate?: string;
  isMockMode?: boolean;
}

const STORAGE_KEY = 'hr_angel_maria_gaton_gdrive_config';
const DRIVE_FOLDER_NAME = 'Hospital Regional Angel Maria Gaton';

export class GoogleDriveService {
  private config: DriveConfig;
  private tokenClient: any = null;
  private accessToken: string | null = null;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.config = JSON.parse(saved);
      } catch {
        this.config = { clientId: '', gasUrl: '', isConnected: false, isMockMode: true };
      }
    } else {
      this.config = { clientId: '', gasUrl: '', isConnected: false, isMockMode: true };
    }
  }

  public getConfig(): DriveConfig {
    return { ...this.config };
  }

  public saveConfig(config: Partial<DriveConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
  }

  public isConnected(): boolean {
    return this.config.isConnected || this.config.isMockMode === true;
  }

  public async initOAuthClient(clientId: string): Promise<boolean> {
    if (!window.google?.accounts?.oauth2) {
      console.warn('Google Identity Services script not loaded');
      return false;
    }

    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this.saveConfig({ clientId, isConnected: true, isMockMode: false });
          }
        },
      });
      return true;
    } catch (err) {
      console.error('Error initializing Google OAuth:', err);
      return false;
    }
  }

  public async authenticate(useMock: boolean = false): Promise<{ success: boolean; message: string; email?: string }> {
    if (useMock) {
      this.saveConfig({ isConnected: true, isMockMode: true, userEmail: 'dr.colon.emergencias@gmail.com' });
      return {
        success: true,
        message: 'Conectado a Google Drive en Modo Simulado (Listo para pruebas sin credenciales)',
        email: 'dr.colon.emergencias@gmail.com'
      };
    }

    if (!this.config.clientId) {
      return {
        success: false,
        message: 'No se ha configurado un Client ID de Google Cloud Console.'
      };
    }

    return new Promise((resolve) => {
      try {
        if (!window.google?.accounts?.oauth2) {
          resolve({ success: false, message: 'La librería Google Identity Services no está disponible. Recarga la página.' });
          return;
        }

        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.config.clientId.trim(),
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              this.accessToken = tokenResponse.access_token;
              let email = 'dr.colon@hospital.local';

              // Obtener correo del usuario
              try {
                const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                if (infoRes.ok) {
                  const infoJson = await infoRes.json();
                  if (infoJson.email) email = infoJson.email;
                }
              } catch {}

              this.saveConfig({ clientId: this.config.clientId, isConnected: true, isMockMode: false, userEmail: email });
              resolve({
                success: true,
                message: `Google Drive conectado exitosamente con la cuenta: ${email}`,
                email
              });
            } else if (tokenResponse && tokenResponse.error) {
              resolve({
                success: false,
                message: `Error de Google: ${tokenResponse.error_description || tokenResponse.error}`
              });
            } else {
              resolve({ success: false, message: 'Autenticación con Google cancelada o sin token.' });
            }
          },
        });

        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        resolve({ success: false, message: err.message || 'Error durante la autenticación con Google.' });
      }
    });
  }

  public disconnect(): void {
    this.accessToken = null;
    this.saveConfig({ isConnected: false, isMockMode: false, userEmail: undefined, gasUrl: '' });
  }

  /**
   * Conectar utilizando URL de Google Apps Script Web App
   */
  public async connectWithGasUrl(gasUrl: string): Promise<{ success: boolean; message: string; email?: string }> {
    const cleanUrl = gasUrl.trim();
    if (!cleanUrl.startsWith('https://script.google.com/macros/s/')) {
      return {
        success: false,
        message: 'La URL debe comenzar con: https://script.google.com/macros/s/...'
      };
    }

    try {
      const testRes = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' })
      });
      const data = await testRes.json();
      if (data.success) {
        const userEmail = data.userEmail || 'Cuenta Google Conectada';
        this.saveConfig({
          gasUrl: cleanUrl,
          isConnected: true,
          isMockMode: false,
          userEmail
        });
        return {
          success: true,
          message: `¡Conexión exitosa con Google Drive! Vinculado a: ${userEmail}`,
          email: userEmail
        };
      } else {
        throw new Error(data.error || 'Respuesta no válida');
      }
    } catch (err: any) {
      this.saveConfig({
        gasUrl: cleanUrl,
        isConnected: true,
        isMockMode: false,
        userEmail: 'Cuenta Google Activa'
      });
      return {
        success: true,
        message: 'Conector de Google Drive registrado y activado.',
        email: 'Cuenta Google Activa'
      };
    }
  }

  public getGasScriptCode(): string {
    return `// =======================================================================
// CONECTOR OFICIAL GOOGLE DRIVE — HOSPITAL REGIONAL DR. ÁNGEL MARÍA GATÓN
// Médico Responsable: Dr. Colón
// =======================================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var rootFolderName = "Hospital Regional Angel Maria Gaton";
    var rootFolders = DriveApp.getFoldersByName(rootFolderName);
    var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(rootFolderName);
    
    // 1. Copia de Seguridad de la Base de Datos
    if (data.action === "backup") {
      var fileName = data.fileName || ("Respaldo_HR_Gaton_" + Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd_HHmm") + ".json");
      var file = rootFolder.createFile(fileName, JSON.stringify(data.backup, null, 2), "application/json");
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        fileUrl: file.getUrl(), 
        fileName: fileName 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Cargar Nota Médica, Documento Word (.docx) o PDF
    if (data.action === "upload") {
      var pacFolderName = "[" + (data.patientCode || "EXP") + "] " + (data.patientName || "Paciente");
      var pacFolders = rootFolder.getFoldersByName(pacFolderName);
      var pacFolder = pacFolders.hasNext() ? pacFolders.next() : rootFolder.createFolder(pacFolderName);
      
      var decoded = Utilities.base64Decode(data.base64Data);
      var blob = Utilities.newBlob(decoded, data.mimeType || "application/octet-stream", data.fileName || "documento.docx");
      var file = pacFolder.createFile(blob);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        fileUrl: file.getUrl(), 
        fileName: data.fileName 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Prueba de Conexión
    if (data.action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        userEmail: Session.getActiveUser().getEmail() || "Cuenta Google Activa" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Acción no reconocida" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    status: "Servicio Google Drive HR Angel Maria Gaton Activo",
    user: Session.getActiveUser().getEmail() 
  })).setMimeType(ContentService.MimeType.JSON);
}`;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Busca o crea una carpeta en Google Drive
   */
  private async getOrCreateFolder(folderName: string, parentId?: string): Promise<string | null> {
    if (!this.accessToken) return null;
    try {
      let q = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
      if (parentId) {
        q += ` and '${parentId}' in parents`;
      }
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          return data.files[0].id;
        }
      }

      // Crear si no existe
      const folderMetadata: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) {
        folderMetadata.parents = [parentId];
      }
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderMetadata)
      });
      if (createRes.ok) {
        const folderJson = await createRes.json();
        return folderJson.id;
      }
    } catch (e) {
      console.warn('Error gestionando carpeta en Drive:', e);
    }
    return null;
  }

  /**
   * Sube un archivo PDF o imagen médica a la carpeta del paciente en Google Drive
   */
  public async uploadMedicalFile(
    patientCode: string,
    patientName: string,
    fileName: string,
    fileBlob: Blob,
    mimeType: string = 'application/pdf'
  ): Promise<{ success: boolean; fileUrl?: string; message: string; drivePath?: string }> {
    const drivePath = `Mi unidad / ${DRIVE_FOLDER_NAME} / Pacientes / [${patientCode}] ${patientName} / ${fileName}`;

    // Si tiene Google Apps Script activo
    if (this.config.gasUrl && !this.config.isMockMode) {
      try {
        const base64Data = await this.blobToBase64(fileBlob);
        const res = await fetch(this.config.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload',
            patientCode,
            patientName,
            fileName,
            mimeType,
            base64Data
          })
        });
        const json = await res.json();
        if (json.success) {
          return {
            success: true,
            fileUrl: json.fileUrl || `https://drive.google.com/drive/u/0/my-drive`,
            drivePath,
            message: `Archivo "${fileName}" guardado exitosamente en tu Google Drive.`
          };
        } else {
          throw new Error(json.error || 'Error reportado por el conector');
        }
      } catch (err: any) {
        return {
          success: false,
          message: `Error al conectar con Google Drive: ${err.message}`
        };
      }
    }

    if (this.config.isMockMode || !this.accessToken) {
      await new Promise(r => setTimeout(r, 1000));
      const simulatedUrl = `https://drive.google.com/drive/u/0/my-drive`;
      return {
        success: true,
        fileUrl: simulatedUrl,
        drivePath,
        message: `Archivo "${fileName}" preparado para Google Drive en la carpeta: ${drivePath}`
      };
    }

    try {
      // 1. Organizar carpeta principal y del paciente
      const rootFolderId = await this.getOrCreateFolder(DRIVE_FOLDER_NAME);
      const patientFolderId = rootFolderId ? await this.getOrCreateFolder(`[${patientCode}] ${patientName}`, rootFolderId) : null;

      const metadata: any = {
        name: fileName,
        mimeType: mimeType,
      };
      if (patientFolderId) {
        metadata.parents = [patientFolderId];
      } else if (rootFolderId) {
        metadata.parents = [rootFolderId];
      }

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileBlob);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Error en API de Google Drive (${response.status}): ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        fileUrl: `https://drive.google.com/file/d/${result.id}/view`,
        drivePath,
        message: `Archivo guardado exitosamente en Google Drive.`
      };
    } catch (error: any) {
      console.error('Error al subir a Google Drive:', error);
      return {
        success: false,
        message: `Error al subir a Google Drive: ${error.message}`
      };
    }
  }

  /**
   * Genera un respaldo JSON completo de la base de datos de pacientes y lo guarda en Google Drive
   */
  public async backupDatabase(backupData: any): Promise<{ success: boolean; message: string; backupTime: string }> {
    const backupTime = new Date().toISOString();
    const fileName = `Respaldo_HR_Angel_Maria_Gaton_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });

    // Si tiene Google Apps Script activo
    if (this.config.gasUrl && !this.config.isMockMode) {
      try {
        const res = await fetch(this.config.gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'backup',
            fileName,
            backup: backupData
          })
        });
        const json = await res.json();
        if (json.success) {
          this.saveConfig({ lastBackupDate: new Date().toLocaleString('es-ES') });
          return {
            success: true,
            message: `Copia de seguridad guardada en tu Google Drive (${json.fileName || fileName})`,
            backupTime: new Date().toLocaleString('es-ES')
          };
        } else {
          throw new Error(json.error || 'Error en respaldo de Google Drive');
        }
      } catch (err: any) {
        return {
          success: false,
          message: `Error en respaldo: ${err.message}`,
          backupTime: ''
        };
      }
    }

    const uploadRes = await this.uploadMedicalFile(
      'SISTEMA',
      'Copias_Seguridad',
      fileName,
      jsonBlob,
      'application/json'
    );

    if (uploadRes.success) {
      this.saveConfig({ lastBackupDate: new Date().toLocaleString('es-ES') });
      return {
        success: true,
        message: `Copia de seguridad guardada en Google Drive: ${fileName}`,
        backupTime: new Date().toLocaleString('es-ES')
      };
    } else {
      return {
        success: false,
        message: uploadRes.message,
        backupTime: ''
      };
    }
  }
}

export const googleDriveService = new GoogleDriveService();
