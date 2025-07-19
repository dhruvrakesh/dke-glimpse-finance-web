
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, BarChart3, Upload, Map } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="h-screen w-64 bg-sidebar-bg flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-primary/20">
        <h1 className="text-xl font-semibold text-primary-foreground">
          DKEGL Finance
        </h1>
        <p className="text-sm text-primary-foreground/70 mt-1">
          Financial Reporting
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-primary-foreground/70 hover:bg-primary/20 hover:text-primary-foreground'
              }`
            }
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-primary-foreground/70 hover:bg-primary/20 hover:text-primary-foreground'
              }`
            }
          >
            <Upload size={20} />
            <span>Upload Data</span>
          </NavLink>
          
          <NavLink
            to="/mapper"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-primary-foreground/70 hover:bg-primary/20 hover:text-primary-foreground'
              }`
            }
          >
            <Map size={20} />
            <span>Chart of Accounts Mapper</span>
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-primary/20">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full text-primary-foreground hover:bg-primary/20 hover:text-primary-foreground"
        >
          <LogOut size={16} className="mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
