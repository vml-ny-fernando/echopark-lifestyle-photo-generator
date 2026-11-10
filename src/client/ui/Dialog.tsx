import type { ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';
import { X } from 'lucide-react';

import { Button } from './Button.tsx';
import styles from './Dialog.module.css';

export type DialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** `md` 480px forms and confirmations, `lg` 720px editors, `full` a lightbox. */
  size?: 'md' | 'lg' | 'full' | undefined;
  /** Right-aligned footer actions. */
  footer?: ReactNode | undefined;
  /** Clicking the backdrop closes it. Off for forms with unsaved input. */
  dismissable?: boolean | undefined;
  children?: ReactNode | undefined;
};

/** A modal dialog: Escape and the close button dismiss it, focus is trapped. */
export function Dialog({
  isOpen,
  onOpenChange,
  title,
  size = 'md',
  footer,
  dismissable = true,
  children,
}: DialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={dismissable}
      className={styles.overlay}
    >
      <Modal className={`${styles.modal} ${styles[size]}`}>
        <AriaDialog className={styles.dialog}>
          <div className={styles.header}>
            <Heading slot="title" className={styles.title}>
              {title}
            </Heading>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close"
              icon={<X size={14} />}
              onPress={() => onOpenChange(false)}
            />
          </div>
          <div className={styles.body}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
