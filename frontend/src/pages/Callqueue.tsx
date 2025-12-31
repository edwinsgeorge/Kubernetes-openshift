import React, { useState, useEffect, useRef } from "react";
import {
  PhoneCall,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader,
  AlertTriangle,
  Search,
  PhoneForwarded,
  CheckCircle, // Keep for potential future use
  XCircle,     // Keep for potential future use
  RefreshCw,   // Add for manual refresh maybe
} from "lucide-react";
// Remove mock data import
// import { mockCalls } from "../data/mockData";
// Import Call type if needed or use ActiveCall directly
// import { Call } from "../types";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- Define Interface (Match data from /api/active-calls) ---
// Ensure this matches the fields returned by your backend endpoint
interface ActiveCall {
  id: string; // session_id
  caller_name?: string; // Use snake_case if backend sends it like that
  caller_number?: string;
  location?: string;
  callType?: string; // Was routing_label, renamed in API
  priority?: string;
  durationSeconds: number;
  status?: string;
  start_time?: string; // ISO String
  detected_language?: string;
  last_transcript?: string;
  // Add other fields if provided, like 'confirmation_given'
}

// --- RotatingCube Component (Slight modification for status) ---
// Color now depends primarily on transfer status from API call attempt
const RotatingCube: React.FC<{ isTransferring?: boolean; colorOverride?: string }> = ({ isTransferring, colorOverride }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  // Determine color: Use override if provided, else based on transferring status
  const color = colorOverride ? colorOverride : (isTransferring ? "#f39c12" : "#3498db"); // Orange if transferring, blue otherwise

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};


