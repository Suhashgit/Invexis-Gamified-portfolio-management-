import json
import hashlib
import os

USER_DB = 'users.json'

def load_users():
    """Loads user data from the JSON file."""
    try:
        with open(USER_DB, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError: # Added to handle empty/malformed JSON files
        return []

def save_users(users):
    """Saves user data to the JSON file."""
    with open(USER_DB, 'w') as f:
        json.dump(users, f, indent=2)

def hash_password(password):
    """Hashes the password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def register_user(email, password):
    """
    Registers a new user, hashes their password, and stores credentials in users.json.
    Initializes an empty watchlist for the new user.
    """
    users = load_users()
    if any(user["email"] == email for user in users):
        return {"success": False, "message": "User already exists"}
    
    # Store user as a dictionary with an empty watchlist (new for watch list feature)
    users.append({"email": email, "password": hash_password(password), "watchlist": []})
    save_users(users)
    print(f"User registered and saved to {USER_DB}: {email}")
    return {"success": True, "message": "Registration successful"}

def login_user(email, password):
    """
    Authenticates a user by checking credentials against users.json using hashed passwords.
    """
    users = load_users()
    for user in users:
        if user["email"] == email and user["password"] == hash_password(password):
            print(f"User logged in: {email}")
            return {"success": True, "message": "Login successful"}
    return {"success": False, "message": "Invalid credentials"}
