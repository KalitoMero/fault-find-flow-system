
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Users, LogIn } from 'lucide-react';

interface EmployeeOverviewProps {
  onShowLogin: () => void;
}

const EmployeeOverview = ({ onShowLogin }: EmployeeOverviewProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Produktions-Fehlermeldungen</h1>
                <p className="text-sm text-gray-500">Qualitätsmanagement System</p>
              </div>
            </div>
            <Button onClick={onShowLogin} variant="outline">
              <LogIn className="h-4 w-4 mr-2" />
              Teamleiter Login
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-16 w-16 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Mitarbeiter-Übersicht</CardTitle>
            <CardDescription>
              Willkommen im Qualitätsmanagement System
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Diese Anwendung dient der Verwaltung von Produktions-Fehlermeldungen.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Für Teamleiter:</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Klicken Sie auf "Teamleiter Login" oben rechts, um sich anzumelden und Fehlermeldungen zu verwalten.
                </p>
                <Button onClick={onShowLogin} className="w-full">
                  <LogIn className="h-4 w-4 mr-2" />
                  Teamleiter Login
                </Button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Für Mitarbeiter:</h3>
                <p className="text-sm text-gray-600">
                  Weitere Funktionen für Mitarbeiter werden in zukünftigen Updates verfügbar sein.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeOverview;
