"use client";

/**
 * Menú superior flotante. Recibe `navItems` por props: no hay listas
 * escritas a mano. El ítem de la ruta actual va en píldora amarilla.
 */

import Link from "next/link";
import {
  isRouteActive,
  type NavItem,
} from "@/features/main-dashboard/utils/nav-config";

export interface TopNavProps {
  navItems: NavItem[];
  activeHref: string;
}

export default function TopNav({
  navItems,
  activeHref,
}: TopNavProps): React.ReactElement {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 flex justify-center px-3 sm:px-4">
      <nav
        aria-label="Navegación principal"
        className="pointer-events-auto max-w-full overflow-x-auto rounded-full bg-black/50 px-1.5 py-1.5 backdrop-blur-md sm:px-2 sm:py-2"
      >
        <ul className="flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            const isActive = isRouteActive(item.href, activeHref);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "inline-block whitespace-nowrap px-2 py-1 text-[11px] font-black tracking-wide sm:px-4 sm:py-1.5 sm:text-sm sm:tracking-[0.14em] " +
                    (isActive
                      ? "rounded-full bg-[#ffc100] text-[#000000]"
                      : "text-white")
                  }
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
