import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";

/** App-private Drive scope — non-sensitive, no OAuth app verification. */
const DRIVE_APP_DATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

let configured = false;

function configure(): void {
  if (configured) return;
  const extra = Constants.expoConfig?.extra as { webClientId?: string } | undefined;
  GoogleSignin.configure({
    scopes: [DRIVE_APP_DATA_SCOPE],
    ...(extra?.webClientId ? { webClientId: extra.webClientId } : {}),
  });
  configured = true;
}

/** Opens the Google account picker. Resolves `false` when the user cancels. */
export async function signIn(): Promise<boolean> {
  configure();
  try {
    const res = await GoogleSignin.signIn();
    return res.type === "success";
  } catch (e: any) {
    if (e?.code === statusCodes.SIGN_IN_CANCELLED || e?.code === statusCodes.IN_PROGRESS) {
      return false;
    }
    throw e;
  }
}

/** Restores a previous session without UI. Resolves `false` when none exists. */
export async function signInSilently(): Promise<boolean> {
  configure();
  try {
    const res = await GoogleSignin.signInSilently();
    return res.type === "success";
  } catch {
    return false;
  }
}

export async function getAccessToken(): Promise<string> {
  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
}

export async function signOut(): Promise<void> {
  await GoogleSignin.signOut();
}

export function isSignedIn(): boolean {
  return GoogleSignin.getCurrentUser() != null;
}

export function currentUserEmail(): string | null {
  return GoogleSignin.getCurrentUser()?.user.email ?? null;
}
