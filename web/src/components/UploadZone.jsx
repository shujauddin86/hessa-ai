import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ACCEPTED = { "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"] };

export default function UploadZone({ onFile, disabled }) {
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) onFile(accepted[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept:    ACCEPTED,
    maxFiles:  1,
    maxSize:   MAX_SIZE,
    disabled,
  });

  const rejected = fileRejections[0]?.errors[0];

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
        ${isDragActive  ? "border-purple-500 bg-purple-900/20" : "border-zinc-700 hover:border-zinc-500"}
        ${disabled      ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <div className="text-4xl mb-4">🎬</div>
      {isDragActive ? (
        <p className="text-purple-300 font-medium">Drop it here…</p>
      ) : (
        <>
          <p className="text-zinc-300 font-medium mb-1">Drag & drop your video</p>
          <p className="text-zinc-500 text-sm">MP4, MOV, AVI, MKV · Max 2GB · Max 30 min</p>
        </>
      )}
      {rejected && (
        <p className="text-red-400 text-sm mt-3">{rejected.message}</p>
      )}
    </div>
  );
}
