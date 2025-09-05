import yfinance as yf
import numpy as np
import pandas as pd
from scipy.stats import norm
from typing import List, Dict, Union

# Define as a global constant for the module
# This factor multiplies the volatility component in the GBM simulation.
# Use 1.0 for standard behavior. Increase (e.g., 5.0, 10.0, 20.0) for diagnostic purposes if variance is too low.
VOLATILITY_MAGNIFICATION_FACTOR_GLOBAL = 1.0 # <--- SET THIS TO 10.0 FOR DIAGNOSIS. Change to 1.0 for production if it works.


def get_MonteCarloPaths_CorrelatedMultiAsset(
    symbols: List[str],
    cov_matrix: np.ndarray, # Pass the covariance matrix from Black-Litterman
    period: str = "10y",
    time_intervals: int = 252, # Default to ~1 year of trading days
    iteration: int = 1000      # Number of simulation paths
) -> Dict[str, np.ndarray]:
    """
    Generates correlated Monte Carlo price paths for multiple assets using Geometric Brownian Motion.

    Args:
        symbols: List of stock ticker symbols. The order must match the order of assets in cov_matrix.
        cov_matrix: (N, N) NumPy array of the covariance matrix of log returns for the symbols.
                    This should come from your Black-Litterman setup.
        period: Historical data period (e.g., "1y", "6mo") for calculating initial drift.
        time_intervals: Number of time steps (e.g., trading days) for the simulation.
        iteration: Number of independent simulation paths.

    Returns:
        A dictionary where keys are stock symbols and values are NumPy arrays
        of simulated price paths (shape: time_intervals, iteration).
    """
    if not symbols:
        print("No symbols provided for Monte Carlo simulation.")
        return {}

    # 1. Download historical data for all symbols
    # Use group_by='ticker' for multi-symbol downloads to get MultiIndex columns
    data = yf.download(symbols, period=period, group_by='ticker', auto_adjust=True)

    prices = pd.DataFrame()
    successful_symbols = [] # Track which symbols actually downloaded data

    # Robust extraction from MultiIndex DataFrame (or flat for single symbol)
    for sym in symbols:
        try:
            if isinstance(data.columns, pd.MultiIndex): # Multi-symbol download
                if (sym, 'Adj Close') in data.columns and not data[(sym, 'Adj Close')].empty:
                    prices[sym] = data[(sym, 'Adj Close')]
                elif (sym, 'Close') in data.columns and not data[(sym, 'Close')].empty: # Fallback to 'Close'
                    prices[sym] = data[(sym, 'Close')]
                else:
                    raise KeyError(f"No valid 'Adj Close' or 'Close' data found for {sym} in MultiIndex.")
            else: # Single symbol download (columns are not MultiIndex)
                if 'Adj Close' in data.columns and not data['Adj Close'].empty:
                    prices[sym] = data['Adj Close']
                elif 'Close' in data.columns and not data['Close'].empty: # Fallback to 'Close'
                    prices[sym] = data['Close']
                else:
                    raise KeyError(f"No valid 'Adj Close' or 'Close' data found for single symbol {sym}.")
            
            successful_symbols.append(sym)
        except KeyError as e:
            print(f"WARNING: Skipping '{sym}' due to missing or empty data: {e}. This symbol will be excluded from MC simulation.")

    if not successful_symbols:
        print("ERROR: No valid stock data found for any of the provided symbols for Monte Carlo. Cannot proceed.")
        return {} 

    prices = prices[successful_symbols].dropna()
    
    symbols_for_mc = successful_symbols
    num_assets = len(symbols_for_mc) 

    if prices.empty or len(prices) < 2:
        print(f"ERROR: Not enough historical data for {symbols_for_mc} to run Monte Carlo (need at least 2 data points after dropping NaNs).")
        return {sym: np.zeros((time_intervals, iteration)) for sym in symbols_for_mc}

    returns = np.log(prices / prices.shift(1)).dropna()

    if returns.empty:
        print(f"ERROR: Not enough valid returns for {symbols_for_mc} to run Monte Carlo.")
        return {sym: np.zeros((time_intervals, iteration)) for sym in symbols_for_mc}

    returns = returns[symbols_for_mc] # Ensure returns DataFrame uses the filtered symbols

    mean_log_returns = returns.mean().values
    
    if cov_matrix.shape != (num_assets, num_assets):
        raise ValueError(f"Covariance matrix dimensions {cov_matrix.shape} do not match the number of SUCCESSFULLY PROCESSED symbols ({num_assets}). "
                         "Ensure your cov_matrix corresponds to the `symbols` list that actually returned data.")

    try:
        cholesky_matrix = np.linalg.cholesky(cov_matrix)
    except np.linalg.LinAlgError:
        print(f"WARNING: Covariance matrix for {symbols_for_mc} is not positive semi-definite. Adding a small diagonal jitter.")
        covariance_matrix_jittered = cov_matrix + np.eye(num_assets) * 1e-7
        try:
            cholesky_matrix = np.linalg.cholesky(covariance_matrix_jittered)
        except np.linalg.LinAlgError as e:
            print(f"CRITICAL ERROR: Still cannot perform Cholesky decomposition after jitter: {e}. Returning empty paths.")
            return {sym: np.zeros((time_intervals, iteration)) for sym in symbols_for_mc}

    # DEBUG PRINT: Check mean log returns and diagonal of cov_matrix used for drift/diffusion
    print("\n--- DEBUG MC INPUTS ---")
    print(f"Mean log returns: {mean_log_returns}")
    print(f"Variances (diagonal of cov_matrix): {np.diag(cov_matrix)}")
    print(f"Square root of variances (stdevs): {np.sqrt(np.diag(cov_matrix))}")

    drift_vector = mean_log_returns - 0.5 * np.diag(cov_matrix)
    
    # DEBUG PRINT: Check the drift vector
    print(f"Drift vector: {drift_vector}")


    drift_vector_reshaped = drift_vector[:, np.newaxis, np.newaxis]

    S0_vector = prices.iloc[-1].values
    S0_vector_reshaped = S0_vector[:, np.newaxis]

    all_price_paths_raw = np.zeros((num_assets, iteration, time_intervals))
    all_price_paths_raw[:, :, 0] = S0_vector_reshaped

    independent_shocks = norm.ppf(np.random.rand(num_assets, iteration, time_intervals - 1))
    correlated_random_shocks = np.einsum('ij,jkl->ikl', cholesky_matrix, independent_shocks)

    # --- FIX/DEBUG: Apply global volatility magnification factor ---
    stdev_diag_cov = np.sqrt(np.diag(cov_matrix))[:, np.newaxis, np.newaxis]
    random_term = correlated_random_shocks * stdev_diag_cov * VOLATILITY_MAGNIFICATION_FACTOR_GLOBAL # <--- Applied global factor

    # DEBUG PRINT: Check daily return components after magnification
    print("\n--- DEBUG DAILY RETURN COMPONENTS ---")
    print(f"VOLATILITY_MAGNIFICATION_FACTOR_GLOBAL being used: {VOLATILITY_MAGNIFICATION_FACTOR_GLOBAL}") # Debug print
    print(f"Shape of drift_vector_reshaped: {drift_vector_reshaped.shape}")
    print(f"Shape of random_term (after magnification): {random_term.shape}")
    print(f"Mean of drift_vector_reshaped: {np.mean(drift_vector_reshaped)}")
    print(f"Mean of random_term (after magnification): {np.mean(random_term)}")
    print(f"Std Dev of random_term (after magnification): {np.std(random_term)}")
    if random_term.shape[0] > 0 and random_term.shape[1] > 0 and random_term.shape[2] > 5:
        print(f"Sample random_term (first asset, first path, first 5 days): {random_term[0, 0, :5]}")
        print(f"Sample drift_plus_random (first asset, first path, first 5 days): {(drift_vector_reshaped + random_term)[0, 0, :5]}")


    daily_returns_matrix = np.exp(drift_vector_reshaped + random_term) 

    # DEBUG PRINT: Check properties of daily_returns_matrix
    print("\n--- DEBUG DAILY RETURNS MATRIX ---")
    print(f"Shape of daily_returns_matrix: {daily_returns_matrix.shape}")
    print(f"Mean of daily_returns_matrix: {np.mean(daily_returns_matrix)}")
    print(f"Std Dev of daily_returns_matrix: {np.std(daily_returns_matrix)}")
    if daily_returns_matrix.shape[0] > 0 and daily_returns_matrix.shape[1] > 0 and daily_returns_matrix.shape[2] > 5:
        print(f"Sample daily_returns_matrix (first asset, first path, first 5 days): {daily_returns_matrix[0, 0, :5]}")
    

    for t in range(1, time_intervals):
        all_price_paths_raw[:, :, t] = all_price_paths_raw[:, :, t-1] * daily_returns_matrix[:, :, t-1]

    simulated_paths_dict = {}
    for i, sym in enumerate(symbols_for_mc):
        simulated_paths_dict[sym] = all_price_paths_raw[i, :, :].T

    return simulated_paths_dict

