"use client";

import { CalendarDate, getLocalTimeZone, Time, today } from "@internationalized/date";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import { Modal } from "@/components/ui/Modal/Modal";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { TimeField } from "@/components/ui/TimeField/TimeField";
import { createConsultationWithClientAction } from "@/features/consultations/actions";
import { ConsultationWithClientCreatePayloadSchema } from "@/features/consultations/schemas";
import { ConsultationStatus } from "@/generated/prisma/browser";
import { combineDateTime } from "@/lib/date";
import { useModalForm } from "@/lib/useModalForm";

import styles from "./AddConsultationModal.module.css";

const STATUS_OPTIONS = Object.values(ConsultationStatus);

interface AddConsultationModalProps {
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

function resetClient(): ClientFields {
  return { name: "", email: "", phone: "", address: "" };
}

interface ConsultationFields {
  concern: string;
  date: CalendarDate;
  time: Time;
  status: ConsultationStatus;
}

function resetConsultation(): ConsultationFields {
  return {
    concern: "",
    date: today(getLocalTimeZone()),
    time: new Time(9, 0),
    status: ConsultationStatus.Scheduled,
  };
}

export function AddConsultationModal({
  isOpen,
  onOpenChange,
  onSuccess,
}: AddConsultationModalProps) {
  const [client, setClient] = useState<ClientFields>(resetClient());
  const [consultation, setConsultation] = useState<ConsultationFields>(resetConsultation);

  const { name, email, phone, address } = client;
  const { concern, date, time, status } = consultation;

  const { isPending, submitForm, handleCancel } = useModalForm<
    z.input<typeof ConsultationWithClientCreatePayloadSchema>
  >({
    submit: createConsultationWithClientAction,
    onOpenChange,
    onSuccess,
    successMessage: "Consultation created",
    failureMessage: "Failed to create consultation. Please try again.",
    reset: () => {
      setClient(resetClient());
      setConsultation(resetConsultation());
    },
  });

  function setClientField<K extends keyof ClientFields>(key: K, value: string) {
    setClient((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!name.trim() || !concern.trim() || isPending) return;

    await submitForm({
      client: {
        name: name.trim(),
        email: email.trim() || undefined,
        phone_number: phone.trim() || undefined,
        address: address.trim() || undefined,
      },
      consultation: {
        concern: concern.trim(),
        booking_datetime: combineDateTime(date, time),
        status,
      },
    });
  }

  return (
    <Modal
      title="New Consultation"
      isOpen={isOpen}
      onOpenChange={handleCancel}
      className={styles.modal}
    >
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
            label="Concern"
            value={concern}
            onChange={(v) => setConsultation((p) => ({ ...p, concern: v }))}
            placeholder="Consultation concern"
            isTextArea
            rows={4}
            isDisabled={isPending}
          />
          <DatePicker
            label="Booking Date"
            value={date}
            onChange={(v) => v && setConsultation((p) => ({ ...p, date: v }))}
            isDisabled={isPending}
          />
          <TimeField
            label="Booking Time"
            value={time}
            onChange={(v) =>
              v && setConsultation((p) => ({ ...p, time: new Time(v.hour, v.minute) }))
            }
            isDisabled={isPending}
          />
          <Select
            label="Status"
            value={status}
            onChange={(k) =>
              setConsultation((p) => ({ ...p, status: String(k) as ConsultationStatus }))
            }
            isDisabled={isPending}
          >
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} id={s}>
                {s}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onPress={handleCancel} isDisabled={isPending}>
          Cancel
        </Button>
        <Button onPress={handleSubmit} isDisabled={!name.trim() || !concern.trim() || isPending}>
          {isPending ? "Saving..." : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
