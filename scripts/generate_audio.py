import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import wave
import numpy as np

SAMPLE_RATE = 22050
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "audio")
VOICES_DIR = os.path.join(OUT_DIR, "voices")
SFX_DIR = os.path.join(OUT_DIR, "sfx")
BGM_DIR = os.path.join(OUT_DIR, "bgm")

# Character voice profiles: pitch factor (>1 higher, <1 deeper), rate (-4..+3), echo, reverb, sting freq
VOICE_CONFIG = {
    "vikas_guru": {
        "pitch": 0.80,
        "rate": -2,
        "special_rate": -3,
        "echo": 0.42,
        "reverb": 0.55,
        "sting": "shankh_brass",
        "lines": {
            "select": "Mitron! Ready for the masterstroke!",
            "intro": "Bhaiyon aur Beheno, let the debate begin!",
            "attack1": "Vikas!",
            "attack2": "Demonetize!",
            "hit": "Fake news!",
            "win": "Another historic mandate achieved!",
            "lose": "The teleprompter lost signal!",
            "special": "Angein Ghatram... Nainave Aatram... Nyaye Na Rajyam!",
        },
    },
    "yuva_prince": {
        "pitch": 1.08,
        "rate": 1,
        "special_rate": 0,
        "echo": 0.25,
        "reverb": 0.25,
        "sting": "alchemy_sparkle",
        "lines": {
            "select": "Insert potato, extract victory!",
            "intro": "This is a shop of love, not hatred!",
            "attack1": "Khatakhat!",
            "attack2": "Escape velocity!",
            "hit": "Maza nahi aaya!",
            "win": "Khatakhat victory, straight to the bank!",
            "lose": "Let me check my notes again!",
            "special": "Idhar se aloo daalo, udhar se sona nikalo!",
        },
    },
    "muffler_man": {
        "pitch": 1.18,
        "rate": 2,
        "special_rate": 1,
        "echo": 0.22,
        "reverb": 0.20,
        "sting": "broom_whoosh",
        "lines": {
            "select": "Sab mile hue hain ji! Let us sweep!",
            "intro": "Free Wi-Fi, free water, and free uppercuts!",
            "attack1": "Jhadu!",
            "attack2": "Odd even!",
            "hit": "Ahem! Conspiracy!",
            "win": "Clean sweep in every constituency!",
            "lose": "Blame the Governor!",
            "special": "Jhadu Tornado! Sab saaf kar denge!",
        },
    },
    "didi_storm": {
        "pitch": 1.03,
        "rate": 2,
        "special_rate": 1,
        "echo": 0.28,
        "reverb": 0.30,
        "sting": "thunder_whip",
        "lines": {
            "select": "Khela Hobe! Step into the ring!",
            "intro": "Do not test Bengal thunder!",
            "attack1": "Hamba!",
            "attack2": "Ramba!",
            "hit": "Ei ki hochhe!",
            "win": "Khela sesh! Total knockout!",
            "lose": "Demand a recount immediately!",
            "special": "Khela Hobe! Maa Mati Manush Strike!",
        },
    },
    "thalaivaa_boss": {
        "pitch": 0.85,
        "rate": 0,
        "special_rate": -1,
        "echo": 0.38,
        "reverb": 0.42,
        "sting": "cinema_horn",
        "lines": {
            "select": "En vazhi, thani vazhi! My way only!",
            "intro": "Mind it! Box office opens right now!",
            "attack1": "Mass!",
            "attack2": "Thalaivaa!",
            "hit": "Just a scratch on the shades!",
            "win": "Superhit! Housefull across the nation!",
            "lose": "Post credit scene awaits!",
            "special": "Anna varaar! Mass Blockbuster Slam!",
        },
    },
    "bulldozer_baba": {
        "pitch": 0.76,
        "rate": -2,
        "special_rate": -2,
        "echo": 0.30,
        "reverb": 0.35,
        "sting": "diesel_slam",
        "lines": {
            "select": "Start the engine! Clear the encroachment!",
            "intro": "Law and order arrives on caterpillar tracks!",
            "attack1": "Smash!",
            "attack2": "Demolish!",
            "hit": "Armor holds firm!",
            "win": "Zone cleared! Order restored!",
            "lose": "Out of diesel!",
            "special": "Bulldozer Justice! Rasta saaf karo!",
        },
    },
    "chara_king": {
        "pitch": 0.91,
        "rate": -1,
        "special_rate": -1,
        "echo": 0.25,
        "reverb": 0.28,
        "sting": "lantern_blaze",
        "lines": {
            "select": "Ee ka bol diye! Light the lantern!",
            "intro": "When the lantern glows, the opposition folds!",
            "attack1": "Burrr!",
            "attack2": "Lalten!",
            "hit": "Arre baap re!",
            "win": "Samosa party for the whole village!",
            "lose": "Kerosene finished, bhaiya!",
            "special": "Lalten Express! Jalwa dikha do!",
        },
    },
    "chanakya_x": {
        "pitch": 0.94,
        "rate": 0,
        "special_rate": -1,
        "echo": 0.35,
        "reverb": 0.40,
        "sting": "matrix_pulse",
        "lines": {
            "select": "Chronology samajhiye. Every move is calculated.",
            "intro": "You already lost three turns ago.",
            "attack1": "Check!",
            "attack2": "Chronology!",
            "hit": "Tactical sacrifice!",
            "win": "Majority secured at midnight!",
            "lose": "Reshuffling the cabinet.",
            "special": "Masterstroke Matrix! Checkmate in three moves!",
        },
    },
    "hakla": {
        "pitch": 1.12,
        "rate": 1,
        "special_rate": 0,
        "echo": 0.32,
        "reverb": 0.35,
        "sting": "thunder_whip",
        "lines": {
            "select": "H-H-Hakla reporting for duty!",
            "intro": "Get ready for the sonic stutter storm!",
            "attack1": "Ha-Ha!",
            "attack2": "B-Boom!",
            "hit": "Arre ruko!",
            "win": "Total Hakla supremacy!",
            "lose": "Voice cracked mid-debate!",
            "special": "Hakla Sonic Stutter Activated!",
        },
    },
    "samrat_ordinance": {
        "pitch": 0.72,
        "rate": -2,
        "special_rate": -3,
        "echo": 0.50,
        "reverb": 0.65,
        "sting": "boss_apocalypse",
        "lines": {
            "select": "Bow before the Supreme Ordinance!",
            "intro": "I am the House, the Senate, and the Veto!",
            "attack1": "Veto!",
            "attack2": "Overruled!",
            "hit": "Impeachment denied!",
            "win": "Emergency declared! Kneel to the Sovereign!",
            "lose": "Impossible! The coalition has dissolved!",
            "special": "Supreme Ordinance Meteor! Article Zero Activated!",
        },
    },
}


