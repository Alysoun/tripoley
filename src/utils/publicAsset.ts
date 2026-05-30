/** Resolve a path under Vite `public/` for dev and GitHub Pages base URLs. */
export function publicAsset(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${normalized}`;
}
