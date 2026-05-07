import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AttachmentBuilder } from 'discord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generate a composite image pasting the author and target avatars onto dunk.jpg
 * and return a Discord AttachmentBuilder ready to be sent.
 * @param {string} authorAvatarUrl 
 * @param {string} targetAvatarUrl 
 * @param {string} originalAvatarUrl
 * @returns {Promise<AttachmentBuilder>}
 */
export async function createDunkAttachment(authorAvatarUrl, targetAvatarUrl, originalAvatarUrl = null) {
  const templatePath = path.resolve(__dirname, '..', '..', 'assets', 'dunk.jpg');

  // Fetch avatar images as array buffers (Node.io 20 native fetch)
  const fetches = [fetch(authorAvatarUrl), fetch(targetAvatarUrl)];
  if (originalAvatarUrl) fetches.push(fetch(originalAvatarUrl));
  
  const responses = await Promise.all(fetches);
  const buffers = await Promise.all(responses.map(res => res.arrayBuffer()));

  // Resize both avatars to 150x150
  const authorImg = await sharp(buffers[0]).resize(150, 150).toBuffer();
  const targetImg = await sharp(buffers[1]).resize(150, 150).toBuffer();

  const compositeInputs = [
    { input: authorImg, left: 249, top: 190 },
    { input: targetImg, left: 368, top: 667 },
  ];

  if (originalAvatarUrl) {
    const originalBuffer = buffers[2];
    const size = 90;
    const svgMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white" fill-opacity="0.8"/></svg>`
    );
    const origImg = await sharp(originalBuffer)
      .resize(size, size)
      .composite([{ input: svgMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    compositeInputs.push({ input: origImg, left: 226, top: 66 });
  }

  // Composite the images
  const result = await sharp(templatePath)
    .composite(compositeInputs)
    .jpeg()
    .toBuffer();

  return new AttachmentBuilder(result, { name: 'dunk.jpg' });
}

/**
 * Generate a composite image pasting the target avatar onto puppetmaster.jpg
 * and return a Discord AttachmentBuilder ready to be sent.
 * @param {string} targetAvatarUrl 
 * @returns {Promise<AttachmentBuilder>}
 */
export async function createPuppetMasterAttachment(targetAvatarUrl) {
  const templatePath = path.resolve(__dirname, '..', '..', 'assets', 'puppetmaster.jpg');

  // Fetch avatar image as array buffer
  const targetRes = await fetch(targetAvatarUrl);
  const targetBuffer = await targetRes.arrayBuffer();

  // Resize avatar to 150x150
  const targetImg = await sharp(targetBuffer).resize(150, 150).toBuffer();

  // Composite the image onto template at left: 307, top: 614
  const result = await sharp(templatePath)
    .composite([
      { input: targetImg, left: 307, top: 614 },
    ])
    .png()
    .toBuffer();

  return new AttachmentBuilder(result, { name: 'puppetmaster.jpg' });
}