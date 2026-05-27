'use client';

import clsx from 'clsx';
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  Heading,
  ModalOverlay,
  type ModalOverlayProps,
} from 'react-aria-components';

import styles from './Modal.module.css';

interface ModalProps extends Omit<ModalOverlayProps, 'className'> {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ title, children, className, ...props }: ModalProps) {
  return (
    <ModalOverlay isDismissable {...props} className={styles.overlay}>
      <AriaModal className={clsx(styles.modal, className)}>
        <AriaDialog className={styles.dialog}>
          <Heading slot="title" className={styles.title}>
            {title}
          </Heading>
          {children}
        </AriaDialog>
      </AriaModal>
    </ModalOverlay>
  );
}
