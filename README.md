# red2video

Convert Reddit posts into AI-generated short-form videos. Paste a Reddit URL and get a ready-to-upload MP4 with AI voiceover, generated images, and animated captions — in minutes.

## How It Works

1. **Fetch** — Paste any Reddit post URL to extract the post and top comments
2. **Script** — Claude AI converts the content into a structured video script with scene-by-scene narration and image prompts
3. **Characters** — AI extracts character descriptions for visual consistency across scenes
4. **Audio** — OpenAI TTS generates voiceover for each scene (6 voice options)
5. **Images** — DALL-E 3 or SeeDream generates an image per scene
6. **Render** — Remotion renders everything into an MP4 with animated title card, scene transitions, and outro
7. **Metadata** — Claude generates YouTube-optimized titles, description, and tags

Supports **16:9** (YouTube), **9:16** (Shorts/TikTok/Reels), and **1:1** (Instagram) aspect ratios.

## Prerequisites

- **Node.js** 18+
- **FFmpeg** — must be installed and available in your `PATH`
  - macOS: `brew install ffmpeg`
  - Windows: [ffmpeg.org/download](https://ffmpeg.org/download.html)
  - Linux: `sudo apt install ffmpeg`
- API accounts (see [Environment Variables](#environment-variables))

## Quick Start

```bash
git clone https://github.com/Didier187/red2video.git
cd red2video
cp .env.example .env   # fill in your API keys
npm install
npm run dev            # starts on http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | [Anthropic Console](https://console.anthropic.com/) — used for script generation, character extraction, prompt enhancement, and YouTube metadata |
| `OPENAI_API_KEY` | Yes | [OpenAI Platform](https://platform.openai.com/) — used for TTS audio and DALL-E 3 image generation |
| `ARK_API_KEY` | No | ByteDance ARK API — required only if you use the **SeeDream** image provider |

## Image Providers

- **DALL-E 3** (default) — OpenAI's image generation, best quality, requires `OPENAI_API_KEY`
- **SeeDream** — ByteDance's image model via the ARK API, requires `ARK_API_KEY`

You can switch providers per-run in the UI.

## Customizing the Outro Card

The outro card (channel name, social handle) is configured in `.cta.json` at the project root. This file is **not** committed — create it if you want a custom outro:

```json
{
  "channelName": "Your Channel",
  "socialHandle": "@yourhandle"
}
```

If the file doesn't exist, the outro uses generic placeholder text.

## Automation Pipeline (Autopilot)

The **Autopilot** panel (or `POST /api/automate`) runs every step end to end — fetch, script, characters, audio, images, render, metadata — and can optionally upload the result to YouTube.

### Defaults: `.automation.json`

Optional, gitignored. Values here are used when a request doesn't specify them:

```json
{
  "defaults": {
    "voice": "nova",
    "imageProvider": "dall-e",
    "aspectRatio": "16:9",
    "videoQuality": "medium",
    "titleStyle": "curiosity"
  },
  "youtube": {
    "privacyStatus": "unlisted",
    "categoryId": "24",
    "notifySubscribers": false
  }
}
```

If the file is missing or invalid, the built-in defaults above are used.

### YouTube upload setup (one time)

1. In Google Cloud Console, enable the **YouTube Data API v3** and create an **OAuth client ID** of type *Desktop app*.
2. The app listens for the OAuth callback on `http://localhost:3333/oauth2callback` (Desktop clients allow this loopback URI automatically; for a *Web* client, add it as an authorized redirect URI).
3. Download the client JSON and save it as `.youtube-client-secret.json` in the project root (gitignored).
4. With the dev server running, open **Settings** in the Autopilot panel, turn on the YouTube upload toggle, click **Authorize YouTube** (or `POST /api/youtube-auth`) and complete the consent screen within 5 minutes. Tokens are saved to `.youtube-tokens.json` (gitignored) and refreshed automatically.

`GET /api/youtube-auth` returns `{ "authorized": true | false }`. Custom thumbnails only upload on verified channels; a thumbnail failure doesn't fail the upload.

### API

```bash
# Dry run: validates the URL, API keys and YouTube auth, and fetches the
# Reddit post. Makes no paid API calls and starts nothing.
curl -X POST http://localhost:3000/api/automate \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.reddit.com/r/.../comments/...","uploadToYouTube":true,"dryRun":true}'

# Real run: returns { "pipelineId" } immediately, or 400 with "problems"
# if the preflight checks fail (nothing is generated in that case).
curl -X POST http://localhost:3000/api/automate \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.reddit.com/r/.../comments/...","uploadToYouTube":false}'

# Poll progress (result is included once stage is "complete")
curl http://localhost:3000/api/automate-progress/<pipelineId>
```

Optional body fields: `voice`, `imageProvider`, `aspectRatio`, `videoQuality`, `titleStyle`, `uploadToYouTube`, `youtubePrivacyStatus` (`private` | `unlisted` | `public`).

Notes:

- Progress is kept in memory for 10 minutes after a run ends; restarting the server loses it.
- Reddit fetches retry on 429/5xx. Uploads are **not** retried automatically (to avoid duplicate videos); if an upload fails, the error includes the rendered video path so you can upload it by hand.

## Scripts

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Build for production
npm run preview   # Preview production build
npm run test      # Run tests with Vitest
npm run check     # Prettier + ESLint fix
```

## Storage

All generated media is stored locally in hidden directories at the project root:

```
.script-store/    # JSON script + character config per session
.media-store/     # Generated audio, images, and rendered video
```

These are gitignored and can be deleted at any time.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a full system diagram, data flow sequence, component breakdown, and API endpoint reference.

For AI agent coding guidelines, see [AGENTS.md](AGENTS.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
