"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
  UNSTABLE_ToastQueue as ToastQueue,
  type ToastProps,
} from "react-aria-components";
import { flushSync } from "react-dom";
import {
  FaCircleCheck,
  FaCircleInfo,
  FaLock,
  FaTriangleExclamation,
  FaXmark,
} from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";

import styles from "./Toast.module.css";

export type ToastVariant = "success" | "info" | "warning" | "error";

export interface ToastLink {
  label: string;
  href: string;
}

export interface ToastContent {
  title: string;
  description: string;
  variant: ToastVariant;
  link?: ToastLink;
}

export const MAX_VISIBLE_TOASTS = 4;

const variantClassMap: Record<ToastVariant, string> = {
  success: styles.success,
  info: styles.info,
  warning: styles.warning,
  error: styles.error,
};

const variantIconMap: Record<ToastVariant, typeof FaCircleCheck> = {
  success: FaCircleCheck,
  info: FaCircleInfo,
  warning: FaLock,
  error: FaTriangleExclamation,
};

export const queue = new ToastQueue<ToastContent>({
  maxVisibleToasts: MAX_VISIBLE_TOASTS,
  wrapUpdate(fn) {
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        flushSync(fn);
      });
    } else {
      fn();
    }
  },
});

export function ToastRegion() {
  return (
    <AriaToastRegion queue={queue} className={styles.region}>
      {({ toast }) => {
        const Icon = variantIconMap[toast.content.variant];
        return (
          <Toast
            toast={toast}
            className={clsx(styles.toast, variantClassMap[toast.content.variant])}
            // Both transition hints live here so CSS Modules cannot hash the
            // view-transition-class value (see Toast.module.css).
            style={{ viewTransitionName: toast.key, viewTransitionClass: "toast" } as CSSProperties}
          >
            <Icon className={styles.icon} aria-hidden="true" />
            <AriaToastContent className={styles.content}>
              <span className={styles.title}>{toast.content.title}</span>
              <span className={styles.description}>{toast.content.description}</span>
              {toast.content.link && (
                <a
                  className={styles.link}
                  href={toast.content.link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {toast.content.link.label}
                </a>
              )}
            </AriaToastContent>
            <Button slot="close" variant="ghost" aria-label="Close" className={styles.close}>
              <FaXmark />
            </Button>
            <span className={styles.progress} aria-hidden="true" />
          </Toast>
        );
      }}
    </AriaToastRegion>
  );
}

export function Toast(props: ToastProps<ToastContent>) {
  return <AriaToast {...props} className={clsx(props.className)} />;
}
