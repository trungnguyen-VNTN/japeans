/** Pure helpers for sign-in configuration (unit-tested in auth-config.test.ts). */

export const AUTH_ENV_VARS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"] as const;

/** Names of required env vars that are missing or blank. */
export function missingAuthEnv(env: Record<string, string | undefined>): string[] {
  return AUTH_ENV_VARS.filter((name) => !env[name]?.trim());
}

/**
 * Only allow redirects back into this site after sign-in (no open redirect):
 * a relative path starting with a single "/" is kept, anything else becomes "/".
 */
export function safeCallbackPath(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/";
  return v;
}

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "Email này đã được dùng với một cách đăng nhập khác.",
  AccessDenied: "Bạn đã từ chối cấp quyền hoặc tài khoản không được phép đăng nhập.",
  Configuration: "Máy chủ chưa cấu hình đăng nhập. Vui lòng thử lại sau.",
};

/** Vietnamese message for a next-auth error code (?error=…). */
export function signInErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return ERRORS[code] ?? "Đăng nhập không thành công. Vui lòng thử lại.";
}
