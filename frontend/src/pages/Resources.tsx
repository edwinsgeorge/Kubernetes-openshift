import React, { useState } from "react";
import { mockResources } from "../data/mockData";
import { EmergencyResource } from "../types";
import {
  Truck,
  LifeBuoy,
  ShieldAlert,
  PlusSquare,
  MapPin,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";

const Resources: React.FC = () => {
  const [selectedResource, setSelectedResource] = useState<EmergencyResource | null>(null);

  // Helper function to get an icon for resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "ambulance":
        return <PlusSquare size={16} className="text-info" />;
      case "fire_truck":
        return <Truck size={16} className="text-danger" />;
      case "police":
        return <ShieldAlert size={16} className="text-warning" />;
      case "rescue_team":
        return <LifeBuoy size={16} className="text-success" />;
      case "medical_team":
        return <PlusSquare size={16} className="text-primary-400" />;
      default:
        return <Activity size={16} className="text-secondary-400" />;
    }
  };

  // Helper to style the resource status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "dispatched":
        return "badge-warning";
      case "available":
        return "badge-success";
      case "unavailable":
        return "badge-critical";
      case "returning":
        return "badge-info";
      default:
        return "badge-secondary";
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Resources</h1>

      {/* Main layout: Full-width resource list */}
      <div className="card p-4 space-y-4 overflow-auto max-h-[calc(100vh-250px)]">
        <h2 className="text-lg font-semibold text-white mb-2">Resource List</h2>
        {mockResources.length === 0 ? (
          <div className="text-center py-6 text-secondary-400">
            <AlertTriangle size={32} className="mx-auto mb-2" />
            <p>No resources available</p>
          </div>
        ) : (
          mockResources.map((res) => (
            <div
              key={res.id}
              onClick={() => setSelectedResource(res)}
              className="bg-secondary-850 rounded-lg p-3 mb-2 border border-secondary-800 cursor-pointer hover:bg-secondary-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getResourceIcon(res.type)}
                  <p className="text-sm text-white font-medium">{res.name}</p>
                  <span className={`badge ${getStatusBadge(res.status)}`}>{res.status}</span>
                </div>
                {res.estimatedArrivalTime && (
                  <div className="flex items-center gap-1 text-xs text-secondary-300">
                    <Clock size={14} />
                    <span>
                      ETA:{" "}
                      {new Date(res.estimatedArrivalTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-secondary-400">
                <MapPin size={14} />
                <span>{res.location.district}</span>
                <span className="mx-1">|</span>
                <span>Capacity: {res.capacity}</span>
                <span className="mx-1">|</span>
                <span>Personnel: {res.personnel}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Resource Details (if any) */}
      {selectedResource && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            {selectedResource.name} Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-secondary-200">
            <div>
              <p className="text-secondary-400">Type:</p>
              <p className="capitalize">{selectedResource.type.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-secondary-400">Status:</p>
              <p className="capitalize">{selectedResource.status}</p>
            </div>
            <div>
              <p className="text-secondary-400">District:</p>
              <p>{selectedResource.location.district}</p>
            </div>
            <div>
              <p className="text-secondary-400">Coordinates:</p>
              <p>
                {selectedResource.location.coordinates[0]}, {selectedResource.location.coordinates[1]}
              </p>
            </div>
            <div>
              <p className="text-secondary-400">Capacity:</p>
              <p>{selectedResource.capacity}</p>
            </div>
            <div>
              <p className="text-secondary-400">Personnel:</p>
              <p>{selectedResource.personnel}</p>
            </div>
            {selectedResource.assignedToCall && (
              <div>
                <p className="text-secondary-400">Assigned Call:</p>
                <p>{selectedResource.assignedToCall}</p>
              </div>
            )}
            {selectedResource.estimatedArrivalTime && (
              <div>
                <p className="text-secondary-400">Estimated Arrival Time:</p>
                <p>
                  {new Date(selectedResource.estimatedArrivalTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
