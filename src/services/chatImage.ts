function detectedImageType(bytes: Uint8Array): string | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const signature = String.fromCharCode(...bytes);
  if (signature.startsWith('\x89PNG\r\n\x1a\n')) return 'image/png';
  if (signature.startsWith('GIF87a') || signature.startsWith('GIF89a')) return 'image/gif';
  if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') return 'image/webp';
  return undefined;
}

export async function copyChatImage(file: File): Promise<File> {
  // Android pickers can expose a temporary content URI. Read it while selected.
  const buffer = await file.arrayBuffer();
  if (!buffer.byteLength) throw new Error('Empty image');
  const header = new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength));
  const type = detectedImageType(header) ?? file.type;
  return new File([buffer], file.name, { type, lastModified: file.lastModified });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth && image.naturalHeight
      ? resolve(image) : reject(new Error('Invalid image dimensions'));
    image.onerror = () => reject(new Error('Image preview unavailable'));
    image.src = url;
  });
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } catch {
    return await loadImage(await dataUrl(blob));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function decodeChatImage(file: File): Promise<HTMLImageElement> {
  try {
    return await loadBlob(file);
  } catch {
    const { heicTo, isHeic } = await import('heic-to');
    if (!await isHeic(file)) throw new Error('Image preview unavailable');
    return loadBlob(await heicTo({ blob: file, type: 'image/png' }));
  }
}
