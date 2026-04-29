export function makeServerSignatureSvgDataUrl(name: string, signedAtIso: string): string {
  const safeName = name.replace(/[<>&"]/g, '');
  const date = signedAtIso.slice(0, 10);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="220" viewBox="0 0 720 220">
  <rect width="720" height="220" fill="#ffffff"/>
  <text x="30" y="120" font-family="cursive" font-size="54" fill="#0f172a">${safeName}</text>
  <text x="30" y="170" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" fill="#64748b">Digitally signed • ${date}</text>
  <line x1="30" y1="185" x2="690" y2="185" stroke="#e2e8f0" stroke-width="2"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
