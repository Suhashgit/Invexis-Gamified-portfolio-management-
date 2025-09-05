// src/App.tsx

import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock } from "lucide-react";

import Index from "./pages/Index"; // Your dashboard layout component
import InVexisLogo from "@/components/Invexislogo";

// Import your actual page components
import ForecasterPage from "./pages/Forecaster"; // Import the Forecaster component
import NewsPage from "./pages/News"; // Assuming this is your actual News page component
import CommunityPage from "./pages/Community"; // Assuming this is your actual Community page component
// If StockProjectionWrapper and NewsWrapper are indeed *pages* themselves,
// then they should be imported from src/pages directly or renamed to reflect their purpose.
// Assuming for now they wrap content that might be default dashboard view or specific sections.
// If your Dashboard route (`<Route index element={<StockProjectionWrapper />} />`) is meant to be
// the actual Dashboard content, then StockProjectionWrapper should be your DashboardPage component.
// I'll keep the existing wrapper imports as you provided them, but note they might be full pages.
import StockProjectionWrapper from "./StockProjectionWrapper"; // This might be your DashboardPage
import NewsWrapper from "./NewsWrapper"; // This might be the NewsPage

const API_BASE_URL = "http://127.0.0.1:8000"; // Your backend API base URL

// Authentication functions (unchanged)
const registerUser = async (email: string, password: string) => {
  try {
    const formData = new URLSearchParams();
    formData.append("email", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error during registration:", error);
    return { success: false, message: error.message || "Network error or unexpected issue during registration." };
  }
};

const loginUser = async (email: string, password: string) => {
  try {
    const formData = new URLSearchParams();
    formData.append("email", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error during login:", error);
    return { success: false, message: error.message || "Network error or unexpected issue during login." };
  }
};

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuth: (email: string) => void;
}

const AuthModal = ({ onAuth }: AuthModalProps) => {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result =
        tab === "login"
          ? await loginUser(email, password)
          : await registerUser(email, password);

      if (result.success) {
        onAuth(email);
      } else {
        setErrorMessage(result.message || "Authentication failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      setErrorMessage(error.message || "An unexpected error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 rounded-lg shadow-lg p-6">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <InVexisLogo variant="light" size="md" />
          </div>
          <DialogTitle className="text-white text-2xl font-bold">Join InVexis</DialogTitle>
          <DialogDescription className="text-slate-400 text-sm mt-2">
            Enter your email and password to log in or create an account.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full" onValueChange={(value) => setTab(value as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 rounded-md overflow-hidden">
            <TabsTrigger
              value="login"
              className="py-2 px-4 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 hover:text-white transition-colors duration-200 rounded-md"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="py-2 px-4 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 hover:text-white transition-colors duration-200 rounded-md"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 bg-slate-800 border-slate-600 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent rounded-md"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10 bg-slate-800 border-slate-600 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent rounded-md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="text-red-400 text-sm text-center">{errorMessage}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 bg-slate-800 border-slate-600 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent rounded-md"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    className="pl-10 bg-slate-800 border-slate-600 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent rounded-md"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="text-red-400 text-sm text-center">{errorMessage}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const App = () => {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  // `useNavigate` is from react-router-dom, but not directly used in the App component itself
  // if routes are defined statically. It's typically used inside components rendered by Route.
  // const navigate = useNavigate(); // Removed as it's not used directly here.

  const handleAuthSuccess = (email: string) => {
    setCurrentUserEmail(email);
    // When authentication succeeds, react-router-dom's Navigate component will handle redirection
    // based on the currentUserEmail state change.
  };

  const handleLogout = () => {
    setCurrentUserEmail(null);
    // When logging out, react-router-dom's Navigate component will handle redirection
    // based on the currentUserEmail state change.
  };

  return (
    <div className="min-h-screen text-white font-sans bg-slate-950">
      <Routes>
        {/* Route for the Authentication page */}
        <Route path="/" element={
          currentUserEmail ? (
            <Navigate to="/dashboard" replace /> // If already logged in, redirect to dashboard
          ) : (
            <AuthModal onAuth={handleAuthSuccess} /> // Show auth modal if not logged in
          )
        } />

        {/* Protected Parent Route for the Dashboard Layout */}
        <Route path="/dashboard" element={
          currentUserEmail ? (
            // Index is your dashboard layout. It receives auth state/handlers.
            <Index currentUserEmail={currentUserEmail} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace /> // If not logged in, redirect to auth modal
          )
        }>
          {/* Nested Routes that will be rendered within Index's <Outlet> */}
          {/* Default dashboard view */}
          <Route index element={<StockProjectionWrapper />} /> 
          {/* News page */}
          <Route path="news" element={<NewsWrapper />} />
          {/* FORECASTER PAGE - THIS IS THE FIX */}
          <Route path="forecaster" element={<ForecasterPage />} /> 
          {/* Community page */}
          <Route path="community" element={<div>Community Page (Under Dashboard)</div>} />
        </Route>
        
        {/* General catch-all for unknown routes, redirect to login if not authenticated */}
        <Route path="*" element={currentUserEmail ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

// Main App component wrapped with Router (as per react-router-dom setup)
// This AppWithRouter is what you would typically render in your index.tsx or main.tsx
const AppWithRouter = () => (
  <Router>
    <App />
  </Router>
);

export default AppWithRouter;