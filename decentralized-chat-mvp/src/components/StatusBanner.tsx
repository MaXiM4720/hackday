import './StatusBanner.css';

interface StatusBannerProps {
  kind: 'info' | 'warning' | 'error' | 'success';
  text: string;
}

export function StatusBanner({ kind, text }: StatusBannerProps) {
  return <div className={`status-banner status-banner--${kind}`}>{text}</div>;
}
