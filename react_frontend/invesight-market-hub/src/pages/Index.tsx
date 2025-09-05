// src/pages/Index.tsx
import InVexisLogo from "@/components/Invexislogo";
import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";

// Define the context type, must match what StockProjectionWrapper and NewsWrapper expect
interface OutletContextType {
  currentUserEmail: string | null;
  onLogout: () => void;
}

// Define props for the Index component as it will receive them from App.tsx
interface IndexProps {
  currentUserEmail: string | null;
  onLogout: () => void;
}

const Index = ({ currentUserEmail, onLogout }: IndexProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <nav className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <InVexisLogo />
            <div className="flex space-x-6">
              <Link
                to="/dashboard"
                className={`font-medium transition-colors ${location.pathname === '/dashboard' ? 'text-white' : 'text-slate-400 hover:text-green-400'}`}
              >
                Dashboard
              </Link>
              <Link
                to="/dashboard/forecaster"
                className={`font-medium transition-colors ${location.pathname === '/dashboard/forecaster' ? 'text-white' : 'text-slate-400 hover:text-green-400'}`}
              >
                Forecaster
              </Link>
              <Link
                to="/dashboard/news"
                className={`font-medium transition-colors ${location.pathname === '/dashboard/news' ? 'text-white' : 'text-slate-400 hover:text-green-400'}`}
              >
                AI News
              </Link>
              <Link
                to="/dashboard/community"
                className={`font-medium transition-colors ${location.pathname === '/dashboard/community' ? 'text-white' : 'text-slate-400 hover:text-green-400'}`}
              >
                Community
              </Link>
            </div>
          </div>
          {/* Logout button in the header */}
          <button
            onClick={onLogout}
            className="text-slate-300 hover:text-white px-4 py-2 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area where nested routes will render */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* IMPORTANT: The context object MUST be defined and passed here. */}
          <Outlet context={{ currentUserEmail, onLogout } satisfies OutletContextType} /> {/* Ensure context matches type */}
        </div>
      </div>
    </div>
  );
};

export default Index;