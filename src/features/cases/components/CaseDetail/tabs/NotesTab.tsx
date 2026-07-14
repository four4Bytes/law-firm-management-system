"use client";

import { useCallback, useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import { getCaseNotesPaginatedAction } from "@/features/cases/actions";
import type { NoteRow } from "@/features/cases/queries";
import { getNoteRowByIdAction } from "@/features/notes/actions";
import { AddNoteModal } from "@/features/notes/components/AddNoteModal/AddNoteModal";
import { EditNoteModal } from "@/features/notes/components/EditNoteModal/EditNoteModal";
import { formatDateTime } from "@/lib/date";

interface Props {
  caseId: string;
}

const columns: ColumnDef<NoteRow>[] = [
  { id: "content", name: "Content", isRowHeader: true },
  { id: "author", name: "Author" },
  { id: "created_at", name: "Created At", render: (value) => formatDateTime(value as Date) },
];

export function NotesTab({ caseId }: Props) {
  const [isAddOpen, setAddOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function handleRowAction(id: string) {
    try {
      const data = await getNoteRowByIdAction(id);
      setEditNote(data);
    } catch {
      queue.add({ title: "Failed to load note" }, { timeout: 5000 });
    }
  }

  return (
    <>
      <ServerDataTable
        refreshTrigger={refreshKey}
        fetchAction={(p) => getCaseNotesPaginatedAction({ caseId, ...p })}
        columns={columns}
        searchPlaceholder="Search notes..."
        emptyContent="No notes yet"
        loadingMessage="Loading notes..."
        searchLabel="Search notes"
        renderAddButton
        addButtonLabel="Add Note"
        onAddButtonPress={() => setAddOpen(true)}
        onRowAction={handleRowAction}
      />
      <AddNoteModal
        isOpen={isAddOpen}
        onOpenChange={setAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
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
