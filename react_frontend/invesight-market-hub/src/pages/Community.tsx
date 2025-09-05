
import CommunityForum from "@/components/CommunityForum";
import InVexisLogo from "@/components/Invexislogo";
import { Link } from "react-router-dom";

const Community = () => {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <nav className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <InVexisLogo />
            <div className="flex space-x-6">
              <Link 
                to="/" 
                className="text-slate-400 hover:text-green-400 transition-colors font-medium"
              >
                Dashboard
              </Link>
              <Link 
                to="/forecaster" 
                className="text-slate-400 hover:text-green-400 transition-colors font-medium"
              >
                Forecaster
              </Link>
              <Link 
                to="/news" 
                className="text-slate-400 hover:text-green-400 transition-colors font-medium"
              >
                AI News
              </Link>
              <Link 
                to="/community" 
                className="text-white hover:text-green-400 transition-colors font-medium"
              >
                Community
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <CommunityForum />
        </div>
      </div>
    </div>
  );
};

export default Community;
