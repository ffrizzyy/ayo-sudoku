/* Runs before first paint so the saved theme never flashes. External because the CSP forbids inline scripts. */
(function () {
  try {
    var root = document.documentElement;
    var stored = null;
    try {
      stored = localStorage.getItem("ayo.theme");
    } catch (error) {
      stored = null;
    }
    var prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || (stored !== "light" && prefersDark);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.style.colorScheme = dark ? "dark" : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#000000" : "#F2F2F7");
  } catch (error) {
    /* A blocked storage API should never stop the app from loading. */
  }
})();
