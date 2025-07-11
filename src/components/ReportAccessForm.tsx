
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, ArrowLeft } from 'lucide-react';
import { getErrorReportByOrderNumber, ErrorReport } from '@/lib/storage';
import { toast } from "sonner";

interface ReportAccessFormProps {
  onReportFound: (report: ErrorReport) => void;
  onBack: () => void;
}

const ReportAccessForm: React.FC<ReportAccessFormProps> = ({
  onReportFound,
  onBack
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!orderNumber.trim()) {
      toast.error('Bitte geben Sie eine Auftragsnummer ein');
      return;
    }

    setIsSearching(true);

    try {
      const report = getErrorReportByOrderNumber(orderNumber.trim());
      
      if (report) {
        if (report.approvalStatus === 'approved') {
          onReportFound(report);
          toast.success('Fehlermeldung gefunden!');
        } else {
          toast.error('Diese Meldung ist noch nicht freigegeben und kann nicht eingesehen werden');
        }
      } else {
        toast.error('Keine Meldung mit dieser Auftragsnummer gefunden');
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
              Geben Sie die Auftragsnummer ein
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Auftragsnummer</Label>
          <Input
            id="orderNumber"
            type="text"
            placeholder="z.B. A123456"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-center text-lg font-mono"
          />
        </div>
        
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !orderNumber.trim()}
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
