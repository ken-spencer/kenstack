"use client";

import Alert from "@kenstack/components/Alert";
import { useForm } from "@kenstack/forms/context";
import { useEffect, useRef } from "react";
import { Button } from "@kenstack/components/ui/button";
import { CircleX } from "lucide-react";

export default function NoticeList() {
  const { statusMessage, setStatusMessage } = useForm();
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // Scroll only as much as needed vertically
      });
    }
  }, [statusMessage]);
  if (statusMessage === null) {
    return;
  }
  return (
    <Alert ref={ref} status={statusMessage.status} className="scroll-mt-12">
      <div className="flex items-center">
        <div className="flex-grow">{statusMessage.message}</div>
        <Button
          size="icon"
          className="flex-0"
          variant="ghost"
          onClick={() => setStatusMessage(null)}
        >
          <CircleX />
        </Button>
      </div>
    </Alert>
  );
}
