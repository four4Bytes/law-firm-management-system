"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { Modal } from "@/components/ui/Modal/Modal";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { queue } from "@/components/ui/Toast/Toast";
import {
  deleteCaseAction,
  getCaseForEditAction,
  updateCaseWithClientAction,
} from "@/features/cases/actions";
import type { CaseEditData } from "@/features/cases/queries";
import { getClientForEditAction } from "@/features/clients/actions";
import { CaseStatus } from "@/generated/prisma/browser";

import styles from "./EditCaseModal.module.css";

const STATUS_OPTIONS = Object.values(CaseStatus);

interface EditCaseModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  onDeleted: () => void;
  caseId: string | null;
}

export function EditCaseModal({
  isOpen,
  onOpenChange,
  onSuccess,
  onDeleted,
  caseId,
}: EditCaseModalProps) {
  const [caseData, setCaseData] = useState<CaseEditData | null>(null);

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [caseTitle, setCaseTitle] = useState("");
  const [caseType, setCaseType] = useState<string>("");
  const [status, setStatus] = useState<CaseStatus>(CaseStatus.Open);
  const [partiesInvolved, setPartiesInvolved] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleDismiss() {
    if (isSaving || isDeleting) return;
    onOpenChange(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        if (!caseId) {
          setIsLoading(false);
          setCaseData(null);
          return;
        }
        const data = await getCaseForEditAction(caseId);
        if (cancelled) return;

        if (data) {
          setCaseData(data);
          setClientId(data.client_id);
          setCaseTitle(data.case_title);
          setCaseType(data.case_type);
          setStatus(data.status as CaseStatus);
          setPartiesInvolved(data.parties_involved ?? "");

          const clientData = await getClientForEditAction(data.client_id);
          if (cancelled) return;

          if (clientData) {
            setClientName(clientData.name);
            setClientEmail(clientData.email ?? "");
            setClientPhone(clientData.phone_number ?? "");
            setClientAddress(clientData.address ?? "");
          }
        } else {
          setCaseData(null);
        }
      } catch {
        if (cancelled) return;
        setCaseData(null);
        queue.add({ title: "Failed to load case" }, { timeout: 5000 });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, caseId]);

  async function handleSave() {
    if (!clientId || !clientName.trim() || !caseTitle.trim() || !caseId || isSaving) return;

    setIsSaving(true);

    try {
      const result = await updateCaseWithClientAction({
        case_id: caseId,
        client_id: clientId,
        client: {
          name: clientName.trim(),
          email: clientEmail.trim() || undefined,
          phone_number: clientPhone.trim() || undefined,
          address: clientAddress.trim() || undefined,
        },
        case: {
          case_title: caseTitle.trim(),
          case_type: caseType,
          status,
          parties_involved: partiesInvolved.trim() || undefined,
        },
      });

      if (!result.success) {
        queue.add({ title: result.error ?? "Failed to update case" }, { timeout: 5000 });
        return;
      }

      queue.add({ title: "Case updated" }, { timeout: 5000 });
      onOpenChange(false);
      onSuccess();
    } catch {
      queue.add({ title: "Failed to update case. Please try again." }, { timeout: 5000 });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!caseId) return;
    setIsDeleting(true);

    try {
      const result = await deleteCaseAction({ caseId });

      setShowDeleteConfirm(false);

      if (result.success) {
        queue.add({ title: "Case deleted" }, { timeout: 5000 });
        onOpenChange(false);
        onDeleted();
      } else {
        queue.add({ title: result.error ?? "Failed to delete case" }, { timeout: 5000 });
      }
    } catch {
      queue.add({ title: "Failed to delete case. Please try again." }, { timeout: 5000 });
    } finally {
      setIsDeleting(false);
    }
  }

  const isLoadingData = isOpen && isLoading;
  const isValid =
    clientId.length > 0 && clientName.trim().length > 0 && caseTitle.trim().length > 0;

  if (isLoadingData) {
    return (
      <Modal
        title="Edit Case"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading case" />
        </div>
      </Modal>
    );
  }

  if (!caseData) {
    return (
      <Modal
        title="Edit Case"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.loadingContainer}>
          <span>Case not found.</span>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        title="Edit Case"
        isOpen={isOpen}
        onOpenChange={handleDismiss}
        className={styles.modal}
      >
        <div className={styles.columns}>
          <div className={styles.column}>
            <TextField
              label="Client Name"
              value={clientName}
              onChange={setClientName}
              isDisabled={isSaving || isDeleting}
            />
            <TextField
              label="Email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="Optional"
              isDisabled={isSaving || isDeleting}
            />
            <TextField
              label="Phone"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="Optional"
              isDisabled={isSaving || isDeleting}
            />
            <TextField
              label="Address"
              value={clientAddress}
              onChange={setClientAddress}
              placeholder="Optional"
              isTextArea
              rows={3}
              isDisabled={isSaving || isDeleting}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.column}>
            <TextField
              label="Case Title"
              value={caseTitle}
              onChange={setCaseTitle}
              isDisabled={isSaving || isDeleting}
            />
            <TextField
              label="Case Type"
              value={caseType}
              onChange={setCaseType}
              placeholder="e.g. Civil, Corporate"
              isDisabled={isSaving || isDeleting}
            />
            <Select
              label="Status"
              value={status}
              onChange={(k) => setStatus(String(k) as CaseStatus)}
              isDisabled={isSaving || isDeleting}
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
              onChange={setPartiesInvolved}
              isTextArea
              rows={3}
              isDisabled={isSaving || isDeleting}
            />
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onPress={handleSave}
            isDisabled={!isValid || isSaving || isDeleting}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button onPress={() => setShowDeleteConfirm(true)} isDisabled={isSaving || isDeleting}>
            {isDeleting ? <ProgressCircle aria-label="Deleting" /> : "Delete"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Case"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        This permanently deletes the case and ALL its tasks, milestones, notes, documents,
        assignments, and payments. This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
