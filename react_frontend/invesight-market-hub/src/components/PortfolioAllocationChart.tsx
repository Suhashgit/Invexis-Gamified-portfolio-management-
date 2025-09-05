import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PortfolioAllocationChartProps {
  weights: { [key: string]: number };
  selectedStocks: string[];
}

// Ensure these colors match your global theme or component's color palette
const COLORS_ALLOCATION = {
  AAPL: "#00D2FF",
  MSFT: "#FF6B6B",
  GOOG: "#4ECDC4",
  AMZN: "#45B7D1",
  NVDA: "#96CEB4",
  TSLA: "#FFD93D",
  JPM: "#6C5CE7",
  GS: "#A29BFE",
  XOM: "#FD79A8",
  CVX: "#FDCB6E",
  PG: "#6C5CE7", // Example duplicate color, ensure your palette has enough distinct colors
  KO: "#E17055",
  PEP: "#00B894"
};

export const PortfolioAllocationChart = ({ weights, selectedStocks }: PortfolioAllocationChartProps) => {
  // Filter out stocks with zero or negative weights for allocation chart, or handle negative weights visually if desired
  const data = selectedStocks
    .filter(stock => (weights[stock] || 0) > 0) // Only include positive weights
    .map(stock => ({
      name: stock,
      value: weights[stock],
      percentage: ((weights[stock] || 0) * 100).toFixed(1)
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-green-400">{data.percentage}%</p>
          <p className="text-slate-400">${(data.value * 100000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 max-h-40 overflow-y-auto"> {/* Added scroll for many items */}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white text-sm">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Only render chart if there's data to show
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-400 text-center">Enter positive weights (summing to 1.0) to see allocation</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            labelLine={false} // Hide lines to labels
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`} // Show percentage directly on slice
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS_ALLOCATION[entry.name as keyof typeof COLORS_ALLOCATION] || "#94a3b8"} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};