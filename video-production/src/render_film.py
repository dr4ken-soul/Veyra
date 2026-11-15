from __future__ import annotations
import argparse, json, math, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"S:\Hackathon\Veyra\video-production")
ASSETS = ROOT / "assets" / "evidence"
TMP = ROOT / ".tmp"
FINAL = ROOT / "final"
WIDTH, HEIGHT, FPS = 1920, 1080, 24
PAPER = (244, 242, 235)
PAPER2 = (235, 232, 223)
INK = (23, 27, 28)
MUTED = (104, 107, 101)
COPPER = (171, 91, 45)
TEAL = (54, 91, 84)
LINE = (205, 205, 194)
WHITE = (255, 255, 252)
SANS = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 32)
SANS_B = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 32)
SERIF = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", 32)
SERIF_B = ImageFont.truetype(r"C:\Windows\Fonts\georgiab.ttf", 32)
MONO = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 24)
MONO_B = ImageFont.truetype(r"C:\Windows\Fonts\consolab.ttf", 24)
VOICE_PARAGRAPHS = [
"One disputed invoice can begin with a simple question: is this the right company?",
"Veyra turns that question into an evidence case. It keeps the request, source, timestamp and confidence together, so a reviewer can see what is known, what remains uncertain, and why.",
"The live demonstration is a French company lookup. A visitor enters SIREN 632012100 and sees a quote before paying: zero point zero zero five USDC on Base. The visitor approves the exact amount from their own wallet. Veyra never receives the wallet key.",
"Sirenic returns the company profile for L’Oréal, with active registry status. Veyra verifies the provider’s Ed25519 response signature in the browser, and links the result to the public verification receipt.",
"Payment is a separate fact. Base confirms the transaction succeeded in block 57,501,654: precisely 0.005 USDC to the quoted recipient.",
"The signature proves the response came from the provider. The Base receipt proves that payment settled. Neither proves bank account ownership, payment instructions, sanctions status, or solvency. A person still makes the decision.",
"Other scenarios are clearly marked synthetic; shipment data is test mode.",
"Veyra. Evidence for decisions. Human judgement stays in control."
]
SCENE_WEIGHTS = [0.075, 0.125, 0.135, 0.105, 0.155, 0.145, 0.115, 0.075, 0.07]
SCENE_TITLES = [
"Is this the right company?",
"Keep the evidence together.",
"The visitor sees the quote first.",
"One exact approval.",
"The source returns a signed record.",
"Settlement, independently visible.",
"Know what each proof can say.",
"Keep simulated examples labelled.",
"Evidence for decisions."
]
QUOTE = Image.open(ASSETS / "quote-redacted.jpg").convert("RGB")
RESULT = Image.open(ASSETS / "result-redacted.jpg").convert("RGB")
BASE_RECEIPT = Image.open(ASSETS / "base-settlement-redacted.jpg").convert("RGB")
TX_HASH = "0x08af3cf3120fbf221b725f760749dccb05896c1f8d9aaa65a9d44d8c52375bc7"

def ease(p):
    p = max(0.0, min(1.0, p))
    return 1 - (1-p)**3

def text_width(draw, text, font):
    return draw.textbbox((0,0), text, font=font)[2]

def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        test = word if not line else line + " " + word
        if text_width(draw, test, font) <= max_width:
            line = test
        else:
            if line: lines.append(line)
            line = word
    if line: lines.append(line)
    return lines

def draw_wrapped(draw, text, xy, font, fill, max_width, spacing=8):
    x, y = xy
    lines = wrap_text(draw, text, font, max_width)
    draw.multiline_text((x,y), "\n".join(lines), font=font, fill=fill, spacing=spacing)
    return len(lines)

