import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Use Android's native cookie store for session requests made from the WebView.
export async function fetchSessionRequest(url: string, init: RequestInit): Promise<Response> {
  if (Capacitor.getPlatform() !== 'android' || init.credentials !== 'include'
      || typeof init.body !== 'string' || !/^https:\/\//i.test(url)) {
    return fetch(url, init);
  }

  const headers: Record<string, string> = {};
  new Headers(init.headers).forEach((value, key) => { headers[key] = value; });
  const response = await CapacitorHttp.request({
    url,
    method: init.method,
    headers,
    data: JSON.parse(init.body),
    responseType: 'text',
    disableRedirects: true,
    connectTimeout: 15_000,
    readTimeout: 20_000,
  });

  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(response.headers)) {
    if (key.toLowerCase() !== 'set-cookie' && key.toLowerCase() !== 'set-cookie2') {
      responseHeaders.set(key, value);
    }
  }
  const body = [204, 205, 304].includes(response.status)
    ? null
    : typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  return new Response(body, { status: response.status, headers: responseHeaders });
}