def simulate_portfolio_value(initial_portfolio_value: float,
                             optimal_weights: np.ndarray,
                             simulated_asset_paths: Dict[str, np.ndarray]) -> np.ndarray:
    """
    Simulates the total portfolio value over time using individual asset paths and optimal weights.
    Assumes a fixed weighting (no rebalancing) throughout the simulation horizon.

    Args:
        initial_portfolio_value: The starting value of the portfolio.
        optimal_weights: (N, 1) array of optimal portfolio weights for each asset.
        simulated_asset_paths: Dictionary {symbol: (time_intervals, iteration) array}
                               containing simulated price paths for each asset.

    Returns:
        Posterior expected returns (N, 1) array.
    """
    if not simulated_asset_paths:
        print("No simulated asset paths provided.")
        return np.array([])

    symbols_in_order = list(simulated_asset_paths.keys())
    
    if optimal_weights.shape[0] != len(symbols_in_order):
        raise ValueError("Number of optimal weights does not match number of simulated assets.")

    optimal_weights_flat = optimal_weights.flatten()

    time_intervals, num_iterations = simulated_asset_paths[symbols_in_order[0]].shape

    portfolio_values = np.zeros((time_intervals, num_iterations))

    initial_allocations = initial_portfolio_value * optimal_weights_flat

    initial_prices = np.array([simulated_asset_paths[sym][0, 0] for sym in symbols_in_order])

    num_shares = np.zeros_like(initial_allocations)
    non_zero_price_indices = initial_prices != 0
    num_shares[non_zero_price_indices] = initial_allocations[non_zero_price_indices] / initial_prices[non_zero_price_indices]

    for i in range(num_iterations):
        for t in range(1, time_intervals): # Changed range to start from 1 to align with returns calculation
            current_portfolio_value_path_i = 0
            for j, sym in enumerate(symbols_in_order):
                asset_value_in_path_i_at_t = num_shares[j] * simulated_asset_paths[sym][t, i]
                current_portfolio_value_path_i += asset_value_in_path_i_at_t
            portfolio_values[t, i] = current_portfolio_value_path_i
        # Set initial value for portfolio_values for day 0
        portfolio_values[0, i] = initial_portfolio_value # Ensure day 0 is correct

    return portfolio_values

