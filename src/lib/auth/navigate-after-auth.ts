/** Redirecionamento pós-login — recarrega a rota de destino de forma confiável. */
export function navigateAfterAuth(_navigate: unknown, redirect: string) {
  const target = redirect.startsWith("/") ? redirect : "/create";
  window.location.replace(target);
}
