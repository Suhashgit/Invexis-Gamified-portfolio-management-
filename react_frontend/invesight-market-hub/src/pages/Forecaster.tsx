import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockSelector } from "@/components/StockSelector";
import InVexisLogo from "@/components/Invexislogo";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

// Import all required components for the page
import { PortfolioStatsPanel } from "@/components/PortfolioStatsPanel";
import { CombinedForecastChart } from "@/components/CombinedForecastChart";
import { PortfolioWeightInput } from "@/components/PortfolioWeightInput";
import { AttemptTracker } from "@/components/AttemptTracker";
import { AITipsSection } from "@/components/AITipsSection";
import { PortfolioAllocationChart } from "@/components/PortfolioAllocationChart";
import { SingleStockChart } from "@/components/SingleStockChart"; // Import the SingleStockChart component

// Define interfaces for data received from backend
interface BackendPortfolioStats {
  expectedReturn: number;
  standardDeviation: number;
  sharpeRatio: number;
  maxDrawdown: number;
  riskCategory: 'Conservative' | 'Moderate' | 'Aggressive';
  optimalWeights: { [key: string]: number };
}

interface InitialBackendData {
  symbols: string[]; // Actual symbols processed by backend
  currentPrices: { [key: string]: number };
  optimalWeights: { [key: string]: number };
  sampleIndividualPaths: { [key: string]: number[] }; // First MC path for each stock for individual charts
}

interface SimulationBackendResponse {
  simulatedPortfolioValues: number[]; // Average portfolio path from MC
  simulatedPortfolioFinalValues: number[]; // All final values for stats (e.g., VaR)
  portfolioStats: BackendPortfolioStats; // Detailed stats for the simulated portfolio
}

const API_BASE_URL = "http://localhost:8000";

const INITIAL_PORTFOLIO_VALUE = 100000;
const SIMULATION_DEBOUNCE_TIME = 300; // Milliseconds to debounce simulation calls

