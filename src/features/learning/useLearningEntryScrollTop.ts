import { useEffect } from 'react';

export function useLearningEntryScrollTop(identity: string | number | null | undefined) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [identity]);
}
