import { Call, EmergencyResource, SocialMediaPost, District, DashboardStats } from '../types';

// Kerala districts with coordinates
export const keralaDistricts: District[] = [
  { id: '1', name: 'Thiruvananthapuram', coordinates: [8.5241, 76.9366], callVolume: 42, resourceCount: { ambulance: 12, fire_truck: 5, police: 8, rescue_team: 3, medical_team: 6 } },
  { id: '2', name: 'Kollam', coordinates: [8.8932, 76.6141], callVolume: 28, resourceCount: { ambulance: 8, fire_truck: 4, police: 6, rescue_team: 2, medical_team: 4 } },
  { id: '3', name: 'Pathanamthitta', coordinates: [9.2648, 76.7870], callVolume: 15, resourceCount: { ambulance: 6, fire_truck: 3, police: 4, rescue_team: 2, medical_team: 3 } },
  { id: '4', name: 'Alappuzha', coordinates: [9.4981, 76.3388], callVolume: 22, resourceCount: { ambulance: 7, fire_truck: 3, police: 5, rescue_team: 2, medical_team: 4 } },
  { id: '5', name: 'Kottayam', coordinates: [9.5916, 76.5222], callVolume: 18, resourceCount: { ambulance: 6, fire_truck: 3, police: 5, rescue_team: 2, medical_team: 3 } },
  { id: '6', name: 'Idukki', coordinates: [9.9189, 77.1025], callVolume: 12, resourceCount: { ambulance: 5, fire_truck: 2, police: 4, rescue_team: 3, medical_team: 2 } },
  { id: '7', name: 'Ernakulam', coordinates: [9.9816, 76.2999], callVolume: 45, resourceCount: { ambulance: 14, fire_truck: 6, police: 10, rescue_team: 4, medical_team: 7 } },
  { id: '8', name: 'Thrissur', coordinates: [10.5276, 76.2144], callVolume: 35, resourceCount: { ambulance: 10, fire_truck: 5, police: 8, rescue_team: 3, medical_team: 6 } },
  { id: '9', name: 'Palakkad', coordinates: [10.7867, 76.6548], callVolume: 25, resourceCount: { ambulance: 8, fire_truck: 4, police: 6, rescue_team: 2, medical_team: 4 } },
  { id: '10', name: 'Malappuram', coordinates: [11.0510, 76.0711], callVolume: 38, resourceCount: { ambulance: 11, fire_truck: 5, police: 7, rescue_team: 3, medical_team: 5 } },
  { id: '11', name: 'Kozhikode', coordinates: [11.2588, 75.7804], callVolume: 40, resourceCount: { ambulance: 12, fire_truck: 5, police: 9, rescue_team: 3, medical_team: 6 } },
  { id: '12', name: 'Wayanad', coordinates: [11.6854, 76.1320], callVolume: 10, resourceCount: { ambulance: 4, fire_truck: 2, police: 3, rescue_team: 2, medical_team: 2 } },
  { id: '13', name: 'Kannur', coordinates: [11.8745, 75.3704], callVolume: 30, resourceCount: { ambulance: 9, fire_truck: 4, police: 7, rescue_team: 2, medical_team: 5 } },
  { id: '14', name: 'Kasaragod', coordinates: [12.4996, 74.9869], callVolume: 15, resourceCount: { ambulance: 5, fire_truck: 2, police: 4, rescue_team: 1, medical_team: 3 } },
];

