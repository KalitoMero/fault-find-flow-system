
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ArrowLeft } from 'lucide-react';
import { getErrorReportByAccessNumber, ErrorReport } from '@/lib/storage';
import { toast } from "sonner";

interface ReportAccessFormProps {
  onReportFound: (report: ErrorReport) => void;
  onBack: () => void;
}

const ReportAccessForm: React.FC<ReportAccessFormProps> = ({
  onReportFound,
  onBack
}) => {
  const [accessNumber, setAccessNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!accessNumber.trim()) {
      toast.error('Bitte geben Sie eine Zugriffsnummer ein');
      return;
    }

    if (accessNumber.length !== 6) {
      toast.error('Die Zugriffsnummer muss 6-stellig sein');
      return;
    }

    setIsSearching(true);

    try {
      const report = getErrorReportByAccessNumber(accessNumber);
      
      if (report) {
        if (report.approvalStatus === 'approved') {
          onReportFound(report);
          toast.success('Fehlermeldung gefunden!');
        } else {
          toast.error('Diese Meldung ist noch nicht freigegeben und kann nicht eingesehen werden');
        }
      } else {
        toast.error('Keine Meldung mit dieser Zugriffsnummer gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Suchen der Meldung:', error);
      toast.error('Fehler beim Suchen der Meldung');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Meldung Einsehen</span>
            </CardTitle>
            <CardDescription>
              Geben Sie die 6-stellige Zugriffsnummer ein
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accessNumber">Zugriffsnummer</Label>
          <Input
            id="accessNumber"
            type="text"
            placeholder="123456"
            value={accessNumber}
            onChange={(e) => setAccessNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyPress={handleKeyPress}
            className="text-center text-2xl font-mono tracking-widest"
            maxLength={6}
          />
        </div>
        
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || accessNumber.length !== 6}
          className="w-full"
        >
          <Search className="h-4 w-4 mr-2" />
          {isSearching ? 'Suche...' : 'Meldung Suchen'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReportAccessForm;
