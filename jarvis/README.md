# Jarvis — the voice listener

The local ear of the AI OS. An always-on Python process that listens on the mic,
wakes on a **double clap** or the wake word **"jarvis"**, records a ~5 second
command, transcribes it **locally** with Whisper, sends the transcript to the
dashboard, and speaks the reply back through ElevenLabs.

It is only the ear and mouth. All thinking, command matching and execution
happen in `dashboard/server.js` against its whitelist.

**Approval gates apply to voice too** (CLAUDE.md §5). When the server answers
`confirm_required`, nothing has run yet. Jarvis reads the action out loud and
waits for an explicit spoken *yes*. Silence, an unclear answer, or 20 seconds of
nothing = cancelled, zero side effects. There is no voice bypass lane.

## Install

```powershell
pip install -r requirements.txt
```

`openai-whisper`, `numpy` and `ffmpeg` are already on this machine — the two new
packages are `sounddevice` (the mic) and `elevenlabs` (the voice). Skipping
`elevenlabs` is fine: replies then print to the console instead of speaking.

## Run

```powershell
cd "D:\Claude code\jarvis"
python listener.py
```

Start the dashboard first (`cd dashboard && npm start`). First run downloads the
Whisper `tiny` model (~75 MB); `small` is already cached.

```powershell
python listener.py --list-devices     # find the right mic
python listener.py --device 2         # use it
python listener.py --model medium     # more accurate commands, slower
python listener.py --ptt              # ALSO trigger on push-to-talk
```

### Push-to-talk (`--ptt`)

Hold **Right Ctrl**, speak, release. Recording lasts exactly as long as the key
is held.

This is the trigger with nothing to tune. The clap and wake word depend on a
chain of thresholds — spike ratio, minimum RMS, ambient calibration, a wake
model — and most of the troubleshooting table below is that chain misbehaving in
a particular room. A held key has none of those failure modes, which makes it
the right default when this gets cloned onto a client's machine whose room and
microphone nobody has ever heard.

It is **added, not swapped**: clap and wake word stay on, because hands-free is
the whole point mid-webinar or on camera. Windows only (`GetAsyncKeyState`);
elsewhere the flag is ignored with a log line rather than failing.

Deliberately not the space bar — this is a machine you write and code on. Rebind
with `JARVIS_PTT_KEY` (hex or decimal virtual-key code) and `JARVIS_PTT_NAME`.

## Configuration

Read from the environment, and from `dashboard/.env` if present (never
overriding a real env var, never printed).

| Variable | Default | What it does |
|---|---|---|
| `DASHBOARD_URL` | `http://localhost:8080` | Where the backend lives |
| `DASHBOARD_USER` / `DASHBOARD_PASS` | – | Sent as HTTP Basic auth when both are set |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | – | Required to actually speak |
| `ELEVENLABS_MODEL` | `eleven_turbo_v2_5` | TTS model |
| `JARVIS_DEVICE` | system default | Mic index or name substring |
| `JARVIS_SPIKE_RATIO` | `7.0` | Clap sensitivity — **lower = more sensitive** |
| `JARVIS_MIN_RMS` | `0.012` | Absolute loudness floor for a spike |
| `JARVIS_SPEECH_RATIO` | `2.5` | How loud counts as "might be speech" |
| `JARVIS_RECORD_SECONDS` | `5` | Command window length |
| `JARVIS_CONFIRM_TIMEOUT` | `20` | Gated-action confirm window |

## How it stays cheap when idle

A quiet room costs one RMS calculation per 40 ms block and nothing else. Whisper
`tiny` only runs on the rolling 2-second buffer when there was ~0.35 s of
speech-loud audio in it, and at most once every 1.2 s. Whisper `small` only runs
on a real command window.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ERROR: 'sounddevice' is not installed` | Mic library missing | `pip install -r requirements.txt` |
| Wrong mic / total silence | Default input device is a webcam or virtual cable | `python listener.py --list-devices`, then `--device N` |
| Claps never detected | `JARVIS_SPIKE_RATIO` too high for the room/mic | Try `4.0`, then `3.0`. Watch the `trigger` log line |
| Claps fire constantly | Ratio too low, or a loud room | Raise to `9.0`–`12.0`, raise `JARVIS_MIN_RMS` |
| Wake word never heard | Mic gain too low, so the speech gate never opens | Lower `JARVIS_SPEECH_RATIO` to `1.8`; the `wake?` log shows what Whisper heard |
| Wake word fires on the TV | Gate too loose | Raise `JARVIS_SPEECH_RATIO`, or just use the double clap |
| Replies print but never speak | ElevenLabs not configured or SDK missing | Set `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`; `pip install elevenlabs` |
| `speech failed …` then printed | PCM output not on your ElevenLabs plan **and** `ffplay` missing | Ensure ffmpeg's `ffplay.exe` is on PATH |
| "I can't reach the dashboard" | Backend not running, or wrong URL | `npm start` in `dashboard/`; check `DASHBOARD_URL` |
| "The dashboard rejected my login" | Basic auth mismatch | Match `DASHBOARD_USER`/`DASHBOARD_PASS` to the server's |
| "I don't have a command for that yet" | Transcript matched no whitelist entry | Add the command to the server's registry — never inferred |
| It triggers on its own voice | Speaker bleeding into the mic | Use headphones, or lower speaker volume (audio buffered during playback is already discarded) |
| Slow to answer | `small` on CPU is ~2–4 s | `--model base` for speed, `--model medium` for accuracy |

## Self-check

```powershell
python test_listener.py
```

Asserts the pure logic — double-clap pattern, wake-word matching (including the
mishearings Whisper produces), and confirm/cancel intent where **ambiguity always
cancels**. No mic, no network, no framework needed.
