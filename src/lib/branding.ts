export const BRANDING_UPDATED_EVENT = 'hmp:branding-updated';

export function notifyBrandingUpdated(): void {
  window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT));
}
