#!/usr/bin/env python3
"""v1.2 voice generator — called by M7's VOICE_COMMAND adapter.

Reads project script text + a reference WAV; emits a synthesized WAV in
the target language, voice-cloned to the reference. Long scripts are
chunked (see chunk_script.py) and joined with short silences.

Invoked as:
  generate_voice.py
    --text-file PATH
    --reference PATH
    --language en|fr|ar|...
    --output PATH
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

# Ensure sibling-module import works whether invoked from repo root or scripts/
sys.path.insert(0, str(Path(__file__).resolve().parent))

from chunk_script import chunk_script  # noqa: E402

XTTS_MODEL = "tts_models/multilingual/multi-dataset/xtts_v2"
SILENCE_SECONDS = 0.15


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="XTTS-v2 voice generator (v1.2)")
    p.add_argument("--text-file",  required=True, type=Path)
    p.add_argument("--reference",  required=True, type=Path)
    p.add_argument("--language",   required=True)
    p.add_argument("--output",     required=True, type=Path)
    return p.parse_args()


def main() -> int:
    args = parse_args()

    # Resolve to absolute path early so the "wrote to X" line at the bottom
    # is unambiguous if the adapter later complains the file is "missing."
    # Diagnostics in stderr — the orchestrator already pipes both streams
    # to the log panel.
    args.output = args.output.resolve()
    print(f"[gen_voice] output target: {args.output}", file=sys.stderr)
    print(f"[gen_voice] cwd:            {Path.cwd()}", file=sys.stderr)

    if not args.text_file.exists():
        print(f"--text-file not found: {args.text_file}", file=sys.stderr)
        return 2
    if not args.reference.exists():
        print(f"--reference not found: {args.reference}", file=sys.stderr)
        return 2

    text = args.text_file.read_text(encoding="utf-8")
    chunks = chunk_script(text, args.language)
    if not chunks:
        print("Script is empty after chunking — nothing to synthesize.", file=sys.stderr)
        return 2

    print(f"Loaded {len(chunks)} chunk(s) from {args.text_file}")
    for i, c in enumerate(chunks, 1):
        words = len(c.split())
        preview = c[:60] + ("…" if len(c) > 60 else "")
        print(f"  chunk {i}: {words} words — {preview}")

    print("Loading XTTS-v2 model… (first run downloads ~1.5 GB)")
    t_load = time.time()

    # Lazy import — heavy
    os.environ.setdefault("COQUI_TOS_AGREED", "1")
    from TTS.api import TTS  # type: ignore
    import numpy as np
    import soundfile as sf

    device = os.environ.get("VOICE_DEVICE", "cpu")
    tts = TTS(XTTS_MODEL).to(device)
    print(f"Model ready in {time.time() - t_load:.1f}s on {device}.")

    sample_rate = tts.synthesizer.output_sample_rate
    print(f"Sample rate: {sample_rate} Hz")

    audio_parts: list[np.ndarray] = []
    silence = np.zeros(int(sample_rate * SILENCE_SECONDS), dtype=np.float32)

    for i, chunk in enumerate(chunks, 1):
        t_chunk = time.time()
        wav = tts.tts(
            text=chunk,
            speaker_wav=str(args.reference),
            language=args.language,
        )
        wav = np.asarray(wav, dtype=np.float32)
        audio_parts.append(wav)
        if i < len(chunks):
            audio_parts.append(silence)
        print(f"  synthesized chunk {i}/{len(chunks)} "
              f"({len(chunk.split())} words, {time.time() - t_chunk:.1f}s)")

    combined = np.concatenate(audio_parts)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # The orchestrator's {audioPath} is extension-less (e.g. "voice-raw"), so
    # soundfile cannot infer the container. Force WAV/PCM_16 explicitly.
    sf.write(args.output, combined, sample_rate, format="WAV", subtype="PCM_16")
    duration = len(combined) / sample_rate

    # Verify the file actually landed before declaring success. If sf.write
    # silently no-ops (it shouldn't, but the "exited 0 but no output" flake
    # has hit twice) we want a loud stderr message + non-zero exit instead
    # of letting the orchestrator find an empty folder.
    if not args.output.exists():
        print(
            f"[gen_voice] FATAL: sf.write returned but {args.output} is not on "
            f"disk. cwd={Path.cwd()}. This is the 'exited 0 no output' flake.",
            file=sys.stderr,
        )
        return 3
    actual_size = args.output.stat().st_size
    if actual_size == 0:
        print(
            f"[gen_voice] FATAL: {args.output} exists but is 0 bytes "
            f"(synthesized {duration:.1f}s, expected non-zero file).",
            file=sys.stderr,
        )
        return 3

    print(f"Wrote {args.output} ({duration:.1f}s audio, {actual_size} bytes).")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        print(f"\nfailed: {e}", file=sys.stderr)
        sys.exit(1)
