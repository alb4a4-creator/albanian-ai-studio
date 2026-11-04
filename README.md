# Albanian AI Studio

**Professional AI Video Creation Workspace**

An independent, responsive creator workspace for turning ideas and reference images into organized video projects.

## Current features
- Albanian-first interface with German language option
- Responsive desktop and mobile workspace
- Text-to-video and image-to-video project setup
- Prompt editor, aspect ratios, duration and visual-style settings
- Image upload with local preview (PNG, JPG, WEBP; 12 MB limit)
- Starter prompt templates
- Local draft project library with edit and delete actions
- Automated Vite production build workflow

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Important: AI generation status
The current application prepares and saves project drafts. It does **not** yet generate video files. A video-generation provider and secure server-side API integration must be selected and configured before generation can be enabled. Never put private provider API keys in frontend variables such as `VITE_*` or commit them to GitHub.

## Deployment
Import this repository into Vercel and use the Vite defaults:
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

This project is separate from N-BAU Professional.
