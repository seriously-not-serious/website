const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Build the Discord OAuth2 authorization URL.
 */
export function getDiscordAuthUrl(callbackUrl: string): string {
  const clientId = import.meta.env.DISCORD_CLIENT_ID;
  if (!clientId) throw new Error('DISCORD_CLIENT_ID is not set');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'identify',
  });

  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeDiscordCode(
  code: string,
  callbackUrl: string
): Promise<string | null> {
  const clientId = import.meta.env.DISCORD_CLIENT_ID;
  const clientSecret = import.meta.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is not set');
  }

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
    }).toString(),
  });

  if (!res.ok) {
    console.error('Discord token exchange failed:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}

/**
 * Fetch the Discord user profile using an access token.
 */
export async function getDiscordProfile(accessToken: string): Promise<{
  discordId: string;
  discordTag: string;
  discordAvatar: string | null;
} | null> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const user = await res.json();

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : null;

  return {
    discordId: user.id,
    discordTag: user.discriminator === '0' ? user.username : `${user.username}#${user.discriminator}`,
    discordAvatar: avatarUrl,
  };
}
