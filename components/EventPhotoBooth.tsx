"use client";
/* eslint-disable @next/next/no-img-element -- Native img keeps the frame and local blob pixel-aligned with the canvas. */

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { EVENT_CONFIG } from "@/config/event";
import { attachCameraStream, CameraFacingMode, getCameraErrorMessage, startCamera, stopCamera } from "@/lib/camera";
import { composeEventPhoto, composeUploadedPhoto } from "@/lib/imageComposer";
import { canSharePhoto, downloadPhoto, makePhotoFilename, sharePhoto } from "@/lib/share";

type Stage = "intro" | "requesting" | "camera" | "processing" | "preview" | "error";
type Photo = { blob: Blob; url: string };

function Icon({ name }: { name: "flip" | "upload" | "arrow" | "download" | "spark" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "flip") return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18.2 6.2L20 7M4 17l1.8.8A7 7 0 0 0 18.5 15"/></svg>;
  if (name === "upload") return <svg {...common}><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>;
  if (name === "download") return <svg {...common}><path d="M12 4v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/></svg>;
  if (name === "arrow") return <svg {...common}><path d="M5 12h14m0 0-5-5m5 5-5 5"/></svg>;
  return <svg {...common}><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></svg>;
}

export default function EventPhotoBooth() {
  const [stage, setStage] = useState<Stage>("intro");
  const [facing, setFacing] = useState<CameraFacingMode>(EVENT_CONFIG.cameraFacingMode);
  const [error, setError] = useState("Camera access is needed to take your event photo.");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [shareFallback, setShareFallback] = useState(false);
  const [flash, setFlash] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [needsPlaybackTap, setNeedsPlaybackTap] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoRef = useRef<Photo | null>(null);
  const requestIdRef = useRef(0);
  const activeFrame = EVENT_CONFIG.frames[0];

  const clearPhoto = useCallback(() => {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
    photoRef.current = null;
    setPhoto(null);
    setShareFallback(false);
  }, []);

  useEffect(() => {
    const requestId = requestIdRef;
    const stream = streamRef;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => { frameRef.current = image; setFrameReady(true); };
    image.onerror = () => { setError("The event frame could not load. Please refresh and try again."); setStage("error"); };
    image.src = activeFrame.src;
    return () => { requestId.current++; stopCamera(stream.current); clearPhoto(); };
  }, [activeFrame.src, clearPhoto]);

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

  const openCamera = useCallback(async (mode: CameraFacingMode = facing) => {
    const requestId = ++requestIdRef.current;
    stopCamera(streamRef.current);
    streamRef.current = null;
    setNeedsPlaybackTap(false);
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
  }, [facing]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !frameRef.current || !video.videoWidth || needsPlaybackTap || stage !== "camera") return;
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
        quality: 0.94,
      });
      stopCamera(streamRef.current);
      streamRef.current = null;
      const next = { blob: result.blob, url: result.previewUrl };
      photoRef.current = next;
      setPhoto(next);
      setStage("preview");
    } catch {
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
      setError("Please choose an image file."); setStage("error"); return;
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
        quality: 0.94,
      });
      clearPhoto();
      const next = { blob: result.blob, url: result.previewUrl };
      photoRef.current = next;
      setPhoto(next);
      setStage("preview");
    } catch {
      setError("We couldn't use that image. Please choose another photo.");
      setStage("error");
    }
  };

  const retake = () => { clearPhoto(); void openCamera(); };
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
  const save = () => { if (photo) downloadPhoto(photo.blob, makePhotoFilename(EVENT_CONFIG.eventName)); };
  const share = async () => {
    if (!photo) return;
    if (!canSharePhoto(photo.blob)) { setShareFallback(true); return; }
    try {
      const result = await sharePhoto({ blob: photo.blob, filename: makePhotoFilename(EVENT_CONFIG.eventName), title: EVENT_CONFIG.eventName, text: EVENT_CONFIG.shareText });
      if (result === "unsupported") setShareFallback(true);
    } catch { setShareFallback(true); }
  };

  return <main className="shell">
    <div className={`booth booth--${stage}`}>
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={upload} aria-label="Upload photo" />

      {stage === "intro" && <section className="intro screen-enter" aria-labelledby="intro-title">
        <div className="eyebrow"><span className="eyebrow-dot" /> {EVENT_CONFIG.eventName.toUpperCase()} <span className="eyebrow-dot" /></div>
        <div className="intro-art" aria-hidden="true"><div className="intro-art-inner"><Icon name="spark" /><span>YOUR MOMENT<br/>MATTERS</span></div></div>
        <div className="intro-copy"><p className="kicker">THE EVENT PHOTO BOOTH</p><h1 id="intro-title">Share<br/><em>the Joy.</em></h1><p className="subtitle">{EVENT_CONFIG.subtitle}</p></div>
        <div className="intro-actions"><button className="button button--primary" onClick={() => void openCamera()} disabled={!frameReady}>Open Camera <Icon name="arrow" /></button><button className="text-action" onClick={() => inputRef.current?.click()} disabled={!frameReady}><Icon name="upload" /> Upload a photo instead</button><p className="privacy">Your photo stays on your device unless you choose to share it.</p></div>
      </section>}

      {(stage === "requesting" || stage === "camera" || stage === "processing") && <section className="camera-screen screen-enter" aria-label="Camera">
        <header className="camera-header"><span className="brand-mark">j<span>g</span></span><div><span className="camera-overline">{EVENT_CONFIG.eventName.toUpperCase()}</span><strong>{EVENT_CONFIG.headline}</strong></div><span className="header-spark" aria-hidden="true">✳</span></header>
        <div className="camera-main"><div className="viewfinder" style={{ aspectRatio: `${EVENT_CONFIG.outputWidth} / ${EVENT_CONFIG.outputHeight}` }}>
          <video ref={videoRef} autoPlay playsInline muted className={`camera-video ${facing === "user" && EVENT_CONFIG.mirrorFrontCamera ? "camera-video--mirror" : ""}`} aria-label="Live camera preview" />
          {/* The exact PNG pixels must align with the canvas export. */}
          <img className="frame-overlay" src={activeFrame.src} alt="" draggable={false} />
          {stage === "requesting" && <div className="view-status"><span className="spinner" />Opening camera…</div>}
          {stage === "processing" && <div className="view-status"><span className="spinner" />Preparing your photo…</div>}
          {stage === "camera" && needsPlaybackTap && <div className="view-status"><button className="button button--primary playback-button" onClick={() => void resumePlayback()}>Tap to start camera</button></div>}
        </div></div>
        <div className="camera-controls"><button className="icon-button" aria-label="Upload photo" onClick={() => inputRef.current?.click()} disabled={stage === "processing"}><Icon name="upload" /><span>Upload</span></button><button className="shutter" aria-label="Take photo" onClick={() => void capture()} disabled={stage !== "camera" || needsPlaybackTap}><span /></button><button className="icon-button" aria-label="Switch camera" onClick={() => void openCamera(facing === "user" ? "environment" : "user")} disabled={stage !== "camera"}><Icon name="flip" /><span>Flip</span></button></div>
        <p className="camera-hint">Place yourself inside the frame</p>
      </section>}

      {stage === "preview" && photo && <section className="preview-screen screen-enter" aria-label="Photo preview"><header className="preview-header"><span className="brand-mark">j<span>g</span></span><div><span className="camera-overline">YOUR MOMENT IS READY</span><strong>Looking good!</strong></div><span className="header-spark" aria-hidden="true">✳</span></header><div className="preview-main"><img className="result-photo" src={photo.url} alt={`Your photo with the ${EVENT_CONFIG.eventName} event frame`} style={{ aspectRatio: `${EVENT_CONFIG.outputWidth} / ${EVENT_CONFIG.outputHeight}` }} /></div><div className="preview-actions"><p className="preview-caption">Share your moment <span>❤️</span></p><button className="button button--primary" aria-label="Share photo" onClick={() => void share()}>Share Photo <Icon name="arrow" /></button><button className="button button--secondary" aria-label="Download photo" onClick={save}><Icon name="download" /> Save Photo</button>{shareFallback && <p className="fallback-note" role="status">Save the photo, then share it on Instagram, WhatsApp or Facebook.</p>}<button className="text-action retake" aria-label="Retake photo" onClick={retake}>Retake</button></div></section>}

      {stage === "error" && <section className="error-screen screen-enter" aria-labelledby="error-title"><span className="brand-mark brand-mark--large">j<span>g</span></span><div className="error-icon" aria-hidden="true">✳</div><p className="kicker">LET’S TRY ANOTHER WAY</p><h1 id="error-title">Your moment<br/><em>is still waiting.</em></h1><p className="error-message" role="alert">{error}</p><div className="error-actions"><button className="button button--primary" onClick={() => void openCamera()}>Try Again <Icon name="arrow" /></button><button className="button button--secondary" onClick={() => inputRef.current?.click()} disabled={!frameReady}><Icon name="upload" /> Upload Photo Instead</button></div><p className="privacy">Photos are processed on your device.</p></section>}
      {flash && <div className="flash" aria-hidden="true" />}
    </div>
  </main>;
}
