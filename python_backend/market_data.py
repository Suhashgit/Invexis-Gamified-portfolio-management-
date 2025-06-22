import yfinance as yf
#We use colon as a typehint
def get_index_data(symbol: str, period: str = "1y"):
    index = yf.Ticker(symbol)
    data = index.history(period = period)
    data = data.reset_index()
    result = []
    for row in data[["Date", "Close"]].to_dict(orient="records"):
        result.append({
            "Date": row["Date"].strftime("%Y-%m-%d") if hasattr(row["Date"], "strftime") else str(row["Date"]),
            "Close": float(row["Close"])
        })
    
    return result


