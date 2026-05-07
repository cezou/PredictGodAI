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
 * @returns {Promise<AttachmentBuilder>}
 */
export async function createDunkAttachment(authorAvatarUrl, targetAvatarUrl) {
  const templatePath = path.resolve(__dirname, '..', '..', 'assets', 'dunk.jpg');

  // Fetch avatar images as array buffers (Node.io 20 native fetch)
  const [authorRes, targetRes] = await Promise.all([
    fetch(authorAvatarUrl),
    fetch(targetAvatarUrl),
  ]);
  
  const [authorBuffer, targetBuffer] = await Promise.all([
    authorRes.arrayBuffer(),
    targetRes.arrayBuffer(),
  ]);

  // Resize both avatars to 150x150
  const authorImg = await sharp(authorBuffer).resize(150, 150).toBuffer();
  const targetImg = await sharp(targetBuffer).resize(150, 150).toBuffer();

  // Composite the images
  // author at (249, 190)
  // target at (368, 667)
  const result = await sharp(templatePath)
    .composite([
      { input: authorImg, left: 249, top: 190 },
      { input: targetImg, left: 368, top: 667 },
    ])
    .jpeg()
    .toBuffer();

  return new AttachmentBuilder(result, { name: 'dunk.jpg' });
}

/**
 * Generate a composite image pasting the target avatar onto puppetmaster.png
 * and return a Discord AttachmentBuilder ready to be sent.
 * @param {string} targetAvatarUrl 
 * @returns {Promise<AttachmentBuilder>}
 */
export async function createPuppetMasterAttachment(targetAvatarUrl) {
  const templatePath = path.resolve(__dirname, '..', '..', 'assets', 'puppetmaster.png');

  // Fetch avatar image as array buffer
  const targetRes = await fetch(targetAvatarUrl);
  const targetBuffer = await targetRes.arrayBuffer();

  // Resize avatar to 150x150
  const targetImg = await sharp(targetBuffer).resize(150, 150).toBuffer();

  // Composite the image onto template at left: 311, top: 460
  const result = await sharp(templatePath)
    .composite([
      { input: targetImg, left: 307, top: 614 },
    ])
    .png()
    .toBuffer();

  return new AttachmentBuilder(result, { name: 'puppetmaster.png' });
}