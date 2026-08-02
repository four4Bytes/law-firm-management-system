"use client";

import { useCallback, useRef, useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import { getConsultationNotesPaginatedAction } from "@/features/consultations/actions";
import { getNoteRowByIdAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import type { NoteRow } from "@/features/notes/queries";
import type { Role } from "@/generated/prisma/browser";
import { formatDateTime } from "@/lib/date";
import { can, FORBIDDEN_MESSAGE, type AccessContext } from "@/lib/rbac";

interface Props {
  consultationId: string;
  access: AccessContext;
  userRole: Role | null;
}

const columns: ColumnDef<NoteRow>[] = [
  { id: "content", name: "Content", isRowHeader: true },
  { id: "author", name: "Author" },
  { id: "created_at", name: "Created At", render: (value) => formatDateTime(value as Date) },
];

export function NotesTab({ consultationId, access, userRole }: Props) {
  const [isAddOpen, setAddOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const latestRequest = useRef(0);

  const canCreate = can(userRole, "note.create", access);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function handleRowAction(id: string) {
    const requestId = ++latestRequest.current;
    try {
      const data = await getNoteRowByIdAction(id);
      if (requestId !== latestRequest.current) return;
      if (!data.row) {
        queue.add({ title: "Note not found" }, { timeout: 5000 });
        return;
      }
      if (!data.canUpdate) {
        queue.add({ title: FORBIDDEN_MESSAGE }, { timeout: 5000 });
        return;
      }
      setEditNote(data.row);
    } catch {
      if (requestId !== latestRequest.current) return;
      queue.add({ title: "Failed to load note" }, { timeout: 5000 });
    }
  }

  return (
    <>
      <ServerDataTable
        refreshTrigger={refreshKey}
        fetchAction={(p) => getConsultationNotesPaginatedAction({ consultationId, ...p })}
        columns={columns}
        searchPlaceholder="Search notes..."
        emptyContent="No notes yet"
        loadingMessage="Loading notes..."
        searchLabel="Search notes"
        renderAddButton={canCreate}
        addButtonLabel="Add Note"
        onAddButtonPress={() => setAddOpen(true)}
        onRowAction={handleRowAction}
      />
      <AddNoteModal
        isOpen={isAddOpen}
        onOpenChange={setAddOpen}
        onSuccess={handleRefresh}
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
    </>
  );
}
