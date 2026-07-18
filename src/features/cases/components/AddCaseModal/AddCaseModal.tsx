"use client";

import { useState } from "react";
import { Form } from "react-aria-components";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { createCaseWithClientAction } from "@/features/cases/actions";
import { CaseWithClientCreatePayloadSchema } from "@/features/cases/schemas";
import { CaseStatus } from "@/generated/prisma/browser";
import {
  createFieldValidator,
  optionalString,
  requiredString,
  selectEnumHandler,
} from "@/lib/form-utils";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./AddCaseModal.module.css";

const STATUS_OPTIONS = Object.values(CaseStatus);

interface AddCaseModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

interface ClientFields {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface CaseFields {
  caseTitle: string;
  caseType: string;
  status: CaseStatus;
  partiesInvolved: string;
}

function resetClient(): ClientFields {
  return { name: "", email: "", phone: "", address: "" };
}

function resetCase(): CaseFields {
  return {
    caseTitle: "",
    caseType: "",
    status: CaseStatus.Open,
    partiesInvolved: "",
  };
}

export function AddCaseModal({ isOpen, onOpenChange, onSuccess }: AddCaseModalProps) {
  const [client, setClient] = useState<ClientFields>(resetClient());
  const [caseFields, setCaseFields] = useState<CaseFields>(resetCase());

  const { name, email, phone, address } = client;
  const { caseTitle, caseType, status, partiesInvolved } = caseFields;

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof CaseWithClientCreatePayloadSchema>
  >({
    submit: createCaseWithClientAction,
    onOpenChange,
    onSuccess,
    successMessage: "Case created",
    failureMessage: "Failed to create case. Please try again.",
    schema: CaseWithClientCreatePayloadSchema,
    reset: () => {
      setClient(resetClient());
      setCaseFields(resetCase());
    },
  });

  function setClientField<K extends keyof ClientFields>(key: K, value: string) {
    setClient((prev) => ({ ...prev, [key]: value }));
  }

  function setCaseField<K extends keyof CaseFields>(key: K, value: CaseFields[K]) {
    setCaseFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (isPending) return;

    await submitForm({
      client: {
        name: requiredString(name),
        email: optionalString(email),
        phone_number: optionalString(phone),
        address: optionalString(address),
      },
      case: {
        case_title: requiredString(caseTitle),
        case_type: requiredString(caseType),
        status,
        parties_involved: optionalString(partiesInvolved),
      },
    });
  }

  return (
    <Modal title="New Case" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <Form onSubmit={handleSubmit}>
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Client Name"
              value={name}
              onChange={(v) => setClientField("name", v)}
              placeholder="Full name"
              validate={createFieldValidator(
                CaseWithClientCreatePayloadSchema.shape.client.shape.name,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Email"
              value={email}
              onChange={(v) => setClientField("email", v)}
              placeholder="Optional"
              validate={createFieldValidator(
                CaseWithClientCreatePayloadSchema.shape.client.shape.email,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Phone"
              value={phone}
              onChange={(v) => setClientField("phone", v)}
              placeholder="Optional"
              validate={createFieldValidator(
                CaseWithClientCreatePayloadSchema.shape.client.shape.phone_number,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Address"
              value={address}
              onChange={(v) => setClientField("address", v)}
              placeholder="Optional"
              isTextArea
              rows={3}
              validate={createFieldValidator(
                CaseWithClientCreatePayloadSchema.shape.client.shape.address,
              )}
              isDisabled={isPending}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.column}>
            <TextField
              label="Case Title"
              value={caseTitle}
              onChange={(v) => setCaseField("caseTitle", v)}
              placeholder="Case title"
              validate={createFieldValidator(
                CaseWithClientCreatePayloadSchema.shape.case.shape.case_title,
              )}
              isDisabled={isPending}
            />
            <TextField
              label="Case Type"
              value={caseType}
              onChange={(v) => setCaseField("caseType", v)}
              placeholder="e.g. Civil, Corporate"
              validate={createFieldValidator(
                CaseWithClientCreatePayloadSchema.shape.case.shape.case_type,
              )}
              isDisabled={isPending}
            />
            <Select
              label="Status"
              value={status}
              onChange={selectEnumHandler(CaseStatus, (value) => setCaseField("status", value))}
              isDisabled={isPending}
            >
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} id={s}>
                  {s}
                </SelectItem>
              ))}
            </Select>
            <TextField
              label="Parties Involved"
              value={partiesInvolved}
              onChange={(v) => setCaseField("partiesInvolved", v)}
              placeholder="Optional..."
              isTextArea
              rows={3}
              validate={createFieldValidator(
                CaseWithClientCreatePayloadSchema.shape.case.shape.parties_involved,
              )}
              isDisabled={isPending}
            />
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" type="button" onPress={handleCancel} isDisabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={isPending} isPending={isPending}>
            Create
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
