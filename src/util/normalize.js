export function normalizeForMatch(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s.,/#!$%^&*;:{}=\-_~()]/g, '');
}
