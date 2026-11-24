import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { absoluteAppUrl } from "../lib/appUrl";

export default function SellerProfileShareModal({ seller, profile, onClose }) {
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState("");
  const profilePath = `/seller/${encodeURIComponent(seller.id)}`;
  const profileLink = useMemo(() => absoluteAppUrl(profilePath), [profilePath]);
  const shareText = `Check out ${profile.name} on Grolo and discover local products, events, and community updates.`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(profileLink, {
      width: 240,
      margin: 2,
      color: { dark: "#1F2937", light: "#FFFFFF" },
    }).then((dataUrl) => {
      if (active) setQrCode(dataUrl);
    }).catch(() => {
      if (active) setStatus("QR code could not be generated");
    });
    return () => { active = false; };
  }, [profileLink]);

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileLink);
      setStatus("Profile link copied");
    } catch {
      setStatus("Copy is unavailable on this device");
    }
  };

  const openShareTarget = (target) => {
    const encodedText = encodeURIComponent(`${shareText} ${profileLink}`);
    const encodedUrl = encodeURIComponent(profileLink);
    const targets = {
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      X: `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodedUrl}`,
      Messages: `sms:?&body=${encodedText}`,
      Email: `mailto:?subject=${encodeURIComponent(`Discover ${profile.name} on Grolo`)}&body=${encodedText}`,
    };

    if (target === "Instagram") {
      copyProfileLink();
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      setStatus("Profile link copied for Instagram");
      return;
    }

    if (target === "Native share") {
      if (navigator.share) {
        navigator.share({ title: profile.name, text: shareText, url: profileLink }).catch(() => {});
      } else {
        copyProfileLink();
        setStatus("Profile link copied");
      }
      return;
    }

    if (targets[target]) window.open(targets[target], "_blank", "noopener,noreferrer");
  };

  const downloadQrCode = () => {
    if (!qrCode) return;
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `${seller.id}-grolo-profile-qr.png`;
    link.click();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="share-profile-title">
      <button type="button" aria-label="Close Share Profile" onClick={onClose} className="absolute inset-0 h-full w-full" />
      <div className="relative max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.5rem))] w-full max-w-[430px] overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="share-profile-title" className="text-[20px] font-semibold">Share Profile</h2>
            <p className="mt-1 text-[13px] text-[#828282]">Help people find {profile.name} on Grolo.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 py-1 text-[22px] leading-none text-[#828282]">×</button>
        </div>

        <div className="rounded-xl border border-[#E6E6E6] bg-[#F8FCF8] p-4 text-center">
          {qrCode ? <img src={qrCode} alt={`QR code for ${profile.name}'s Grolo profile`} className="mx-auto h-48 w-48 rounded-lg bg-white p-2" /> : <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-white text-[13px] text-[#828282]">Generating QR code...</div>}
          <p className="mt-3 text-[14px] font-medium">Scan to visit {profile.name}</p>
          <button type="button" onClick={downloadQrCode} disabled={!qrCode} className="mt-2 text-[13px] font-medium text-[#498467] disabled:opacity-50">Download QR code</button>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={copyProfileLink} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Copy Profile Link</button>
          <button type="button" onClick={() => openShareTarget("Native share")} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">Share</button>
        </div>

        <div className="mt-4 rounded-lg border border-[#E6E6E6] px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#828282]">Profile link</p>
          <p className="mt-1 break-all text-[13px] text-[#4F4F4F]">{profileLink}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {["Instagram", "Facebook", "X", "Messages", "Email"].map((target) => <button key={target} type="button" onClick={() => openShareTarget(target)} className="rounded-lg border border-[#E6E6E6] px-3 py-3 text-left text-[14px] font-medium hover:border-[#498467] hover:bg-[#F8FCF8]">Share via {target}</button>)}
        </div>
        {status && <p className="mt-3 text-center text-[13px] font-medium text-[#498467]" role="status">{status}</p>}
      </div>
    </div>,
    document.body,
  );
}
