"use client";

import { useState } from "react";
import { FaArrowRightFromBracket } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { logoutUser } from "@/features/auth/actions";

import styles from "./SignOutButton.module.css";

export function SignOutButton() {
  const [isOpen, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" aria-label="Sign out" onPress={() => setOpen(true)}>
        <FaArrowRightFromBracket className={styles.icon} />
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setOpen}
        title="Sign Out"
        confirmLabel="Sign Out"
        onConfirm={() => logoutUser()}
      >
        Are you sure you want to sign out?
      </ConfirmDialog>
    </>
  );
}
