"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { Link as RACLink, type LinkProps as RACLinkProps } from "react-aria-components";

import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";

import styles from "./Link.module.css";

export interface LinkProps extends RACLinkProps {
  variant?: "inline" | "unstyled";
}

export function Link({
  className,
  onPress,
  href,
  target,
  download,
  variant = "inline",
  ...props
}: LinkProps) {
  const { startLoading } = useNavigationProgress();
  const variantClassName = variant === "unstyled" ? undefined : styles.link;

  return (
    <RACLink
      {...props}
      href={href}
      target={target}
      download={download}
      className={clsx(variantClassName, className)}
      onPress={(e) => {
        const isExternal = href && (href.startsWith("http://") || href.startsWith("https://"));
        const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
        const isHashOnly = href && href.startsWith("#");
        const isNonRouteScheme = href && (href.startsWith("mailto:") || href.startsWith("tel:"));
        const hasDownload = download != null;
        const shouldStartLoading =
          href &&
          !isExternal &&
          !target &&
          !hasDownload &&
          !hasModifier &&
          !isHashOnly &&
          !isNonRouteScheme;

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
