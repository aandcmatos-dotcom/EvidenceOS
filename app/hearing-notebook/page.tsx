import { redirect } from "next/navigation";

// The Hearing Notebook has been superseded by Hearing Preparation, which drives
// hearing-type-aware worksheets and checklists from the same approved fact set.
export default function HearingNotebookPage() {
  redirect("/hearing-preparation");
}
