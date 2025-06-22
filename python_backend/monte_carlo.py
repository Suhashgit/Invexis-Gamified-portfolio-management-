import yfinance as yf 
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.stats import norm 

def get_MonteCarloPaths(symbol: str, period: str = "1y"):
    index = yf.Ticker(symbol)
    dataM = index.history(period=period)
    dataM = dataM.reset_index()
    #This is to get price today/price yest
    returns = np.log(dataM["Close"]/ dataM["Close"].shift(1)).dropna()
#To develop the ranbdom walk, you need the mean log return
#Need the variance of log return
    Mean_returns = returns.mean()
    variance_returns = returns.var()
# Computing drift, volatility component 
    drift = Mean_returns - (0.5*variance_returns)
    stdev = returns.std()
# If dirft has the .values attrtibute, it means it exists as a pandas 
#series, hence then it can be into a numpy array through .values 
    drift = drift.values if hasattr(drift,'values') else np.array([drift])
    stdev = stdev.values if hasattr(stdev, 'values') else np.array([stdev])
#Now you want to plot a 1000 diff paths for 1000 days (so 1000x1000 matrix)
    time_intervals = 1000
    iteration = 1000
#Create a 1000x1000 matrix of random values from 0 to 1
    rand_values = np.random.rand(time_intervals, iteration)
#Find the Z score
    Z = norm.ppf(rand_values)
#The accumulation function (e^ drift + volatility component)
    daily_returns = np.exp(drift+stdev*Z)

    S0 = dataM["Close"].iloc[-1]
    price_list = np.zeros_like(daily_returns)
    price_list[0] = S0
    for t in range(1, time_intervals):
        price_list[t] = price_list[t-1]*daily_returns[t]
    return price_list.tolist()