// Mock active calls
export const mockCalls: Call[] = [
  {
    id: 'call-001',
    callerId: 'caller-001',
    callerName: 'Arjun Nair',
    phoneNumber: '+91 9876543210',
    startTime: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 minutes ago
    duration: 180, // 3 minutes
    status: 'active',
    priority: 'critical',
    language: 'malayalam',
    location: {
      district: 'Ernakulam',
      coordinates: [9.9816, 76.2999],
    },
    emotionData: {
      distress: 85,
      panic: 90,
      fear: 75,
      anger: 30,
      sadness: 40,
    },
    emergencyType: 'medical',
    assignedTo: '3',
    transcript: 'എനിക്ക് ശ്വാസം മുട്ടുന്നു. ദയവായി വേഗം സഹായിക്കൂ. എന്റെ അമ്മയ്ക്ക് ഹൃദയാഘാതം ഉണ്ടെന്ന് തോന്നുന്നു.',
  },
  {
    id: 'call-002',
    callerId: 'caller-002',
    callerName: 'Priya Menon',
    phoneNumber: '+91 9876543211',
    startTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    duration: 300, // 5 minutes
    status: 'active',
    priority: 'high',
    language: 'english',
    location: {
      district: 'Thiruvananthapuram',
      coordinates: [8.5241, 76.9366],
    },
    emotionData: {
      distress: 70,
      panic: 65,
      fear: 80,
      anger: 20,
      sadness: 30,
    },
    emergencyType: 'fire',
    transcript: 'There\'s a fire in our apartment building. The second floor is completely engulfed. Please send help immediately!',
  },
  {
    id: 'call-003',
    callerId: 'caller-003',
    callerName: 'Rajesh Kumar',
    phoneNumber: '+91 9876543212',
    startTime: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
    duration: 120, // 2 minutes
    status: 'waiting',
    priority: 'medium',
    language: 'hindi',
    location: {
      district: 'Kozhikode',
      coordinates: [11.2588, 75.7804],
    },
    emotionData: {
      distress: 50,
      panic: 45,
      fear: 60,
      anger: 40,
      sadness: 20,
    },
    emergencyType: 'police',
    transcript: 'मेरे घर में चोरी हो गई है। कृपया पुलिस को भेजें। मैं अभी घर पहुंचा हूं और देखा कि दरवाजा टूटा हुआ है।',
  },
  {
    id: 'call-004',
    callerId: 'caller-004',
    callerName: 'Lakshmi Pillai',
    phoneNumber: '+91 9876543213',
    startTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 minutes ago
    duration: 480, // 8 minutes
    status: 'active',
    priority: 'critical',
    language: 'malayalam',
    location: {
      district: 'Alappuzha',
      coordinates: [9.4981, 76.3388],
    },
    emotionData: {
      distress: 95,
      panic: 90,
      fear: 85,
      anger: 10,
      sadness: 70,
    },
    emergencyType: 'natural_disaster',
    assignedTo: '2',
    transcript: 'ഞങ്ങളുടെ പ്രദേശം വെള്ളപ്പൊക്കത്തിൽ മുങ്ങിയിരിക്കുന്നു. ഞങ്ങൾ മേൽക്കൂരയിൽ കുടുങ്ങിയിരിക്കുകയാണ്. ദയവായി രക്ഷാപ്രവർത്തകരെ അയയ്ക്കുക.',
  },
  {
    id: 'call-005',
    callerId: 'caller-005',
    callerName: 'Mohammed Salim',
    phoneNumber: '+91 9876543214',
    startTime: new Date(Date.now() - 1000 * 60 * 1).toISOString(), // 1 minute ago
    duration: 60, // 1 minute
    status: 'waiting',
    priority: 'low',
    language: 'english',
    location: {
      district: 'Malappuram',
      coordinates: [11.0510, 76.0711],
    },
    emotionData: {
      distress: 30,
      panic: 20,
      fear: 25,
      anger: 15,
      sadness: 10,
    },
    emergencyType: 'other',
    transcript: 'I need information about the nearest relief camp. My family and I need to evacuate due to the heavy rain warning.',
  },
];

// Mock emergency resources
export const mockResources: EmergencyResource[] = [
  {
    id: 'resource-001',
    type: 'ambulance',
    name: 'Ambulance Unit 1',
    status: 'dispatched',
    location: {
      district: 'Ernakulam',
      coordinates: [9.9716, 76.2889],
    },
    capacity: 2,
    personnel: 3,
    estimatedArrivalTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes from now
    assignedToCall: 'call-001',
  },
  {
    id: 'resource-002',
    type: 'fire_truck',
    name: 'Fire Engine 3',
    status: 'dispatched',
    location: {
      district: 'Thiruvananthapuram',
      coordinates: [8.5141, 76.9266],
    },
    capacity: 0,
    personnel: 6,
    estimatedArrivalTime: new Date(Date.now() + 1000 * 60 * 3).toISOString(), // 3 minutes from now
    assignedToCall: 'call-002',
  },
  {
    id: 'resource-003',
    type: 'police',
    name: 'Police Unit 7',
    status: 'available',
    location: {
      district: 'Kozhikode',
      coordinates: [11.2488, 75.7704],
    },
    capacity: 4,
    personnel: 2,
  },
  {
    id: 'resource-004',
    type: 'rescue_team',
    name: 'Rescue Team Alpha',
    status: 'dispatched',
    location: {
      district: 'Alappuzha',
      coordinates: [9.4881, 76.3288],
    },
    capacity: 8,
    personnel: 10,
    estimatedArrivalTime: new Date(Date.now() + 1000 * 60 * 12).toISOString(), // 12 minutes from now
    assignedToCall: 'call-004',
  },
  {
    id: 'resource-005',
    type: 'medical_team',
    name: 'Medical Response Team 2',
    status: 'available',
    location: {
      district: 'Ernakulam',
      coordinates: [9.9916, 76.3099],
    },
    capacity: 0,
    personnel: 5,
  },
  {
    id: 'resource-006',
    type: 'ambulance',
    name: 'Ambulance Unit 4',
    status: 'available',
    location: {
      district: 'Thrissur',
      coordinates: [10.5176, 76.2044],
    },
    capacity: 2,
    personnel: 3,
  },
  {
    id: 'resource-007',
    type: 'police',
    name: 'Police Unit 12',
    status: 'returning',
    location: {
      district: 'Kollam',
      coordinates: [8.8832, 76.6041],
    },
    capacity: 4,
    personnel: 2,
  },
  {
    id: 'resource-008',
    type: 'fire_truck',
    name: 'Fire Engine 6',
    status: 'unavailable',
    location: {
      district: 'Kottayam',
      coordinates: [9.5816, 76.5122],
    },
    capacity: 0,
    personnel: 0,
  },
];

