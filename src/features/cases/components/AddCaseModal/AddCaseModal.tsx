"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import { createCaseAction } from "@/features/cases/actions";
import { createClientAction } from "@/features/clients/actions";
import { CaseStatus } from "@/generated/prisma/browser";

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
  const [isPending, setIsPending] = useState(false);

  const { name, email, phone, address } = client;
  const { caseTitle, caseType, status, partiesInvolved } = caseFields;

  function setClientField<K extends keyof ClientFields>(key: K, value: string) {
    setClient((prev) => ({ ...prev, [key]: value }));
  }

  function setCaseField<K extends keyof CaseFields>(key: K, value: CaseFields[K]) {
    setCaseFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    if (isPending) return;
    setClient(resetClient());
    setCaseFields(resetCase());
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!name.trim() || !caseTitle.trim() || isPending) return;

    setIsPending(true);

    const clientResult = await createClientAction({
      name: name.trim(),
      email: email.trim() || undefined,
      phone_number: phone.trim() || undefined,
      address: address.trim() || undefined,
    });

    if (!clientResult.success || !clientResult.data) {
      setIsPending(false);
      queue.add({ title: clientResult.error ?? "Failed to create client" }, { timeout: 5000 });
      return;
    }

    const caseResult = await createCaseAction({
      client_id: clientResult.data.id,
      case_title: caseTitle.trim(),
      case_type: caseType,
      status,
      parties_involved: partiesInvolved.trim() || undefined,
    });

    setIsPending(false);

    if (!caseResult.success) {
      queue.add({ title: caseResult.error ?? "Failed to create case" }, { timeout: 5000 });
      return;
    }

    setClient(resetClient());
    setCaseFields(resetCase());
    onSuccess();
  }

  return (
    <Modal title="New Case" isOpen={isOpen} onOpenChange={handleCancel} className={styles.modal}>
      <div className={styles.columns}>
        <div className={styles.column}>
          <TextField
            label="Client Name"
            value={name}
            onChange={(v) => setClientField("name", v)}
            placeholder="Full name"
            isDisabled={isPending}
          />
          <TextField
            label="Email"
            value={email}
            onChange={(v) => setClientField("email", v)}
            placeholder="Optional"
            isDisabled={isPending}
          />
          <TextField
            label="Phone"
            value={phone}
            onChange={(v) => setClientField("phone", v)}
            placeholder="Optional"
            isDisabled={isPending}
          />
          <TextField
            label="Address"
            value={address}
            onChange={(v) => setClientField("address", v)}
            placeholder="Optional"
            isTextArea
            rows={3}
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
            isDisabled={isPending}
          />
          <TextField
            label="Case Type"
            value={caseType}
            onChange={(v) => setCaseField("caseType", v)}
            placeholder="e.g. Civil, Corporate"
            isDisabled={isPending}
          />
          <Select
            label="Status"
            value={status}
            onChange={(k) => setCaseField("status", String(k) as CaseStatus)}
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
            isDisabled={isPending}
          />
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onPress={handleCancel} isDisabled={isPending}>
          Cancel
        </Button>
        <Button onPress={handleSubmit} isDisabled={!name.trim() || !caseTitle.trim() || isPending}>
          {isPending ? "Saving..." : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
