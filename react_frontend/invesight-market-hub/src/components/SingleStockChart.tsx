import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// No need to import Card components here unless they wrap the chart internally.

interface SingleStockChartProps {
  symbol: string;
  simulatedPath: number[]; // This is typically one sample path from the backend
  historicalPrice: number; // The last known historical price
  numTimeIntervals: number; // Number of steps for the x-axis
}

export const SingleStockChart = ({ 
  symbol, 
  simulatedPath, 
  historicalPrice, 
  numTimeIntervals 
}: SingleStockChartProps) => {

  const chartData = React.useMemo(() => {
    // If simulatedPath is null, undefined, or empty, return an empty array
    if (!simulatedPath || simulatedPath.length === 0) {
      return [];
    }

    // Combine historical price (day 0) with simulated path
    const dataPoints = [{ day: 0, price: historicalPrice }];
    simulatedPath.forEach((price, index) => {
      dataPoints.push({ day: index + 1, price: price });
    });
    return dataPoints;
  }, [simulatedPath, historicalPrice]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg text-sm text-white">
          <p className="font-medium mb-1">Day: {label}</p>
          <p style={{ color: payload[0].color }}>{symbol}: ${value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  // Only render chart if there's sufficient data points (more than just day 0)
  if (chartData.length <= 1) { 
    return (
      <div className="h-48 w-full flex items-center justify-center text-slate-400">
        No sufficient data for {symbol} chart.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="day" 
            stroke="#94a3b8" 
            fontSize={10}
            tickFormatter={(value) => value === 0 ? 'Start' : String(value)} // Label "Start" for day 0
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickFormatter={(value) => `$${value.toFixed(0)}`} 
            domain={['dataMin', 'dataMax']} // Adjust y-axis to data range
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 10, paddingTop: '5px' }} />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#00B894" // A nice green/teal color
            strokeWidth={2} 
            dot={false} 
            name={`${symbol} Price`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};