def read_wav_mono(path: str) -> np.ndarray:
    with wave.open(path, "rb") as wf:
        ch = wf.getnchannels()
        sw = wf.getsampwidth()
        sr = wf.getframerate()
        raw = wf.readframes(wf.getnframes())
    if sw == 2:
        data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    else:
        data = (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    if ch > 1:
        data = data.reshape(-1, ch).mean(axis=1)
    if sr != SAMPLE_RATE:
        old_idx = np.linspace(0, len(data) - 1, num=len(data))
        new_len = max(1, int(len(data) * SAMPLE_RATE / sr))
        new_idx = np.linspace(0, len(data) - 1, num=new_len)
        data = np.interp(new_idx, old_idx, data).astype(np.float32)
    return data


def write_wav_mono(path: str, samples: np.ndarray) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    peak = np.max(np.abs(samples)) if len(samples) > 0 else 1.0
    if peak > 0.92:
        samples = samples * (0.92 / peak)
    pcm = np.clip(samples * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())


def pitch_shift_simple(audio: np.ndarray, factor: float) -> np.ndarray:
    if abs(factor - 1.0) < 0.02 or len(audio) < 64:
        return audio
    # Resample pitch while keeping expressive cadence
    new_len = max(1, int(len(audio) / factor))
    x_old = np.linspace(0, 1, len(audio))
    x_new = np.linspace(0, 1, new_len)
    return np.interp(x_new, x_old, audio).astype(np.float32)


def add_echo_and_reverb(audio: np.ndarray, echo_amt: float, reverb_amt: float) -> np.ndarray:
    tail = int(SAMPLE_RATE * 0.9)
    out = np.zeros(len(audio) + tail, dtype=np.float32)
    out[: len(audio)] += audio

    # Multi-tap echo
    taps = [(0.16, echo_amt * 0.65), (0.33, echo_amt * 0.40), (0.52, echo_amt * 0.22)]
    for delay_sec, gain in taps:
        d = int(delay_sec * SAMPLE_RATE)
        if d < len(out):
            end = min(len(out), d + len(audio))
            out[d:end] += audio[: end - d] * gain

    # Dense Schroeder-style short reflections for cathedral reverb
    if reverb_amt > 0.05:
        reverb_delays = [0.029, 0.043, 0.061, 0.089, 0.117, 0.149]
        for i, rd in enumerate(reverb_delays):
            d = int(rd * SAMPLE_RATE)
            g = reverb_amt * (0.28 / (1 + i * 0.35))
            end = min(len(out), d + len(audio))
            out[d:end] += audio[: end - d] * g

    # Trim trailing silence safely
    thresh = 0.004
    nonzero = np.where(np.abs(out) > thresh)[0]
    if len(nonzero) > 0:
        end_idx = min(len(out), nonzero[-1] + int(SAMPLE_RATE * 0.15))
        out = out[:end_idx]
    return out


def make_special_sting(kind: str, n: int) -> np.ndarray:
    duration_sec = n / SAMPLE_RATE
    t = np.linspace(0, duration_sec, n, dtype=np.float32)
    env = np.exp(-t * 1.4)
    sub = np.sin(2 * math.pi * 55 * t) * np.exp(-t * 2.5) * 0.35

    if kind == "shankh_brass":
        # Dramatic brass/shankh swell + resonant gong
        f = 196.0 + 18.0 * np.sin(2 * math.pi * 3.5 * t)
        brass = (np.sin(2 * math.pi * f * t) + 0.5 * np.sin(4 * math.pi * f * t)) * 0.22
        swell = np.minimum(1.0, t / 0.25) * np.exp(-t * 0.8)
        return (brass * swell + sub * 1.2).astype(np.float32)
    elif kind == "alchemy_sparkle":
        arpeggio = sum(
            np.sin(2 * math.pi * (440 * (1.25 ** i)) * t) * np.exp(-np.maximum(0, t - i * 0.12) * 5.0) * (t >= i * 0.12)
            for i in range(6)
        )
        return (arpeggio * 0.18 + sub).astype(np.float32)
    elif kind == "broom_whoosh":
        noise = np.random.default_rng(42).normal(0, 0.22, n).astype(np.float32)
        mod = 0.5 + 0.5 * np.sin(2 * math.pi * 5.0 * t)
        return (noise * mod * env + sub).astype(np.float32)
    elif kind == "thunder_whip":
        crack = np.random.default_rng(99).normal(0, 0.4, n).astype(np.float32) * np.exp(-t * 10.0)
        rumble = np.sin(2 * math.pi * 72 * t) * np.exp(-t * 1.8) * 0.35
        return (crack + rumble).astype(np.float32)
    elif kind == "cinema_horn":
        chord = (
            np.sin(2 * math.pi * 220 * t)
            + np.sin(2 * math.pi * 277.18 * t)
            + np.sin(2 * math.pi * 329.63 * t)
        ) * 0.14 * env
        return (chord + sub).astype(np.float32)
    elif kind == "diesel_slam":
        chug = np.sign(np.sin(2 * math.pi * 48 * t)) * 0.18 * np.exp(-t * 1.5)
        impact = np.sin(2 * math.pi * (120 * np.exp(-t * 6) + 40) * t) * np.exp(-t * 4.0) * 0.45
        return (chug + impact).astype(np.float32)
    elif kind == "lantern_blaze":
        flare = np.random.default_rng(17).normal(0, 0.18, n).astype(np.float32) * np.exp(-t * 2.2)
        tone = np.sin(2 * math.pi * 293.66 * t) * np.exp(-t * 3.0) * 0.25
        return (flare + tone + sub).astype(np.float32)
    elif kind == "matrix_pulse":
        arp = np.sin(2 * math.pi * (330 + 220 * np.sin(2 * math.pi * 8 * t)) * t) * 0.16 * env
        return (arp + sub).astype(np.float32)
    else:  # boss_apocalypse
        doom = (
            np.sin(2 * math.pi * 65.4 * t)
            + 0.7 * np.sin(2 * math.pi * 98.0 * t)
            + 0.5 * np.sin(2 * math.pi * 138.6 * t)
        ) * 0.22 * np.exp(-t * 0.9)
        return (doom + sub * 1.4).astype(np.float32)


def generate_voices():
    tmp_dir = tempfile.mkdtemp(prefix="nk_voices_")
    try:
        manifest = []
        ps_lines = [
            "Add-Type -AssemblyName System.Speech",
            "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
            "$synth.SelectVoice('Microsoft Zira Desktop')",
        ]
        for char_id, cfg in VOICE_CONFIG.items():
            for slot, text in cfg["lines"].items():
                raw_path = os.path.join(tmp_dir, f"{char_id}_{slot}.wav")
                rate = cfg["special_rate"] if slot == "special" else cfg["rate"]
                safe_text = text.replace("'", "''")
                safe_path = raw_path.replace("'", "''")
                ps_lines.append(f"$synth.Rate = {rate}")
                ps_lines.append(f"$synth.SetOutputToWaveFile('{safe_path}')")
                ps_lines.append(f"$synth.Speak('{safe_text}')")
                manifest.append((char_id, slot, raw_path, cfg))

        ps_lines.append("$synth.Dispose()")
        ps_script = os.path.join(tmp_dir, "tts.ps1")
        with open(ps_script, "w", encoding="utf-8") as f:
            f.write("\n".join(ps_lines))

        subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps_script],
            check=True,
        )

        for char_id, slot, raw_path, cfg in manifest:
            dry = read_wav_mono(raw_path)
            shifted = pitch_shift_simple(dry, cfg["pitch"])

            if slot == "special":
                # Boss gets extra demonic harmonic layer
                if char_id == "samrat_ordinance":
                    low_layer = pitch_shift_simple(dry, 0.58)
                    m = min(len(shifted), len(low_layer))
                    shifted = shifted[:m] * 0.75 + low_layer[:m] * 0.55

                processed = add_echo_and_reverb(shifted, cfg["echo"] * 1.45, cfg["reverb"] * 1.45)
                sting = make_special_sting(cfg["sting"], len(processed))
                out = processed * 0.92 + sting * 0.52
            else:
                processed = add_echo_and_reverb(shifted, cfg["echo"] * 0.45, cfg["reverb"] * 0.45)
                out = processed

            out_path = os.path.join(VOICES_DIR, char_id, f"{slot}.wav")
            # Preserve custom extracted recordings for Mitron and Hakla special attacks unless --force is passed
            if char_id in ("vikas_guru", "hakla") and slot == "special" and os.path.exists(out_path) and "--force" not in sys.argv:
                print(f"Preserved custom recording: {char_id}/{slot}.wav")
                continue
            write_wav_mono(out_path, out)
            print(f"Generated voice: {char_id}/{slot}.wav")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def generate_sfx():
    os.makedirs(SFX_DIR, exist_ok=True)
    rng = np.random.default_rng(123)

    # Punch
    t = np.linspace(0, 0.16, int(SAMPLE_RATE * 0.16), dtype=np.float32)
    punch = np.sin(2 * math.pi * (240 * np.exp(-t * 28) + 65) * t) * np.exp(-t * 24)
    punch += rng.normal(0, 0.3, len(t)).astype(np.float32) * np.exp(-t * 36)
    write_wav_mono(os.path.join(SFX_DIR, "punch.wav"), punch)

    # Kick
    t = np.linspace(0, 0.24, int(SAMPLE_RATE * 0.24), dtype=np.float32)
    kick = np.sin(2 * math.pi * (190 * np.exp(-t * 20) + 50) * t) * np.exp(-t * 16) * 0.9
    kick += rng.normal(0, 0.35, len(t)).astype(np.float32) * np.exp(-t * 26)
    write_wav_mono(os.path.join(SFX_DIR, "kick.wav"), kick)

    # Uppercut / Crit
    t = np.linspace(0, 0.34, int(SAMPLE_RATE * 0.34), dtype=np.float32)
    crit = np.sin(2 * math.pi * (420 * np.exp(-t * 10) + 90) * t) * np.exp(-t * 11)
    crit += rng.normal(0, 0.4, len(t)).astype(np.float32) * np.exp(-t * 18)
    write_wav_mono(os.path.join(SFX_DIR, "crit.wav"), crit)

    # Block (metallic clank)
    t = np.linspace(0, 0.14, int(SAMPLE_RATE * 0.14), dtype=np.float32)
    block = (np.sin(2 * math.pi * 620 * t) + 0.6 * np.sin(2 * math.pi * 980 * t)) * np.exp(-t * 28) * 0.55
    write_wav_mono(os.path.join(SFX_DIR, "block.wav"), block)

    # Grab
    t = np.linspace(0, 0.28, int(SAMPLE_RATE * 0.28), dtype=np.float32)
    grab = np.sin(2 * math.pi * (140 + 180 * t) * t) * np.exp(-t * 10) * 0.7
    write_wav_mono(os.path.join(SFX_DIR, "grab.wav"), grab)

    # KO Gong
    t = np.linspace(0, 1.4, int(SAMPLE_RATE * 1.4), dtype=np.float32)
    ko = (
        np.sin(2 * math.pi * 110 * t)
        + 0.7 * np.sin(2 * math.pi * 165 * t)
        + 0.4 * np.sin(2 * math.pi * 246 * t)
    ) * np.exp(-t * 2.2) * 0.55
    write_wav_mono(os.path.join(SFX_DIR, "ko.wav"), ko)

    # Countdown beep & Fight horn
    t = np.linspace(0, 0.15, int(SAMPLE_RATE * 0.15), dtype=np.float32)
    beep = np.sin(2 * math.pi * 587.33 * t) * np.exp(-t * 16) * 0.5
    write_wav_mono(os.path.join(SFX_DIR, "countdown.wav"), beep)

    t = np.linspace(0, 0.45, int(SAMPLE_RATE * 0.45), dtype=np.float32)
    fight = (np.sin(2 * math.pi * 440 * t) + np.sin(2 * math.pi * 659.25 * t)) * np.exp(-t * 5.0) * 0.45
    write_wav_mono(os.path.join(SFX_DIR, "fight.wav"), fight)

    # UI click
    t = np.linspace(0, 0.06, int(SAMPLE_RATE * 0.06), dtype=np.float32)
    ui = np.sin(2 * math.pi * 880 * t) * np.exp(-t * 45) * 0.35
    write_wav_mono(os.path.join(SFX_DIR, "ui_click.wav"), ui)
    print("Generated all SFX WAVs")


