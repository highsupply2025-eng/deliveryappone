// Only the hosted authentication service generates codes; never invent a fallback.
export function loginEmailProps(siteName: string, data: { token?: string | null }) {
  return { siteName, token: data.token ?? '' }
}