import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import {
  MapPin,
  Headphones,
  HelpCircle,
  PhoneCall,
  Clock,
  ChevronDown,
  ChevronUp,
  Languages,
  Activity,
  Loader,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Cpu,
  RefreshCw,
  Send,
  History, // Added history icon
} from "lucide-react";
// Keep mock data ONLY for stats/charts as requested
import { mockCalls } from "../data/mockData";

// --- Interface for Call Data (Matches backend /api/active-calls and /api/recent-calls) ---
interface CallData {
  id: string; // session_id from backend
  start_time?: string | null; // ISO string
  caller_name?: string | null;
  caller_number?: string | null;
  location?: string | null;
  status?: string | null; // 'Active', 'Ended', 'Error', 'Transferring' etc.
  detected_language?: string | null;
  callType?: string | null; // Mapped from routing_label
  priority?: string | null;
  last_transcript?: string | null;
  confirmation_given?: boolean | null;
  handled_by?: 'AI' | 'Human' | null;
  durationSeconds: number; // Calculated duration
}

const LiveMonitoring: React.FC = () => {
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [takeoverModalOpen, setTakeoverModalOpen] = useState(false);
  const [selectedCallForModal, setSelectedCallForModal] = useState<CallData | null>(null);

  const [activeCalls, setActiveCalls] = useState<CallData[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallData[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState<boolean>(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(true);
  const [errorActive, setErrorActive] = useState<string | null>(null);
  const [errorRecent, setErrorRecent] = useState<string | null>(null);
  const [takeoverStatus, setTakeoverStatus] = useState<{ [callId: string]: 'loading' | 'success' | 'error' | undefined }>({});
  const [adminMessageInput, setAdminMessageInput] = useState<{ [callId: string]: string }>({});

  // --- API URL ---
  // CORRECTION: Access Vite environment variables using import.meta.env
  // Make sure you have VITE_API_URL defined in your .env file (e.g., .env.local)
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.31.30:8000"; // Default fallback

  // --- Data Fetching Functions ---
  const fetchActiveCalls = useCallback(async () => {
    setErrorActive(null);
    try {
      const apiUrl = `${API_BASE_URL}/api/active-calls`;
      console.log(`Workspaceing active calls from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorDetail = `HTTP error ${response.status}`;
        try { const d = await response.json(); errorDetail = d.detail || errorDetail; } catch {}
        throw new Error(errorDetail);
      }
      const data: CallData[] = await response.json();
      console.log('Active calls received:', data.length);
      setActiveCalls(data);
    } catch (e: any) {
      console.error("Failed active calls fetch:", e);
      setErrorActive(e.message || "Failed to load active calls.");
    } finally {
      setIsLoadingActive(false);
    }
  }, [API_BASE_URL]);

  const fetchRecentCalls = useCallback(async () => {
    setErrorRecent(null);
    try {
      const apiUrl = `${API_BASE_URL}/api/recent-calls`;
       console.log(`Workspaceing recent calls from: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorDetail = `HTTP error ${response.status}`;
        try { const d = await response.json(); errorDetail = d.detail || errorDetail; } catch {}
        throw new Error(errorDetail);
      }
      const data: CallData[] = await response.json();
      console.log('Recent calls received:', data.length);
      setRecentCalls(data);
    } catch (e: any) {
      console.error("Failed recent calls fetch:", e);
      setErrorRecent(e.message || "Failed to load recent calls.");
    } finally {
      setIsLoadingRecent(false);
    }
  }, [API_BASE_URL]);

  // --- Effect for Initial Fetch and Interval ---
  useEffect(() => {
    let isMounted = true;

    const loadAllData = () => {
        if(isMounted) {
           // Set loading states only if not already loading to avoid flicker on interval
           if (!isLoadingActive) setIsLoadingActive(true);
           if (!isLoadingRecent) setIsLoadingRecent(true);
        }
        console.log("Refreshing data...");
        Promise.allSettled([fetchActiveCalls(), fetchRecentCalls()]).then(() => {
            if (!isMounted) console.log("Data fetched but component unmounted.");
        });
    };

    loadAllData(); // Initial load

    const intervalId = setInterval(loadAllData, 15000);

    return () => {
        isMounted = false;
        clearInterval(intervalId);
        console.log("LiveMonitoring component unmounted, interval cleared.");
    };
    // Only re-run useEffect if the fetch functions themselves change (due to API_BASE_URL changing, which is rare)
  }, [fetchActiveCalls, fetchRecentCalls]);

  // --- Toggle Details ---
  const toggleCallDetails = (callId: string) => {
    setExpandedCall(prevExpanded => (prevExpanded === callId ? null : callId));
  };

  // --- Takeover Modal ---
  const handleTakeoverClick = (call: CallData) => {
    if (call.handled_by === 'Human') return;
    setSelectedCallForModal(call);
    setTakeoverModalOpen(true);
  };

  // --- Confirm Takeover API Call ---
  const confirmTakeover = async () => {
    if (!selectedCallForModal) return;

    const callId = selectedCallForModal.id;
    setTakeoverStatus(prev => ({ ...prev, [callId]: 'loading' }));
    setTakeoverModalOpen(false);

    try {
       const takeoverApiUrl = `${API_BASE_URL}/api/calls/${callId}/takeover`;
       console.log(`Sending takeover request for ${callId} to ${takeoverApiUrl}`);
       const response = await fetch(takeoverApiUrl, { method: 'POST' });
       if (!response.ok) {
         let errorDetail = `Takeover failed! status: ${response.status}`;
         try { const d = await response.json(); errorDetail = d.detail || errorDetail; } catch { }
         throw new Error(errorDetail);
       }
       const result = await response.json();
       console.log(`Takeover API response for ${callId}:`, result);
       setTakeoverStatus(prev => ({ ...prev, [callId]: 'success' }));
       setIsLoadingActive(true); // Show loading while refreshing list
       fetchActiveCalls(); // Refresh immediately
    } catch (e: any) {
        console.error(`Failed to takeover call ${callId}:`, e);
        setTakeoverStatus(prev => ({ ...prev, [callId]: 'error' }));
    } finally {
        setSelectedCallForModal(null);
        setTimeout(() => setTakeoverStatus(prev => {
            const { [callId]: _, ...rest } = prev;
            return rest;
        }), 4000);
    }
  };

  // --- Admin Message Input Handling ---
  const handleAdminMessageChange = (callId: string, event: ChangeEvent<HTMLInputElement>) => {
      setAdminMessageInput(prev => ({ ...prev, [callId]: event.target.value }));
  };

  // --- Send Admin Message (Placeholder) ---
  const sendAdminMessage = async (callId: string) => {
      const messageText = adminMessageInput[callId];
      if (!messageText || !messageText.trim()) return;

      alert(`FEATURE NOT IMPLEMENTED YET:\nWould send "${messageText}" for call ${callId}.\nRequires backend endpoint '/api/calls/${callId}/send-message' and WebSocket broadcasting logic.`);
      console.log(`TODO: Send message to backend for call ${callId}: "${messageText}"`);
      // Add actual API call logic here when ready
      setAdminMessageInput(prev => ({ ...prev, [callId]: '' })); // Clear input for now
  };

  // --- Helpers ---
  const getPriorityColor = (priority?: string | null): string => {
     switch (priority?.toLowerCase()) {
       case 'critical': return "bg-danger";
       case 'high': return "bg-warning";
       case 'medium': return "bg-info";
       default: return "bg-secondary-600";
     }
   };

  const getEmergencyTypeBadge = (type?: string | null): string => {
     switch (type?.toLowerCase()) {
         case 'medical emergency': case 'medical': case 'ambulance': return 'badge-danger';
         case 'fire department': case 'fire': return 'badge-warning';
         case 'police': case 'security': return 'badge-info';
        case 'general inquiry': return 'badge-secondary';
        case 'roadside assistance': return 'badge-accent';
         default: return 'badge-ghost';
     }
   };

   const formatDuration = (seconds: number | null | undefined): string => {
     if (seconds == null || isNaN(seconds) || seconds < 0) return '0:00';
     const totalSeconds = Math.floor(seconds);
     const mins = Math.floor(totalSeconds / 60);
     const secs = totalSeconds % 60;
     return `${mins}:${secs.toString().padStart(2, "0")}`;
   };

  // --- Mock Stats Calculations (Remains unchanged, uses imported mock data) ---
  const mockActiveCalls = mockCalls.filter((call) => call.status === "active");
  const mockCriticalCount = mockActiveCalls.filter((c) => c.priority === "critical").length;
  const mockHighCount = mockActiveCalls.filter((c) => c.priority === "high").length;
  const mockMediumCount = mockActiveCalls.filter((c) => c.priority === "medium").length;
  const mockLanguageCounts = mockCalls.reduce((acc, call) => { const lang = call.language || 'unknown'; acc[lang] = (acc[lang] || 0) + 1; return acc; }, {} as Record<string, number>);
  const mockLanguagesToShow = ['malayalam', 'english', 'hindi', 'unknown'];


  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
         <div className="flex items-center gap-4 flex-wrap">
           <div className="flex items-center gap-2 text-white" title="Active Call Priority Counts (Mock Data)">
             <div className="flex items-center gap-1" title="Critical"><div className="w-2.5 h-2.5 rounded-full bg-danger"></div><span className="text-sm">{mockCriticalCount}</span></div>
             <div className="flex items-center gap-1" title="High"><div className="w-2.5 h-2.5 rounded-full bg-warning"></div><span className="text-sm">{mockHighCount}</span></div>
             <div className="flex items-center gap-1" title="Medium"><div className="w-2.5 h-2.5 rounded-full bg-info"></div><span className="text-sm">{mockMediumCount}</span></div>
           </div>
           <div className="h-4 w-px bg-secondary-700 hidden sm:block"></div>
           <div className="flex items-center gap-2">
              {(isLoadingActive || isLoadingRecent) && <Loader size={16} className="animate-spin text-secondary-400" />}
              <span className="text-secondary-400 text-xs whitespace-nowrap">Last Update:</span>
              <span className="text-secondary-200 text-sm">{new Date().toLocaleTimeString()}</span>
              {!(isLoadingActive || isLoadingRecent) && (
                 <button
                    onClick={() => {
                        console.log('Manual refresh triggered');
                        setIsLoadingActive(true);
                        setIsLoadingRecent(true);
                        Promise.allSettled([fetchActiveCalls(), fetchRecentCalls()]);
                    }}
                    title="Refresh All Data"
                    className="ml-1 p-1 rounded hover:bg-secondary-700"
                 >
                     <RefreshCw size={16} className="text-secondary-400 hover:text-white" />
                 </button>
              )}
           </div>
         </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calls Section */}
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden">
            {/* Active Calls Header */}
            <div className="flex justify-between items-center p-4 border-b border-secondary-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity size={20} className="text-success"/>Active Calls ({activeCalls.length})
              </h2>
            </div>
            {/* Active Calls List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(50vh - 80px)' }}>
               {isLoadingActive ? (
                <div className="flex items-center justify-center h-32 text-secondary-400"><Loader size={24} className="mr-2 animate-spin" />Loading Active Calls...</div>
              ) : errorActive ? (
                <div className="flex items-center justify-center h-32 text-danger px-4 text-center"><AlertTriangle size={24} className="mr-2 flex-shrink-0" /><p>{errorActive}</p></div>
              ) : activeCalls.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-secondary-400"><HelpCircle size={24} className="mr-2" />No active calls found.</div>
              ) : (
                <div className="divide-y divide-secondary-800">
                  {activeCalls.map((call) => (
                    <div key={call.id} className="bg-secondary-850 hover:bg-secondary-800 transition-colors duration-150">
                        {/* Collapsed Row */}
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-2" onClick={() => toggleCallDetails(call.id)}>
                            {/* Left Side */}
                            <div className="flex items-center gap-3 flex-grow min-w-0">
                                <div className="flex-shrink-0" title={call.handled_by === 'Human' ? 'Handled by Operator' : 'Handled by AI'}>
                                {call.handled_by === 'Human' ? <UserCheck size={24} className="text-success"/> : <Cpu size={24} className="text-info"/>}
                              </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-white text-sm font-medium truncate" title={call.caller_name || 'Unknown Caller'}>{call.caller_name || 'Unknown Caller'}</p>
                                    <span className={`badge text-xs ${getEmergencyTypeBadge(call.callType)}`}>{call.callType || 'N/A'}</span>
                                  </div>
                                    <p className="text-xs text-secondary-400">{call.caller_number || 'No Number Provided'}</p>
                                </div>
                            </div>
                            {/* Right Side */}
                            <div className="flex items-center gap-4 md:gap-6 flex-shrink-0 md:pl-4">
                                <div className="hidden md:flex items-center gap-1 text-sm" title="Location">
                                  <MapPin size={14} className="text-secondary-400" />
                                  <p className="text-secondary-200 truncate">{call.location || 'N/A'}</p>
                                </div>
                                <div className="flex items-center gap-1 text-sm" title="Duration">
                                  <Clock size={14} className="text-secondary-400" />
                                  <p className="text-secondary-200 font-mono">{formatDuration(call.durationSeconds)}</p>
                                </div>
                                <div className="hidden lg:flex items-center gap-1 text-sm" title="Detected Language">
                                  <Languages size={14} className="text-secondary-400" />
                                  <p className="text-secondary-200 uppercase">{call.detected_language?.split('-')[0] || 'N/A'}</p>
                                </div>
                                <div className="flex items-center gap-2" title={`Priority: ${call.priority || 'Normal'}`}>
                                  <span className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(call.priority)}`}></span>
                                  <span className="text-sm text-secondary-200 capitalize mr-1 hidden sm:inline">{call.priority || 'Normal'}</span>
                                  {expandedCall === call.id ? <ChevronUp size={16} className="text-secondary-400"/> : <ChevronDown size={16} className="text-secondary-400"/>}
                                </div>
                            </div>
                        </div>
                        {/* Expanded Row */}
                       {expandedCall === call.id && (
                         <div className="px-4 pb-4 pt-4 bg-secondary-900 border-t border-secondary-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                                        <div><p className="font-medium text-secondary-400">Start Time:</p><p className="text-secondary-100">{call.start_time ? new Date(call.start_time).toLocaleString() : 'N/A'}</p></div>
                                        <div><p className="font-medium text-secondary-400">Duration:</p><p className="text-secondary-100">{formatDuration(call.durationSeconds)}</p></div>
                                        <div><p className="font-medium text-secondary-400">Status:</p><p className="text-secondary-100 capitalize">{call.status || 'N/A'}</p></div>
                                        <div><p className="font-medium text-secondary-400">Language:</p><p className="text-secondary-100 uppercase">{call.detected_language || 'N/A'}</p></div>
                                        <div><p className="font-medium text-secondary-400">Location:</p><p className="text-secondary-100">{call.location || 'Unknown'}</p></div>
                                        <div><p className="font-medium text-secondary-400">Call Type:</p><p className="text-secondary-100">{call.callType || 'N/A'}</p></div>
                                        <div><p className="font-medium text-secondary-400">Priority:</p><p className="text-secondary-100 capitalize">{call.priority || 'Normal'}</p></div>
                                        <div><p className="font-medium text-secondary-400">Handler:</p><p className="text-secondary-100">{call.handled_by || 'N/A'}</p></div>
                                        <div><p className="font-medium text-secondary-400">Conf. Given:</p><p className="text-secondary-100">{call.confirmation_given ? 'Yes' : 'No'}</p></div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between">
                                    <div>
                                       <h4 className="text-secondary-400 text-xs uppercase font-medium mb-1">Last Transcript</h4>
                                       <div className="bg-secondary-950 p-2 rounded text-xs text-secondary-200 max-h-24 overflow-y-auto mb-3">
                                          {call.last_transcript || <span className="italic text-secondary-500">No transcript available...</span>}
                                        </div>
                                    </div>
                                     <div className="flex flex-col items-stretch gap-1 mt-auto">
                                         {takeoverStatus[call.id] === 'loading' && (<div className="text-center text-xs text-warning p-1"><Loader size={14} className="inline animate-spin mr-1"/> Sending takeover...</div>)}
                                         {takeoverStatus[call.id] === 'success' && (<div className="text-center text-xs text-success p-1"><CheckCircle size={14} className="inline mr-1"/> Takeover initiated.</div>)}
                                         {takeoverStatus[call.id] === 'error' && (<div className="text-center text-xs text-danger p-1"><AlertTriangle size={14} className="inline mr-1"/> Takeover failed. Check console.</div>)}
                                         {call.handled_by === 'Human' ? (
                                          <div className="flex gap-1 mt-1">
                                            <input
                                              type="text"
                                              placeholder="Type admin message..."
                                              value={adminMessageInput[call.id] || ''}
                                              onChange={(e) => handleAdminMessageChange(call.id, e)}
                                              className="input input-sm flex-grow"
                                              aria-label={`Admin message for call ${call.id}`}
                                            />
                                            <button
                                              className="btn btn-sm btn-secondary"
                                              onClick={() => sendAdminMessage(call.id)}
                                              title="Send Message (Backend Required)"
                                              disabled={!adminMessageInput[call.id]?.trim()}
                                            >
                                              <Send size={14} />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            className={`btn btn-sm btn-primary w-full`}
                                            onClick={() => handleTakeoverClick(call)}
                                            disabled={takeoverStatus[call.id] === 'loading' || takeoverStatus[call.id] === 'success'}
                                          >
                                            <Headphones size={14} className="mr-1" /> Take Over Call
                                          </button>
                                        )}
                                     </div>
                                </div>
                             </div>
                         </div>
                       )}
                    </div>
                  ))}
                </div>
               )}
            </div>

            {/* Recent Calls Section */}
            <div className="flex justify-between items-center p-4 border-t border-b border-secondary-800 mt-0">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <History size={20} className="text-secondary-400"/> Recent Calls ({recentCalls.length})
                </h2>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(50vh - 80px)' }}>
                {isLoadingRecent ? (
                    <div className="flex items-center justify-center h-32 text-secondary-400"><Loader size={24} className="mr-2 animate-spin" />Loading Recent Calls...</div>
                ) : errorRecent ? (
                    <div className="flex items-center justify-center h-32 text-danger px-4 text-center"><AlertTriangle size={24} className="mr-2 flex-shrink-0" /><p>{errorRecent}</p></div>
                ) : recentCalls.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-secondary-400"><HelpCircle size={24} className="mr-2" />No recent calls found.</div>
                ) : (
                    <div className="divide-y divide-secondary-800">
                        {recentCalls.map((call) => (
                            <div key={call.id} className="bg-secondary-850 hover:bg-secondary-800 transition-colors duration-150 opacity-80 hover:opacity-100">
                                {/* Collapsed Row */}
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-2" onClick={() => toggleCallDetails(call.id)}>
                                    {/* Left Side */}
                                    <div className="flex items-center gap-3 flex-grow min-w-0">
                                        <div className="flex-shrink-0" title={`Status: ${call.status || 'Unknown'}`}>
                                            {call.status?.toLowerCase() === 'ended' ? <CheckCircle size={24} className="text-gray-500"/> : <AlertTriangle size={24} className="text-error"/>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-white text-sm font-medium truncate" title={call.caller_name || 'Unknown Caller'}>{call.caller_name || 'Unknown Caller'}</p>
                                                <span className={`badge text-xs ${getEmergencyTypeBadge(call.callType)}`}>{call.callType || 'N/A'}</span>
                                            </div>
                                            <p className="text-xs text-secondary-400">{call.caller_number || 'No Number Provided'}</p>
                                        </div>
                                    </div>
                                    {/* Right Side */}
                                    <div className="flex items-center gap-4 md:gap-6 flex-shrink-0 md:pl-4">
                                        <div className="hidden md:flex items-center gap-1 text-sm" title="Location">
                                            <MapPin size={14} className="text-secondary-500" />
                                            <p className="text-secondary-400 truncate">{call.location || 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm" title="Final Duration">
                                            <Clock size={14} className="text-secondary-500" />
                                            <p className="text-secondary-400 font-mono">{formatDuration(call.durationSeconds)}</p>
                                        </div>
                                        <div className="flex items-center gap-2" title={`Priority: ${call.priority || 'Normal'}`}>
                                            <span className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(call.priority)}`}></span>
                                            <span className="text-sm text-secondary-400 capitalize mr-1 hidden sm:inline">{call.priority || 'Normal'}</span>
                                            {expandedCall === call.id ? <ChevronUp size={16} className="text-secondary-400"/> : <ChevronDown size={16} className="text-secondary-400"/>}
                                        </div>
                                    </div>
                                </div>
                                {/* Expanded Row */}
                                {expandedCall === call.id && (
                                    <div className="px-4 pb-4 pt-4 bg-secondary-900 border-t border-secondary-700">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                                            <div><p className="font-medium text-secondary-500">Start Time:</p><p className="text-secondary-300">{call.start_time ? new Date(call.start_time).toLocaleString() : 'N/A'}</p></div>
                                            <div><p className="font-medium text-secondary-500">Duration:</p><p className="text-secondary-300">{formatDuration(call.durationSeconds)}</p></div>
                                            <div><p className="font-medium text-secondary-500">Status:</p><p className="text-secondary-300 capitalize">{call.status || 'N/A'}</p></div>
                                            <div><p className="font-medium text-secondary-500">Language:</p><p className="text-secondary-300 uppercase">{call.detected_language || 'N/A'}</p></div>
                                            <div><p className="font-medium text-secondary-500">Location:</p><p className="text-secondary-300">{call.location || 'Unknown'}</p></div>
                                            <div><p className="font-medium text-secondary-500">Call Type:</p><p className="text-secondary-300">{call.callType || 'N/A'}</p></div>
                                            <div><p className="font-medium text-secondary-500">Priority:</p><p className="text-secondary-300 capitalize">{call.priority || 'Normal'}</p></div>
                                            <div><p className="font-medium text-secondary-500">Handler:</p><p className="text-secondary-300">{call.handled_by || 'N/A'}</p></div>
                                            <div><p className="font-medium text-secondary-500">Conf. Given:</p><p className="text-secondary-300">{call.confirmation_given ? 'Yes' : 'No'}</p></div>
                                        </div>
                                        {call.last_transcript && (
                                            <div className="mt-3">
                                                <h4 className="text-secondary-500 text-xs uppercase font-medium mb-1">Last Transcript Snippet</h4>
                                                <div className="bg-secondary-950 p-2 rounded text-xs text-secondary-400 max-h-20 overflow-y-auto"> {call.last_transcript} </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
               }
             </div>
          </div>
        </div>

        {/* Right-Side Panels (Mock Data) */}
        <div className="lg:col-span-2 space-y-6">
           <div className="card p-4">
               <h2 className="text-lg font-semibold text-white mb-4">Priority Distribution</h2>
               <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Critical</span><span className="font-medium text-danger">{mockCriticalCount}</span></div>
                <div className="flex items-center justify-between"><span>High</span><span className="font-medium text-warning">{mockHighCount}</span></div>
                <div className="flex items-center justify-between"><span>Medium</span><span className="font-medium text-info">{mockMediumCount}</span></div>
              </div>
           </div>
           <div className="card p-4">
               <h2 className="text-lg font-semibold text-white mb-4">Language Distribution</h2>
               <div className="space-y-2 text-sm">
                {mockLanguagesToShow.map(lang => (
                  <div key={lang} className="flex items-center justify-between">
                    <span className="capitalize">{lang}</span>
                    <span className="font-medium text-secondary-200">{mockLanguageCounts[lang] || 0}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Take Over Call Modal */}
      {takeoverModalOpen && selectedCallForModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
              <div className="bg-secondary-900 rounded-lg p-6 max-w-md w-full shadow-xl border border-secondary-700 transform transition-all scale-95 opacity-0 animate-modal-pop-in">
                 <h3 className="text-lg font-semibold text-white mb-4">Take Over Call</h3>
                 <p className="text-secondary-200 mb-4">Are you sure you want to take over the call from <span className="text-white font-medium">{selectedCallForModal.caller_name || 'Unknown Caller'}</span> ({selectedCallForModal.caller_number || 'No Number'})? The AI assistant will stop responding.</p>
                  <div className="bg-secondary-800 p-3 rounded-lg mb-4 text-sm space-y-1 border border-secondary-700">
                      <div className="flex justify-between"><span className="text-secondary-400">Call Type:</span> <span className="text-secondary-100 font-medium">{selectedCallForModal.callType || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-400">Priority:</span> <span className="text-secondary-100 font-medium">{selectedCallForModal.priority || 'Normal'}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-400">Current Duration:</span> <span className="text-secondary-100 font-medium">{formatDuration(selectedCallForModal.durationSeconds)}</span></div>
                  </div>
                 <div className="flex items-center justify-end gap-3 mt-6">
                   <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setTakeoverModalOpen(false);
                        setSelectedCallForModal(null);
                      }}
                    >
                      Cancel
                    </button>
                   <button
                      className="btn btn-primary"
                      onClick={confirmTakeover}
                    >
                      Confirm Take Over
                    </button>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LiveMonitoring;

// Add this CSS if you haven't already (e.g., in index.css)
/*
@keyframes modal-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-modal-pop-in {
  animation: modal-pop-in 0.3s ease-out forwards;
}
*/