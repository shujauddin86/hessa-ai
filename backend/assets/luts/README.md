# LUT Files for Hessa AI Cinematic Color Grading

Place standard `.cube` 3D LUT files in this directory.

## Expected filenames (configure in .env)

| Mood | Default filename | Emotion triggers |
|---|---|---|
| Vivid | `cinematic_vivid.cube` | happy, excited |
| Cinematic | `cinematic_teal_orange.cube` | neutral, surprised |
| Muted | `cinematic_muted.cube` | sad |
| Dark | `cinematic_dark.cube` | fearful, angry, disgusted |
| Warm | `cinematic_warm.cube` | (bonus mood) |

## Free LUT Sources

- **RocketStock 35 Free LUTs**: https://www.rocketstock.com/free-after-effects-templates/35-free-luts-for-color-grading-videos/
- **IWLTBAP**: https://luts.iwltbap.com
- **FixThePhoto**: https://fixthephoto.com/free-luts
- **Koji LUTs free pack**: https://koji.tv/collections/free

## Format

Standard `.cube` format (33x33x33 or 64x64x64 grid).
FFmpeg lut3d filter supports: `.cube`, `.3dl`, `.dat`, `.m3d`

## Without LUT files

If LUT files are absent, the engine automatically falls back to FFmpeg
`curves` + `eq` filters that approximate the same look. No configuration
needed — the system detects file presence at runtime.
