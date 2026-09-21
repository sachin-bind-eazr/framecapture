# Joy of Giving photo booth

A client-side, mobile-first event photo booth. Photos are composed in the browser and are not uploaded or stored by this application.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Camera access requires HTTPS on deployed domains (localhost is permitted for local development). The upload path works without camera permission.

## Customize for an event

Edit [`config/event.ts`](config/event.ts) for the event name, copy, image dimensions, default camera, and frame list. The active transparent overlays are [`new1.png`](public/frames/new1.png) and [`joy-festival-frame.png`](public/frames/joy-festival-frame.png).

Keep the PNG canvas at the same aspect ratio as `outputWidth`/`outputHeight`. The camera preview and exported image both fill that entire rectangle with a centered cover crop, then place the PNG over it. The frame's central opening should be transparent.

For a 9:16 campaign, change the output dimensions and provide a matching 9:16 frame asset. `frames` is an array so another frame can be selected in a future UI without changing the composer.

## Release checks

```bash
npm run lint
npm run typecheck
npm run build
```

Before printing the venue QR code, test the deployed HTTPS URL on the actual iPhone and Android devices used at the event. Check front and back cameras, permission denial, upload, alignment, retake, share targets, and saving. Native share targets depend on each phone's browser and installed apps.
