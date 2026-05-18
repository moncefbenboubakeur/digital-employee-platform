#!/usr/bin/env python3
"""Persistent XTTS-v2 voice worker.

Long-lived alternative to generate_voice.py: loads the ~1.5 GB Coqui XTTS
model once, then services requests over stdin/stdout as JSON lines. This
removes the per-call Python startup (~5–10s), torch import (~5–10s), and
model load (~10–30s) costs that make generate_voice.py slow when warming
many answers in a row.

Protocol
--------
On startup it prints ONE JSON line to stdout:

  {"event": "ready", "device": "cpu", "model": "tts_models/..."}

It then reads JSON requests from stdin, one per line:

  {"id": "req-1", "textFile": "/path/voice-input.txt",
   "reference": "/path/ref.wav", "language": "en",
   "output": "/path/voice-raw.wav"}

For each request it writes a JSON response line to stdout:

  {"id": "req-1", "status": "ok", "elapsedMs": 12345,
   "bytes": 219444, "durationSeconds": 6.8}

or

  {"id": "req-1", "status": "error", "message": "<reason>"}

All diagnostics go to stderr so stdout stays a clean JSON channel.

The worker exits cleanly when stdin is closed.
"""
from __future__ import annotations

import json
import os
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from chunk_script import chunk_script  # noqa: E402

XTTS_MODEL = "tts_models/multilingual/multi-dataset/xtts_v2"
SILENCE_SECONDS = 0.15


def log(message: str) -> None:
    print(f"[voice_worker] {message}", file=sys.stderr, flush=True)


def respond(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def main() -> int:
    log("starting up")
    os.environ.setdefault("COQUI_TOS_AGREED", "1")

    t_load = time.time()
    log("importing TTS / numpy / soundfile (cold path)")
    from TTS.api import TTS  # type: ignore
    import numpy as np
    import soundfile as sf

    device = os.environ.get("VOICE_DEVICE", "cpu")
    log(f"loading XTTS-v2 model on device={device}")
    tts = TTS(XTTS_MODEL).to(device)
    sample_rate = tts.synthesizer.output_sample_rate
    log(f"model ready in {time.time() - t_load:.1f}s, sample_rate={sample_rate}")

    silence = np.zeros(int(sample_rate * SILENCE_SECONDS), dtype=np.float32)
    respond({
        "event": "ready",
        "device": device,
        "model": XTTS_MODEL,
        "sampleRate": int(sample_rate),
        "warmupSeconds": round(time.time() - t_load, 2),
    })

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError as exc:
            respond({"id": None, "status": "error", "message": f"invalid JSON: {exc}"})
            continue

        request_id = request.get("id")
        try:
            text_file = Path(request["textFile"]).resolve()
            reference = Path(request["reference"]).resolve()
            language = str(request["language"])
            output = Path(request["output"]).resolve()
        except (KeyError, TypeError, ValueError) as exc:
            respond({"id": request_id, "status": "error", "message": f"bad request shape: {exc}"})
            continue

        if not text_file.exists():
            respond({"id": request_id, "status": "error", "message": f"textFile missing: {text_file}"})
            continue
        if not reference.exists():
            respond({"id": request_id, "status": "error", "message": f"reference missing: {reference}"})
            continue

        try:
            text = text_file.read_text(encoding="utf-8")
            chunks = chunk_script(text, language)
            if not chunks:
                respond({"id": request_id, "status": "error", "message": "empty text after chunking"})
                continue

            log(f"[{request_id}] generating {len(chunks)} chunk(s) lang={language} ref={reference.name}")
            t_total = time.time()
            audio_parts: list[np.ndarray] = []
            for i, chunk in enumerate(chunks, 1):
                t_chunk = time.time()
                wav = tts.tts(
                    text=chunk,
                    speaker_wav=str(reference),
                    language=language,
                )
                wav = np.asarray(wav, dtype=np.float32)
                audio_parts.append(wav)
                if i < len(chunks):
                    audio_parts.append(silence)
                log(f"[{request_id}]   chunk {i}/{len(chunks)} in {time.time() - t_chunk:.1f}s")

            combined = np.concatenate(audio_parts)
            output.parent.mkdir(parents=True, exist_ok=True)
            sf.write(output, combined, sample_rate, format="WAV", subtype="PCM_16")
            if not output.exists() or output.stat().st_size == 0:
                respond({"id": request_id, "status": "error", "message": "output file missing or empty after write"})
                continue

            duration = len(combined) / sample_rate
            elapsed_ms = int((time.time() - t_total) * 1000)
            log(f"[{request_id}] done in {elapsed_ms}ms ({duration:.1f}s audio)")
            respond({
                "id": request_id,
                "status": "ok",
                "elapsedMs": elapsed_ms,
                "bytes": output.stat().st_size,
                "durationSeconds": round(duration, 3),
            })
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc(file=sys.stderr)
            respond({"id": request_id, "status": "error", "message": f"{type(exc).__name__}: {exc}"})

    log("stdin closed, exiting")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        log(f"fatal: {exc}")
        sys.exit(1)
