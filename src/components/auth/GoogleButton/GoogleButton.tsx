import { Button } from "@/components/ui/Button/Button";
import { FaGoogle } from "react-icons/fa6";

export function GoogleButton() {
  return (
    <Button>
      <FaGoogle size={20} />
      Sign in with Google
    </Button>
  );
}
