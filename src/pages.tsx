import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Flame,
  Lightbulb,
  Link2,
  ListFilter,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  Upload,
  UserPlus,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppContext } from "./lib/app-context";
import {
  activity,
  candidates,
  chartData,
  followups,
  interviews,
  requirements,
  submissions,
} from "./lib/data";
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  DataTable,
  Dropdown,
  Field,
  FileUploadArea,
  MenuItem,
  Modal,
  SearchFilter,
  SelectInput,
  StatusBadge,
  Tabs,
  TextArea,
  TextInput,
} from "./components/ui";

function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

function DemoBanner({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="demo-banner">
      <span className="demo-dot" />
      <span>{children}</span>
      <button onClick={() => setVisible(false)} aria-label="Dismiss demo notice"><X size={14} /></button>
    </div>
  );
}

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  tone,
  note,
}: {
  label: string;
  value: string;
  change: string;
  icon: typeof UsersRound;
  tone: string;
  note?: string;
}) {
  return (
    <Card className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className={`kpi-icon kpi-${tone}`}><Icon size={18} strokeWidth={1.9} /></span>
      </div>
      <div className="kpi-value-row"><strong>{value}</strong><span className="kpi-trend"><ArrowUpRight size={14} /> {change}</span></div>
      <div className="kpi-note">{note ?? "vs. previous 30 days"}</div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { color?: string; name?: string; value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((point) => <span key={point.name} style={{ color: point.color }}>{point.value} {point.name}</span>)}
    </div>
  );
}

