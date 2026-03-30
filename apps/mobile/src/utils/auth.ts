import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY = "kerak_access_token";
const REFRESH_KEY = "kerak_refresh_token";

export async function saveTokens(access: string, refresh: string) {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
