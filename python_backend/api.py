from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from auth import register_user, login_user 
from market_data import get_index_data
from monte_carlo import get_MonteCarloPaths

#Fast API acts as an intermediary between client apps and our backend services.
#In our case save passwords in a dictionary form
app = FastAPI()


# Enable CORS so frontend (e.g., Flutter) can call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registration endpoint, allows the user to input in a FORM format, our register user function is then called
@app.post("/register")
def register(email: str = Form(...), password: str = Form(...)):
    return register_user(email, password)

# Login endpoint (Same as above), our login user function is then called
@app.post("/login")
def login(email: str = Form(...), password: str = Form(...)):
    return login_user(email, password)

#Yahoo finance data endpoint. This creates the end point in the API server for getting the required data, get index data is then called
@app.get("/index-data")
def index_data(symbol: str = "^GSPC", period: str = "1y"):
    return get_index_data(symbol, period)

@app.get("/simulations")
def simulations(symbol:str = "^GSPC", period:str ="1y"):
    return get_MonteCarloPaths(symbol,period)
#TO RUN THE UVICORN,
#USE, python -m uvicorn api:app --reload