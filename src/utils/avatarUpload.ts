import { copyChatImage, decodeChatImage } from '../services/chatImage';
import { AVATAR_MAX_BYTES, AVATAR_MAX_DIMENSION } from './validation';

export const AVATAR_MAX_SOURCE_MB = 25;
export const AVATAR_MAX_SOURCE_BYTES = AVATAR_MAX_SOURCE_MB * 1024 * 1024;

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

export async function prepareAvatarFile(source: File): Promise<File> {
  const file = await copyChatImage(source);
  let image: HTMLImageElement;
  try {
    image = await decodeChatImage(file);
  } catch (error) {
    // Try server-side decoding when the device cannot open the source format.
    if (file.size <= AVATAR_MAX_BYTES) {
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
