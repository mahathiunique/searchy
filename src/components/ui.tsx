import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  FileUp,
  Search,
  X,
} from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant} button-${size} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="required-mark"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="field-error" role="alert">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />;
}

export function SelectInput({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="select-wrap">
      <select {...props} className={`input select-input ${props.className ?? ""}`}>
        {children}
      </select>
      <ChevronDown size={15} aria-hidden="true" />
    </div>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input textarea ${props.className ?? ""}`} />;
}

const badgeVariants: Record<string, string> = {
  open: "badge-green",
  available: "badge-green",
  approved: "badge-green",
  completed: "badge-green",
  "client interview": "badge-blue",
  "in process": "badge-blue",
  interviewing: "badge-blue",
  "pending review": "badge-amber",
  paused: "badge-amber",
  returned: "badge-amber",
  draft: "badge-gray",
  closed: "badge-gray",
  cancelled: "badge-gray",
  rejected: "badge-red",
  high: "badge-red",
  normal: "badge-blue",
  low: "badge-gray",
};

export function StatusBadge({ children }: { children: string }) {
  const key = children.toLowerCase();
  return (
    <span className={`badge ${badgeVariants[key] ?? "badge-gray"}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}

export function Avatar({
  initials,
  color = "blue",
  size = "md",
}: {
  initials: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  return <span className={`avatar avatar-${color} avatar-${size}`}>{initials}</span>;
}

export function Dropdown({
  trigger,
  children,
  align = "end",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" align={align} sideOffset={8}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuItem({
  children,
  onSelect,
  destructive = false,
}: {
  children: ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}) {
  return (
    <DropdownMenu.Item
      className={`menu-item ${destructive ? "menu-item-danger" : ""}`}
      onSelect={onSelect}
    >
      {children}
    </DropdownMenu.Item>
  );
}

export function Modal({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
  size = "md",
}: {
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: "md" | "lg";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content dialog-${size}`}>
          <div className="dialog-heading">
            <div>
              <Dialog.Title className="dialog-title">{title}</Dialog.Title>
              {description && <Dialog.Description className="dialog-description">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button className="icon-button dialog-close" aria-label="Close dialog">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  emptyTitle = "No records yet",
  emptyDescription = "Try changing your filters or add a new record.",
}: {
  columns: { key: keyof T; label: string; render?: (row: T) => ReactNode; className?: string }[];
  rows: T[];
  rowKey: keyof T;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const left = String(a[sortKey] ?? "").toLowerCase();
      const right = String(b[sortKey] ?? "").toLowerCase();
      return left.localeCompare(right, undefined, { numeric: true }) * (direction === "asc" ? 1 : -1);
    });
  }, [direction, rows, sortKey]);

  if (!rows.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Search size={20} /></div>
        <strong>{emptyTitle}</strong>
        <span>{emptyDescription}</span>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sortKey === column.key;
              const SortIcon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
              return (
                <th key={String(column.key)} className={column.className}>
                  <button
                    className="sort-button"
                    onClick={() => {
                      if (sortKey === column.key) setDirection(direction === "asc" ? "desc" : "asc");
                      else {
                        setSortKey(column.key);
                        setDirection("asc");
                      }
                    }}
                  >
                    {column.label}
                    <SortIcon size={13} className={active ? "sort-active" : ""} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={String(row[rowKey])}>
              {columns.map((column) => (
                <td key={String(column.key)} className={column.className}>
                  {column.render ? column.render(row) : String(row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchFilter({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-filter">
      <Search size={16} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function FileUploadArea({
  onSelect,
  onReject,
  accept = ".pdf,.doc,.docx",
  label = "Drop a resume here, or browse",
  maxBytes = 10 * 1024 * 1024,
}: {
  onSelect: (file: File | undefined) => void;
  onReject?: (message: string) => void;
  accept?: string;
  label?: string;
  maxBytes?: number;
}) {
  return (
    <label className="upload-area">
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && file.size > maxBytes) {
            event.currentTarget.value = "";
            onSelect(undefined);
            onReject?.("This file is larger than the 10 MB prototype limit.");
            return;
          }
          onSelect(file);
        }}
      />
      <span className="upload-icon"><FileUp size={19} /></span>
      <strong>{label}</strong>
      <span>PDF or Word document · 10 MB max</span>
    </label>
  );
}

export function Tabs({
  value,
  onValueChange,
  items,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string; count?: number }[];
}) {
  return (
    <div className="tabs-list" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          className={`tab-trigger ${value === item.value ? "tab-active" : ""}`}
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span className="tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="checkbox-row">
      <button
        type="button"
        className={`checkbox ${checked ? "checkbox-checked" : ""}`}
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        {checked && <Check size={12} />}
      </button>
      <span>{label}</span>
    </label>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}
