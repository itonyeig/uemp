declare const UEMP_API_URL: string | undefined;

export const environment = {
  apiUrl: typeof UEMP_API_URL === 'undefined' ? 'https://uemp-z9pi.onrender.com/api/v1' : UEMP_API_URL,
};
