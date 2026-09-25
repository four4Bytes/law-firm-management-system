"use client";

import clsx from "clsx";
import type { LinkProps as AriaLinkProps } from "react-aria-components";

import buttonStyles from "@/components/ui/Button/Button.module.css";
import { Link } from "@/components/ui/Link/Link";

import styles from "./ButtonLink.module.css";

interface ButtonLinkProps extends AriaLinkProps {
  variant?: "primary" | "secondary" | "navigation" | "ghost";
}

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={clsx(
        buttonStyles.button,
        buttonStyles[variant],
        styles.buttonLink,
        variant === "ghost" && styles.buttonLinkGhost,
        className,
      )}
    />
  );
}
