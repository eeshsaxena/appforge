"use client";

import { createContext, useContext } from "react";
import { AppDetail } from "@/lib/types";

const AppContext = createContext<AppDetail | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: AppDetail;
  children: React.ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Access the current app's detail (raw + normalized config) without refetching. */
export function useAppDetail(): AppDetail {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppDetail must be used within <AppProvider>");
  return ctx;
}
