#!/usr/bin/env python3
"""Probe every supplied reference film and make full-length contact sheets."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


FFMPEG = Path(__file__).resolve().parents[1] / "tools" / "ffmpeg.exe"
FFPROBE = Path(__file__).resolve().parents[1] / "tools" / "ffprobe.exe"
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"S:\Motion Graphics\Hackathon Demo")
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / "reference-analysis"
SAMPLES = 12
TILE_W, TILE_H, LABEL_H, COLS = 480, 270, 40, 4


def probe(path: Path) -> dict:
    data = json.loads(subprocess.check_output([
        str(FFPROBE), "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)
    ], text=True))
    video = next(s for s in data["streams"] if s.get("codec_type") == "video")
    audio = next((s for s in data["streams"] if s.get("codec_type") == "audio"), None)
    duration = float(data["format"].get("duration") or video.get("duration") or 0)
    return {
        "file": path.name,
        "duration_seconds": round(duration, 3),
        "width": video.get("width"),
        "height": video.get("height"),
        "frame_rate": video.get("r_frame_rate"),
        "video_codec": video.get("codec_name"),
        "audio": None if audio is None else {
            "codec": audio.get("codec_name"), "channels": audio.get("channels"), "sample_rate": audio.get("sample_rate")
        },
        "sample_times_seconds": [round((i + 0.5) * duration / SAMPLES, 3) for i in range(SAMPLES)],
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    videos = sorted(p for p in SOURCE.iterdir() if p.suffix.lower() in {".mp4", ".mov", ".webm", ".mkv"})
    for path in videos:
        meta = probe(path)
        slug = "_".join(path.stem.split())[:44]
        frame_dir = OUT / "frames" / slug
        frame_dir.mkdir(parents=True, exist_ok=True)
        duration = meta["duration_seconds"]
        vf = f"fps={SAMPLES}/{duration:.8f},scale={TILE_W}:{TILE_H}:force_original_aspect_ratio=decrease:flags=lanczos,pad={TILE_W}:{TILE_H}:(ow-iw)/2:(oh-ih)/2,setsar=1"
        subprocess.run([
            str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
            "-vf", vf, "-frames:v", str(SAMPLES), "-q:v", "3", str(frame_dir / "%02d.jpg")
        ], check=True)
        files = sorted(frame_dir.glob("*.jpg"))
        sheet = Image.new("RGB", (COLS * TILE_W, 3 * (TILE_H + LABEL_H)), (246, 245, 240))
        draw = ImageDraw.Draw(sheet)
        for idx, frame in enumerate(files[:SAMPLES]):
            col, row = idx % COLS, idx // COLS
            x, y = col * TILE_W, row * (TILE_H + LABEL_H)
            im = Image.open(frame).convert("RGB")
            sheet.paste(im, (x, y))
            t = meta["sample_times_seconds"][idx]
            draw.text((x + 13, y + TILE_H + 12), f"{idx + 1:02d}  |  {t:05.1f}s", fill=(31, 38, 40))
        sheet_path = OUT / f"{slug}_contact.jpg"
        sheet.save(sheet_path, quality=90, optimize=True)
        meta["contact_sheet"] = sheet_path.name
        entries.append(meta)
        print(f"Analysed {path.name}: {duration:.1f}s, {meta['width']}x{meta['height']}, {len(files)} frames")
    (OUT / "manifest.json").write_text(json.dumps(entries, indent=2), encoding="utf-8")
    print(f"Saved {len(entries)} contact sheets to {OUT}")


if __name__ == "__main__":
    main()
