import React, { useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  ArrowRight, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  Brain,
  Languages,
  Users
} from 'lucide-react';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  
  // Call Handling Efficiency Data
  const callHandlingData = {
    labels: ['Initial Response', 'Classification', 'Routing', 'Resource Allocation', 'Total Process'],
    datasets: [
      {
        label: 'AI System (seconds)',
        data: [2.3, 1.8, 1.2, 3.5, 8.8],
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Traditional System (seconds)',
        data: [15.2, 25.4, 18.7, 30.1, 89.4],
        backgroundColor: 'rgba(100, 116, 139, 0.7)',
        borderColor: 'rgba(100, 116, 139, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Call Prioritization Accuracy Data
  const prioritizationData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        label: 'Correct Classification',
        data: [92, 87, 83, 91],
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
      {
        label: 'Incorrect Classification',
        data: [8, 13, 17, 9],
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // AI Call Routing Success Rate Data
  const routingSuccessData = {
    labels: ['Medical', 'Fire', 'Police', 'Natural Disaster', 'Other'],
    datasets: [
      {
        data: [94, 91, 88, 85, 79],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(107, 114, 128, 0.7)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(107, 114, 128, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Emotion Detection Effectiveness Data
  const emotionDetectionData = {
    labels: ['Distress', 'Panic', 'Fear', 'Anger', 'Sadness'],
    datasets: [
      {
        label: 'Correctly Detected',
        data: [87, 92, 85, 78, 81],
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Incorrectly Detected',
        data: [13, 8, 15, 22, 19],
        backgroundColor: 'rgba(100, 116, 139, 0.7)',
        borderColor: 'rgba(100, 116, 139, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Language Distribution Data
  const languageDistributionData = {
    labels: ['Malayalam', 'English', 'Hindi'],
    datasets: [
      {
        data: [65, 25, 10],
        backgroundColor: [
          'rgba(139, 92, 246, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
        ],
        borderColor: [
          'rgba(139, 92, 246, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Human Operator Workload Reduction Data
  const workloadReductionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'AI-Handled Calls (%)',
        data: [45, 48, 52, 58, 63, 67, 72, 75, 78, 82, 85, 88],
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Human-Assisted Calls (%)',
        data: [55, 52, 48, 42, 37, 33, 28, 25, 22, 18, 15, 12],
        borderColor: 'rgba(100, 116, 139, 1)',
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };
  
  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#cbd5e1',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(71, 85, 105, 0.2)',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
        },
        beginAtZero: true,
      },
    },
  };
  
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#cbd5e1',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
      },
    },
  };
  
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#cbd5e1',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(71, 85, 105, 0.2)',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
        },
        beginAtZero: true,
      },
    },
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-dark-200 rounded-lg overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm ${
                timeRange === 'day' ? 'bg-primary-600 text-white' : 'text-secondary-400'
              }`}
              onClick={() => setTimeRange('day')}
            >
              Day
            </button>
            <button
              className={`px-3 py-1.5 text-sm ${
                timeRange === 'week' ? 'bg-primary-600 text-white' : 'text-secondary-400'
              }`}
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button
              className={`px-3 py-1.5 text-sm ${
                timeRange === 'month' ? 'bg-primary-600 text-white' : 'text-secondary-400'
              }`}
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
            <button
              className={`px-3 py-1.5 text-sm ${
                timeRange === 'year' ? 'bg-primary-600 text-white' : 'text-secondary-400'
              }`}
              onClick={() => setTimeRange('year')}
            >
              Year
            </button>
          </div>
          
          <button className="btn btn-outline text-sm py-1.5 px-3">
            <Calendar size={16} className="mr-1" />
            Custom Range
          </button>
          
          <button className="btn btn-outline text-sm py-1.5 px-3">
            <Download size={16} className="mr-1" />
            Export
          </button>
        </div>
      </div>
      
      {/* AI Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary-400 text-sm">AI Response Time</p>
              <h3 className="text-2xl font-bold mt-1 text-white">8.8s</h3>
              <div className="flex items-center mt-2">
                <span className="text-xs font-medium text-green-500">-90.2%</span>
                <span className="text-xs text-secondary-500 ml-1">vs traditional</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-dark-300">
              <Clock size={24} className="text-primary-400" />
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Classification Accuracy</p>
              <h3 className="text-2xl font-bold mt-1 text-white">88.3%</h3>
              <div className="flex items-center mt-2">
                <span className="text-xs font-medium text-green-500">+5.2%</span>
                <span className="text-xs text-secondary-500 ml-1">vs last month</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-dark-300">
              <CheckCircle size={24} className="text-success" />
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Emotion Detection</p>
              <h3 className="text-2xl font-bold mt-1 text-white">84.6%</h3>
              <div className="flex items-center mt-2">
                <span className="text-xs font-medium text-green-500">+3.8%</span>
                <span className="text-xs text-secondary-500 ml-1">vs last month</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-dark-300">
              <Brain size={24} className="text-info" />
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-secondary-400 text-sm">Human Intervention</p>
              <h3 className="text-2xl font-bold mt-1 text-white">12%</h3>
              <div className="flex items-center mt-2">
                <span className="text-xs font-medium text-green-500">-6%</span>
                <span className="text-xs text-secondary-500 ml-1">vs last month</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-dark-300">
              <Users size={24} className="text-warning" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Call Handling Efficiency */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Call Handling Efficiency</h2>
            <p className="text-sm text-secondary-400 mt-1">
              Time taken to classify and route emergency calls (in seconds)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <Filter size={16} className="text-secondary-400" />
            </button>
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <RefreshCw size={16} className="text-secondary-400" />
            </button>
          </div>
        </div>
        
        <div className="h-80">
          <Bar data={callHandlingData} options={barOptions} />
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-dark-300 rounded-lg p-4">
            <p className="text-sm text-secondary-400">Average Time Saved</p>
            <p className="text-xl font-semibold text-white mt-1">80.6 seconds</p>
            <p className="text-xs text-secondary-500 mt-1">Per emergency call</p>
          </div>
          <div className="bg-dark-300 rounded-lg p-4">
            <p className="text-sm text-secondary-400">Efficiency Improvement</p>
            <p className="text-xl font-semibold text-green-500 mt-1">90.2%</p>
            <p className="text-xs text-secondary-500 mt-1">Compared to traditional systems</p>
          </div>
        </div>
      </div>
      
      {/* Call Prioritization and Routing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Prioritization Accuracy */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Call Prioritization Accuracy</h2>
              <p className="text-sm text-secondary-400 mt-1">
                AI's accuracy in detecting priority levels using emotion analysis
              </p>
            </div>
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <RefreshCw size={16} className="text-secondary-400" />
            </button>
          </div>
          
          <div className="h-80">
            <Bar data={prioritizationData} options={barOptions} />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-secondary-400">Overall Accuracy</p>
            <p className="text-xl font-semibold text-white mt-1">88.3%</p>
          </div>
        </div>
        
        {/* AI Call Routing Success Rate */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Call Routing Success Rate</h2>
              <p className="text-sm text-secondary-400 mt-1">
                % of calls correctly classified by emergency type
              </p>
            </div>
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <RefreshCw size={16} className="text-secondary-400" />
            </button>
          </div>
          
          <div className="h-80 flex items-center justify-center">
            <div className="w-3/4 h-full">
              <Doughnut data={routingSuccessData} options={pieOptions} />
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-secondary-400">Average Success Rate</p>
            <p className="text-xl font-semibold text-white mt-1">87.4%</p>
          </div>
        </div>
      </div>
      
      {/* Emotion Detection and Language Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Detection Effectiveness */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Emotion Detection Effectiveness</h2>
              <p className="text-sm text-secondary-400 mt-1">
                AI's ability to detect emotional states in callers
              </p>
            </div>
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <RefreshCw size={16} className="text-secondary-400" />
            </button>
          </div>
          
          <div className="h-80">
            <Bar data={emotionDetectionData} options={barOptions} />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-secondary-400">Overall Detection Accuracy</p>
            <p className="text-xl font-semibold text-white mt-1">84.6%</p>
          </div>
        </div>
        
        {/* Language Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Language Distribution</h2>
              <p className="text-sm text-secondary-400 mt-1">
                Distribution of calls handled in different languages
              </p>
            </div>
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <Languages size={16} className="text-secondary-400" />
            </button>
          </div>
          
          <div className="h-80 flex items-center justify-center">
            <div className="w-3/4 h-full">
              <Pie data={languageDistributionData} options={pieOptions} />
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mx-auto"></div>
              <p className="text-xs text-secondary-400 mt-1">Malayalam</p>
              <p className="text-sm font-semibold text-white">65%</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto"></div>
              <p className="text-xs text-secondary-400 mt-1">English</p>
              <p className="text-sm font-semibold text-white">25%</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 mx-auto"></div>
              <p className="text-xs text-secondary-400 mt-1">Hindi</p>
              <p className="text-sm font-semibold text-white">10%</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Human Operator Workload Reduction */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Human Operator Workload Reduction</h2>
            <p className="text-sm text-secondary-400 mt-1">
              % of cases handled by AI vs. human intervention over time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <Filter size={16} className="text-secondary-400" />
            </button>
            <button className="p-2 rounded bg-dark-300 hover:bg-secondary-800 transition-colors">
              <RefreshCw size={16} className="text-secondary-400" />
            </button>
          </div>
        </div>
        
        <div className="h-80">
          <Line data={workloadReductionData} options={lineOptions} />
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-dark-300 rounded-lg p-4">
            <p className="text-sm text-secondary-400">Current AI Handling</p>
            <p className="text-xl font-semibold text-white mt-1">88%</p>
            <p className="text-xs text-green-500 mt-1">+3% vs last month</p>
          </div>
          <div className="bg-dark-300 rounded-lg p-4">
            <p className="text-sm text-secondary-400">Human Intervention</p>
            <p className="text-xl font-semibold text-white mt-1">12%</p>
            <p className="text-xs text-green-500 mt-1">-3% vs last month</p>
          </div>
          <div className="bg-dark-300 rounded-lg p-4">
            <p className="text-sm text-secondary-400">Projected Next Quarter</p>
            <p className="text-xl font-semibold text-white mt-1">92%</p>
            <p className="text-xs text-secondary-500 mt-1">AI handling rate</p>
          </div>
        </div>
      </div>
      
      {/* System Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-white">System Uptime</h3>
            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">Excellent</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">99.98%</span>
            <span className="text-sm text-green-500 pb-1">+0.03%</span>
          </div>
          <p className="text-xs text-secondary-500 mt-1">Last 30 days</p>
          
          <div className="mt-4 h-10">
            <div className="h-2 w-full bg-dark-300 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '99.98%' }}></div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-white">API Response Time</h3>
            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">Good</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">124ms</span>
            <span className="text-sm text-green-500 pb-1">-15ms</span>
          </div>
          <p className="text-xs text-secondary-500 mt-1">Average</p>
          
          <div className="mt-4 h-10">
            <div className="h-2 w-full bg-dark-300 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-white">Error Rate</h3>
            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">Low</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">0.12%</span>
            <span className="text-sm text-green-500 pb-1">-0.05%</span>
          </div>
          <p className="text-xs text-secondary-500 mt-1">Last 7 days</p>
          
          <div className="mt-4 h-10">
            <div className="h-2 w-full bg-dark-300 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '99.88%' }}></div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-white">Model Training</h3>
            <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full">In Progress</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">v2.4.1</span>
          </div>
          <p className="text-xs text-secondary-500 mt-1">Next release: 3 days</p>
          
          <div className="mt-4 h-10">
            <div className="h-2 w-full bg-dark-300 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;