def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def shadow_card(canvas, box, radius=20, fill=WHITE, outline=(220,218,208), shadow=22):
    x0,y0,x1,y1 = [int(v) for v in box]
    pad=max(8,int(shadow))
    local_w=x1-x0+2*pad
    local_h=y1-y0+2*pad
    layer=Image.new("RGBA",(local_w,local_h),(0,0,0,0))
    d=ImageDraw.Draw(layer)
    d.rounded_rectangle((pad+3,pad+shadow//3,pad+(x1-x0)+3,pad+(y1-y0)+shadow//3),
        radius=radius,fill=(24,25,22,34))
    layer=layer.filter(ImageFilter.GaussianBlur(shadow))
    canvas.paste(layer,(x0-pad,y0-pad),layer)
    d=ImageDraw.Draw(canvas)
    d.rounded_rectangle((x0,y0,x1,y1),radius=radius,fill=fill,outline=outline,width=2)

def fit_image(img, max_w, max_h):
    scale = min(max_w/img.width, max_h/img.height)
    size = (int(img.width*scale), int(img.height*scale))
    return img.resize(size, Image.Resampling.LANCZOS)

def paste_card(canvas, img, box, radius=18):
    x0,y0,x1,y1 = [int(v) for v in box]
    shadow_card(canvas, (x0,y0,x1,y1), radius=radius, fill=WHITE, outline=(220,218,208), shadow=24)
    im = fit_image(img, x1-x0-20, y1-y0-20)
    x = x0+(x1-x0-im.width)//2
    y = y0+(y1-y0-im.height)//2
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,im.width-1,im.height-1), radius=max(4,radius-6), fill=255)
    canvas.paste(im, (x,y), mask)
    return (x,y,im.width,im.height)

def draw_bg(canvas, dark=False):
    d = ImageDraw.Draw(canvas)
    canvas.paste(INK if dark else PAPER, (0,0,WIDTH,HEIGHT))
    grid = (39,44,44) if dark else (230,227,218)
    for x in range(0,WIDTH,96):
        d.line((x,0,x,HEIGHT), fill=grid, width=1)
    for y in range(0,HEIGHT,96):
        d.line((0,y,WIDTH,y), fill=grid, width=1)
    # Faint registration marks add print-like depth without distracting from evidence.
    for x,y in [(120,140),(1800,140),(120,850),(1800,850)]:
        d.ellipse((x-4,y-4,x+4,y+4), fill=COPPER if dark else (184,145,112))

def header(canvas, scene, progress, dark=False):
    d = ImageDraw.Draw(canvas)
    fg = (233,229,218) if dark else INK
    faint = (126,132,128) if dark else MUTED
    d.text((118,54), "VEYRA", font=MONO_B, fill=fg)
    d.text((225,55), "EVIDENCE SYSTEMS", font=MONO, fill=faint)
    d.text((1570,55), f"EDITION 02     {scene+1:02d} / 09", font=MONO, fill=faint)
    d.line((118,100,1802,100), fill=(68,74,73) if dark else LINE, width=1)
    d.line((118,1024,1802,1024), fill=(68,74,73) if dark else LINE, width=1)
    d.line((118,1024,118+1684*progress,1024), fill=COPPER, width=4)

def section_label(canvas, text, dark=False):
    d = ImageDraw.Draw(canvas)
    c = (210,148,105) if dark else COPPER
    d.text((120,132), text.upper(), font=MONO, fill=c)

def title(canvas, text, y=174, dark=False, size=61):
    d = ImageDraw.Draw(canvas)
    f = ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf", size)
    d.text((118,y), text, font=f, fill=(247,244,237) if dark else INK)

def caption(canvas, text, dark=False):
    # Persistent, high-contrast two-line narration captions inside a safe title area.
    layer = Image.new("RGBA",(WIDTH,HEIGHT),(0,0,0,0))
    d = ImageDraw.Draw(layer)
    fill=(18,21,22,229) if dark else (250,249,245,238)
    outline=(74,80,78,255) if dark else (204,201,190,255)
    d.rounded_rectangle((118,860,1802,1006), radius=16, fill=fill, outline=outline, width=2)
    font=ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf",25)
    color=(239,237,229) if dark else INK
    lines=wrap_text(d,text,font,1600)
    if len(lines)>3:
        # Keep readable captions; avoid shrinking, split by sentence if needed.
        lines=lines[:3]
        if not lines[-1].endswith("…"): lines[-1]=lines[-1].rstrip(".,;:") + "…"
    line_h=34
    y=871 + max(0,(3-len(lines))*18)
    for line in lines:
        d.text((154,y),line,font=font,fill=color)
        y += line_h
    canvas.paste(layer,(0,0),layer)

