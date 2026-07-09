// ─── Case ────────────────────────────────────────────────────────────────────
export const mockCase = {
  name: "Doe v. Smith",
  caseNumber: "2024-FC-00847",
  court: "Family Court, County of Los Angeles",
  judge: "Hon. Patricia Williams",
  status: "Active",
};

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
export const mockMetrics = {
  totalEvidence: 1243,
  timelineEvents: 357,
  people: 18,
  nextHearing: { date: "May 14, 2025", time: "9:00 AM", location: "Dept. 32" },
};

// ─── Evidence Library ─────────────────────────────────────────────────────────
export type EvidenceItem = {
  id: number;
  title: string;
  date: string;
  category: string;
  fileType: string;
  size: string;
  tags: string[];
  exhibitNumber: string | null;
  status: "reviewed" | "pending" | "flagged";
  aiSummary: string;
  linkedEvents: number[];
  linkedPeople: number[];
};

export const mockEvidence: EvidenceItem[] = [
  {
    id: 1,
    title: "Police Report – April 15, 2025",
    date: "Apr 15, 2025",
    category: "Police",
    fileType: "PDF",
    size: "2.4 MB",
    tags: ["police", "custody violation", "incident"],
    exhibitNumber: "Exhibit 1",
    status: "reviewed",
    aiSummary: "AI detected possible pattern: Report documents a custody exchange that did not occur on April 15. Officer Martinez responded at 3:22 PM. Report #LA-2025-04-8821.",
    linkedEvents: [5],
    linkedPeople: [4],
  },
  {
    id: 2,
    title: "Text Messages – April 2025",
    date: "Apr 30, 2025",
    category: "Messages",
    fileType: "PDF",
    size: "1.1 MB",
    tags: ["texts", "unanswered", "communications"],
    exhibitNumber: "Exhibit 2",
    status: "reviewed",
    aiSummary: "AI detected possible pattern: 47 outbound messages sent Apr 15–28 with no documented response. Messages reference exchange schedule and child welfare.",
    linkedEvents: [4],
    linkedPeople: [2],
  },
  {
    id: 3,
    title: "School Records – Q3 2024–25",
    date: "Apr 22, 2025",
    category: "School",
    fileType: "PDF",
    size: "856 KB",
    tags: ["school", "attendance", "absences"],
    exhibitNumber: "Exhibit 3",
    status: "reviewed",
    aiSummary: "AI detected possible pattern: Official Lincoln Elementary records show 7 unexcused absences during respondent's custody periods, Jan–Apr 2025.",
    linkedEvents: [2, 7],
    linkedPeople: [5],
  },
  {
    id: 4,
    title: "Medical Records – Pediatric Q1",
    date: "Mar 20, 2025",
    category: "Medical",
    fileType: "PDF",
    size: "3.1 MB",
    tags: ["medical", "appointments", "pediatric"],
    exhibitNumber: "Exhibit 4",
    status: "pending",
    aiSummary: "AI detected possible pattern: Records from Children's Medical Group indicate 6 scheduled appointments not attended during respondent's parenting time, Oct 2024–Mar 2025.",
    linkedEvents: [3],
    linkedPeople: [3],
  },
  {
    id: 5,
    title: "Exchange Log – Q1 2025",
    date: "Mar 31, 2025",
    category: "Other",
    fileType: "XLSX",
    size: "422 KB",
    tags: ["exchange", "log", "schedule"],
    exhibitNumber: "Exhibit 6",
    status: "reviewed",
    aiSummary: "AI detected possible pattern: Spreadsheet documents 14 scheduled exchanges Jan–Mar 2025. 9 show no confirmation from respondent within 24 hours.",
    linkedEvents: [1, 8],
    linkedPeople: [2],
  },
  {
    id: 6,
    title: "Email Thread – Schedule Dispute Jan 2025",
    date: "Jan 18, 2025",
    category: "Messages",
    fileType: "PDF",
    size: "788 KB",
    tags: ["email", "schedule", "dispute"],
    exhibitNumber: null,
    status: "pending",
    aiSummary: "AI detected possible pattern: 12-message email thread regarding holiday schedule modification. Respondent's last reply Jan 5; subsequent 7 messages unanswered.",
    linkedEvents: [],
    linkedPeople: [2],
  },
  {
    id: 7,
    title: "Court Order – Temporary Custody",
    date: "Jan 15, 2025",
    category: "Court Orders",
    fileType: "PDF",
    size: "512 KB",
    tags: ["court order", "custody", "temporary"],
    exhibitNumber: "Exhibit 5",
    status: "reviewed",
    aiSummary: "AI detected possible pattern: Temporary order establishes primary physical custody with Petitioner and alternating weekend parenting time with Respondent.",
    linkedEvents: [6],
    linkedPeople: [6, 7],
  },
  {
    id: 8,
    title: "Photos – April 28 Exchange Location",
    date: "Apr 28, 2025",
    category: "Photos",
    fileType: "ZIP",
    size: "14.2 MB",
    tags: ["photos", "exchange", "evidence"],
    exhibitNumber: null,
    status: "flagged",
    aiSummary: "AI detected possible pattern: 23 photos timestamped 3:00–3:47 PM at Lincoln Elementary parking lot. No respondent vehicle visible in any image.",
    linkedEvents: [1],
    linkedPeople: [1],
  },
  {
    id: 9,
    title: "School Absence Notification – Apr 24",
    date: "Apr 24, 2025",
    category: "School",
    fileType: "PDF",
    size: "124 KB",
    tags: ["school", "absence", "notification"],
    exhibitNumber: null,
    status: "pending",
    aiSummary: "AI detected possible pattern: Official school notification of unexcused absence on April 24, 2025. Other parent not notified per parenting plan requirement.",
    linkedEvents: [2],
    linkedPeople: [5],
  },
  {
    id: 10,
    title: "Bank Records – Child Support Q1",
    date: "Apr 1, 2025",
    category: "Other",
    fileType: "PDF",
    size: "340 KB",
    tags: ["financial", "child support", "bank"],
    exhibitNumber: null,
    status: "pending",
    aiSummary: "AI detected possible pattern: Bank statements show child support payment of $1,200 due Feb 1 received Feb 19. March payment not reflected in records provided.",
    linkedEvents: [],
    linkedPeople: [2],
  },
];

