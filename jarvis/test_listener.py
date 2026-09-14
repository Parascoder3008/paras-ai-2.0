"""Self-check for the pure logic in listener.py — clap pattern, wake word, confirm intent.

No mic, no network, no framework:  python test_listener.py
(listener.py imports sounddevice/whisper lazily, so this runs on a box with neither.)
"""

import listener as L


def claps(*spikes, quiet_between=True, det=None):
    """Replay a timeline of spike times through the detector at 40ms blocks.
    Returns the times a double-clap fired."""
    det = det or L.ClapDetector(noise_floor=0.004)
    fired, t, end = [], 0.0, (max(spikes) + 1.0 if spikes else 1.0)
    step = L.BLOCK_MS / 1000
    while t < end:
        loud = any(abs(t - s) < step / 2 for s in spikes)
        level = 0.30 if loud else (0.002 if quiet_between else 0.09)
        if det.push(t, level):
            fired.append(round(t, 2))
        t += step
    return fired


# --- double clap ------------------------------------------------------------
assert len(claps(0.5, 0.72)) == 1, "two claps 220ms apart should fire once"
assert claps(0.5) == [], "a single clap must not fire"
assert claps(0.5, 2.5) == [], "claps 2s apart are two events, not a double clap"
assert claps(0.5, 0.52) == [], "same clap ringing (20ms) must not count as two"
assert claps(0.5, 1.4) == [], "900ms gap is beyond the double-clap window"
assert len(claps(0.5, 0.7, 3.0, 3.2)) == 2, "two separate double claps both fire"

# a loud room that never drops below the release level cannot spike at all
noisy = L.ClapDetector(noise_floor=0.004)
assert all(not noisy.push(i * 0.04, 0.30) for i in range(50)), "sustained loud audio must not fire"

# the noise floor adapts upward, so a loud room needs a louder clap
adapt = L.ClapDetector(noise_floor=0.004)
for i in range(4000):
    adapt.push(i * 0.04, 0.02)
assert adapt.threshold > L.MIN_RMS, "noise floor should rise in a noisy room"

# --- wake word --------------------------------------------------------------
assert L.is_wake_word("Jarvis, how's the funnel?")
assert L.is_wake_word("hey jarvis")
assert L.is_wake_word(" JARVIS. ")
assert L.is_wake_word("hey jervis are you there"), "common Whisper mishearing"
assert not L.is_wake_word("the jar is empty")
assert not L.is_wake_word("")
assert not L.is_wake_word("send the javascript file")

# --- confirm intent (cancel must win ambiguity) -----------------------------
assert L.confirm_intent("yes") == "confirm"
assert L.confirm_intent("yeah do it") == "confirm"
assert L.confirm_intent("confirm") == "confirm"
assert L.confirm_intent("no") == "cancel"
assert L.confirm_intent("cancel that") == "cancel"
assert L.confirm_intent("no, don't do it") == "cancel", "ambiguous answers must cancel, never send"
assert L.confirm_intent("never mind") == "cancel"
assert L.confirm_intent("") is None
assert L.confirm_intent("what's the weather") is None, "unrelated speech is not consent"
assert L.confirm_intent("yesterday was busy") is None, "'yes' inside a word is not a yes"

# --- resample ---------------------------------------------------------------
import numpy as np

assert L.to_16k(np.zeros(100, dtype=np.float32), 16000).size == 100
assert L.to_16k(np.zeros(4800, dtype=np.float32), 48000).size == 1600
assert L.rms(np.zeros(64, dtype=np.float32)) == 0.0
assert abs(L.rms(np.ones(64, dtype=np.float32)) - 1.0) < 1e-6


# --- push-to-talk -----------------------------------------------------------
# The trigger with no thresholds to tune. It must never latch (GetAsyncKeyState's
# 0x0001 "pressed since last call" bit would), and must degrade to False rather
# than raise on a non-Windows box, so the always-on triggers stay the behaviour.
assert L.ptt_down(0x00) is False, "a bogus virtual-key code must be False, not an exception"
assert isinstance(L.ptt_down(), bool), "ptt_down must always return a bool"
assert L.PTT_VK != 0x20, "push-to-talk must not be bound to space on a machine you type on"
assert L.PTT_MAX_S > 0, "a stuck key must hit a cap instead of recording forever"

# Every trigger has to route through one dispatch, or a fix to the approval-gate
# path applies to some triggers and silently not to others.
assert hasattr(L.Jarvis, "dispatch"), "clap, wake word and PTT must share one dispatch"
assert hasattr(L.Jarvis, "handle_ptt")

# --- the server wire contract -----------------------------------------------
# This exact key mismatch shipped twice, in opposite directions, and each time
# every gated voice command failed silently. Assert both halves here too, so the
# python side fails on its own rather than only in the node suite.
_src = open(L.__file__, encoding="utf-8").read()
assert 'resp.get("pendingId")' in _src, "listener must READ the pendingId the server sends"
assert '"pendingId": pending' in _src, "listener must SEND pendingId back to /voice-command/confirm"

# The spoken-confirm gate must use the calibrated floor, not the module constant
# the calibration exists to replace — otherwise a quiet mic never hears "yes".
assert "self.min_rms * 0.5" in _src, "confirm gate must use the calibrated floor"
assert "self.min_rms * 0.6" in _src, "wake-word gate must use the calibrated floor"

print("all listener self-checks passed")
