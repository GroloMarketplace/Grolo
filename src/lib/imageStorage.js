import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { createId } from "../utils/createId";

export const IMAGE_BUCKET = "grolo-images";
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const IMAGE_LIMITS = {
  avatar: 10 * 1024 * 1024,
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
    throw new Error(kind === "avatar"
      ? "Profile pictures must be 10 MB or smaller."
      : `This ${kind} image must be ${(maxBytes / (1024 * 1024)).toFixed(0)} MB or smaller.`);
  }
  return file;
}

function reportProgress(onProgress, progress, stage) {
  onProgress?.({ progress, stage });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to optimize this image.")), type, quality);
  });
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Unable to read this image."));
      image.src = sourceUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function optimizeAvatar(file, onProgress) {
  reportProgress(onProgress, 15, "Reading profile picture");
  const image = await decodeImage(file);
  const scale = Math.min(1, 800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  reportProgress(onProgress, 45, "Optimizing profile picture");

  const qualities = [0.84, 0.76, 0.68, 0.60, 0.52, 0.45];
  let optimized = null;
  for (const quality of qualities) {
    let candidate = await canvasBlob(canvas, "image/webp", quality);
    if (candidate.type !== "image/webp") candidate = await canvasBlob(canvas, "image/jpeg", quality);
    optimized = candidate;
    if (candidate.size <= 800 * 1024) break;
  }
  if (!optimized) throw new Error("Unable to optimize this image.");
  reportProgress(onProgress, 65, "Profile picture optimized");
  return new File([optimized], "profile-picture.webp", { type: optimized.type || "image/webp" });
}

export async function uploadImage(file, { userId, kind = "listing", folder = kind, onProgress } = {}) {
  requireStorage(userId);
  validateImage(file, kind);
  const uploadFile = kind === "avatar" ? await optimizeAvatar(file, onProgress) : file;
  const extension = uploadFile.type === "image/webp" ? "webp" : extensionForType(uploadFile.type);
  const path = `${userId}/${folder}/${createId("image")}.${extension}`;
  reportProgress(onProgress, 80, kind === "avatar" ? "Uploading profile picture" : "Uploading image");
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, uploadFile, {
    cacheControl: "31536000",
    contentType: uploadFile.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  reportProgress(onProgress, 100, "Upload complete");
  return { path, url: data.publicUrl, originalSize: file.size, optimizedSize: uploadFile.size };
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
