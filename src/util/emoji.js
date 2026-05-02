const CUSTOM_EMOJI_RE = /^<(a)?:(\w+):(\d+)>$/;
const UNICODE_EMOJI_RE = /^\p{RGI_Emoji}$/v;

export async function validateEmoji(input, guild) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const custom = trimmed.match(CUSTOM_EMOJI_RE);
  if (custom) {
    const [, animated, name, id] = custom;
    let emoji = guild?.emojis.cache.get(id);
    if (!emoji && guild) {
      try {
        await guild.emojis.fetch();
      } catch {
        return null;
      }
      emoji = guild.emojis.cache.get(id);
    }
    if (!emoji) return null;
    return {
      kind: 'custom',
      raw: `<${animated ? 'a' : ''}:${name}:${id}>`,
      reactPayload: id,
      display: `<${animated ? 'a' : ''}:${name}:${id}>`,
    };
  }

  if (UNICODE_EMOJI_RE.test(trimmed)) {
    return { kind: 'unicode', raw: trimmed, reactPayload: trimmed, display: trimmed };
  }

  return null;
}
