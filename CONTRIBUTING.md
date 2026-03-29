# Contributing to red2video

## Local Setup

```bash
git clone https://github.com/Didier187/red2video.git
cd red2video
cp .env.example .env   # add your API keys
npm install
npm run dev
```

You'll need Node.js 18+, FFmpeg on your PATH, and at minimum an Anthropic and OpenAI API key.

## Code Style

- TypeScript strict mode — no `any`, use `unknown` for truly uncertain types
- Named imports, grouped: external → internal → relative
- `npm run check` before committing (runs Prettier + ESLint fix)

See [AGENTS.md](AGENTS.md) for the full coding guidelines used in this project.

## Making Changes

1. Fork the repo and create a branch from `master`
2. Make your changes
3. Run `npm run check` and `npm test` — both should pass
4. Open a pull request with a clear description of what and why

## Reporting Issues

Open an issue on GitHub. Include:
- What you did
- What you expected
- What actually happened (error message or screenshot)
- Your Node.js version and OS
