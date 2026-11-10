import type React from 'react';

import { ErrorBoundary } from '../ui/ErrorBoundary.tsx';
import { SkeletonText } from '../ui/Skeleton.tsx';
import styles from './Section.module.css';

export type SectionProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  loading?: boolean;
  label?: string;
  children?: React.ReactNode;
};

export function Section({
  title,
  description,
  loading,
  label,
  children,
}: SectionProps) {
  return (
    <section data-bay-block="section" className={styles.section}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {description && <p className={styles.description}>{description}</p>}
      <ErrorBoundary
        label={
          label ?? (typeof title === 'string' ? title.toLowerCase() : undefined)
        }
      >
        {loading ? <SkeletonText /> : children}
      </ErrorBoundary>
    </section>
  );
}
