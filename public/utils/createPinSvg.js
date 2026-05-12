export function createPinSvg(color = "#EA4335") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
      <path d="M16 0 C7.163 0 0 7.163 0 16 C0 28 16 48 16 48 C16 48 32 28 32 16 C32 7.163 24.837 0 16 0Z" fill="${color}"/>
      <circle cx="16" cy="16" r="7" fill="white"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
