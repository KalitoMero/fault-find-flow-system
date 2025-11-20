import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, Clock, UserPlus } from 'lucide-react';
import { getTeamLeaderStatistics } from '@/lib/storage';
import { toast } from 'sonner';
import AccountCreationForm from './AccountCreationForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminDashboardProps {
  currentUser: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [teamLeaderStats, setTeamLeaderStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await getTeamLeaderStatistics();
      setTeamLeaderStats(stats);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      toast.error('Fehler beim Laden der Statistiken');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <Users className="h-4 w-4 mr-2" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <UserPlus className="h-4 w-4 mr-2" />
            Accounts erstellen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Teamleiter Übersicht</span>
              </CardTitle>
              <CardDescription>
                Überblick über alle Teamleiter und ihre Fehlermeldungen zur Prüfung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Lädt...</p>
                </div>
              ) : teamLeaderStats.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Teamleiter vorhanden
                  </h3>
                  <p className="text-gray-500">
                    Es wurden noch keine Teamleiter eingerichtet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamLeaderStats.map((leader: any) => (
                    <div 
                      key={leader.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{leader.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Abteilung: {leader.department}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-2xl font-bold text-orange-600">
                              {leader.pendingReports}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Zur Prüfung</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <AlertTriangle className="h-4 w-4 text-gray-500" />
                            <span className="text-2xl font-bold text-gray-600">
                              {leader.totalReports}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Gesamt</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <AccountCreationForm onAccountCreated={loadStatistics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;