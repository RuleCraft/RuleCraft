"use client";

import { useEffect, useState } from "react";
import { DEPLOYMENT, LOCAL_DEPLOY, LOCAL_DEPLOY_KEY } from "@/config/deployment";
import { isAddress } from "@/config/brand";

export type Deployment = { registry: string; launcher: string; hook: string; deployed: boolean; source: "config" | "local" | "none" };

function fromConfig(): Deployment {
  const ok = isAddress(DEPLOYMENT.registry) && isAddress(DEPLOYMENT.launcher) && isAddress(DEPLOYMENT.hook);
  return { registry: DEPLOYMENT.registry, launcher: DEPLOYMENT.launcher, hook: DEPLOYMENT.hook, deployed: ok, source: ok ? "config" : "none" };
}

function read(): Deployment {
  const base = fromConfig();
  if (base.deployed || !LOCAL_DEPLOY) return base;
  try {
    const raw = window.localStorage.getItem(LOCAL_DEPLOY_KEY);
    if (!raw) return base;
    const j = JSON.parse(raw) as Partial<Deployment>;
    if (isAddress(j.registry ?? "") && isAddress(j.launcher ?? "") && isAddress(j.hook ?? ""))
      return { registry: j.registry!, launcher: j.launcher!, hook: j.hook!, deployed: true, source: "local" };
  } catch {
    // Storage blocked: no local override.
  }
  return base;
}

/** The Rule Craft contracts this page talks to, or deployed=false when there are none yet. */
export function useDeployment(): Deployment {
  const [d, setD] = useState<Deployment>(fromConfig);
  useEffect(() => {
    setD(read());
    const on = () => setD(read());
    window.addEventListener("storage", on);
    window.addEventListener("rulecraft:deployment", on);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("rulecraft:deployment", on);
    };
  }, []);
  return d;
}
