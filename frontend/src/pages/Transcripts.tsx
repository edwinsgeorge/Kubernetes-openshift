import React, { useState } from "react";
import { PhoneCall, Clock, ChevronDown, ChevronUp, Search, AlertCircle } from "lucide-react";
import { mockCalls } from "../data/mockData";
import { Call } from "../types";

const Transcripts: React.FC = () => {
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleCallDetails = (callId: string) => {
    setExpandedCall(expandedCall === callId ? null : callId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopyTranscript = (transcript: string) => {
    navigator.clipboard.writeText(transcript);
    alert("Transcript copied to clipboard!");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-danger";
      case "high":
        return "bg-warning";
      case "medium":
        return "bg-info";
      default:
        return "bg-success";
    }
  };

  const getEmergencyTypeBadge = (type: string) => {
    switch (type) {
      case "medical":
        return "badge-danger";
      case "fire":
        return "badge-warning";
      case "police":
        return "badge-primary";
      case "natural_disaster":
        return "badge-critical";
      default:
        return "badge-secondary";
    }
  };

  const filteredCalls = mockCalls.filter((call: Call) =>
    call.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.callerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Title and Search */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Call Transcripts</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary-800 text-white rounded pl-10 pr-4 py-2 text-sm border border-secondary-700 focus:outline-none focus:border-primary-400"
          />
          <Search
            size={16}
            className="absolute top-1/2 left-3 transform -translate-y-1/2 text-secondary-400"
          />
        </div>
      </div>

      {/* Transcripts List */}
      <div className="space-y-4">
        {filteredCalls.length === 0 ? (
          <div className="text-center py-6 text-secondary-400">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p>No transcripts found.</p>
          </div>
        ) : (
          filteredCalls.map((call: Call) => (
            <div
              key={call.id}
              className="bg-secondary-850 rounded-lg border border-secondary-800 overflow-hidden"
            >
              <div
                className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer"
                onClick={() => toggleCallDetails(call.id)}
              >
                <div className="flex items-center gap-3">
                  <PhoneCall
                    size={20}
                    className={`${
                      call.priority === "critical"
                        ? "text-danger"
                        : call.priority === "high"
                        ? "text-warning"
                        : "text-info"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium">{call.callerName}</p>
                      <span className={`badge ${getEmergencyTypeBadge(call.emergencyType)}`}>
                        {call.emergencyType.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-secondary-400">{call.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 md:mt-0">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-secondary-400" />
                    <p className="text-sm text-secondary-200">
                      {new Date(call.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {expandedCall === call.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Transcript and Details */}
              {expandedCall === call.id && (
                <div className="px-4 pb-4 border-t border-secondary-800 pt-3">
                  <div className="mb-3">
                    <h4 className="text-secondary-400 text-xs uppercase font-medium mb-2">
                      Transcript
                    </h4>
                    <div className="bg-secondary-900 p-3 rounded-lg text-sm text-secondary-200 whitespace-pre-wrap">
                      {call.transcript}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-secondary-400">Start Time:</p>
                      <p className="text-secondary-200">
                        {new Date(call.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-secondary-400">Duration:</p>
                      <p className="text-secondary-200">{formatDuration(call.duration)}</p>
                    </div>
                    <div>
                      <p className="text-secondary-400">Status:</p>
                      <p className="text-secondary-200 capitalize">{call.status}</p>
                    </div>
                    <div>
                      <p className="text-secondary-400">Language:</p>
                      <p className="text-secondary-200 capitalize">{call.language}</p>
                    </div>
                    <div>
                      <p className="text-secondary-400">District:</p>
                      <p className="text-secondary-200">{call.location.district}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => handleCopyTranscript(call.transcript)}
                      className="btn btn-secondary text-xs"
                    >
                      Copy Transcript
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transcripts;
