import { useState } from 'react';
import styles from './BouquetImage.module.css';

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Load immediately (e.g. detail dialog) instead of lazy. */
  eager?: boolean;
  onLoad?: () => void;
};

const FALLBACK = '/bouquets/placeholder.svg';

export function BouquetImage({ src, alt, className, eager = false, onLoad }: Props) {
  const [failed, setFailed] = useState(false);
  const imageSrc = !src || failed ? FALLBACK : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${styles.image} ${className ?? ''}`}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      fetchPriority={eager ? 'high' : undefined}
      onLoad={onLoad}
      onError={() => {
        setFailed(true);
        onLoad?.();
      }}
    />
  );
}
