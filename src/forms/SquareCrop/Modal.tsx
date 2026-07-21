"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@kenstack/components/Dialog";
import type { CropSource, SquareCrop } from "@kenstack/db/tables/media/types";
import SquareCropEditor from "./Editor";

export default function SquareCropModal({
  crop,
  onChange,
  onClose,
  round = false,
  source,
}: {
  crop?: SquareCrop | null;
  onChange: (crop: SquareCrop | null) => void;
  onClose: () => void;
  round?: boolean;
  source: CropSource;
}) {
  const [stagedCrop, setStagedCrop] = useState(crop ?? null);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="h-[min(44rem,calc(100vh-2rem))] w-[calc(100%-2rem)] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[32rem]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Adjust crop</DialogTitle>
        <DialogDescription className="sr-only">
          Reposition and zoom the image used for its square thumbnail.
        </DialogDescription>
        <SquareCropEditor
          crop={stagedCrop}
          round={round}
          source={source}
          onCancel={onClose}
          onChange={setStagedCrop}
          onDone={() => {
            onChange(stagedCrop);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
