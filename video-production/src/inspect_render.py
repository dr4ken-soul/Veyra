from pathlib import Path
import subprocess
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(r"S:\Hackathon\Veyra\video-production")
VIDEO=ROOT/"final"/"Veyra_Edition02_Motion_Film.mp4"
OUT=ROOT/".tmp"/"render-review"
OUT.mkdir(parents=True,exist_ok=True)
ffmpeg=str(ROOT/"tools"/"ffmpeg.exe")
times=[0.5,4,12,25,38,48,62,72,83,96,103,108.5]
thumbs=[]
for i,t in enumerate(times):
    path=OUT/f"frame-{i+1:02d}.jpg"
    cmd=[ffmpeg,"-y","-hide_banner","-loglevel","error","-ss",str(t),"-i",str(VIDEO),"-frames:v","1","-vf","scale=640:360","-q:v","3",str(path)]
    subprocess.run(cmd,check=True)
    im=Image.open(path).convert("RGB")
    thumbs.append((t,im))
sheet=Image.new("RGB",(4*640,3*398),(239,237,230))
d=ImageDraw.Draw(sheet)
font=ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf",18)
for i,(t,im) in enumerate(thumbs):
    x=(i%4)*640; y=(i//4)*398
    sheet.paste(im,(x,y))
    d.rectangle((x,y+360,x+640,y+398),fill=(25,29,29))
    d.text((x+16,y+369),f"FRAME {i+1:02d}   {t:05.1f}s",font=font,fill=(238,234,222))
contact=OUT/"contact-sheet.jpg"
sheet.save(contact,quality=92)
print(f"Contact sheet: {contact}")
print("Sample times:",", ".join(map(str,times)))
