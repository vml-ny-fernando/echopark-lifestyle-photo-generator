import {
  consentRequiredFrom,
  creditsRequiredFrom,
  OutOfCreditsPrompt,
  SignInPrompt,
  signInRequiredFrom,
} from '../platform.tsx';

import { useOnRunwaySignedIn } from '../lib/useOnRunwaySignedIn.ts';
import { Alert } from '../ui/Alert.tsx';
import { ConsentPrompt } from '../ui/ConsentPrompt.tsx';

/** The slice of a tRPC client error this component reads. */
export type NoticeError = {
  message: string;
  data?: { code?: string | undefined } | null | undefined;
};

/**
 * A refusal because the signed-in Runway plan can't use the model: a
 * FORBIDDEN that is neither a credits nor a consent refusal. Retrying never
 * helps until the config (or the plan) changes.
 */
export function isPlanBlocked(error: NoticeError | null | undefined): boolean {
  return (
    !!error &&
    error.data?.code === 'FORBIDDEN' &&
    !creditsRequiredFrom(error) &&
    !consentRequiredFrom(error)
  );
}

export type ErrorNoticeProps = {
  error: NoticeError | null | undefined;
  /** Heading for an ordinary error, e.g. "Couldn't delete the scene". */
  title?: string | undefined;
  /** Re-runs the failed call once the visitor has signed in again. */
  retry?: (() => void) | undefined;
  /** Treat a FORBIDDEN as a plan refusal (only generation can be one). */
  generation?: boolean | undefined;
};

/** Maps a failed call to the right prompt: sign in, credits, consent, plan, or the message. */
export function ErrorNotice({
  error,
  title = 'That didn’t work',
  retry,
  generation = false,
}: ErrorNoticeProps) {
  const onSignedIn = useOnRunwaySignedIn();
  if (!error) return null;

  const signIn = signInRequiredFrom(error);
  if (signIn) {
    return (
      <SignInPrompt reauth={signIn.reauth} onSignedIn={() => onSignedIn(retry)} />
    );
  }
  if (creditsRequiredFrom(error)) return <OutOfCreditsPrompt error={error} />;
  if (consentRequiredFrom(error)) return <ConsentPrompt error={error} />;
  if (generation && isPlanBlocked(error)) {
    return (
      <Alert tone="warning" title="Your Runway Plan Can't Use This Model">
        {error.message}
      </Alert>
    );
  }
  return (
    <Alert tone="error" title={title}>
      {error.message}
    </Alert>
  );
}
