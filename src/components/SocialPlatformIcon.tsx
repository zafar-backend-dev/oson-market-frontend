import type { SocialPlatformKey } from '../services/siteAboutApi';

interface SocialPlatformIconProps {
  platform: SocialPlatformKey;
  className?: string;
}

export function SocialPlatformIcon({
  platform,
  className = 'w-4 h-4 shrink-0',
}: SocialPlatformIconProps) {
  switch (platform) {
    case 'TELEGRAM':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M21.9 4.6c.3-1.2-.8-2.2-1.9-1.7L2.6 10.1c-1.3.5-1.2 2.4.1 2.8l4.4 1.4 1.7 5.3c.3 1 1.6 1.3 2.3.5l2.5-2.6 4.6 3.4c1 .7 2.4.2 2.7-1l1-15.3ZM9.4 14.3l8.1-6.9c.3-.3.7.1.4.4l-6.6 7.5-.3 3.1-1.6-4.1Z" />
        </svg>
      );
    case 'INSTAGRAM':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'FACEBOOK':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M13.8 21v-7.7h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.5-1.5h1.6V4.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.1H7.9v3h2.6V21h3.3Z" />
        </svg>
      );
    case 'YOUTUBE':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.6.5a2.8 2.8 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.4 4.8a2.8 2.8 0 0 0 2 2c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15.2V8.8l5.3 3.2-5.3 3.2Z" />
        </svg>
      );
    case 'TIKTOK':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M16.6 3c.4 2.4 1.9 4 4.4 4.3v3c-1.6.1-3.1-.4-4.4-1.3v6.2a5.8 5.8 0 1 1-5.8-5.8c.4 0 .8 0 1.2.1v3.1a2.7 2.7 0 1 0 1.5 2.5V3h3.1Z" />
        </svg>
      );
    case 'X':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M18.3 3h3l-6.6 7.5L22.5 21h-6.1l-4.8-6.2L6.2 21h-3l7-8L2.7 3H9l4.3 5.7L18.3 3Zm-1.1 16.2h1.7L8.1 4.7H6.3l10.9 14.5Z" />
        </svg>
      );
    case 'LINKEDIN':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M6.4 8.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM4.7 10.1h3.4V20H4.7v-9.9Zm5.5 0h3.2v1.4h.1c.5-.9 1.6-1.7 3.2-1.7 3.4 0 4 2.2 4 5.1V20h-3.4v-4.5c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V20h-3.4v-9.9Z" />
        </svg>
      );
    case 'WHATSAPP':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
        >
          <path d="M3 20l1.4-4.2A8.5 8.5 0 1 1 8.2 19.6L3 20Z" />
          <path d="M9.5 9.2c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.5-.1.7l-.5.6c-.1.2-.2.4 0 .6.4.8 1.1 1.5 1.9 1.9.2.1.4.1.6 0l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.5.8-.6.4-1.5.5-2.4.2-1.9-.6-3.8-2.4-4.5-4.3-.3-.9-.2-1.8.2-2.4Z" />
        </svg>
      );
  }
}