// Mock social media posts
export const mockSocialMediaPosts: SocialMediaPost[] = [
  {
    id: 'post-001',
    platform: 'twitter',
    content: 'ALERT: Heavy rainfall expected in Ernakulam district over the next 24 hours. Please stay indoors and follow safety guidelines. #KeralaRains #DisasterManagement',
    status: 'published',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    createdBy: 'ai',
    approvedBy: '1',
    engagement: {
      likes: 45,
      shares: 78,
      comments: 12,
    },
  },
  {
    id: 'post-002',
    platform: 'facebook',
    content: 'Relief camps have been set up in the following locations in Alappuzha district:\n1. Government High School, Alappuzha\n2. St. Joseph\'s College, Alappuzha\n3. Town Hall, Cherthala\n\nPlease reach out to these centers if you need assistance. #KeralaFloods',
    status: 'published',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    createdBy: '2',
    approvedBy: '1',
    engagement: {
      likes: 132,
      shares: 215,
      comments: 43,
    },
  },
  {
    id: 'post-003',
    platform: 'twitter',
    content: 'Road closure update: NH-66 between Kollam and Alappuzha is closed due to flooding. Please use alternative routes. #KeralaFloods #RoadSafety',
    status: 'scheduled',
    scheduledTime: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 minutes from now
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
    createdBy: 'ai',
  },
  {
    id: 'post-004',
    platform: 'whatsapp',
    content: 'IMPORTANT: If you are in a flood-affected area and need rescue, please share your exact location using WhatsApp location sharing with our emergency number: +91 9876543200. Include number of people and any medical needs.',
    status: 'draft',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    createdBy: '3',
  },
  {
    id: 'post-005',
    platform: 'instagram',
    content: 'Volunteers needed for relief operations in Wayanad district. If you can help with food distribution, medical assistance, or rescue operations, please register at the link in bio. #KeralaFloodRelief #Volunteers',
    status: 'published',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    createdBy: '1',
    approvedBy: '1',
    engagement: {
      likes: 256,
      shares: 89,
      comments: 67,
    },
  },
];

// Mock dashboard stats
export const mockDashboardStats: DashboardStats = {
  activeCalls: 3,
  waitingCalls: 2,
  completedCalls: 45,
  averageWaitTime: 120, // 2 minutes
  averageCallDuration: 240, // 4 minutes
  callsByPriority: {
    critical: 12,
    high: 18,
    medium: 15,
    low: 5,
  },
  callsByLanguage: {
    english: 20,
    hindi: 10,
    malayalam: 20,
  },
  callsByEmergencyType: {
    medical: 18,
    fire: 12,
    police: 8,
    natural_disaster: 10,
    other: 2,
  },
  resourceUtilization: {
    ambulance: 75,
    fire_truck: 60,
    police: 50,
    rescue_team: 85,
    medical_team: 40,
  },
  operatorPerformance: {
    online: 12,
    busy: 8,
    available: 4,
  },
};

// Weekly call volume data for charts
export const weeklyCallVolumeData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Call Volume',
      data: [65, 59, 80, 81, 56, 55, 40],
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true,
    },
  ],
};

// Priority distribution data for charts
export const priorityDistributionData = {
  labels: ['Critical', 'High', 'Medium', 'Low'],
  datasets: [
    {
      data: [12, 18, 15, 5],
      backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
      borderWidth: 0,
    },
  ],
};

// Resource utilization data for charts
export const resourceUtilizationData = {
  labels: ['Ambulance', 'Fire Truck', 'Police', 'Rescue Team', 'Medical Team'],
  datasets: [
    {
      label: 'Utilization (%)',
      data: [75, 60, 50, 85, 40],
      backgroundColor: [
        'rgba(239, 68, 68, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(139, 92, 246, 0.7)',
      ],
      borderWidth: 0,
    },
  ],
};

// Emergency type distribution data for charts
export const emergencyTypeData = {
  labels: ['Medical', 'Fire', 'Police', 'Natural Disaster', 'Other'],
  datasets: [
    {
      data: [18, 12, 8, 10, 2],
      backgroundColor: [
        'rgba(16, 185, 129, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(59, 130, 246, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(107, 114, 128, 0.7)',
      ],
      borderWidth: 0,
    },
  ],
};