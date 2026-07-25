import { useCompanyBranding } from '@/hooks/useCompanyBranding';

export function PrintLetterhead() {
  const {
    logoUrl,
    reportHeader,
    reportFooter,
    reportHeaderImageUrl,
    reportFooterImageUrl,
  } = useCompanyBranding();

  const headerImage = reportHeaderImageUrl ?? logoUrl;
  const headerText = reportHeader.trim();

  if (!headerText && !headerImage && !reportFooter.trim() && !reportFooterImageUrl) {
    return null;
  }

  return (
    <>
      <header className="print-letterhead hidden print:block">
        {headerImage ? (
          <img src={headerImage} alt="" className="print-letterhead__image" />
        ) : null}
        {headerText ? <p className="print-letterhead__text">{headerText}</p> : null}
      </header>
      <footer className="print-footer hidden print:block">
        {reportFooterImageUrl ? (
          <img src={reportFooterImageUrl} alt="" className="print-footer__image" />
        ) : null}
        {reportFooter.trim() ? <p className="print-footer__text">{reportFooter}</p> : null}
      </footer>
    </>
  );
}
