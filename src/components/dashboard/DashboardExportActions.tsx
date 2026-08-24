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
        className="cursor-pointer border-border bg-card text-foreground transition-colors hover:border-primary/30 hover:bg-muted"
        onClick={onExcel}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer border-border bg-card text-foreground transition-colors hover:border-primary/30 hover:bg-muted"
        onClick={onPdf}
      >
        <Download className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer border-border bg-card text-foreground transition-colors hover:border-primary/30 hover:bg-muted"
        onClick={() => window.print()}
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimer
      </Button>
    </div>
  );
}

export const DashboardExportActions = memo(DashboardExportActionsComponent);
