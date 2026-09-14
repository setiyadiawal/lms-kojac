export const PENDING_VERIFICATION_EMAIL_KEY = 'kojac_pending_verification_email';

export function storePendingVerificationEmail(email: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim());
}

export function getPendingVerificationEmail() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY)?.trim() ?? '';
}

export function clearPendingVerificationEmail() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function getVerifyEmailRedirectUrl() {
  if (typeof window === 'undefined') return '/verify-email';
  return new URL('/verify-email', window.location.origin).toString();
}

export function maskEmail(email: string) {
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  if (local.length <= 2) return `${local.slice(0, 1)}•${domain}`;

  const prefixLength = Math.min(3, Math.max(1, local.length - 2));
  const suffixLength = local.length > 4 ? 2 : 1;
  const hiddenLength = Math.max(1, local.length - prefixLength - suffixLength);

  return `${local.slice(0, prefixLength)}${'•'.repeat(hiddenLength)}${local.slice(-suffixLength)}${domain}`;
}
