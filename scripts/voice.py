"""Voice every line of an episode with Microsoft edge-tts (online neural voices, en-NG by default).

    python scripts/voice.py ep01

Writes public/episodes/<id>/vo/<line>.mp3, <line>.wav (44.1 kHz mono) and <line>.json (duration + word timings).
Lines whose text/voice/rate/pitch did not change are not fetched again (cache key in the .json).
Needs: pip install edge-tts, and ffmpeg on PATH. Needs the internet. Check Microsoft's terms before commercial use.

No internet / want real actors? Record lines yourself and drop <line>.wav files into the vo folder,
then run:  python scripts/voice.py ep01 --import   (measures them; captions are then spread evenly).
"""
import array, asyncio, hashlib, json, os, subprocess, sys, wave

MAX_GAP = 0.28  # longest pause kept inside a line (edge-tts leaves ~0.9 s between sentences)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def wav_duration(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def to_wav(src, dst):
    # trim leading/trailing silence so lines butt up cleanly; 44.1 kHz mono 16-bit
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src,
                    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
                    '-ar', '44100', '-ac', '1', '-sample_fmt', 's16', dst], check=True)


def tighten(path, words, max_gap=MAX_GAP):
    """Shorten long pauses between words in place; returns the words with remapped times."""
    if len(words) < 2:
        return words
    with wave.open(path) as w:
        sr, n = w.getframerate(), w.getnframes()
        pcm = array.array('h', w.readframes(n))
    keep, cursor, removed, out = array.array('h'), 0, 0.0, []
    for i, wd in enumerate(words):
        out.append({**wd, 'start': round(wd['start'] - removed, 3), 'end': round(wd['end'] - removed, 3)})
        if i + 1 < len(words):
            gap = words[i + 1]['start'] - wd['end']
            if gap > max_gap:
                a = int((wd['end'] + max_gap / 2) * sr)
                b = int((words[i + 1]['start'] - max_gap / 2) * sr)
                keep.extend(pcm[cursor:a])
                cursor = b
                removed += (b - a) / sr
    keep.extend(pcm[cursor:])
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(keep.tobytes())
    return out


async def synth(text, voice, rate, pitch, mp3):
    import edge_tts
    words = []
    last = None
    for attempt in range(3):
        try:
            com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary='WordBoundary')
            with open(mp3 + '.part', 'wb') as f:
                async for chunk in com.stream():
                    if chunk['type'] == 'audio':
                        f.write(chunk['data'])
                    elif chunk['type'] == 'WordBoundary':
                        words.append({'w': chunk['text'], 'start': chunk['offset'] / 1e7, 'end': (chunk['offset'] + chunk['duration']) / 1e7})
            os.replace(mp3 + '.part', mp3)
            return words
        except Exception as e:  # network hiccup: retry
            last = e
            words = []
            await asyncio.sleep(1.5 * (attempt + 1))
    raise last


async def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    ep_id = sys.argv[1]
    import_only = '--import' in sys.argv
    ep = json.load(open(os.path.join(ROOT, 'episodes', ep_id, 'episode.json'), encoding='utf8'))
    out = os.path.join(ROOT, 'public', 'episodes', ep_id, 'vo')
    os.makedirs(out, exist_ok=True)
    n_new = 0
    for scene in ep['scenes']:
        for line in scene['lines']:
            v = {**ep['voices'][line['speaker']]}
            for k in ('rate', 'pitch'):
                if line.get(k):
                    v[k] = line[k]
            say = line.get('say') or line['text']
            key = hashlib.sha1(json.dumps([say, v, MAX_GAP], sort_keys=True).encode()).hexdigest()[:12]
            meta_path = os.path.join(out, line['id'] + '.json')
            wav = os.path.join(out, line['id'] + '.wav')
            if import_only:
                if not os.path.exists(wav):
                    sys.exit(f'missing recording {wav}')
                json.dump({'key': 'imported', 'duration': wav_duration(wav), 'words': []}, open(meta_path, 'w'))
                continue
            if os.path.exists(meta_path) and os.path.exists(wav):
                if json.load(open(meta_path)).get('key') == key:
                    continue
            mp3 = os.path.join(out, line['id'] + '.mp3')
            words = await synth(say, v['voice'], v.get('rate', '+0%'), v.get('pitch', '+0Hz'), mp3)
            # measure the leading silence that will be trimmed so word times stay aligned
            raw = os.path.join(out, line['id'] + '.raw.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ar', '44100', '-ac', '1', raw], check=True)
            to_wav(mp3, wav)
            lead = max(0.0, wav_duration(raw) - wav_duration(wav))  # approx: most trimmed silence is at the start
            os.remove(raw)
            first = words[0]['start'] if words else 0
            shift = min(first, lead * 0.8)
            words = [{**w, 'start': round(max(0, w['start'] - shift), 3), 'end': round(max(0, w['end'] - shift), 3)} for w in words]
            words = tighten(wav, words)
            json.dump({'key': key, 'voice': v, 'say': say, 'duration': round(wav_duration(wav), 3), 'words': words}, open(meta_path, 'w'), indent=1)
            n_new += 1
            print(f"  {line['id']:<4} {line['speaker']:<9} {wav_duration(wav):5.2f}s  {say}")
    print(f'voice: {n_new} line(s) generated, rest cached -> {out}')


if __name__ == '__main__':
    asyncio.run(main())
