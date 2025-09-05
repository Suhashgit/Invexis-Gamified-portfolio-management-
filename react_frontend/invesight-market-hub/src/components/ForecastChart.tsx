
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface ForecastChartProps {
  data: any[];
  selectedStocks: string[];
}

// Colors for different stock lines
const stockColors = {
  AAPL: "#00D2FF",
  MSFT: "#FF6B6B", 
  GOOGL: "#4ECDC4",
  TSLA: "#45B7D1",
  NVDA: "#96CEB4"
};

export const ForecastChart = ({ data, selectedStocks }: ForecastChartProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: ${entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#94a3b8"
            fontSize={12}
          />
          <YAxis 
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ color: '#94a3b8' }}
          />
          {selectedStocks.map((stock) => (
            <Line
              key={stock}
              type="monotone"
              dataKey={stock}
              stroke={stockColors[stock as keyof typeof stockColors] || "#94a3b8"}
              strokeWidth={2}
              dot={{ fill: stockColors[stock as keyof typeof stockColors] || "#94a3b8", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: stockColors[stock as keyof typeof stockColors] || "#94a3b8", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
