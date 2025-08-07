
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft, Package, Clock, User } from 'lucide-react';
import { 
  getErrorReportByOrderNumber, 
  ErrorReport, 
  searchErrorReportsByOrderNumber,
  searchErrorReportsByArticleNumber,
  searchErrorReportsByArticleDescription
} from '@/lib/storage';
import { toast } from "sonner";

interface ReportAccessFormProps {
  onReportFound: (report: ErrorReport) => void;
  onBack: () => void;
}

const ReportAccessForm: React.FC<ReportAccessFormProps> = ({
  onReportFound,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'orderNumber' | 'articleNumber' | 'articleDescription'>('orderNumber');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ErrorReport[]>([]);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error('Bitte geben Sie einen Suchbegriff ein');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      let reports: ErrorReport[] = [];
      
      switch (searchType) {
        case 'orderNumber':
          reports = searchErrorReportsByOrderNumber(searchTerm.trim());
          break;
        case 'articleNumber':
          reports = searchErrorReportsByArticleNumber(searchTerm.trim());
          break;
        case 'articleDescription':
          reports = searchErrorReportsByArticleDescription(searchTerm.trim());
          break;
      }

      // Filter nur freigegebene Meldungen
      const approvedReports = reports.filter(report => report.approvalStatus === 'approved');
      
      if (approvedReports.length === 0) {
        toast.error('Keine freigegebenen Meldungen gefunden');
      } else if (approvedReports.length === 1) {
        onReportFound(approvedReports[0]);
        toast.success('Fehlermeldung gefunden!');
      } else {
        setSearchResults(approvedReports);
        toast.success(`${approvedReports.length} Meldungen gefunden`);
      }
    } catch (error) {
      console.error('Fehler beim Suchen der Meldung:', error);
      toast.error('Fehler beim Suchen der Meldung');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReportSelect = (report: ErrorReport) => {
    onReportFound(report);
    setSearchResults([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getSearchLabel = () => {
    switch (searchType) {
      case 'orderNumber':
        return 'Betriebsauftragsnummer';
      case 'articleNumber':
        return 'Artikelnummer';
      case 'articleDescription':
        return 'Artikelbezeichnung';
      default:
        return 'Suchbegriff';
    }
  };

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case 'orderNumber':
        return 'z.B. A123456';
      case 'articleNumber':
        return 'z.B. ART123';
      case 'articleDescription':
        return 'z.B. Schrauben M8';
      default:
        return 'Suchbegriff eingeben';
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      <Card className="max-w-md mx-auto">
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
              Wählen Sie das Suchkriterium und geben Sie den Suchbegriff ein
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Suchkriterium Buttons */}
        <div className="space-y-2">
          <Label>Suchkriterium</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={searchType === 'orderNumber' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('orderNumber')}
              className="flex-1 min-w-0"
            >
              Betriebsauftragsnummer
            </Button>
            <Button
              variant={searchType === 'articleNumber' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('articleNumber')}
              className="flex-1 min-w-0"
            >
              Artikelnummer
            </Button>
            <Button
              variant={searchType === 'articleDescription' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('articleDescription')}
              className="flex-1 min-w-0"
            >
              Artikelbezeichnung
            </Button>
          </div>
        </div>

          <div className="space-y-2">
            <Label htmlFor="searchTerm">{getSearchLabel()}</Label>
            <Input
              id="searchTerm"
              type="text"
              placeholder={getSearchPlaceholder()}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-center text-lg font-mono"
            />
          </div>
          
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !searchTerm.trim()}
            className="w-full"
          >
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Suche...' : 'Meldung Suchen'}
          </Button>
        </CardContent>
      </Card>

      {/* Suchergebnisse */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-6 w-6 text-blue-600" />
                <span>Suchergebnisse</span>
                <Badge variant="secondary">{searchResults.length}</Badge>
              </CardTitle>
              <CardDescription>
                Klicken Sie auf eine Meldung um sie zu öffnen
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {searchResults.map((report) => (
              <Card 
                key={report.id} 
                className="border-l-4 border-l-blue-400 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleReportSelect(report)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        #{report.id}
                      </Badge>
                      <div>
                        <h3 className="font-semibold text-lg">
                          Auftrag: {report.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          AFO: {report.afoNumber} | Maschine: {report.machine}
                        </p>
                        {report.additionalExcelData?.Artikelnummer && (
                          <p className="text-sm text-gray-600">
                            Artikel: {report.additionalExcelData.Artikelnummer}
                            {report.additionalExcelData?.Artikelbezeichnung && ` - ${report.additionalExcelData.Artikelbezeichnung}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="flex items-center space-x-1 bg-green-100 text-green-800">
                      <Clock className="h-3 w-3" />
                      <span>Freigegeben</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Ersteller-Info */}
                  <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{report.creator}</p>
                      <p className="text-sm text-gray-600">
                        Personal-Nr: {report.personalNumber} | {formatDate(report.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Mengendaten */}
                  <div className="flex items-center space-x-4 p-3 bg-red-50 rounded-lg">
                    <Package className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">
                        Beanstandete Menge: {report.defectiveQuantity} von {report.totalDefectiveQuantity}
                      </p>
                    </div>
                  </div>

                  {/* Problem Preview */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Problembeschreibung:</h4>
                    <p className="text-gray-700 p-3 bg-gray-50 rounded border-l-4 border-l-blue-400 line-clamp-2">
                      {report.problemDescription}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAccessForm;
