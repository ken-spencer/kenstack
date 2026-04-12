"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kenstack/components/ui/dialog";

import { Settings } from "lucide-react";
import IconButton from "@kenstack/components/IconButton";
import Form from "./Form";

export default function PageEditSettingsModal() {
  return (
    <Dialog>
      <DialogTrigger className="absolute -top-6 -right-2 rounded-full bg-black/20">
        <Settings className="h-6 w-6" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Page Meta</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Form />
      </DialogContent>
    </Dialog>
  );

  return <IconButton tooltip="Manage Meta"></IconButton>;
}
