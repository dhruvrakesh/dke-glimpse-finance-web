import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome to the DKEGL Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Financial Reporting & Analytics Platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">User Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Status:</span> Active
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
            <CardDescription>Platform health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">All Systems Operational</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload, mapping, and reporting features will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};