const Forecaster = () => {
  const { toast } = useToast();

  const [selectedStocks, setSelectedStocks] = useState<string[]>([]); // Symbols selected by user in StockSelector
  const [weights, setWeights] = useState<{[key: string]: number}>({}); // User's input weights
  const [portfolioStats, setPortfolioStats] = useState<BackendPortfolioStats | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Overall loading state

  const [initialBackendData, setInitialBackendData] = useState<InitialBackendData | null>(null); // Data from /initialize-data
  const [userPortfolioChartData, setUserPortfolioChartData] = useState<number[] | null>(null); // Average portfolio path
  const [showOptimalPortfolioLine, setShowOptimalPortfolioLine] = useState(false);

  // Ref for the timeout ID to debounce simulation requests
  const simulateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to store the *last successfully initialized* symbols from the backend
  const lastInitializedSymbolsRef = useRef<string[]>([]);
  // Ref to store the *last weights for which simulation was successfully initiated*
  const lastSimulatedWeightsRef = useRef<{[key: string]: number}>({});


  // --- Core Simulation Function (can be called directly or via useEffect) ---
  const performSimulation = useCallback(async (
    symbolsForSimulation: string[],
    weightsForSimulation: {[key: string]: number}
  ) => {
    // Validate inputs before sending
    if (!symbolsForSimulation || symbolsForSimulation.length === 0 || !weightsForSimulation) {
      setUserPortfolioChartData(null);
      setPortfolioStats(null);
      return;
    }
    const totalWeight = Object.values(weightsForSimulation).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      setUserPortfolioChartData(null);
      setPortfolioStats(null);
      return; // Weights not valid, do not simulate
    }

    setIsLoading(true);
    // Clear any existing timeout before making a new request
    if (simulateTimeoutRef.current) {
        clearTimeout(simulateTimeoutRef.current);
        simulateTimeoutRef.current = null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: symbolsForSimulation, // Use the symbols passed explicitly
          weights: weightsForSimulation, // Use the weights passed explicitly
          initialPortfolioValue: INITIAL_PORTFOLIO_VALUE
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to simulate portfolio from backend.");
      }

      const data: SimulationBackendResponse = await response.json();
      setUserPortfolioChartData(data.simulatedPortfolioValues);
      setPortfolioStats(data.portfolioStats);

      // CRITICAL: Update ref with the weights that just successfully triggered a simulation
      lastSimulatedWeightsRef.current = weightsForSimulation; 

      toast({
        title: "Simulation Complete",
        description: "Your portfolio's forecast has been generated!",
        duration: 3000,
      });

    } catch (error: any) {
      console.error("Error simulating user portfolio:", error);
      toast({
        title: "Simulation Failed",
        description: error.message || "Could not simulate portfolio. Check console for details.",
        variant: "destructive",
        duration: 5000,
      });
      setUserPortfolioChartData(null);
      setPortfolioStats(null);
    } finally {
      setIsLoading(false);
      simulateTimeoutRef.current = null; // Clear timeout reference
    }
  }, [toast]); // Dependencies for useCallback


  // --- Initialization Effect: Runs when `selectedStocks` (from StockSelector) changes ---
  useEffect(() => {
    const symbolsToInitialize = selectedStocks;

    if (symbolsToInitialize.length === 0) {
        setInitialBackendData(null);
        setPortfolioStats(null);
        setUserPortfolioChartData(null);
        setWeights({});
        setShowOptimalPortfolioLine(false);
        lastInitializedSymbolsRef.current = []; // Clear ref
        lastSimulatedWeightsRef.current = {}; // Clear ref
        return;
    }

    // Prevent re-initialization if the symbols haven't actually changed since last successful init
    // Compare against the content of the ref, not `initialBackendData.symbols` directly
    if (JSON.stringify(lastInitializedSymbolsRef.current) === JSON.stringify(symbolsToInitialize)) {
        console.log("Symbols unchanged since last initialization, skipping API call.");
        // If weights were changed while data was cached, still trigger a simulation
        const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
        if (Math.abs(totalWeight - 1.0) < 0.001 && JSON.stringify(weights) !== JSON.stringify(lastSimulatedWeightsRef.current)) { // Compare to last processed weights ref
             // If weights are valid AND different from last processed, trigger simulation
             performSimulation(lastInitializedSymbolsRef.current, weights);
        }
        return; // Exit as initialization is not needed
    }

    setIsLoading(true);
    // Clear any pending simulation calls before new initialization
    if (simulateTimeoutRef.current) {
        clearTimeout(simulateTimeoutRef.current);
        simulateTimeoutRef.current = null;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/portfolio/initialize-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: symbolsToInitialize })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to initialize portfolio data from backend.");
        }

        const data: InitialBackendData = await response.json();
        
        // Update states based on successful initialization
        // `selectedStocks` is updated via `handleStockSelection` which triggers this useEffect.
        setInitialBackendData(data);
        setPortfolioStats(null);
        setUserPortfolioChartData(null);
        setShowOptimalPortfolioLine(false);

        // Set initial equal weights for the *actual* symbols returned by backend
        const initialWeights: {[key: string]: number} = {};
        data.symbols.forEach(s => initialWeights[s] = 1 / data.symbols.length);
        setWeights(initialWeights); 
        
        // CRITICAL: Update refs with the *confirmed* symbols and weights from backend
        lastInitializedSymbolsRef.current = data.symbols;
        // This is the first time a simulation is triggered for these symbols/weights
        lastSimulatedWeightsRef.current = initialWeights; 

        // Trigger the *first* simulation *after* data is initialized and weights are set
        // Use a small timeout to allow React's state updates to fully commit before triggering simulation
        simulateTimeoutRef.current = setTimeout(() => {
            performSimulation(data.symbols, initialWeights);
        }, 50); // Small delay


        toast({
          title: "Data Initialized",
          description: `Successfully loaded data for ${data.symbols.length} stocks.`,
          duration: 3000,
        });

      } catch (error: any) {
        console.error("Error initializing portfolio data:", error);
        toast({
          title: "Initialization Failed",
          description: error.message || "Could not load data for selected stocks. Please check console.",
          variant: "destructive",
          duration: 5000,
        });
        // Clear all related states on error
        // `setSelectedStocks([])` is already handled by `handleStockSelection` if `symbolsToInitialize` is empty
        setInitialBackendData(null);
        setPortfolioStats(null);
        setUserPortfolioChartData(null);
        setWeights({});
        setShowOptimalPortfolioLine(false);
        lastInitializedSymbolsRef.current = []; // Clear refs on error too
        lastSimulatedWeightsRef.current = {};
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Cleanup function: clear timeout if component unmounts or dependencies change before timeout fires
    return () => {
        if (simulateTimeoutRef.current) {
            clearTimeout(simulateTimeoutRef.current);
        }
    };
  }, [selectedStocks, toast, performSimulation]); // Dependency: only run when selectedStocks (from StockSelector) changes


  // --- Effect to trigger simulation when `weights` change (debounced) ---
  // This useEffect will now *only* trigger `performSimulation` when `weights` *actually* change from user input or optimal button
  useEffect(() => {
    // Only proceed if initialBackendData is available (meaning initialization was successful)
    // and weights have changed from the last processed
    if (initialBackendData && selectedStocks.length > 0 && 
        JSON.stringify(selectedStocks) === JSON.stringify(lastInitializedSymbolsRef.current) && // Ensure symbols are consistent with initialized
        JSON.stringify(weights) !== JSON.stringify(lastSimulatedWeightsRef.current)) { // Only simulate if weights changed

        const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
        const hasValidWeights = Math.abs(totalWeight - 1.0) < 0.001;

        if (!hasValidWeights) { // If weights are invalid, clear data and don't simulate
            setUserPortfolioChartData(null);
            setPortfolioStats(null);
            return;
        }
            
        // Debounce the actual simulation call
        if (simulateTimeoutRef.current) {
            clearTimeout(simulateTimeoutRef.current);
        }

        simulateTimeoutRef.current = setTimeout(() => {
            // CRITICAL: Use `lastInitializedSymbolsRef.current` as the source of truth for symbols
            performSimulation(lastInitializedSymbolsRef.current, weights); 
        }, SIMULATION_DEBOUNCE_TIME);
    } else if (!initialBackendData || selectedStocks.length === 0) { // If no context or no stocks, clear data
        setUserPortfolioChartData(null);
        setPortfolioStats(null);
    }

    // Cleanup function
    return () => {
        if (simulateTimeoutRef.current) {
            clearTimeout(simulateTimeoutRef.current);
        }
    };
  }, [weights, initialBackendData, selectedStocks, performSimulation]); // Dependencies for simulation

  // --- Handlers for Frontend Components ---

  const handleStockSelection = (symbols: string[]) => {
    // This is the source of truth for user's selection
    setSelectedStocks(symbols); 
    // The `useEffect` above will then pick this up and call `initializePortfolioData`.
  };

  const handleWeightsChange = (newWeights: {[key: string]: number}) => {
    setWeights(newWeights); // Update weights state, which will trigger the useEffect for simulation
    setShowOptimalPortfolioLine(false); // Hide optimal line if user changes weights manually
  };

  const handleShowOptimal = () => {
    if (initialBackendData?.optimalWeights) {
        setWeights(initialBackendData.optimalWeights); // This will trigger handleWeightsChange -> useEffect
        setShowOptimalPortfolioLine(true);
        toast({
            title: "Optimal Portfolio Revealed!",
            description: "Check the chart and stats for the Black-Litterman suggested allocation.",
            duration: 5000,
        });
    } else {
        toast({
            title: "Optimal Weights Not Available",
            description: "Please select stocks and initialize data first.",
            variant: "destructive",
            duration: 3000,
        });
    }
  };


  // --- Render Logic ---
  const hasSelectedStocks = selectedStocks.length > 0;
  const hasValidWeights = hasSelectedStocks && Math.abs(Object.values(weights).reduce((sum, w) => sum + w, 0) - 1.0) < 0.001;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <nav className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <InVexisLogo />
            <div className="flex space-x-6">
              <Link to="/" className="text-slate-400 hover:text-green-400 transition-colors font-medium">Dashboard</Link>
              <Link to="/forecaster" className="text-white hover:text-green-400 transition-colors font-medium">Forecaster</Link>
              <Link to="/news" className="text-slate-400 hover:text-green-400 transition-colors font-medium">AI News</Link>
              <Link to="/community" className="text-slate-400 hover:text-green-400 transition-colors font-medium">Community</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Portfolio Forecaster</h1>
            <p className="text-slate-400">Predict future stock movements and optimize your portfolio with AI insights.</p>
          </div>

          {/* Stock Selector */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white">1. Select Stocks for Your Portfolio</CardTitle></CardHeader>
            <CardContent>
              <StockSelector onSelectionChange={handleStockSelection} />
            </CardContent>
          </Card>

          {/* Individual Stock Forecasts */}
          {hasSelectedStocks && initialBackendData && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader><CardTitle className="text-white">2. Individual Stock Forecasts</CardTitle></CardHeader>
              <CardContent>
                {isLoading && !userPortfolioChartData ? ( // Show loading only for initial data fetch / first simulation
                    <div className="text-slate-400 text-center py-8">Loading individual stock forecasts...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedStocks.map(symbol => (
                        <Card key={symbol} className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">{symbol} Forecast</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {initialBackendData.sampleIndividualPaths[symbol] && initialBackendData.sampleIndividualPaths[symbol].length > 0 ? (
                                    <div className="h-48 w-full">
                                        {/* REPLACE PLACEHOLDER WITH ACTUAL CHART COMPONENT */}
                                        <SingleStockChart
                                            symbol={symbol}
                                            simulatedPath={initialBackendData.sampleIndividualPaths[symbol]}
                                            historicalPrice={initialBackendData.currentPrices[symbol] || 0}
                                            numTimeIntervals={252} // Assuming 252 steps per year
                                        />
                                    </div>
                                ) : (
                                <p className="text-slate-400 text-center">No forecast available for {symbol}</p>
                                )}
                                <div className="mt-2 text-sm text-slate-400">
                                    Starting Price: ${initialBackendData.currentPrices[symbol]?.toFixed(2) || 'N/A'}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    </div>
                )}
              </CardContent>
            </Card>
          )}


          {/* Portfolio Weight Input */}
          {hasSelectedStocks && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader><CardTitle className="text-white">3. Allocate Portfolio Weights</CardTitle></CardHeader>
              <CardContent>
                <PortfolioWeightInput 
                  selectedStocks={selectedStocks}
                  weights={weights}
                  onWeightsChange={handleWeightsChange}
                />
              </CardContent>
            </Card>
          )}

          {/* Portfolio Allocation Chart (Pie Chart) */}
          {hasSelectedStocks && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader><CardTitle className="text-white">4. Portfolio Allocation Breakdown</CardTitle></CardHeader>
              <CardContent>
                <PortfolioAllocationChart
                  weights={weights}
                  selectedStocks={selectedStocks}
                />
              </CardContent>
            </Card>
          )}

          {/* Portfolio Statistics Panel */}
          {hasSelectedStocks && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader><CardTitle className="text-white">5. Portfolio Statistics</CardTitle></CardHeader>
              <CardContent>
                <PortfolioStatsPanel stats={portfolioStats} isLoading={isLoading} />
              </CardContent>
            </Card>
          )}

          {/* Combined Forecast Chart (User's Portfolio & Optimal) */}
          {hasSelectedStocks && userPortfolioChartData && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader><CardTitle className="text-white">6. Combined Portfolio Forecast</CardTitle></CardHeader>
              <CardContent>
                <CombinedForecastChart
                  userPortfolioForecastData={userPortfolioChartData}
                  initialPortfolioValue={INITIAL_PORTFOLIO_VALUE}
                  optimalPortfolioForecastData={initialBackendData?.optimalWeights}
                  onShowOptimalClick={handleShowOptimal}
                  isOptimalVisible={showOptimalPortfolioLine}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Attempt Tracker */}
          {hasSelectedStocks && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader><CardTitle className="text-white">Your Progress</CardTitle></CardHeader>
              <CardContent>
                <AttemptTracker 
                  selectedStocks={selectedStocks} 
                  weights={weights} 
                  portfolioStats={portfolioStats} 
                />
              </CardContent>
            </Card>
          )}

          {/* AI Tips Section */}
          {hasSelectedStocks && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader><CardTitle className="text-white">AI Portfolio Tips</CardTitle></CardHeader>
              <CardContent>
                <AITipsSection 
                  selectedStocks={selectedStocks} 
                  weights={weights} 
                  portfolioStats={portfolioStats} 
                />
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default Forecaster;