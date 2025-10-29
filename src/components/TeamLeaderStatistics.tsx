import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getTeamLeaderStatistics } from '@/lib/storage';

interface TeamLeaderStat {
  id: string;
  name: string;
  department: string;
  totalReports: number;
  pendingReports: number;
  approvedReports: number;
  rejectedReports: number;
}

const TeamLeaderStatistics: React.FC = () => {
  const [statistics, setStatistics] = useState<TeamLeaderStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const stats = await getTeamLeaderStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading team leader statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Lade Statistiken...</p>
        </CardContent>
      </Card>
    );
  }

  const totalPending = statistics.reduce((sum, stat) => sum + stat.pendingReports, 0);
  const totalReports = statistics.reduce((sum, stat) => sum + stat.totalReports, 0);

  return (
    <div className="space-y-6">
      {/* Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamt Meldungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReports}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unbearbeitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Teamleiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{statistics.length}</div>
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teamleiter Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teamleiter Übersicht
          </CardTitle>
          <CardDescription>
            Status der Fehlermeldungen pro Teamleiter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statistics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Teamleiter gefunden
              </div>
            ) : (
              statistics.map((stat) => (
                <Card key={stat.id} className="border-l-4 border-l-blue-400">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{stat.name}</h3>
                          <Badge variant="outline">{stat.department}</Badge>
                        </div>
                        
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-muted-foreground">Unbearbeitet:</span>
                            <span className="font-semibold text-yellow-600">
                              {stat.pendingReports}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Freigegeben:</span>
                            <span className="font-semibold text-green-600">
                              {stat.approvedReports}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-muted-foreground">Abgelehnt:</span>
                            <span className="font-semibold text-red-600">
                              {stat.rejectedReports}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {stat.pendingReports > 0 && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {stat.pendingReports} offen
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamLeaderStatistics;
