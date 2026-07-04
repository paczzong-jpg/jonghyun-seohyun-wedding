import { createClient } from "@neondatabase/neon-js";

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
const neonDataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

if (!neonAuthUrl || !neonDataApiUrl) {
  throw new Error(
    "Missing Neon browser env. Configure VITE_NEON_AUTH_URL and " +
      "VITE_NEON_DATA_API_URL.",
  );
}

export const client = createClient({
  auth: {
    url: neonAuthUrl,
  },
  dataApi: {
    url: neonDataApiUrl,
  },
});
