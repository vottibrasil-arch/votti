export function pollQrCodeImageUrl(url: string, size = 512) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

export async function downloadPollQrCode(url: string, filename: string) {
  const response = await fetch(pollQrCodeImageUrl(url));
  if (!response.ok) throw new Error("Não foi possível gerar o QR Code.");

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
