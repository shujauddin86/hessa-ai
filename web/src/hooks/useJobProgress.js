/**
 * hooks/useJobProgress.js — SSE-based real-time job progress
 */
import { useEffect, useRef, useState, useCallback } from "react";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useJobProgress(jobId) {
  const [progress, setProgress]   = useState(0);
  const [stage,    setStage]      = useState(null);
  const [status,   setStatus]     = useState(null);
  const [job,      setJob]        = useState(null);
  const [error,    setError]      = useState(null);
  const esRef = useRef(null);

  const connect = useCallback(() => {
    if (!jobId) return;
    const token = Cookies.get("hessa_token");
    const url   = `${API_URL}/api/jobs/${jobId}/stream-progress?token=${encodeURIComponent(token || "")}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress(data.progress || 0);
        setStage(data.stage || null);
        setStatus(data.status || null);
        setJob(data);

        // Auto-disconnect on terminal states
        if (["done", "failed", "preview_ready", "face_required", "analysis_only"].includes(data.status)) {
          es.close();
        }
      } catch (_) {}
    };

    es.onerror = () => {
      setError("Connection lost — retrying...");
      es.close();
      // Retry after 3s
      setTimeout(() => connect(), 3000);
    };
  }, [jobId]);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);

  const disconnect = useCallback(() => esRef.current?.close(), []);

  return { progress, stage, status, job, error, disconnect };
}
