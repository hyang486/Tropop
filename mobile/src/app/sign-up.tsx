import { HostAccountForm } from '@/components/host-account-form';
import { clearCharacterPrompt, markCharacterPrompt } from '@/features/characters/first-run';
import { en } from '@/i18n/en';
import { signUpHost } from '@/lib/auth';

export default function SignUp() {
  return (
    <HostAccountForm
      mode="sign-up"
      submitTitle={en.signUp.submit}
      onSubmit={async ({ email, password, name }) => {
        // B3: Rooms shows "Pick your character" once after sign-up. Set before the account exists (sign-in navigates at once).
        await markCharacterPrompt();
        try {
          const { needsConfirmation } = await signUpHost(email, password, name);
          if (needsConfirmation) return en.signUp.checkEmail;
        } catch (e) {
          await clearCharacterPrompt();
          throw e;
        }
      }}
    />
  );
}
