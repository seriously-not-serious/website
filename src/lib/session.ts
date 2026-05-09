import { getIronSession, type IronSession } from 'iron-session';
import type { AstroCookies } from 'astro';

export type SessionData = {
  userId?: number;
  // Temporary storage while linking accounts
  pendingSteamId?: string;
  pendingSteamName?: string;
  pendingSteamAvatar?: string;
  pendingDiscordId?: string;
  pendingDiscordTag?: string;
  pendingDiscordAvatar?: string;
};

const SESSION_OPTIONS = {
  password: import.meta.env.SESSION_SECRET as string,
  cookieName: 'astro_link_session',
  cookieOptions: {
    secure: import.meta.env.PROD,
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

/**
 * Get the iron-session from Astro's request/response objects.
 * Usage: const session = await getSession(Astro.request, Astro.cookies);
 */
export async function getSession(request: Request, cookies: AstroCookies): Promise<IronSession<SessionData>> {
  // iron-session needs a Response-like object to write Set-Cookie headers.
  // We pass a dummy response and copy the cookie header back to Astro cookies.
  const response = new Response();
  const session = await getIronSession<SessionData>(request, response, SESSION_OPTIONS);
  return session;
}

/**
 * Saves the session and writes the Set-Cookie header into a Response.
 */
export async function saveSession(session: IronSession<SessionData>, response: Response): Promise<void> {
  await session.save();
  // iron-session writes Set-Cookie onto the same response object it was given
  // when using the (request, response) overload.
}

/**
 * Utility: get session and return the cookie string after saving.
 * Returns the Set-Cookie header value to be forwarded in API responses.
 */
export async function getAndSaveSession(
  request: Request,
  mutate: (session: IronSession<SessionData>) => Promise<void> | void
): Promise<{ session: IronSession<SessionData>; setCookie: string | null }> {
  const res = new Response();
  const session = await getIronSession<SessionData>(request, res, SESSION_OPTIONS);
  await mutate(session);
  await session.save();
  return {
    session,
    setCookie: res.headers.get('set-cookie'),
  };
}
