// Code-only warming: never fetch user data or mount a panel during preloading.
export function preloadPanel(hash: string) {
  switch (hash) {
    case "#mail": return import("@/components/MailPanel");
    case "#schedule": return import("@/components/SchedulePanel");
    case "#bill": return import("@/components/BillPanel");
    default: return Promise.resolve();
  }
}
