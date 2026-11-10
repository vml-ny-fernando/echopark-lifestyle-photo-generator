import { Download } from 'lucide-react';

import { downloadUrl } from './sceneMeta.ts';
import styles from './DownloadLink.module.css';

/** An anchor that looks like a default Button and saves the stored image. */
export function DownloadLink({ imageKey }: { imageKey: string }) {
  return (
    <a className={styles.link} href={downloadUrl(imageKey)} download>
      <Download size={14} aria-hidden />
      Download
    </a>
  );
}
