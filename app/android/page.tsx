"use client";
import { useEffect } from "react";
export default function AndroidEntry() {
  useEffect(() => {
    sessionStorage.setItem("grantflow_platform", "play");
    window.location.replace("/auth/login");
  }, []);
  return <main className="p-6">Opening GrantFlow…</main>;
}
