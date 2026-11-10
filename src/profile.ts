/**
 * Pure identity resolution for the `profile` procedure — kept free of SDK
 * and tRPC imports so the rules below can be exercised on their own.
 */

export interface AppProfile {
  /**
   * The per-app user id (`u_…`), the same value as `ctx.userId`: the key for
   * per-user data. `null` where the edge stamps none (`bay dev`, a Studio
   * preview, the internal deployment).
   */
  id: string | null;
  name: string;
  /**
   * For display only, never a storage key. `null` for a guest (a Runway
   * account from outside this workspace), which has no email: a key built
   * from it would be shared by every guest.
   */
  email: string | null;
  avatarUrl: string | null;
}

/** What the `profile` procedure knows about the visitor before deciding. */
export interface ProfileInput {
  /** Gateway-forwarded identity (internal, Google-OIDC cells). */
  headerEmail: string | undefined;
  headerName: string | undefined;
  /** Whether the request carries a Runway session at all. */
  hasRunwayClient: boolean;
  /** `getProfile()`'s answer — `undefined` when there was no client, or it failed. */
  runwayProfile:
    | {
        email: string;
        firstName?: string | null | undefined;
        lastName?: string | null | undefined;
        username?: string | null | undefined;
        picture?: string | null | undefined;
      }
    | undefined;
  /** The session JWT's own `email` claim, the fallback when `getProfile()` failed. */
  tokenEmail: string | undefined;
  /** The per-app user id (`ctx.userId`), `undefined` where there is none. */
  userId: string | undefined;
}

/** Display name for a signed-in visitor nothing else can name, such as a guest. */
export const UNNAMED_VISITOR = 'Runway user';

/**
 * Resolve display identity, or `null` for a visitor with no identity at all
 * — an anonymous viewer of an app shared with anyone (no gateway email, no
 * Runway session). Name chain otherwise: gateway header name → Runway
 * profile firstName+lastName, else username → email local-part.
 *
 * Two guards:
 *
 * - `getProfile()` returns the token OWNER's profile — the account that ran
 *   "Connect Runway" — not necessarily this visitor's. Its name and picture
 *   are trusted only when its email matches the gateway header email, or
 *   when there is no header email to compare against (Bay Studio preview).
 *   Otherwise every visitor of a shared app would see the connector's
 *   identity.
 * - A signed-in visitor whose `getProfile()` failed (Runway API blip,
 *   revoked token, or a guest, whose profile the broker withholds) is still
 *   signed in and is never reported as anonymous: that would flip the UI
 *   into its signed-out state and offer a sign-in that can't help. The JWT's
 *   email names them if there is one; otherwise `email` is `null` and the
 *   name is {@link UNNAMED_VISITOR}. The picture is skipped.
 */
export function resolveProfileIdentity(input: ProfileInput): AppProfile | null {
  const { headerEmail, headerName, hasRunwayClient, runwayProfile } = input;
  if (!hasRunwayClient && !headerEmail) return null;

  const trustRunwayIdentity =
    runwayProfile !== undefined &&
    (!headerEmail || runwayProfile.email === headerEmail);

  const email = headerEmail || runwayProfile?.email || input.tokenEmail || null;

  const runwayName = runwayProfile
    ? [runwayProfile.firstName, runwayProfile.lastName]
        .filter((part): part is string => !!part)
        .join(' ') || runwayProfile.username
    : undefined;

  const name =
    headerName ||
    (trustRunwayIdentity ? runwayName : undefined) ||
    email?.split('@')[0] ||
    email ||
    UNNAMED_VISITOR;

  const avatarUrl = trustRunwayIdentity
    ? (runwayProfile?.picture ?? null)
    : null;

  return { id: input.userId ?? null, name, email, avatarUrl };
}
