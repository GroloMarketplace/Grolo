import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { POST_CLASSIFICATIONS } from "../data/postClassifications";
import { usePosts } from "../context/PostContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useAuth } from "../context/AuthContext";
import { useListings } from "../context/ListingContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { formatListingPrice } from "../utils/listingDisplay";
import AttachListingModal from "../components/AttachListingModal";
import TradeBadge from "../components/TradeBadge";
import { AUDIO_MEDIA_TYPES, IMAGE_MEDIA_TYPES, VIDEO_MEDIA_TYPES, uploadMedia } from "../lib/mediaStorage";

const MAX_MEDIA = 10;
const MAX_VIDEO_SECONDS = 90;
const MAX_AUDIO_SECONDS = 120;
const AUDIO_RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function mediaAccept(types) {
  return types.join(",");
}

function getMediaDuration(file) {
  if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) return Promise.resolve(0);
  return new Promise((resolve, reject) => {
    const element = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    const source = URL.createObjectURL(file);
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      URL.revokeObjectURL(source);
      resolve(element.duration);
    };
    element.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("Unable to read the media duration."));
    };
    element.src = source;
  });
}

function mediaLabel(kind) {
  return kind === "image" ? "Photo" : kind === "video" ? "Video" : "Audio";
}

function MediaPreview({ item, index, onRemove }) {
  return (
    <div className="relative min-w-0 shrink-0 overflow-hidden rounded-lg border border-[#E6E6E6] bg-black">
      {item.kind === "image" && <img src={item.url} alt={`Post photo ${index + 1}`} className="h-28 w-28 object-cover" />}
      {item.kind === "video" && <video src={item.url} controls playsInline className="h-28 w-44 object-cover" />}
      {item.kind === "audio" && <div className="flex h-28 w-64 items-center bg-[#F5F5F5] p-2"><audio src={item.url} controls className="w-full" /></div>}
      <button type="button" aria-label={`Remove ${mediaLabel(item.kind).toLowerCase()}`} onClick={() => onRemove(index)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{mediaLabel(item.kind)}</span>
    </div>
  );
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { addPost } = usePosts();
  const { settings: buyerProfile } = useBuyerSettings();
  const { user } = useAuth();
  const { listings } = useListings();
  const { getSellerProfile } = useSellerSettings();
  const sellerId = user?.id ?? "current-user";
  const photoInputRef = useRef(null);
  const cameraPhotoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const cameraVideoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const [content, setContent] = useState("");
  const [classification, setClassification] = useState("");
  const [media, setMedia] = useState([]);
  const [mediaError, setMediaError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attachedListingId, setAttachedListingId] = useState(null);
  const [showListingPicker, setShowListingPicker] = useState(false);

  const sellerListings = listings.filter((listing) => listing.sellerId === sellerId);
  const attachedListing = attachedListingId ? sellerListings.find((listing) => listing.id === attachedListingId) : null;

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setMediaError("");
    const room = MAX_MEDIA - media.length;
    if (room <= 0) {
      setMediaError(`You can attach up to ${MAX_MEDIA} media items.`);
      return;
    }
    const selected = files.slice(0, room);
    try {
      const uploaded = [];
      setUploading(true);
      for (const file of selected) {
        const duration = await getMediaDuration(file);
        if (file.type.startsWith("video/") && duration > MAX_VIDEO_SECONDS) throw new Error(`Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.`);
        if (file.type.startsWith("audio/") && duration > MAX_AUDIO_SECONDS) throw new Error(`Audio recordings must be ${MAX_AUDIO_SECONDS} seconds or shorter.`);
        const stored = await uploadMedia(file, { userId: user?.id, folder: "posts" });
        uploaded.push({ ...stored, duration: duration || null, name: file.name });
      }
      setMedia((current) => [...current, ...uploaded]);
    } catch (error) {
      setMediaError(error.message || "Unable to upload media. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const startAudioRecording = async () => {
    if (media.length >= MAX_MEDIA) {
      setMediaError(`You can attach up to ${MAX_MEDIA} media items.`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMediaError("Audio recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = AUDIO_RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type });
        try {
          setUploading(true);
          const duration = await getMediaDuration(file);
          if (duration > MAX_AUDIO_SECONDS) throw new Error(`Audio recordings must be ${MAX_AUDIO_SECONDS} seconds or shorter.`);
          const stored = await uploadMedia(file, { userId: user?.id, folder: "posts" });
          setMedia((current) => [...current, { ...stored, duration, name: file.name }]);
        } catch (error) {
          setMediaError(error.message || "Unable to upload the audio recording.");
        } finally {
          setUploading(false);
        }
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      setMediaError("");
      setRecording(true);
      recorder.start();
    } catch (error) {
      setMediaError(error.message || "Unable to access the microphone.");
    }
  };

  const stopAudioRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const removeMedia = (index) => setMedia((current) => current.filter((_, i) => i !== index));

  const handleAttachListing = (listing) => {
    setAttachedListingId(listing.id);
    setShowListingPicker(false);
  };

  const handlePublish = async () => {
    if (!content.trim() && !media.length && !attachedListingId) {
      setMediaError("Add text, media, or a listing before publishing.");
      return;
    }
    // Handle post publishing logic
    setMediaError("");
    setPublishing(true);
    try {
      const post = await addPost({
        name: buyerProfile.displayName || user?.user_metadata?.name || "",
        sellerId,
        authorId: buyerProfile.displayName,
        productId: attachedListingId,
        location: buyerProfile.location || buyerProfile.city || "",
        latitude: buyerProfile.latitude ?? null,
        longitude: buyerProfile.longitude ?? null,
        group: "Your Community",
        classification,
        time: "Just now",
        avatar: buyerProfile.avatar,
        image: media.find((item) => item.kind === "image")?.url ?? "",
        images: media.filter((item) => item.kind === "image").map((item) => item.url),
        media,
        body: content,
        likes: 0,
        comments: 0,
        shares: 0,
        sends: 0,
      });
      console.log("Post Created:", post.id);
      navigate("/", { state: { tab: "Your Community", communityFilter: "Posts" } });
    } catch (error) {
      setMediaError(error.message || "Unable to publish post. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <MobileScreenLayout>
      <Header title="Create Post" onBack={() => navigate("/my-shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar p-4">
        {/* Post Content */}
        <div className="mb-4">
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="What's on your mind?" className="h-32 w-full resize-none rounded-lg border border-[#E6E6E6] p-3 text-[14px] outline-none" />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-[14px] font-semibold">Post Classification</label>
          <select required value={classification} onChange={(event) => setClassification(event.target.value)} className="w-full rounded-lg border border-[#E6E6E6] px-3 py-3 text-[14px] outline-none focus:border-[#498467]"><option value="">Select classification</option>{POST_CLASSIFICATIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
        </div>

        {/* Photos */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between"><p className="text-[14px] font-semibold">Add to your post</p><span className="text-[12px] text-[#828282]">{media.length}/{MAX_MEDIA}</span></div>
          <input ref={cameraPhotoInputRef} type="file" accept="image/*" capture="environment" onChange={handleFiles} className="hidden" />
          <input ref={photoInputRef} type="file" accept={mediaAccept(IMAGE_MEDIA_TYPES)} multiple onChange={handleFiles} className="hidden" />
          <input ref={cameraVideoInputRef} type="file" accept={mediaAccept(VIDEO_MEDIA_TYPES)} capture="environment" onChange={handleFiles} className="hidden" />
          <input ref={videoInputRef} type="file" accept={mediaAccept(VIDEO_MEDIA_TYPES)} multiple onChange={handleFiles} className="hidden" />
          <input ref={audioInputRef} type="file" accept={mediaAccept(AUDIO_MEDIA_TYPES)} onChange={handleFiles} className="hidden" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => cameraPhotoInputRef.current?.click()} disabled={uploading || media.length >= MAX_MEDIA} className="rounded-lg border border-[#E6E6E6] bg-[#F5F5F5] px-3 py-3 text-left text-[13px] font-medium disabled:opacity-50">📷 Camera<span className="mt-1 block text-[11px] font-normal text-[#828282]">Take a photo</span></button>
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploading || media.length >= MAX_MEDIA} className="rounded-lg border border-[#E6E6E6] bg-[#F5F5F5] px-3 py-3 text-left text-[13px] font-medium disabled:opacity-50">🖼 Photos<span className="mt-1 block text-[11px] font-normal text-[#828282]">Choose from gallery</span></button>
            <button type="button" onClick={() => cameraVideoInputRef.current?.click()} disabled={uploading || media.length >= MAX_MEDIA} className="rounded-lg border border-[#E6E6E6] bg-[#F5F5F5] px-3 py-3 text-left text-[13px] font-medium disabled:opacity-50">🎥 Video<span className="mt-1 block text-[11px] font-normal text-[#828282]">Record up to 90 sec</span></button>
            <button type="button" onClick={recording ? stopAudioRecording : startAudioRecording} disabled={uploading || (!recording && media.length >= MAX_MEDIA)} className={`rounded-lg border px-3 py-3 text-left text-[13px] font-medium disabled:opacity-50 ${recording ? "border-red-500 bg-red-50 text-red-700" : "border-[#E6E6E6] bg-[#F5F5F5]"}`}>{recording ? "■ Stop Recording" : "🎙 Record Audio"}<span className="mt-1 block text-[11px] font-normal text-[#828282]">Up to 2 minutes</span></button>
          </div>
          <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploading || media.length >= MAX_MEDIA} className="mt-2 w-full rounded-lg border border-dashed border-[#498467] px-3 py-2 text-[13px] font-medium text-[#498467] disabled:opacity-50">Add videos from gallery</button>
          {uploading && <p className="mt-2 text-[13px] text-[#498467]">Uploading media…</p>}
          {mediaError && <p className="mt-2 text-[13px] font-medium text-red-600">{mediaError}</p>}
          {media.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{media.map((item, index) => <MediaPreview key={`${item.path}-${index}`} item={item} index={index} onRemove={removeMedia} />)}</div>}
        </div>

        {/* Product Attachment Section */}
        <div className="mb-4">
          <p className="mb-2 text-[14px] font-semibold">Attach a listing (optional)</p>
          {attachedListing ? (
            <div className="rounded-lg border border-[#E6E6E6] p-3"><p className="mb-2 text-[12px] font-medium text-[#828282]">Attached Listing</p><div className="flex items-center gap-3"><img src={attachedListing.image} alt={attachedListing.name} className="h-12 w-12 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{attachedListing.name}</p><p className="text-[13px] text-[#498467]">{formatListingPrice(attachedListing)}</p><p className="text-[12px] text-[#828282]">Seller: {getSellerProfile(sellerId).name || "You"}</p><TradeBadge listing={attachedListing} compact className="mt-1" /></div></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => setShowListingPicker(true)} className="flex-1 rounded-lg border border-[#498467] py-2 text-[13px] font-medium text-[#498467]">Change</button><button type="button" onClick={() => setAttachedListingId(null)} className="flex-1 rounded-lg border border-red-500 py-2 text-[13px] font-medium text-red-500">Remove</button></div></div>
          ) : (
            <button type="button" onClick={() => setShowListingPicker(true)} className="w-full rounded-lg border border-[#E6E6E6] p-3 text-left"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F5F5]"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#828282]"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div className="flex-1"><p className="text-[14px] text-[#828282]">Select a listing to attach</p></div></div></button>
          )}
        </div>

        {/* Publish Button */}
        <button onClick={handlePublish} disabled={uploading || recording || publishing} className="w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white disabled:opacity-50">{publishing ? "Publishing…" : "Publish Post"}</button>
      </div>

      {showListingPicker && <AttachListingModal listings={sellerListings} selectedListingId={attachedListingId} onSelect={handleAttachListing} onClose={() => setShowListingPicker(false)} />}
    </MobileScreenLayout>
  );
}
