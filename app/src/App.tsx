import { useState, useCallback } from "react";
import { MainSection } from "@/components/MainSection";
import { ParentsSection } from "@/components/ParentsSection";
import { VideoSection } from "@/components/VideoSection";
import { LoveLetterSection } from "@/components/LoveLetterSection";
import { GallerySection } from "@/components/GallerySection";
import { CalendarSection } from "@/components/CalendarSection";
import { MapSection } from "@/components/MapSection";
import { AccountSection } from "@/components/AccountSection";
import { ShareSection } from "@/components/ShareSection";
import { Lightbox } from "@/components/Lightbox";
import { Toast } from "@/components/Toast";
import { weddingData } from "@/data/weddingData";

function App() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const copyToClipboard = useCallback(
    (text: string, successMsg: string) => {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(text)
          .then(() => showToast(successMsg))
          .catch(() => showToast(successMsg));
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
          document.execCommand("copy");
        } catch (e) {
          // ignore
        }
        document.body.removeChild(ta);
        showToast(successMsg);
      }
    },
    [showToast]
  );

  const handleCopyAddress = useCallback(() => {
    copyToClipboard(weddingData.map.address, "주소가 복사되었습니다 ✓");
  }, [copyToClipboard]);

  const handleCopyAccount = useCallback(
    (text: string) => {
      copyToClipboard(text, "복사되었습니다 ✓");
    },
    [copyToClipboard]
  );

  const handleCopyUrl = useCallback(() => {
    copyToClipboard(weddingData.shareUrl, "URL이 복사되었습니다 ✓");
  }, [copyToClipboard, weddingData.shareUrl]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const prevImage = useCallback(() => {
    setLightboxIndex(
      (prev) =>
        (prev - 1 + weddingData.images.gallery.length) %
        weddingData.images.gallery.length
    );
  }, []);

  const nextImage = useCallback(() => {
    setLightboxIndex(
      (prev) => (prev + 1) % weddingData.images.gallery.length
    );
  }, []);

  return (
    <div className="w-full max-w-400 mx-auto overflow-x-hidden bg-black text-white font-['Pretendard','Apple_SD_Gothic_Neo','Malgun_Gothic',sans-serif] text-15 leading-relaxed">
      <MainSection />
      <ParentsSection />
      <VideoSection />
      <LoveLetterSection />
      <GallerySection onImageClick={openLightbox} />
      <CalendarSection />
      <MapSection onCopyAddress={handleCopyAddress} />
      <AccountSection onCopyAccount={handleCopyAccount} />
      <ShareSection onCopyUrl={handleCopyUrl} />

      <Lightbox
        isOpen={lightboxOpen}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onPrev={prevImage}
        onNext={nextImage}
      />

      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onHide={hideToast}
      />
    </div>
  );
}

export default App;
