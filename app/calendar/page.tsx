import AppLayout from "@/components/AppLayout";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const events = [
  { day: 5, title: "School Absence", color: "bg-orange-400", type: "Education" },
  { day: 10, title: "Court Order Issued", color: "bg-blue-500", type: "Court" },
  { day: 14, title: "HEARING 9:00 AM", color: "bg-purple-600", type: "Hearing" },
  { day: 15, title: "Police Report Filed", color: "bg-blue-600", type: "Law Enforcement" },
  { day: 18, title: "Text Thread", color: "bg-purple-400", type: "Communications" },
  { day: 21, title: "Medical Apt Missed", color: "bg-yellow-500", type: "Medical" },
  { day: 24, title: "School Absence", color: "bg-orange-400", type: "Education" },
  { day: 28, title: "Missed Exchange", color: "bg-red-500", type: "Exchange" },
];

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const startDay = 2; // May 2025 starts on Thursday (index 4 → offset)
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const getEventsForDay = (day: number) => events.filter((e) => e.day === day);
  const offset = 3; // May 1, 2025 is Thursday

  return (
    <AppLayout title="Calendar">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-gray-900">May 2025</h2>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={18} /></button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Add Event
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {dayNames.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-50 bg-gray-50/30" />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isHearing = day === 14;
            return (
              <div
                key={day}
                className={cn(
                  "min-h-[100px] border-b border-r border-gray-50 p-2 cursor-pointer hover:bg-gray-50/50 transition-colors",
                  isHearing && "bg-purple-50/40"
                )}
              >
                <span className={cn(
                  "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                  isHearing ? "bg-purple-600 text-white" : "text-gray-700"
                )}>
                  {day}
                </span>
                <div className="space-y-0.5">
                  {dayEvents.map((event, i) => (
                    <div key={i} className={`text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md ${event.color} truncate`}>
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
