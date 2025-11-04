
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, CheckCircle } from 'lucide-react';

interface ErrorReport {
  id: string;
  order_number: string;
  afo_number: string;
  machine_id?: string;
  defective_quantity: number;
  total_defective_quantity: number;
  quantity_type?: string;
  problem_description: string;
  corrective_action: string;
  creator_name: string;
  personal_number?: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

interface ApprovalDashboardProps {
  reports: ErrorReport[];
  onApprovalChange: () => void;
  onReportClick: (report: ErrorReport) => void;
}

const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({ reports, onApprovalChange, onReportClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Freigegeben</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Zur Prüfung</span>
        </Badge>;
    }
  };

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Alle Meldungen bearbeitet
          </h3>
          <p className="text-gray-500">
            Zur Zeit sind keine Fehlermeldungen zur Freigabe vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-6 w-6 text-yellow-600" />
            <span>Fehlermeldungen zur Freigabe</span>
            <Badge variant="secondary">{reports.length}</Badge>
          </CardTitle>
          <CardDescription>
            Prüfen und genehmigen Sie die eingereichten Fehlermeldungen
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card 
            key={report.id} 
            className="border-l-4 border-l-yellow-400 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onReportClick(report)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Auftrag: {report.order_number}</span>
                    {getStatusBadge(report.approval_status)}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {report.problem_description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(report.created_at)}
                  </p>
                </div>
                <Eye className="h-5 w-5 text-gray-400 ml-4 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ApprovalDashboard;
