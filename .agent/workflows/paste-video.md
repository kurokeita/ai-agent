---
description: Paste a video from clipboard or recent recordings for analysis
---

The user wants to paste a video from their clipboard and answer user query
<task>
{{args}}
</task>

## Clipboard Video Paste
Video Result:
!{gk paste --video}


### Instructions

**CRITICAL: The `!{gk paste --video}` command above has ALREADY executed. Read its output to get the video file path.**

1. **Parse the output above** from `gk paste --video`:
   - Check the exist video for the **exact file path** in the output (e.g., `C:\\Users\\...\\clipboard-video-xxx.mp4` or `.gemini/tmp/clipboard/clipboard-video-xxx.mp4`)
   - Extract the full absolute path - DO NOT guess or use placeholder paths
   - If output shows error, handle the failure case

2. **If successful** (video path found in output above):
   - Use the **EXACT path** from the output in the command below
   - Run: `python .gemini/extensions/multimodal-io/scripts/mmio.py process "<EXACT_PATH_FROM_OUTPUT>" --prompt "<user_query>" --output docs/analysis/video-analysis-YYMMDD-HHMM.md`
   - If no specific query, describe the video content in detail

3. **If failed** (no path in output or error shown):
   - Explain why it failed based on the actual error message
   - Suggest they record a video first
   - Provide platform-specific recording instructions

### Example Success Response

```
Video captured from clipboard!

Saved to: "...\\clipboard\\clipboard-video-123456.mp4"
Size: 2.5 MB
Duration: ~15 seconds

Analyzing video content...

[Video analysis results here]

Would you like me to:
- Describe what happens in the video in more detail
- Extract specific information (UI elements, text, actions)
- Generate code based on the UI shown
- Transcribe any audio/speech
- Something else?
```

### Example Failure Response

```
I couldn't capture a video from your clipboard.

This usually means:
- No video is currently copied
- No recent screen recordings found
- The clipboard tool isn't available

To record a video:
- Windows: Win+Alt+R (Xbox Game Bar) or Win+Shift+R
- macOS: Cmd+Shift+5 (Screen recording)
- Linux: Use OBS or your screen recorder

After recording, run /paste video again.
```

### Video Analysis with multimodal-io

For detailed analysis, use:
```bash
python .gemini/extensions/multimodal-io/scripts/mmio.py process "<video_path>" --prompt "Describe this video in detail"
```

Supported prompts:
- "Describe the UI/UX shown in this video"
- "What actions are being performed?"
- "Transcribe any speech or text visible"
- "Analyze the design elements and layout"

### Saving Analysis Results

After completing the analysis, **always offer to save the results**:

```
Would you like me to save this analysis to a markdown file?

I can create a detailed report with:
- Video path and metadata (duration, size)
- Complete scene-by-scene breakdown
- Transcription of any audio/speech
- UI/UX observations and screenshots
- Extracted code or design specs
- Action items or recommendations

Suggested path: `docs/analysis/video-analysis-YYMMDD-HHMM.md`
```

**When saving**, include:
1. Video path and metadata at the top
2. Timestamp of analysis
3. Scene-by-scene or timeline breakdown
4. All transcriptions and extracted text
5. Code snippets (if UI/code shown)
6. Design recommendations (if applicable)
7. Reference to original video file

**Important:** Video analysis can be lengthy - always save to avoid losing information!

### Python Commands for Analysis

```bash
# Analyze video with multimodal-io
python .gemini/extensions/multimodal-io/scripts/mmio.py process "<video_path>" --prompt "Analyze this video in detail"

# Transcribe video
python .gemini/extensions/multimodal-io/scripts/mmio.py transcribe "<video_path>" --timestamps --output transcript.md

# Save analysis to markdown
python .gemini/extensions/multimodal-io/scripts/mmio.py process "<video_path>" --prompt "Describe UI and interactions" --output docs/analysis/video-analysis.md

# Analyze YouTube video directly
python .gemini/extensions/multimodal-io/scripts/mmio.py process "https://youtube.com/watch?v=VIDEO_ID" --prompt "Summarize this video"
```
