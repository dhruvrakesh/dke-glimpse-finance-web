import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntelligentMapper } from "@/components/mapping/IntelligentMapper";
import { Brain, Settings } from "lucide-react";

export const Mapper = () => {
  const [activeTab, setActiveTab] = useState("intelligent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Chart of Accounts Mapper</h1>
        <p className="text-muted-foreground mt-2">
          Map trial balance accounts to Schedule 3 master items using AI-powered suggestions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="intelligent" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Intelligent Mapper
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manual Mapper
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="intelligent" className="space-y-6">
          <IntelligentMapper />
        </TabsContent>
        
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Mapping (Legacy)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">The manual mapper has been replaced with the intelligent AI-powered system.</p>
                <Button 
                  onClick={() => setActiveTab("intelligent")}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Switch to Intelligent Mapper
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
