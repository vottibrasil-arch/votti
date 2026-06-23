export const ADSENSE_CLIENT = "ca-pub-1870651771757279";

/** URL oficial do script AdSense (Publisher ID no query `client`). */
export const ADSENSE_SCRIPT_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1870651771757279";

/** Tag literal para injeção SSR — deve coincidir com o snippet oficial do Google. */
export const ADSENSE_SCRIPT_TAG =
  `<script async src="${ADSENSE_SCRIPT_SRC}" crossorigin="anonymous"></script>`;

/** Meta de verificação AdSense (HTML bruto). */
export const ADSENSE_META_TAG =
  `<meta name="google-adsense-account" content="${ADSENSE_CLIENT}">`;

/** Bloco completo de verificação AdSense para injeção SSR. */
export const ADSENSE_VERIFICATION_BLOCK = `${ADSENSE_META_TAG}${ADSENSE_SCRIPT_TAG}`;

export function injectAdSenseVerification(html: string) {
  if (!html.includes("</head>")) return html;

  let next = html;
  if (!next.includes("google-adsense-account")) {
    next = next.replace("</head>", `${ADSENSE_META_TAG}</head>`);
  }
  if (!next.includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")) {
    next = next.replace("</head>", `${ADSENSE_SCRIPT_TAG}</head>`);
  }
  return next;
}

/** @deprecated Use injectAdSenseVerification */
export function injectAdSenseScript(html: string) {
  return injectAdSenseVerification(html);
}
