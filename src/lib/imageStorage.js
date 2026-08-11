import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const IMAGE_BUCKET = "grolo-images";
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const IMAGE_LIMITS = {
  avatar: 3 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
  listing: 5 * 1024 * 1024,
  event: 5 * 1024 * 1024,
  post: 5 * 1024 * 1024,
  promotion: 5 * 1024 * 1024,
};

function extensionForType(type) {
  return type === "image/jpeg" ? "jpg" : type.split("/")[1];
}

function requireStorage(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    throw new Error("Supabase is not configured or the user is not signed in.");
  }
}

export function validateImage(file, kind = "listing") {
  if (!file || !IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please choose a JPG, PNG, or WEBP image.");
  }
  const maxBytes = IMAGE_LIMITS[kind] ?? IMAGE_LIMITS.listing;
  if (file.size > maxBytes) {
    throw new Error(`This ${kind} image must be ${(maxBytes / (1024 * 1024)).toFixed(0)} MB or smaller.`);
  }
  return file;
}

export async function uploadImage(file, { userId, kind = "listing", folder = kind } = {}) {
  requireStorage(userId);
  validateImage(file, kind);

  const path = `${userId}/${folder}/${crypto.randomUUID()}.${extensionForType(file.type)}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export function isTemporaryImageSource(source) {
  return typeof source === "string" && (source.startsWith("data:") || source.startsWith("blob:"));
}

export async function uploadImageSource(source, options) {
  if (source instanceof File || source instanceof Blob) return uploadImage(source, options);
  if (typeof source !== "string" || !(source.startsWith("data:") || source.startsWith("blob:"))) {
    return null;
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error("Unable to read the existing image.");
  const blob = await response.blob();
  return uploadImage(blob, options);
}

export async function removeImage(pathOrUrl, userId) {
  requireStorage(userId);
  const prefix = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const path = pathOrUrl?.includes(prefix) ? pathOrUrl.split(prefix)[1] : pathOrUrl;
  if (!path || !path.startsWith(`${userId}/`)) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}
