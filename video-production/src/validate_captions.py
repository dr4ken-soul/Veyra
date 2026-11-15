from pathlib import Path
import json
from PIL import ImageFont, ImageDraw, Image
root=Path(r"S:\Hackathon\Veyra\video-production")
data=json.loads((root/"script"/"timings.json").read_text(encoding="utf-8"))
font=ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf",25)
draw=ImageDraw.Draw(Image.new("RGB",(1920,1080)))
bad=[]
for cue in data["caption_cues"]:
    words=cue["text"].split()
    lines=[]; line=""
    for word in words:
        candidate=word if not line else line+" "+word
        if draw.textbbox((0,0),candidate,font=font)[2]<=1600: line=candidate
        else: lines.append(line); line=word
    if line: lines.append(line)
    if len(lines)>3: bad.append((cue["start"],len(lines),cue["text"]))
print(f"Caption cues: {len(data['caption_cues'])}; overflow cues: {len(bad)}")
for row in bad: print(row)
