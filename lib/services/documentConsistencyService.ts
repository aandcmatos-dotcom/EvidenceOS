// Cross-document consistency engine (spec §17). Purely comparative: extracts key
// fields from each document in a package and flags disagreement between documents
// (or between a document and the case record). It NEVER decides which value is
// correct — findings are surfaced for user resolution.

import type { ConsistencyFinding } from "@/lib/court-actions/types";

export interface PackageDocument {
  name: string;
  text: string;
}

export interface CaseRecordFields {
  caseNumber?: string | null;
  petitioner?: string | null;
  respondent?: string | null;
  judge?: string | null;
  courtName?: string | null;
}

interface Extractor {
  field: string;
  extract: (text: string) => string | null;
}

const EXTRACTORS: Extractor[] = [
  {
    field: "Case number",
    extract: (t) => t.match(/case\s+(?:no\.?|number)[:\s]*([A-Z0-9][A-Z0-9-]{4,20})/i)?.[1] ?? null,
  },
  {
    field: "Hearing date",
    extract: (t) => t.match(/hearing\s+(?:date|on|set for|scheduled for)[:\s]*((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})/i)?.[1] ?? null,
  },
  {
    field: "Judge",
    extract: (t) => t.match(/(?:honorable|hon\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/)?.[1] ?? null,
  },
  {
    field: "Requested relief",
    extract: (t) => t.match(/(?:requests?|asks?)\s+(?:that\s+)?the\s+court\s+(?:to\s+)?(?:enter|order|grant|consider)\s+([^.]{10,140})/i)?.[1]?.trim() ?? null,
  },
];

function normalize(v: string): string {
  return v.toLowerCase().replace(/\s+/g, " ").replace(/[.,;]$/, "").trim();
}

let counter = 0;
const fid = () => `ccf-${++counter}`;

export function checkPackageConsistency(
  documents: PackageDocument[],
  caseRecord?: CaseRecordFields,
): ConsistencyFinding[] {
  counter = 0;
  const findings: ConsistencyFinding[] = [];

  for (const ex of EXTRACTORS) {
    const values = documents
      .map((d) => ({ document: d.name, value: ex.extract(d.text) }))
      .filter((v): v is { document: string; value: string } => v.value !== null);

    if (values.length < 2) {
      // still compare a single extracted value against the case record
      if (values.length === 1 && caseRecord) {
        const recordValue = recordValueFor(ex.field, caseRecord);
        if (recordValue && normalize(values[0].value) !== normalize(recordValue)) {
          findings.push({
            id: fid(), field: ex.field,
            values: [values[0], { document: "Case record", value: recordValue }],
            note: `${ex.field} in "${values[0].document}" differs from the case record. Review both and confirm which is correct — the system does not choose.`,
          });
        }
      }
      continue;
    }

    const distinct = new Set(values.map((v) => normalize(v.value)));
    if (distinct.size > 1) {
      findings.push({
        id: fid(), field: ex.field, values,
        note: `Documents in this package state different values for ${ex.field.toLowerCase()}. Review each and make them match — the system flags the difference but does not pick a value.`,
      });
    } else if (caseRecord) {
      const recordValue = recordValueFor(ex.field, caseRecord);
      if (recordValue && normalize(values[0].value) !== normalize(recordValue)) {
        findings.push({
          id: fid(), field: ex.field,
          values: [...values, { document: "Case record", value: recordValue }],
          note: `${ex.field} is consistent across documents but differs from the case record. Confirm which is correct.`,
        });
      }
    }
  }

  return findings;
}

function recordValueFor(field: string, record: CaseRecordFields): string | null {
  switch (field) {
    case "Case number": return record.caseNumber ?? null;
    case "Judge": return record.judge ?? null;
    default: return null;
  }
}
