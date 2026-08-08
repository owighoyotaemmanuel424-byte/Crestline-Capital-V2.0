"use client";
import { useEffect } from "react";

export default function DashboardResponsive({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const menu = document.querySelector<HTMLButtonElement>(".mobile-menu");
    const sidebar = document.querySelector<HTMLElement>(".premium-sidebar");
    if (!menu || !sidebar) return;

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Close navigation");
    backdrop.className = "dashboard-sidebar-backdrop";
    document.body.appendChild(backdrop);

    const close = () => {
      sidebar.classList.remove("drawer-open");
      backdrop.classList.remove("visible");
      document.body.classList.remove("drawer-scroll-lock");
    };
    const open = () => {
      sidebar.classList.add("drawer-open");
      backdrop.classList.add("visible");
      document.body.classList.add("drawer-scroll-lock");
    };
    menu.addEventListener("click", open);
    backdrop.addEventListener("click", close);
    sidebar.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    return () => { menu.removeEventListener("click", open); backdrop.removeEventListener("click", close); backdrop.remove(); document.body.classList.remove("drawer-scroll-lock"); };
  }, []);

  return <>
    <style jsx global>{`
      .dashboard-sidebar-backdrop{display:none}.drawer-scroll-lock{overflow:hidden}
      @media(max-width:850px){
        .premium-sidebar.drawer-open{display:flex;position:fixed;left:0;top:0;bottom:0;width:min(286px,88vw);height:100dvh;z-index:120;background:#fff;padding:22px 15px;box-shadow:18px 0 45px rgba(23,48,66,.18);overflow-y:auto;transform:translateX(0)}
        .premium-sidebar.drawer-open .premium-logo{padding-right:8px}
        .dashboard-sidebar-backdrop.visible{display:block;position:fixed;inset:0;z-index:110;border:0;background:rgba(18,36,49,.30);backdrop-filter:blur(2px)}
        .premium-sidebar.drawer-open::after{content:"×";position:absolute;right:14px;top:16px;width:34px;height:34px;border-radius:9px;background:#f1f5f7;color:#50616c;display:grid;place-items:center;font-size:22px;pointer-events:none}
      }
    `}</style>
    {children}
  </>;
}
