# Hessa AI — Complete Production System v2.0

AI-powered face-tracking reel generator. Upload any video → face detected → best moments scored → cinematic reel created automatically.

---

## What's New in v2.0

| Upgrade | Detail |
|---|---|
| **No FREE plan** | All users start on PAY_PER_USE (₹99/reel) — no free tier |
| **AWS Rekognition** | Primary face detection; local face-api.js fallback if AWS not configured |
| **LUT Color Grading** | .cube 3D LUT per clip (vivid/cinematic/muted/dark) — software curves fallback |
| **Beat-Synced Cuts** | xfade transitions snapped to exact musical beat boundaries |
| **Two-Pass Vidstab** | vidstabdetect → vidstabtransform (full professional stabilization) |

---

## Architecture

```
hessa/
├── backend/          Node.js + Express + SQLite + BullMQ + Redis
├── web/              Next.js 14 web frontend
└── mobile/           React Native mobile app
```

---

## Backend Setup

### Prerequisites
- Node.js 18+
- Redis
- FFmpeg with vidstab plugin (`apt install ffmpeg libvidstab-dev` or `brew install ffmpeg`)

### Install & Run

```bash
cd backend
cp .env.example .env
# Edit .env — set JWT_SECRET, FFMPEG_PATH, FFPROBE_PATH
# Optionally set AWS credentials for Rekognition

npm install

# Start API server
node src/server.js

# Start queue worker (separate terminal)
node src/queue/worker.js
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `4000` |
| `JWT_SECRET` | Token signing secret (**required**) | — |
| `FFMPEG_PATH` | Path to ffmpeg binary | `ffmpeg` |
| `FFPROBE_PATH` | Path to ffprobe binary | `ffprobe` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `AWS_REGION` | AWS region for Rekognition | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS credentials (optional) | — |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials (optional) | — |
| `FACE_SIMILARITY_THRESHOLD` | Min similarity % for face match | `90` |
| `LUT_VIVID` | .cube LUT filename for happy/vivid | `cinematic_vivid.cube` |
| `LUT_CINEMATIC` | .cube LUT filename for cinematic look | `cinematic_teal_orange.cube` |
| `LUT_MUTED` | .cube LUT filename for muted/sad look | `cinematic_muted.cube` |
| `LUT_DARK` | .cube LUT filename for dark/dramatic | `cinematic_dark.cube` |

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register (starts on PAY_PER_USE) |
| POST | `/api/auth/login` | Login — single session enforced |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user + subscription |

### Upload
| Method | Path | Description |
|---|---|---|
| POST | `/api/upload/chunk` | Chunked video upload (5MB per chunk) |
| POST | `/api/upload/face` | Upload face reference photo |

### Jobs
| Method | Path | Description |
|---|---|---|
| GET | `/api/jobs` | List user jobs |
| GET | `/api/jobs/:id` | Job status + clips |
| POST | `/api/jobs/:id/select-clips` | Confirm clip selection → final render |
| POST | `/api/jobs/:id/regenerate` | Regenerate |
| GET | `/api/jobs/:id/download-link` | HMAC-signed download URL |
| GET | `/api/jobs/:id/stream-progress` | SSE real-time progress |
| GET | `/api/download/:token` | Serve file (one-time) |

### Subscriptions
| Method | Path | Description |
|---|---|---|
| GET | `/api/subscriptions` | Current plan |
| POST | `/api/subscriptions/pay` | Init payment intent |
| POST | `/api/subscriptions/confirm` | Confirm + upgrade plan |

### Privacy
| Method | Path | Description |
|---|---|---|
| POST | `/api/privacy/analyze` | Analyze for platform violations |
| POST | `/api/privacy/request` | Generate takedown letter |

---

## Web Frontend

```bash
cd web
npm install
# set NEXT_PUBLIC_API_URL in .env.local

npm run dev       # http://localhost:3000
npm run build
npm run start
```

---

## Mobile (React Native)

```bash
cd mobile
npm install
npm run ios       # or: npm run android
```

Update `src/utils/api.js` → set `API_URL` to your backend.

---

## AI Pipeline

| Stage | Description |
|---|---|
| 1. Normalize | MP4 H264, 720/1080p, 24fps |
| 2. Extract Frames | 2fps balanced, 1fps speed |
| 3. Detect Faces | **AWS Rekognition primary** → local fallback |
| 4. Track Identity | Frame-by-frame confidence matching |
| 5. Group Timestamps | Contiguous segment merging (gap < 2s) |
| 6. Generate Clips | Buffer + **two-pass vidstab** |
| 7. Score Moments | Face clarity + emotion + motion + context |
| 8. Select Top 3 | Diversity-penalized top selection |
| 9. Music Sync | Emotion-matched track + **beat timestamps** |
| 10. Build Story | Hook→Build→Peak→Resolution + **beat-snapped cuts** |
| 11. Edit | **LUT color grade** per clip + beat-synced xfade |
| 12. Render | NVENC → VideoToolbox → libx264 fallback |
| 13. Validate | Integrity + duration checks |
| 14. Preview Ready | User selects clips → final render |

---

## Subscription Plans

| Plan | Price | Limit | Features |
|---|---|---|---|
| PAY_PER_USE | ₹99/reel | Unlimited | 1080p, no watermark, LUT grading |
| ADVANCED | ₹299/month | 3/day | Priority queue, all features |
| PRIVACY | ₹199/month | Unlimited analysis | No reels, platform violation detection |

No FREE plan.

---

## AWS Rekognition Setup

1. Create an AWS account and enable Rekognition in your region
2. Create an IAM user with `AmazonRekognitionFullAccess` policy
3. Set `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` in `.env`
4. Set `AWS_REGION` to your preferred region (e.g. `ap-south-1` for India)

**Without AWS credentials:** the system automatically falls back to local face-api.js.
Download models to `backend/models/face/` — see https://github.com/vladmandic/face-api

---

## LUT Color Grading Setup

1. Download free `.cube` LUT files (see `backend/assets/luts/README.md`)
2. Place them in `backend/assets/luts/`
3. Configure filenames in `.env`

**Without LUT files:** the engine automatically uses FFmpeg `curves` + `eq` software grade.

---

## Music Assets

Place royalty-free `.mp3` tracks in `backend/assets/music/`:

| Filename | Emotion | BPM |
|---|---|---|
| `upbeat_01.mp3` | happy, excited | 120 |
| `emotional_01.mp3` | sad, neutral | 72 |
| `cinematic_01.mp3` | neutral, surprised | 90 |
| `inspiring_01.mp3` | happy, surprised | 100 |
| `dramatic_01.mp3` | fearful, angry | 138 |
| `calm_01.mp3` | calm, sad | 60 |

**Without music:** silence is generated (pipeline continues normally).

---

## Security

- JWT tokens (30d) + single-session enforcement (login on new device logs out old)
- Rate limiting: 100/15min global, 10/15min auth, 20/hr uploads
- Auto-lock: 5 failed logins → 15 min lockout
- One-time HMAC-signed download links (5 min expiry)
- Auto-delete job data 10 min after download
- Helmet.js headers + CORS + bcrypt password hashing

---

## Production Deployment

```bash
# Backend (PM2 recommended)
pm2 start src/server.js  --name hessa-api    --max-memory-restart 1G
pm2 start src/queue/worker.js --name hessa-worker --max-memory-restart 512M

# Web
cd web && npm run build && npm run start
# or deploy to Vercel: vercel deploy

# Environment
NODE_ENV=production
JWT_SECRET=<random 256-bit secret>
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>
```
