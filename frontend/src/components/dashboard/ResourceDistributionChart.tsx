import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ResourceDistributionChartProps {
  data: { type: string; count: number }[];
}

const ResourceDistributionChart: React.FC<ResourceDistributionChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.type),
    datasets: [
      {
        data: data.map((d) => d.count),
        backgroundColor: [
          "#ef4444", // Red
          "#f59e0b", // Amber
          "#3b82f6", // Blue
          "#10b981", // Green
          "#8b5cf6", // Purple
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#cbd5e1",
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#f1f5f9",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
      },
    },
    cutout: "70%",
  };

  return (
    <div className="card p-4">
      <h2 className="text-lg font-semibold text-white mb-2">Resource Type Distribution</h2>
      <div className="w-full h-64">
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default ResourceDistributionChart;
