"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated Cloudinary URLs are signed at request time. */

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./AdminPhotos.module.css";

interface CloudPhoto {
  publicId: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  version: number;
  format: string;
  createdAt: string;
  frameId: string | null;
}

interface PhotoPage {
  photos: CloudPhoto[];
  nextCursor: string | null;
  error?: string;
}

const pageSizes = [12, 24, 48, 100];
const photoDateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatFrame(frameId: string | null) {
  if (!frameId) return "Joy of Giving";
  return frameId.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatDate(value: string) {
  return photoDateFormatter.format(new Date(value));
}

export default function AdminPhotos() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [photos, setPhotos] = useState<CloudPhoto[]>([]);
  const [pageSize, setPageSize] = useState(24);
  const [page, setPage] = useState(1);
  const [cursorHistory, setCursorHistory] = useState<string[]>([""]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadPhotos = useCallback(async (cursor: string, targetPage: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ maxResults: String(limit) });
    if (cursor) query.set("nextCursor", cursor);

    try {
      const response = await fetch(`/api/photos?${query}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await response.json().catch(() => null) as PhotoPage | null;
      if (requestId !== requestIdRef.current) return false;
      if (!response.ok || !result) {
        if (response.status === 401) {
          setAuthenticated(false);
          setPhotos([]);
          throw new Error("Your admin session has expired. Sign in again.");
        }
        throw new Error(result?.error || "Photos could not be loaded.");
      }
      setPhotos(result.photos);
      setNextCursor(result.nextCursor);
      setPage(targetPage);
      return true;
    } catch (cause) {
      if (requestId === requestIdRef.current) {
        setError(cause instanceof Error ? cause.message : "Photos could not be loaded.");
      }
      return false;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = requestIdRef;
    const restoreSession = async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin" });
        if (cancelled) return;
        if (response.ok) {
          setAuthenticated(true);
          await loadPhotos("", 1, 24);
        } else if (response.status !== 401) {
          const result = await response.json().catch(() => null) as { error?: string } | null;
          setError(result?.error || "Admin access could not be checked.");
        }
      } catch {
        if (!cancelled) setError("Admin access could not be checked.");
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };
    void restoreSession();
    return () => {
      cancelled = true;
      requestId.current++;
    };
  }, [loadPhotos]);

  const logIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedToken = password.trim();
    if (!submittedToken) {
      setError("Enter the admin token.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token: submittedToken }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Admin login failed.");
      setAuthenticated(true);
      setPassword("");
      setCursorHistory([""]);
      await loadPhotos("", 1, pageSize);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  const goNext = async () => {
    if (!nextCursor || loading) return;
    const cursor = nextCursor;
    const success = await loadPhotos(cursor, page + 1, pageSize);
    if (success) setCursorHistory((current) => [...current.slice(0, page), cursor]);
  };

  const goPrevious = async () => {
    if (page <= 1 || loading) return;
    await loadPhotos(cursorHistory[page - 2] || "", page - 1, pageSize);
  };

  const changePageSize = async (value: number) => {
    setPageSize(value);
    const success = await loadPhotos("", 1, value);
    if (success) setCursorHistory([""]);
  };

  const downloadPhoto = async (photo: CloudPhoto) => {
    if (downloading) return;
    setDownloading(photo.publicId);
    setError("");
    try {
      const response = await fetch("/api/photos/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ publicId: photo.publicId, version: photo.version, format: photo.format }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Photo download failed.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const baseName = photo.publicId.slice(photo.publicId.lastIndexOf("/") + 1);
      link.href = objectUrl;
      link.download = `${baseName}.${photo.format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Photo download failed.");
    } finally {
      setDownloading(null);
    }
  };

  const signOut = () => {
    requestIdRef.current++;
    void fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
    setAuthenticated(false);
    setPassword("");
    setPhotos([]);
    setPage(1);
    setCursorHistory([""]);
    setNextCursor(null);
    setLoading(false);
    setError("");
  };

  if (checkingSession) {
    return <main className={styles.loginPage}><section className={styles.loginPanel} aria-live="polite"><div className={styles.brand}><img src="/frames/Witty_Logo%201.png" alt="Witty"/><span>Joy of Giving</span></div><p className={styles.sessionCheck}>Checking admin access...</p></section></main>;
  }

  if (!authenticated) {
    return <main className={styles.loginPage}>
      <section className={styles.loginPanel} aria-labelledby="admin-login-title">
        <div className={styles.brand}><img src="/frames/Witty_Logo%201.png" alt="Witty"/><span>Joy of Giving</span></div>
        <p className={styles.eyebrow}>CAMPAIGN ADMIN</p>
        <h1 id="admin-login-title">Photo library</h1>
        <form onSubmit={logIn} className={styles.loginForm}>
          <label htmlFor="admin-token">Admin token</label>
          <input id="admin-token" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus/>
          {error && <p className={styles.formError} role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? "Checking..." : "Access photos"}</button>
        </form>
      </section>
    </main>;
  }

  return <main className={styles.adminPage}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div><p className={styles.eyebrow}>JOY OF GIVING</p><h1>Campaign photos</h1></div>
        <button className={styles.signOut} onClick={signOut}>Sign out</button>
      </div>
    </header>

    <section className={styles.workspace} aria-busy={loading}>
      <div className={styles.toolbar}>
        <div><strong>Page {page}</strong><span>{loading ? "Loading..." : `${photos.length} photos`}</span></div>
        <label>Photos per page
          <select value={pageSize} onChange={(event) => void changePageSize(Number(event.target.value))} disabled={loading}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      {error && <div className={styles.banner} role="alert">{error}</div>}
      {!loading && photos.length === 0 ? <div className={styles.empty}><strong>No photos found</strong><span>New campaign photos will appear here.</span></div> : <div className={`${styles.grid} ${loading ? styles.gridLoading : ""}`}>
        {photos.map((photo) => <article className={styles.photoCard} key={photo.publicId}>
          <a className={styles.imageLink} href={photo.url} target="_blank" rel="noreferrer" aria-label="Open full-size photo">
            <img src={photo.url} alt={`${formatFrame(photo.frameId)} campaign photo`} loading="lazy" decoding="async"/>
          </a>
          <div className={styles.photoInfo}>
            <strong>{formatFrame(photo.frameId)}</strong>
            <span>{formatDate(photo.createdAt)} · {Math.ceil(photo.bytes / 1000)} KB</span>
          </div>
          <div className={styles.photoActions}>
            <a href={photo.url} target="_blank" rel="noreferrer">View</a>
            <button onClick={() => void downloadPhoto(photo)} disabled={downloading !== null}>{downloading === photo.publicId ? "Downloading..." : "Download"}</button>
          </div>
        </article>)}
      </div>}

      <nav className={styles.pagination} aria-label="Photo pages">
        <button onClick={() => void goPrevious()} disabled={page <= 1 || loading}>Previous</button>
        <span>Page {page}</span>
        <button onClick={() => void goNext()} disabled={!nextCursor || loading}>Next</button>
      </nav>
    </section>
  </main>;
}
