import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, AlertTriangle, Clock, Search } from 'lucide-react';
import { getTeamLeaderStatistics } from '@/lib/storage';

interface AdminDashboardProps {
  currentUser: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const teamLeaderStats = getTeamLeaderStatistics();
  const [searchType, setSearchType] = useState<'orderNumber' | 'articleNumber'>('orderNumber');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    // TODO: Implement search functionality based on searchType and searchTerm
    console.log(`Searching by ${searchType}:`, searchTerm);
  };

  return (
    <div className="space-y-6">
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
          <div className="mb-6 space-y-4">
            <div className="flex gap-2">
              <Button
                variant={searchType === 'orderNumber' ? 'default' : 'outline'}
                onClick={() => setSearchType('orderNumber')}
                className="flex-1"
              >
                Nach Auftragsnummer
              </Button>
              <Button
                variant={searchType === 'articleNumber' ? 'default' : 'outline'}
                onClick={() => setSearchType('articleNumber')}
                className="flex-1"
              >
                Nach Artikelnummer
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={searchType === 'orderNumber' ? 'Auftragsnummer eingeben...' : 'Artikelnummer eingeben...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {teamLeaderStats.length === 0 ? (
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
              {teamLeaderStats.map((leader) => (
                <div 
                  key={leader.username} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{leader.name}</h3>
                      <Badge variant="outline">@{leader.username}</Badge>
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
    </div>
  );
};

export default AdminDashboard;