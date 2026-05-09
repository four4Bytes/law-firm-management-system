"use client";

import { Button as RACButton, ButtonProps } from "react-aria-components";
import React from "react";

interface ButtonPropsExtended extends Omit<ButtonProps, "className"> {
  className?: string;
}

export const Button: React.FC<ButtonPropsExtended> = ({
  className,
  children,
  ...props
}) => {
  return (
    <RACButton className={className} {...props}>
      {children}
    </RACButton>
  );
};
