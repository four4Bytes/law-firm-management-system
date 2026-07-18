"use client";

import { useRef, useState } from "react";
import { Form } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { checkDeveloperEmail, createUserAction, updateUserAction } from "@/features/users/actions";
import { CREATABLE_ROLES, roleLabels } from "@/features/users/constants";
import type { UserRow } from "@/features/users/queries";
import { CreateUserSchema, UpdateUserSchema } from "@/features/users/schemas";
import type { Role } from "@/generated/prisma/browser";
import { createFieldValidator, requiredString, selectEnumHandler } from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./UserFormModal.module.css";

const ROLE_ENUM = Object.fromEntries(CREATABLE_ROLES.map((role) => [role, role])) as Record<
  (typeof CREATABLE_ROLES)[number],
  (typeof CREATABLE_ROLES)[number]
>;

interface UserFormModalProps {
  mode: "add" | "edit";
  user?: UserRow;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

export function UserFormModal({ mode, user, isOpen, onOpenChange, onSuccess }: UserFormModalProps) {
  const isEdit = mode === "edit" && !!user;

  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role | null>(user?.role ?? null);
  const [pendingDevEmail, setPendingDevEmail] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const { isPending, submitForm } = useModalForm<{ email: string; role: Role; userId?: string }>({
    submit: async (args) =>
      isEdit
        ? updateUserAction({ userId: args.userId!, email: args.email, role: args.role })
        : createUserAction({ email: args.email, role: args.role }),
    onOpenChange,
    onSuccess,
    successMessage: isEdit ? "User updated" : "User created",
    failureMessage: "Failed to save user",
    schema: isEdit ? UpdateUserSchema : CreateUserSchema,
  });

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending || submittingRef.current) return;
    if (!email || !role) return;

    submittingRef.current = true;

    try {
      if (mode === "add") {
        try {
          const isDev = await checkDeveloperEmail(email);
          if (isDev) {
            setPendingDevEmail(email);
            return;
          }
        } catch {
          queue.add({ title: "Failed to verify email. Please try again." }, { timeout: 5000 });
          return;
        }
      }

      await submitForm({ email: requiredString(email), role, userId: user?.id });
    } finally {
      submittingRef.current = false;
    }
  }

  async function handleDevConfirm() {
    if (!pendingDevEmail) return;

    try {
      const result = await createUserAction({ email: pendingDevEmail, role: role ?? "Dev" });
      if (result.error) {
        queue.add({ title: result.error });
      } else {
        queue.add(
          { title: "Developer account activated", description: pendingDevEmail },
          { timeout: 5000 },
        );
        onSuccess?.();
        onOpenChange(false);
      }
    } catch {
      queue.add({ title: "An unexpected error occurred." }, { timeout: 5000 });
    } finally {
      setPendingDevEmail(null);
    }
  }

  return (
    <Modal
      className={styles.modal}
      title={mode === "edit" ? "Edit User" : "Add User"}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Form onSubmit={handleSubmit}>
        <div className={styles.form}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="user@example.com"
            validate={createFieldValidator(CreateUserSchema.shape.email)}
            isDisabled={isPending}
          />

          <Select
            label="Role"
            value={role}
            onChange={selectEnumHandler(ROLE_ENUM, setRole)}
            placeholder="Select a role"
            validate={createFieldValidator(CreateUserSchema.shape.role)}
            isDisabled={isPending}
          >
            {CREATABLE_ROLES.map((option) => (
              <SelectItem id={option} key={option}>
                {roleLabels[option]}
              </SelectItem>
            ))}
          </Select>

          <div className={styles.actions}>
            <Button
              className={styles.button}
              type="button"
              variant="secondary"
              onPress={() => onOpenChange(false)}
              isDisabled={isPending}
            >
              Cancel
            </Button>
            <Button
              className={styles.button}
              type="submit"
              variant="primary"
              isDisabled={isPending}
              isPending={isPending}
            >
              {mode === "edit" ? "Update" : "Save"}
            </Button>
          </div>
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
