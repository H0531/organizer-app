"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

function GATracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    // 第一次載入不重複觸發（layout.tsx 的 gtag config 已觸發一次）
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (!window.gtag) return;
    const search = searchParams.toString();
    const url = pathname + (search ? `?${search}` : "");
    window.gtag("event", "page_view", { page_path: url });
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GATracker />
    </Suspense>
  );
}
