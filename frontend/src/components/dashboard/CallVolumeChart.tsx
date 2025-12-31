import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CallVolumeChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
      fill: boolean;
    }[];
  };
  period?: 'daily' | 'weekly' | 'monthly';
  height?: number;
}

const CallVolumeChart: React.FC<CallVolumeChartProps> = ({ 
  data, 
  period = 'weekly',
  height = 300
}) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
          stepSize: 20,
        },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (tooltipItems: any) => {
            return `${tooltipItems[0].label}`;
          },
          label: (context: any) => {
            return `Calls: ${context.parsed.y}`;
          },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 2,
        hoverRadius: 5,
        backgroundColor: '#8b5cf6',
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    },
  };

  const periodLabels = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
  };

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Call Volume</h3>
        <div className="text-sm text-secondary-400 bg-dark-300 px-3 py-1 rounded-full">
          {periodLabels[period]}
        </div>
      </div>
      
      <div style={{ height: `${height}px` }}>
        <Line data={data} options={options} />
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-secondary-400">Total Calls</p>
          <p className="text-lg font-semibold text-white mt-1">
            {data.datasets[0].data.reduce((a, b) => a + b, 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-secondary-400">Average</p>
          <p className="text-lg font-semibold text-white mt-1">
            {Math.round(data.datasets[0].data.reduce((a, b) => a + b, 0) / data.datasets[0].data.length)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-secondary-400">Peak</p>
          <p className="text-lg font-semibold text-white mt-1">
            {Math.max(...data.datasets[0].data)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallVolumeChart;