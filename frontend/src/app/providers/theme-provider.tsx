import type { PropsWithChildren} from "react";
import { useEffect } from "react";

export default function ThemeProvider({ children }: PropsWithChildren) {
  // Light only for ultra-minimal; can extend to dark later
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return <>{children}</>;
}