def synth_bgm_loop(name: str, bpm: int, scale_freqs: list[float], bars: int = 4, aggressive: bool = False):
    os.makedirs(BGM_DIR, exist_ok=True)
    beat_sec = 60.0 / bpm
    step_sec = beat_sec / 2.0  # eighth notes
    total_steps = bars * 8
    total_samples = int(total_steps * step_sec * SAMPLE_RATE)
    out = np.zeros(total_samples, dtype=np.float32)

    for step in range(total_steps):
        s_idx = int(step * step_sec * SAMPLE_RATE)
        dur = int(step_sec * 0.9 * SAMPLE_RATE)
        end = min(total_samples, s_idx + dur)
        t = np.linspace(0, (end - s_idx) / SAMPLE_RATE, end - s_idx, dtype=np.float32)

        # Bassline
        bass_freq = scale_freqs[step % 4] * 0.5
        bass = (np.sin(2 * math.pi * bass_freq * t) + 0.35 * np.sign(np.sin(2 * math.pi * bass_freq * t))) * np.exp(-t * 7.0) * 0.18
        out[s_idx:end] += bass

        # Lead melody (Desi synth / raga-inspired arcade motif)
        if step % 2 == 0 or aggressive:
            mel_freq = scale_freqs[(step * 3 + (step // 4)) % len(scale_freqs)] * (2.0 if step % 8 == 6 else 1.0)
            lead = np.sin(2 * math.pi * mel_freq * t) * np.exp(-t * 8.0) * 0.14
            out[s_idx:end] += lead

        # Percussion (kick on 0, 4; tabla/snare on 2, 6)
        if step % 4 == 0:
            k = np.sin(2 * math.pi * (150 * np.exp(-t * 25) + 48) * t) * np.exp(-t * 18) * 0.30
            out[s_idx:end] += k
        elif step % 4 == 2:
            sn = np.sin(2 * math.pi * 240 * t) * np.exp(-t * 22) * 0.16
            out[s_idx:end] += sn

    write_wav_mono(os.path.join(BGM_DIR, f"{name}.wav"), out)
    print(f"Generated BGM: {name}.wav")


if __name__ == "__main__":
    generate_voices()
    generate_sfx()
    # Bhairav/arcade-inspired energetic scales
    synth_bgm_loop("bgm_menu", bpm=118, scale_freqs=[220.0, 233.08, 277.18, 293.66, 329.63, 349.23, 415.30], bars=4, aggressive=False)
    synth_bgm_loop("bgm_fight", bpm=142, scale_freqs=[220.0, 246.94, 277.18, 329.63, 349.23, 415.30, 440.0], bars=4, aggressive=True)
    synth_bgm_loop("bgm_boss", bpm=156, scale_freqs=[196.0, 207.65, 246.94, 293.66, 311.13, 369.99, 392.0], bars=4, aggressive=True)
