# red2video - Architecture Diagram

## System Overview

red2video is a full-stack web application that converts Reddit posts into engaging short-form videos using AI. It orchestrates a multi-step pipeline: Reddit extraction → Script generation → Audio synthesis → Image generation → Video rendering.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React UI - TanStack Start]
        Step1[Step 1: URL Input]
        Step2[Step 2: Script Generation]
        Step3[Step 3: Audio Generation]
        Step4[Step 4: Image Generation]
        Step5[Step 5: Video Rendering]

        UI --> Step1
        Step1 --> Step2
        Step2 --> Step3
        Step3 --> Step4
        Step4 --> Step5
    end

    subgraph "API Layer"
        API1[GET /api/reddit]
        API2[POST /api/generate-script]
        API3[POST /api/generate-audio]
        API4[POST /api/generate-images]
        API5[POST /api/render-video]
        API6[GET /api/render-progress/:id]
    end

    subgraph "Business Logic - Agents"
        Agent1[scriptGenerator.ts]
        Agent2[audioGenerator.ts]
        Agent3[imageGenerator.ts]
        Agent4[videoRenderer.ts]
    end

    subgraph "External Services"
        Reddit[Reddit JSON API]
        Claude[Anthropic Claude Sonnet 4]
        TTS[OpenAI TTS API]
        DALLE[OpenAI DALL-E 3]
        FFmpeg[FFmpeg]
    end

    subgraph "Storage Layer"
        ScriptStore[.script-store/]
        MediaStore[.media-store/]
        Progress[In-Memory Progress Map]
    end

    Step1 -->|Query| API1
    Step2 -->|Mutation| API2
    Step3 -->|Mutation| API3
    Step4 -->|Mutation| API4
    Step5 -->|Mutation| API5
    Step5 -->|Poll| API6

    API1 --> Reddit
    API2 --> Agent1
    API3 --> Agent2
    API4 --> Agent3
    API5 --> Agent4

    Agent1 --> Claude
    Agent2 --> TTS
    Agent3 --> DALLE
    Agent4 --> FFmpeg

    Agent1 --> ScriptStore
    Agent2 --> MediaStore
    Agent3 --> MediaStore
    Agent4 --> MediaStore
    Agent4 --> Progress
    API6 --> Progress
```

---

## Detailed Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        direction TB
        Root[__root.tsx]
        Index[index.tsx - Main App]

        UrlInput[UrlInputStep.tsx]
        ScriptGen[ScriptGenerationStep.tsx]
        AudioGen[AudioGenerationStep.tsx]
        ImageGen[ImageGenerationStep.tsx]
        VideoRender[VideoRenderStep.tsx]

        VoiceSelect[VoiceSelector.tsx]
        Progress[VideoRenderProgress.tsx]
        Preview[ScenePreview.tsx]

        Index --> UrlInput
        Index --> ScriptGen
        Index --> AudioGen
        Index --> ImageGen
        Index --> VideoRender

        AudioGen --> VoiceSelect
        VideoRender --> Progress
        Index --> Preview
    end

    subgraph "State Management"
        LocalState[React Hooks - Local State]
        ServerState[TanStack Query - Server State]

        LocalState -->|inputUrl, selectedVoice, darkMode| Index
        ServerState -->|Queries & Mutations| Index
    end

    subgraph "Video Composition - Remotion"
        RedditVideo[RedditVideoComposition.tsx]
        TitleCard[TitleCard.tsx]
        Scene[Scene.tsx]

        RedditVideo --> TitleCard
        RedditVideo --> Scene
    end

    Index --> LocalState
    Index --> ServerState
```

---

## Data Flow Pipeline

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend UI
    participant API as API Routes
    participant Reddit as Reddit API
    participant Claude as Claude Sonnet 4
    participant TTS as OpenAI TTS
    participant DALLE as DALL-E 3
    participant Remotion as Remotion Renderer
    participant Store as File Storage

    User->>UI: 1. Submit Reddit URL
    UI->>API: GET /api/reddit?url=...
    API->>Reddit: Fetch post JSON
    Reddit-->>API: Post + Comments
    API-->>UI: ScriptContent

    User->>UI: 2. Generate Script
    UI->>API: POST /api/generate-script
    API->>Claude: Generate structured script
    Claude-->>API: Scenes with text + image prompts
    API->>Store: Save to .script-store/{id}.json
    API-->>UI: YouTubeScript

    User->>UI: 3. Select Voice & Generate Audio
    UI->>API: POST /api/generate-audio (voice: nova)
    API->>TTS: Generate MP3 for each scene
    TTS-->>API: Audio files (base64)
    API->>Store: Save to .media-store/{id}/audio/
    API-->>UI: AudioGenerationResult

    User->>UI: 4. Generate Images
    UI->>API: POST /api/generate-images
    API->>DALLE: Generate image per scene
    DALLE-->>API: PNG images
    API->>Store: Save to .media-store/{id}/images/
    API-->>UI: ImageGenerationResult

    User->>UI: 5. Render Video
    UI->>API: POST /api/render-video
    API->>Store: Load all media files
    API->>Remotion: Bundle & render composition
    Remotion->>Remotion: TitleCard + Scenes
    Remotion-->>API: MP4 video
    API->>Store: Save to .media-store/{id}/video/
    API-->>UI: VideoRenderResult

    loop Progress Polling
        UI->>API: GET /api/render-progress/{id}
        API-->>UI: {progress: 75, stage: "rendering"}
    end

    User->>UI: 6. Download Video
    UI->>API: GET /api/media/{id}/video/{file}
    API-->>UI: Video file
