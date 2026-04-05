(function () {
  const menuBtn = document.getElementById("menu-btn");
  const menu = document.getElementById("menu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }
})();
