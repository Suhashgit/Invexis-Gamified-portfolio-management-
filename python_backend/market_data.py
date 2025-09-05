import yfinance as yf
#We use colon as a typehint
def get_index_data(symbol: str, period: str = "1y"):
    index = yf.Ticker(symbol)
    data = index.history(period = period)
    data = data.reset_index()
    result = []
    #This converion is required because Fast API cant handle numpy int 64 and datetime 64.
    #Hence conversion is required to be stored in a JSON file as key value pairs
    for row in data[["Date", "Close"]].to_dict(orient="records"):
        #hasattr is used to determine if the object has an attribute function, in this case strftime
        #If it does have this formatting option, it means its a pandas specific timestamp
        #Meaning we have to format it, so use strftime
        #now u want your close value to be formatted into a float and not int64 on pandas 
        result.append({
            "Date": row["Date"].strftime("%Y-%m-%d") if hasattr(row["Date"], "strftime") else str(row["Date"]),
            "Close": float(row["Close"])
        })
    
    return result


