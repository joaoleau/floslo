export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn(
    '[api/http/config] EXPO_PUBLIC_API_BASE_URL is not set — API calls will fail. Check your .env file.'
  );
}
