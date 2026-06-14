export function isStaticDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.includes('gh-pages') ||
    window.location.protocol === 'file:'
  );
}
