function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function thumbnailSrc(title: string): string {
  const letter = escapeXml((title.trim().charAt(0) || '?').toUpperCase());
  const hue = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="hsl(${hue} 32% 32%)"/><text x="160" y="160" text-anchor="middle" dominant-baseline="central" font-family="Segoe UI, sans-serif" font-size="128" fill="#fff">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
