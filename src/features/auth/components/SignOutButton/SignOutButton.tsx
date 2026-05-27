import { Button } from "@/components/ui/Button/Button";
import { FaArrowRightFromBracket } from "react-icons/fa6";
import { logoutUser } from "@/features/auth/actions";
import styles from "./SignOutButton.module.css";

export function SignOutButton() {
  return (
    <form action={logoutUser} className={styles.form}>
      <Button type="submit" variant="ghost" aria-label="Sign out">
        <FaArrowRightFromBracket className={styles.icon} />
      </Button>
    </form>
  );
}
