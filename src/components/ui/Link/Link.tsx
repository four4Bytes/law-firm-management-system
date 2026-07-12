"use client";

import clsx from "clsx";
import NextLink from "next/link";
import { Link as RACLink, type LinkProps as RACLinkProps } from "react-aria-components";

import { useNavigationProgress } from "@/components/ui/TopProgressBar/navigation-context";

import styles from "./Link.module.css";

export function Link({ className, onPress, ...props }: RACLinkProps) {
  const { startLoading } = useNavigationProgress();

  return (
    <RACLink
      {...props}
      className={clsx(styles.link, className)}
      onPress={(e) => {
        startLoading();
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