```

---

## Technology Stack

```mermaid
graph TB
    subgraph "Frontend Stack"
        React[React 19.2.0]
        TanStackStart[TanStack Start 1.132.0]
        TanStackRouter[TanStack Router 1.132.0]
        TanStackQuery[TanStack Query 5.66.5]
        Tailwind[Tailwind CSS 4.0.6]
        TypeScript[TypeScript 5.7.2]
    end

    subgraph "Backend Stack"
        Node[Node.js Runtime]
        Nitro[Nitro Server - TanStack Start]
        Vite[Vite 7.1.7 - Build Tool]
    end

    subgraph "AI/ML Services"
        Claude[Anthropic Claude Sonnet 4<br/>Script Generation]
        OpenAI_TTS[OpenAI TTS API<br/>6 Voice Options]
        OpenAI_DALLE[OpenAI DALL-E 3<br/>Image Generation]
    end

    subgraph "Video Processing"
        Remotion[Remotion 4.0.403<br/>Video Composition]
        FFmpeg_Tool[FFmpeg<br/>H.264 Encoding]
    end

    subgraph "Data & Validation"
        Zod[Zod 4.1.11<br/>Schema Validation]
        FileSystem[File System Storage<br/>No Database]
    end
```

---

## File Storage Structure

```
red2video/
├── .script-store/
│   └── {scriptId}.json              # Script metadata + generation status
│
├── .media-store/
│   └── {scriptId}/
│       ├── images/
│       │   ├── scene-0.png          # DALL-E generated images
│       │   ├── scene-1.png
│       │   └── ...
│       │
│       ├── audio/
│       │   ├── scene-0.mp3          # OpenAI TTS audio files
│       │   ├── scene-1.mp3
│       │   └── ...
│       │
│       └── video/
│           └── {scriptId}.mp4       # Final rendered video
│
└── .temp-audio/
    └── {temp-files}.mp3             # Temporary audio for duration calculation
```

---

## Key Architectural Patterns

### 1. **Multi-Step Wizard Pattern**
- Five sequential steps with state preservation
- Each step enables next step on success
- Progress visualization for user feedback

### 2. **Agent-Based Architecture**
- Separate agents for distinct AI tasks
- Each agent handles one external service
- Clean separation of concerns

### 3. **File-Based Persistence**
- Simple file system storage (no database)
- JSON for metadata, binary for media
- Organized by script ID

### 4. **Polling-Based Progress**
- In-memory progress tracking
- Frontend polls every 500ms
- Simple alternative to WebSockets

### 5. **Structured AI Output**
- Zod schemas enforce AI response format
- Type-safe script generation
- Predictable data structures

### 6. **Base64 Data URL Strategy**
- Media files converted to data URLs for Remotion
- Avoids file path complexity in rendering
- Simplifies bundling process

---

## API Endpoints Reference

| Endpoint | Method | Purpose | Agent |
|----------|--------|---------|-------|
| `/api/reddit` | GET | Extract Reddit post + comments | - |
| `/api/generate-script` | POST | Generate video script from post | scriptGenerator |
| `/api/generate-audio` | POST | Generate TTS for all scenes | audioGenerator |
| `/api/generate-images` | POST | Generate images for all scenes | imageGenerator |
| `/api/render-video` | POST | Render final MP4 video | videoRenderer |
| `/api/render-progress/:scriptId` | GET | Poll rendering progress | - |
| `/api/media/:scriptId/images/:fileName` | GET | Serve generated images | - |
| `/api/media/:scriptId/video/:fileName` | GET | Serve rendered video | - |

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=<your-key>     # Claude Sonnet 4 API
OPENAI_API_KEY=<your-key>        # OpenAI TTS + DALL-E 3
```

---

## Video Composition Structure (Remotion)

```
RedditVideoComposition (1920x1080, 30fps)
│
├── TitleCard
│   ├── Duration: 4 seconds (120 frames)
│   └── Content: "Reddit Story" title text
│
└── Scenes (dynamic sequence)
    └── For each scene:
        ├── Background: DALL-E generated image
        ├── Audio: OpenAI TTS voiceover
        ├── Duration: Based on actual audio length
        └── Transitions: Fade effects
```

---

## Development Workflow

```mermaid
graph LR
    Dev[Developer] -->|npm run dev| Vite[Vite Dev Server]
    Vite -->|HMR| Browser[Browser :3000]
    Browser -->|API Calls| TanStack[TanStack Start Server]
    TanStack -->|Serves API| Browser

    Dev -->|npm run build| Build[Build Production]
    Build -->|Output| Dist[.output/ directory]
```

---

## Security Considerations

- **API Keys**: Stored in environment variables (never committed)
- **Public Reddit Access**: No authentication required (public posts only)
- **File Upload**: No user file uploads (only URLs)
- **Rate Limiting**: Consider for production (not implemented in MVP)
- **Input Validation**: Zod schemas validate all API inputs

---

## Performance Optimizations

1. **React Query Caching**: Server state cached automatically
2. **Conditional Rendering**: Steps only render when data available
3. **Parallel Processing**: Multiple TanStack Query requests in parallel
4. **Base64 Caching**: Media converted once, reused in rendering
5. **Remotion Bundling**: Webpack bundling optimized for video assets

---

## Future Architecture Enhancements

- **Database Integration**: PostgreSQL for script metadata (scalability)
- **Cloud Storage**: S3/R2 for media files (scalability)
- **WebSocket Progress**: Real-time updates instead of polling
- **Queue System**: Background job processing for video rendering
- **CDN Integration**: Serve static assets via CDN
- **Authentication**: User accounts and project management
- **Caching Layer**: Redis for frequently accessed data
