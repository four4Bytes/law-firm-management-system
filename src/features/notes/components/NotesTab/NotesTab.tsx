"use client";

import { useCallback, useRef, useState } from "react";
import { FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import { getCaseNotesPaginatedAction } from "@/features/cases/actions";
import { getConsultationNotesPaginatedAction } from "@/features/consultations/actions";
import { deleteNoteAction, getNoteRowByIdAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import type { NoteRow } from "@/features/notes/queries";
import type { Role } from "@/generated/prisma/browser";
import { formatDateTime } from "@/lib/date";
import { can, type AccessContext } from "@/lib/rbac";

import styles from "./NotesTab.module.css";

interface Props {
  caseId?: string;
  consultationId?: string;
  access: AccessContext;
  userRole: Role | null;
}

const columns: ColumnDef<NoteRow>[] = [
  { id: "content", name: "Content", isRowHeader: true },
  { id: "author", name: "Author" },
  { id: "created_at", name: "Created At", render: (value) => formatDateTime(value as Date) },
];

export function NotesTab({ caseId, consultationId, access, userRole }: Props) {
  const [isAddOpen, setAddOpen] = useState(false);
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
        queue.add({ title: "Note not found" }, { timeout: 5000 });
        return;
      }
      if (!data.canUpdate) {
        queue.add({ title: "You don't have permission to edit this note." }, { timeout: 5000 });
        return;
      }
      setEditNote(data.row);
    } catch {
      if (requestId !== latestRequest.current) return;
      queue.add({ title: "Failed to load note" }, { timeout: 5000 });
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
      queue.add({ title: "Note deleted" }, { timeout: 5000 });
    } else {
      queue.add({ title: result.error ?? "Failed to delete note" }, { timeout: 5000 });
    }
  }

  const actionColumn: ColumnDef<NoteRow> = {
    id: "id" as const,
    name: "Action" as const,
    render: (_value: unknown, row: unknown) => {
      const note = row as NoteRow;
      return (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            aria-label="Edit note"
            onPress={() => handleEdit(note)}
            isPending={pendingEditId === note.id}
          >
            <FaPenToSquare className={styles.icon} />
          </Button>
          <Button variant="ghost" aria-label="Delete note" onPress={() => setDeleteTarget(note)}>
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
        fetchAction={(p) =>
          caseId
            ? getCaseNotesPaginatedAction({ caseId, ...p })
            : getConsultationNotesPaginatedAction({ consultationId: consultationId!, ...p })
        }
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
