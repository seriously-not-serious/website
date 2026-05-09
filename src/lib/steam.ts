// Steam uses OpenID 2.0, not OAuth.
// We redirect to Steam's OpenID endpoint and validate the assertion on return.

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

/**
 * Build the URL that redirects the user to Steam's login page.
 */
export function getSteamLoginUrl(callbackUrl: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': callbackUrl,
    'openid.realm': new URL(callbackUrl).origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

/**
 * Validate Steam's OpenID assertion and extract the Steam64 ID.
 * Returns null if validation fails.
 */
export async function validateSteamCallback(returnUrl: string): Promise<string | null> {
  const url = new URL(returnUrl);
  const params = Object.fromEntries(url.searchParams.entries());

  if (params['openid.mode'] !== 'id_res') {
    return null;
  }

  // Verify by re-sending the params back to Steam with mode=check_authentication
  const verifyParams = new URLSearchParams({
    ...params,
    'openid.mode': 'check_authentication',
  });

  const verifyRes = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  });

  const verifyText = await verifyRes.text();

  if (!verifyText.includes('is_valid:true')) {
    return null;
  }

  // Extract Steam64 ID from the claimed_id URL
  // Format: https://steamcommunity.com/openid/id/76561198XXXXXXXXX
  const claimedId = params['openid.claimed_id'];
  const match = claimedId?.match(/\/openid\/id\/(\d+)$/);
  return match?.[1] ?? null;
}

/**
 * Fetch Steam user profile using the Steam Web API.
 */
export async function getSteamProfile(steamId: string): Promise<{
  steamId: string;
  steamName: string;
  steamAvatar: string | null;
} | null> {
  const apiKey = import.meta.env.STEAM_API_KEY;
  if (!apiKey) throw new Error('STEAM_API_KEY is not set');

  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`
  );

  if (!res.ok) return null;

  const data = await res.json();
  const player = data?.response?.players?.[0];

  if (!player) return null;

  return {
    steamId: player.steamid,
    steamName: player.personaname,
    steamAvatar: player.avatarfull ?? player.avatar ?? null,
  };
}