// ─── Timeline Events ──────────────────────────────────────────────────────────
export type TimelineEvent = {
  id: number;
  date: string;
  shortDate: string;
  title: string;
  category: string;
  severity: "high" | "medium" | "low";
  description: string;
  evidenceIds: number[];
  peopleIds: number[];
  exhibitRefs: string[];
  flagged: boolean;
};

export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: 1,
    date: "Apr 28, 2025",
    shortDate: "Apr 28",
    title: "Missed Exchange",
    category: "Exchanges",
    severity: "high",
    description: "Scheduled custody exchange at 3:00 PM at Lincoln Elementary did not occur. Child was not present for pickup. Petitioner waited 47 minutes.",
    evidenceIds: [8],
    peopleIds: [1, 2],
    exhibitRefs: [],
    flagged: true,
  },
  {
    id: 2,
    date: "Apr 24, 2025",
    shortDate: "Apr 24",
    title: "School Absence – Unexcused",
    category: "School",
    severity: "medium",
    description: "Child absent from Lincoln Elementary, 3rd grade. No prior notification provided to other parent as required by parenting plan.",
    evidenceIds: [3, 9],
    peopleIds: [2, 5],
    exhibitRefs: ["Exhibit 3"],
    flagged: false,
  },
  {
    id: 3,
    date: "Apr 21, 2025",
    shortDate: "Apr 21",
    title: "Medical Appointment Missed",
    category: "Medical",
    severity: "medium",
    description: "Scheduled pediatrician appointment at Children's Medical Group not attended. Third missed appointment in 90 days.",
    evidenceIds: [4],
    peopleIds: [2, 3],
    exhibitRefs: ["Exhibit 4"],
    flagged: false,
  },
  {
    id: 4,
    date: "Apr 18, 2025",
    shortDate: "Apr 18",
    title: "Unanswered Message Thread",
    category: "Communications",
    severity: "low",
    description: "Series of 47 text messages sent Apr 15–18 regarding exchange schedule and child welfare. No response documented.",
    evidenceIds: [2],
    peopleIds: [1, 2],
    exhibitRefs: ["Exhibit 2"],
    flagged: false,
  },
  {
    id: 5,
    date: "Apr 15, 2025",
    shortDate: "Apr 15",
    title: "Police Report Filed",
    category: "Police",
    severity: "high",
    description: "Police report #LA-2025-04-8821 filed following custody exchange violation. Officer Martinez responded at 3:22 PM.",
    evidenceIds: [1],
    peopleIds: [1, 4],
    exhibitRefs: ["Exhibit 1"],
    flagged: true,
  },
  {
    id: 6,
    date: "Jan 15, 2025",
    shortDate: "Jan 15",
    title: "Court Order Issued",
    category: "Court Orders",
    severity: "high",
    description: "Family Court issued temporary custody orders. Primary physical custody to Petitioner; alternating weekends to Respondent.",
    evidenceIds: [7],
    peopleIds: [6, 7],
    exhibitRefs: ["Exhibit 5"],
    flagged: false,
  },
  {
    id: 7,
    date: "Feb 12, 2025",
    shortDate: "Feb 12",
    title: "School Absence – Unexcused",
    category: "School",
    severity: "medium",
    description: "Child absent from school on February 12 during respondent's parenting time. No communication to school or other parent.",
    evidenceIds: [3],
    peopleIds: [2, 5],
    exhibitRefs: ["Exhibit 3"],
    flagged: false,
  },
  {
    id: 8,
    date: "Mar 28, 2025",
    shortDate: "Mar 28",
    title: "Missed Exchange",
    category: "Exchanges",
    severity: "high",
    description: "Scheduled pickup at 6:00 PM at respondent's residence. Child not made available. No prior notice of inability to comply.",
    evidenceIds: [5],
    peopleIds: [1, 2],
    exhibitRefs: [],
    flagged: true,
  },
  {
    id: 9,
    date: "Mar 5, 2025",
    shortDate: "Mar 5",
    title: "Medical Appointment Missed",
    category: "Medical",
    severity: "medium",
    description: "Follow-up appointment at Children's Medical Group. Respondent did not transport child. No prior communication.",
    evidenceIds: [4],
    peopleIds: [2, 3],
    exhibitRefs: ["Exhibit 4"],
    flagged: false,
  },
  {
    id: 10,
    date: "Feb 19, 2025",
    shortDate: "Feb 19",
    title: "Late Child Support Payment",
    category: "Financial",
    severity: "low",
    description: "February child support payment of $1,200 due Feb 1 received Feb 19 — 18 days late.",
    evidenceIds: [10],
    peopleIds: [2],
    exhibitRefs: [],
    flagged: false,
  },
];

