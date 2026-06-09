export const getApiBaseUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : self.location.hostname;
  return 'http://' + hostname + ':8000';
};
export const API_BASE_URL = getApiBaseUrl();
