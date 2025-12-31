export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'operator';
  avatar?: string;
}

export interface Call {
  id: string;
  callerId: string;
  callerName: string;
  phoneNumber: string;
  startTime: string;
  duration: number; // in seconds
  status: 'active' | 'waiting' | 'completed' | 'dropped';
  priority: 'critical' | 'high' | 'medium' | 'low';
  language: 'english' | 'hindi' | 'malayalam';
  location: {
    district: string;
    coordinates: [number, number]; // [latitude, longitude]
  };
  emotionData: {
    distress: number; // 0-100
    panic: number; // 0-100
    fear: number; // 0-100
    anger: number; // 0-100
    sadness: number; // 0-100
  };
  emergencyType: 'medical' | 'fire' | 'police' | 'natural_disaster' | 'other';
  assignedTo?: string; // operator ID
  transcript?: string;
  notes?: string;
}

export interface EmergencyResource {
  id: string;
  type: 'ambulance' | 'fire_truck' | 'police' | 'rescue_team' | 'medical_team';
  name: string;
  status: 'available' | 'dispatched' | 'returning' | 'unavailable';
  location: {
    district: string;
    coordinates: [number, number]; // [latitude, longitude]
  };
  capacity: number;
  personnel: number;
  estimatedArrivalTime?: string;
  assignedToCall?: string; // call ID
}

export interface SocialMediaPost {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'whatsapp';
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'rejected';
  scheduledTime?: string;
  createdAt: string;
  createdBy: string; // user ID or 'ai'
  approvedBy?: string; // user ID
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
  };
}

export interface District {
  id: string;
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  callVolume: number;
  resourceCount: {
    ambulance: number;
    fire_truck: number;
    police: number;
    rescue_team: number;
    medical_team: number;
  };
}

export interface DashboardStats {
  activeCalls: number;
  waitingCalls: number;
  completedCalls: number;
  averageWaitTime: number; // in seconds
  averageCallDuration: number; // in seconds
  callsByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  callsByLanguage: {
    english: number;
    hindi: number;
    malayalam: number;
  };
  callsByEmergencyType: {
    medical: number;
    fire: number;
    police: number;
    natural_disaster: number;
    other: number;
  };
  resourceUtilization: {
    ambulance: number; // percentage
    fire_truck: number; // percentage
    police: number; // percentage
    rescue_team: number; // percentage
    medical_team: number; // percentage
  };
  operatorPerformance: {
    online: number;
    busy: number;
    available: number;
  };
}