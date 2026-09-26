"use client";
/* eslint-disable @next/next/no-img-element -- Blob previews and frame pixels must align exactly with canvas output. */

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import NextImage from "next/image";
import { EVENT_CONFIG } from "@/config/event";
import { attachCameraStream, CameraFacingMode, getCameraErrorMessage, startCamera, stopCamera } from "@/lib/camera";
import { composeEventPhoto, composeUploadedPhoto } from "@/lib/imageComposer";
import { prepareFrameImage } from "@/lib/frameComposer";
import { TARGET_CLOUD_PHOTO_BYTES, uploadPhotoToCloud } from "@/lib/cloudPhoto";
import { deleteStoredPhoto, listStoredPhotos, MAX_STORED_PHOTOS, StoredPhoto, storePhoto } from "@/lib/photoStore";
import { canSharePhoto, downloadPhoto, isIOSDevice, makePhotoFilename, sharePhoto } from "@/lib/share";

type Stage = "intro" | "requesting" | "camera" | "processing" | "developing" | "preview" | "gallery" | "error";
type Photo = { blob: Blob; url: string; storedId?: string };
type GalleryPhoto = StoredPhoto & { url: string };

function Icon({ name }: { name: "flip" | "upload" | "arrow" | "back" | "download" | "gallery" | "trash" | "camera" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "flip") return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18.2 6.2L20 7M4 17l1.8.8A7 7 0 0 0 18.5 15"/></svg>;
  if (name === "upload") return <svg {...common}><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>;
  if (name === "download") return <svg {...common}><path d="M12 4v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/></svg>;
  if (name === "gallery") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 17 4-4 3 3 2-2 5 4"/></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>;
  if (name === "camera") return <svg {...common}><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><circle cx="12" cy="13.5" r="3.5"/></svg>;
  if (name === "back") return <svg {...common}><path d="M19 12H5m0 0 5-5m-5 5 5 5"/></svg>;
  return <svg {...common}><path d="M5 12h14m0 0-5-5m5 5-5 5"/></svg>;
}

function WittyLogo() {
  return <img className="witty-logo" src="/frames/Witty_Logo%201.png" alt="Witty" width={190} height={52} />;
}

function BrandRow() {
  return <div className="intro-brand-row" aria-label="Witty and The Good Box Project">
    <div className="intro-brand-logo"><WittyLogo/></div>
    <span className="brand-collaboration" aria-hidden="true">&times;</span>
    <div className="intro-brand-logo"><img src="/frames/Image%20(4).png" alt="The Good Box Project"/></div>
  </div>;
}

