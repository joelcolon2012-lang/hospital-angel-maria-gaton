/**
 * Utilidades de imagen para fotos de perfil.
 * Las fotos del celular pesan varios MB; se recortan en cuadrado y se reducen a
 * 320 px en JPEG (~20–50 KB) para que se sincronicen rápido en todos los dispositivos.
 */
export const AVATAR_SIZE = 320;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen. Use una foto JPG o PNG.'));
    img.src = src;
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsDataURL(file);
  });
}

/** Recorta al centro, reduce y comprime la foto. Devuelve un data URL JPEG. */
export async function compressAvatar(file: File, size = AVATAR_SIZE): Promise<string> {
  if (!file) throw new Error('No se seleccionó ninguna imagen.');
  if (file.type && !file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('La imagen es demasiado grande (máximo 25 MB).');

  const url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : await readAsDataUrl(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('La imagen está vacía o dañada.');
    const side = Math.min(w, h);
    const sx = (w - side) / 2;
    const sy = (h - side) / 2;
    const out = Math.min(size, side);
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador no permite procesar imágenes.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out, out);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    let q = 0.85;
    let data = canvas.toDataURL('image/jpeg', q);
    while (data.length > 120_000 && q > 0.4) {
      q -= 0.1;
      data = canvas.toDataURL('image/jpeg', q);
    }
    return data;
  } finally {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}

/** Iniciales para mostrar cuando el médico no tiene foto. */
export function initialsOf(name?: string): string {
  const parts = String(name || '')
    .replace(/^(dr|dra|lic|licda)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
