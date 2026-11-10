import {
  consentRequiredFrom,
  SignInPrompt,
  signInRequiredFrom,
} from '../platform.tsx';

import { useOnRunwaySignedIn } from '../lib/useOnRunwaySignedIn.ts';
import { Alert } from '../ui/Alert.tsx';
import { ConsentPrompt } from '../ui/ConsentPrompt.tsx';

export type MutationErrorProps = {
  error: unknown;
  /** Short, specific headline for the plain error case. */
  title: string;
  /** Re-runs the failed call with its original input (after sign-in). */
  onRetry: () => void;
  className?: string | undefined;
};

/** The error beside a failed signed-in action: sign-in prompt, consent prompt,
 * or a plain readable alert. */
export function MutationError({
  error,
  title,
  onRetry,
  className,
}: MutationErrorProps) {
  const onSignedIn = useOnRunwaySignedIn();
  const signIn = signInRequiredFrom(error);
  if (signIn) {
    return (
      <SignInPrompt
        reauth={signIn.reauth}
        onSignedIn={() => onSignedIn(onRetry)}
      />
    );
  }
  if (consentRequiredFrom(error)) return <ConsentPrompt error={error} />;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Alert tone="error" title={title} className={className}>
      {message}
    </Alert>
  );
}
