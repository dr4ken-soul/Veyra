from pathlib import Path
import subprocess
from PIL import Image,ImageDraw,ImageFont
root=Path(r"S:\Hackathon\Veyra\video-production")
video=root/"final"/"Veyra_Edition02_Motion_Film.mp4"
out=root/".tmp"/"full-review"
frames=out/"frames"; frames.mkdir(parents=True,exist_ok=True)
ffmpeg=str(root/"tools"/"ffmpeg.exe")
subprocess.run([ffmpeg,"-y","-hide_banner","-loglevel","error","-i",str(video),"-vf","fps=1,scale=480:270","-q:v","4",str(frames/"f-%03d.jpg")],check=True)
files=sorted(frames.glob("f-*.jpg"))
font=ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf",16)
per_sheet=20; cols=4; cell_w=480; image_h=270; label_h=28; rows=5
for batch in range((len(files)+per_sheet-1)//per_sheet):
    chunk=files[batch*per_sheet:(batch+1)*per_sheet]
    sheet=Image.new("RGB",(cols*cell_w,rows*(image_h+label_h)),(244,242,235))
    d=ImageDraw.Draw(sheet)
    for k,file in enumerate(chunk):
        sec=batch*per_sheet+k
        im=Image.open(file).convert("RGB")
        x=(k%cols)*cell_w; y=(k//cols)*(image_h+label_h)
        sheet.paste(im,(x,y))
        d.rectangle((x,y+image_h,x+cell_w,y+image_h+label_h),fill=(25,29,29))
        d.text((x+12,y+image_h+5),f"{sec:03d}s",font=font,fill=(241,237,226))
    target=out/f"review-{batch+1:02d}.jpg"
    sheet.save(target,quality=90)
    print(target)
print(f"Full-rate visual review: {len(files)} frames at 1 fps across {len(files)} seconds")
