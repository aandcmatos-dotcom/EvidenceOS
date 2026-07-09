import AppLayout from "@/components/AppLayout";
import { mockPeople } from "@/lib/mock-data";
import { Plus, Phone, Mail, FileText } from "lucide-react";

const roleColors: Record<string, string> = {
  Petitioner: "bg-purple-100 text-purple-700",
  Respondent: "bg-red-100 text-red-700",
  Witness: "bg-blue-100 text-blue-700",
  Attorney: "bg-green-100 text-green-700",
};

const allPeople = [
  ...mockPeople,
  { id: 6, name: "Hon. Patricia Williams", role: "Judge", relationship: "Family Court Judge", phone: "" },
  { id: 7, name: "Atty. Marcus Webb", role: "Attorney", relationship: "Petitioner Counsel", phone: "(310) 555-0122" },
  { id: 8, name: "Ms. Linda Torres", role: "Witness", relationship: "Neighbor / Witness", phone: "(310) 555-0189" },
];

export default function PeoplePage() {
  return (
    <AppLayout title="People">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{allPeople.length} people in this case</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Add Person
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {allPeople.map((person) => (
          <div key={person.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{person.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[person.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {person.role}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">{person.relationship}</p>
            {person.phone && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Phone size={12} />
                {person.phone}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
              <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors">
                <FileText size={12} /> View Files
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
