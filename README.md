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
- Local draft project library with edit, delete, and JSON export backup actions
- Optimized reference-image uploads stored with local drafts
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
The current application prepares and saves project drafts in the current browser using local storage. Drafts are not synced between devices and can be lost if browser site data is cleared; use the per-project JSON export to keep a backup. It does **not** yet generate video files. A video-generation provider and secure server-side API integration must be selected and configured before generation can be enabled. Never put private provider API keys in frontend variables such as `VITE_*` or commit them to GitHub.

## Deployment
Import this repository into Vercel and use the Vite defaults:
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

This is a standalone product with its own repository, deployment, configuration, and future AI-provider integrations.
