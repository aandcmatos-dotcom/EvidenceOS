export const mockCase = {
  name: "Doe v. Smith",
  caseNumber: "2024-FC-00847",
  court: "Family Court, County of Los Angeles",
  judge: "Hon. Patricia Williams",
  status: "Active",
};

export const mockMetrics = {
  totalEvidence: 1243,
  timelineEvents: 357,
  people: 18,
  nextHearing: {
    date: "May 14, 2025",
    time: "9:00 AM",
    location: "Dept. 32",
  },
};

export const mockPatternInsights = [
  {
    id: 1,
    label: "Missed Exchanges",
    count: 14,
    color: "bg-red-500",
    trend: "up",
    severity: "high",
  },
  {
    id: 2,
    label: "School Absences",
    count: 7,
    color: "bg-orange-500",
    trend: "up",
    severity: "medium",
  },
  {
    id: 3,
    label: "Medical Appointments Missed",
    count: 6,
    color: "bg-yellow-500",
    trend: "stable",
    severity: "medium",
  },
  {
    id: 4,
    label: "Unresponded Messages",
    count: 31,
    color: "bg-purple-500",
    trend: "up",
    severity: "high",
  },
];

export const mockRecentEvidence = [
  {
    id: 1,
    name: "Police Report – 04.15.25.pdf",
    type: "PDF",
    category: "Law Enforcement",
    date: "Apr 15, 2025",
    size: "2.4 MB",
    tags: ["police", "incident"],
  },
  {
    id: 2,
    name: "Text Messages – Apr 2025.pdf",
    type: "PDF",
    category: "Communications",
    date: "Apr 30, 2025",
    size: "1.1 MB",
    tags: ["texts", "communications"],
  },
  {
    id: 3,
    name: "School Records – Q3.pdf",
    type: "PDF",
    category: "Education",
    date: "Apr 22, 2025",
    size: "856 KB",
    tags: ["school", "education"],
  },
];

export const mockTimelineEvents = [
  {
    id: 1,
    date: "Apr 28, 2025",
    shortDate: "Apr 28",
    title: "Missed Exchange",
    description: "Scheduled custody exchange at 3:00 PM did not occur. Minor child was not returned.",
    category: "Exchange",
    severity: "high",
    evidenceCount: 3,
  },
  {
    id: 2,
    date: "Apr 24, 2025",
    shortDate: "Apr 24",
    title: "School Absence",
    description: "Child absent from Lincoln Elementary, 3rd grade. No prior notification provided.",
    category: "Education",
    severity: "medium",
    evidenceCount: 2,
  },
  {
    id: 3,
    date: "Apr 21, 2025",
    shortDate: "Apr 21",
    title: "Medical Appointment Missed",
    description: "Scheduled pediatrician appointment at Children's Medical Group not attended.",
    category: "Medical",
    severity: "medium",
    evidenceCount: 1,
  },
  {
    id: 4,
    date: "Apr 18, 2025",
    shortDate: "Apr 18",
    title: "Text Message Conversation",
    description: "Series of 47 text messages sent regarding schedule modification. No response received.",
    category: "Communications",
    severity: "low",
    evidenceCount: 1,
  },
  {
    id: 5,
    date: "Apr 15, 2025",
    shortDate: "Apr 15",
    title: "Police Report Filed",
    description: "Police report #LA-2025-04-8821 filed following custody violation. Officer Martinez responded.",
    category: "Law Enforcement",
    severity: "high",
    evidenceCount: 2,
  },
];

export const mockTasks = [
  {
    id: 1,
    title: "Subpoena school attendance records",
    due: "May 5, 2025",
    priority: "high",
    status: "pending",
  },
  {
    id: 2,
    title: "Request police report supplemental",
    due: "May 7, 2025",
    priority: "high",
    status: "pending",
  },
  {
    id: 3,
    title: "Compile communication log April",
    due: "May 10, 2025",
    priority: "medium",
    status: "in-progress",
  },
  {
    id: 4,
    title: "Review medical records Q1",
    due: "May 12, 2025",
    priority: "low",
    status: "pending",
  },
];

export const mockPeople = [
  { id: 1, name: "Jane Doe", role: "Petitioner", relationship: "Self", phone: "(310) 555-0101" },
  { id: 2, name: "Robert Smith", role: "Respondent", relationship: "Co-parent", phone: "(310) 555-0198" },
  { id: 3, name: "Dr. Sarah Chen", role: "Witness", relationship: "Pediatrician", phone: "(310) 555-0142" },
  { id: 4, name: "Officer J. Martinez", role: "Witness", relationship: "LAPD", phone: "(310) 555-0177" },
  { id: 5, name: "Principal Adams", role: "Witness", relationship: "School Admin", phone: "(310) 555-0163" },
];

export const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/timeline", label: "Timeline", icon: "Clock" },
  { href: "/evidence", label: "Evidence Library", icon: "FolderOpen" },
  { href: "/exhibits", label: "Exhibits", icon: "BookMarked" },
  { href: "/people", label: "People", icon: "Users" },
  { href: "/communications", label: "Communications", icon: "MessageSquare" },
  { href: "/calendar", label: "Calendar", icon: "CalendarDays" },
  { href: "/tasks", label: "Tasks", icon: "CheckSquare" },
  { href: "/court-orders", label: "Court Orders", icon: "Scale" },
  { href: "/hearing-notebook", label: "Hearing Notebook", icon: "BookOpen" },
  { href: "/reports", label: "Reports", icon: "BarChart3" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];
