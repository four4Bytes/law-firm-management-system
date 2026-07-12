"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { Link as RACLink, type LinkProps as RACLinkProps } from "react-aria-components";

import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";

import styles from "./Link.module.css";

export function Link({ className, onPress, href, target, download, ...props }: RACLinkProps) {
  const { startLoading } = useNavigationProgress();

  return (
    <RACLink
      {...props}
      href={href}
      target={target}
      download={download}
      className={clsx(styles.link, className)}
      onPress={(e) => {
        const isExternal = href && (href.startsWith("http://") || href.startsWith("https://"));
        const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
        const shouldStartLoading = href && !isExternal && !target && !download && !hasModifier;

        if (shouldStartLoading) {
          startLoading();
        }
        onPress?.(e);
      }}
      render={(domProps) => {
        if ("href" in domProps) {
          return <NextLink {...domProps} />;
        }
        return <span {...domProps} />;
      }}
    />
  );
}
