"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kenstack/components/AlertDialog";

// An emailed link opened in a new tab while another tab waited on that sign-in: the waiting tab
// carries on, so this one only asks to be closed.
export default function AnsweredDialog() {
  return (
    <AlertDialog open>
      <AlertDialogContent showCloseButton={false}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            You’re signed in. Close this tab to continue.
          </AlertDialogTitle>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
