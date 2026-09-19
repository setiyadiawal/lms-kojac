import { supabase } from '../../lib/supabase';

export const ASSIGNMENT_IMAGE_BUCKET = 'assignment-images';
export const MAX_ASSIGNMENT_PHOTOS = 10;
export const MAX_ASSIGNMENT_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type AssignmentPhoto = {
  name: string;
  path: string;
  signedUrl: string;
};

function extensionFor(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function listAssignmentPhotos(
  studentId: string,
  assignmentId: string,
): Promise<AssignmentPhoto[]> {
  const prefix = `${studentId}/${assignmentId}`;
  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_IMAGE_BUCKET)
    .list(prefix, {
      limit: MAX_ASSIGNMENT_PHOTOS,
      sortBy: { column: 'created_at', order: 'asc' },
    });

  if (error) throw error;

  const objects = (data ?? []).filter((item) => Boolean(item.id));

  return Promise.all(objects.map(async (item) => {
    const path = `${prefix}/${item.name}`;
    const { data: signed, error: signedError } = await supabase.storage
      .from(ASSIGNMENT_IMAGE_BUCKET)
      .createSignedUrl(path, 60 * 60);

    if (signedError) throw signedError;

    return {
      name: item.name,
      path,
      signedUrl: signed.signedUrl,
    };
  }));
}

export async function uploadAssignmentPhotos(
  studentId: string,
  assignmentId: string,
  files: File[],
  existingCount: number,
) {
  if (files.length === 0) return;

  if (existingCount + files.length > MAX_ASSIGNMENT_PHOTOS) {
    throw new Error(`Maksimal ${MAX_ASSIGNMENT_PHOTOS} foto per tugas.`);
  }

  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      throw new Error('Format foto harus JPG/JPEG, PNG, atau WebP.');
    }

    if (file.size > MAX_ASSIGNMENT_PHOTO_BYTES) {
      throw new Error('Ukuran setiap foto maksimal 5 MB.');
    }
  }

  for (const file of files) {
    const path = `${studentId}/${assignmentId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error } = await supabase.storage
      .from(ASSIGNMENT_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;
  }
}

export async function removeAssignmentPhoto(path: string) {
  const { error } = await supabase.storage
    .from(ASSIGNMENT_IMAGE_BUCKET)
    .remove([path]);

  if (error) throw error;
}
