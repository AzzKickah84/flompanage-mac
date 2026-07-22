type NotifyPayload = {
  type: "notify";
  title: string;
  message: string;
};

type OpenUrlPayload = {
  type: "openUrl";
  url: string;
};

type WebViewHost = {
  postMessage: (message: NotifyPayload | OpenUrlPayload | string) => void;
};

function getHost(): WebViewHost | null {
  const chrome = (window as Window & { chrome?: { webview?: WebViewHost } }).chrome;
  if (chrome?.webview) return chrome.webview;

  const mac = (window as Window & { flompanageMac?: WebViewHost }).flompanageMac;
  if (mac?.postMessage) return mac;

  return null;
}

/** True when running inside a Flompanage desktop shell (WebView2 or macOS WKWebView). */
export function isDesktopShell(): boolean {
  return getHost() != null;
}

function postToHost(payload: NotifyPayload | OpenUrlPayload) {
  const host = getHost();
  if (!host) return false;

  try {
    host.postMessage(payload);
    return true;
  } catch {
    try {
      host.postMessage(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }
}

/** Show a native desktop notification (Windows toast or macOS notification). */
export function showDesktopNotification(title: string, message: string) {
  postToHost({ type: "notify", title, message });
}

/** Open a URL in the default system browser (e.g. GitHub installer download). */
export function openExternalUrl(url: string) {
  if (postToHost({ type: "openUrl", url })) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
