export function credentialHeaders(token: string | undefined): Readonly<Record<string, string>> {
  if (token === undefined || token.trim().length === 0) {
    return {};
  }
  return { 'X-API-Key': token.trim() };
}
