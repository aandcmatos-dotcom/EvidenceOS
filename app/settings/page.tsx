import AppLayout from "@/components/AppLayout";
import { User, Bell, Shield, Database, CreditCard, ChevronRight } from "lucide-react";

const settingsSections = [
  { icon: User, label: "Profile", description: "Name, email, and account information", color: "text-purple-600 bg-purple-50" },
  { icon: Bell, label: "Notifications", description: "Hearing reminders, task alerts, and updates", color: "text-blue-600 bg-blue-50" },
  { icon: Shield, label: "Privacy & Security", description: "Password, 2FA, and data visibility", color: "text-green-600 bg-green-50" },
  { icon: Database, label: "Case Management", description: "Manage cases, import data, and backups", color: "text-orange-600 bg-orange-50" },
  { icon: CreditCard, label: "Billing & Plan", description: "Subscription, usage, and payment methods", color: "text-indigo-600 bg-indigo-50" },
];

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold">
              JD
            </div>
            <div>
              <p className="font-bold text-gray-900">Jane Doe</p>
              <p className="text-sm text-gray-500">jane.doe@email.com</p>
              <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-medium mt-1 inline-block">Free Plan</span>
            </div>
            <button className="ml-auto px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Settings list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {settingsSections.map(({ icon: Icon, label, description, color }) => (
              <button key={label} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors text-left group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{description}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Legal Disclaimer:</strong> Evidence OS is an organizational tool only. It does not provide legal advice, does not constitute an attorney-client relationship, and should not be used as a substitute for consulting a licensed attorney. All information entered is user-provided.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
