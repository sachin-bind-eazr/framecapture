import sharp from "sharp";

const frames = [
  "public/frames/helping-someone.png",
  "public/frames/saving-food.png",
  "public/frames/care-share.png",
];

const witty = await sharp("public/frames/Witty_Logo 1.png")
  .resize({ width: 160 })
  .png()
  .toBuffer();

const goodBox = await sharp("public/frames/Image (4).png")
  .resize({ height: 88 })
  .png()
  .toBuffer();

for (const framePath of frames) {
  const frame = sharp(framePath);
  const { width, height } = await frame.metadata();

  if (!width || !height) {
    throw new Error(`Could not read ${framePath}`);
  }

  const result = await frame
    .composite([
      { input: witty, left: 26, top: height - 108 },
      { input: goodBox, left: width - 104, top: height - 103 },
    ])
    .png()
    .toBuffer();

  await sharp(result).toFile(`${framePath}.updated`);
  await sharp(`${framePath}.updated`).toFile(framePath);
}
