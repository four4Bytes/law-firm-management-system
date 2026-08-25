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

export interface ToastContent {
  title: string;
  /** Supporting line rendered under the title. Always present. */
  description: string;
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
