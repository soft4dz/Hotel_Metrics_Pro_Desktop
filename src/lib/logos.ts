/** URLs des logos servis via le protocole Electron hmp-logo:// */

export const APP_LOGO_URL = 'hmp-logo:///assets/app-logo.svg';
export const DEFAULT_HOTEL_LOGO_URL = 'hmp-logo:///assets/default-hotel.svg';

export function hasCustomHotelLogo(logoFile: string | null | undefined): boolean {
  return Boolean(logoFile?.trim());
}
