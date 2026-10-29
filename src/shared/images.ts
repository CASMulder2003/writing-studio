import { id, type NoteImage } from '../domain/book';
export async function readImage(file: File): Promise<NoteImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size > 15 * 1024 * 1024)
    throw new Error('Choose an image smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Images are unavailable in this browser.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL(
    file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    0.84,
  );
  if (dataUrl.length > 4 * 1024 * 1024)
    throw new Error('This image is still too large. Try a smaller version.');
  return { id: id(), name: file.name, dataUrl };
}
