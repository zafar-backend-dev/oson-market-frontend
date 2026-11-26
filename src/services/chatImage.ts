export async function decodeChatImage(file: File): Promise<HTMLImageElement> {
  const image = new Image();
  async function decode(blob: Blob) {
    const url = URL.createObjectURL(blob);
    try {
      image.src = url;
      await image.decode();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  try {
    await decode(file);
  } catch {
    const { heicTo, isHeic } = await import('heic-to');
    if (!await isHeic(file)) throw new Error('Image preview unavailable');
    await decode(await heicTo({ blob: file, type: 'image/png' }));
  }
  return image;
}