const Callqueue: React.FC = () => {
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- State for fetched calls, loading, and errors ---
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for transfer status (client-side feedback) ---
  const [callTransferState, setCallTransferState] = useState<{
    [callId: string]: { transferring: boolean; error?: string; success?: boolean };
  }>({});

  // Removed callResolutionStatus - This should be driven by backend state if needed

  // --- Data Fetching Effect ---
  const fetchActiveCalls = async () => {
     // Don't reset loading if already loading from interval, but reset error
     // setIsLoading(true); // Maybe only set true initially?
     setError(null);
     try {
       // --- Use the FULL URL of your backend ---
       const apiUrl = 'http://192.168.31.30:8000/api/active-calls'; // Ensure PORT is correct
       console.log(`Workspaceing active calls from: ${apiUrl}`);

       const response = await fetch(apiUrl);
       if (!response.ok) {
         let errorDetail = `HTTP error! status: ${response.status}`;
         try { const errorData = await response.json(); errorDetail = errorData.detail || errorDetail; } catch { }
         throw new Error(errorDetail);
       }
       const data: ActiveCall[] = await response.json();
       console.log(`Workspaceed ${data.length} active calls.`);
       setActiveCalls(data);
     } catch (e: any) {
       console.error("Failed to fetch active calls:", e);
       setError(e.message || "Failed to load active calls.");
     } finally {
       // Only set loading false after the *initial* load
       if (isLoading) setIsLoading(false);
     }
   };

  useEffect(() => {
    setIsLoading(true); // Set loading true on initial mount
    fetchActiveCalls(); // Fetch immediately

    const intervalId = setInterval(fetchActiveCalls, 15000); // Refresh every 15 seconds
    return () => clearInterval(intervalId); // Cleanup interval
  }, []); // Empty dependency array


  // --- Filtering Logic --- (Now uses fetched activeCalls)
  const filteredCalls = activeCalls.filter(
    (call: ActiveCall) =>
      (call.caller_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (call.caller_number || '').includes(searchQuery)
  );

  const toggleCallDetails = (callId: string) => {
    setExpandedCall(expandedCall === callId ? null : callId);
  };

  // --- Format Duration ---
  const formatDuration = (ms: number): string => {
     if (isNaN(ms) || ms < 0) return '0:00';
     const seconds = Math.floor(ms / 1000);
     const minutes = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

   // --- Calculate Waiting Duration (uses durationSeconds from backend) ---
   // No longer calculating from startTime on frontend, backend provides duration
   const getWaitingDuration = (durationSeconds: number): string => {
       if (isNaN(durationSeconds) || durationSeconds < 0) return '0m 0s';
       const mins = Math.floor(durationSeconds / 60);
       const secs = durationSeconds % 60;
       return `${mins}m ${secs}s`;
   };


  // --- Styling Helpers ---
  const getPriorityColor = (priority?: string): string => {
    switch (priority?.toLowerCase()) {
      case 'critical': return "bg-danger";
      case 'high': return "bg-warning";
      case 'medium': return "bg-info";
      default: return "bg-secondary-600"; // Use bg color directly
    }
  };

  const getEmergencyTypeBadge = (type?: string): string => {
     switch (type?.toLowerCase()) {
         case 'medical emergency': case 'medical': return 'badge-danger';
         case 'fire department': case 'fire': return 'badge-danger'; // Or specific fire color class
         case 'police': return 'badge-info';
         // Add other specific types from your routing model
         default: return 'badge-secondary';
     }
  };

  // --- Handle Manual Call Transfer --- (MODIFIED)
  const handleTransferCall = async (callId: string, department: string) => {
    // Set transferring state immediately for UI feedback
    setCallTransferState((prev) => ({
      ...prev,
      [callId]: { transferring: true, error: undefined, success: false },
    }));

    try {
      // --- Use the FULL URL for the transfer endpoint ---
      const transferApiUrl = `http://192.168.31.30:8000/api/calls/${callId}/transfer`; // Ensure PORT is correct
      console.log(`Attempting transfer for ${callId} to ${department} via ${transferApiUrl}`);

      const response = await fetch(transferApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department }), // Send department in body
      });

      if (!response.ok) {
        let errorDetail = `Transfer failed! status: ${response.status}`;
         try { const errorData = await response.json(); errorDetail = errorData.detail || errorDetail; } catch { }
        throw new Error(errorDetail);
      }

      const result = await response.json();
      console.log(`Transfer API response for ${callId}:`, result);

      // Update state to show success (stops transferring indicator)
      setCallTransferState((prev) => ({
        ...prev,
        [callId]: { transferring: false, error: undefined, success: true },
      }));

      // Optionally: Refresh the active calls list slightly sooner after transfer
      setTimeout(fetchActiveCalls, 1000); // Refresh list after 1 second

    } catch (e: any) {
      console.error(`Failed to transfer call ${callId}:`, e);
      // Update state to show error
      setCallTransferState((prev) => ({
        ...prev,
        [callId]: { transferring: false, error: e.message || "Transfer failed", success: false },
      }));
      // Optionally clear error message after a delay
      setTimeout(() => {
           setCallTransferState((prev) => ({
              ...prev,
              [callId]: { ...prev[callId], error: undefined },
           }));
      }, 5000);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Call Queue</h1>
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative">
             <input /* ... search input setup ... */ />
             <Search /* ... icon ... */ />
          </div>
          {/* Waiting Count & Refresh */}
          <div className="flex items-center gap-2">
             {isLoading ? (
                <Loader size={16} className="animate-spin text-secondary-400" />
             ) : error ? (
                <AlertTriangle size={16} className="text-danger" title={error} />
             ) : (
                 // Optionally add a manual refresh button
                 <button onClick={() => { setIsLoading(true); fetchActiveCalls(); }} title="Refresh Calls">
                     <RefreshCw size={16} className="text-secondary-400 hover:text-white" />
                 </button>
             )}
             <p className="text-secondary-200 text-sm">
                 {filteredCalls.length} call(s)
             </p>
          </div>
        </div>
      </div>

      {/* Call List - Renders based on fetched data */}
      {isLoading && activeCalls.length === 0 ? ( // Show loading only on initial load
        <div className="text-center py-6 text-secondary-400">
           <Loader size={32} className="animate-spin mx-auto mb-2" />
           <p>Loading calls...</p>
        </div>
      ) : error ? (
         <div className="text-center py-6 text-danger">
             <AlertTriangle size={32} className="mx-auto mb-2" />
             <p>{error}</p>
         </div>
      ) : filteredCalls.length === 0 ? (
        <div className="text-center py-6 text-secondary-400">
          <AlertTriangle size={32} className="mx-auto mb-2" />
          <p>No calls matching search in the queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCalls.map((call: ActiveCall) => {
            const transferInfo = callTransferState[call.id];
            return (
              <div
                key={call.id}
                className="bg-secondary-850 rounded-lg border border-secondary-800 overflow-hidden transition-shadow duration-200 hover:shadow-lg hover:border-secondary-700"
              >
                {/* --- Collapsed Row --- */}
                <div
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer"
                  onClick={() => toggleCallDetails(call.id)}
                >
                  {/* Left Side: Caller Info */}
                  <div className="flex items-center gap-3 flex-grow min-w-0">
                    {/* Status/Priority Indicator */}
                    <div className={`w-2 h-full rounded-l-lg flex-shrink-0 ${getPriorityColor(call.priority)}`} title={`Priority: ${call.priority || 'Normal'}`}></div>
                    <PhoneCall size={20} className="text-info flex-shrink-0" /> {/* Consistent Icon */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate" title={call.caller_name || 'Unknown Caller'}>
                            {call.caller_name || 'Unknown Caller'}
                        </p>
                        <span className={`badge text-xs ${getEmergencyTypeBadge(call.callType)}`}>
                           {call.callType || 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-400">{call.caller_number || 'No Number'}</p>
                    </div>
                  </div>
                  {/* Right Side: Duration & Toggle */}
                  <div className="flex items-center gap-4 mt-2 md:mt-0 flex-shrink-0 pl-4">
                    <div className="flex items-center gap-2" title="Waiting Duration">
                      <Clock size={16} className="text-secondary-400" />
                      <p className="text-sm text-secondary-200 font-mono">{getWaitingDuration(call.durationSeconds)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-secondary-400 hover:text-white">
                      {expandedCall === call.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* --- Expanded Row --- */}
                {expandedCall === call.id && (
                  <div className="px-4 pb-4 border-t border-secondary-800 pt-3">
                    {/* Grid for Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-xs mb-4">
                      {/* Populate with actual data */}
                       <div><p className="text-secondary-400">Start Time:</p><p className="text-secondary-200">{call.start_time ? new Date(call.start_time).toLocaleString() : 'N/A'}</p></div>
                       <div><p className="text-secondary-400">Location:</p><p className="text-secondary-200">{call.location || 'Unknown'}</p></div>
                       <div><p className="text-secondary-400">Language:</p><p className="text-secondary-200">{call.detected_language || 'N/A'}</p></div>
                       <div className="col-span-2 sm:col-span-3 md:col-span-4"><p className="text-secondary-400">Last Transcript:</p><p className="text-secondary-200 italic">"{call.last_transcript || '...'}"</p></div>
                       {/* Add other relevant details like confirmation_given if needed */}
                    </div>

                    {/* Transfer Buttons & Status */}
                    <div className="flex flex-col sm:flex-row justify-end items-center mt-3 space-y-2 sm:space-y-0 sm:space-x-2">
                       {/* Show error if transfer failed */}
                       {transferInfo?.error && (
                           <div className="flex items-center gap-1 text-danger text-xs mr-auto">
                              <AlertTriangle size={14} />
                              <span>{transferInfo.error}</span>
                           </div>
                       )}
                       {/* Show success briefly */}
                       {transferInfo?.success && !transferInfo.error && (
                           <div className="flex items-center gap-1 text-success text-xs mr-auto">
                              <CheckCircle size={14} />
                              <span>Transfer initiated.</span>
                           </div>
                       )}

                       {/* Show transferring indicator or buttons */}
                       {transferInfo?.transferring ? (
                         <div className="flex items-center gap-1 text-warning text-sm">
                           <Loader size={16} className="animate-spin" />
                           <span>Transferring...</span>
                         </div>
                       ) : ( !transferInfo?.success && // Hide buttons after successful initiation attempt
                         <>
                           <button
                             className="btn btn-outline btn-primary text-xs w-full sm:w-auto"
                             onClick={() => handleTransferCall(call.id, "Fire Department")} // Use consistent department names
                             disabled={!!transferInfo?.transferring} // Disable while transferring
                           >
                             <PhoneForwarded size={14} className="mr-1" /> Fire Dept.
                           </button>
                           <button
                             className="btn btn-outline btn-primary text-xs w-full sm:w-auto"
                             onClick={() => handleTransferCall(call.id, "Police")}
                             disabled={!!transferInfo?.transferring}
                           >
                             <PhoneForwarded size={14} className="mr-1" /> Police
                           </button>
                           <button
                             className="btn btn-outline btn-primary text-xs w-full sm:w-auto"
                             onClick={() => handleTransferCall(call.id, "Medical")}
                             disabled={!!transferInfo?.transferring}
                           >
                             <PhoneForwarded size={14} className="mr-1" /> Medical
                           </button>
                           {/* Add more buttons if needed */}
                         </>
                       )}
                    </div>

                    {/* 3D Visualization - Optional */}
                    {/*
                    <div style={{ width: "100px", height: "100px", marginTop: "1rem", margin: "auto" }}>
                      <Canvas>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} />
                        <RotatingCube isTransferring={transferInfo?.transferring} />
                      </Canvas>
                    </div>
                    */}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default Callqueue;