# --- Test block for montecarlo.py (will only run if montecarlo.py is executed directly) ---
if __name__ == "__main__":
    print("--- Running standalone tests for montecarlo.py ---")
    
    test_symbols_mc = ['AAPL', 'MSFT'] # Use distinct name for test symbols to avoid confusion
    test_period_mc = "1mo"
    test_time_intervals_mc = 20
    test_iteration_mc = 5

    # Dummy covariance matrix for testing.
    test_cov_matrix_mc = np.array([[0.0001, 0.00005], [0.00005, 0.00015]]) # Example daily covariance
    test_initial_portfolio_value_mc = 10000
    test_optimal_weights_mc = np.array([[0.6], [0.4]])

    print("\n1. Testing get_MonteCarloPaths_CorrelatedMultiAsset...")
    sim_paths_mc = get_MonteCarloPaths_CorrelatedMultiAsset(
        symbols=test_symbols_mc,
        cov_matrix=test_cov_matrix_mc,
        period=test_period_mc,
        time_intervals=test_time_intervals_mc,
        iteration=test_iteration_mc
    )

    if sim_paths_mc:
        # Get the actual symbols that were successfully simulated
        actual_simulated_symbols = list(sim_paths_mc.keys())
        print(f"Generated paths for {actual_simulated_symbols}. Example path for {actual_simulated_symbols[0]}:\n{sim_paths_mc[actual_simulated_symbols[0]][:, 0]}")

        print("\n2. Testing simulate_portfolio_value...")
        
        # As a robust measure for this test, let's create a dummy optimal_weights_mc that
        # perfectly matches `actual_simulated_symbols` and sums to 1.
        if len(actual_simulated_symbols) > 0:
            dummy_optimal_weights_mc_aligned = np.ones((len(actual_simulated_symbols), 1)) / len(actual_simulated_symbols)
        else:
            dummy_optimal_weights_mc_aligned = np.array([]) # No weights if no symbols

        if dummy_optimal_weights_mc_aligned.size > 0:
            portfolio_val_mc = simulate_portfolio_value(
                initial_portfolio_value=test_initial_portfolio_value_mc,
                optimal_weights=dummy_optimal_weights_mc_aligned, # Use the aligned dummy weights
                simulated_asset_paths=sim_paths_mc
            )
            print(f"Simulated portfolio value. Example path 1:\n{portfolio_val_mc[:, 0]}")
        else:
            print("Skipping portfolio value simulation as no assets were successfully simulated.")

    else:
        print("Skipping portfolio value simulation due to failed asset path generation.")

    print("\n--- montecarlo.py tests complete ---")