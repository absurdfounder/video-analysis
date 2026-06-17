#!/usr/bin/env python3
"""Fetch YouTube transcript via youtube-transcript-api; prints JSON to stdout."""
import json
import sys


def format_time(seconds):
    total = max(0, int(float(seconds)))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def parse_languages(raw):
    langs = []
    for part in str(raw or "").split(","):
        code = part.strip().replace(".*", "").replace("*", "").split("-")[0].lower()
        if code and code not in langs:
            langs.append(code)
    return langs or ["hi", "en"]


def main():
    if len(sys.argv) < 2:
        print("video_id required", file=sys.stderr)
        sys.exit(1)

    video_id = sys.argv[1].strip()
    languages = parse_languages(sys.argv[2] if len(sys.argv) > 2 else "hi,en")

    from youtube_transcript_api import YouTubeTranscriptApi

    ytt = YouTubeTranscriptApi()
    try:
        transcript = ytt.fetch(video_id, languages=languages)
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)

    segments = []
    for index, snippet in enumerate(transcript):
        start = float(snippet.start)
        duration = float(snippet.duration or 0)
        end = round(start + duration, 3) if duration > 0 else None
        segments.append({
            "start": round(start, 3),
            "end": end,
            "duration": round(duration, 3) if duration > 0 else None,
            "timestamp_label": format_time(start),
            "text": snippet.text,
            "segment_index": index,
        })

    print(json.dumps({
        "language": transcript.language_code,
        "languageLabel": transcript.language,
        "is_generated": bool(getattr(transcript, "is_generated", False)),
        "segments": segments,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
