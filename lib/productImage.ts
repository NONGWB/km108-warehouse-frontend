const MAX_IMAGE_DIMENSION = 512;
const WEBP_QUALITY = 0.8;

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('ไม่สามารถย่อรูปสินค้าได้')),
      'image/webp',
      WEBP_QUALITY,
    );
  });
}

export async function prepareProductImage(file: File) {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('ไม่สามารถเตรียมรูปสินค้าได้');

    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);
    return new File([blob], 'product.webp', { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}
