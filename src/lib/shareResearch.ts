import { Platform, Share } from 'react-native';

export async function shareResearch(title: string, message: string) {
  if (Platform.OS !== 'web') {
    await Share.share({ title, message });
    return 'shared' as const;
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(message);
      return 'copied' as const;
    } catch {
      // Some embedded and non-HTTPS browsers expose the API but reject writes.
      // Fall through to the synchronous copy path while still in the user action.
    }
  }

  if (typeof document !== 'undefined') {
    const textArea = document.createElement('textarea');
    textArea.value = message;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (copied) return 'copied' as const;
  }

  throw new Error('無法存取剪貼簿，請手動複製研究連結。');
}

export function currentWebOrigin() {
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : undefined;
}
