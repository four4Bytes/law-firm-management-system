"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { FieldError, Form } from "@/components/ui/Form/Form";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { checkDeveloperEmail, createUserAction, updateUserAction } from "@/features/users/actions";
import { CREATABLE_ROLES, roleLabels } from "@/features/users/constants";
import type { UserRow } from "@/features/users/queries";

import styles from "./UserFormModal.module.css";

interface UserFormModalProps {
  mode: "add" | "edit";
  user?: UserRow;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

export function UserFormModal({ mode, user, isOpen, onOpenChange, onSuccess }: UserFormModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [pendingDevEmail, setPendingDevEmail] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);

    try {
      const email = formData.get("email") as string;
      const role = formData.get("role") as string;

      if (!email || !role) {
        setError("All fields are required.");
        return;
      }

      if (mode === "add") {
        const isDev = await checkDeveloperEmail(email);
        if (isDev) {
          setPendingDevEmail(email);
          return;
        }
      }

      const result =
        mode === "edit" && user
          ? await updateUserAction(user.id, email, role)
          : await createUserAction(email, role);

      if (result.error) {
        queue.add({ title: result.error });
        setError(result.error);
        return;
      }

      queue.add(
        { title: mode === "edit" ? "User updated" : "User created", description: email },
        { timeout: 5000 },
      );
      onSuccess?.();
      onOpenChange(false);
    } catch {
      setError("An unexpected error occurred.");
      queue.add({ title: "An unexpected error occurred." }, { timeout: 5000 });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDevConfirm() {
    if (!pendingDevEmail) return;
    setIsPending(true);
    setError(null);
    const result = await createUserAction(pendingDevEmail, "Dev");
    if (result.error) {
      queue.add({ title: result.error });
      setError(result.error);
    } else {
      queue.add(
        { title: "Developer account activated", description: pendingDevEmail },
        { timeout: 5000 },
      );
      onSuccess?.();
      onOpenChange(false);
    }
    setPendingDevEmail(null);
    setIsPending(false);
  }

  return (
    <Modal
      className={styles.modal}
      title={mode === "edit" ? "Edit User" : "Add User"}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Form action={handleSubmit} className={styles.form}>
        <TextField
          label="Email"
          name="email"
          type="email"
          isRequired
          defaultValue={user?.email ?? ""}
          placeholder="user@example.com"
          className={styles.field}
        />

        <Select
          label="Role"
          name="role"
          isRequired
          defaultValue={user?.role ?? null}
          className={styles.field}
        >
          {CREATABLE_ROLES.map((role) => (
            <SelectItem id={role} key={role}>
              {roleLabels[role]}
            </SelectItem>
          ))}
        </Select>

        {error && <FieldError className={styles.formError}>{error}</FieldError>}

        <div className={styles.actions}>
          <Button
            className={styles.button}
            type="button"
            variant="secondary"
            onPress={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className={styles.button} type="submit" variant="primary" isPending={isPending}>
            {mode === "edit" ? "Update" : "Save"}
          </Button>
        </div>
      </Form>

      <ConfirmDialog
        isOpen={!!pendingDevEmail}
        onOpenChange={(open) => {
          if (!open) setPendingDevEmail(null);
        }}
        title="Developer Account"
        confirmLabel="Activate"
        onConfirm={handleDevConfirm}
      >
        This email is a system developer account. It will be activated with the Developer role.
        Continue?
      </ConfirmDialog>
    </Modal>
  );
}
