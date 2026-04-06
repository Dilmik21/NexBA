import { useState, useEffect } from "react";
import { FileText, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function ClientOverviewCards() {
  const [stats, setStats] = useState({
    totalActive: 0,
    pendingApprovals: 0,
    inAnalysis: 0,
    clarificationsNeeded: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchOverviewStats(user.uid, true);
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchOverviewStats = async (uid, showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/client/overview-stats?uid=${uid}`);
      const data = await response.json();
      if (data.success && data.stats) {
        setStats({
          totalActive: data.stats.totalActive || 0,
          pendingApprovals: data.stats.pendingApprovals || 0,
          inAnalysis: data.stats.inAnalysis || 0,
          clarificationsNeeded: data.stats.clarificationsNeeded || 0
        });
      }
    } catch (error) {
      console.error("Failed to load overview stats:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

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
      title: "Analysis",
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
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6 mt-2 md:mt-0">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between min-h-[130px] md:h-48 transition-transform hover:-translate-y-1 duration-300"
        >
          <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 ${card.bgColor} ${card.color}`}>
            <card.icon className="w-5 h-5 md:w-7 md:h-7" strokeWidth={2} />
          </div>
          
          <div className="mt-3 md:mt-4">
            <h3 className="text-2xl md:text-4xl font-bold text-navy leading-none">
              {isLoading ? "-" : card.value}
            </h3>
            <p className="text-gray-500 text-[11px] md:text-sm font-medium mt-1 md:mt-1.5 leading-snug">{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}