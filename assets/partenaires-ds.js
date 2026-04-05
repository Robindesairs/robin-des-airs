(function () {
  const menuBtn = document.getElementById("ds-menu-btn");
  const menu = document.getElementById("ds-nav-menu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        menu.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

})();
