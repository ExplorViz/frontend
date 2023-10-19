export const CHANGELOG_REMOVE_ENTRY_EVENT = 'changelog_remove_entry';
export const CHANGELOG_RESTORE_ENTRIES_EVENT = 'changelog_restore_entries';

export type ChangeLogRemoveEntryMessage = {
  event: typeof CHANGELOG_REMOVE_ENTRY_EVENT;
  entryIds: string[];
};

export type ChangeLogRestoreEntriesMessage = {
  event: typeof CHANGELOG_RESTORE_ENTRIES_EVENT;
  key: string;
};
