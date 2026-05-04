const STAGE_LABELS = {
  normalizing:       "Preparing video…",
  extracting_frames: "Extracting frames…",
  detecting_faces:   "Detecting faces…",
  tracking_face:     "Tracking identity…",
  grouping_timestamps: "Grouping moments…",
  generating_clips:  "Generating clips…",
  scoring_moments:   "Scoring moments…",
  selecting_clips:   "Selecting top clips…",
  building_story:    "Building your story…",
  music_sync:        "Syncing music…",
  editing:           "Editing…",
  rendering:         "Rendering…",
  validating:        "Validating…",
  preview_ready:     "Preview ready!",
  final_render:      "Final render…",
  done:              "Done!",
  failed:            "Failed",
};

export default function ProgressBar({ progress = 0, stage, status }) {
  const label  = STAGE_LABELS[stage] || stage || "Processing…";
  const isOk   = status !== "failed";
  const isDone = status === "done" || status === "preview_ready";

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isDone
              ? "bg-green-500"
              : !isOk
              ? "bg-red-500"
              : "progress-bar-animated"
          }`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}
