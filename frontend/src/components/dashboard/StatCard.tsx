import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, className }) => {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-secondary-400 text-sm">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-white">{value}</h3>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-secondary-500 ml-1">vs last hour</span>
            </div>
          )}
        </div>
        
        <div className="p-3 rounded-lg bg-dark-300">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;