def draw_scene(canvas, idx, p, global_p, caption_text=None):
    dark = idx in (0,8)
    draw_bg(canvas,dark)
    header(canvas,idx,global_p,dark)
    d=ImageDraw.Draw(canvas)
    offset=int(70*(1-ease(p)))
    if idx==0:
        section_label(canvas,"A QUESTION BEFORE A DECISION",True)
        title(canvas,"Is this the right company?",172,True,80)
        # Abstract, explicitly illustrative evidence slip.
        shadow_card(canvas,(118+offset,340,1060+offset,760),radius=4,fill=(241,238,229),outline=(207,199,185),shadow=20)
        d=ImageDraw.Draw(canvas)
        d.text((174+offset,388),"ILLUSTRATIVE CASE",font=MONO,fill=COPPER)
        d.text((174+offset,452),"SUPPLIER INVOICE",font=ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf",46),fill=INK)
        d.line((174+offset,524,1000+offset,524),fill=(203,198,187),width=2)
        d.text((174+offset,564),"PAYMENT DETAILS",font=MONO,fill=MUTED)
        rounded(d,(174+offset,618,940+offset,700),8,(232,228,216),outline=(202,197,184),width=2)
        d.text((202+offset,642),"COMPANY ID  ·  NEEDS VERIFICATION",font=MONO,fill=INK)
        # Copper evidence marker links the unanswered field to the question.
        line_x=int(1200+190*ease(p))
        d.line((1040,658,line_x,658),fill=COPPER,width=4)
        d.ellipse((line_x-11,647,line_x+11,669),outline=COPPER,width=3)
        draw_wrapped(d,"A decision is only as strong as the evidence behind it.",(1200,520),SANS,(224,222,214),530,12)
    elif idx==1:
        section_label(canvas,"THE CASE FILE",False)
        title(canvas,"Keep the evidence together.",172,False,62)
        cards=[("01","REQUEST","What needs checking?"),("02","SOURCE","Where did it come from?"),("03","TIME","When was it retrieved?"),("04","CONFIDENCE","What remains uncertain?")]
        xs=[118,548,978,1408]
        for j,(num,lab,desc) in enumerate(cards):
            q=ease((p*1.25-j*0.16))
            x=xs[j]+int((1-q)*90)
            y=360
            shadow_card(canvas,(x,y,x+365,y+275),radius=12,fill=WHITE,outline=(218,215,204),shadow=16)
            d=ImageDraw.Draw(canvas)
            d.text((x+30,y+27),num,font=MONO,fill=COPPER)
            d.text((x+30,y+86),lab,font=MONO_B,fill=INK)
            draw_wrapped(d,desc,(x+30,y+145),SANS,(87,92,86),300,8)
            d.line((x+30,y+232,x+335,y+232),fill=(208,205,195),width=2)
        d=ImageDraw.Draw(canvas)
        d.line((160,744,1740,744),fill=TEAL,width=3)
        for x in (300,730,1160,1590):
            d.ellipse((x-8,736,x+8,752),fill=COPPER)
        d.text((118,790),"CLAIM",font=MONO_B,fill=TEAL)
        d.text((1520,790),"HUMAN REVIEW",font=MONO_B,fill=TEAL)
    elif idx==2:
        section_label(canvas,"LIVE PROVIDER QUOTE",False)
        title(canvas,"The visitor sees the quote first.",172,False,58)
        z=0.94+0.06*ease(p)
        im=QUOTE.resize((int(1560*z),int(505*z)),Image.Resampling.LANCZOS)
        x=(WIDTH-im.width)//2
        y=300+int(34*(1-ease(p)))
        paste_card(canvas,im,(x-10,y-10,x+im.width+10,y+im.height+10),radius=18)
        # Evidence pin for the quoted value.
        d=ImageDraw.Draw(canvas)
        d.rounded_rectangle((1320,242,1790,294),radius=24,fill=TEAL)
        d.text((1350,252),"QUOTE · 0.005 USDC · BASE",font=MONO,fill=WHITE)
    elif idx==3:
        section_label(canvas,"VISITOR-CONTROLLED PAYMENT",False)
        title(canvas,"One exact approval.",172,False,62)
        # Diagram, clearly a flow illustration rather than an invented wallet screen.
        d=ImageDraw.Draw(canvas)
        d.text((120,255),"FLOW DIAGRAM",font=MONO,fill=COPPER)
        nodes=[(320,"VISITOR WALLET","Own funds\nOwn approval"),(960,"EXACT QUOTE","0.005 USDC\nBase Mainnet"),(1600,"SIRENIC API","One registry\nrequest")]
        for j,(cx,lab,body) in enumerate(nodes):
            x0=cx-210; x1=cx+210
            shadow_card(canvas,(x0,340,x1,655),radius=24,fill=WHITE if j<2 else (239,235,226),outline=(211,207,195),shadow=20)
            d=ImageDraw.Draw(canvas)
            # abstract line-art glyph
            if j==0:
                d.rounded_rectangle((cx-26,386,cx+26,430),radius=9,outline=TEAL,width=4)
                d.arc((cx-47,418,cx+47,492),180,360,fill=TEAL,width=4)
            elif j==1:
                d.ellipse((cx-32,386,cx+32,450),outline=COPPER,width=4)
                d.line((cx-17,418,cx+17,418),fill=COPPER,width=3)
                d.line((cx,401,cx,435),fill=COPPER,width=3)
            else:
                d.rectangle((cx-38,387,cx+38,448),outline=TEAL,width=4)
                d.line((cx-23,405,cx+23,405),fill=TEAL,width=3)
                d.line((cx-23,420,cx+23,420),fill=TEAL,width=3)
                d.line((cx-23,435,cx+12,435),fill=TEAL,width=3)
            d.text((cx-145,475),lab,font=MONO_B,fill=INK)
            draw_wrapped(d,body,(cx-145,525),SANS,MUTED,290,8)
        d=ImageDraw.Draw(canvas)
        for a,b in [(530,750),(1170,1390)]:
            d.line((a,500,b,500),fill=LINE,width=6)
            pulse=int(a+(b-a)*ease(p))
            d.polygon([(pulse-13,487),(pulse+13,500),(pulse-13,513)],fill=COPPER)
        # Boundary notes
        rounded(d,(118,705,1802,800),12,(229,235,230),outline=(191,207,198),width=2)
        d.text((154,733),"Veyra never receives the visitor’s wallet key.",font=ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf",33),fill=TEAL)
    elif idx==4:
        section_label(canvas,"LIVE PROVIDER RESPONSE",False)
        title(canvas,"The source returns a signed record.",172,False,57)
        im=RESULT.resize((1530,543),Image.Resampling.LANCZOS)
        pos=paste_card(canvas,im,(185,282,1735,835),radius=18)
        d=ImageDraw.Draw(canvas)
        # restrained verification line; do not cover or alter underlying screen evidence.
        badge_x=1370+int(60*(1-ease(p)))
        rounded(d,(badge_x,245,badge_x+420,297),26,(233,239,233),outline=(178,198,183),width=2)
        d.ellipse((badge_x+17,260,badge_x+35,278),fill=TEAL)
        d.text((badge_x+52,255),"ED25519 · VERIFIED",font=MONO_B,fill=TEAL)
    elif idx==5:
        section_label(canvas,"BASE MAINNET SETTLEMENT RECEIPT",False)
        title(canvas,"Settlement, independently visible.",172,False,56)
        y=330+int(38*(1-ease(p)))
        img=BASE_RECEIPT.resize((1715,340),Image.Resampling.LANCZOS)
        paste_card(canvas,img,(95,y,1825,y+354),radius=16)
        d=ImageDraw.Draw(canvas)
        # block and exact payment repeat as an editorial key/value exhibit.
        rounded(d,(118,735,1802,842),12,(235,238,231),outline=(193,202,189),width=2)
        d.text((152,754),"0.005 USDC",font=MONO_B,fill=TEAL)
        d.text((480,754),"SUCCESS  ·  BLOCK 57,501,654",font=MONO_B,fill=INK)
        d.text((152,801),"TX HASH",font=MONO,fill=MUTED)
        hash_font=ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf",21)
        d.text((300,798),TX_HASH,font=hash_font,fill=INK)
        # small copper scan marker travels along the receipt edge
        marker=int(135+1520*ease(p))
        d.line((marker,704,marker+55,704),fill=COPPER,width=4)
    elif idx==6:
        section_label(canvas,"EVIDENCE BOUNDARIES",False)
        title(canvas,"Know what each proof can say.",172,False,59)
        # Separate, equally weighted evidence rows.
        rows=[
          ("01","SIRENIC SIGNATURE","Response integrity","Does not certify unrelated business facts."),
          ("02","BASE RECEIPT","Payment settlement","Does not prove the commercial claim."),
        ]
        for j,(n,lab,proves,limit) in enumerate(rows):
            y=315+j*205+int(36*(1-ease(p*1.4-j*0.2)))
            shadow_card(canvas,(118,y,1802,y+166),radius=14,fill=WHITE,outline=(218,215,204),shadow=14)
            d=ImageDraw.Draw(canvas)
            d.text((155,y+27),n,font=MONO,fill=COPPER)
            d.text((225,y+24),lab,font=MONO_B,fill=INK)
            d.text((225,y+68),"PROVES",font=MONO,fill=TEAL)
            d.text((385,y+65),proves,font=SANS_B,fill=TEAL)
            d.text((970,y+69),"LIMIT",font=MONO,fill=COPPER)
            draw_wrapped(d,limit,(1100,y+60),SANS,(82,84,79),620,6)
        rounded(d,(118,735,1802,835),12,(42,47,47),outline=(80,86,84),width=2)
        d.text((154,759),"NOT VERIFIED BY THIS LOOKUP",font=MONO_B,fill=(221,157,111))
        d.text((660,754),"Bank ownership · payment instructions · sanctions · solvency",font=SANS,fill=(240,238,230))
    elif idx==7:
        section_label(canvas,"HUMAN REVIEW · EVIDENCE STATUS",False)
        title(canvas,"Keep every boundary visible.",172,False,60)
        labels=[("Supplier change","SIMULATED"),("Shipment status","TEST MODE"),("Business registration","SIMULATED")]
        for j,(name,state) in enumerate(labels):
            q=ease((p*1.35-j*0.18))
            x=118+j*565+int((1-q)*75)
            shadow_card(canvas,(x,360,x+510,630),radius=16,fill=WHITE,outline=(217,214,203),shadow=18)
            d=ImageDraw.Draw(canvas)
            d.text((x+32,401),f"EXAMPLE  0{j+1}",font=MONO,fill=MUTED)
            d.text((x+32,455),name,font=ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf",36),fill=INK)
            rounded(d,(x+32,535,x+305,586),22,(240,230,217),outline=(220,192,164),width=2)
            d.text((x+54,548),state,font=MONO_B,fill=COPPER)
        d=ImageDraw.Draw(canvas)
        d.line((118,738,1802,738),fill=LINE,width=2)
        d.text((118,782),"A PERSON MAKES THE BUSINESS DECISION.",font=MONO_B,fill=TEAL)
    else:
        section_label(canvas,"EDITION 02 · 2026",True)
        # brand mark as a drawn evidence seal
        d=ImageDraw.Draw(canvas)
        cx,cy=960,420
        r=90+int(8*math.sin(p*math.pi))
        d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=COPPER,width=3)
        d.arc((cx-r+18,cy-r+18,cx+r-18,cy+r-18),20,310,fill=(214,207,190),width=2)
        d.line((cx-40,cy+4,cx-8,cy+34,cx+52,cy-39),fill=(224,178,139),width=8,joint="curve")
        f=ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf",96)
        label="VEYRA"
        tw=text_width(d,label,f)
        d.text(((WIDTH-tw)//2,565),label,font=f,fill=(248,245,238))
        f2=ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf",36)
        sub="Evidence for decisions."
        d.text(((WIDTH-text_width(d,sub,f2))//2,700),sub,font=f2,fill=(207,211,203))
        f3=ImageFont.truetype(r"C:\Windows\Fonts\segoeuisl.ttf",30)
        sub2="Human judgement stays in control."
        d.text(((WIDTH-text_width(d,sub2,f3))//2,754),sub2,font=f3,fill=(167,175,168))
        # small proof marks resolve below the title
        for j,label in enumerate(["SOURCE","SIGNATURE","SETTLEMENT"]):
            x=610+j*270
            d.ellipse((x,832,x+12,844),fill=COPPER)
            d.text((x+24,824),label,font=MONO,fill=(164,169,160))
    if caption_text:
        caption(canvas,caption_text,dark)

def probe_duration(path):
    ffprobe = str(ROOT / "tools" / "ffprobe.exe")
    cmd=[ffprobe,"-v","error","-show_entries","format=duration","-of","json",str(path)]
    out=subprocess.check_output(cmd,text=True)
    return float(json.loads(out)["format"]["duration"])

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--voice",required=True)
    ap.add_argument("--music",default=str(ROOT/"audio"/"veyra-original-score.wav"))
    ap.add_argument("--out",default=str(FINAL/"Veyra_Edition02_Motion_Film.mp4"))
    ap.add_argument("--duration",type=float,default=0.0,help="Override complete runtime in seconds")
    args=ap.parse_args()
    TMP.mkdir(parents=True,exist_ok=True); FINAL.mkdir(parents=True,exist_ok=True)
    voice=Path(args.voice)
    duration=args.duration or (probe_duration(voice)+3.5)
    timing=json.loads((ROOT/"script"/"timings.json").read_text(encoding="utf-8"))
    scene_starts=timing["scene_starts"]
    caption_cues=timing["caption_cues"]
    scene_ends=scene_starts[1:]+[duration]
    total_frames=math.ceil(duration*FPS)
    ffmpeg=str(ROOT/"tools"/"ffmpeg.exe")
    picture=TMP/"picture_only.mp4"
    command=[ffmpeg,"-y","-hide_banner","-loglevel","warning",
      "-f","rawvideo","-pix_fmt","rgb24","-s",f"{WIDTH}x{HEIGHT}","-r",str(FPS),"-i","-",
      "-an","-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",str(picture)]
    proc=subprocess.Popen(command,stdin=subprocess.PIPE)
    try:
        for frame_no in range(total_frames):
            t=frame_no/FPS
            g=t/duration
            idx=max(i for i,start in enumerate(scene_starts) if t>=start)
            a,b=scene_starts[idx],scene_ends[idx]
            local=max(0.0,min(1.0,(t-a)/(b-a)))
            active=next((c["text"] for c in caption_cues if c["start"]<=t<=c["end"]),None)
            canvas=Image.new("RGB",(WIDTH,HEIGHT),PAPER)
            draw_scene(canvas,idx,local,g,active)
            proc.stdin.write(canvas.tobytes())
            if frame_no % (FPS*10)==0:
                print(f"Rendered {t:0.1f}/{duration:0.1f}s",flush=True)
    finally:
        if proc.stdin: proc.stdin.close()
    code=proc.wait()
    if code: raise SystemExit(f"ffmpeg picture render failed: {code}")
    Path(args.out).parent.mkdir(parents=True,exist_ok=True)
    shutil_cmd=[ffmpeg,"-y","-hide_banner","-loglevel","warning",
      "-i",str(picture),"-i",str(voice),"-i",args.music,
      "-filter_complex","[1:a]apad=pad_dur=4,asplit=2[vsrc][side];[2:a]volume=0.30[m];[m][side]sidechaincompress=threshold=0.025:ratio=7:attack=15:release=700[duck];[vsrc]loudnorm=I=-16:TP=-1.5:LRA=10[v];[v][duck]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.93,volume=0.89[a]",
      "-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","256k","-shortest","-movflags","+faststart",args.out]
    subprocess.run(shutil_cmd,check=True)
    print(f"Final video: {args.out}")
    print(f"Runtime: {probe_duration(args.out):.2f} sec")

if __name__=="__main__":
    main()
