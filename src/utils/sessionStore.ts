export function readSessionString(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionString(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage unavailable — swallow silently.
  }
}