// ─── Pattern Insights ─────────────────────────────────────────────────────────
export const mockPatternInsights = [
  {
    id: 1,
    label: "Missed Exchanges",
    count: 14,
    color: "bg-red-500",
    chartColor: "#ef4444",
    trend: "up" as string,
    severity: "high" as const,
    dateRange: "Jan 2025 – Apr 2025",
    evidenceCount: 8,
    relatedPeople: ["Robert Smith"],
    riskLevel: "High",
    description: "AI detected possible pattern: Scheduled custody exchanges not completed during respondent's parenting time.",
    monthlyData: [2, 3, 4, 5],
  },
  {
    id: 2,
    label: "School Attendance Issues",
    count: 7,
    color: "bg-orange-500",
    chartColor: "#f97316",
    trend: "up" as string,
    severity: "medium" as const,
    dateRange: "Jan 2025 – Apr 2025",
    evidenceCount: 5,
    relatedPeople: ["Robert Smith", "Principal Adams"],
    riskLevel: "Medium",
    description: "AI detected possible pattern: Unexcused school absences occurring during respondent's designated parenting time.",
    monthlyData: [1, 2, 2, 2],
  },
  {
    id: 3,
    label: "Missed Medical Appointments",
    count: 6,
    color: "bg-yellow-500",
    chartColor: "#eab308",
    trend: "stable" as string,
    severity: "medium" as const,
    dateRange: "Oct 2024 – Apr 2025",
    evidenceCount: 3,
    relatedPeople: ["Robert Smith", "Dr. Sarah Chen"],
    riskLevel: "Medium",
    description: "AI detected possible pattern: Scheduled pediatric appointments not attended during respondent's parenting time.",
    monthlyData: [1, 1, 2, 2],
  },
  {
    id: 4,
    label: "Unanswered Messages",
    count: 31,
    color: "bg-purple-500",
    chartColor: "#a855f7",
    trend: "up" as const,
    severity: "high" as const,
    dateRange: "Jan 2025 – Apr 2025",
    evidenceCount: 4,
    relatedPeople: ["Robert Smith"],
    riskLevel: "High",
    description: "AI detected possible pattern: Co-parenting communications sent with no documented response within court-ordered 24-hour window.",
    monthlyData: [5, 7, 9, 10],
  },
  {
    id: 5,
    label: "Police Involvement",
    count: 3,
    color: "bg-blue-600",
    chartColor: "#2563eb",
    trend: "stable" as const,
    severity: "high" as const,
    dateRange: "Feb 2025 – Apr 2025",
    evidenceCount: 3,
    relatedPeople: ["Officer J. Martinez", "Robert Smith"],
    riskLevel: "High",
    description: "AI detected possible pattern: Law enforcement reports filed in connection with custody exchange violations.",
    monthlyData: [0, 1, 1, 1],
  },
  {
    id: 6,
    label: "Court Order Compliance Issues",
    count: 22,
    color: "bg-red-600",
    chartColor: "#dc2626",
    trend: "up" as const,
    severity: "high" as const,
    dateRange: "Jan 2025 – Apr 2025",
    evidenceCount: 9,
    relatedPeople: ["Robert Smith"],
    riskLevel: "High",
    description: "AI detected possible pattern: Actions potentially inconsistent with terms of the January 15, 2025 temporary custody order.",
    monthlyData: [3, 5, 7, 7],
  },
];

