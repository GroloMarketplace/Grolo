import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const MEDIA_BUCKET = "grolo-images";
export const IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_MEDIA_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const AUDIO_MEDIA_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"];

const MEDIA_LIMITS = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
};

function requireStorage(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    throw new Error("Supabase is not configured or the user is not signed in.");
  }
}

function mediaKind(type) {
  const normalizedType = type?.split(";")[0];
  if (IMAGE_MEDIA_TYPES.includes(normalizedType)) return "image";
  if (VIDEO_MEDIA_TYPES.includes(normalizedType)) return "video";
  if (AUDIO_MEDIA_TYPES.includes(normalizedType)) return "audio";
  return null;
}

function extensionForType(type, fallback = "bin") {
  if (type === "image/jpeg") return "jpg";
  if (type === "video/quicktime") return "mov";
  if (type === "audio/mpeg") return "mp3";
  if (type === "audio/mp4") return "m4a";
  return type.split("/")[1]?.split(";")[0] || fallback;
}

export function validateMedia(file) {
  const kind = file && mediaKind(file.type);
  if (!kind) throw new Error("Please choose a JPG, PNG, WEBP, MP4, WEBM, MOV, MP3, M4A, WAV, or OGG file.");
  const maxBytes = MEDIA_LIMITS[kind];
  if (file.size > maxBytes) throw new Error(`This ${kind} must be ${(maxBytes / (1024 * 1024)).toFixed(0)} MB or smaller.`);
  return { file, kind };
}

export async function uploadMedia(file, { userId, folder = "posts" } = {}) {
  requireStorage(userId);
  const { kind } = validateMedia(file);
  const path = `${userId}/${folder}/${kind}/${crypto.randomUUID()}.${extensionForType(file.type)}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl, type: file.type, kind };
}
