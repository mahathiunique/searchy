import { useCallback, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CheckCircle2, Info, X } from "lucide-react";
import { AppShell } from "./components/layout";
import { DashboardPage, LoginPage, ProductPage } from "./pages";
import { AppContext, type ToastKind, type ToastMessage } from "./lib/app-context";
import type { DemoRole } from "./lib/data";

export default function App() {
  const [role, setRole] = useState<DemoRole>("Recruiter");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toast = useCallback((title: string, description?: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, title, description, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);

  return (
    <AppContext.Provider value={{ role, setRole, toast }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="requirements" element={<ProductPage />} />
          <Route path="requirements/new" element={<ProductPage />} />
          <Route path="requirements/:requirementId" element={<ProductPage />} />
          <Route path="requirements/:requirementId/intelligence" element={<ProductPage />} />
          <Route path="candidates" element={<ProductPage />} />
          <Route path="candidates/discover" element={<ProductPage />} />
          <Route path="candidates/:candidateId" element={<ProductPage />} />
          <Route path="matching" element={<ProductPage />} />
          <Route path="matching/compare" element={<ProductPage />} />
          <Route path="submissions" element={<ProductPage />} />
          <Route path="interviews" element={<ProductPage />} />
          <Route path="followups" element={<ProductPage />} />
          <Route path="communications" element={<ProductPage />} />
          <Route path="interview-intelligence" element={<ProductPage />} />
          <Route path="interview-intelligence/questions" element={<ProductPage />} />
          <Route path="interview-intelligence/scorecard" element={<ProductPage />} />
          <Route path="analytics" element={<ProductPage />} />
          <Route path="manager" element={<ProductPage />} />
          <Route path="settings" element={<ProductPage />} />
          <Route path="admin" element={<ProductPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastViewport toasts={toasts} dismiss={(id) => setToasts((current) => current.filter((toastItem) => toastItem.id !== id))} />
    </AppContext.Provider>
  );
}

function ToastViewport({ toasts, dismiss }: { toasts: ToastMessage[]; dismiss: (id: number) => void }) {
  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.kind}`} key={toast.id}>
          {toast.kind === "info" ? <Info size={18} /> : <CheckCircle2 size={18} />}
          <div className="toast-copy"><strong>{toast.title}</strong>{toast.description && <span>{toast.description}</span>}</div>
          <button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={15} /></button>
        </div>
      ))}
      <span className="sr-only">{location.pathname === "/login" ? "Demo login page" : "Demo workspace"}</span>
    </div>
  );
}
