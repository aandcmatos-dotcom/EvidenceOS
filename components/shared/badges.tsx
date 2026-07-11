import { cn } from "@/lib/utils";
import {
  SUPPORT_STATUS_LABEL, type SupportStatus,
} from "@/lib/documents/types";
import {
  VERIFICATION_LABEL, type VerificationStatus, type SourceTier,
} from "@/lib/references/types";
import { SEVERITY_LABEL, type Severity } from "@/lib/review/types";

const supportStyles: Record<SupportStatus, string> = {
  supported: "bg-green-100 text-green-700",
  partially_supported: "bg-yellow-100 text-yellow-700",
  user_entered: "bg-blue-100 text-blue-700",
  needs_verification: "bg-orange-100 text-orange-700",
  no_source: "bg-red-100 text-red-700",
};

export function SupportBadge({ status }: { status: SupportStatus }) {
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", supportStyles[status])}>
      {SUPPORT_STATUS_LABEL[status]}
    </span>
  );
}

const verificationStyles: Record<VerificationStatus, string> = {
  verified_official: "bg-green-100 text-green-700 border-green-200",
  user_uploaded: "bg-blue-100 text-blue-700 border-blue-200",
  needs_verification: "bg-orange-100 text-orange-700 border-orange-200",
  possibly_outdated: "bg-yellow-100 text-yellow-700 border-yellow-200",
  superseded: "bg-gray-200 text-gray-600 border-gray-300",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", verificationStyles[status])}>
      {VERIFICATION_LABEL[status]}
    </span>
  );
}

export function SourceTierBadge({ tier }: { tier: SourceTier }) {
  if (tier === "official") {
    return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">Official source</span>;
  }
  return <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">Secondary source — not an official rule</span>;
}

const severityStyles: Record<Severity, string> = {
  information: "bg-blue-100 text-blue-700",
  review: "bg-yellow-100 text-yellow-700",
  important: "bg-orange-100 text-orange-700",
  critical_verification: "bg-red-100 text-red-700",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", severityStyles[severity])}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
