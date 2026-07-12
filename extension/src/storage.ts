const DEFAULT_BASE_URL = "https://skool-co.vercel.app";

export async function getBaseUrl(): Promise<string> {
  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL });
  return (baseUrl as string).replace(/\/+$/, "");
}

export async function setBaseUrl(url: string): Promise<void> {
  await chrome.storage.sync.set({ baseUrl: url.replace(/\/+$/, "") });
}
