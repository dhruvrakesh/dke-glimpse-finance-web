
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Mapper: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Chart of Accounts Mapper
        </h1>
        <p className="text-muted-foreground mt-2">
          Map your trial balance accounts to Schedule III format
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Account Mapping</CardTitle>
          <CardDescription>
            This feature will allow you to map your chart of accounts to Schedule III format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Chart of Accounts mapping functionality will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
