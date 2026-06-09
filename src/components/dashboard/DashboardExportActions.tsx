import { memo } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardExportActionsProps {
  onExcel: () => void;
  onPdf: () => void;
}

function DashboardExportActionsComponent({ onExcel, onPdf }: DashboardExportActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer border-white/30 bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
        onClick={onExcel}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer border-white/30 bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
        onClick={onPdf}
      >
        <Download className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer border-white/30 bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
        onClick={() => window.print()}
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimer
      </Button>
    </div>
  );
}

export const DashboardExportActions = memo(DashboardExportActionsComponent);
