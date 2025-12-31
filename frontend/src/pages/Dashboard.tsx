import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { Phone, Clock, AlertTriangle, Users, Ambulance, Activity, Headphones } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import CallVolumeChart from '../components/dashboard/CallVolumeChart';
import CallPriorityChart from '../components/dashboard/CallPriorityChart';
// Remove mock data import for active calls, keep stats/charts if still needed
import { mockDashboardStats, weeklyCallVolumeData, priorityDistributionData } from '../data/mockData';


interface ActiveCall {
  id: string; 
  callerName?: string; 
  callerNumber?: string;
  location?: string;
  callType?: string;
  priority?: string; 
  durationSeconds: number;
  status?: string;
 
}

const Dashboard: React.FC = () => {
  // --- State for active calls ---
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [error, setError] = useState<string | null>(null); 

  // Format time in minutes and seconds
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0m 0s'; 
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };


useEffect(() => {
  const fetchActiveCalls = async () => {
    const apiUrl = 'http://192.168.31.30:8000/api/active-calls'; // Assuming stt_translate runs on port 8000

    try {
      // Set loading true right before the fetch attempt
      setIsLoading(true);
      // Reset error from previous attempts before this new attempt
      setError(null);
      console.log(`Workspaceing active calls from: ${apiUrl}`); // Log the URL being fetched

      const response = await fetch(apiUrl);

      if (!response.ok) {
        // Try to get more error info from the response if possible
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json(); // Try parsing JSON error from FastAPI
          errorDetail = errorData.detail || errorDetail; // Use FastAPI's detail if available
        } catch (jsonError) {
          // If response wasn't JSON, try getting text
          try {
              const textError = await response.text();
              errorDetail += ` - ${textError.substring(0, 100)}`; // Append first 100 chars of text response
          } catch(textErr){
               // Ignore if reading text fails too
          }
        }
        console.error("Fetch error:", errorDetail); // Log the detailed error
        throw new Error(errorDetail); // Throw the detailed error
      }

      const data: ActiveCall[] = await response.json();
      console.log(`Workspaceed ${data.length} active calls.`); // Log success and count
      setActiveCalls(data);
    } catch (e: any) {
      console.error("Failed to fetch active calls:", e);
      // Set the error state with the message from the caught error
      setError(e.message || "Failed to load active calls. Check connection or server logs.");
    } finally {
      setIsLoading(false); // Stop loading regardless of outcome
    }
  };

  fetchActiveCalls(); // Fetch immediately on mount

  // Optional: Set up an interval to refresh data periodically
  const intervalId = setInterval(fetchActiveCalls, 30000); // Refresh every 30 seconds

  // Cleanup function to clear the interval when the component unmounts
  return () => clearInterval(intervalId);

}, []); 
  const getPriorityClass = (priority?: string): string => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-danger text-white'; // Match your CSS or use Tailwind directly
      case 'high': return 'bg-warning text-black';
      case 'medium': return 'bg-info text-white';
      default: return 'bg-secondary-600 text-secondary-100'; // Default style
    }
  };
    const getTypeClass = (type?: string): string => {
        switch (type?.toLowerCase()) {
        case 'medical emergency':
        case 'medical':
            return 'badge-danger'; // Use your defined badge classes
        case 'fire department':
        case 'fire':
            return 'badge-danger'; // Or a specific fire color
        case 'police':
            return 'badge-info';
         // Add more cases based on your routing labels
        default:
            return 'badge-secondary'; // Default style
        }
    };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-secondary-400">Last updated:</span>
          <span className="text-secondary-200">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Rows (Still using mock data for now, update as needed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         {/* ... StatCards using mockDashboardStats ... */}
         {/* Example: Update Active Calls Stat */}
         <StatCard
            title="Active Calls"
            value={activeCalls.length} // Use length of fetched data
            icon={<Phone size={24} className="text-primary-400" />}
            // Trend data might also come from backend or be calculated
         />
         <StatCard
           title="Waiting Calls" /* Needs backend data source */
           value={mockDashboardStats.waitingCalls}
           icon={<Clock size={24} className="text-warning" />}
         />
         <StatCard
            title="Critical Emergencies" /* Needs backend data source or calculation */
            value={activeCalls.filter(c => c.priority?.toLowerCase() === 'critical').length}
            icon={<AlertTriangle size={24} className="text-danger" />}
         />
          <StatCard
            title="Operators Online" /* Needs backend data source */
            value={`${mockDashboardStats.operatorPerformance.online}/${mockDashboardStats.operatorPerformance.online + mockDashboardStats.operatorPerformance.available}`}
            icon={<Users size={24} className="text-info" />}
         />
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* ... Other StatCards ... */}
            {/* These likely also need real data sources */}
             <StatCard
                title="Avg. Wait Time"
                value={formatTime(mockDashboardStats.averageWaitTime)}
                icon={<Clock size={24} className="text-secondary-400" />}
            />
            <StatCard
                title="Avg. Call Duration"
                value={formatTime(mockDashboardStats.averageCallDuration)}
                icon={<Activity size={24} className="text-secondary-400" />}
            />
             <StatCard
                title="Resources Dispatched"
                value="24" // Hardcoded example - Needs backend data
                icon={<Ambulance size={24} className="text-success" />}
            />
            <StatCard
                title="Completed Calls"
                value={mockDashboardStats.completedCalls} // Needs backend data
                icon={<Phone size={24} className="text-success" />}
            />
      </div>


      {/* Charts Row (Still using mock data) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ... Charts using mock data ... */}
         <div className="lg:col-span-2">
           <CallVolumeChart data={weeklyCallVolumeData} />
         </div>
         <div>
           <CallPriorityChart data={priorityDistributionData} />
         </div>
      </div>

      {/* --- Active Calls Section (Using Fetched Data) --- */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Active Emergency Calls</h2>
          {/* Implement View All functionality if needed */}
          {/* <button className="btn btn-outline text-sm py-1">View All</button> */}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-secondary-400 text-sm">
                <th className="pb-3 font-medium">Caller</th>
                <th className="pb-3 font-medium">Location</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Priority</th>
                <th className="pb-3 font-medium">Duration</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-800">
              {/* --- Loading State --- */}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-secondary-400">Loading active calls...</td>
                </tr>
              )}
              {/* --- Error State --- */}
              {error && !isLoading && (
                 <tr>
                   <td colSpan={7} className="py-4 text-center text-danger">{error}</td>
                 </tr>
              )}
              {/* --- No Calls State --- */}
              {!isLoading && !error && activeCalls.length === 0 && (
                 <tr>
                   <td colSpan={7} className="py-4 text-center text-secondary-400">No active calls at the moment.</td>
                 </tr>
              )}
              {/* --- Render Calls --- */}
              {!isLoading && !error && activeCalls.map((call) => (
                <tr key={call.id} className="text-secondary-200 hover:bg-secondary-900/50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {/* Basic Initials logic - improve as needed */}
                      <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center">
                        <span className="text-primary-400 text-xs font-medium">
                          {call.callerName?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{call.callerName || 'N/A'}</p>
                        <p className="text-xs text-secondary-400">{call.callerNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <p className="text-sm">{call.location || 'Unknown'}</p>
                  </td>
                  <td className="py-3">
                    {/* Use helper function for class or apply directly */}
                    <span className={`badge ${getTypeClass(call.callType)}`}>
                         {call.callType || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3">
                     {/* Example: Render priority with color dot */}
                    <div className="flex items-center gap-1">
                         <span className={`w-2 h-2 rounded-full ${getPriorityClass(call.priority).split(' ')[0]}`}></span> {/* Extract bg color */}
                         <span className="text-sm">{call.priority || 'Normal'}</span>
                     </div>
                  </td>
                  <td className="py-3">
                    <p className="text-sm">{formatTime(call.durationSeconds)}</p>
                  </td>
                  <td className="py-3">
                     {/* Adjust status badge as needed */}
                     <span className="badge badge-info">{call.status || 'Active'}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                       {/* Add onClick handlers for these buttons */}
                      <button title="Listen In (Not Implemented)" className="p-1.5 rounded bg-secondary-800 hover:bg-secondary-700 transition-colors disabled:opacity-50" disabled>
                        <Headphones size={16} className="text-secondary-400" />
                      </button>
                      <button title="Dispatch Resources (Not Implemented)" className="p-1.5 rounded bg-secondary-800 hover:bg-secondary-700 transition-colors disabled:opacity-50" disabled>
                        <Ambulance size={16} className="text-secondary-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;