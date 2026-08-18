import { File } from "expo-file-system";
import { fetch } from "expo/fetch";

import { BACKUP_FILE_NAME, BACKUP_MIME } from "@/services/backup/constants";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Finds the app's backup file in Drive's hidden app-data folder, if any. */
export async function listBackup(token: string): Promise<DriveBackupFile | null> {
  const url = `${DRIVE_API}/files?spaces=appDataFolder&q=name='${encodeURIComponent(BACKUP_FILE_NAME)}'&fields=files(id,name,modifiedTime,size)`;
  const res = await fetch(url, { headers: auth(token) });
  if (!res.ok) throw new Error(`Failed to list backup (${res.status})`);
  const json = (await res.json()) as { files?: DriveBackupFile[] };
  return json.files?.[0] ?? null;
}

/**
 * Starts a resumable upload session. Returns the session URI to `PUT` the bytes to.
 * Uses multipart-preview-free resumable upload (multipart is capped at 5 MB; audio
 * exceeds it) and commits atomically, so a failed upload never corrupts the last backup.
 */
async function initiateResumableUpload(token: string, fileId: string | null, size: number): Promise<string> {
  const headers = {
    ...auth(token),
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": BACKUP_MIME,
    "X-Upload-Content-Length": String(size),
  };

  const res = fileId
    ? await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=resumable`, {
        method: "PATCH",
        headers,
      })
    : await fetch(`${UPLOAD_API}/files?uploadType=resumable`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: BACKUP_FILE_NAME, parents: ["appDataFolder"] }),
      });

  if (res.status !== 200) throw new Error(`Failed to start upload (${res.status})`);
  const location = res.headers.get("location");
  if (!location) throw new Error("Upload session URI missing");
  return location;
}

/** Uploads the archive file to Drive, creating or updating the single backup file. */
export async function uploadBackup(
  token: string,
  params: { fileId: string | null; fileUri: string; size: number; onProgress?: (progress: number) => void },
): Promise<void> {
  const sessionUri = await initiateResumableUpload(token, params.fileId, params.size);

  const file = new File(params.fileUri);
  const result = await file.upload(sessionUri, {
    httpMethod: "PUT",
    onProgress: params.onProgress ? (data) => params.onProgress!(data.totalBytes > 0 ? data.bytesSent / data.totalBytes : 0) : undefined,
  });

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Upload failed (${result.status})`);
  }
}

/** Downloads a backup file's media into `destination`. */
export async function downloadBackup(token: string, fileId: string, destination: File): Promise<void> {
  await File.downloadFileAsync(`${DRIVE_API}/files/${fileId}?alt=media`, destination, {
    headers: auth(token),
    idempotent: true,
  });
}
