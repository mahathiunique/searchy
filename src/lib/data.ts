import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  FileCheck2,
  FileQuestion,
  FolderKanban,
  Gauge,
  Mail,
  Settings2,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type DemoRole = "Recruiter" | "Recruitment Manager" | "Workspace Admin";

export type NavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: DemoRole[];
};

export const navigation: NavigationItem[] = [
  { label: "Dashboard", path: "/", icon: Gauge, roles: ["Recruiter", "Recruitment Manager", "Workspace Admin"] },
  { label: "Requirements", path: "/requirements", icon: BriefcaseBusiness, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "Candidates", path: "/candidates", icon: UsersRound, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "AI Matching", path: "/matching", icon: Sparkles, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "Submissions", path: "/submissions", icon: FileCheck2, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "Interviews", path: "/interviews", icon: CalendarDays, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "Follow-ups", path: "/followups", icon: CheckSquare, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "Communication", path: "/communications", icon: Mail, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "Interview Intelligence", path: "/interview-intelligence", icon: FileQuestion, roles: ["Recruiter", "Recruitment Manager"] },
  { label: "Analytics", path: "/analytics", icon: BarChart3, roles: ["Recruitment Manager", "Workspace Admin"] },
  { label: "Settings", path: "/settings", icon: Settings2, roles: ["Recruitment Manager", "Workspace Admin"] },
  { label: "Admin console", path: "/admin", icon: FolderKanban, roles: ["Workspace Admin"] },
];

export type Requirement = {
  id: string;
  title: string;
  client: string;
  location: string;
  status: "Open" | "Paused" | "Draft" | "Closed";
  owner: string;
  candidates: number;
  submitted: number;
  target: string;
  initials: string;
  color: string;
};

export const requirements: Requirement[] = [
  { id: "REC-2048", title: "Senior Product Designer", client: "Northstar Labs", location: "Bengaluru", status: "Open", owner: "Ananya Rao", candidates: 18, submitted: 4, target: "Nov 18, 2026", initials: "NL", color: "lavender" },
  { id: "REC-2047", title: "Engineering Manager", client: "Orbit Systems", location: "Remote · India", status: "Open", owner: "Arjun Mehta", candidates: 12, submitted: 3, target: "Nov 21, 2026", initials: "OS", color: "mint" },
  { id: "REC-2045", title: "Data Platform Engineer", client: "Meridian Health", location: "Hyderabad", status: "Open", owner: "Ananya Rao", candidates: 9, submitted: 2, target: "Nov 24, 2026", initials: "MH", color: "peach" },
  { id: "REC-2042", title: "Senior UX Researcher", client: "Northstar Labs", location: "Bengaluru", status: "Paused", owner: "Rhea Kapoor", candidates: 7, submitted: 2, target: "Nov 26, 2026", initials: "NL", color: "lavender" },
  { id: "REC-2039", title: "Staff Backend Engineer", client: "Juniper Financial", location: "Pune", status: "Open", owner: "Arjun Mehta", candidates: 15, submitted: 5, target: "Dec 02, 2026", initials: "JF", color: "blue" },
  { id: "REC-2036", title: "People Operations Lead", client: "Orbit Systems", location: "Mumbai", status: "Draft", owner: "Rhea Kapoor", candidates: 0, submitted: 0, target: "Dec 08, 2026", initials: "OS", color: "mint" },
];

