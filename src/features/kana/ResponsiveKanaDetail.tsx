import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

const KANA_DETAIL_MEDIA_QUERY = '(max-width: 1024px)';

export function useResponsiveKanaDetailModal() {
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined'
    ? window.matchMedia(KANA_DETAIL_MEDIA_QUERY).matches
    : false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(KANA_DETAIL_MEDIA_QUERY);
    const sync = () => {
      setIsCompact(mediaQuery.matches);
      if (!mediaQuery.matches) setIsOpen(false);
    };

    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  const open = useCallback(() => {
    if (isCompact) setIsOpen(true);
  }, [isCompact]);
  const close = useCallback(() => setIsOpen(false), []);

  return { isCompact, isOpen, open, close };
}

type ResponsiveKanaDetailProps = {
  isCompact: boolean;
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
};

export function ResponsiveKanaDetail({ isCompact, open, onClose, label, children }: ResponsiveKanaDetailProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isCompact || !open) return undefined;

    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const computedPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [isCompact, open, onClose]);

  if (!isCompact) return <>{children}</>;
  if (!open) return null;

  return <div
    className="kana-page kana-detail-modal-backdrop"
    role="presentation"
    onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div
      className="kana-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
    >
      <button ref={closeButtonRef} type="button" className="kana-detail-modal-close" onClick={onClose} aria-label="Tutup detail huruf">
        <X size={21}/>
      </button>
      <div className="kana-detail-modal-scroll">{children}</div>
    </div>
  </div>;
}
