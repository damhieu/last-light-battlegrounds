// Replaced by Vite at build time, so reloading the game never changes this date.
export const BUILD_INFO = __BUILD_INFO__;
export const BUILD_TIME_LABEL =
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: BUILD_INFO.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(BUILD_INFO.builtAt)) + " (UTC+7)";