export const candidates = [
  { id: "CAN-1194", name: "Mira Shah", title: "Product Designer", experience: "8 yrs", location: "Bengaluru", skills: ["Figma", "Design systems", "Research"], status: "Available", initials: "MS", color: "rose", match: 94, reviewedResume: true },
  { id: "CAN-1188", name: "Kabir Nair", title: "Engineering Manager", experience: "11 yrs", location: "Pune", skills: ["Platform", "AWS", "Leadership"], status: "In process", initials: "KN", color: "mint", match: 91, reviewedResume: true },
  { id: "CAN-1179", name: "Tara Iyer", title: "Data Engineer", experience: "6 yrs", location: "Hyderabad", skills: ["Python", "Spark", "SQL"], status: "Available", initials: "TI", color: "lavender", match: 88, reviewedResume: false },
  { id: "CAN-1162", name: "Dev Malhotra", title: "Product Designer", experience: "7 yrs", location: "Delhi NCR", skills: ["Figma", "Prototyping", "SaaS"], status: "Interviewing", initials: "DM", color: "peach", match: 84, reviewedResume: true },
  { id: "CAN-1148", name: "Nisha Rao", title: "Backend Engineer", experience: "9 yrs", location: "Chennai", skills: ["Go", "PostgreSQL", "Cloud"], status: "Available", initials: "NR", color: "blue", match: 82, reviewedResume: false },
];

export const activity = [
  { name: "Mira Shah", action: "was submitted to", target: "Senior Product Designer", time: "12 min ago", initials: "MS", color: "rose", icon: FileCheck2 },
  { name: "Arjun Mehta", action: "scheduled an interview for", target: "Kabir Nair", time: "48 min ago", initials: "AM", color: "blue", icon: CalendarDays },
  { name: "You", action: "added 3 candidates to", target: "Data Platform Engineer", time: "2 hours ago", initials: "AR", color: "lavender", icon: UsersRound },
  { name: "Rhea Kapoor", action: "updated the brief for", target: "Senior UX Researcher", time: "Yesterday", initials: "RK", color: "mint", icon: Activity },
];

export const interviews = [
  { time: "10:30 AM", name: "Mira Shah", role: "Senior Product Designer", type: "Portfolio review", initials: "MS", color: "rose", host: "Ananya Rao" },
  { time: "12:00 PM", name: "Kabir Nair", role: "Engineering Manager", type: "Hiring manager", initials: "KN", color: "mint", host: "Arjun Mehta" },
  { time: "02:30 PM", name: "Tara Iyer", role: "Data Platform Engineer", type: "Technical round", initials: "TI", color: "lavender", host: "Ananya Rao" },
];

export const submissions = [
  { candidate: "Mira Shah", initials: "MS", color: "rose", requirement: "Senior Product Designer", client: "Northstar Labs", submitted: "Nov 4, 2026", status: "Pending review", owner: "Ananya Rao" },
  { candidate: "Kabir Nair", initials: "KN", color: "mint", requirement: "Engineering Manager", client: "Orbit Systems", submitted: "Nov 3, 2026", status: "Approved", owner: "Arjun Mehta" },
  { candidate: "Dev Malhotra", initials: "DM", color: "peach", requirement: "Senior Product Designer", client: "Northstar Labs", submitted: "Nov 2, 2026", status: "Client interview", owner: "Ananya Rao" },
  { candidate: "Tara Iyer", initials: "TI", color: "lavender", requirement: "Data Platform Engineer", client: "Meridian Health", submitted: "Nov 1, 2026", status: "Returned", owner: "Rhea Kapoor" },
];

export const followups = [
  { title: "Collect portfolio feedback", linked: "Mira Shah · Senior Product Designer", due: "Today, 11:00 AM", priority: "High", owner: "Ananya Rao" },
  { title: "Confirm interview availability", linked: "Kabir Nair · Engineering Manager", due: "Today, 02:00 PM", priority: "Normal", owner: "Arjun Mehta" },
  { title: "Share updated role brief", linked: "REC-2045 · Data Platform Engineer", due: "Tomorrow, 10:00 AM", priority: "Normal", owner: "Ananya Rao" },
  { title: "Request notice period details", linked: "Nisha Rao · Staff Backend Engineer", due: "Nov 8, 2026", priority: "Low", owner: "Rhea Kapoor" },
];

export const chartData = [
  { week: "Oct 05", submitted: 8, interviews: 5 },
  { week: "Oct 12", submitted: 12, interviews: 7 },
  { week: "Oct 19", submitted: 10, interviews: 9 },
  { week: "Oct 26", submitted: 16, interviews: 11 },
  { week: "Nov 02", submitted: 14, interviews: 13 },
];

export const shortDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
}).format(new Date());
