import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import DisclaimerAckModal from "./shared/DisclaimerAckModal";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  caseName?: string;
}

export default function AppLayout({ children, title, caseName }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DisclaimerAckModal />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} caseName={caseName} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
