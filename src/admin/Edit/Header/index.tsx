"use client";
import DeleteButton, { RestoreButton } from "./DeleteButton";
import ListButton from "./ListButton";
import NewButton from "./NewButton";
import PreviewButton from "./PreviewButton";
import RevisionHistoryButton from "./RevisionHistoryButton";
import SaveButton from "./SaveButton";
import SwitchUserButton from "./SwitchUserButton";

export default function AdminEditHeader() {
  return (
    <div className="flex gap-4 border-b">
      <div className="flex grow gap-1">
        <NewButton />
        <ListButton />
        <SaveButton />
      </div>
      <div className="flex gap-1">
        <PreviewButton />
        <SwitchUserButton />
        <RevisionHistoryButton />
        <RestoreButton />
        <DeleteButton />
      </div>
    </div>
  );
}
