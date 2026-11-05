import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronsLeft,
  Command,
  HelpCircle,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { navigation } from "../lib/data";
import { useAppContext } from "../lib/app-context";
import { Avatar, Dropdown, MenuItem, Modal, TextInput } from "./ui";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/requirements": "Requirements",
  "/candidates": "Candidates",
  "/candidates/discover": "Candidate discovery",
  "/matching": "AI matching",
  "/submissions": "Submissions",
  "/interviews": "Interviews",
  "/followups": "Follow-ups",
  "/communications": "Communication",
  "/interview-intelligence": "Interview intelligence",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/admin": "Admin console",
  "/manager": "Manager overview",
};

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const { role, setRole, toast } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const heading = useMemo(() => {
    if (pageNames[location.pathname]) return pageNames[location.pathname];
    if (location.pathname.startsWith("/requirements/")) {
      if (location.pathname.endsWith("/intelligence")) return "REC intelligence";
      if (location.pathname.endsWith("/new")) return "Create requirement";
      return "Requirement details";
    }
    if (location.pathname.startsWith("/candidates/")) {
      return location.pathname.includes("discover") ? "Candidate discovery" : "Candidate profile";
    }
    if (location.pathname.endsWith("/scorecard")) return "Technical evaluation";
    if (location.pathname.endsWith("/questions")) return "Question bank";
    return pageNames[location.pathname] ?? "Dashboard";
  }, [location.pathname]);

  const filteredItems = navigation.filter((item) => item.roles.includes(role));
  const primaryItems = filteredItems.filter((item) => !["/analytics", "/settings", "/admin"].includes(item.path));
  const adminItems = filteredItems.filter((item) => ["/analytics", "/settings", "/admin"].includes(item.path));
  const globalResults = (role === "Workspace Admin"
    ? [
      { title: "Workspace settings", subtitle: "Member access and preferences", path: "/settings" },
      { title: "Admin console", subtitle: "Workspace members and access", path: "/admin" },
      { title: "Recruitment analytics", subtitle: "Workspace-level aggregates", path: "/analytics" },
    ]
    : [
      { title: "Senior Product Designer", subtitle: "REC-2048 · Northstar Labs", path: "/requirements/REC-2048" },
      { title: "Mira Shah", subtitle: "Product Designer · Candidate", path: "/candidates/CAN-1194" },
      { title: "Engineering Manager", subtitle: "REC-2047 · Orbit Systems", path: "/requirements/REC-2047" },
      { title: "Kabir Nair", subtitle: "Engineering Manager · Candidate", path: "/candidates/CAN-1188" },
    ]).filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(globalSearch.toLowerCase()));

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="brand-row">
          <Link to="/" className="brand-mark" aria-label="SEARCHY home">
            <span className="brand-symbol"><Search size={19} strokeWidth={2.8} /></span>
            {!collapsed && <span className="brand-word">SEARCHY<span className="brand-period">.</span></span>}
          </Link>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft size={17} />
          </button>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <button className="workspace-switch" onClick={() => toast("Workspace switcher", "Workspace management will be connected when authentication is implemented.", "info")}>
          <span className="workspace-logo">N</span>
          {!collapsed && <span className="workspace-copy"><strong>Northstar Talent</strong><small>Recruitment workspace</small></span>}
          {!collapsed && <ChevronDown size={15} className="workspace-chevron" />}
        </button>
        <div className="sidebar-scroll">
          <div className="nav-section">
            {!collapsed && <span className="nav-section-label">WORKSPACE</span>}
            <nav aria-label="Main navigation">
              {primaryItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.path === "/followups" && <span className="nav-count">4</span>}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="nav-section nav-section-spaced">
            {!collapsed && <span className="nav-section-label">INSIGHTS & ADMIN</span>}
            <nav aria-label="Insights and administration">
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
              {role === "Recruitment Manager" && (
                <NavLink to="/manager" className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
                  <ShieldCheck size={18} strokeWidth={1.8} />
                  {!collapsed && <span>Manager overview</span>}
                </NavLink>
              )}
            </nav>
          </div>
        </div>
        {!collapsed && (
          <div className="sidebar-bottom">
            <div className="help-card">
              <span className="help-icon"><HelpCircle size={16} /></span>
              <strong>Need a hand?</strong>
              <span>Explore the quick-start guide.</span>
              <button onClick={() => toast("Quick-start guide", "Help content is a prototype placeholder.", "info")}>Open guide <span>↗</span></button>
            </div>
            <div className="sidebar-footer"><span className="online-dot" /> Prototype UI <span>v0.1</span></div>
          </div>
        )}
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{heading}</strong><span className="demo-topbar-badge">DEMO</span></div>
          </div>
          <div className="topbar-actions">
            <button className="global-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search workspace">
              <Search size={16} /><span>Search anything...</span><kbd><Command size={11} /> K</kbd>
            </button>
            <div className="topbar-divider" />
            <div className="notification-wrap">
              <button
                className={`icon-button notification-button ${notificationOpen ? "icon-button-active" : ""}`}
                onClick={() => setNotificationOpen(!notificationOpen)}
                aria-label="Notifications"
                aria-expanded={notificationOpen}
              >
                <Bell size={18} />
                <span className="notification-indicator" />
              </button>
              {notificationOpen && (
                <div className="notification-panel">
                  <div className="notification-heading"><strong>Notifications</strong><span>2 new</span></div>
                  <div className="notification-item"><span className="notification-blue"><FileCheckMini /></span><span><b>Feedback requested</b><small>Northstar Labs reviewed Mira Shah's profile.</small><small>18 minutes ago</small></span></div>
                  <div className="notification-item"><span className="notification-amber"><Bell size={15} /></span><span><b>Follow-up due soon</b><small>Confirm interview availability with Kabir Nair.</small><small>1 hour ago</small></span></div>
                  <button className="notification-footer" onClick={() => { setNotificationOpen(false); navigate("/followups"); }}>View all activity</button>
                </div>
              )}
            </div>
            <div className="topbar-divider" />
            <Dropdown
              trigger={
                <button className="profile-trigger">
                  <Avatar initials="AR" color="lavender" />
                  <span className="profile-name">Ananya Rao</span>
                  <ChevronDown size={14} className="profile-chevron" />
                </button>
              }
            >
              <div className="profile-menu-header"><Avatar initials="AR" color="lavender" /><div><strong>Ananya Rao</strong><span>ananya@northstartalent.in</span></div></div>
              <div className="menu-separator" />
              <div className="role-switcher-label">DEMO ROLE</div>
              {(["Recruiter", "Recruitment Manager", "Workspace Admin"] as const).map((option) => (
                <MenuItem key={option} onSelect={() => { setRole(option); toast("Demo role changed", `Navigation now reflects ${option} permissions.`, "info"); }}>
                  <span>{option}</span>{role === option && <span className="role-check">✓</span>}
                </MenuItem>
              ))}
              <div className="menu-separator" />
              <MenuItem onSelect={() => { navigate("/settings"); }}>Workspace settings</MenuItem>
              <MenuItem onSelect={() => { navigate("/login"); }}>Sign out of demo</MenuItem>
            </Dropdown>
          </div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>

      <Modal
        title="Search your workspace"
        description="Find requirements and candidates across your workspace."
        open={searchOpen}
        onOpenChange={setSearchOpen}
        size="lg"
      >
        <div className="global-search-box"><Search size={18} /><TextInput autoFocus value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search candidates, requirements..." /></div>
        <div className="global-results">
          {globalResults.length ? globalResults.map((item) => (
            <button key={item.path} className="global-result" onClick={() => { setSearchOpen(false); setGlobalSearch(""); navigate(item.path); }}>
              <span className="global-result-icon"><Search size={15} /></span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><span className="result-enter">↵</span>
            </button>
          )) : <div className="global-empty">No results found. Try another search.</div>}
        </div>
        <div className="search-modal-footer"><span>SEARCHY synthetic demo workspace</span><span>Press <kbd>ESC</kbd> to close</span></div>
      </Modal>
    </div>
  );
}

function FileCheckMini() {
  return <Sparkles size={15} />;
}
