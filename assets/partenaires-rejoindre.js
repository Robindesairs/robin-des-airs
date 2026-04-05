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

  const programmeSelect = document.getElementById("field-programme");
  if (programmeSelect) {
    const params = new URLSearchParams(window.location.search);
    const p = (params.get("programme") || "").toLowerCase();
    if (p === "fcfa" || p === "cfa") {
      programmeSelect.value = "fcfa";
    }
  }

  const form = document.querySelector(".partner-join-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const cc = String(fd.get("whatsapp_indicatif") || "").replace(/\D/g, "");
      const nat = String(fd.get("whatsapp_national") || "").replace(/\D/g, "");
      const whatsappFull = cc && nat ? "+" + cc + " " + nat : nat ? nat : "";

      const payload = {
        programme: fd.get("programme"),
        nom: fd.get("nom"),
        agence: fd.get("agence"),
        pays: fd.get("pays"),
        email: fd.get("email"),
        whatsapp_indicatif: cc,
        whatsapp_national: nat,
        whatsapp_complet: whatsappFull,
        volume_voyageurs_mois: fd.get("volume_voyageurs_mois"),
        destinations_principales: fd.get("destinations_principales"),
        compagnies_routes: fd.get("compagnies_routes"),
        message: fd.get("message"),
        flux_reservations_anticipees: fd.get("flux_reservations_anticipees") === "oui",
      };

      if (typeof console !== "undefined" && console.debug) {
        console.debug("[partenaires] rejoindre", payload);
      }

      const btn = form.querySelector("button[type='submit']");
      if (btn) {
        btn.textContent = "Demande enregistrée — nous recontactons vite";
        btn.disabled = true;
      }
    });
  }
})();
