import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CallPriorityChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
      borderWidth: number;
    }[];
  };
}

const CallPriorityChart: React.FC<CallPriorityChartProps> = ({ data }) => {
  const options = {
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
        displayColors: true,
        usePointStyle: true,
      },
    },
    cutout: '70%',
  };

  return (
    <div className="card h-full">
      <h3 className="text-lg font-semibold text-white mb-4">Call Priority Distribution</h3>
      <div className="h-64">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
};

export default CallPriorityChart;