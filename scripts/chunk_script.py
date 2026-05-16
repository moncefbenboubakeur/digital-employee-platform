"""Sentence-aware chunker for XTTS-v2 input.

XTTS-v2 has a per-call text length limit (~80 words / 250 chars). Long
scripts must be split into chunks that the model synthesizes independently,
then joined with short silences.

This module is pure: no external deps, no model loading. Tested standalone.
"""

# Sentence enders per language (Unicode-aware).
# Default falls back to en.
SENTENCE_ENDERS_BY_LANG = {
    "en": ".!?",
    "fr": ".!?",
    "ar": ".!?؟۔",
    "es": ".!?¡¿",
    "de": ".!?",
    "it": ".!?",
    "pt": ".!?",
    "pl": ".!?",
    "tr": ".!?",
    "ru": ".!?",
    "nl": ".!?",
    "cs": ".!?",
    "zh-cn": ".!?。！？",
    "ja": ".!?。！？",
    "hu": ".!?",
    "ko": ".!?。！？",
}


def _split_sentences(text: str, language: str) -> list[str]:
    enders = SENTENCE_ENDERS_BY_LANG.get(language, SENTENCE_ENDERS_BY_LANG["en"])
    sentences: list[str] = []
    buf: list[str] = []
    for ch in text:
        buf.append(ch)
        if ch in enders:
            sentence = "".join(buf).strip()
            if sentence:
                sentences.append(sentence)
            buf = []
    tail = "".join(buf).strip()
    if tail:
        sentences.append(tail)
    return sentences


def _hard_split_long(sentence: str, max_words: int) -> list[str]:
    """Fallback: comma-split first, then word-split. Used when one sentence
    exceeds max_words on its own."""
    parts = [p.strip() for p in sentence.split(",") if p.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_words = 0
    for part in parts:
        pw = len(part.split())
        if pw > max_words:
            if current:
                chunks.append(", ".join(current))
                current, current_words = [], 0
            words = part.split()
            for i in range(0, len(words), max_words):
                chunks.append(" ".join(words[i:i + max_words]))
        elif current_words + pw <= max_words:
            current.append(part)
            current_words += pw
        else:
            chunks.append(", ".join(current))
            current, current_words = [part], pw
    if current:
        chunks.append(", ".join(current))
    return chunks


def chunk_script(text: str, language: str, max_words: int = 80) -> list[str]:
    """Split text into chunks of <=max_words, preferring sentence boundaries.

    - Empty / whitespace-only → []
    - Each chunk is a non-empty string, sentence-attached where possible.
    - If a single sentence exceeds max_words, fall back to comma split,
      then to word-count split.
    """
    if not text or not text.strip():
        return []

    sentences = _split_sentences(text, language)
    chunks: list[str] = []
    current: list[str] = []
    current_words = 0

    for sentence in sentences:
        sw = len(sentence.split())
        if sw > max_words:
            if current:
                chunks.append(" ".join(current))
                current, current_words = [], 0
            chunks.extend(_hard_split_long(sentence, max_words))
        elif current_words + sw <= max_words:
            current.append(sentence)
            current_words += sw
        else:
            chunks.append(" ".join(current))
            current, current_words = [sentence], sw

    if current:
        chunks.append(" ".join(current))

    return chunks
