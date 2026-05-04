import { useState } from "react";
import ReactPlayer from "react-player";

export default function ClipSelector({ clips = [], onConfirm, loading }) {
  const [selected, setSelected] = useState(() => clips.map((c) => c.id || c.index));

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => onConfirm(selected);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Select your clips</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Choose which moments to include in your reel. At least 1 required.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {clips.map((clip, i) => {
          const id       = clip.id || clip.index || i;
          const isActive = selected.includes(id);

          return (
            <div
              key={id}
              onClick={() => toggle(id)}
              className={`
                relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                ${isActive ? "border-purple-500 ring-2 ring-purple-500/30" : "border-zinc-700 hover:border-zinc-500"}
              `}
            >
              {clip.previewUrl ? (
                <ReactPlayer
                  url={clip.previewUrl}
                  width="100%"
                  height="180px"
                  playing={false}
                  controls
                  light
                />
              ) : (
                <div className="h-44 bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <span className="text-3xl">🎞️</span>
                </div>
              )}

              {/* Clip metadata */}
              <div className="p-3 bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    Clip {i + 1} · {Math.round(clip.duration || 0)}s
                  </span>
                  <span className={`text-xs font-medium ${isActive ? "text-purple-400" : "text-zinc-600"}`}>
                    {isActive ? "✓ Selected" : "Select"}
                  </span>
                </div>
                {clip.scores && (
                  <div className="mt-1 text-xs text-zinc-500">
                    Score: {((clip.score || 0) * 100).toFixed(0)}% · {clip.segment?.dominantEmotion}
                  </div>
                )}
              </div>

              {/* Selected overlay */}
              {isActive && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={selected.length === 0 || loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
      >
        {loading ? "Generating final reel…" : `Generate Reel with ${selected.length} clip${selected.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
