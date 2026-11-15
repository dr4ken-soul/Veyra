from __future__ import annotations
import argparse, math, wave
from pathlib import Path
import numpy as np

ROOT = Path(r"S:\Hackathon\Veyra\video-production")
SR = 48000

def midi(n): return 440.0 * (2.0 ** ((n-69)/12.0))

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--duration",type=float,default=90.0)
    p.add_argument("--out",default=str(ROOT/"audio"/"veyra-original-score.wav"))
    a=p.parse_args()
    ROOT.joinpath("audio").mkdir(parents=True,exist_ok=True)
    n=int(SR*a.duration)
    t=np.arange(n,dtype=np.float64)/SR
    left=np.zeros(n,dtype=np.float64)
    right=np.zeros(n,dtype=np.float64)
    # Original four-chord, calm documentary progression in C: Cadd9, Am7, Fmaj7, Gsus2.
    chords=[[48,55,60,62,64,67],[45,52,57,60,64,67],[41,48,53,57,60,64],[43,50,55,57,62,67]]
    roots=[36,33,29,31]
    bar=12.0
    for k,midis in enumerate(chords):
        start=k*bar
        region=(t>=start)&(t<start+bar)
        idx=np.where(region)[0]
        if not len(idx): continue
        local=t[idx]-start
        # Broad, breathing pad with a gentle overlap across chord changes.
        env=np.sin(np.minimum(1.0,local/3.6)*math.pi/2)**1.4
        env*=np.sin(np.minimum(1.0,(bar-local)/3.2)*math.pi/2)**1.2
        for j,m in enumerate(midis):
            f=midi(m)
            amp=(0.016 if j<3 else 0.010)
            phase=2*math.pi*f*local
            tone=np.sin(phase)+0.23*np.sin(2*phase)+0.07*np.sin(3*phase)
            left[idx]+=amp*env*tone
            right[idx]+=amp*env*np.sin(phase+0.18*j)+amp*0.23*env*np.sin(2*phase+0.25)
        # Soft low-note swells anchor each chord.
        rootf=midi(roots[k])
        bass=np.sin(2*math.pi*rootf*local)+0.15*np.sin(4*math.pi*rootf*local)
        left[idx]+=0.034*env*bass
        right[idx]+=0.032*env*np.sin(2*math.pi*rootf*local+0.2)
    # Sparse piano-like plucks, one per second, with a repeating, restrained motif.
    motif=[72,76,79,83,79,76,74,79,84,81,76,79,74,77,81,84]
    beats_per_note=1.0
    for beat, start in enumerate(np.arange(0,a.duration,beats_per_note)):
        note=motif[beat%len(motif)]
        f=midi(note)
        i0=int(start*SR)
        i1=min(n,i0+int(1.7*SR))
        local=np.arange(i1-i0,dtype=np.float64)/SR
        attack=np.minimum(1.0,local/0.012)
        decay=np.exp(-local/0.72)
        amp=0.022*(0.72+0.28*math.sin(beat*0.7))
        signal=(np.sin(2*math.pi*f*local)+0.28*np.sin(2*math.pi*2*f*local))*attack*decay*amp
        pan=0.5+0.35*math.sin(beat*0.9)
        left[i0:i1]+=signal*math.sqrt(1-pan)
        right[i0:i1]+=signal*math.sqrt(pan)
    # Very quiet soft pulse on a slow four-beat, not a click track.
    for start in np.arange(0,a.duration,2.0):
        i0=int(start*SR)
        i1=min(n,i0+int(0.22*SR))
        local=np.arange(i1-i0,dtype=np.float64)/SR
        thump=(np.sin(2*math.pi*(70-22*local/0.22)*local)*np.exp(-local/0.065))*0.018
        left[i0:i1]+=thump
        right[i0:i1]+=thump*0.94
    # Gentle stereo drift and long fade; keep headroom for speech.
    fade=np.clip(t/2.0,0,1)*np.clip((a.duration-t)/3.5,0,1)
    left*=fade; right*=fade
    peak=max(np.max(np.abs(left)),np.max(np.abs(right)),1e-8)
    target_peak=0.24
    gain=target_peak/peak
    left=np.clip(left*gain,-0.98,0.98)
    right=np.clip(right*gain,-0.98,0.98)
    stereo=np.column_stack((left,right))
    pcm=(stereo*32767).astype("<i2")
    out=Path(a.out)
    out.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(out),"wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
    rms=float(np.sqrt(np.mean(stereo**2)))
    print(f"Wrote original score: {out} ({a.duration:.2f}s, {SR} Hz stereo, RMS {rms:.4f})")

if __name__=="__main__": main()
