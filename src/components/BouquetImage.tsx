import { useState } from 'react';
import styles from './BouquetImage.module.css';

type Props = {
  src: string;
  alt: string;
  className?: string;
};

const FALLBACK = '/bouquets/placeholder.svg';

export function BouquetImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  const imageSrc = !src || failed ? FALLBACK : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${styles.image} ${className ?? ''}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
