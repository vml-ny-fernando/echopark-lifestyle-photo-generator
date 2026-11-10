/**
 * Stand-ins for the `@runway/bay-react` helpers the app used inside Runway.
 * Signing in is the tester password page (/sign-in); there are no Runway
 * credits or consent grants in the self-hosted build, so those checks always
 * answer "not required".
 */
import { Alert } from './ui/Alert.tsx';
import { TextLink } from './ui/Text.tsx';

type MaybeTrpcError = {
  data?: { code?: string | undefined; reauth?: string | undefined } | null | undefined;
} | null | undefined;

/** A refusal because the tester's session ended. */
export function signInRequiredFrom(error: unknown): { reauth: string } | null {
  const data = (error as MaybeTrpcError)?.data;
  return data?.code === 'UNAUTHORIZED' ? { reauth: data.reauth ?? '/sign-in' } : null;
}

export function creditsRequiredFrom(_error: unknown): null {
  return null;
}

export function consentRequiredFrom(_error: unknown): { consent: string } | null {
  return null;
}

export function goToRunwayConsent(_url: string): 'opened' | 'blocked' {
  return 'opened';
}

export function runwayConsentNavigationUrl(url: string): string {
  return url;
}

export function SignInPrompt(_props: { reauth?: string | undefined; onSignedIn?: () => void }) {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  return (
    <Alert tone="info" title="Sign In Again">
      Your tester session has ended.{' '}
      <TextLink href={`/sign-in?next=${next}`}>Sign in</TextLink> to carry on.
    </Alert>
  );
}

export function OutOfCreditsPrompt(_props: { error: unknown }) {
  return null;
}
