import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import UploadZone from "../components/UploadZone";
import ProgressBar from "../components/ProgressBar";
import ClipSelector from "../components/ClipSelector";
import { useAuth } from "../context/AuthContext";
import { useUpload } from "../hooks/useUpload";
import { useJobProgress } from "../hooks/useJobProgress";
import { uploadAPI, jobsAPI, subAPI } from "../utils/api";

const STEPS = { IDLE: "idle", FACE: "face", UPLOADING: "uploading", PROCESSING: "processing", PREVIEW: "preview", DONE: "done" };

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router  = useRouter();
  const [step,        setStep]        = useState(STEPS.IDLE);
  const [videoFile,   setVideoFile]   = useState(null);
  const [faceFile,    setFaceFile]    = useState(null);
  const [jobId,       setJobId]       = useState(null);
  const [jobData,     setJobData]     = useState(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [sub,         setSub]         = useState(null);

  const { progress, uploading, error: uploadError, uploadVideo, uploadFaceRef } = useUpload();
  const { progress: aiProgress, stage, status, job, error: sseError } = useJobProgress(
    step === STEPS.PROCESSING ? jobId : null
  );

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  // Load subscription
  useEffect(() => {
    if (user) subAPI.get().then((r) => setSub(r.data.subscription)).catch(() => {});
  }, [user]);

  // Handle SSE status changes
  useEffect(() => {
    if (!status) return;
    if (status === "preview_ready") {
      setJobData(job);
      setStep(STEPS.PREVIEW);
    }
    if (status === "done") {
      setJobData(job);
      setStep(STEPS.DONE);
    }
    if (status === "failed") {
      toast.error(job?.error || "Processing failed");
      setStep(STEPS.IDLE);
    }
    if (status === "face_required") {
      toast.error(job?.error || "Face not detected. Please upload a clearer photo.");
      setStep(STEPS.FACE);
    }
    if (status === "analysis_only") {
      setJobData(job);
      setStep(STEPS.DONE);
      toast.success("Privacy analysis complete (PRIVACY plan — no reel generated)");
    }
  }, [status, job]);

  const handleVideoSelected = (file) => {
    setVideoFile(file);
    setStep(STEPS.FACE);
  };

  const handleStartUpload = async () => {
    if (!videoFile) return;
    setStep(STEPS.UPLOADING);

    try {
      let faceRefJobId = null;
      if (faceFile) {
        const faceForm = new FormData();
        faceForm.append("face", faceFile);
        // Face ref is uploaded after video job is created
      }

      const jid = await uploadVideo(videoFile);
      if (!jid) return;

      setJobId(jid);

      // Upload face reference and link to job
      if (faceFile) {
        const form = new FormData();
        form.append("face",  faceFile);
        form.append("jobId", jid);
        await uploadAPI.faceRef(form).catch(() => {});
      }

      setStep(STEPS.PROCESSING);
    } catch (err) {
      toast.error(err?.error || "Upload failed");
      setStep(STEPS.IDLE);
    }
  };

  const handleSelectClips = async (selectedIds) => {
    if (!jobId) return;
    setFinalLoading(true);
    try {
      await jobsAPI.selectClips(jobId, selectedIds);
      setStep(STEPS.PROCESSING);
    } catch (err) {
      toast.error(err?.error || "Failed to start final render");
    } finally {
      setFinalLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const r   = await jobsAPI.downloadLink(jobId);
      const url = r.data?.url;
      if (url) window.open(url, "_blank");
    } catch (err) {
      toast.error("Download link expired. Please regenerate.");
    }
  };

  const handleReset = () => {
    setStep(STEPS.IDLE);
    setVideoFile(null);
    setFaceFile(null);
    setJobId(null);
    setJobData(null);
  };

  if (authLoading) return <Layout><div className="text-center py-20 text-zinc-500">Loading…</div></Layout>;

  const isPRIVACY = sub?.plan === "PRIVACY";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Create a Reel</h1>
          <p className="text-zinc-400 text-sm">
            {sub ? `Plan: ${sub.plan}` : "Loading plan…"} · Upload a video, we'll find your best moments.
          </p>
        </div>

        {/* ── IDLE: Upload video ── */}
        {step === STEPS.IDLE && (
          <UploadZone onFile={handleVideoSelected} disabled={false} />
        )}

        {/* ── FACE: Upload reference photo ── */}
        {step === STEPS.FACE && (
          <div className="glass rounded-2xl p-8">
            <h2 className="text-lg font-semibold mb-2">Upload your photo</h2>
            <p className="text-zinc-400 text-sm mb-6">
              So Hessa AI can identify your face in the video. Clear frontal photo works best.
            </p>

            <div className="mb-4">
              <label className="text-sm text-zinc-400 mb-2 block">Reference Photo (optional but recommended)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFaceFile(e.target.files[0])}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer"
              />
              {faceFile && <p className="text-xs text-purple-400 mt-1">✓ {faceFile.name}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStartUpload}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-all"
              >
                {faceFile ? "Start Processing" : "Continue Without Photo"}
              </button>
              <button
                onClick={handleReset}
                className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── UPLOADING ── */}
        {step === STEPS.UPLOADING && (
          <div className="glass rounded-2xl p-8">
            <h2 className="text-lg font-semibold mb-6">Uploading…</h2>
            <ProgressBar progress={progress} stage="uploading" />
            {uploadError && <p className="text-red-400 text-sm mt-3">{uploadError}</p>}
          </div>
        )}

        {/* ── PROCESSING ── */}
        {step === STEPS.PROCESSING && (
          <div className="glass rounded-2xl p-8">
            <h2 className="text-lg font-semibold mb-6">AI is working on your reel…</h2>
            <ProgressBar progress={aiProgress} stage={stage} status={status} />
            {sseError && <p className="text-yellow-400 text-sm mt-3">{sseError}</p>}
            <p className="text-zinc-500 text-xs mt-4">This may take a few minutes for longer videos.</p>
          </div>
        )}

        {/* ── PREVIEW: Clip selection ── */}
        {step === STEPS.PREVIEW && jobData && (
          <div className="glass rounded-2xl p-8">
            <ClipSelector
              clips={JSON.parse(jobData.clips_data || "[]")}
              onConfirm={handleSelectClips}
              loading={finalLoading}
            />
          </div>
        )}

        {/* ── DONE ── */}
        {step === STEPS.DONE && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">{isPRIVACY ? "🔍" : "🎉"}</div>
            <h2 className="text-xl font-bold mb-2">
              {isPRIVACY ? "Privacy Analysis Complete" : "Your reel is ready!"}
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              {isPRIVACY
                ? "Full privacy analysis saved. Upgrade to generate reels."
                : "Download it now. The file will be auto-deleted after download."}
            </p>

            {!isPRIVACY && (
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-all mb-3"
              >
                ⬇ Download Reel
              </button>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
            >
              Create Another
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
