// src/api.ts
// export const API_BASE_URL =
//   process.env.REACT_APP_API_BASE || "http://localhost:8000";

const API_BASE_URL = "https://medgen-souvik-backend.onrender.com";

/**
 * Upload an image to the backend /predict endpoint.
 * Expects the FastAPI route to accept multipart/form-data with field 'file'
 * and to return JSON: { report?: string, error?: string, ... }
 */
export async function uploadImageForReport(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData,
  });

  // Throw for non-2xx so caller can handle uniformly
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<{ report?: string; error?: string }>;
}