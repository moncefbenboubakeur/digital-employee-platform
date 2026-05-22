#!/usr/bin/env python3
"""Persistent multilingual-embedding worker for DEP's receptionist matcher.

Long-lived counterpart to ad-hoc embedding calls: loads the
sentence-transformers multilingual model once (~120 MB, ~8s cold start),
then services requests over stdin/stdout as JSON lines. Removes the
per-call Python + torch + model-load overhead.

Why local: the matcher's pre-filter narrows the catalog from 50+ entries
to a top-K before any LAPI call. Doing that with cloud embeddings would
add a network hop AND an external dependency to the kiosk's hot path.
Local embeddings keep the pre-filter offline-capable.

Why this specific model: `paraphrase-multilingual-MiniLM-L12-v2` is
small (~120 MB) and supports 50+ languages including Arabic, French,
and English with strong cross-lingual similarity (validated: equivalent
FR/AR questions score ~0.90 cosine, FR/EN ~0.82). 384-dim vectors are
compact for in-memory cosine similarity at catalog scale.

Protocol
--------
On startup it prints ONE JSON line to stdout:

  {"event": "ready", "model": "paraphrase-multilingual-MiniLM-L12-v2",
   "dim": 384, "warmupSeconds": 8.4}

It then reads JSON requests from stdin, one per line:

  {"id": "req-1", "texts": ["hello", "bonjour", "مرحبا"]}

For each request it writes a JSON response line:

  {"id": "req-1", "status": "ok", "vectors": [[...384 floats...], ...],
   "elapsedMs": 42}

or

  {"id": "req-1", "status": "error", "message": "<reason>"}

The worker exits cleanly when stdin closes.

Stderr is used for human-readable logging only — never mixed into the
stdout protocol stream.
"""

import json
import os
import sys
import time
import traceback


DEFAULT_MODEL = os.environ.get(
    "DR_EMBEDDINGS_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"
)


def log(message: str) -> None:
    """Human-readable diagnostic log line on stderr."""
    print(f"[embeddings_worker] {message}", file=sys.stderr, flush=True)


def respond(payload: dict) -> None:
    """Single-line JSON to stdout, the protocol channel."""
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    t_start = time.time()
    log(f"loading model: {DEFAULT_MODEL}")

    # Import lazily so the import cost shows up in the warmup measurement.
    from sentence_transformers import SentenceTransformer  # noqa: PLC0415

    model = SentenceTransformer(DEFAULT_MODEL)

    # Tickle the model with a tiny embedding to JIT-warm everything (tokenizer,
    # torch graph, etc.) so the first real request isn't slow.
    _ = model.encode(["warmup"], show_progress_bar=False)

    dim = int(model.get_sentence_embedding_dimension() or 0)
    warmup_seconds = round(time.time() - t_start, 2)
    log(f"model ready in {warmup_seconds}s, dim={dim}")

    respond(
        {
            "event": "ready",
            "model": DEFAULT_MODEL,
            "dim": dim,
            "warmupSeconds": warmup_seconds,
        }
    )

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError as exc:
            respond({"id": None, "status": "error", "message": f"invalid JSON: {exc}"})
            continue

        request_id = request.get("id")
        texts = request.get("texts")

        if not isinstance(texts, list) or not all(isinstance(t, str) for t in texts):
            respond(
                {
                    "id": request_id,
                    "status": "error",
                    "message": "`texts` must be an array of strings",
                }
            )
            continue

        if len(texts) == 0:
            respond({"id": request_id, "status": "ok", "vectors": [], "elapsedMs": 0})
            continue

        t0 = time.time()
        try:
            # `encode` accepts a list and returns a list-of-lists (when
            # convert_to_numpy is True the result is a numpy array). We
            # cast to plain Python lists for JSON serialization.
            vectors = model.encode(
                texts, show_progress_bar=False, convert_to_numpy=True
            )
            vectors_list = [list(map(float, v)) for v in vectors]
            elapsed_ms = int((time.time() - t0) * 1000)
            log(
                f"[{request_id}] embedded {len(texts)} text(s) in {elapsed_ms}ms"
            )
            respond(
                {
                    "id": request_id,
                    "status": "ok",
                    "vectors": vectors_list,
                    "elapsedMs": elapsed_ms,
                }
            )
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc(file=sys.stderr)
            respond(
                {
                    "id": request_id,
                    "status": "error",
                    "message": f"{type(exc).__name__}: {exc}",
                }
            )

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
