import { AVATAR_MAX_BYTES, AVATAR_MAX_DIMENSION } from './validation';

export const AVATAR_MAX_SOURCE_MB = 25;
export const AVATAR_MAX_SOURCE_BYTES = AVATAR_MAX_SOURCE_MB * 1024 * 1024;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  return new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Cannot decode avatar'));
    image.src = url;
  }).then(() => image).finally(() => URL.revokeObjectURL(url));
}

async function decodeImage(file: File): Promise<HTMLImageElement> {
  try {
    return await loadImage(file);
  } catch {
    const { heicTo, isHeic } = await import('heic-to');
    if (!await isHeic(file)) throw new Error('Cannot decode avatar');
    return loadImage(await heicTo({ blob: file, type: 'image/jpeg', quality: 0.94 }));
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

export async function prepareAvatarFile(file: File): Promise<File> {
  let image: HTMLImageElement;
  try {
    image = await decodeImage(file);
  } catch (error) {
    // Some browsers lack a TIFF decoder. The server can decode small TIFF files directly.
    if (file.size <= AVATAR_MAX_BYTES && (/\.tiff?$/i.test(file.name) || file.type === 'image/tiff')) {
      return file;
    }
    throw error;
  }
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) throw new Error('Invalid avatar dimensions');
  if ((file.type === 'image/png' || file.type === 'image/jpeg') && file.size <= AVATAR_MAX_BYTES
      && Math.max(width, height) <= AVATAR_MAX_DIMENSION) return file;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const render = (maxDimension: number, opaque: boolean) => {
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    if (opaque) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  };

  render(AVATAR_MAX_DIMENSION, false);
  const png = await encode(canvas, 'image/png');
  if (png && png.size <= AVATAR_MAX_BYTES) return new File([png], 'avatar.png', { type: 'image/png' });

  for (const dimension of [AVATAR_MAX_DIMENSION, 1280, 768]) {
    render(dimension, true);
    const jpeg = await encode(canvas, 'image/jpeg', 0.86);
    if (jpeg && jpeg.size <= AVATAR_MAX_BYTES) return new File([jpeg], 'avatar.jpg', { type: 'image/jpeg' });
  }
  throw new Error('Cannot encode avatar');
}
