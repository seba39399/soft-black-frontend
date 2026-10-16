"use client";

/**
 * Resumen de la sesión para la pantalla de ejemplo: usuario, grupos de
 * Cognito y dashboards a los que tiene acceso. Sirve para comprobar de un
 * vistazo que la autenticación y la autorización por grupos funcionan.
 */

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { getUserGroups } from "@/features/auth/utils/cognito-groups";
import {
  catalogNavItems,
  type NavItem,
} from "@/features/main-dashboard/utils/nav-config";

export interface SessionSummary {
  userName: string;
  groups: string[];
  dashboards: NavItem[];
}

export function useSessionSummary(): SessionSummary | null {
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getCurrentUser(), getUserGroups()])
      .then(([user, groups]) => {
        if (cancelled) return;
        setSummary({
          userName: user.signInDetails?.loginId ?? user.username,
          groups,
          dashboards: catalogNavItems(),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSummary({
          userName: "Invitado",
          groups: [],
          dashboards: catalogNavItems(),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return summary;
}
