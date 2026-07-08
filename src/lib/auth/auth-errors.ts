export const AUTH_EMAIL_ALREADY_EXISTS_MSG =
  "Este e-mail já está cadastrado no Supabase (Authentication → Users). Faça login ou use outro e-mail.";

export const AUTH_EMAIL_ALREADY_EXISTS_UNCONFIRMED_MSG =
  "Este e-mail já foi cadastrado, mas ainda não foi confirmado. Verifique sua caixa de entrada ou faça login.";

export const AUTH_SIGNUP_NOT_CREATED_MSG =
  "Não foi possível criar a conta no Supabase. Tente de novo ou use outro e-mail.";

export const AUTH_PROJECT_MISMATCH_MSG =
  "O app e o painel Supabase parecem ser projetos diferentes. Confira se VITE_SUPABASE_URL e SUPABASE_URL no .env apontam para o mesmo projeto (o mesmo ID antes de .supabase.co).";

export const AUTH_BROWSER_SERVER_PROJECT_MISMATCH_MSG =
  "O navegador ainda usa um projeto Supabase antigo. Pare o terminal (Ctrl+C), rode npm run dev de novo e recarregue a página (Ctrl+F5).";

export const AUTH_ADMIN_LOOKUP_REQUIRED_MSG =
  "Para validar o cadastro com precisão, adicione SUPABASE_SERVICE_ROLE_KEY no .env e reinicie o servidor.";

export function isDuplicateSignupMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("auth_email_already_exists")
  );
}

export function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (isDuplicateSignupMessage(message)) {
    return AUTH_EMAIL_ALREADY_EXISTS_MSG;
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "E-mail ou senha incorretos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }

  if (normalized.includes("auth_signup_not_created")) {
    return AUTH_SIGNUP_NOT_CREATED_MSG;
  }

  if (normalized.includes("auth_project_mismatch")) {
    return AUTH_PROJECT_MISMATCH_MSG;
  }

  if (normalized.includes("invalid api key")) {
    return "Chave Supabase inválida para este projeto. Confira VITE_SUPABASE_ANON_KEY no .env (publishable key de ppvhlocqetyrsqidijms) e reinicie o npm run dev.";
  }

  return message;
}

export function resolveSignupConflictMessage(options: {
  adminConfigured: boolean;
  emailAvailable: boolean;
  envMismatch?: boolean;
}): string {
  if (options.envMismatch) return AUTH_PROJECT_MISMATCH_MSG;

  if (options.adminConfigured && options.emailAvailable) {
    return AUTH_PROJECT_MISMATCH_MSG;
  }

  if (!options.adminConfigured) {
    return AUTH_ADMIN_LOOKUP_REQUIRED_MSG;
  }

  return AUTH_EMAIL_ALREADY_EXISTS_MSG;
}
