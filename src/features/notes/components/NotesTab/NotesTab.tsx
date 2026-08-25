"use client";

import { useCallback, useRef, useState } from "react";
import { FaEye, FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getCaseNotesPaginatedAction } from "@/features/cases/actions";
import { getConsultationNotesPaginatedAction } from "@/features/consultations/actions";
import { deleteNoteAction, getNoteRowByIdAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import { ViewNoteModal } from "@/features/notes/components/ViewNoteModal/ViewNoteModal";
import type { NoteRow } from "@/features/notes/queries";
import type { Role } from "@/generated/prisma/browser";
import { formatDateTime } from "@/lib/date";
import { can, type AccessContext } from "@/lib/rbac";
import {
  toastActionError,
  toastDenied,
  toastError,
  toastNotFound,
  toastSuccess,
} from "@/lib/toast-utils";

import styles from "./NotesTab.module.css";

type Props = {
  access: AccessContext;
  userRole: Role | null;
} & ({ caseId: string; consultationId?: never } | { caseId?: never; consultationId: string });

const columns: ColumnDef<NoteRow>[] = [
  { id: "content", name: "Content", isRowHeader: true },
  { id: "author", name: "Author" },
  { id: "created_at", name: "Created At", render: (value) => formatDateTime(value as Date) },
];

export function NotesTab({ caseId, consultationId, access, userRole }: Props) {
  const [isAddOpen, setAddOpen] = useState(false);
  const [viewNote, setViewNote] = useState<NoteRow | null>(null);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NoteRow | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const latestRequest = useRef(0);

  const canCreate = can(userRole, "note.create", access);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function handleEdit(note: NoteRow) {
    const requestId = ++latestRequest.current;
    setPendingEditId(note.id);
    try {
      const data = await getNoteRowByIdAction(note.id);
      if (requestId !== latestRequest.current) return;
      if (!data.row) {
        toastNotFound("Note");
        return;
      }
      if (!data.canUpdate) {
        toastDenied();
        return;
      }
      setEditNote(data.row);
    } catch {
      if (requestId !== latestRequest.current) return;
      toastError("Failed to load note", "Please try again in a moment.");
    } finally {
      if (requestId === latestRequest.current) setPendingEditId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteNoteAction({ noteId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      handleRefresh();
      toastSuccess("Note deleted", "The note has been deleted.");
    } else {
      toastActionError(result, "delete note");
    }
  }

  const actionColumn: ColumnDef<NoteRow> = {
    id: "id" as const,
    name: "Action" as const,
    render: (_value: unknown, row: unknown) => {
      const note = row as NoteRow;
      return (
        <div className={styles.actions}>
          <Button variant="ghost" aria-label="View note" onPress={() => setViewNote(note)}>
            <FaEye className={styles.icon} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Edit note"
            onPress={() => handleEdit(note)}
            isPending={pendingEditId === note.id}
          >
            <FaPenToSquare className={styles.icon} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Delete note"
            onPress={() => {
              latestRequest.current++;
              setPendingEditId(null);
              setDeleteTarget(note);
            }}
          >
            <FaTrashCan className={styles.icon} />
          </Button>
        </div>
      );
    },
  };

  return (
    <>
      <ServerDataTable
        refreshTrigger={refreshKey}
        fetchAction={(p) => {
          if (caseId) {
            return getCaseNotesPaginatedAction({ caseId, ...p });
          }
          if (consultationId) {
            return getConsultationNotesPaginatedAction({ consultationId, ...p });
          }
          throw new Error("NotesTab requires exactly one parent ID");
        }}
        columns={[...columns, actionColumn]}
        searchPlaceholder="Search notes..."
        emptyContent="No notes yet"
        loadingMessage="Loading notes..."
        searchLabel="Search notes"
        selectionMode="none"
        collectionDependencies={[pendingEditId]}
        renderAddButton={canCreate}
        addButtonLabel="Add Note"
        onAddButtonPress={() => setAddOpen(true)}
      />
      <AddNoteModal
        isOpen={isAddOpen}
        onOpenChange={setAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
        consultationId={consultationId}
      />
      {viewNote && (
        <ViewNoteModal isOpen={!!viewNote} onOpenChange={() => setViewNote(null)} note={viewNote} />
      )}
      {editNote && (
        <EditNoteModal
          key={editNote.id}
          isOpen={!!editNote}
          onOpenChange={() => setEditNote(null)}
          onSuccess={handleRefresh}
          note={editNote}
        />
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Note"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this note? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
