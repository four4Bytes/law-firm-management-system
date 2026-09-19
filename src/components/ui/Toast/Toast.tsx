"use client";

import clsx from "clsx";
import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
  UNSTABLE_ToastQueue as ToastQueue,
  type ToastProps,
} from "react-aria-components";
import { flushSync } from "react-dom";
import { FaXmark } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";

import styles from "./Toast.module.css";

export interface ToastLink {
  label: string;
  href: string;
}

export interface ToastContent {
  title: string;
  description: string;
  link?: ToastLink;
}

export const queue = new ToastQueue<ToastContent>({
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
      {({ toast }) => (
        <Toast toast={toast} className={styles.toast}>
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
        </Toast>
      )}
    </AriaToastRegion>
  );
}

export function Toast(props: ToastProps<ToastContent>) {
  return <AriaToast {...props} className={clsx(props.className)} />;
}
