/**
 * Converte erros do Supabase/Postgres em mensagens seguras para o usuário,
 * sem vazar nomes de colunas, constraints ou estrutura interna do banco.
 * Detalhes técnicos só vão para o console em ambiente de desenvolvimento.
 */
export function safeErrorMessage(
  error: { message?: string; code?: string } | null | undefined,
  fallback = "Ocorreu um erro. Tente novamente.",
): string {
  if (!error) return fallback;

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[supabase error]", error);
  }

  const code = error.code;
  // Mapeamento de códigos Postgres conhecidos → mensagem amigável
  switch (code) {
    case "23505": // unique_violation
      return "Este horário já está reservado. Escolha outro.";
    case "23514": // check_violation
      return "Dados inválidos. Verifique os campos.";
    case "42501": // insufficient_privilege
      return "Você não tem permissão para esta ação.";
    case "22023": // invalid_parameter_value
      return "Dados inválidos. Verifique os campos.";
    case "PGRST301":
    case "PGRST116":
      return "Você não tem permissão para esta ação.";
    default:
      return fallback;
  }
}