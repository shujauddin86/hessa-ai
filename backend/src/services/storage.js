/**
 * services/storage.js — File system management for uploads/outputs/temp
 */
const fs   = require("fs");
const path = require("path");
const cfg  = require("../config");
const logger = require("../utils/logger");

// Ensure all storage directories exist
[cfg.storage.uploadDir, cfg.storage.outputDir, cfg.storage.tempDir, "./data/logs"].forEach((d) => {
  fs.mkdirSync(d, { recursive: true });
});

function jobDir(jobId, type = "temp") {
  const base = type === "upload" ? cfg.storage.uploadDir
             : type === "output" ? cfg.storage.outputDir
             : cfg.storage.tempDir;
  const dir  = path.join(base, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function deleteJobData(jobId) {
  const dirs = [
    path.join(cfg.storage.uploadDir, jobId),
    path.join(cfg.storage.outputDir, jobId),
    path.join(cfg.storage.tempDir,   jobId),
  ];
  for (const d of dirs) {
    try {
      if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    } catch (e) {
      logger.warn("[Storage] Delete failed", { dir: d, err: e.message });
    }
  }
}

function diskUsageMB(dir) {
  let total = 0;
  try {
    const walk = (d) => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, f.name);
        if (f.isDirectory()) walk(full);
        else total += fs.statSync(full).size;
      }
    };
    walk(dir);
  } catch { /* ignore */ }
  return Math.round(total / 1024 / 1024);
}

/**
 * saveChunk — writes a multipart chunk to temp storage.
 * Returns path to merged file once all chunks are received.
 */
function saveChunk(jobId, chunkIndex, totalChunks, buffer) {
  const dir  = jobDir(jobId, "temp");
  const file = path.join(dir, `chunk_${String(chunkIndex).padStart(5, "0")}`);
  fs.writeFileSync(file, buffer);
  return { chunkPath: file, dir };
}

function mergeChunks(jobId, totalChunks, destFilename = "input.mp4") {
  const dir    = path.join(cfg.storage.tempDir, jobId);
  const output = path.join(cfg.storage.uploadDir, jobId, destFilename);
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const chunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const p = path.join(dir, `chunk_${String(i).padStart(5, "0")}`);
    if (!fs.existsSync(p)) throw new Error(`Missing chunk ${i}`);
    chunks.push(p);
  }

  const writeStream = fs.createWriteStream(output);
  for (const c of chunks) {
    const data = fs.readFileSync(c);
    writeStream.write(data);
  }
  return new Promise((res, rej) => {
    writeStream.end(() => {
      // Cleanup chunk dir
      chunks.forEach((c) => { try { fs.unlinkSync(c); } catch {} });
      res(output);
    });
    writeStream.on("error", rej);
  });
}

module.exports = { jobDir, deleteJobData, diskUsageMB, saveChunk, mergeChunks };
