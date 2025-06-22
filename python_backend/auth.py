import json
import hashlib

USER_DB = 'users.json'

def load_users():
    try:
        with open(USER_DB, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_users(users):
    with open(USER_DB, 'w') as f:
        json.dump(users, f, indent=2)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def register_user(email, password):
    users = load_users()
    if any(user["email"] == email for user in users):
        return {"success": False, "message": "User already exists"}
    users.append({"email": email, "password": hash_password(password)})
    save_users(users)
    return {"success": True, "message": "Registration successful"}

def login_user(email, password):
    users = load_users()
    for user in users:
        if user["email"] == email and user["password"] == hash_password(password):
            return {"success": True, "message": "Login successful"}
    return {"success": False, "message": "Invalid credentials"}