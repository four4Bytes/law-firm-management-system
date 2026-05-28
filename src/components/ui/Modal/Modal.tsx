"use client";

import clsx from "clsx";
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  Heading,
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components";
import { FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";

import styles from "./Modal.module.css";

interface ModalProps extends Omit<ModalOverlayProps, "className"> {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ title, children, className, onOpenChange, ...props }: ModalProps) {
  return (
    <ModalOverlay isDismissable onOpenChange={onOpenChange} {...props} className={styles.overlay}>
      <AriaModal className={clsx(styles.modal, className)}>
        <AriaDialog className={styles.dialog}>
          <Heading slot="title" className={styles.title}>
            {title}
          </Heading>
          <Button
            variant="ghost"
            className={styles.closeButton}
            onPress={() => onOpenChange?.(false)}
          >
            <FaXmark />
          </Button>
          {children}
        </AriaDialog>
      </AriaModal>
    </ModalOverlay>
  );
}