// ─── People ───────────────────────────────────────────────────────────────────
export const mockPeople = [
  { id: 1, name: "Jane Doe", role: "Petitioner", relationship: "Self", phone: "(310) 555-0101" },
  { id: 2, name: "Robert Smith", role: "Respondent", relationship: "Co-parent", phone: "(310) 555-0198" },
  { id: 3, name: "Dr. Sarah Chen", role: "Witness", relationship: "Pediatrician", phone: "(310) 555-0142" },
  { id: 4, name: "Officer J. Martinez", role: "Witness", relationship: "LAPD", phone: "(310) 555-0177" },
  { id: 5, name: "Principal Adams", role: "Witness", relationship: "School Admin", phone: "(310) 555-0163" },
  { id: 6, name: "Hon. Patricia Williams", role: "Judge", relationship: "Family Court Judge", phone: "" },
  { id: 7, name: "Atty. Marcus Webb", role: "Attorney", relationship: "Petitioner Counsel", phone: "(310) 555-0122" },
  { id: 8, name: "Ms. Linda Torres", role: "Witness", relationship: "Neighbor / Witness", phone: "(310) 555-0189" },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const mockTasks = [
  { id: 1, title: "Subpoena school attendance records", due: "May 5, 2025", priority: "high", status: "pending" },
  { id: 2, title: "Request police report supplemental", due: "May 7, 2025", priority: "high", status: "pending" },
  { id: 3, title: "Compile communication log April", due: "May 10, 2025", priority: "medium", status: "in-progress" },
  { id: 4, title: "Review medical records Q1", due: "May 12, 2025", priority: "low", status: "pending" },
  { id: 5, title: "Organize hearing notebook for May 14", due: "May 13, 2025", priority: "high", status: "pending" },
  { id: 6, title: "Verify exhibit numbers with attorney", due: "May 8, 2025", priority: "medium", status: "pending" },
  { id: 7, title: "Download court docket updates", due: "Apr 30, 2025", priority: "low", status: "done" },
];

// ─── Hearing Types ────────────────────────────────────────────────────────────
export const hearingTypes = [
  "Status Conference",
  "Motion Hearing",
  "Evidentiary Hearing",
  "Trial",
  "Order to Show Cause",
  "Custody Evaluation Review",
];

// ─── Legal Disclaimer ─────────────────────────────────────────────────────────
export const LEGAL_DISCLAIMER =
  "Evidence OS helps organize information and documents. It does not provide legal advice, legal representation, or predictions about court outcomes. Review all information for accuracy before using it.";
