# Veyra Edition 02 motion film

## Deliverables

- Final 1080p film: video-production/final/Veyra_Edition02_Motion_Film.mp4
- Word-timed subtitles, burned into the film and available separately: video-production/final/Veyra_Edition02_Motion_Film.srt
- Voice-over script: video-production/script/voiceover.md
- Full storyboard and claims/privacy notes: video-production/script/storyboard.md
- Motion-render source: video-production/src/render_film.py
- Original soundtrack generator: video-production/src/generate_score.py
- Screenshot sanitisation source: video-production/src/prepare_assets.py
- Subtitle builder and timing source: video-production/src/generate_subtitles.py
- Sanitised live quote, provider response and Base receipt are under video-production/assets/evidence.

The final audio is a British English narration generated with ElevenLabs, voice “Adam Stone - Smooth, Relaxed and Deep,” model eleven_multilingual_v2. The prompt text was removed from the start of the generated take before it was used in the film. The soundtrack is an original programmatic composition written for this film; it is generated from src/generate_score.py, so it has no stock-track dependency. The narration distribution master is audio/voiceover_final.mp3. Uncompressed WAV work masters and alternate generated takes remain locally in the S: project folder and are excluded from Git; the original score WAV is reproducible from src/generate_score.py.

## Rebuild on the S: drive

The production was assembled entirely in S:\Hackathon\Veyra\video-production. Python, Pillow and NumPy must be available. FFmpeg 9 and ffprobe are expected in the local tools directory. Those executables and temporary renders are excluded from source control.

From PowerShell:

    $project = 'S:\Hackathon\Veyra\video-production'
    python "$project\src\prepare_assets.py"
    python "$project\src\generate_subtitles.py"
    python "$project\src\generate_score.py" --duration 110
    python "$project\src\render_film.py" --voice "$project\audio\voiceover_final.mp3"

The render script reads the word-timing JSON, selects the evidence exhibits, composites motion frames, mixes the score below narration, and writes the final MP4. Adjust the score duration if you revise the voice-over. Keep private source captures in the separate S:\Hackathon\Veyra\paid proof folder; the video uses only the included redacted crops.

## Evidence used

The film shows the real visitor-paid French registry lookup for SIREN 632012100. Sirenic’s signed response was verified by Veyra in the browser. Base RPC returned receipt status 0x1 in block 57,501,654 and one transfer of 5,000 Base USDC base units (0.005 USDC) to the same recipient in the visitor’s quote. The public transaction is [0x08af3cf3120fbf221b725f760749dccb05896c1f8d9aaa65a9d44d8c52375bc7](https://basescan.org/tx/0x08af3cf3120fbf221b725f760749dccb05896c1f8d9aaa65a9d44d8c52375bc7).

The Sirenic receipt supports the provider-response signature. The Base receipt supports settlement. Neither is presented as proof of bank-account ownership, payment instructions, sanctions status or solvency. Supplier change and registration cards are labelled synthetic; shipment data is labelled test mode.

The visitor’s abbreviated sender address is masked in the BaseScan exhibit. The original proof folder is not copied into this production bundle.
