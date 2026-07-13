export const FORMSUBMIT_EMAIL = "vottibrasil@gmail.com";

export const FORMSUBMIT_AJAX_URL = `https://formsubmit.co/ajax/${FORMSUBMIT_EMAIL}`;

type FormSubmitResponse = {
  success?: string | boolean;
  message?: string;
};

export async function submitToFormSubmit(fields: Record<string, string>): Promise<void> {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }

  const response = await fetch(FORMSUBMIT_AJAX_URL, {
    method: "POST",
    body,
    headers: { Accept: "application/json" },
  });

  let payload: FormSubmitResponse | null = null;
  try {
    payload = (await response.json()) as FormSubmitResponse;
  } catch {
    payload = null;
  }

  const success = payload?.success === true || payload?.success === "true";
  if (!response.ok || !success) {
    throw new Error(payload?.message?.trim() || "Não foi possível enviar. Tente novamente.");
  }
}
