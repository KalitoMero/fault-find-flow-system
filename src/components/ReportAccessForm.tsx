
import React, { useState, useRef } from 'react';
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
import ErrorReportDetail from './ErrorReportDetail';
import VirtualKeyboard from './VirtualKeyboard';

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
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    const normalizedTerm = searchTerm.replace(/\s+/g, '').trim();
    if (!normalizedTerm) {
      toast.error('Bitte geben Sie einen Suchbegriff ein');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      let reports: ErrorReport[] = [];
      
      switch (searchType) {
        case 'orderNumber':
          reports = await searchErrorReportsByOrderNumber(normalizedTerm);
          break;
        case 'articleNumber':
          reports = await searchErrorReportsByArticleNumber(searchTerm.trim());
          break;
        case 'articleDescription':
          reports = await searchErrorReportsByArticleDescription(searchTerm.trim());
          break;
      }

      // Alle Meldungen anzeigen (offen, freigegeben, abgelehnt)
      const visibleReports = reports;
      
      if (visibleReports.length === 0) {
        toast.error('Keine Meldungen gefunden');
      } else {
        // Tastatur ausblenden wenn Ergebnisse gefunden wurden
        setShowKeyboard(false);
        
        if (visibleReports.length === 1) {
          // Bei abgelehnten oder pending Meldungen direkt bearbeiten, sonst nur ansehen
          if (visibleReports[0].approvalStatus === 'rejected' || visibleReports[0].approvalStatus === 'pending') {
            onReportFound(visibleReports[0]);
          } else {
            setSelectedReport(visibleReports[0]);
          }
          toast.success('Fehlermeldung gefunden!');
        } else {
          setSearchResults(visibleReports);
          toast.success(`${visibleReports.length} Meldungen gefunden`);
        }
      }
    } catch (error) {
      console.error('Fehler beim Suchen der Meldung:', error);
      toast.error('Fehler beim Suchen der Meldung');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReportSelect = (report: ErrorReport) => {
    // Abgelehnte UND pending Meldungen direkt im Bearbeitungsmodus öffnen
    if (report.approvalStatus === 'rejected' || report.approvalStatus === 'pending') {
      onReportFound(report);
    } else {
      setSelectedReport(report);
    }
  };

  const handleBackFromDetail = () => {
    setSelectedReport(null);
  };

  // Wenn ein Report ausgewählt ist, zeige die Detail-Ansicht
  if (selectedReport) {
    return (
      <ErrorReportDetail
        report={selectedReport}
        onBack={handleBackFromDetail}
        onStatusChange={() => {}}
        backButtonText="Zurück zur Liste"
        hideDeleteButton={true}
        readOnly={true}
      />
    );
  }

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
        return 'Ba-Nr.';
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
        return 'z.B. 20250';
      case 'articleNumber':
        return 'z.B. D532-7';
      case 'articleDescription':
        return 'z.B. Beschlag';
      default:
        return 'Suchbegriff eingeben';
    }
  };

  return (
    <div className="mx-auto mt-8 space-y-6">
      {/* Suchergebnisse anzeigen wenn vorhanden */}
      {searchResults.length > 0 ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setSearchResults([])}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="h-6 w-6 text-blue-600" />
                      <span>Suchergebnisse</span>
                      <Badge variant="secondary">{searchResults.length}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Klicken Sie auf eine Meldung um sie zu öffnen
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {searchResults.map((report) => (
              <div 
                key={report.id} 
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer bg-card"
                onClick={() => handleReportSelect(report)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-card-foreground">Auftrag: {report.orderNumber}</h3>
                    <Badge variant={
                      report.approvalStatus === 'approved' ? 'default' : 
                      report.approvalStatus === 'pending' ? 'secondary' : 
                      'destructive'
                    }>
                      {report.approvalStatus === 'approved' ? 'Freigegeben' : 
                       report.approvalStatus === 'pending' ? 'Zur Prüfung' : 
                       'Abgelehnt'}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      AFO: {report.afoNumber} | Maschine: {report.machine} | Ersteller: {report.creator}
                    </p>
                    {report.additionalExcelData?.Artikelnummer && (
                      <p className="text-sm text-muted-foreground">
                        Artikel: {report.additionalExcelData.Artikelnummer}
                        {report.additionalExcelData?.Artikelbezeichnung && ` - ${report.additionalExcelData.Artikelbezeichnung}`}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {report.quantityType || 'Menge'}: {report.defectiveQuantity}/{report.totalDefectiveQuantity} | {formatDate(report.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Suchformular anzeigen wenn keine Ergebnisse */
        <Card className="max-w-2xl mx-auto">
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
                Ba-Nr.
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
                ref={searchInputRef}
                id="searchTerm"
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCursorPosition(e.target.selectionStart || 0);
                }}
                onFocus={(e) => {
                  setShowKeyboard(true);
                  const endPosition = e.target.value.length;
                  setCursorPosition(endPosition);
                  setTimeout(() => {
                    e.target.setSelectionRange(endPosition, endPosition);
                  }, 0);
                }}
                onClick={(e) => {
                  setShowKeyboard(true);
                  const input = e.target as HTMLInputElement;
                  const endPosition = input.value.length;
                  setCursorPosition(endPosition);
                  setTimeout(() => {
                    input.setSelectionRange(endPosition, endPosition);
                  }, 0);
                }}
                onKeyDown={handleKeyPress}
                inputMode="none"
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
      )}
      
      {showKeyboard && (
        <VirtualKeyboard
          value={searchTerm}
          onChange={(newValue, newCursorPosition) => {
            setSearchTerm(newValue);
            setCursorPosition(newCursorPosition);
            if (searchInputRef.current) {
              searchInputRef.current.focus();
              setTimeout(() => {
                searchInputRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
              }, 0);
            }
          }}
          onClose={() => setShowKeyboard(false)}
          cursorPosition={cursorPosition}
        />
      )}
    </div>
  );
};

export default ReportAccessForm;