export default function EventPhotoBooth() {
  const [stage, setStage] = useState<Stage>("intro");
  const [facing, setFacing] = useState<CameraFacingMode>(EVENT_CONFIG.cameraFacingMode);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [lensPosition, setLensPosition] = useState(EVENT_CONFIG.frames.length);
  const [lensAnimated, setLensAnimated] = useState(true);
  const [frameReady, setFrameReady] = useState(false);
  const [frameSources, setFrameSources] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [drawerDragY, setDrawerDragY] = useState(0);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [galleryNotice, setGalleryNotice] = useState("");
  const [saveHint, setSaveHint] = useState("");
  const [shareFallback, setShareFallback] = useState(false);
  const [needsPlaybackTap, setNeedsPlaybackTap] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState("Camera access is needed to take your event photo.");

  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);
  const frameImagesRef = useRef(new Map<string, HTMLImageElement>());
  const photoRef = useRef<Photo | null>(null);
  const galleryUrlsRef = useRef<string[]>([]);
  const requestIdRef = useRef(0);
  const swipeStartXRef = useRef<number | null>(null);
  const lensSwipeStartXRef = useRef<number | null>(null);
  const lensSwipeStartScrollRef = useRef(0);
  const lensSuppressClickRef = useRef(false);
  const lensRailRef = useRef<HTMLDivElement>(null);
  const lensButtonRefsRef = useRef(new Map<number, HTMLButtonElement>());
  const drawerStartYRef = useRef<number | null>(null);
  const drawerStartTimeRef = useRef(0);
  const drawerWasDraggedRef = useRef(false);
  const developTimerRef = useRef<number | null>(null);
  const drawerTimerRef = useRef<number | null>(null);
  const galleryLoadIdRef = useRef(0);
  const mountedRef = useRef(true);
  const captureLockRef = useRef(false);
  const persistPromiseRef = useRef<Promise<void> | null>(null);

  const activeFrame = EVENT_CONFIG.frames[activeFrameIndex];

  const clearPhoto = useCallback(() => {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
    photoRef.current = null;
    setPhoto(null);
    setSaveHint("");
    setShareFallback(false);
  }, []);

  const loadGallery = useCallback(async () => {
    const loadId = ++galleryLoadIdRef.current;
    const stored = await listStoredPhotos();
    const next = stored.map((item) => ({ ...item, url: URL.createObjectURL(item.blob) }));
    if (!mountedRef.current || loadId !== galleryLoadIdRef.current) {
      next.forEach((item) => URL.revokeObjectURL(item.url));
      return;
    }
    const previousUrls = galleryUrlsRef.current;
    galleryUrlsRef.current = next.map((item) => item.url);
    setGalleryPhotos(next);
    window.setTimeout(() => previousUrls.forEach((url) => URL.revokeObjectURL(url)), 0);
  }, []);

  useEffect(() => {
    const requestId = requestIdRef;
    const stream = streamRef;
    let cancelled = false;
    mountedRef.current = true;
    const loadFrames = async () => {
      try {
        const loaded = await Promise.all(EVENT_CONFIG.frames.map((frame) => new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => {
            void prepareFrameImage(image).then((prepared) => resolve([frame.id, prepared]), reject);
          };
          image.onerror = () => reject(new Error(`Could not load ${frame.id}`));
          image.src = frame.src;
        })));
        if (cancelled) return;
        frameImagesRef.current = new Map(loaded);
        frameRef.current = frameImagesRef.current.get(EVENT_CONFIG.frames[0].id) ?? null;
        setFrameSources(Object.fromEntries(loaded.map(([id, image]) => [id, image.src])));
        setFrameReady(true);
      } catch {
        if (!cancelled) {
          setError("The event frames could not load. Please refresh and try again.");
          setStage("error");
        }
      }
    };
    void loadFrames();
    void loadGallery().catch(() => setGalleryNotice("Saved photos are unavailable in this browser mode."));
    return () => {
      cancelled = true;
      mountedRef.current = false;
      requestId.current++;
      stopCamera(stream.current);
      clearPhoto();
      galleryUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (developTimerRef.current) window.clearTimeout(developTimerRef.current);
      if (drawerTimerRef.current) window.clearTimeout(drawerTimerRef.current);
    };
  }, [clearPhoto, loadGallery]);

  useEffect(() => {
    if (stage !== "camera" || !streamRef.current || !videoRef.current) return;
    attachCameraStream(videoRef.current, streamRef.current).catch((cause) => {
      if (cause instanceof Error && cause.name === "NotAllowedError") {
        setNeedsPlaybackTap(true);
        return;
      }
      setError(getCameraErrorMessage(cause));
      setStage("error");
      stopCamera(streamRef.current);
      streamRef.current = null;
    });
  }, [stage]);

  useEffect(() => {
    const rail = lensRailRef.current;
    const button = lensButtonRefsRef.current.get(lensPosition);
    if (!rail || !button) return;
    rail.scrollTo({
      left: button.offsetLeft + button.offsetWidth / 2 - rail.clientWidth / 2,
      behavior: lensAnimated && stage === "camera" ? "smooth" : "auto",
    });

    const count = EVENT_CONFIG.frames.length;
    if (lensPosition >= count && lensPosition < count * 2) return;
    const timer = window.setTimeout(() => {
      setLensAnimated(false);
      setLensPosition((current) => current < count ? current + count : current - count);
      window.requestAnimationFrame(() => setLensAnimated(true));
    }, lensAnimated ? 320 : 0);
    return () => window.clearTimeout(timer);
  }, [lensAnimated, lensPosition, stage]);

  const selectFrame = useCallback((index: number, carouselPosition?: number) => {
    const count = EVENT_CONFIG.frames.length;
    const nextIndex = ((index % count) + count) % count;
    const nextFrame = EVENT_CONFIG.frames[nextIndex];
    const image = frameImagesRef.current.get(nextFrame.id);
    if (!image) return;
    frameRef.current = image;
    setActiveFrameIndex(nextIndex);
    setLensAnimated(true);
    if (carouselPosition !== undefined) {
      setLensPosition(carouselPosition);
      return;
    }
    setLensPosition((current) => {
      const currentIndex = ((current % count) + count) % count;
      let distance = nextIndex - currentIndex;
      if (distance > count / 2) distance -= count;
      if (distance < -count / 2) distance += count;
      return current + distance;
    });
  }, []);

  const openCamera = useCallback(async (mode: CameraFacingMode = facing, showGallery = false) => {
    const requestId = ++requestIdRef.current;
    clearPhoto();
    captureLockRef.current = false;
    stopCamera(streamRef.current);
    streamRef.current = null;
    setNeedsPlaybackTap(false);
    setGalleryOpen(showGallery);
    setStage("requesting");
    try {
      const stream = await startCamera(mode);
      if (requestId !== requestIdRef.current) { stopCamera(stream); return; }
      streamRef.current = stream;
      setFacing(mode);
      setStage("camera");
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setError(getCameraErrorMessage(cause));
      setStage("error");
    }
  }, [clearPhoto, facing]);

  const persistPhoto = useCallback(async (blob: Blob, frameId: string, previewUrl: string) => {
    const [localResult, cloudResult] = await Promise.allSettled([
      storePhoto(blob, frameId),
      uploadPhotoToCloud(blob, frameId),
    ]);
    const notices: string[] = [];

    if (localResult.status === "fulfilled" && localResult.value) {
      const stored = localResult.value;
      setPhoto((current) => current?.url === previewUrl ? { ...current, storedId: stored.id } : current);
      photoRef.current = photoRef.current?.url === previewUrl ? { ...photoRef.current, storedId: stored.id } : photoRef.current;
    } else if (localResult.status === "fulfilled") {
      notices.push(`Your gallery is full. Delete a photo to save another one (${MAX_STORED_PHOTOS}/${MAX_STORED_PHOTOS}).`);
    } else {
      notices.push("This photo could not be kept in the local gallery. You can still save or share it.");
    }

    if (cloudResult.status === "rejected") {
      notices.push("Cloud storage could not be reached. Please keep this page open and try another photo.");
    }
    setGalleryNotice(notices.join(" "));
  }, []);

  const showDevelopingPhoto = useCallback((blob: Blob, previewUrl: string, frameId: string) => {
    stopCamera(streamRef.current);
    streamRef.current = null;
    if (photoRef.current && photoRef.current.url !== previewUrl) URL.revokeObjectURL(photoRef.current.url);
    const next = { blob, url: previewUrl };
    photoRef.current = next;
    setPhoto(next);
    setGalleryOpen(false);
    setStage("developing");
    persistPromiseRef.current = persistPhoto(blob, frameId, previewUrl);
    developTimerRef.current = window.setTimeout(() => {
      void (async () => {
        await persistPromiseRef.current;
        await loadGallery().catch(() => undefined);
        if (mountedRef.current) setStage("preview");
      })();
    }, 4200);
  }, [loadGallery, persistPhoto]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !frameRef.current || !video.videoWidth || needsPlaybackTap || stage !== "camera" || captureLockRef.current) return;
    captureLockRef.current = true;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    setStage("processing");
    try {
      const result = await composeEventPhoto({
        source: video,
        frameImage: frameRef.current,
        width: EVENT_CONFIG.outputWidth,
        height: EVENT_CONFIG.outputHeight,
        mirror: facing === "user" && EVENT_CONFIG.mirrorFrontCamera,
        type: "image/jpeg",
        quality: 0.92,
        maxBytes: TARGET_CLOUD_PHOTO_BYTES,
      });
      showDevelopingPhoto(result.blob, result.previewUrl, activeFrame.id);
    } catch {
      captureLockRef.current = false;
      setError("We couldn't prepare that photo. Please try again or upload one instead.");
      setStage("error");
      stopCamera(streamRef.current);
      streamRef.current = null;
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      setStage("error");
      return;
    }
    requestIdRef.current++;
    stopCamera(streamRef.current);
    streamRef.current = null;
    setStage("processing");
    try {
      if (!frameRef.current) throw new Error("Frame unavailable");
      const result = await composeUploadedPhoto({
        file,
        frameImage: frameRef.current,
        width: EVENT_CONFIG.outputWidth,
        height: EVENT_CONFIG.outputHeight,
        type: "image/jpeg",
        quality: 0.92,
        maxBytes: TARGET_CLOUD_PHOTO_BYTES,
      });
      clearPhoto();
      showDevelopingPhoto(result.blob, result.previewUrl, activeFrame.id);
    } catch {
      setError("We couldn't use that image. Please choose another photo.");
      setStage("error");
    }
  };

  const handleLensClick = (index: number, carouselPosition: number) => {
    if (lensSuppressClickRef.current) return;
    if (carouselPosition === lensPosition) void capture();
    else selectFrame(index, carouselPosition);
  };

  const handleLensSwipeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    lensSwipeStartXRef.current = event.clientX;
    lensSwipeStartScrollRef.current = event.currentTarget.scrollLeft;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLensSwipeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lensSwipeStartXRef.current === null) return;
    const distance = event.clientX - lensSwipeStartXRef.current;
    if (Math.abs(distance) > 4) lensSuppressClickRef.current = true;
    event.currentTarget.scrollLeft = lensSwipeStartScrollRef.current - distance;
  };

  const handleLensSwipeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startX = lensSwipeStartXRef.current;
    lensSwipeStartXRef.current = null;
    if (startX === null || stage !== "camera") return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const distance = event.clientX - startX;
    if (Math.abs(distance) < 5) return;
    const railCenter = event.currentTarget.scrollLeft + event.currentTarget.clientWidth / 2;
    let closestPosition = lensPosition;
    let closestDistance = Number.POSITIVE_INFINITY;
    lensButtonRefsRef.current.forEach((button, position) => {
      const buttonCenter = button.offsetLeft + button.offsetWidth / 2;
      const distanceFromCenter = Math.abs(buttonCenter - railCenter);
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestPosition = position;
      }
    });
    selectFrame(closestPosition, closestPosition);
    window.setTimeout(() => { lensSuppressClickRef.current = false; }, 350);
  };

  const handleSwipeStart = (event: ReactPointerEvent<HTMLDivElement>) => { swipeStartXRef.current = event.clientX; };
  const handleSwipeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (swipeStartXRef.current === null || stage !== "camera") return;
    const distance = event.clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (Math.abs(distance) >= 42) selectFrame(activeFrameIndex + (distance < 0 ? 1 : -1));
  };

  const handleDrawerStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    drawerStartYRef.current = event.clientY;
    drawerStartTimeRef.current = performance.now();
    drawerWasDraggedRef.current = false;
    setDrawerClosing(false);
  };
  const handleDrawerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawerStartYRef.current === null) return;
    const distance = Math.max(0, event.clientY - drawerStartYRef.current);
    if (distance > 6) {
      drawerWasDraggedRef.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDrawerDragY(distance);
  };
  const handleDrawerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawerStartYRef.current === null) return;
    const distance = event.clientY - drawerStartYRef.current;
    const elapsed = Math.max(1, performance.now() - drawerStartTimeRef.current);
    const velocity = distance / elapsed;
    drawerStartYRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (distance > 72 || velocity > 0.55) {
      setDrawerClosing(true);
      setDrawerDragY(Math.max(distance, window.innerHeight));
      drawerTimerRef.current = window.setTimeout(() => {
        setGalleryOpen(false);
        setDrawerClosing(false);
        setDrawerDragY(0);
      }, 280);
    } else setDrawerDragY(0);
    window.setTimeout(() => { drawerWasDraggedRef.current = false; }, 320);
  };

  const resumePlayback = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
      setNeedsPlaybackTap(false);
    } catch {
      setError("The camera opened, but the preview could not start. Try again or upload a photo instead.");
      setStage("error");
      stopCamera(streamRef.current);
      streamRef.current = null;
    }
  };

  const openGalleryPhoto = (item: GalleryPhoto) => {
    if (drawerWasDraggedRef.current) return;
    stopCamera(streamRef.current);
    streamRef.current = null;
    clearPhoto();
    const selected = { blob: item.blob, url: URL.createObjectURL(item.blob), storedId: item.id };
    photoRef.current = selected;
    setPhoto(selected);
    setGalleryOpen(false);
    setStage("preview");
  };

  const removeGalleryPhoto = async (id: string) => {
    if (drawerWasDraggedRef.current) return;
    try {
      await deleteStoredPhoto(id);
      setGalleryNotice("");
      await loadGallery();
    } catch {
      setGalleryNotice("That photo could not be deleted. Please try again.");
    }
  };

  const deleteCurrentPhoto = async () => {
    if (!photo?.storedId) return;
    try {
      await deleteStoredPhoto(photo.storedId);
      clearPhoto();
      await loadGallery();
      setStage("gallery");
    } catch {
      setGalleryNotice("That photo could not be deleted. Please try again.");
    }
  };

  const save = async () => {
    if (!photo) return;
    const filename = makePhotoFilename(EVENT_CONFIG.eventName);
    if (isIOSDevice()) {
      if (canSharePhoto(photo.blob, filename)) {
        setSaveHint("In the share sheet, choose Save Image or Save to Files.");
        const result = await sharePhoto({ blob: photo.blob, filename, title: "Save your photo" });
        if (result === "unsupported") setSaveHint("Touch and hold the photo above, then choose Save Image.");
      } else setSaveHint("Touch and hold the photo above, then choose Save Image.");
      return;
    }
    downloadPhoto(photo.blob, filename);
    setSaveHint("Photo download started. Check your Downloads folder.");
  };

  const share = async () => {
    if (!photo) return;
    if (!canSharePhoto(photo.blob)) { setShareFallback(true); return; }
    const result = await sharePhoto({ blob: photo.blob, filename: makePhotoFilename(EVENT_CONFIG.eventName), title: EVENT_CONFIG.eventName, text: EVENT_CONFIG.shareText });
    if (result === "unsupported") setShareFallback(true);
  };

  const retake = () => {
    clearPhoto();
    void openCamera(facing, false);
  };

  const galleryGrid = () => <>
    <div className="gallery-title-row">
      <div><span className="gallery-kicker">ON THIS DEVICE</span><h2>Your moments</h2></div>
      <span className="gallery-count">{galleryPhotos.length}/{MAX_STORED_PHOTOS}</span>
    </div>
    {galleryPhotos.length ? <div className={`gallery-grid ${galleryPhotos.length <= 6 ? "gallery-grid--draggable" : ""}`}>{galleryPhotos.map((item) => <article className="gallery-tile" key={item.id}>
      <button className="gallery-photo-button" onClick={() => openGalleryPhoto(item)} aria-label="Open saved photo"><img src={item.url} alt="Saved event photo" /></button>
      <button className="gallery-delete" onClick={() => void removeGalleryPhoto(item.id)} aria-label="Delete saved photo"><Icon name="trash" /></button>
    </article>)}</div> : <div className="gallery-empty"><Icon name="gallery" /><strong>No photos yet</strong><span>Your captured photos will appear here.</span></div>}
    {galleryNotice && <p className="gallery-notice" role="status">{galleryNotice}</p>}
  </>;

  return <main className="shell"><div className={`booth booth--${stage}`}>
    <div className="ambient ambient--one" aria-hidden="true"/><div className="ambient ambient--two" aria-hidden="true"/>
    <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={upload} aria-label="Upload photo" />

    {stage === "intro" && <section className="intro welcome-screen screen-enter" aria-labelledby="intro-title">
      <BrandRow/>
      <h1 id="intro-title" className="sr-only">Give. Share. Inspire.</h1>
      <div className="welcome-copy">
        <p className="kicker">JOY OF GIVING WEEK</p>
        <p>Capture your Joy of Giving moment and turn it into something worth sharing.</p>
      </div>
      <div className="welcome-photo">
        <NextImage src="/images/joy-giving-welcome-v2.webp" alt="Give. Share. Inspire. A smiling child holding colorful books in a school library" fill priority sizes="(max-width: 599px) calc(100vw - 52px), 430px"/>
        <span className="welcome-heart welcome-heart--one" aria-hidden="true">&hearts;</span>
        <span className="welcome-heart welcome-heart--two" aria-hidden="true">&hearts;</span>
      </div>
      <div className="intro-actions">
        <div className="welcome-tag-prompt">
          <div className="welcome-tag-title"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg></span><p>Don&apos;t forget to tag us on Instagram</p></div>
          <nav className="welcome-handles" aria-label="Instagram accounts to tag">{EVENT_CONFIG.instagramHandles.map((account) => <a key={account.handle} href={account.url} target="_blank" rel="noreferrer">{account.handle}</a>)}</nav>
        </div>
        <button className="button button--primary" onClick={() => void openCamera(facing, false)} disabled={!frameReady}><Icon name="camera"/> Take Photo</button>
        <button className="button button--secondary" onClick={() => inputRef.current?.click()} disabled={!frameReady}><Icon name="upload"/> Choose from Gallery</button>
        {galleryPhotos.length > 0 && <button className="text-action welcome-gallery-link" onClick={() => setStage("gallery")}><Icon name="gallery"/> View saved photos ({galleryPhotos.length})</button>}
      </div>
      <p className="privacy welcome-privacy">Your photo is securely stored for the Joy of Giving campaign.<span className="privacy-separator" aria-hidden="true">&middot;</span><Link className="terms-link" href="/terms">Terms &amp; Conditions</Link></p>
    </section>}

    {(stage === "requesting" || stage === "camera" || stage === "processing") && <section className="camera-screen screen-enter" aria-label="Camera">
      <div className="camera-main">
        <div className="viewfinder" onPointerDown={handleSwipeStart} onPointerUp={handleSwipeEnd} onPointerCancel={() => { swipeStartXRef.current = null; }} style={{ aspectRatio: `${EVENT_CONFIG.outputWidth} / ${EVENT_CONFIG.outputHeight}` }}>
          <video ref={videoRef} autoPlay playsInline muted className={`camera-video ${facing === "user" && EVENT_CONFIG.mirrorFrontCamera ? "camera-video--mirror" : ""}`} aria-label="Live camera preview" />
          <img key={activeFrame.id} className="frame-overlay frame-overlay--enter" src={frameSources[activeFrame.id] ?? activeFrame.src} alt="" draggable={false}/>
          {stage === "requesting" && <div className="view-status"><span className="spinner"/>Opening camera...</div>}
          {stage === "processing" && <div className="view-status"><span className="spinner"/>Preparing your photo…</div>}
          {stage === "camera" && needsPlaybackTap && <div className="view-status"><button className="button button--primary playback-button" onClick={() => void resumePlayback()}>Tap to start camera</button></div>}
        </div>
        <div ref={lensRailRef} className="lens-rail" role="group" aria-label="Swipe or tap to choose a frame" onPointerDown={handleLensSwipeStart} onPointerMove={handleLensSwipeMove} onPointerUp={handleLensSwipeEnd} onPointerCancel={() => { lensSwipeStartXRef.current = null; lensSuppressClickRef.current = false; }}><div className="lens-selector-ring" aria-hidden="true"/><div className="lens-track">{Array.from({ length: EVENT_CONFIG.frames.length * 3 }, (_, position) => {
          const index = position % EVENT_CONFIG.frames.length;
          const frame = EVENT_CONFIG.frames[index];
          const selected = position === lensPosition;
          const nearby = Math.abs(position - lensPosition) <= 5;
          return <button ref={(element) => { if (element) lensButtonRefsRef.current.set(position, element); else lensButtonRefsRef.current.delete(position); }} data-lens-position={position} key={`${position}-${frame.id}`} className={`lens-button ${selected ? "lens-button--active" : ""}`} onClick={() => handleLensClick(index, position)} disabled={stage !== "camera" || needsPlaybackTap} tabIndex={nearby ? 0 : -1} title={selected ? `Take photo: ${frame.alt}` : frame.alt} aria-label={selected ? `Take photo: ${frame.alt}` : `Select frame: ${frame.alt}`} aria-current={selected ? "true" : undefined}><img src={frame.thumbnailSrc} alt="" draggable={false}/></button>;
        })}</div></div>
        <div className="camera-utility-row"><button className="utility-button" onClick={() => setGalleryOpen(true)} aria-label={`Open photo gallery, ${galleryPhotos.length} photos`}><span className="gallery-button-visual">{galleryPhotos[0] ? <img src={galleryPhotos[0].url} alt=""/> : <Icon name="gallery"/>}{galleryPhotos.length > 0 && <b>{galleryPhotos.length}</b>}</span><small>Gallery</small></button><button className="utility-button" onClick={() => inputRef.current?.click()} disabled={stage !== "camera" || !frameReady} aria-label="Upload from gallery"><Icon name="upload"/><small>Upload</small></button><button className="utility-button" onClick={() => void openCamera(facing === "user" ? "environment" : "user", false)} disabled={stage !== "camera"} aria-label="Switch camera"><Icon name="flip"/><small>Flip</small></button></div>
        {galleryOpen && <div className={`gallery-drawer ${drawerClosing ? "gallery-drawer--closing" : ""}`} style={drawerDragY ? { transform: `translate3d(0, ${drawerDragY}px, 0)` } : undefined} onPointerDown={handleDrawerStart} onPointerMove={handleDrawerMove} onPointerUp={handleDrawerEnd} onPointerCancel={() => { drawerStartYRef.current = null; setDrawerDragY(0); }}>{galleryGrid()}</div>}
      </div>
    </section>}

    {galleryOpen && (stage === "camera" || stage === "processing") && <button className="drawer-cue" onClick={() => setGalleryOpen(false)} aria-label="Swipe down or tap to open the camera"><span className="drawer-cue-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m7 5 5 5 5-5"/><path d="m7 11 5 5 5-5"/></svg></span><span className="drawer-cue-copy"><strong>Swipe down for camera</strong><small>or tap here</small></span></button>}

    {stage === "developing" && photo && <section className="developing-screen" aria-label="Developing photo"><div className="developing-gallery-backdrop">{galleryGrid()}</div><div className="developing-machine"><div className="developing-slot"/><div className="developing-output"><div className="developing-print"><img src={photo.url} alt="Your newly captured event photo"/></div></div><div className="developing-slot-lip"/></div><p>Developing your moment…</p></section>}

    {stage === "preview" && photo && <section className="preview-screen screen-enter" aria-label="Photo preview"><header className="preview-header"><button className="preview-round-button preview-back" onClick={() => setStage("gallery")} aria-label="Back to gallery"><Icon name="back"/></button><WittyLogo/>{photo.storedId && <button className="preview-round-button preview-delete" onClick={() => void deleteCurrentPhoto()} aria-label="Delete this photo"><Icon name="trash"/></button>}</header><div className="preview-main"><img className="result-photo" src={photo.url} alt={`Your photo with the ${EVENT_CONFIG.eventName} event frame`} style={{ aspectRatio: `${EVENT_CONFIG.outputWidth} / ${EVENT_CONFIG.outputHeight}` }}/></div><div className="preview-actions"><p className="preview-caption">Your moment is ready <span>❤️</span></p><div className="preview-primary-actions"><button className="button button--primary" onClick={() => void share()} aria-label="Share photo">Share Photo <Icon name="arrow"/></button><button className="button button--secondary" onClick={() => void save()} aria-label="Save photo"><Icon name="download"/> Save Photo</button></div><button className="button button--ghost" onClick={() => setStage("gallery")}><Icon name="gallery"/> View Photos ({galleryPhotos.length})</button>{saveHint && <p className="save-note" role="status">{saveHint}</p>}{shareFallback && <p className="fallback-note" role="status">Save the photo, then share it on Instagram, WhatsApp or Facebook.</p>}{galleryNotice && <p className="gallery-notice" role="status">{galleryNotice}</p>}<button className="text-action retake" onClick={retake} aria-label="Retake photo">Take another photo</button></div></section>}

    {stage === "gallery" && <section className="gallery-screen screen-enter" aria-label="Saved photo gallery"><header className="gallery-page-header"><WittyLogo/><button className="round-camera-button" onClick={() => void openCamera(facing, false)} aria-label="Open camera"><Icon name="camera"/></button></header><div className="gallery-page-body">{galleryGrid()}</div><button className="button button--primary gallery-camera-cta" onClick={() => void openCamera(facing, false)}><Icon name="camera"/> Open Camera</button></section>}

    {stage === "error" && <section className="error-screen permission-screen screen-enter" aria-labelledby="error-title"><BrandRow/><div className="permission-content"><div className="permission-art permission-art--error" aria-hidden="true"><span className="permission-camera"><Icon name="camera"/></span></div><p className="kicker">LET&apos;S TRY ANOTHER WAY</p><h1 id="error-title">Your moment<br/><em>is still waiting.</em></h1><p className="error-message" role="alert">{error}</p></div><div className="error-actions"><button className="button button--primary" onClick={() => void openCamera()}>Try Again <Icon name="arrow"/></button>{galleryPhotos.length > 0 && <button className="button button--ghost" onClick={() => setStage("gallery")}><Icon name="gallery"/> View Saved Photos</button>}<button className="button button--secondary" onClick={() => inputRef.current?.click()} disabled={!frameReady}><Icon name="upload"/> Upload Photo Instead</button><p className="privacy">Photos are processed and saved on this device.</p></div></section>}
    {flash && <div className="flash" aria-hidden="true"/>}
  </div></main>;
}
