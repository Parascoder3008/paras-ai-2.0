"""Jarvis voice listener — the local ear of Paras's AI OS.

Always-on mic. Fires on a double clap OR the wake word "jarvis", records a ~5s
command, transcribes it LOCALLY with Whisper (nothing leaves the machine for
speech-to-text), POSTs the transcript to the dashboard, and speaks the reply.

Approval gates are law here too: a `confirm_required` reply is NEVER
auto-confirmed. Jarvis asks out loud and waits for an explicit spoken yes.
Silence, ambiguity, or a timeout = cancelled, nothing executed.

    python listener.py                 run it
    python listener.py --list-devices  pick a mic when the wrong one is used

Hardware imports (sounddevice, whisper, elevenlabs) are deliberately lazy so the
pure logic at the top of this file stays importable — and testable — on a box
with no microphone. See test_listener.py.
"""

from __future__ import annotations

import argparse
import base64
import collections
import ctypes
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

import numpy as np

# ---------------------------------------------------------------- tuning ----
# Every constant an ear-in-a-real-room needs to be re-tuned for is env-overridable.
def _envflag(name: str) -> bool:
    return str(os.environ.get(name, "")).strip().lower() in ("1", "true", "yes", "on")


def _num(name, default, cast=float):
    try:
        return cast(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


WHISPER_RATE = 16000        # Whisper's native rate — capture here, skip resampling
BLOCK_MS = 40               # RMS window; short enough to resolve two claps
SPIKE_RATIO = _num("JARVIS_SPIKE_RATIO", 7.0)   # louder-than-noise-floor multiplier
MIN_RMS = _num("JARVIS_MIN_RMS", 0.012)         # absolute floor: silence never spikes
NOISE_ALPHA = 0.992                             # noise floor decay (slow = stable)
MIN_GAP_S, MAX_GAP_S = 0.08, 0.60               # a double clap, not an echo or two events
CLAP_COOLDOWN_S = 0.45
SPEECH_RATIO = _num("JARVIS_SPEECH_RATIO", 2.5)  # gate for "might be speech"
WAKE_BUFFER_S = 2.0
WAKE_MIN_SPEECH_S = 0.35    # this much sound in the buffer before Whisper is worth waking
WAKE_INTERVAL_S = 1.2       # never run the wake check more often than this
RECORD_S = _num("JARVIS_RECORD_SECONDS", 5.0)
CONFIRM_TIMEOUT_S = _num("JARVIS_CONFIRM_TIMEOUT", 30.0)
CONFIRM_CHUNK_S = 3.0

# Push-to-talk. Right Ctrl (0xA3), deliberately NOT space: this is a machine you
# write and code on, and a global hook on space either eats spaces everywhere or
# is not global at all. Override with JARVIS_PTT_KEY as a hex or decimal VK code.
PTT_VK = int(str(os.environ.get("JARVIS_PTT_KEY", "0xA3")), 0)
PTT_KEY_NAME = os.environ.get("JARVIS_PTT_NAME", "Right Ctrl")
PTT_MAX_S = _num("JARVIS_PTT_MAX_SECONDS", 30.0)   # a stuck key must not record forever
PTT_POLL_S = 0.03
_PTT_AVAILABLE = sys.platform == "win32" and hasattr(ctypes, "windll")

BASE_URL = os.environ.get("DASHBOARD_URL", "http://localhost:8080").rstrip("/")
TTS_MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_turbo_v2_5")

WAKE_WORDS = ("jarvis", "jarvus", "jervis", "javis", "jarviz", "garvis", "jarvis's")
CONFIRM_WORDS = ("yes", "yeah", "yep", "yup", "confirm", "confirmed", "do it", "go ahead",
                 "send it", "approved", "approve", "affirmative", "proceed")
CANCEL_WORDS = ("no", "nope", "cancel", "stop", "abort", "forget it", "don't", "do not",
                "negative", "never mind", "nevermind")


# ------------------------------------------------------- pure logic ---------
# No mic, no network, no models below this line — this is what the tests drive.

def ptt_down(vk: int = None) -> bool:
    """True while the push-to-talk key is physically held.

    Windows-only via GetAsyncKeyState — the 0x8000 bit is "down right now" as
    opposed to the 0x0001 "pressed since last call" bit, which would latch and
    make the key look stuck. Returns False anywhere else (and on any failure) so
    a non-Windows box simply keeps the always-on triggers instead of breaking.
    """
    if not _PTT_AVAILABLE:
        return False
    try:
        return bool(ctypes.windll.user32.GetAsyncKeyState(PTT_VK if vk is None else vk) & 0x8000)
    except Exception:
        return False


def rms(block) -> float:
    """Root-mean-square level of a mono float32 block."""
    a = np.asarray(block, dtype=np.float32).reshape(-1)
    return float(np.sqrt(np.mean(a * a))) if a.size else 0.0


class ClapDetector:
    """Double-clap detector fed one (timestamp, rms) sample per audio block.

    Adapted from hectorg2211/jarvis: a rolling noise floor plus a spike ratio,
    so it self-tunes to the room instead of using a fixed threshold. A spike
    must fall back below the release level before another one can register —
    that is what stops one clap's decay tail from counting twice.
    """

    def __init__(self, spike_ratio=SPIKE_RATIO, min_rms=MIN_RMS,
                 min_gap=MIN_GAP_S, max_gap=MAX_GAP_S, cooldown=CLAP_COOLDOWN_S,
                 noise_floor=0.004):
        self.spike_ratio = spike_ratio
        self.min_rms = min_rms
        self.min_gap = min_gap
        self.max_gap = max_gap
        self.cooldown = cooldown
        self.noise_floor = noise_floor
        self.armed = True
        self.first = None
        self.last_trigger = -1e9

    @property
    def threshold(self) -> float:
        return max(self.noise_floor * self.spike_ratio, self.min_rms)

    def reset(self):
        """Forget half-finished patterns — used after we made noise ourselves."""
        self.armed = True
        self.first = None
        self.last_trigger = -1e9

    def push(self, t: float, level: float) -> bool:
        """Feed one block. True exactly once per detected double clap."""
        th = self.threshold
        if level < th * 0.55:                      # quiet: re-arm and learn the room
            self.armed = True
            if level < self.noise_floor * 2.2:
                self.noise_floor = NOISE_ALPHA * self.noise_floor + (1 - NOISE_ALPHA) * level
            return False
        if level < th or not self.armed:           # loud but not a fresh spike
            return False
        self.armed = False
        if t - self.last_trigger < self.cooldown:
            return False
        if self.first is not None and t - self.first > self.max_gap:
            self.first = None                      # too late to be a pair — start over
        if self.first is None:
            self.first = t
            return False
        if t - self.first < self.min_gap:
            return False                           # same clap ringing; keep waiting
        self.first = None
        self.last_trigger = t
        return True


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9' ]+", " ", (text or "").lower())


def is_wake_word(text: str) -> bool:
    """True when Whisper's transcript contains "jarvis" (or a common mishearing)."""
    words = (w[:-2] if w.endswith("'s") else w for w in _normalize(text).split())
    return any(w in WAKE_WORDS for w in words)


def confirm_intent(text: str):
    """'confirm' | 'cancel' | None for a gated-action reply.

    Cancel wins ties on purpose: "no, don't do it" contains "do it", and the
    safe reading of an ambiguous answer to a gated action is always no.
    """
    t = " " + _normalize(text).strip() + " "
    if t.strip() == "":
        return None
    if any(" " + w + " " in t for w in CANCEL_WORDS):
        return "cancel"
    if any(" " + w + " " in t for w in CONFIRM_WORDS):
        return "confirm"
    return None


def to_16k(audio, rate: int):
    """Resample to Whisper's rate — only used when the mic refuses 16 kHz."""
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    if rate == WHISPER_RATE or audio.size == 0:
        return audio
    n = int(round(audio.size * WHISPER_RATE / rate))
    src = np.linspace(0, audio.size - 1, n, dtype=np.float32)
    return np.interp(src, np.arange(audio.size, dtype=np.float32), audio).astype(np.float32)


# ------------------------------------------------------------- plumbing -----

def log(tag: str, msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {tag:<7} {msg}", flush=True)


def load_env_file(path: str):
    """Read dashboard/.env without pulling in python-dotenv. Never overrides a
    real env var, never prints a value."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            lines = fh.readlines()
    except OSError:
        return
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    log("env", f"loaded {os.path.basename(path)} ({len(lines)} lines)")


def post_json(path: str, payload: dict, timeout=90):
    """POST to the dashboard. Returns the parsed body, or an {type:error} dict —
    a backend hiccup must never take the listener down."""
    req = urllib.request.Request(
        BASE_URL + path, data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json"}, method="POST")
    user, pw = os.environ.get("DASHBOARD_USER"), os.environ.get("DASHBOARD_PASS")
    if user and pw:
        token = base64.b64encode(f"{user}:{pw}".encode()).decode()
        req.add_header("Authorization", "Basic " + token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = json.loads(e.read().decode("utf-8")).get("error", "")
        except Exception:
            pass
        if e.code == 401:
            return {"type": "error", "text": "The dashboard rejected my login. Check DASHBOARD_USER and DASHBOARD_PASS."}
        return {"type": "error", "text": f"The dashboard returned an error. {body or e.code}"}
    except Exception as e:
        return {"type": "error", "text": "I can't reach the dashboard.", "detail": str(e)[:200]}


def notify_state(state: str, **extra):
    """Best-effort HUD ping. The HUD's live state (listening / thinking) is only
    known here. Silently ignored if the server has no such endpoint."""
    try:
        post_json("/voice-state", {"state": state, **extra}, timeout=3)
    except Exception:
        pass


# ------------------------------------------------------------------ TTS -----
_tts = {"client": None, "checked": False}


def tts_client():
    if _tts["checked"]:
        return _tts["client"]
    _tts["checked"] = True
    if not (os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_VOICE_ID")):
        log("tts", "ElevenLabs not configured — replies will print, not speak")
        return None
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError:
        log("tts", "elevenlabs SDK missing (pip install elevenlabs) — replies will print, not speak")
        return None
    _tts["client"] = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    log("tts", "ElevenLabs ready")
    return _tts["client"]


def speak_sapi(text: str) -> bool:
    """Windows' built-in speech. Free, offline, zero install — so the assistant
    still has a voice with no ElevenLabs key. Text goes through the environment,
    never the command string, so quotes and apostrophes can't break or inject."""
    if os.name != "nt":
        return False
    script = ("Add-Type -AssemblyName System.Speech;"
              "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;")
    want = os.environ.get("JARVIS_SAPI_VOICE", "").strip()
    if want:
        script += f"try {{ $s.SelectVoice('{want}') }} catch {{}};"
    script += ("$s.Rate = " + os.environ.get("JARVIS_SAPI_RATE", "1") + ";"
               "$s.Speak($env:JARVIS_SAY);")
    try:
        subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
                       env={**os.environ, "JARVIS_SAY": text[:800]},
                       timeout=90, capture_output=True)
        return True
    except Exception as e:
        log("tts", f"windows speech failed ({str(e)[:70]})")
        return False


def speak(text: str):
    """Say it out loud, and always print it. TTS failing is a degraded reply,
    never a dead listener.

    Three tiers, best first: ElevenLabs (if configured) -> Windows SAPI ->
    print only. The middle tier is what makes voice work out of the box."""
    text = (text or "").strip()
    if not text:
        return
    print("  JARVIS> " + text, flush=True)
    client = tts_client()
    if not client:
        speak_sapi(text)
        return
    vid, clipped = os.environ["ELEVENLABS_VOICE_ID"], text[:800]
    try:
        pcm = b"".join(client.text_to_speech.convert(
            voice_id=vid, text=clipped, model_id=TTS_MODEL, output_format="pcm_16000"))
        import sounddevice as sd
        sd.play(np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0, WHISPER_RATE)
        sd.wait()
    except Exception as e:
        # PCM output is plan-gated on some ElevenLabs tiers; mp3 through the
        # already-installed ffmpeg is the fallback.
        try:
            mp3 = b"".join(client.text_to_speech.convert(
                voice_id=vid, text=clipped, model_id=TTS_MODEL, output_format="mp3_44100_128"))
            subprocess.run(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-"],
                           input=mp3, timeout=90)
        except Exception:
            if not speak_sapi(text):     # last resort before going silent
                log("tts", f"speech failed ({str(e)[:90]}) — printed instead")


# ---------------------------------------------------------------- device ----

# Devices that exist but are not a microphone anyone speaks into. Display-audio
# passthroughs, phone-as-webcam bridges and the generic host aliases all enumerate
# as inputs and frequently win the OS default slot, where they read pure digital
# silence — so every clap lands on a dead stream while the log still says "ready".
VIRTUAL_INPUT_HINTS = ("transcreen", "droidcam", "sound mapper", "primary sound",
                       "virtual", "cable", "vb-audio", "voicemeeter", "stereo mix",
                       "obs", "nvidia", "steam streaming")


def _input_score(name: str) -> int:
    low = name.lower()
    if any(h in low for h in VIRTUAL_INPUT_HINTS):
        return -1                                  # never auto-pick these
    score = 0
    if low.startswith("microphone"):
        score += 2                                 # a real capture endpoint
    if any(v in low for v in ("realtek", "intel", "conexant", "amd", "headset",
                              "usb", "array", "built-in")):
        score += 2                                 # real vendor hardware
    return score


SILENT_PEAK = 1e-5          # below this over a full probe window = digital silence


def real_input_candidates(sd):
    """Real microphones, best-named first. Indices shift between runs, so the
    name is the stable signal and the caller must be ready to try the next."""
    out = []
    for idx, dev in enumerate(sd.query_devices()):
        if dev.get("max_input_channels", 0) < 1:
            continue
        s = _input_score(dev["name"])
        if s >= 0:
            out.append((s, idx, dev["name"]))
    out.sort(key=lambda c: -c[0])
    return out


def probe_peak(sd, idx, seconds=1.0):
    """Loudest sample this device produces in `seconds`. 0.0 means it is wired
    to nothing — several Realtek/USB endpoints enumerate but carry no audio."""
    try:
        rec = sd.rec(int(seconds * WHISPER_RATE), samplerate=WHISPER_RATE,
                     channels=1, device=idx, dtype="float32")
        sd.wait()
        return float(np.abs(rec).max())
    except Exception:
        return 0.0


def pick_live_input(sd, seconds=1.0):
    """Choose a microphone that is real AND actually carries audio.

    Name first, then proof. Name alone is not enough: this machine exposes
    several Realtek endpoints (MME / DirectSound / WASAPI, plus an "External"
    one) and only some are wired to the physical mic — landing on a dead one
    gives a listener that logs "ready" and can never hear a thing. Loudness
    alone is not enough either: in a silent room the loudest device is decided
    by noise, and a dead passthrough wins by luck. So: rank by name, then take
    the first candidate that proves it carries signal.
    """
    candidates = real_input_candidates(sd)
    if not candidates:
        log("mic", "no real microphone found — only virtual/passthrough inputs present")
        return None
    measured = []
    for _, idx, nm in candidates:
        peak = probe_peak(sd, idx, seconds)
        measured.append((peak, idx, nm))
        if peak > SILENT_PEAK:
            log("mic", f"selected {nm[:44]} (peak {peak:.4f})")
            return idx
    # Nothing proved live. Say so loudly and take the best-named anyway, so a
    # genuinely silent room still starts rather than refusing to run.
    best = max(measured, key=lambda m: m[0])
    log("mic", "WARNING: no input carried audio during probe — "
               "check the mic is unmuted and input volume is up in Windows Sound settings")
    log("mic", "  probed: " + ", ".join(f"{nm[:26]}={p:.5f}" for p, _, nm in measured[:5]))
    log("mic", f"falling back to {best[2][:40]}")
    return best[1]


def open_stream(sd, device):
    """Open the mic at 16 kHz; fall back to the device's own rate if it refuses."""
    if device is None:
        device = pick_live_input(sd)          # never trust a silent OS default
    info = sd.query_devices(device, "input") if device is not None else sd.query_devices(kind="input")
    for rate in (WHISPER_RATE, int(info["default_samplerate"])):
        try:
            s = sd.InputStream(device=device, samplerate=rate, channels=1, dtype="float32")
            s.start()
            return s, rate, info["name"]
        except Exception as e:
            last = e
    raise last


def calibrate_floor(stream, rate, seconds=1.2):
    """Measure this room on this mic, and return a clap threshold that suits it.

    A fixed MIN_RMS cannot work across hardware: a low-gain laptop mic can peak
    at 0.013 across five seconds, so a 0.012 constant makes a clap physically
    undetectable while every log line still says "ready". Scaling the floor to
    the measured ambient level is the only version that behaves the same on a
    quiet mic and a hot one.
    """
    block = int(rate * BLOCK_MS / 1000)
    levels = []
    for _ in range(max(1, int(seconds * rate / block))):
        try:
            data, _ = stream.read(block)
        except Exception:
            break
        levels.append(rms(np.asarray(data, dtype=np.float32).flatten()))
    if not levels:
        return MIN_RMS, 0.004
    arr = np.array(levels)
    ambient = float(np.percentile(arr, 75))
    # a clap must clear the room comfortably, but the absolute floor stays low
    # enough that quiet hardware is still usable
    min_rms = max(ambient * 4.0, 0.0018)
    return min_rms, max(ambient, 1e-5)


def beep(sd, rate, freq=880.0, ms=90):
    """A cheap 'I'm listening' cue — no audio asset, no API call."""
    try:
        t = np.arange(int(rate * ms / 1000), dtype=np.float32) / rate
        sd.play((0.22 * np.sin(2 * np.pi * freq * t)).astype(np.float32), rate)
        sd.wait()
    except Exception:
        pass


# ----------------------------------------------------------------- jarvis ---

class Jarvis:
    def __init__(self, sd, stream, rate, tiny, small, clap=None, min_rms=None, ptt=False):
        self.sd, self.stream, self.rate = sd, stream, rate
        self.tiny, self.small = tiny, small
        self.block = int(rate * BLOCK_MS / 1000)
        self.clap = clap or ClapDetector()
        self.ptt = bool(ptt) and _PTT_AVAILABLE
        # calibrate_floor() measures THIS mic; without threading its value through
        # here the speech gates below fall back to the module constant, which is
        # exactly the value calibration exists to replace. On a low-gain mic that
        # left the wake word and the spoken "yes" permanently under the bar.
        self.min_rms = MIN_RMS if min_rms is None else min_rms

    # --- audio ---
    def read(self, frames):
        data, _ = self.stream.read(frames)
        return np.asarray(data, dtype=np.float32).reshape(-1)

    def drain(self):
        """Throw away audio buffered while we were busy speaking or thinking —
        stale audio is how a listener triggers itself on its own voice."""
        try:
            while self.stream.read_available > 0:
                self.stream.read(min(self.stream.read_available, self.rate))
        except Exception:
            pass
        self.clap.reset()

    def record(self, seconds):
        want = int(seconds * self.rate)
        got, chunks = 0, []
        while got < want:
            d = self.read(min(self.block * 4, want - got))
            chunks.append(d)
            got += d.size
        return np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)

    def transcribe(self, model, audio):
        audio = to_16k(audio, self.rate)
        if audio.size < WHISPER_RATE // 4:
            return ""
        try:
            out = model.transcribe(audio, language="en", fp16=False)
        except Exception as e:
            log("whisper", f"transcription failed: {str(e)[:120]}")
            return ""
        return (out.get("text") or "").strip()

    def say(self, text):
        speak(text)
        self.drain()

    # --- one interaction ---
    def handle_trigger(self, source):
        log("trigger", f"{source} — listening for {RECORD_S:.0f}s")
        notify_state("listening", source=source)
        beep(self.sd, self.rate)
        self.drain()
        self.dispatch(self.transcribe(self.small, self.record(RECORD_S)))

    def handle_ptt(self):
        """Push-to-talk: record for exactly as long as the key is held.

        The always-on path depends on a chain of tuned thresholds (spike ratio,
        min RMS, ambient calibration, a wake model) and every trigger bug this
        listener has shipped a fix for lives in that chain. A held key has none
        of those failure modes, and it is the only trigger that behaves the same
        in a client's unknown room as it does here. It does NOT replace clap and
        wake word — those stay, because hands-free is the point while teaching.
        """
        log("trigger", f"push-to-talk — recording while {PTT_KEY_NAME} is held")
        notify_state("listening", source="push-to-talk")
        self.drain()
        chunks, frames, cap = [], 0, int(PTT_MAX_S * self.rate)
        while ptt_down() and frames < cap:
            d = self.read(self.block)
            chunks.append(d)
            frames += d.size
        if frames >= cap:
            log("ptt", f"hit the {PTT_MAX_S:.0f}s cap — cutting the recording there")
        audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
        if audio.size < self.rate * 0.3:          # a tap, not a command
            notify_state("idle")
            return
        self.dispatch(self.transcribe(self.small, audio))

    def dispatch(self, transcript):
        """Transcript -> server -> spoken answer. Shared by every trigger so a
        fix to the gate path can never apply to one trigger and not another."""
        if not transcript:
            notify_state("idle")
            return self.say("I didn't catch that. Say it again.")
        log("heard", transcript)
        notify_state("thinking", transcript=transcript)

        resp = post_json("/voice-command", {"transcript": transcript})
        if resp.get("type") == "confirm_required":
            return self.await_confirm(resp)
        self.say(resp.get("text") or resp.get("summary") or "Done.")
        notify_state("idle")

    def await_confirm(self, resp):
        """A gated action. Nothing has run server-side yet and nothing runs here
        without an explicit spoken yes."""
        # `pendingId` FIRST — that is the only key the server actually sends
        # (server.js: voiceReply({type:"confirm_required", pendingId, ...})).
        # Reading only the snake/short aliases made `pending` always falsy, so
        # every gated command died on the "no confirmation handle" branch below
        # and 6 of the 11 voice commands could never run at all. The aliases stay
        # as a tolerance, but the real key leads.
        pending = (resp.get("pendingId") or resp.get("id")
                   or resp.get("pending_id") or resp.get("confirm_id"))
        summary = resp.get("summary") or resp.get("text") or "a gated action"
        if not pending:
            return self.say("That needs approval but I didn't get a confirmation handle. Nothing was done.")
        log("gated", f"pending={pending} :: {summary}")
        notify_state("confirming", summary=summary, id=pending)
        self.say(f"{summary}. Say yes to confirm, or no to cancel.")

        deadline = time.time() + CONFIRM_TIMEOUT_S
        while time.time() < deadline:
            clip = self.record(min(CONFIRM_CHUNK_S, max(0.5, deadline - time.time())))
            if rms(clip) < max(self.clap.noise_floor * SPEECH_RATIO, self.min_rms * 0.5):
                continue                                  # room is quiet, keep waiting
            answer = self.transcribe(self.small, clip)
            if not answer:
                continue
            log("confirm", f"heard: {answer}")
            intent = confirm_intent(answer)
            if intent == "cancel":
                notify_state("idle")
                return self.say("Cancelled. Nothing was sent.")
            if intent == "confirm":
                # field name must match the server exactly: it reads `pendingId`.
                # Sending `id` made every spoken "confirm" resolve to no pending
                # action, so the reply was always "that expired" and nothing ran.
                out = post_json("/voice-command/confirm", {"pendingId": pending})
                notify_state("idle")
                return self.say(out.get("text") or out.get("summary") or "Confirmed and done.")
        notify_state("idle")
        self.say("No confirmation, so I cancelled it. Nothing was sent.")

    # --- main loop ---
    def run(self):
        audio_buf = collections.deque(maxlen=max(1, int(WAKE_BUFFER_S * self.rate / self.block)))
        level_buf = collections.deque(maxlen=audio_buf.maxlen)
        min_speech_blocks = max(1, int(WAKE_MIN_SPEECH_S * 1000 / BLOCK_MS))
        last_wake_check = 0.0
        last_ping = 0.0
        triggers = ['double-clap or say "jarvis"']
        if self.ptt:
            triggers.append(f"hold {PTT_KEY_NAME}")
        log("ready", "listening — " + ", or ".join(triggers) + "   (ctrl+c to stop)")
        notify_state("idle")

        while True:
            block = self.read(self.block)
            now, level = time.monotonic(), rms(block)
            audio_buf.append(block)

            # Heartbeat. notify_state had no call site inside this loop, so a
            # correctly-armed listener emitted nothing and the HUD flipped to
            # "listener quiet" after 45s of normal idle listening — the status
            # light was wrong nearly all the time, which made it worthless.
            if now - last_ping > 20:
                notify_state("idle")
                last_ping = now

            # Push-to-talk is checked first: an explicit held key outranks any
            # heuristic, and it must not have to wait behind the wake-word gate.
            if self.ptt and ptt_down():
                audio_buf.clear(); level_buf.clear()
                self.handle_ptt()
                last_wake_check = last_ping = time.monotonic()
                continue
            level_buf.append(level)

            if self.clap.push(now, level):
                audio_buf.clear(); level_buf.clear()
                self.handle_trigger("double-clap")
                last_wake_check = time.monotonic()
                continue

            # Whisper only runs when the room actually made speech-like noise —
            # an idle quiet room costs nothing but the RMS above.
            if now - last_wake_check < WAKE_INTERVAL_S or len(audio_buf) < audio_buf.maxlen:
                continue
            loud = sum(1 for lv in level_buf if lv > max(self.clap.noise_floor * SPEECH_RATIO, self.min_rms * 0.6))
            if loud < min_speech_blocks:
                continue
            last_wake_check = now
            text = self.transcribe(self.tiny, np.concatenate(list(audio_buf)))
            if text:
                log("wake?", text)
            audio_buf.clear(); level_buf.clear()
            if is_wake_word(text):
                self.handle_trigger("wake word")
                last_wake_check = time.monotonic()


