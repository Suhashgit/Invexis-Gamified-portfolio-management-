import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp } from "lucide-react"; 

// Define props to receive actual forecast data arrays
interface CombinedForecastChartProps {
  userPortfolioForecastData: number[] | null; // Average portfolio path for user's weights
  initialPortfolioValue: number;
  optimalPortfolioForecastData?: { [key: string]: number } | null; // Optimal weights dict, for display
  onShowOptimalClick: () => void; // Callback to tell parent to show optimal
  isOptimalVisible: boolean; // State from parent
}

// Fixed colors for consistent charting
const COLORS_CHART = {
  userPortfolio: "#10B981", // Teal/Green for user's portfolio
  optimalPortfolio: "#FFD700" // Gold for optimal portfolio
};

export const CombinedForecastChart = ({ 
    userPortfolioForecastData, 
    initialPortfolioValue,
    optimalPortfolioForecastData, // This is now the optimal weights dictionary
    onShowOptimalClick,
    isOptimalVisible
}: CombinedForecastChartProps) => {

  const chartData = useMemo(() => {
    // FIX: Add explicit check and return empty array if userPortfolioForecastData is null or empty
    if (!userPortfolioForecastData || userPortfolioForecastData.length === 0) {
      return [];
    }
    
    // Construct chartData from userPortfolioForecastData
    const dataPoints = userPortfolioForecastData.map((value, index) => {
        return { 
            day: index, // Start day from 0
            userPortfolio: value 
        };
    });

    // Ensure initial point is included correctly if not already part of data
    if (dataPoints.length > 0 && dataPoints[0].day !== 0) {
        dataPoints.unshift({ day: 0, userPortfolio: initialPortfolioValue });
    } else if (dataPoints.length === 0) {
        // This case should ideally not be hit if userPortfolioForecastData.length === 0 is handled above,
        // but included for maximum robustness.
        dataPoints.push({ day: 0, userPortfolio: initialPortfolioValue });
    }

    return dataPoints;

  }, [userPortfolioForecastData, initialPortfolioValue]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">Day: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: 
              <span className="font-semibold"> ${entry.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // The condition for `!hasData` check below is sufficient after the useMemo fix.
  const hasData = chartData.length > 1; // More than just initial point (Day 0)

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Portfolio Forecast</span>
          {hasData && !isOptimalVisible && ( // Only show "See Optimal" if user hasn't seen it yet and there's data
            <Button
              variant="outline"
              onClick={onShowOptimalClick}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              See Optimal Allocation
            </Button>
          )}
          {isOptimalVisible && (
              <span className="text-green-400 text-sm">Optimal Portfolio Visible</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-96 flex items-center justify-center">
            <p className="text-slate-400">Allocate weights (summing to 1.0) to view portfolio forecast</p>
          </div>
        ) : (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="day" 
                  stroke="#94a3b8"
                  fontSize={12}
                  label={{ value: "Days", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  label={{ value: "Portfolio Value ($)", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94a3b8', paddingTop: '10px' }} />
                
                {/* User's Portfolio Line */}
                <Line
                  type="monotone"
                  dataKey="userPortfolio"
                  stroke={COLORS_CHART.userPortfolio}
                  strokeWidth={3}
                  dot={false}
                  name="Your Portfolio"
                />

                {/* Optimal Portfolio Line (only if visible) */}
                {/* If `isOptimalVisible` is true, the `Forecaster` parent component
                    will have updated `userPortfolioChartData` to reflect the optimal portfolio's average path.
                    So, `userPortfolio` line now represents the chosen (user or optimal) portfolio.
                    The `optimalPortfolioForecastData` prop is used purely for displaying the optimal weights breakdown.
                */}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {isOptimalVisible && optimalPortfolioForecastData && (
          <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h3 className="text-green-400 font-semibold">Optimal Allocation</h3>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(optimalPortfolioForecastData).map(([stock, weight]) => (
                <div key={stock} className="text-center">
                  <div className="text-white font-medium">{stock}</div>
                  <div className="text-green-400 text-sm">{(weight * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
            <p className="text-green-300 text-sm mt-3">
              This allocation optimizes for the best risk-adjusted returns based on your selected assets and AI insights.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};