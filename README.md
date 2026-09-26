# Joy of Giving photo booth

A mobile-first event photo booth. Photos are composed and compressed in the browser, saved locally on the device, and backed up as authenticated Cloudinary assets through the app's server-side API.

Cloud uploads require `CLOUD_NAME`, `API_KEY`, and `API_SECRET` in the deployment environment. Final JPEG uploads are limited to 500 KB; the browser targets 480 KB to leave request headroom.

The protected `GET /api/photos` route lists stored photos in newest-first pages. Set a strong `PHOTO_ADMIN_TOKEN` in the deployment environment and send it as `Authorization: Bearer <token>`. Use `maxResults` (1-100) and the returned `nextCursor` for pagination.

```bash
curl -H "Authorization: Bearer $PHOTO_ADMIN_TOKEN" \
  "https://your-domain.example/api/photos?maxResults=50"
```

The upload and listing routes deploy with the Next.js app; no separate Render service is needed. Copy the names from `.env.example` into the hosting provider's environment settings and never commit the real values.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Camera access requires HTTPS on deployed domains (localhost is permitted for local development). The upload path works without camera permission.

## Customize for an event

Edit [`config/event.ts`](config/event.ts) for the event name, copy, image dimensions, default camera, and frame list. The active collection contains ten illustrated frame assets in [`public/frames`](public/frames), one for each giving pledge or celebration. Each finalized PNG includes its Joy of Giving heading, Witty logo at bottom left, The Good Box Project logo at bottom right, and phrase between them. [`lib/frameComposer.ts`](lib/frameComposer.ts) resizes the complete transparent artwork to 1080 x 1350 without cropping its decorations or repainting its branding.

Keep the PNG canvas at the same aspect ratio as `outputWidth`/`outputHeight`. The camera preview and exported image both fill that entire rectangle with a centered cover crop, then place the PNG over it. The frame's central opening should be transparent.

The frame menu lists all ten designs. Swipe the camera preview or tap an adjacent lens to switch frames; tap the selected center lens to capture. The preview and export both use the same 4:5 aspect ratio. Older frame assets remain available but are not in the active collection.

## Release checks

```bash
npm run lint
npm run typecheck
npm run build
```

Before printing the venue QR code, test the deployed HTTPS URL on the actual iPhone and Android devices used at the event. Check front and back cameras, permission denial, upload, alignment, retake, share targets, and saving. Native share targets depend on each phone's browser and installed apps.