# ------------------------------------------------------------------ main ----

def import_sounddevice():
    try:
        import sounddevice as sd
        return sd
    except OSError as e:      # PortAudio present as a package but not loadable
        sys.exit(f"ERROR: sounddevice loaded but PortAudio failed: {e}\n"
                 "Fix: pip install --force-reinstall sounddevice")
    except ImportError:
        sys.exit("ERROR: 'sounddevice' is not installed — Jarvis has no ear without it.\n"
                 "Fix: pip install -r jarvis/requirements.txt   (or: pip install sounddevice)")


def main():
    ap = argparse.ArgumentParser(description="Jarvis voice listener for the AI OS dashboard")
    ap.add_argument("--list-devices", action="store_true", help="print input devices and exit")
    ap.add_argument("--meter", action="store_true",
                    help="live input meter: shows levels and flags each detected clap, "
                         "so a mic that hears nothing is visible instead of silent")
    ap.add_argument("--device", default=os.environ.get("JARVIS_DEVICE"),
                    help="mic index or name substring (default: system default)")
    ap.add_argument("--model", default=os.environ.get("JARVIS_MODEL", "small"),
                    help="Whisper model for commands (default: small)")
    ap.add_argument("--ptt", action="store_true", default=_envflag("JARVIS_PTT"),
                    help=f"also trigger on push-to-talk: hold {PTT_KEY_NAME} and speak "
                         "(Windows only; no threshold tuning, so it is the reliable "
                         "trigger on unknown hardware)")
    args = ap.parse_args()

    sd = import_sounddevice()
    if args.list_devices:
        print(sd.query_devices())
        return
    device = args.device
    if device is not None and str(device).lstrip("-").isdigit():
        device = int(device)

    here = os.path.dirname(os.path.abspath(__file__))
    load_env_file(os.path.join(os.path.dirname(here), "dashboard", ".env"))

    log("boot", f"dashboard: {BASE_URL}"
                f"{'  (basic auth)' if os.environ.get('DASHBOARD_USER') else ''}")
    stream, rate, name = open_stream(sd, device)
    log("mic", f"{name} @ {rate} Hz"
               f"{'  (resampling to 16k)' if rate != WHISPER_RATE else ''}")
    log("tune", f"spike ratio {SPIKE_RATIO}  ·  record {RECORD_S:.0f}s  ·  confirm window {CONFIRM_TIMEOUT_S:.0f}s")

    if args.meter:
        # Diagnostic mode: no models, no dashboard — just show what the mic hears
        # and whether a clap crosses the bar. Makes a deaf mic obvious in seconds.
        min_rms, ambient = calibrate_floor(stream, rate)
        det = ClapDetector(min_rms=min_rms, noise_floor=ambient)
        log("calib", f"ambient {ambient:.5f} · clap threshold {det.threshold:.5f}")
        print("\n  Speak, then clap twice. Ctrl+C to stop.\n")
        block = int(rate * BLOCK_MS / 1000)
        t, peak_seen, claps = 0.0, 0.0, 0
        try:
            while True:
                data, _ = stream.read(block)
                lvl = rms(np.asarray(data, dtype=np.float32).flatten())
                t += BLOCK_MS / 1000
                peak_seen = max(peak_seen, lvl)
                if det.push(t, lvl):
                    claps += 1
                    print(f"\r  *** DOUBLE CLAP DETECTED  (#{claps}) ***" + " " * 24)
                bars = int(min(1.0, lvl / max(det.threshold * 2, 1e-6)) * 40)
                print(f"\r  {lvl:.5f} |{'#' * bars}{' ' * (40 - bars)}| "
                      f"th={det.threshold:.5f} peak={peak_seen:.5f} claps={claps}", end="", flush=True)
        except KeyboardInterrupt:
            print(f"\n\n  peak seen: {peak_seen:.5f} · threshold: {det.threshold:.5f} · claps: {claps}")
            if peak_seen < 1e-4:
                print("  VERDICT: this input carries no audio — wrong device, or muted in Windows.")
            elif claps == 0:
                print("  VERDICT: audio arrives but no clap matched. Clap harder/faster (0.08-0.6s apart),")
                print("           or lower the bar:  set JARVIS_MIN_RMS=%.5f" % (peak_seen * 0.35))
            else:
                print("  VERDICT: clap detection works on this device.")
        finally:
            stream.stop(); stream.close()
        return

    try:
        import whisper
    except ImportError:
        sys.exit("ERROR: openai-whisper is not installed.\nFix: pip install -r jarvis/requirements.txt")
    log("whisper", "loading tiny (wake word)…")
    tiny = whisper.load_model("tiny")
    log("whisper", f"loading {args.model} (commands)…")
    small = whisper.load_model(args.model)

    tts_client()

    # Calibrate to THIS mic before arming, so the clap threshold reflects the
    # hardware rather than a constant that silently disables detection.
    min_rms, ambient = calibrate_floor(stream, rate)
    clap = ClapDetector(min_rms=min_rms, noise_floor=ambient)
    log("calib", f"ambient {ambient:.5f} · clap threshold {clap.threshold:.5f}"
                 f"{'  (quiet mic — raise Windows input volume for a wider margin)' if min_rms < 0.006 else ''}")

    if args.ptt and not _PTT_AVAILABLE:
        log("ptt", "push-to-talk needs Windows (GetAsyncKeyState) — staying on clap + wake word")
    jarvis = Jarvis(sd, stream, rate, tiny, small, clap=clap, min_rms=min_rms, ptt=args.ptt)
    try:
        jarvis.run()
    except KeyboardInterrupt:
        print()
        log("bye", "listener stopped")
    finally:
        notify_state("offline")
        try:
            stream.stop(); stream.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
