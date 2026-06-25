import { SignIn } from '@clerk/nextjs';
import { Logo } from '@/components/logo';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div className="safe-top safe-bottom grid min-h-dvh place-items-center px-5 py-10">
      <div className="flex flex-col items-center gap-6">
        <span className="flex items-center gap-2">
          <Logo className="size-9" />
          <span className="text-xl font-semibold tracking-tight">Tally</span>
        </span>
        <SignIn
          forceRedirectUrl="/app"
          signUpUrl="/sign-up"
          appearance={{ elements: { card: 'shadow-lift' } }}
        />
      </div>
    </div>
  );
}
