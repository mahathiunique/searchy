import { createContext, useContext } from "react";
import type { DemoRole } from "./data";

export type ToastKind = "success" | "info" | "error";
export type ToastMessage = { id: number; title: string; description?: string; kind: ToastKind };

export type AppContextValue = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  toast: (title: string, description?: string, kind?: ToastKind) => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppContext.Provider");
  return context;
}
