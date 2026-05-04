/**
 * hooks/useUpload.js — Chunked video upload with progress tracking
 */
import { useState, useCallback, useRef } from "react";
import { uploadAPI } from "../utils/api";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export function useUpload() {
  const [progress,    setProgress]    = useState(0);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState(null);
  const [sessionId,   setSessionId]   = useState(null);
  const abortRef = useRef(null);

  const uploadVideo = useCallback(async (file, onDone) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    const sid      = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const total    = Math.ceil(file.size / CHUNK_SIZE);
    setSessionId(sid);

    try {
      for (let i = 0; i < total; i++) {
        const start  = i * CHUNK_SIZE;
        const chunk  = file.slice(start, start + CHUNK_SIZE);
        const form   = new FormData();
        form.append("chunk",      chunk);
        form.append("sessionId",  sid);
        form.append("chunkIndex", String(i));
        form.append("totalChunks", String(total));
        form.append("fileName",   file.name);
        form.append("fileSize",   String(file.size));
        form.append("isLast",     String(i === total - 1));

        const result = await uploadAPI.chunk(form, (e) => {
          const chunkPct    = (e.loaded / e.total) * 100;
          const overallPct  = ((i + chunkPct / 100) / total) * 100;
          setProgress(Math.round(overallPct));
        });

        if (i === total - 1 && result.data?.jobId) {
          setUploading(false);
          setProgress(100);
          onDone?.(result.data.jobId);
          return result.data.jobId;
        }
      }
    } catch (err) {
      setError(err?.error || err?.message || "Upload failed");
      setUploading(false);
    }
  }, []);

  const uploadFaceRef = useCallback(async (file) => {
    const form = new FormData();
    form.append("face", file);
    const r = await uploadAPI.faceRef(form);
    return r.data;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setUploading(false);
  }, []);

  return { progress, uploading, error, sessionId, uploadVideo, uploadFaceRef, cancel };
}
