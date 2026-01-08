import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { NutritionData } from '../types';

interface NutritionChartProps {
  data: NutritionData;
}

const NutritionChart: React.FC<NutritionChartProps> = ({ data }) => {
  const chartData = [
    { name: '蛋白质', value: data.protein, color: '#3b82f6' }, // Blue
    { name: '碳水', value: data.carbs, color: '#10b981' }, // Emerald
    { name: '脂肪', value: data.fat, color: '#f59e0b' }, // Amber
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`${value}g`, '含量']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NutritionChart;
