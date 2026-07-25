import { useCallback, useEffect, useState } from 'react';
import { BRANDING_UPDATED_EVENT } from '@/lib/branding';
import { APP_LOGO_URL } from '@/lib/logos';
import { ipcClient } from '@/lib/ipcClient';

export function useCompanyBranding() {
  const [logoUrl, setLogoUrl] = useState(APP_LOGO_URL);
  const [companyName, setCompanyName] = useState('Raqmi System');
  const [reportHeader, setReportHeader] = useState('');
  const [reportFooter, setReportFooter] = useState('');
  const [reportHeaderImageUrl, setReportHeaderImageUrl] = useState<string | null>(null);
  const [reportFooterImageUrl, setReportFooterImageUrl] = useState<string | null>(null);

  const loadBranding = useCallback(() => {
    void ipcClient.settings
      .getBranding()
      .then((result) => {
        if (!result.ok || !result.data) return;
        if (result.data.companyLogoUrl) {
          setLogoUrl(result.data.companyLogoUrl);
        } else {
          setLogoUrl(APP_LOGO_URL);
        }
        if (result.data.companyName?.trim()) {
          setCompanyName(result.data.companyName.trim());
        }
        setReportHeader(result.data.reportHeader ?? '');
        setReportFooter(result.data.reportFooter ?? '');
        setReportHeaderImageUrl(result.data.reportHeaderImageUrl ?? null);
        setReportFooterImageUrl(result.data.reportFooterImageUrl ?? null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadBranding();
    window.addEventListener(BRANDING_UPDATED_EVENT, loadBranding);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, loadBranding);
  }, [loadBranding]);

  return {
    logoUrl: logoUrl || APP_LOGO_URL,
    companyName,
    reportHeader,
    reportFooter,
    reportHeaderImageUrl,
    reportFooterImageUrl,
    reloadBranding: loadBranding,
  };
}
