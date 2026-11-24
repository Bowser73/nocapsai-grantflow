"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
const Context = createContext<boolean | null>(null);
export function PlayContext({ children }: { children: ReactNode }) {
  const [play, setPlay] = useState<boolean | null>(null);
  useEffect(() => {
    const launched =
      new URLSearchParams(location.search).get("grantflow-platform") === "play";
    if (launched) sessionStorage.setItem("grantflow_platform", "play");
    const active =
      launched ||
      location.pathname === "/android" ||
      sessionStorage.getItem("grantflow_platform") === "play";
    setPlay(active);
    if (active && location.pathname === "/") location.replace("/dashboard");
  }, []);
  return <Context.Provider value={play}>{children}</Context.Provider>;
}
export const usePlayContext = () => useContext(Context);
