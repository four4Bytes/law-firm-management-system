import { FaGoogle } from 'react-icons/fa6';

import { Button } from '@/components/ui/Button/Button';
import { loginWithGoogle } from '@/features/auth/actions';

import styles from './SignInButton.module.css';

export function SignInButton() {
  return (
    <form action={loginWithGoogle} className={styles.form}>
      <Button className={styles.button} type="submit">
        <FaGoogle className={styles.icon} />
        Sign in with Google
      </Button>
    </form>
  );
}