export function DashboardPage() {
  const { role, toast } = useAppContext();
  const navigate = useNavigate();
  if (role === "Workspace Admin") return <AdminDashboardPage />;
  const greeting = new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date());
  const primaryStats = [
    { label: "Active requirements", value: "24", change: "+12.5%", icon: BriefcaseBusiness, tone: "blue", note: "4 added this month" },
    { label: "Candidates sourced", value: "186", change: "+8.2%", icon: UsersRound, tone: "violet", note: "Across 18 active roles" },
    { label: "CVs submitted", value: "42", change: "+16.8%", icon: FileCheck2, tone: "green", note: "11 awaiting review" },
    { label: "Interviews scheduled", value: "18", change: "+4.3%", icon: CalendarDays, tone: "amber", note: "6 happening this week" },
  ];

  return (
    <div className="page-stack">
      <div className="welcome-strip">
        <div>
          <div className="welcome-date">{greeting}, {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date())} <span className="date-dot">·</span> <span>Workspace overview</span></div>
          <h1>Good morning, Ananya <span className="wave">✦</span></h1>
          <p>Here’s what’s moving across your recruitment pipeline.</p>
        </div>
        <Button onClick={() => navigate("/requirements/new")} icon={<Plus size={17} />}>Add new requirement</Button>
      </div>
      <DemoBanner><strong>Demo workspace</strong> · Synthetic sample data. Changes in this prototype are not saved to a database.</DemoBanner>
      <div className="kpi-grid">
        {primaryStats.map((stat) => <KpiCard key={stat.label} {...stat} />)}
      </div>
      {role === "Recruitment Manager" && (
        <div className="manager-brief">
          <span className="manager-brief-icon"><ShieldCheck size={18} /></span>
          <div><strong>Manager overview is ready</strong><span>Review team throughput, open decisions, and ownership queues.</span></div>
          <Link to="/manager">Open team view <ArrowRight size={14} /></Link>
        </div>
      )}
      <div className="dashboard-grid">
        <Card className="pipeline-card">
          <div className="card-heading">
            <div><h2>Pipeline activity</h2><p>Submissions and interviews over the last 5 weeks</p></div>
            <button className="period-select" onClick={() => navigate("/analytics")}>Last 5 weeks <ChevronDown size={14} /></button>
          </div>
          <div className="chart-legend"><span><i className="legend-dot legend-blue" /> Submissions</span><span><i className="legend-dot legend-violet" /> Interviews</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="submissionFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4779e4" stopOpacity={0.14} /><stop offset="95%" stopColor="#4779e4" stopOpacity={0} /></linearGradient>
                  <linearGradient id="interviewFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8c75df" stopOpacity={0.1} /><stop offset="95%" stopColor="#8c75df" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} dy={9} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="submitted" name="submissions" stroke="#4779e4" strokeWidth={2.4} fill="url(#submissionFill)" />
                <Area type="monotone" dataKey="interviews" name="interviews" stroke="#8c75df" strokeWidth={2.2} fill="url(#interviewFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <button className="card-bottom-link" onClick={() => navigate("/analytics")}>View recruitment analytics <ArrowRight size={15} /></button>
        </Card>
        <Card className="activity-card">
          <div className="card-heading"><div><h2>Recent activity</h2><p>Latest updates from your team</p></div><button className="icon-button" aria-label="Activity options" onClick={() => toast("Recent activity", "Showing the latest synthetic workspace updates.", "info")}><MoreHorizontal size={18} /></button></div>
          <div className="activity-list">
            {activity.map((item, index) => (
              <div className="activity-row" key={`${item.name}-${item.target}`}>
                <div className="activity-avatar"><Avatar initials={item.initials} color={item.color} /></div>
                <div className="activity-copy"><p><strong>{item.name}</strong> {item.action} <b>{item.target}</b></p><span>{item.time}</span></div>
                <span className={`activity-type type-${index}`}><item.icon size={14} /></span>
              </div>
            ))}
          </div>
          <button className="card-bottom-link" onClick={() => navigate("/analytics")}>View activity log <ArrowRight size={15} /></button>
        </Card>
      </div>
      <div className="dashboard-grid dashboard-grid-bottom">
        <Card className="requirements-preview">
          <div className="card-heading">
            <div><h2>Active requirements</h2><p>Roles that need your attention</p></div>
            <Link className="small-link" to="/requirements">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="mini-requirements">
            {requirements.filter((requirement) => requirement.status === "Open").slice(0, 3).map((requirement) => (
              <Link className="mini-requirement" to={`/requirements/${requirement.id}`} key={requirement.id}>
                <span className={`client-logo client-${requirement.color}`}>{requirement.initials}</span>
                <span className="mini-requirement-title"><strong>{requirement.title}</strong><small>{requirement.client} <span>·</span> {requirement.location}</small></span>
                <span className="mini-requirement-count"><b>{requirement.candidates}</b><small>candidates</small></span>
                <ChevronRight size={16} className="mini-chevron" />
              </Link>
            ))}
          </div>
        </Card>
        <Card className="upcoming-card">
          <div className="card-heading"><div><h2>Upcoming interviews</h2><p>Today, November 5</p></div><Link className="small-link" to="/interviews">Calendar <ArrowRight size={14} /></Link></div>
          <div className="upcoming-list">
            {interviews.slice(0, 2).map((interview) => (
              <div className="upcoming-row" key={interview.name}>
                <span className="interview-time">{interview.time}</span><span className="interview-rail" />
                <Avatar initials={interview.initials} color={interview.color} />
                <span className="upcoming-copy"><strong>{interview.name}</strong><small>{interview.role}</small></span>
                <button className="icon-button upcoming-action" aria-label={`View ${interview.name} interview`} onClick={() => navigate("/interviews")}><Video size={16} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="bottom-kpi-row">
        <div className="bottom-metric"><span className="bottom-metric-icon metric-rose"><Timer size={16} /></span><span><small>Pending follow-ups</small><strong>12 <i>4 due today</i></strong></span><Link to="/followups">Review</Link></div>
        <div className="bottom-metric"><span className="bottom-metric-icon metric-gold"><Target size={16} /></span><span><small>Avg. time to shortlist</small><strong>4.2 days <i className="metric-change">↓ 0.8 days</i></strong></span><Link to="/analytics">Details</Link></div>
        <div className="bottom-metric"><span className="bottom-metric-icon metric-teal"><Sparkles size={16} /></span><span><small>Strong matches found</small><strong>28 <i>this week</i></strong></span><Link to="/matching">Explore</Link></div>
      </div>
    </div>
  );
}

const requirementSchema = z.object({
  title: z.string().trim().min(3, "Add a clear job title."),
  client: z.string().trim().min(2, "Select a client."),
  description: z.string().trim().min(20, "Add at least 20 characters about the role."),
  location: z.string().trim().min(2, "Add a work location."),
  experience: z.string().min(1, "Choose an experience range."),
  openings: z.coerce.number().int().min(1, "At least one opening is required."),
  priority: z.enum(["normal", "high", "urgent"]),
  skills: z.string(),
});

type RequirementFormValues = z.infer<typeof requirementSchema>;

function RequirementFormPage() {
  const navigate = useNavigate();
  const { toast } = useAppContext();
  const form = useForm<z.input<typeof requirementSchema>, unknown, RequirementFormValues>({
    resolver: zodResolver(requirementSchema),
    defaultValues: { title: "", client: "", description: "", location: "", experience: "", openings: 1, priority: "normal", skills: "" },
  });
  const fieldError = (name: keyof RequirementFormValues) => form.formState.errors[name]?.message;
  const save = form.handleSubmit((values) => {
    toast("Demo requirement created", `“${values.title}” is a local prototype example only; it has not been saved to a database.`, "info");
    navigate("/requirements/REC-2050");
  });

  return (
    <div className="page-stack">
      <PageHeader title="Create requirement" description="Add the role details. You can enrich the brief with REC intelligence next." eyebrow="REQUIREMENTS · NEW" actions={<Button variant="secondary" onClick={() => navigate("/requirements")}>Cancel</Button>} />
      <DemoBanner>Prototype form · This draft is not connected to a database.</DemoBanner>
      <div className="form-page-grid">
        <form className="form-column" onSubmit={save}>
          <Card className="form-card">
            <div className="form-section-title"><span className="form-step">01</span><div><h2>Role overview</h2><p>Start with the details your team needs to get moving.</p></div></div>
            <div className="form-grid">
              <Field label="Job title" required error={fieldError("title")}><TextInput placeholder="e.g. Senior Product Designer" {...form.register("title")} /></Field>
              <Field label="Client" required error={fieldError("client")}><SelectInput {...form.register("client")}><option value="">Select a client</option><option>Northstar Labs</option><option>Orbit Systems</option><option>Meridian Health</option><option>Juniper Financial</option></SelectInput></Field>
              <Field label="Location" required error={fieldError("location")}><TextInput placeholder="City, state or remote" {...form.register("location")} /></Field>
              <Field label="Experience" required error={fieldError("experience")}><SelectInput {...form.register("experience")}><option value="">Choose range</option><option>0–2 years</option><option>3–5 years</option><option>6–8 years</option><option>9+ years</option></SelectInput></Field>
              <Field label="Number of openings" required error={fieldError("openings")}><TextInput type="number" min={1} {...form.register("openings")} /></Field>
              <Field label="Priority"><SelectInput {...form.register("priority")}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></SelectInput></Field>
              <div className="form-full"><Field label="Job description" hint="Include responsibilities, must-haves, and what success looks like." required error={fieldError("description")}><TextArea rows={6} placeholder="What will this person do? What experience and skills are essential?" {...form.register("description")} /></Field></div>
            </div>
          </Card>
          <Card className="form-card">
            <div className="form-section-title"><span className="form-step">02</span><div><h2>Skills & criteria</h2><p>Add a few important skills now, or refine them in REC intelligence.</p></div></div>
            <Field label="Must-have skills"><TextInput placeholder="e.g. Figma, design systems, user research" {...form.register("skills")} /></Field>
            <div className="suggestion-row"><span>Suggested:</span>{["Figma", "Design systems", "Product discovery"].map((skill) => <button key={skill} type="button" className="skill-chip" onClick={() => { const current = form.getValues("skills").split(",").map((item) => item.trim()).filter(Boolean); if (!current.includes(skill)) form.setValue("skills", [...current, skill].join(", "), { shouldDirty: true }); toast("Skill added", `${skill} added to this local form.`, "info"); }}>+ {skill}</button>)}</div>
          </Card>
          <div className="form-footer"><span>Required fields are marked with <b>*</b></span><div><Button variant="secondary" type="button" onClick={() => { form.reset(); toast("Form cleared", "All local form values were cleared.", "info"); }}>Clear form</Button><Button type="submit" icon={<Plus size={16} />}>Create requirement</Button></div></div>
        </form>
        <aside className="form-aside">
          <Card className="aside-tip">
            <span className="aside-tip-icon"><Sparkles size={17} /></span><strong>Make your brief work harder</strong>
            <p>Once this requirement is created, REC intelligence can highlight missing details and turn your brief into clear, reviewable criteria.</p>
            <div className="tip-mini-row"><CheckCircle2 size={15} /> Human-reviewed criteria</div><div className="tip-mini-row"><CheckCircle2 size={15} /> Clear must-haves & nice-to-haves</div><div className="tip-mini-row"><CheckCircle2 size={15} /> Better explainable matching</div>
          </Card>
          <Card className="aside-note"><span className="note-icon"><CircleHelp size={17} /></span><strong>Not ready to publish?</strong><p>You can save a draft locally in this prototype and publish when your team has reviewed the details.</p></Card>
        </aside>
      </div>
    </div>
  );
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  return (
    <div className="page-stack">
      <div className="welcome-strip">
        <div>
          <div className="welcome-date">Workspace administration <span className="date-dot">·</span> Synthetic demo</div>
          <h1>Welcome, Nikhil</h1>
          <p>Workspace health and access at a glance.</p>
        </div>
        <Button onClick={() => navigate("/admin")} icon={<UsersRound size={16} />}>Manage members</Button>
      </div>
      <DemoBanner><strong>Admin demo view</strong> · Aggregate workspace information only. Candidate details are not shown to workspace administrators.</DemoBanner>
      <div className="kpi-grid compact-kpis">
        <KpiCard label="Workspace members" value="8" change="+1" icon={UsersRound} tone="blue" note="One invitation pending" />
        <KpiCard label="Active role seats" value="7" change="87.5%" icon={ShieldCheck} tone="green" note="Across 3 workspace roles" />
        <KpiCard label="Audit events" value="124" change="This month" icon={Activity} tone="violet" note="Workspace-level activity" />
      </div>
      <div className="dashboard-grid">
        <Card className="detail-main-card admin-home-card">
          <div className="card-heading"><div><h2>Workspace administration</h2><p>Keep membership, preferences, and access controls up to date.</p></div></div>
          <button className="admin-action-row" onClick={() => navigate("/admin")}><span className="admin-action-icon"><UsersRound size={17} /></span><span><strong>Manage workspace members</strong><small>Review invitations and update role assignments.</small></span><ChevronRight size={16} /></button>
          <button className="admin-action-row" onClick={() => navigate("/settings")}><span className="admin-action-icon admin-action-violet"><Settings2 size={17} /></span><span><strong>Review workspace settings</strong><small>Configure timezone, privacy preferences, and templates.</small></span><ChevronRight size={16} /></button>
          <button className="admin-action-row" onClick={() => navigate("/analytics")}><span className="admin-action-icon admin-action-green"><BarChart3 size={17} /></span><span><strong>View workspace analytics</strong><small>Aggregate operational metrics, without candidate-level details.</small></span><ChevronRight size={16} /></button>
        </Card>
        <Card className="detail-main-card">
          <div className="card-heading"><div><h2>Workspace access</h2><p>Member status summary</p></div><StatusBadge>Active</StatusBadge></div>
          <div className="admin-access-stat"><span className="admin-access-count">5</span><span><strong>Recruiters</strong><small>Active workspace members</small></span></div>
          <div className="admin-access-stat"><span className="admin-access-count admin-count-manager">2</span><span><strong>Managers</strong><small>Recruitment manager role</small></span></div>
          <div className="admin-access-stat"><span className="admin-access-count admin-count-admin">1</span><span><strong>Administrator</strong><small>Keep at least one active admin</small></span></div>
          <button className="owner-link" onClick={() => navigate("/admin")}>View member list <ArrowRight size={14} /></button>
        </Card>
      </div>
    </div>
  );
}

type RequirementRow = (typeof requirements)[number];
const requirementColumns = [
  { key: "id" as const, label: "REC ID", className: "cell-id" },
  { key: "title" as const, label: "REQUIREMENT", render: (row: RequirementRow) => <Link className="table-main-link" to={`/requirements/${row.id}`}><strong>{row.title}</strong><small>{row.client} · {row.location}</small></Link> },
  { key: "status" as const, label: "STATUS", render: (row: RequirementRow) => <StatusBadge>{row.status}</StatusBadge> },
  { key: "owner" as const, label: "OWNER", render: (row: RequirementRow) => <span className="table-person"><Avatar initials={row.owner.split(" ").map((part) => part[0]).join("")} color="blue" size="sm" />{row.owner}</span> },
  { key: "candidates" as const, label: "CANDIDATES", render: (row: RequirementRow) => <span className="numeric-cell">{row.candidates}</span> },
  { key: "target" as const, label: "TARGET DATE" },
];

function RequirementsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All requirements");
  const [tab, setTab] = useState("All");
  const { toast } = useAppContext();
  const navigate = useNavigate();
  const rows = requirements.filter((row) => {
    const matchesText = `${row.id} ${row.title} ${row.client} ${row.owner}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All requirements" || row.status === status;
    const matchesTab = tab === "All" || row.status === tab;
    return matchesText && matchesStatus && matchesTab;
  });
  return (
    <div className="page-stack">
      <PageHeader title="Requirements" description="Manage open roles, keep teams aligned, and move every REC forward." actions={<Button onClick={() => navigate("/requirements/new")} icon={<Plus size={17} />}>New requirement</Button>} />
      <div className="kpi-grid compact-kpis">
        <KpiCard label="Open roles" value="24" change="+3" icon={BriefcaseBusiness} tone="blue" note="Across 9 clients" />
        <KpiCard label="Candidates in pipeline" value="186" change="+18" icon={UsersRound} tone="violet" note="For open requirements" />
        <KpiCard label="Needs attention" value="6" change="2 due soon" icon={Clock3} tone="amber" note="No activity in 7+ days" />
      </div>
      <Card className="table-card">
        <div className="table-card-top"><div><h2>All requirements</h2><p>Keep track of ownership, candidate flow, and timelines.</p></div><Button variant="secondary" size="sm" icon={<Download size={15} />} onClick={() => window.print()}>Export view</Button></div>
        <Tabs value={tab} onValueChange={setTab} items={[{ value: "All", label: "All", count: 42 }, { value: "Open", label: "Open", count: 24 }, { value: "Paused", label: "Paused", count: 6 }, { value: "Draft", label: "Draft", count: 8 }]} />
        <div className="table-toolbar"><SearchFilter value={query} onChange={setQuery} placeholder="Search requirements..." /><SelectInput value={status} onChange={(event) => setStatus(event.target.value)}><option>All requirements</option><option>Open</option><option>Paused</option><option>Draft</option><option>Closed</option></SelectInput><Button variant="secondary" size="sm" icon={<SlidersHorizontal size={15} />} onClick={() => setStatus("Open")}>Filters</Button></div>
        <DataTable columns={requirementColumns} rows={rows} rowKey="id" emptyTitle="No requirements match" emptyDescription="Try a different status or search term." />
        <div className="table-pagination"><span>Showing <strong>{rows.length}</strong> of 42 requirements · 6 synthetic examples</span><div><Button variant="secondary" size="sm" disabled>Previous</Button><Button variant="secondary" size="sm" onClick={() => toast("Demo data limit reached", "Additional requirement pages are not loaded in this prototype.", "info")}>Next</Button></div></div>
      </Card>
    </div>
  );
}

function RequirementDetailsPage() {
  const { requirementId } = useParams();
  const { toast } = useAppContext();
  const navigate = useNavigate();
  const requirement = requirements.find((item) => item.id === requirementId) ?? {
    id: requirementId ?? "REC-2050", title: "Product Design Lead", client: "Northstar Labs", location: "Bengaluru", status: "Open" as const, owner: "Ananya Rao", candidates: 0, submitted: 0, target: "Dec 12, 2026", initials: "NL", color: "lavender",
  };
  const [activeTab, setActiveTab] = useState("Overview");
  return (
    <div className="page-stack">
      <div className="back-link-row"><Link to="/requirements"><ArrowLeft size={15} /> All requirements</Link><span className="breadcrumb-slash">/</span><span>{requirement.id}</span></div>
      <div className="detail-title-row"><div className="detail-client-mark"><span className={`client-logo client-${requirement.color}`}>{requirement.initials}</span><div><div className="detail-kicker">{requirement.client} <span>·</span> {requirement.id}</div><h1>{requirement.title}</h1><div className="detail-meta"><StatusBadge>{requirement.status}</StatusBadge><span><MapPin size={14} />{requirement.location}</span><span><CalendarDays size={14} />Target {requirement.target}</span></div></div></div><div className="page-actions"><Button variant="secondary" icon={<Sparkles size={15} />} onClick={() => navigate(`/requirements/${requirement.id}/intelligence`)}>REC intelligence</Button><Dropdown trigger={<Button variant="secondary" icon={<MoreHorizontal size={17} />}>More</Button>}><MenuItem onSelect={() => toast("Requirement link copied", "The demo URL is available in your browser address bar.", "info")}>Copy link</MenuItem><MenuItem onSelect={() => toast("Edit requirement", "Editing will be enabled with the connected workspace service.", "info")}>Edit requirement</MenuItem><MenuItem destructive onSelect={() => toast("Close requirement", "Closing a requirement requires confirmation and a reason.", "info")}>Close requirement</MenuItem></Dropdown></div></div>
      <Tabs value={activeTab} onValueChange={setActiveTab} items={[{ value: "Overview", label: "Overview" }, { value: "Candidates", label: "Candidates", count: requirement.candidates }, { value: "Submissions", label: "Submissions", count: requirement.submitted }, { value: "Activity", label: "Activity" }]} />
      <div className="detail-stats">
        <MetricTile label="Candidates sourced" value={String(requirement.candidates)} note="Across your team" icon={UsersRound} />
        <MetricTile label="Submitted to client" value={String(requirement.submitted)} note="1 awaiting review" icon={FileCheck2} />
        <MetricTile label="Interviews" value="3" note="Next today at 10:30 AM" icon={CalendarDays} />
        <MetricTile label="Days open" value="12" note="Target in 13 days" icon={Clock3} />
      </div>
      <div className="dashboard-grid">
        <Card className="detail-main-card">
          <div className="card-heading"><div><h2>{activeTab === "Overview" ? "Role overview" : activeTab}</h2><p>Brief, team ownership, and next steps at a glance.</p></div><Button variant="secondary" size="sm" onClick={() => toast("Details updated locally", "No changes have been saved to a database.", "info")} icon={<Settings2 size={14} />}>Edit brief</Button></div>
          <div className="requirement-description"><h3>About the role</h3><p>Northstar Labs is looking for a thoughtful product designer to shape intuitive experiences for a growing suite of collaborative tools. You’ll partner closely with product and engineering to bring complex workflows to life.</p><h3>Must-have skills</h3><div className="skill-chip-row"><span className="skill-chip">Product design</span><span className="skill-chip">Figma</span><span className="skill-chip">Design systems</span><span className="skill-chip">User research</span></div><h3>Compensation & experience</h3><p>6–9 years <span className="inline-divider">·</span> ₹28–36 LPA</p></div>
          <div className="progress-module"><div className="progress-heading"><strong>Hiring progress</strong><span>4 of 8 target candidates</span></div><div className="progress-track"><span style={{ width: "50%" }} /></div><div className="progress-labels"><span>Target: 8 submissions</span><span>50% complete</span></div></div>
        </Card>
        <Card className="team-card">
          <div className="card-heading"><div><h2>Assigned team</h2><p>People working this role</p></div><button className="icon-button" aria-label="Add recruiter" onClick={() => toast("Assign recruiter", "Team assignment is a local prototype interaction.", "info")}><UserPlus size={17} /></button></div>
          <div className="team-member"><Avatar initials="AR" color="lavender" /><span><strong>Ananya Rao</strong><small>Lead recruiter</small></span><span className="team-online" /></div>
          <div className="team-member"><Avatar initials="AM" color="blue" /><span><strong>Arjun Mehta</strong><small>Recruiter</small></span><span className="team-online" /></div>
          <div className="team-member"><Avatar initials="RK" color="mint" /><span><strong>Rhea Kapoor</strong><small>Hiring manager</small></span><span className="team-status-text">Offline</span></div>
          <button className="team-add-button" onClick={() => toast("Team assignment", "Assignments will be connected to the workspace service.", "info")}><Plus size={15} /> Add team member</button>
        </Card>
      </div>
      <Card className="table-card"><div className="table-card-top"><div><h2>Top candidate matches</h2><p>Evidence-led suggestions for this requirement.</p></div><Button variant="secondary" size="sm" icon={<Sparkles size={15} />} onClick={() => navigate("/matching")}>View all matches</Button></div><CandidateMatchRows /></Card>
    </div>
  );
}

function MetricTile({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof UsersRound }) {
  return <Card className="metric-tile"><span className="metric-tile-icon"><Icon size={17} /></span><span className="metric-tile-label">{label}</span><strong>{value}</strong><small>{note}</small></Card>;
}

function CandidateMatchRows() {
  const navigate = useNavigate();
  return (
    <div className="candidate-match-rows">
      {candidates.slice(0, 3).map((candidate) => (
        <div className="candidate-match-row" key={candidate.id}>
          <Avatar initials={candidate.initials} color={candidate.color} />
          <button className="match-person-link" onClick={() => navigate(`/candidates/${candidate.id}`)}><strong>{candidate.name}</strong><small>{candidate.title} · {candidate.experience}</small></button>
          <span className="match-skills">{candidate.skills.slice(0, 2).map((skill) => <i key={skill}>{skill}</i>)}</span>
          <span className="match-score"><strong>{candidate.match}%</strong><small>match</small></span>
          <Button size="sm" variant="secondary" onClick={() => navigate("/matching/compare")}>Compare</Button>
        </div>
      ))}
    </div>
  );
}

function RecIntelligencePage() {
  const { requirementId } = useParams();
  const [activeTab, setActiveTab] = useState("Criteria");
  const { toast } = useAppContext();
  const requirement = requirements.find((item) => item.id === requirementId) ?? requirements[0];
  return (
    <div className="page-stack">
      <div className="back-link-row"><Link to={`/requirements/${requirement.id}`}><ArrowLeft size={15} /> Back to requirement</Link></div>
      <PageHeader title="REC intelligence" description="A clearer brief creates better, more explainable matches." eyebrow={`${requirement.id} · ${requirement.title}`} actions={<Button variant="secondary" icon={<FileText size={15} />} onClick={() => toast("Brief downloaded", "The demo brief cannot be exported yet.", "info")}>Export brief</Button>} />
      <div className="intelligence-banner"><span className="intelligence-banner-icon"><Sparkles size={18} /></span><span><strong>Human-reviewed insights</strong><small>Suggestions help structure the brief. Your team remains in control of every criterion.</small></span><span className="review-state"><CheckCircle2 size={15} /> Reviewed by Ananya Rao</span></div>
      <div className="dashboard-grid rec-grid">
        <Card className="detail-main-card">
          <div className="card-heading"><div><h2>Structured requirements</h2><p>Review and adjust before matching candidates.</p></div><span className="review-ready"><CheckCircle2 size={14} /> Ready to match</span></div>
          <Tabs value={activeTab} onValueChange={setActiveTab} items={[{ value: "Criteria", label: "Criteria", count: 8 }, { value: "Brief", label: "Original brief" }, { value: "Questions", label: "Clarifications", count: 2 }]} />
          <div className="criteria-group"><div className="criteria-group-head"><strong>Must-have criteria</strong><span>Required for a strong match</span></div>
            {[["Product design experience", "6+ years designing digital products", "Found in role brief"], ["Figma & prototyping", "Strong craft in Figma, interaction prototyping", "Found in role brief"], ["Design systems", "Experience building and scaling component libraries", "Suggested from role brief"], ["User research", "Comfortable with interviews and usability studies", "Found in role brief"]].map((row, i) => <div className="criteria-row" key={row[0]}><span className="criteria-number">{String(i + 1).padStart(2, "0")}</span><span className="criteria-copy"><strong>{row[0]}</strong><small>{row[1]}</small></span><span className={`evidence-label evidence-${i === 2 ? "suggested" : "source"}`}>{i === 2 ? <Lightbulb size={12} /> : <Check size={12} />}{row[2]}</span><button className="icon-button" aria-label={`Edit ${row[0]}`} onClick={() => toast("Edit criterion", "Criterion editing is a prototype interaction.", "info")}><MoreHorizontal size={17} /></button></div>)}
          </div>
          <div className="criteria-group nice-to-have"><div className="criteria-group-head"><strong>Nice-to-have</strong><span>Helpful but not required</span></div><div className="criteria-row"><span className="criteria-number">05</span><span className="criteria-copy"><strong>Experience with B2B SaaS</strong><small>Prior experience designing complex business workflows</small></span><span className="evidence-label evidence-suggested"><Lightbulb size={12} /> Suggested</span><button className="icon-button" aria-label="Edit criterion" onClick={() => toast("Edit criterion", "Criterion editing is a prototype interaction.", "info")}><MoreHorizontal size={17} /></button></div></div>
          <div className="criteria-actions"><Button variant="secondary" onClick={() => toast("Criteria added", "A blank criterion was added locally.", "info")} icon={<Plus size={15} />}>Add criterion</Button><Button onClick={() => toast("Criteria saved locally", "This prototype change is not saved to a database.", "info")}>Save criteria <Check size={15} /></Button></div>
        </Card>
        <aside className="rec-side-column"><Card className="aside-tip score-tip"><span className="aside-tip-icon"><Target size={17} /></span><strong>Matching readiness</strong><div className="readiness-score"><span>82</span><small>/ 100</small></div><div className="progress-track"><span style={{ width: "82%" }} /></div><p>Your brief has clear must-haves and experience criteria. Add salary and notice period to improve recommendations.</p><div className="tip-mini-row"><CheckCircle2 size={14} /> Role level is defined</div><div className="tip-mini-row"><CheckCircle2 size={14} /> Skills are structured</div><div className="tip-mini-row tip-pending"><Clock3 size={14} /> Compensation not specified</div></Card>
          <Card className="clarification-card"><span className="clarification-icon"><CircleHelp size={16} /></span><strong>2 questions to clarify</strong><p>These details can help recruiters screen consistently.</p><button onClick={() => setActiveTab("Questions")}>Review questions <ArrowRight size={14} /></button></Card></aside>
      </div>
    </div>
  );
}

function CandidateDatabasePage({ discovery = false }: { discovery?: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState("Any location");
  const [experienceFilter, setExperienceFilter] = useState("Any experience");
  const [requirementFilter, setRequirementFilter] = useState("All open requirements");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const navigate = useNavigate();
  const { toast } = useAppContext();
  const rows = candidates.filter((candidate) => {
    const matchesText = `${candidate.name} ${candidate.title} ${candidate.location} ${candidate.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All statuses" || candidate.status === status;
    const matchesAvailability = !availableOnly || candidate.status === "Available";
    const matchesReview = !reviewedOnly || candidate.reviewedResume;
    const matchesLocation = locationFilter === "Any location" || candidate.location === locationFilter;
    const requirementCandidates: Record<string, string[]> = {
      "REC-2048": ["CAN-1194", "CAN-1162"],
      "REC-2047": ["CAN-1188"],
      "REC-2045": ["CAN-1179"],
      "REC-2039": ["CAN-1148"],
    };
    const matchesRequirement = !discovery
      || requirementFilter === "All open requirements"
      || requirementCandidates[requirementFilter]?.includes(candidate.id) === true;
    const years = Number(candidate.experience.match(/\d+/)?.[0] ?? 0);
    const matchesExperience = experienceFilter === "Any experience"
      || (experienceFilter === "3–5 years" && years >= 3 && years <= 5)
      || (experienceFilter === "6–8 years" && years >= 6 && years <= 8)
      || (experienceFilter === "9+ years" && years >= 9);
    return matchesText && matchesStatus && matchesAvailability && matchesReview && matchesLocation && matchesExperience && matchesRequirement;
  });
  const toggleCandidate = (id: string, value: boolean) => setSelected((previous) => value ? [...previous, id] : previous.filter((item) => item !== id));
  if (discovery) {
    return (
      <div className="page-stack">
        <PageHeader title="Candidate discovery" description="Search your authorized candidate database and find a fit for an open role." eyebrow="TALENT SEARCH" actions={<Button variant="secondary" icon={<UsersRound size={15} />} onClick={() => navigate("/candidates")}>Candidate database</Button>} />
        <div className="discovery-layout">
          <Card className="discovery-filter-card"><div className="filter-header"><strong>Refine your search</strong><button onClick={() => { setQuery(""); setStatus("All statuses"); setAvailableOnly(false); setReviewedOnly(false); setLocationFilter("Any location"); setExperienceFilter("Any experience"); setRequirementFilter("All open requirements"); }}>Clear</button></div><Field label="Search keywords"><TextInput placeholder="Role, skill, or keyword" value={query} onChange={(event) => setQuery(event.target.value)} /></Field><Field label="Requirement"><SelectInput value={requirementFilter} onChange={(event) => setRequirementFilter(event.target.value)}><option>All open requirements</option>{requirements.filter((item) => item.status === "Open").map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</SelectInput></Field><Field label="Location"><SelectInput value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option>Any location</option><option>Bengaluru</option><option>Hyderabad</option><option>Pune</option><option>Remote · India</option></SelectInput></Field><Field label="Experience"><SelectInput value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value)}><option>Any experience</option><option>3–5 years</option><option>6–8 years</option><option>9+ years</option></SelectInput></Field><div className="filter-divider" /><Checkbox checked={availableOnly} onChange={setAvailableOnly} label="Available now" /><Checkbox checked={reviewedOnly} onChange={setReviewedOnly} label="Has a reviewed resume" /><Button className="full-button" onClick={() => toast("Search updated", `${rows.length} synthetic candidate profiles found.`, "info")} icon={<Search size={15} />}>Search candidates</Button></Card>
          <div className="discovery-results"><div className="discovery-results-heading"><div><h2>Suggested candidates <span>({rows.length})</span></h2><p>Matches are explainable and assistive—not hiring decisions.</p></div><SelectInput><option>Best match</option><option>Most recent</option><option>Experience</option></SelectInput></div><div className="candidate-discovery-list">{rows.map((candidate) => <CandidateDiscoveryCard key={candidate.id} candidate={candidate} selected={selected.includes(candidate.id)} onSelect={(value) => toggleCandidate(candidate.id, value)} />)}</div></div>
        </div>
      </div>
    );
  }
  const columns = [
    { key: "name" as const, label: "CANDIDATE", render: (row: (typeof candidates)[number]) => <button className="table-person-button" onClick={() => navigate(`/candidates/${row.id}`)}><Avatar initials={row.initials} color={row.color} /><span><strong>{row.name}</strong><small>{row.title}</small></span></button> },
    { key: "experience" as const, label: "EXPERIENCE" },
    { key: "location" as const, label: "LOCATION", render: (row: (typeof candidates)[number]) => <span className="location-cell"><MapPin size={13} />{row.location}</span> },
    { key: "skills" as const, label: "TOP SKILLS", render: (row: (typeof candidates)[number]) => <span className="table-skills">{row.skills.slice(0, 2).map((skill) => <i key={skill}>{skill}</i>)}</span> },
    { key: "status" as const, label: "STATUS", render: (row: (typeof candidates)[number]) => <StatusBadge>{row.status}</StatusBadge> },
    { key: "id" as const, label: "", render: (row: (typeof candidates)[number]) => <button className="icon-button" aria-label={`View ${row.name}`} onClick={() => navigate(`/candidates/${row.id}`)}><ChevronRight size={16} /></button> },
  ];
  return (
    <div className="page-stack">
      <PageHeader title="Candidates" description="A shared, searchable talent pool for the roles your team is working." actions={<><Button variant="secondary" onClick={() => setUploadOpen(true)} icon={<Upload size={15} />}>Upload resume</Button><Button onClick={() => toast("Add candidate", "A candidate profile form will be available when storage is connected.", "info")} icon={<Plus size={16} />}>Add candidate</Button></>} />
      <div className="kpi-grid compact-kpis">
        <KpiCard label="Total profiles" value="1,284" change="+64" icon={UsersRound} tone="blue" note="This workspace" />
        <KpiCard label="Available" value="486" change="+22" icon={CheckCircle2} tone="green" note="Ready for new roles" />
        <KpiCard label="Recently added" value="64" change="This month" icon={Activity} tone="violet" note="Across your team" />
      </div>
      <Card className="table-card">
        <div className="table-card-top"><div><h2>Candidate database</h2><p>Profiles are shown based on your workspace access.</p></div><Button variant="secondary" size="sm" icon={<Search size={15} />} onClick={() => navigate("/candidates/discover")}>Discover candidates</Button></div>
        <div className="table-toolbar"><SearchFilter value={query} onChange={setQuery} placeholder="Search by name, skill, or title..." /><SelectInput value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Available</option><option>In process</option><option>Interviewing</option></SelectInput><Button variant="secondary" size="sm" icon={<Filter size={15} />} onClick={() => setStatus("Available")}>Filters</Button></div>
        {selected.length > 0 && <div className="bulk-toolbar"><span>{selected.length} candidates selected</span><Button variant="secondary" size="sm" onClick={() => { setSelected([]); toast("Compare selection", "Comparison is available from the AI Matching page.", "info"); }}>Compare candidates</Button><Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button></div>}
        <DataTable columns={columns} rows={rows} rowKey="id" emptyTitle="No candidates found" emptyDescription="Try adjusting your search or filters." />
        <div className="table-pagination"><span>Showing <strong>{rows.length}</strong> synthetic candidate profiles</span><div><Button size="sm" variant="secondary" disabled>Previous</Button><Button size="sm" variant="secondary" onClick={() => toast("End of demo data", "No additional synthetic profiles are loaded.", "info")}>Next</Button></div></div>
      </Card>
      <Modal title="Upload a resume" description="Add a synthetic resume sample to explore the upload experience." open={uploadOpen} onOpenChange={setUploadOpen}>
        <div className="modal-form">
          <Field label="Attach resume" hint="This prototype does not upload files to a server."><FileUploadArea onSelect={(file) => setFileName(file?.name ?? "")} onReject={(message) => toast("File not selected", message, "error")} /></Field>
          {fileName && <div className="selected-file"><FileText size={16} /><span>{fileName}</span><button onClick={() => setFileName("")} aria-label="Remove file"><X size={15} /></button></div>}
          <div className="dialog-actions"><Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button><Button disabled={!fileName} onClick={() => { setUploadOpen(false); toast("Resume selected", `${fileName} remains on this device; no upload or parsing occurred.`, "info"); }}>Continue</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function CandidateDiscoveryCard({ candidate, selected, onSelect }: { candidate: (typeof candidates)[number]; selected: boolean; onSelect: (value: boolean) => void }) {
  const navigate = useNavigate();
  return (
    <Card className="discovery-card">
      <div className="discovery-card-top"><Avatar initials={candidate.initials} color={candidate.color} size="lg" /><div className="discovery-name"><button onClick={() => navigate(`/candidates/${candidate.id}`)}><strong>{candidate.name}</strong><ChevronRight size={15} /></button><span>{candidate.title} <i>·</i> {candidate.experience} <i>·</i> {candidate.location}</span></div><div className="discovery-match"><span><Sparkles size={13} />{candidate.match}%</span><small>match score</small></div><button className="icon-button" aria-label="More candidate actions"><MoreHorizontal size={17} /></button></div>
      <div className="discovery-skills">{candidate.skills.map((skill) => <span key={skill}>{skill}</span>)}<StatusBadge>{candidate.status}</StatusBadge></div>
      <div className="match-reason"><Lightbulb size={14} /><span><strong>Why this match:</strong> Experience and core skills align with the role criteria. Review profile evidence before proceeding.</span></div>
      <div className="discovery-card-footer"><Checkbox checked={selected} onChange={onSelect} label="Select for comparison" /><div><Button variant="secondary" size="sm" onClick={() => navigate(`/candidates/${candidate.id}`)}>View profile</Button><Button size="sm" onClick={() => navigate("/matching/compare")}>Compare</Button></div></div>
    </Card>
  );
}

function CandidateProfilePage() {
  const { candidateId } = useParams();
  const { toast } = useAppContext();
  const candidate = candidates.find((item) => item.id === candidateId) ?? candidates[0];
  const [tab, setTab] = useState("Overview");
  return (
    <div className="page-stack">
      <div className="back-link-row"><Link to="/candidates"><ArrowLeft size={15} /> Candidates</Link><span className="breadcrumb-slash">/</span><span>{candidate.id}</span></div>
      <Card className="candidate-profile-hero">
        <div className="profile-hero-main"><Avatar initials={candidate.initials} color={candidate.color} size="lg" /><div><div className="profile-id">{candidate.id} <span>·</span> Added Oct 21, 2026</div><h1>{candidate.name}</h1><p>{candidate.title} <span>·</span> {candidate.experience} experience <span>·</span> {candidate.location}</p><div className="profile-badges"><StatusBadge>{candidate.status}</StatusBadge><span className="consent-badge"><ShieldCheck size={13} /> Consent recorded</span></div></div></div>
        <div className="profile-hero-actions"><Button variant="secondary" icon={<Mail size={15} />} onClick={() => toast("Email draft", "A draft can be prepared in the Communication centre.", "info")}>Draft email</Button><Button onClick={() => toast("Reserve candidate", "Choose an open requirement in the AI Matching flow to request a reservation.", "info")} icon={<BriefcaseBusiness size={15} />}>Reserve for REC</Button><Dropdown trigger={<Button variant="secondary" icon={<MoreHorizontal size={16} />} aria-label="More candidate actions" />}><MenuItem onSelect={() => toast("Profile link copied", "This link is local to the demo.", "info")}>Copy profile link</MenuItem><MenuItem onSelect={() => toast("Archive candidate", "Archiving requires confirmation.", "info")}>Archive profile</MenuItem></Dropdown></div>
      </Card>
      <Tabs value={tab} onValueChange={setTab} items={[{ value: "Overview", label: "Overview" }, { value: "Resume", label: "Resume" }, { value: "Submissions", label: "Submissions", count: 2 }, { value: "Activity", label: "Activity" }]} />
      <div className="dashboard-grid profile-grid">
        <div className="profile-main-column"><Card className="detail-main-card"><div className="card-heading"><div><h2>Professional summary</h2><p>Candidate details and skills from the reviewed profile.</p></div><Button size="sm" variant="secondary" icon={<Settings2 size={14} />} onClick={() => toast("Edit profile", "Profile editing is a local prototype placeholder.", "info")}>Edit profile</Button></div><p className="profile-summary">Product designer with a strong track record shaping clear, thoughtful experiences for growing software teams. Brings a balance of product thinking, hands-on craft, and collaborative research across the design lifecycle.</p><div className="profile-facts"><span><small>Current title</small><strong>{candidate.title}</strong></span><span><small>Experience</small><strong>{candidate.experience}</strong></span><span><small>Location</small><strong>{candidate.location}</strong></span><span><small>Availability</small><strong>2 weeks</strong></span></div><h3 className="subsection-title">Skills & expertise</h3><div className="skill-chip-row">{candidate.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>)}<span className="skill-chip">Product strategy</span></div></Card>
          <Card className="detail-main-card"><div className="card-heading"><div><h2>Recent activity</h2><p>Latest candidate-related updates</p></div></div><div className="timeline"><div className="timeline-item"><span className="timeline-dot timeline-blue" /><span><strong>Submitted to Senior Product Designer</strong><small>Nov 4, 2026 · Ananya Rao</small></span><StatusBadge>Pending review</StatusBadge></div><div className="timeline-item"><span className="timeline-dot timeline-green" /><span><strong>Resume reviewed</strong><small>Oct 29, 2026 · Ananya Rao</small></span></div><div className="timeline-item"><span className="timeline-dot timeline-violet" /><span><strong>Profile added to workspace</strong><small>Oct 21, 2026 · Rhea Kapoor</small></span></div></div></Card>
        </div>
        <aside className="profile-side-column"><Card className="detail-main-card"><div className="card-heading"><div><h2>Contact details</h2><p>Only visible to authorized teammates</p></div><button className="icon-button" aria-label="Edit contact details" onClick={() => toast("Contact details", "Sensitive candidate details are synthetic in this demo.", "info")}><MoreHorizontal size={16} /></button></div><div className="contact-detail"><small>Email</small><strong>mira.shah@example.test</strong></div><div className="contact-detail"><small>Phone</small><strong>+91 90000 10001</strong></div><div className="contact-detail"><small>Source</small><strong>Referral · Ananya Rao</strong></div></Card>
          <Card className="detail-main-card"><div className="card-heading"><div><h2>Current ownership</h2><p>Reservation scope is per REC</p></div><StatusBadge>Available</StatusBadge></div><div className="owner-box"><Avatar initials="AR" color="lavender" /><span><strong>Ananya Rao</strong><small>Claimed for REC-2048</small></span></div><button className="owner-link" onClick={() => toast("Ownership history", "Audit history is not connected in this UI prototype.", "info")}>View ownership history <ArrowRight size={14} /></button></Card></aside>
      </div>
    </div>
  );
}

function MatchingPage({ compare = false }: { compare?: boolean }) {
  const [selectedRequirement, setSelectedRequirement] = useState("REC-2048");
  const [selectedCandidates, setSelectedCandidates] = useState(["CAN-1194", "CAN-1162"]);
  const [tab, setTab] = useState("Best fit");
  const { toast } = useAppContext();
  const navigate = useNavigate();
  const list = candidates.filter((candidate) => tab === "Best fit" || candidate.status === tab);
  if (compare) {
    const compareRows = candidates.filter((candidate) => selectedCandidates.includes(candidate.id));
    return (
      <div className="page-stack">
        <div className="back-link-row"><Link to="/matching"><ArrowLeft size={15} /> AI matching</Link><span className="breadcrumb-slash">/</span><span>Compare candidates</span></div>
        <PageHeader title="Candidate comparison" description="Review evidence side by side. Scores support your judgment; they do not make a hiring decision." eyebrow="AI MATCHING · REC-2048" actions={<Button variant="secondary" icon={<Download size={15} />} onClick={() => window.print()}>Export comparison</Button>} />
        <div className="intelligence-banner"><span className="intelligence-banner-icon"><Sparkles size={18} /></span><span><strong>Human decision required</strong><small>Review the underlying evidence and follow your organization's hiring process.</small></span><span className="review-state">Criteria-based · v0.1</span></div>
        <Card className="compare-card"><div className="comparison-grid comparison-head"><span className="comparison-criteria-title">REC criteria</span>{compareRows.map((candidate) => <div className="compare-person" key={candidate.id}><Avatar initials={candidate.initials} color={candidate.color} size="lg" /><div><strong>{candidate.name}</strong><small>{candidate.title} · {candidate.experience}</small><button onClick={() => navigate(`/candidates/${candidate.id}`)}>View profile <ArrowUpRight size={12} /></button></div><span className="score-pill">{candidate.match}<small>%</small></span></div>)}</div>
          {[["Product design experience", "Strong", "Strong"], ["Figma & prototyping", "Strong", "Strong"], ["Design systems", "Strong", "Some evidence"], ["User research", "Some evidence", "Strong"], ["B2B SaaS experience", "Unknown", "Strong"]].map(([criterion, left, right], index) => <div className="comparison-grid comparison-row" key={criterion}><span className="comparison-criterion"><span>{String(index + 1).padStart(2, "0")}</span>{criterion}</span><EvidenceCell status={left} /><EvidenceCell status={right} /></div>)}
          <div className="comparison-footnote"><InfoIcon /> Scores summarize documented criteria only. Missing information is shown as unknown—not inferred.</div>
        </Card><div className="form-footer"><span>Choose an action for each candidate individually.</span><div>{compareRows.map((candidate) => <Button key={candidate.id} onClick={() => toast("Reservation requested", `${candidate.name} has not been reserved; backend access is not connected.`, "info")} icon={<BriefcaseBusiness size={14} />}>Review {candidate.name.split(" ")[0]}</Button>)}</div></div>
      </div>
    );
  }
  return (
    <div className="page-stack">
      <PageHeader title="AI candidate matching" description="Find candidates against structured REC criteria, with evidence you can inspect." eyebrow="TALENT INTELLIGENCE" actions={<Button variant="secondary" icon={<Clock3 size={15} />} onClick={() => toast("Matching history", "No matching runs have been saved in this prototype.", "info")}>Run history</Button>} />
      <div className="demo-banner"><span className="demo-dot" /><span>Illustrative match scores using synthetic profiles · No hiring decision is automated.</span></div>
      <Card className="match-requirement-bar"><div className="match-rec-icon"><Target size={18} /></div><div className="match-rec-copy"><small>MATCHING FOR</small><strong>Senior Product Designer <span>·</span> REC-2048</strong><span>Northstar Labs · Bengaluru · 6–9 years</span></div><SelectInput value={selectedRequirement} onChange={(event) => setSelectedRequirement(event.target.value)}><option value="REC-2048">Change requirement</option>{requirements.filter((item) => item.status === "Open").map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</SelectInput><Button variant="secondary" size="sm" icon={<SlidersHorizontal size={14} />} onClick={() => navigate(`/requirements/${selectedRequirement}/intelligence`)}>Edit criteria</Button><Button onClick={() => toast("Match results refreshed", "This view uses synthetic sample profiles; no matching service was called.", "info")} icon={<Sparkles size={15} />}>Run matching</Button></Card>
      <div className="match-summary-grid"><div className="match-summary-card"><span className="summary-icon summary-blue"><UsersRound size={18} /></span><span><small>Profiles reviewed</small><strong>48 <i>in your talent pool</i></strong></span></div><div className="match-summary-card"><span className="summary-icon summary-green"><Target size={18} /></span><span><small>Strong matches</small><strong>8 <i>above 80% fit</i></strong></span></div><div className="match-summary-card"><span className="summary-icon summary-violet"><CheckCircle2 size={18} /></span><span><small>Criteria covered</small><strong>5 of 6 <i>one unknown</i></strong></span></div></div>
      <Card className="table-card match-results-card"><div className="table-card-top"><div><h2>Suggested candidates <span className="soft-count">8</span></h2><p>Ranked by fit to the reviewed criteria. Every recommendation needs recruiter review.</p></div><button className="icon-button" aria-label="Filter match results" onClick={() => toast("Match filters", "Advanced match filters will be available in a later iteration.", "info")}><ListFilter size={17} /></button></div>
        <Tabs value={tab} onValueChange={setTab} items={[{ value: "Best fit", label: "Best fit", count: 8 }, { value: "Available", label: "Available", count: 5 }, { value: "In process", label: "In process", count: 2 }]} />
        <div className="match-table-labels"><span>CANDIDATE</span><span>CRITERIA COVERAGE</span><span>MATCH</span><span>STATUS</span><span>ACTIONS</span></div>
        {list.map((candidate) => <div className="match-table-row" key={candidate.id}><div className="match-candidate"><Avatar initials={candidate.initials} color={candidate.color} /><span><button onClick={() => navigate(`/candidates/${candidate.id}`)}><strong>{candidate.name}</strong></button><small>{candidate.title} · {candidate.experience} · {candidate.location}</small></span></div><div className="coverage-cell"><span className="coverage-track"><i style={{ width: `${candidate.match}%` }} /></span><span>{candidate.match >= 90 ? "5/6" : "4/6"} criteria</span></div><div className="match-score-large"><strong>{candidate.match}%</strong><small>Strong fit</small></div><StatusBadge>{candidate.status}</StatusBadge><div className="match-action-buttons"><Button variant="secondary" size="sm" onClick={() => { setSelectedCandidates((previous) => [...new Set([...previous, candidate.id])]); navigate("/matching/compare"); }}>Compare</Button><Button size="sm" onClick={() => toast("Candidate review", `${candidate.name} is ready for an authorized recruiter to review.`, "info")}>Review</Button></div></div>)}
        <div className="match-explain-footer"><Lightbulb size={16} /><span><strong>How matching works</strong> Criteria-based comparison highlights documented evidence, gaps, and unknowns. It does not infer protected traits or make hiring decisions.</span><button onClick={() => navigate(`/requirements/${selectedRequirement}/intelligence`)}>View criteria <ArrowRight size={14} /></button></div>
      </Card>
    </div>
  );
}

function EvidenceCell({ status }: { status: string }) {
  const isStrong = status === "Strong";
  const isUnknown = status === "Unknown";
  return <span className={`evidence-cell ${isStrong ? "evidence-strong" : isUnknown ? "evidence-unknown" : "evidence-some"}`}>{isStrong ? <CheckCircle2 size={15} /> : isUnknown ? <CircleHelp size={15} /> : <span className="evidence-half">◐</span>}{status}<small>{isStrong ? "Evidence found" : isUnknown ? "Not in profile" : "Partial evidence"}</small></span>;
}

function InfoIcon() {
  return <CircleHelp size={15} />;
}

function SubmissionsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const { toast } = useAppContext();
  const rows = submissions.filter((row) => `${row.candidate} ${row.requirement} ${row.client} ${row.owner}`.toLowerCase().includes(query.toLowerCase()) && (tab === "All" || row.status === tab));
  const columns = [
    { key: "candidate" as const, label: "CANDIDATE", render: (row: (typeof submissions)[number]) => <span className="table-person"><Avatar initials={row.initials} color={row.color} /><span><strong>{row.candidate}</strong><small>Submitted by {row.owner}</small></span></span> },
    { key: "requirement" as const, label: "REQUIREMENT", render: (row: (typeof submissions)[number]) => <span><strong>{row.requirement}</strong><small className="cell-subline">{row.client}</small></span> },
    { key: "submitted" as const, label: "SUBMITTED" },
    { key: "status" as const, label: "STATUS", render: (row: (typeof submissions)[number]) => <StatusBadge>{row.status}</StatusBadge> },
    { key: "owner" as const, label: "OWNER" },
    { key: "candidate" as const, label: "", render: (row: (typeof submissions)[number]) => <Dropdown trigger={<button className="icon-button" aria-label={`Actions for ${row.candidate}`}><MoreHorizontal size={17} /></button>}><MenuItem onSelect={() => toast("Submission details", `${row.candidate}'s sample submission is not stored.`, "info")}>View details</MenuItem><MenuItem onSelect={() => toast("Submission updated", "A status decision requires an authorized manager and is not saved in this demo.", "info")}>Update status</MenuItem></Dropdown> },
  ];
  return (
    <div className="page-stack"><PageHeader title="Submissions" description="Track candidate presentations, client feedback, and next steps." actions={<Button variant="secondary" icon={<Download size={15} />} onClick={() => window.print()}>Export view</Button>} />
      <div className="kpi-grid compact-kpis"><KpiCard label="Total submitted" value="42" change="+14%" icon={FileCheck2} tone="blue" note="This month" /><KpiCard label="Awaiting review" value="11" change="4 new" icon={Clock3} tone="amber" note="Manager review needed" /><KpiCard label="Interview conversion" value="38%" change="+6.2%" icon={Target} tone="green" note="Of approved submissions" /></div>
      <Card className="table-card"><div className="table-card-top"><div><h2>Submission pipeline</h2><p>Each REC accepts one candidate submission per client workflow.</p></div><Button onClick={() => toast("New submission", "Select an authorized candidate from an open requirement to begin.", "info")} icon={<Plus size={15} />}>New submission</Button></div><Tabs value={tab} onValueChange={setTab} items={[{ value: "All", label: "All submissions", count: 42 }, { value: "Pending review", label: "Pending review", count: 11 }, { value: "Approved", label: "Approved", count: 19 }, { value: "Returned", label: "Returned", count: 4 }]} /><div className="table-toolbar"><SearchFilter value={query} onChange={setQuery} placeholder="Search candidates or roles..." /><Button variant="secondary" size="sm" icon={<Filter size={15} />} onClick={() => setTab("Pending review")}>Filters</Button></div><DataTable columns={columns} rows={rows} rowKey="candidate" emptyTitle="No submissions in this view" emptyDescription="Choose another status to see more items." /><div className="table-pagination"><span>Showing <strong>{rows.length}</strong> of 42 submissions</span><div><Button size="sm" variant="secondary" disabled>Previous</Button><Button size="sm" variant="secondary" onClick={() => toast("End of demo data", "No more synthetic submissions are available.", "info")}>Next</Button></div></div></Card>
    </div>
  );
}

function InterviewsPage() {
  const [view, setView] = useState("Week");
  const [selectedDay, setSelectedDay] = useState("05");
  const { toast } = useAppContext();
  return (
    <div className="page-stack"><PageHeader title="Interviews" description="Keep every conversation on track with one shared schedule." actions={<Button onClick={() => toast("Schedule interview", "Choose a submitted candidate to create an internal schedule record.", "info")} icon={<Plus size={16} />}>Schedule interview</Button>} />
      <div className="calendar-summary"><div className="calendar-summary-icon"><CalendarDays size={19} /></div><div><strong>6 interviews this week</strong><span>All times shown in Asia/Kolkata · Nov 2–8, 2026</span></div><Button variant="secondary" size="sm" onClick={() => toast("Today", "The calendar is already showing this week.", "info")}>Today</Button><div className="calendar-view-switch">{["Week", "Agenda"].map((item) => <button key={item} className={view === item ? "calendar-switch-active" : ""} onClick={() => setView(item)}>{item}</button>)}</div></div>
      <Card className="calendar-card"><div className="calendar-month-heading"><div><h2>November 2026</h2><span>Week 45 · 3 interviews today</span></div><div><Button size="sm" variant="secondary" onClick={() => toast("Previous week", "Calendar navigation is limited to this synthetic week.", "info")}>‹</Button><Button size="sm" variant="secondary" onClick={() => toast("Next week", "Calendar navigation is limited to this synthetic week.", "info")}>›</Button></div></div>
        <div className="calendar-days">{[["MON", "02"], ["TUE", "03"], ["WED", "04"], ["THU", "05"], ["FRI", "06"], ["SAT", "07"], ["SUN", "08"]].map(([day, date]) => <button className={`calendar-day ${selectedDay === date ? "calendar-day-selected" : ""}`} key={date} onClick={() => setSelectedDay(date)}><small>{day}</small><strong>{date}</strong><span className={["05", "06"].includes(date) ? "day-event-dot" : ""} /></button>)}</div>
        <div className="agenda-heading"><div><h3>Thursday, November {selectedDay}</h3><span>{selectedDay === "05" ? "3 interviews scheduled" : "No interviews scheduled"}</span></div><button className="small-link" onClick={() => setView(view === "Week" ? "Agenda" : "Week")}>{view === "Week" ? "Full agenda" : "Week view"} <ArrowRight size={13} /></button></div>
        {selectedDay === "05" ? <div className="agenda-list">{interviews.map((interview) => <div className="agenda-row" key={interview.name}><div className="agenda-time">{interview.time}<small>45 min</small></div><span className="agenda-rail" /><div className="agenda-event"><div className="agenda-event-top"><Avatar initials={interview.initials} color={interview.color} /><span><strong>{interview.name}</strong><small>{interview.role} · {interview.type}</small></span><Dropdown trigger={<button className="icon-button" aria-label="Interview actions"><MoreHorizontal size={16} /></button>}><MenuItem onSelect={() => toast("Reschedule interview", "Reschedule reasons and schedule history are required.", "info")}>Reschedule</MenuItem><MenuItem onSelect={() => toast("Interview details", `Hosted by ${interview.host}.`, "info")}>View details</MenuItem></Dropdown></div><div className="agenda-event-meta"><span><UsersRound size={13} /> {interview.host}</span><span><Video size={13} /> Video call</span><button onClick={() => toast("Interview room", "External calendar links are not connected in the MVP prototype.", "info")}>Join meeting <ArrowUpRight size={12} /></button></div></div></div>)}</div> : <div className="calendar-empty"><CalendarDays size={22} /><strong>A lighter day</strong><span>No interviews are scheduled for November {selectedDay}.</span><Button size="sm" variant="secondary" onClick={() => toast("Schedule interview", "Start from a candidate submission to add a conversation.", "info")}>Schedule an interview</Button></div>}
      </Card>
    </div>
  );
}

function FollowupsPage() {
  const [tasks, setTasks] = useState(followups.map((item) => ({ ...item, complete: false })));
  const [tab, setTab] = useState("Open");
  const [query, setQuery] = useState("");
  const { toast } = useAppContext();
  const filtered = tasks.filter((task) => (tab === "Open" ? !task.complete : task.complete) && `${task.title} ${task.linked} ${task.owner}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="page-stack"><PageHeader title="Follow-ups" description="Make sure the small next steps never get lost in a busy pipeline." actions={<Button onClick={() => toast("New follow-up", "Create a follow-up from a related candidate, REC, submission, or interview.", "info")} icon={<Plus size={16} />}>Add follow-up</Button>} />
      <div className="kpi-grid compact-kpis"><KpiCard label="Open follow-ups" value="12" change="4 due today" icon={CheckSquare} tone="blue" note="Across your team" /><KpiCard label="Overdue" value="3" change="Needs attention" icon={Flame} tone="amber" note="Past the due date" /><KpiCard label="Completed this week" value="28" change="+18%" icon={CheckCircle2} tone="green" note="Team follow-through" /></div>
      <Card className="followups-card"><div className="followups-top"><div><h2>Your team's follow-ups</h2><p>One clear next step for every candidate and interview.</p></div><Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => window.print()}>Export list</Button></div><Tabs value={tab} onValueChange={setTab} items={[{ value: "Open", label: "Open", count: tasks.filter((task) => !task.complete).length }, { value: "Completed", label: "Completed" }]} /><div className="table-toolbar"><SearchFilter value={query} onChange={setQuery} placeholder="Search follow-ups..." /><SelectInput><option>All owners</option><option>Ananya Rao</option><option>Arjun Mehta</option><option>Rhea Kapoor</option></SelectInput><Button variant="secondary" size="sm" icon={<Filter size={15} />} onClick={() => toast("Filters", "Showing follow-ups for all owners.", "info")}>Filters</Button></div>
        <div className="task-list">{filtered.map((task) => <div className={`task-row ${task.complete ? "task-complete" : ""}`} key={task.title}><button className={`task-checkbox ${task.complete ? "task-checkbox-done" : ""}`} onClick={() => { setTasks((current) => current.map((item) => item.title === task.title ? { ...item, complete: !item.complete } : item)); toast(task.complete ? "Follow-up reopened locally" : "Follow-up completed locally", "This change is not saved to the database.", "info"); }} aria-label={task.complete ? "Reopen follow-up" : "Complete follow-up"}>{task.complete && <Check size={13} />}</button><span className="task-copy"><strong>{task.title}</strong><small><Link2 size={12} /> {task.linked}</small></span><StatusBadge>{task.priority}</StatusBadge><span className={`task-due ${task.due.startsWith("Today") ? "due-today" : ""}`}><Clock3 size={13} />{task.due}</span><span className="task-owner"><Avatar initials={task.owner.split(" ").map((part) => part[0]).join("")} color="blue" size="sm" />{task.owner}</span><Dropdown trigger={<button className="icon-button" aria-label={`More options for ${task.title}`}><MoreHorizontal size={16} /></button>}><MenuItem onSelect={() => toast("Follow-up updated", "This prototype does not persist follow-up edits.", "info")}>Edit follow-up</MenuItem><MenuItem onSelect={() => toast("Reassign follow-up", "Manager reassignment is not connected in this demo.", "info")}>Reassign owner</MenuItem></Dropdown></div>)}
          {!filtered.length && <div className="empty-state"><div className="empty-icon"><CheckSquare size={20} /></div><strong>No follow-ups here</strong><span>Try another view or search term.</span></div>}
        </div><div className="table-pagination"><span>Showing <strong>{filtered.length}</strong> follow-ups</span><Button variant="ghost" size="sm" onClick={() => { setQuery(""); setTab("Open"); }}>Reset view</Button></div>
      </Card>
    </div>
  );
}

function CommunicationPage() {
  const [activeTab, setActiveTab] = useState("Email drafts");
  const [drafts, setDrafts] = useState([
    { title: "Candidate introduction", type: "Client submission", updated: "Edited 12 min ago", initials: "MS", color: "rose", content: "Hi team, sharing a profile for your review..." },
    { title: "Interview confirmation", type: "Candidate update", updated: "Edited yesterday", initials: "KN", color: "mint", content: "Hi Kabir, confirming your upcoming conversation..." },
    { title: "Follow-up after interview", type: "Candidate update", updated: "Edited Oct 30", initials: "TI", color: "lavender", content: "Hi Tara, thank you for taking the time..." },
  ]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const { toast } = useAppContext();
  const saveDraft = () => {
    if (!draftTitle.trim() || !draftBody.trim()) {
      toast("Add a subject and message", "Both fields are needed for a local draft.", "error");
      return;
    }
    setDrafts((current) => [{ title: draftTitle, type: "Custom draft", updated: "Just now", initials: "AR", color: "blue", content: draftBody }, ...current]);
    setComposeOpen(false);
    setDraftTitle("");
    setDraftBody("");
    toast("Draft saved locally", "This email has not been sent or saved to a server.", "info");
  };
  const copyDraft = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast("Copied to clipboard", "The draft is ready to paste into your email client.", "success");
    } catch {
      toast("Clipboard unavailable", "Select and copy the draft text manually.", "error");
    }
  };
  return (
    <div className="page-stack"><PageHeader title="Communication centre" description="Prepare thoughtful, on-brand candidate and client messages." actions={<Button onClick={() => setComposeOpen(true)} icon={<Plus size={16} />}>Create draft</Button>} />
      <div className="demo-banner"><span className="demo-dot" /><span>Drafts only · SEARCHY does not send email or connect to a mailbox in this prototype.</span></div>
      <Card className="communication-card"><div className="table-card-top"><div><h2>Message workspace</h2><p>Templates and editable drafts for the moments that matter.</p></div><Button variant="secondary" size="sm" icon={<Settings2 size={14} />} onClick={() => toast("Template settings", "Workspace templates will be manageable in settings.", "info")}>Manage templates</Button></div><Tabs value={activeTab} onValueChange={setActiveTab} items={[{ value: "Email drafts", label: "Email drafts", count: drafts.length }, { value: "Templates", label: "Templates", count: 6 }, { value: "Notes", label: "Internal notes" }]} />
        {activeTab === "Email drafts" ? <div className="draft-list">{drafts.map((draft, index) => <div className="draft-row" key={`${draft.title}-${index}`}><span className="draft-icon"><Mail size={16} /></span><span className="draft-details"><strong>{draft.title}</strong><small>{draft.type} <i>·</i> {draft.updated}</small></span><span className="draft-linked"><Avatar initials={draft.initials} color={draft.color} size="sm" /><span>Linked candidate</span></span><div className="draft-actions"><Button variant="secondary" size="sm" onClick={() => { setDraftTitle(draft.title); setDraftBody(draft.content); setComposeOpen(true); }}>Edit draft</Button><Button size="sm" icon={<Copy size={14} />} onClick={() => void copyDraft(draft.content)}>Copy</Button></div><Dropdown trigger={<button className="icon-button" aria-label="Draft options"><MoreHorizontal size={16} /></button>}><MenuItem onSelect={() => toast("Draft archived locally", "Prototype email drafts are not persisted.", "info")}>Archive draft</MenuItem></Dropdown></div>)}</div> : <div className="template-grid">{["Candidate introduction", "Interview invitation", "Client feedback request", "Offer congratulations", "Follow-up after interview", "Role brief share"].map((template, index) => <button className="template-card" key={template} onClick={() => { setDraftTitle(template); setDraftBody(`Hi there,\\n\\n${["I’m pleased to share a candidate profile for your review.", "We’d love to invite you to the next interview conversation.", "Could you share your feedback on the candidate when you have a moment?"][index % 3]}\\n\\nBest,\\nAnanya`); setComposeOpen(true); }}><span className="template-icon"><Mail size={16} /></span><strong>{template}</strong><small>{index % 2 === 0 ? "Client communication" : "Candidate communication"}</small><span className="template-arrow">Use template <ArrowRight size={13} /></span></button>)}</div>}
      </Card>
      <Modal title={draftTitle ? "Edit email draft" : "Create email draft"} description="Write a draft to copy into your email client. Nothing will be sent." open={composeOpen} onOpenChange={setComposeOpen} size="lg"><div className="modal-form"><Field label="Subject" required><TextInput value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="e.g. Candidate introduction — Mira Shah" /></Field><Field label="Message" required hint="Keep candidate information relevant and appropriate."><TextArea rows={8} value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder={"Hi team,\\n\\nSharing a profile for your review..."} /></Field><div className="dialog-actions"><Button variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button><Button onClick={saveDraft} icon={<Check size={15} />}>Save draft locally</Button></div></div></Modal>
    </div>
  );
}

function InterviewIntelligencePage({ questions = false, scorecard = false }: { questions?: boolean; scorecard?: boolean }) {
  const [category, setCategory] = useState("All questions");
  const [search, setSearch] = useState("");
  const [scores, setScores] = useState([3, 4, 3, 2]);
  const { toast } = useAppContext();
  const navigate = useNavigate();
  const questionData = [
    { question: "How do you approach designing for a complex workflow with multiple user roles?", category: "Product thinking", level: "Senior", time: "15 min" },
    { question: "Tell me about a time user research changed your initial product direction.", category: "Research", level: "All levels", time: "10 min" },
    { question: "How do you maintain consistency as a design system scales across teams?", category: "Craft & systems", level: "Senior", time: "12 min" },
    { question: "Walk through a prototype you used to test a high-risk interaction.", category: "Craft & systems", level: "Mid–senior", time: "10 min" },
  ];
  if (scorecard) {
    const criteria = ["Problem framing & discovery", "Interaction design craft", "Communication & collaboration", "Learning mindset"];
    const average = (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1);
    return (
      <div className="page-stack"><div className="back-link-row"><Link to="/interview-intelligence"><ArrowLeft size={15} /> Interview intelligence</Link><span className="breadcrumb-slash">/</span><span>Evaluation scorecard</span></div><PageHeader title="Technical evaluation" description="Structured, job-related feedback. Add specific evidence before submitting." eyebrow="MIRA SHAH · SENIOR PRODUCT DESIGNER" actions={<StatusBadge>Draft</StatusBadge>} />
        <div className="intelligence-banner"><span className="intelligence-banner-icon"><ShieldCheck size={18} /></span><span><strong>Fair, structured evaluation</strong><small>Score each criterion against the role rubric. Avoid personal or protected characteristics.</small></span><span className="review-state">Interview · Nov 5, 2026</span></div>
        <div className="evaluation-layout"><div className="evaluation-criteria">{criteria.map((criterion, index) => <Card className="evaluation-card" key={criterion}><div className="evaluation-criterion-top"><div><span className="criteria-number">{String(index + 1).padStart(2, "0")}</span><strong>{criterion}</strong></div><span className="scale-hint">1 · Developing <i>—</i> 5 · Exceptional</span></div><div className="rating-scale" role="group" aria-label={`Score ${criterion}`}>{[1, 2, 3, 4, 5].map((score) => <button key={score} className={scores[index] === score ? "rating-selected" : ""} onClick={() => setScores((current) => current.map((value, scoreIndex) => scoreIndex === index ? score : value))} aria-pressed={scores[index] === score}>{score}</button>)}</div><Field label="Evidence & notes"><TextArea rows={2} placeholder="What did the candidate say or demonstrate?" /></Field></Card>)}</div>
          <aside className="evaluation-side"><Card className="evaluation-summary"><span className="summary-icon summary-blue"><BarChart3 size={17} /></span><small>Overall score</small><strong>{average}<i> / 5</i></strong><div className="progress-track"><span style={{ width: `${Number(average) * 20}%` }} /></div><p>Average across 4 job-related criteria</p><hr /><div className="evaluation-recommend"><span>Recommendation</span><SelectInput><option>Choose recommendation</option><option>Strong yes</option><option>Yes</option><option>Mixed</option><option>No</option></SelectInput></div></Card><Card className="aside-note"><Lightbulb size={17} /><strong>Use concrete evidence</strong><p>Note relevant examples from this conversation. Feedback should relate to the role criteria.</p></Card></aside></div>
        <div className="form-footer"><span>Draft saves are local only and are not submitted.</span><div><Button variant="secondary" onClick={() => toast("Evaluation draft saved locally", "This evaluation has not been submitted or saved to a server.", "info")}>Save draft locally</Button><Button onClick={() => toast("Evaluation not submitted", "Backend submission is not connected in this prototype.", "info")} icon={<Send size={14} />}>Submit evaluation</Button></div></div>
      </div>
    );
  }
  const filteredQuestions = questionData.filter((item) => `${item.question} ${item.category}`.toLowerCase().includes(search.toLowerCase()) && (category === "All questions" || item.category === category));
  return (
    <div className="page-stack"><PageHeader title={questions ? "Question bank" : "Interview intelligence"} description={questions ? "Prepare consistent, role-relevant questions for every interview." : "Structured interview kits and thoughtful evaluation for stronger hiring conversations."} eyebrow={questions ? "INTERVIEW INTELLIGENCE" : undefined} actions={questions ? <Button onClick={() => toast("Question added", "Questions can be added in this prototype session.", "info")} icon={<Plus size={15} />}>Add question</Button> : <Button variant="secondary" icon={<FileText size={15} />} onClick={() => navigate("/interview-intelligence/questions")}>Open question bank</Button>} />
      {!questions && <div className="intelligence-banner"><span className="intelligence-banner-icon"><Sparkles size={18} /></span><span><strong>Built for thoughtful interviews</strong><small>Organize question kits, guide job-related conversations, and capture structured evidence.</small></span><span className="review-state">No automated hiring decisions</span></div>}
      <div className="interview-intel-grid"><Card className="detail-main-card"><div className="card-heading"><div><h2>{questions ? "Design & product questions" : "Your interview kits"}</h2><p>{questions ? "Curated questions for product design and engineering roles." : "Role-based guides ready for your next conversation."}</p></div><Button variant="secondary" size="sm" onClick={() => toast("Create interview kit", "Kits can be assembled from the question bank.", "info")} icon={<Plus size={14} />}>Create kit</Button></div>
        {questions && <div className="table-toolbar question-toolbar"><SearchFilter value={search} onChange={setSearch} placeholder="Search questions..." /><SelectInput value={category} onChange={(event) => setCategory(event.target.value)}><option>All questions</option><option>Product thinking</option><option>Research</option><option>Craft & systems</option></SelectInput><Button variant="secondary" size="sm" icon={<Filter size={14} />} onClick={() => setCategory("Product thinking")}>Filter</Button></div>}
        {questions ? <div className="question-list">{filteredQuestions.map((item, index) => <div className="question-row" key={item.question}><span className="question-number">Q{index + 1}</span><span className="question-copy"><strong>{item.question}</strong><small>{item.category} <i>·</i> {item.level}</small></span><span className="question-time"><Clock3 size={13} />{item.time}</span><Dropdown trigger={<button className="icon-button" aria-label="Question actions"><MoreHorizontal size={16} /></button>}><MenuItem onSelect={() => toast("Question added to kit", "This action is local to the prototype.", "info")}>Add to kit</MenuItem><MenuItem onSelect={() => toast("Question edit", "Question editing is not persisted.", "info")}>Edit question</MenuItem></Dropdown></div>)}</div> : <div className="kit-grid">{[{ title: "Senior Product Designer", category: "Product & Design", count: 8, date: "Updated Oct 28", icon: Sparkles, color: "violet" }, { title: "Engineering Manager", category: "Engineering", count: 10, date: "Updated Oct 22", icon: Settings2, color: "blue" }, { title: "Data Platform Engineer", category: "Data & Analytics", count: 7, date: "Updated Oct 15", icon: BarChart3, color: "green" }].map((kit) => <button className="kit-card" key={kit.title} onClick={() => navigate("/interview-intelligence/questions")}><span className={`kit-icon kit-${kit.color}`}><kit.icon size={18} /></span><span className="kit-category">{kit.category}</span><strong>{kit.title}</strong><small>{kit.count} questions <i>·</i> {kit.date}</small><span className="kit-open">Open kit <ArrowRight size={14} /></span></button>)}</div>}</Card>
        <Card className="scorecard-promo"><div className="promo-icon"><FileCheck2 size={18} /></div><div className="eyebrow">EVALUATION</div><h3>Consistent feedback, better decisions.</h3><p>Use a structured scorecard to assess candidates against role-specific competencies.</p><ul><li><CheckCircle2 size={14} /> Criteria tied to the role</li><li><CheckCircle2 size={14} /> Evidence-based feedback</li><li><CheckCircle2 size={14} /> Human-reviewed outcomes</li></ul><Button variant="secondary" size="sm" onClick={() => navigate("/interview-intelligence/scorecard")}>Try a scorecard <ArrowRight size={14} /></Button><div className="promo-watermark"><ShieldCheck size={78} /></div></Card></div>
    </div>
  );
}

function AnalyticsPage({ manager = false }: { manager?: boolean }) {
  const [period, setPeriod] = useState("Last 30 days");
  const navigate = useNavigate();
  return (
    <div className="page-stack"><PageHeader title={manager ? "Manager overview" : "Recruitment analytics"} description={manager ? "Team performance, workload balance, and decisions that need your attention." : "Understand recruitment activity and operational momentum across your workspace."} eyebrow={manager ? "TEAM OPERATIONS" : undefined} actions={<><SelectInput value={period} onChange={(event) => setPeriod(event.target.value)}><option>Last 30 days</option><option>Last 90 days</option><option>This quarter</option></SelectInput><Button variant="secondary" icon={<Download size={15} />} onClick={() => window.print()}>Export report</Button></>} />
      {manager && <div className="manager-brief"><span className="manager-brief-icon"><ShieldCheck size={18} /></span><div><strong>Team workspace view</strong><span>Sample operational metrics · Candidate decisions stay with authorized managers.</span></div><StatusBadge>Manager role</StatusBadge></div>}
      <div className="kpi-grid"><KpiCard label="Active requirements" value="24" change="+12.5%" icon={BriefcaseBusiness} tone="blue" /><KpiCard label="Candidate submissions" value="42" change="+16.8%" icon={FileCheck2} tone="violet" /><KpiCard label="Interview conversion" value="38%" change="+6.2%" icon={Target} tone="green" /><KpiCard label="Avg. time to shortlist" value="4.2 days" change="↓ 0.8 days" icon={Timer} tone="amber" /></div>
      <div className="dashboard-grid"><Card className="pipeline-card"><div className="card-heading"><div><h2>Recruitment throughput</h2><p>Submitted candidates and interviews · {period.toLowerCase()}</p></div><button className="icon-button" onClick={() => navigate("/submissions")} aria-label="View submissions"><ArrowUpRight size={17} /></button></div><div className="chart-legend"><span><i className="legend-dot legend-blue" /> Submissions</span><span><i className="legend-dot legend-violet" /> Interviews</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 4" /><XAxis dataKey="week" axisLine={false} tickLine={false} dy={9} /><YAxis axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Area dataKey="submitted" name="submissions" stroke="#4779e4" strokeWidth={2.4} fill="#4779e41c" /><Area dataKey="interviews" name="interviews" stroke="#8c75df" strokeWidth={2.2} fill="#8c75df18" /></AreaChart></ResponsiveContainer></div></Card>
        <Card className="team-performance"><div className="card-heading"><div><h2>{manager ? "Team workload" : "Top-performing clients"}</h2><p>{manager ? "Active requirements by recruiter" : "By candidate submissions"}</p></div><button className="icon-button" aria-label="View all" onClick={() => navigate("/requirements")}><ArrowUpRight size={17} /></button></div>{(manager ? [["Ananya Rao", "8 roles", "lavender", "AR", 88], ["Arjun Mehta", "6 roles", "blue", "AM", 66], ["Rhea Kapoor", "5 roles", "mint", "RK", 52], ["Dev Malhotra", "3 roles", "peach", "DM", 37]] : [["Northstar Labs", "14 submissions", "lavender", "NL", 88], ["Orbit Systems", "11 submissions", "mint", "OS", 70], ["Meridian Health", "8 submissions", "peach", "MH", 52], ["Juniper Financial", "5 submissions", "blue", "JF", 36]]).map(([name, count, color, initials, progress]) => <div className="performance-row" key={name}><span className={`client-logo client-${color}`}>{initials}</span><span className="performance-info"><strong>{name}</strong><small>{count}</small><span className="mini-progress"><i style={{ width: `${progress}%` }} /></span></span></div>)}</Card></div>
      <div className="dashboard-grid analytics-bottom"><Card className="table-card"><div className="table-card-top"><div><h2>Requirements needing attention</h2><p>Open roles with a low candidate flow or upcoming target.</p></div><Link className="small-link" to="/requirements">View all <ArrowRight size={14} /></Link></div><DataTable columns={[{ key: "title" as const, label: "REQUIREMENT", render: (row: (typeof requirements)[number]) => <span className="table-main-link"><strong>{row.title}</strong><small>{row.id} · {row.client}</small></span> }, { key: "candidates" as const, label: "CANDIDATES" }, { key: "target" as const, label: "TARGET DATE" }, { key: "status" as const, label: "STATUS", render: (row: (typeof requirements)[number]) => <StatusBadge>{row.status}</StatusBadge> }]} rows={requirements.filter((item) => item.status === "Open").slice(0, 4)} rowKey="id" /></Card><Card className="insight-card"><span className="aside-tip-icon"><Lightbulb size={17} /></span><div className="eyebrow">TEAM INSIGHT</div><h3>Follow-ups are driving faster shortlists</h3><p>Roles with a same-day recruiter follow-up reached client submission 1.4 days sooner this month.</p><button onClick={() => navigate("/followups")}>Review follow-up queue <ArrowRight size={14} /></button><span className="insight-footnote">Based on synthetic workspace activity</span></Card></div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="toggle-row">
      <span><strong>{title}</strong><small>{description}</small></span>
      <button
        className={`toggle-button ${checked ? "toggle-on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  );
}

function SettingsPage({ admin = false }: { admin?: boolean }) {
  const [activeTab, setActiveTab] = useState(admin ? "Members" : "Workspace");
  const [toggles, setToggles] = useState({ followups: true, interviewReminders: true, weeklyDigest: false, anonymizeAnalytics: true });
  const { role, toast } = useAppContext();
  const isAdmin = admin || role === "Workspace Admin";
  const setToggle = (key: keyof typeof toggles) => setToggles((value) => ({ ...value, [key]: !value[key] }));
  const save = () => toast("Preferences saved locally", "This UI prototype does not update workspace settings in Supabase.", "info");
  return (
    <div className="page-stack"><PageHeader title={admin ? "Admin console" : "Workspace settings"} description={admin ? "Manage members, workspace access, and operational preferences." : "Make SEARCHY feel right for your team's day-to-day."} actions={<Button onClick={save} icon={<Check size={15} />}>Save changes</Button>} />
      <div className="settings-layout"><Card className="settings-nav"><div className="settings-workspace"><span className="workspace-logo">N</span><span><strong>Northstar Talent</strong><small>Workspace settings</small></span></div>{(isAdmin ? ["Members", "Workspace", "Notifications", "Security", "Audit log"] : ["Workspace", "Notifications", "Appearance", "Templates"]).map((item) => <button className={`settings-nav-item ${activeTab === item ? "settings-nav-active" : ""}`} key={item} onClick={() => setActiveTab(item)}>{item === "Members" ? <UsersRound size={15} /> : item === "Security" ? <ShieldCheck size={15} /> : item === "Audit log" ? <Activity size={15} /> : item === "Notifications" ? <Bell size={15} /> : <Settings2 size={15} />}{item}{item === "Members" && <span className="settings-count">8</span>}</button>)}</Card>
        <div className="settings-content"><Card className="settings-panel"><div className="settings-panel-heading"><h2>{activeTab}</h2><p>{activeTab === "Members" ? "Workspace members and their assigned access." : activeTab === "Notifications" ? "Choose which reminders appear in your workspace." : activeTab === "Security" ? "Workspace access controls and session preferences." : "Profile and workspace preferences for Northstar Talent."}</p></div>
          {activeTab === "Members" ? <div className="members-table">{[{ initials: "AR", name: "Ananya Rao", email: "ananya@northstartalent.in", role: "Recruitment Manager", color: "lavender" }, { initials: "AM", name: "Arjun Mehta", email: "arjun@northstartalent.in", role: "Recruiter", color: "blue" }, { initials: "RK", name: "Rhea Kapoor", email: "rhea@northstartalent.in", role: "Recruiter", color: "mint" }, { initials: "NS", name: "Nikhil Sethi", email: "nikhil@northstartalent.in", role: "Workspace Admin", color: "peach" }].map((member) => <div className="member-row" key={member.email}><Avatar initials={member.initials} color={member.color} /><span className="member-name"><strong>{member.name}</strong><small>{member.email}</small></span><StatusBadge>Available</StatusBadge><span className="member-role">{member.role}</span><Dropdown trigger={<button className="icon-button" aria-label={`Member options for ${member.name}`}><MoreHorizontal size={16} /></button>}><MenuItem onSelect={() => toast("Member access", "Role updates require connected workspace authorization.", "info")}>Edit role</MenuItem><MenuItem onSelect={() => toast("Member access", "Deactivation requires manager confirmation.", "info")}>Deactivate member</MenuItem></Dropdown></div>)}</div> :
          activeTab === "Notifications" ? <div className="settings-options">{[["followups", "Follow-up reminders", "Get notified when a task is due or overdue."], ["interviewReminders", "Interview reminders", "A reminder before scheduled candidate conversations."], ["weeklyDigest", "Weekly activity digest", "A summary of recruitment activity every Monday."], ["anonymizeAnalytics", "Privacy-aware analytics", "Keep candidate details out of aggregate reporting."]].map(([key, title, description]) => <ToggleRow key={key} title={title} description={description} checked={toggles[key as keyof typeof toggles]} onChange={() => setToggle(key as keyof typeof toggles)} />)}</div> :
          activeTab === "Security" ? <div className="security-settings"><div className="security-callout"><ShieldCheck size={18} /><span><strong>Multi-tenant isolation is enabled</strong><small>Workspace data is protected by PostgreSQL row-level security in the designed backend. This prototype is not authenticated.</small></span></div><div className="setting-item"><span><strong>Two-step verification</strong><small>Require MFA for workspace administrators.</small></span><StatusBadge>Planned</StatusBadge></div><div className="setting-item"><span><strong>Active sessions</strong><small>Sign out sessions for departed team members.</small></span><Button size="sm" variant="secondary" onClick={() => toast("Session controls", "Session revocation is not connected in this prototype.", "info")}>Review sessions</Button></div></div> :
          <div className="settings-form"><Field label="Workspace name"><TextInput defaultValue="Northstar Talent" /></Field><Field label="Workspace timezone"><SelectInput defaultValue="Asia/Kolkata"><option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option><option>UTC</option><option>Asia/Singapore</option></SelectInput></Field><Field label="Default candidate visibility"><SelectInput defaultValue="Assigned and shared"><option>Assigned and shared</option><option>Workspace-wide</option></SelectInput></Field><div className="settings-divider" /><div className="setting-item"><span><strong>Candidate retention</strong><small>Retention policy requires workspace approval before production use.</small></span><StatusBadge>Not configured</StatusBadge></div><div className="setting-item"><span><strong>Default evaluation rubric</strong><small>Use the role-specific rubric for structured interview feedback.</small></span><Button size="sm" variant="secondary" onClick={() => toast("Rubric settings", "Rubric management is available in Interview Intelligence.", "info")}>Manage</Button></div></div>}
        </Card><div className="settings-save-row"><span>Settings changes remain local in this demo.</span><Button onClick={save}>Save changes</Button></div></div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useAppContext();
  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email address and a password of at least 6 characters.");
      return;
    }
    setError("");
    toast("Welcome to the SEARCHY demo", "You are entering a synthetic workspace; no account was authenticated.", "info");
    navigate("/");
  };
  return (
    <div className="login-page"><div className="login-brand"><span className="brand-symbol"><Search size={18} strokeWidth={2.8} /></span><span className="brand-word">SEARCHY<span className="brand-period">.</span></span></div><div className="login-layout"><div className="login-pitch"><div className="login-pill"><span /> RECRUITMENT, IN SYNC</div><h1>Good people.<br /><span>Better process.</span></h1><p>Bring your requirements, candidates, and team together in one clear workspace.</p><div className="login-proof"><span><CheckCircle2 size={15} /> Your team's recruitment, organized</span><span><ShieldCheck size={15} /> Built with privacy at its core</span></div><div className="login-decoration"><div className="deco-orbit deco-one" /><div className="deco-orbit deco-two" /><div className="deco-center"><Search size={22} /></div><div className="deco-node deco-node-a"><UsersRound size={16} /></div><div className="deco-node deco-node-b"><BriefcaseBusiness size={16} /></div><div className="deco-node deco-node-c"><Sparkles size={16} /></div></div></div><Card className="login-card"><div className="login-card-heading"><span className="login-mark"><Search size={17} /></span><h2>Welcome back</h2><p>Sign in to your SEARCHY workspace</p></div><form onSubmit={handleLogin} className="login-form"><Field label="Work email"><TextInput type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label="Password"><TextInput type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>{error && <span className="field-error" role="alert">{error}</span>}<div className="login-options"><label><input type="checkbox" defaultChecked /> Remember me</label><button type="button" onClick={() => toast("Reset password", "Password reset is available once Supabase Auth is connected.", "info")}>Forgot password?</button></div><Button type="submit" className="login-submit">Sign in <ArrowRight size={15} /></Button></form><div className="login-divider"><span>or</span></div><button className="demo-login-button" onClick={() => { setEmail("ananya@northstartalent.in"); setPassword("searchydemo"); }}>Use demo credentials</button><p className="login-footnote">This interface is a prototype. Sign-in is simulated and does not authenticate or store your credentials.</p></Card></div><div className="login-footer"><span>© 2026 SEARCHY</span><span>Designed for recruitment teams</span><button onClick={() => toast("Privacy and security", "This prototype uses synthetic sample data only.", "info")}>Privacy & security</button></div></div>
  );
}

export function ProductPage() {
  const location = useLocation();
  const { role } = useAppContext();
  const path = location.pathname;
  const recruiterRoutes = ["/requirements", "/candidates", "/matching", "/submissions", "/interviews", "/followups", "/communications", "/interview-intelligence"];
  const adminOnlyRoutes = ["/analytics", "/settings"];
  if (role === "Workspace Admin" && recruiterRoutes.some((route) => path.startsWith(route))) {
    return <AccessRestrictedPage />;
  }
  if ((path === "/admin" && role !== "Workspace Admin")
    || (path === "/manager" && role !== "Recruitment Manager")
    || (adminOnlyRoutes.includes(path) && role === "Recruiter")) {
    return <AccessRestrictedPage />;
  }
  if (path === "/requirements") return <RequirementsPage />;
  if (path === "/requirements/new") return <RequirementFormPage />;
  if (/\/requirements\/[^/]+\/intelligence$/.test(path)) return <RecIntelligencePage />;
  if (/\/requirements\/[^/]+$/.test(path)) return <RequirementDetailsPage />;
  if (path === "/candidates") return <CandidateDatabasePage />;
  if (path === "/candidates/discover") return <CandidateDatabasePage discovery />;
  if (/\/candidates\/[^/]+$/.test(path)) return <CandidateProfilePage />;
  if (path === "/matching/compare") return <MatchingPage compare />;
  if (path === "/matching") return <MatchingPage />;
  if (path === "/submissions") return <SubmissionsPage />;
  if (path === "/interviews") return <InterviewsPage />;
  if (path === "/followups") return <FollowupsPage />;
  if (path === "/communications") return <CommunicationPage />;
  if (path === "/interview-intelligence/questions") return <InterviewIntelligencePage questions />;
  if (path === "/interview-intelligence/scorecard") return <InterviewIntelligencePage scorecard />;
  if (path === "/interview-intelligence") return <InterviewIntelligencePage />;
  if (path === "/analytics") return <AnalyticsPage />;
  if (path === "/manager") return <AnalyticsPage manager />;
  if (path === "/settings") return <SettingsPage />;
  if (path === "/admin") return <SettingsPage admin />;
  return <DashboardPage />;
}

function AccessRestrictedPage() {
  const navigate = useNavigate();
  return (
    <div className="page-stack">
      <PageHeader title="This area isn't available for your role" description="Workspace permissions determine which records and settings you can access." />
      <Card className="access-restricted">
        <span className="access-restricted-icon"><ShieldCheck size={20} /></span>
        <strong>Access is limited by workspace role</strong>
        <p>Switch to another demo role from your profile menu to preview the manager or workspace administrator experience. This prototype role switch is for interface review only.</p>
        <Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => navigate("/")}>Back to dashboard</Button>
      </Card>
    </div>
  );
}
