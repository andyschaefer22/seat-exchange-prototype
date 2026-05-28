"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function FanPageContext({ fanId, orderId }: { fanId: string; orderId?: string }) {
  const setContextPage = useStore((s) => s.setContextPage);
  useEffect(() => {
    setContextPage({ kind: "fan", fanId, orderId });
  }, [fanId, orderId, setContextPage]);
  return null;
}
