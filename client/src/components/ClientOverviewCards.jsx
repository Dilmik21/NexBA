import { useState, useEffect } from "react";
import { FileText, CheckCircle2, Clock, MessageSquare } from "lucide-react";

export default function ClientOverviewCards() {
  // 1. State to hold the data from our backend
  const [stats, setStats] = useState({
    totalActive: 0,
    pendingApprovals: 0,
    inAnalysis: 0,
    clarificationsNeeded: 0
  });

  // 2. Full-Stack Logic: Fetch the data when the component loads
  useEffect(() => {
    const fetchOverviewStats = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/client/overview-stats");
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to load overview stats:", error);
      }
    };
    fetchOverviewStats();
  }, []);

  // 3. Configuration array to easily map out the 4 cards matching your UI colors
  const cards = [
    {
      title: "Total Active",
      value: stats.totalActive,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    {
      title: "In Analysis",
      value: stats.inAnalysis,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Clarifications Needed",
      value: stats.clarificationsNeeded,
      icon: MessageSquare,
      color: "text-red-500",
      bgColor: "bg-red-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between h-48 transition-transform hover:-translate-y-1 duration-300"
        >
          {/* Icon Box */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.bgColor} ${card.color}`}>
            <card.icon className="w-7 h-7" strokeWidth={2} />
          </div>
          
          {/* Numbers and Title */}
          <div className="mt-4">
            <h3 className="text-4xl font-bold text-navy">{card.value}</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}