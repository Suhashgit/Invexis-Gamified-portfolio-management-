import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from typing import List, Dict
import sys
import yfinance as yf # Import yfinance for individual stock historical data if needed for plotting

# Import functions from your custom modules
# Make sure blacklitterman.py and montecarlo.py are in the same directory
# or properly installed as a package.
from Blacklitterman import (
    get_implied_equilibrium_returns_and_cov,
    get_sentiment_based_views,
    calculate_posterior_returns,
    calculate_optimal_weights
)
from monte_carlo import (
    get_MonteCarloPaths_CorrelatedMultiAsset,
    simulate_portfolio_value
)

# --- GLOBAL CONFIGURATION (can be moved to a config file if project grows) ---
# Master list of symbols the user can choose from
AVAILABLE_SYMBOLS = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'JPM', 'GS', 'XOM', 'CVX', 'PG', 'KO', 'PEP']

# --- Plotting Functions ---

def plot_monte_carlo_results(simulated_values: np.ndarray, initial_value: float, title_suffix: str = ""):
    """
    Plots a subset of Monte Carlo paths, the average path, and key percentile paths for a portfolio.
    """
    plt.figure(figsize=(14, 8)) 

    num_paths_to_plot = min(200, simulated_values.shape[1]) 
    plt.plot(simulated_values[:, :num_paths_to_plot], alpha=0.08, color='lightgray', linewidth=0.8)

    p10 = np.percentile(simulated_values, 10, axis=1)
    p25 = np.percentile(simulated_values, 25, axis=1)
    p50 = np.percentile(simulated_values, 50, axis=1) # Median path
    p75 = np.percentile(simulated_values, 75, axis=1)
    p90 = np.percentile(simulated_values, 90, axis=1)

    plt.plot(p90, color='orange', linestyle=':', linewidth=1.5, label='90th Percentile')
    plt.plot(p75, color='green', linestyle=':', linewidth=1.5, label='75th Percentile')
    plt.plot(p50, color='purple', linestyle='-', linewidth=2.5, label='Median Path')
    plt.plot(p25, color='green', linestyle=':', linewidth=1.5, label='25th Percentile')
    plt.plot(p10, color='red', linestyle=':', linewidth=1.5, label='10th Percentile')

    plt.plot(np.mean(simulated_values, axis=1), color='blue', linestyle='--', linewidth=2.5, label='Average Path')
    
    plt.axhline(y=initial_value, color='black', linestyle='-.', label='Initial Value')

    plt.title(f'Monte Carlo Simulation of Portfolio Value {title_suffix}\n(Showing {num_paths_to_plot} Sample Paths & Key Percentiles)', fontsize=16)
    plt.xlabel('Time Steps (Days)', fontsize=12)
    plt.ylabel('Portfolio Value ($)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend(loc='upper left', bbox_to_anchor=(1,1))
    plt.tight_layout(rect=[0, 0, 0.88, 1])
    plt.show()

def plot_single_stock_mc(symbol: str, simulated_paths: np.ndarray, historical_price: float, time_intervals: int):
    """
    Plots Monte Carlo price paths for a single stock.
    """
    plt.figure(figsize=(12, 7))
    num_paths_to_plot = min(200, simulated_paths.shape[1])
    
    plt.plot(simulated_paths[:, :num_paths_to_plot], alpha=0.1, color='lightblue', linewidth=0.8)
    plt.plot(np.mean(simulated_paths, axis=1), color='darkblue', linestyle='--', label='Average Path')
    
    # Add percentiles for single stock too
    p10 = np.percentile(simulated_paths, 10, axis=1)
    p50 = np.percentile(simulated_paths, 50, axis=1)
    p90 = np.percentile(simulated_paths, 90, axis=1)
    
    plt.plot(p90, color='orange', linestyle=':', linewidth=1.5, label='90th Percentile')
    plt.plot(p50, color='purple', linestyle='-', linewidth=2.5, label='Median Path')
    plt.plot(p10, color='red', linestyle=':', linewidth=1.5, label='10th Percentile')

    # Ensure historical_price is a scalar before passing to axhline
    plt.axhline(y=historical_price, color='black', linestyle='-.', label='Historical Start Price') # `historical_price` is already a scalar due to .item() fix

    plt.title(f'Monte Carlo Simulation for {symbol} Stock Price\n(Showing {num_paths_to_plot} Sample Paths & Key Percentiles)', fontsize=16)
    plt.xlabel('Time Steps (Days)', fontsize=12)
    plt.ylabel('Stock Price ($)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend(loc='upper left', bbox_to_anchor=(1,1))
    plt.tight_layout(rect=[0, 0, 0.88, 1])
    plt.show()


# --- Utility Functions ---

def display_simulation_summary(simulated_values: np.ndarray, initial_value: float, time_intervals: int):
    """Prints key statistics from the Monte Carlo simulation."""
    final_values = simulated_values[-1, :]
    print(f"\n--- Simulation Summary (after {time_intervals} days) ---")
    print(f"  - Average Ending Value: ${np.mean(final_values):,.2f}")
    print(f"  - Median Ending Value: ${np.median(final_values):,.2f}")
    print(f"  - Standard Deviation of Ending Value: ${np.std(final_values):,.2f}")
    print(f"  - Minimum Ending Value (Worst Case): ${np.min(final_values):,.2f}")
    print(f"  - Maximum Ending Value (Best Case): ${np.max(final_values):,.2f}")

    var_level = 0.05
    VaR = np.percentile(final_values, var_level * 100)
    print(f"  - Value at Risk ({var_level*100:.0f}th percentile, i.e., 5% chance of falling below): ${VaR:,.2f}")
    print(f"  - Probability of ending below initial value: {np.mean(final_values < initial_value) * 100:.2f}%")
    print("\nRemember, these simulations show a *range* of possible outcomes due to market uncertainty, not a guarantee.")


def get_user_selected_symbols(available_symbols: List[str]) -> List[str]:
    """Prompts the user to select symbols from a list."""
    while True:
        print("\n--- Select Stocks for Your Portfolio ---")
        print("Available symbols: " + ", ".join(available_symbols))
        print("Enter symbols separated by commas (e.g., AAPL, MSFT, GOOG):")
        
        user_input = input("Your selection: ").strip().upper()
        selected_raw = [s.strip() for s in user_input.split(',') if s.strip()]
        
        unique_selected = list(dict.fromkeys(selected_raw).keys()) # Remove duplicates while preserving order
        
        invalid_symbols = [s for s in unique_selected if s not in available_symbols]
        
        if invalid_symbols:
            print(f"ERROR: The following symbols are not recognized or available: {', '.join(invalid_symbols)}")
            print("Please choose from the available list.")
        elif not unique_selected:
            print("ERROR: No symbols selected. Please enter at least one symbol.")
        else:
            return unique_selected


def get_user_weights(symbols: List[str]) -> np.ndarray:
    """Prompts the user to input portfolio weights for each symbol."""
    weights = []
    print("\n--- Enter Your Portfolio Weights (as decimals, e.g., 0.3 for 30%) ---")
    print("  Weights will be normalized to sum to 1. Negative weights allow short-selling (advanced).")
    for symbol in symbols:
        while True:
            try:
                weight = float(input(f"Enter weight for {symbol}: "))
                weights.append(weight)
                break
            except ValueError:
                print("Invalid input. Please enter a number.")
    
    user_weights = np.array(weights).reshape(-1, 1)
    
    # Normalize user weights to sum to 1
    total_sum = np.sum(user_weights)
    if total_sum == 0:
        print("WARNING: Your entered weights sum to zero. Defaulting to equal weights for simulation.")
        return np.ones((len(symbols), 1)) / len(symbols)
    elif abs(total_sum - 1.0) > 1e-6: # Check if sum is close to 1
        print(f"NOTE: Your weights sum to {total_sum:.2f}. Normalizing to 1.")
        return user_weights / total_sum
    else:
        return user_weights

# --- Main Portfolio Game Logic ---
if __name__ == "__main__":
    print("🚀 Welcome to the Portfolio Simulation Game! 🚀")
    print("Your goal: Allocate your initial $100,000 portfolio among selected assets.")
    print("Let's see if your intuition can beat the Black-Litterman model!")

    # --- Configuration ---
    # `AVAILABLE_SYMBOLS` is defined globally above
    initial_portfolio_value = 100000 
    historical_period = "1y" 
    num_time_intervals = 252 # Simulating for ~1 year of trading days
    num_simulations = 2000   # Number of Monte Carlo paths (keep this high for robust stats)

    # Black-Litterman Parameters
    tau_bl = 0.05 
    risk_aversion_bl = 2.5 
    risk_aversion_opt = 3.0 

    # --- Step 0: User Selects Stocks ---
    symbols_for_game = get_user_selected_symbols(AVAILABLE_SYMBOLS)
    if not symbols_for_game:
        print("No valid symbols selected. Exiting game.")
        sys.exit(0) # Exit gracefully if no symbols are chosen

    # --- Step 1: Initialize Market Data ---
    print("\n--- Initializing Market Data (fetching historical prices & calculating covariance) ---")
    try:
        # get_implied_equilibrium_returns_and_cov returns `final_symbols` which are the ones successfully processed
        implied_eq_returns_daily, cov_matrix_daily_np, actual_symbols_processed = get_implied_equilibrium_returns_and_cov(
            symbols=symbols_for_game, period=historical_period, risk_aversion=risk_aversion_bl
        )
        # Update the symbols list that the rest of the game will use to ensure consistency
        symbols_for_game = actual_symbols_processed
        
        if not symbols_for_game:
            print("ERROR: No assets could be processed due to data issues during initial download. Exiting.")
            sys.exit(1)
        
        print(f"Market Data Loaded for {len(symbols_for_game)} assets: {', '.join(symbols_for_game)}")
        
    except ValueError as e:
        print(f"ERROR: Failed to load market data: {e}. Please check symbols or internet connection.")
        sys.exit(1)

    # --- Step 2: Pre-simulate Asset Paths (once for efficiency and individual plots) ---
    print("\n--- Pre-simulating individual asset price paths (generating possible future scenarios) ---")
    # This will generate paths for the `symbols_for_game` (which are already filtered)
    shared_simulated_asset_paths = get_MonteCarloPaths_CorrelatedMultiAsset(
        symbols=symbols_for_game, 
        cov_matrix=cov_matrix_daily_np, # This cov matrix is already aligned with `symbols_for_game`
        period=historical_period, # Use same period for consistency
        time_intervals=num_time_intervals,
        iteration=num_simulations
    )
    if not shared_simulated_asset_paths:
        print("ERROR: Individual asset simulation failed. Cannot continue game.")
        sys.exit(1)
    
    # Final check: update symbols_for_game based on what MC simulation *actually* generated paths for
    symbols_for_game = list(shared_simulated_asset_paths.keys())
    if not symbols_for_game:
        print("ERROR: No assets successfully simulated. Exiting game.")
        sys.exit(1)

    print(f"Generated {num_simulations} Monte Carlo paths for {len(symbols_for_game)} assets.")

    # --- Step 3: Show Individual Stock Simulations ---
    print("\n--- Individual Stock Performance Preview ---")
    print("Here's a preview of how each selected stock *might* perform in the future, based on historical data.")
    for symbol in symbols_for_game:
        sim_paths_for_stock = shared_simulated_asset_paths[symbol]
        
        # Get the actual last historical price for plotting reference
        try:
            hist_data = yf.download(symbol, period='1d', auto_adjust=True, progress=False)
            if not hist_data.empty and 'Close' in hist_data.columns:
                 historical_start_price = hist_data['Close'].iloc[-1].item() # .item() to get scalar
            elif 'Adj Close' in hist_data.columns and not hist_data['Adj Close'].empty:
                 historical_start_price = hist_data['Adj Close'].iloc[-1].item() # .item() to get scalar
            else:
                 print(f"Warning: Could not get last historical price for {symbol}. Using simulated start price.")
                 historical_start_price = sim_paths_for_stock[0, 0].item() # .item() for consistency
        except Exception as e:
            print(f"Warning: Error fetching historical price for {symbol}: {e}. Using simulated start price.")
            historical_start_price = sim_paths_for_stock[0, 0].item() # .item() for consistency

        plot_single_stock_mc(symbol, sim_paths_for_stock, historical_start_price, num_time_intervals)
        print(f"\nSummary for {symbol}:")
        display_simulation_summary(sim_paths_for_stock, historical_start_price, num_time_intervals)
        input("Press Enter to see the next stock simulation... (or Ctrl+C to quit early)") # Pause for user
    print("Individual stock previews complete.")


    # --- Step 4: Get Sentiment-Based Views (for Black-Litterman) ---
    print("\n--- Analyzing Current Market Sentiment for Views ---")
    P_matrix, Q_vector, Omega_matrix = get_sentiment_based_views(
        symbols=symbols_for_game, cov_matrix=cov_matrix_daily_np
    )
    if P_matrix.shape[0] == 0:
        print("No significant views generated from sentiment analysis. This means the Black-Litterman model will rely heavily on the market's implied returns for its optimal solution.")
    else:
        print(f"Generated {P_matrix.shape[0]} views based on sentiment analysis.")


    # --- Step 5: Calculate Black-Litterman Optimal Weights (the "answer") ---
    print("\n--- Calculating Black-Litterman Optimal Portfolio (the hidden solution) ---")
    bl_posterior_returns = calculate_posterior_returns(
        implied_eq_returns=implied_eq_returns_daily,
        cov_matrix=cov_matrix_daily_np,
        P_matrix=P_matrix,
        Q_vector=Q_vector,
        Omega_matrix=Omega_matrix,
        tau=tau_bl
    )
    bl_optimal_weights = calculate_optimal_weights(
        posterior_returns=bl_posterior_returns,
        cov_matrix=cov_matrix_daily_np,
        risk_aversion=risk_aversion_opt
    )
    
    # --- Game Play Loop ---
    while True:
        print("\n" + "="*70)
        print("YOUR TURN! Design your portfolio weights for the next year.")
        print(f"You have {len(symbols_for_game)} assets: {', '.join(symbols_for_game)}")
        print("="*70)

        user_choice_weights = get_user_weights(symbols_for_game)
        print("\nYour Chosen Weights:")
        print(pd.DataFrame(user_choice_weights, index=symbols_for_game, columns=['Weight']))

        print("\n--- Simulating YOUR Portfolio's Future Performance ---")
        user_portfolio_values = simulate_portfolio_value(
            initial_portfolio_value=initial_portfolio_value,
            optimal_weights=user_choice_weights,
            simulated_asset_paths=shared_simulated_asset_paths
        )

        plot_monte_carlo_results(user_portfolio_values, initial_portfolio_value, title_suffix=" - YOUR Portfolio")
        display_simulation_summary(user_portfolio_values, initial_portfolio_value, num_time_intervals)

        play_again_input = input("\nWould you like to (1) Try different weights ('yes'), (2) See the optimal solution ('show'), or (3) Exit the game ('exit')? Enter your choice: ").lower().strip()
        
        if play_again_input == 'show':
            print("\n" + "="*70)
            print("💡 REVEALING THE BLACK-LITTERMAN OPTIMAL SOLUTION! 💡")
            print("="*70)

            print("\nBlack-Litterman Optimal Weights:")
            print(pd.DataFrame(bl_optimal_weights, index=symbols_for_game, columns=['Weight']))

            print("\n--- Simulating BLACK-LITTERMAN Optimal Portfolio ---")
            bl_portfolio_values = simulate_portfolio_value(
                initial_portfolio_value=initial_portfolio_value,
                optimal_weights=bl_optimal_weights,
                simulated_asset_paths=shared_simulated_asset_paths
            )
            plot_monte_carlo_results(bl_portfolio_values, initial_portfolio_value, title_suffix=" - Black-Litterman Optimal Portfolio")
            display_simulation_summary(bl_portfolio_values, initial_portfolio_value, num_time_intervals)
            print("\nThanks for playing! This game helps illustrate the complex interplay of risk and return in portfolio management. Come back and play again anytime!")
            break 
        elif play_again_input == 'exit':
            print("\nExiting the Portfolio Simulation Game. Goodbye!")
            break
        elif play_again_input == 'yes':
            continue
        else:
            print("Invalid input. Please choose 'yes', 'show', or 'exit'. Continuing with another round.")
            continue