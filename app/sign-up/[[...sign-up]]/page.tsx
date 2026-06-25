import { SignUp } from '@clerk/nextjs';
import { Logo } from '@/components/logo';

export const metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <div className="safe-top safe-bottom grid min-h-dvh place-items-center px-5 py-10">
      <div className="flex flex-col items-center gap-6">
        <span className="flex items-center gap-2">
          <Logo className="size-9" />
          <span className="text-xl font-semibold tracking-tight">Tally</span>
        </span>
        <SignUp
          forceRedirectUrl="/app"
          signInUrl="/sign-in"
          appearance={{ elements: { card: 'shadow-lift' } }}
        />
      </div>
    </div>
  );
}
