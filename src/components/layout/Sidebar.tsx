import React from 'react';
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

      {/* Navigation - Placeholder for future links */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 text-primary-foreground/70 p-3 rounded-lg">
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </div>
          <div className="flex items-center space-x-3 text-primary-foreground/50 p-3 rounded-lg">
            <Upload size={20} />
            <span>Upload (Coming Soon)</span>
          </div>
          <div className="flex items-center space-x-3 text-primary-foreground/50 p-3 rounded-lg">
            <Map size={20} />
            <span>Mapper (Coming Soon)</span>
          </div>
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