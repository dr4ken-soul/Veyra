from pathlib import Path
import json

ROOT=Path(r"S:\Hackathon\Veyra\video-production")
timing_path=ROOT/"script"/"timings.json"
data=json.loads(timing_path.read_text(encoding="utf-8"))
words=data["words"]
groups=[]
current=[]
def flush():
    if current:
        groups.append(current.copy())
        current.clear()
for word in words:
    if current:
        gap=word["start"]-current[-1]["end"]
        chars=sum(len(w["text"]) for w in current)+len(current)
        punctuation=current[-1]["text"]
        sentence_end=punctuation.endswith((".","?","!"))
        comma_end=punctuation.endswith((",",";"))
        colon_end=punctuation.endswith(":") and (punctuation[:1].isdigit() or punctuation.lower().startswith("paying"))
        if ((gap>1.7 and len(current)>=6)
            or (sentence_end and len(current)>=5)
            or (comma_end and len(current)>=9)
            or (colon_end and len(current)>=5)
            or len(current)>=15
            or chars+len(word["text"])+1>84):
            flush()
    current.append(word)
flush()
# Avoid captions that flicker on a single word: merge short fragments into their neighbor.
i=0
while i<len(groups):
    if len(groups[i])<4 and len(groups)>1:
        if i>0:
            groups[i-1].extend(groups[i])
            del groups[i]
            i=max(0,i-1)
            continue
        else:
            groups[1]=groups[i]+groups[1]
            del groups[i]
            continue
    i+=1
cues=[]
for group in groups:
    start=max(0.0,group[0]["start"]-0.06)
    end=group[-1]["end"]+0.15
    cues.append({"start":round(start,3),"end":round(end,3),"text":" ".join(w["text"] for w in group)})
# Make every caption transition clean and non-overlapping.
for i in range(1,len(cues)):
    if cues[i]["start"]<=cues[i-1]["end"]:
        cues[i-1]["end"]=round(max(cues[i-1]["start"]+0.7,cues[i]["start"]-0.035),3)
data["caption_cues"]=cues
timing_path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
def stamp(v):
    ms=round(v*1000)
    hh,ms=divmod(ms,3600000); mm,ms=divmod(ms,60000); ss,ms=divmod(ms,1000)
    return f"{hh:02}:{mm:02}:{ss:02},{ms:03}"
lines=[]
for i,c in enumerate(cues,1):
    lines.extend([str(i),f'{stamp(c["start"])} --> {stamp(c["end"])}',c["text"],""])
(ROOT/"script"/"captions.srt").write_text("\n".join(lines),encoding="utf-8")
print(f"Created {len(cues)} non-overlapping timed caption cues; last cue ends at {cues[-1]['end']:.2f}s")
