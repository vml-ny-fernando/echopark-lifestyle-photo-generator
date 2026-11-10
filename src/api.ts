import {
  decodeJwtPayload,
  getRunwayToken,
  type RunwayProfile,
} from './platform/runway.ts';

import { libraryProcedures } from './api-library.ts';
import { type AppProfile, resolveProfileIdentity } from './profile.ts';
import { publicProcedure, router, type Context } from './trpc.ts';

export type { AppProfile } from './profile.ts';

/**
 * Gather what the request knows about the visitor and hand the decision to
 * `resolveProfileIdentity` (src/profile.ts): gateway headers, the Runway
 * profile if the session has one and the call succeeds, and the session
 * JWT's own email as the fallback when it doesn't. A visitor with neither a
 * session nor a gateway identity is anonymous (`null`) before any call.
 *
 * Key per-user data by `ctx.userId` (the profile's `id`), never by `email`:
 * a guest has no email, so every guest would share one record.
 */
async function resolveProfile(ctx: Context): Promise<AppProfile | null> {
  const headerEmail = ctx.user?.email;
  if (!ctx.runway && !headerEmail) return null;

  let runwayProfile: RunwayProfile | undefined;
  if (ctx.runway) {
    try {
      runwayProfile = await ctx.runway.getProfile();
    } catch {
      runwayProfile = undefined;
    }
  }
  const token = getRunwayToken(ctx.req);
  return resolveProfileIdentity({
    headerEmail,
    headerName: ctx.user?.name,
    hasRunwayClient: ctx.runway !== undefined,
    runwayProfile,
    tokenEmail: token ? decodeJwtPayload(token)?.email : undefined,
    userId: ctx.userId,
  });
}

export const AppRouter = router({
  profile: publicProcedure.query(({ ctx }) => resolveProfile(ctx)),

  ...libraryProcedures,
});

export type AppRouterType = typeof AppRouter;
