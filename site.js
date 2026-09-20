// lumnik.fr — micro-interactions (aucune dépendance)

// Barre de dégel : la lecture réchauffe la page.
const thermo = document.getElementById("thermometre");
if (thermo) {
  const maj = () => {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    thermo.style.width = total > 0 ? (h.scrollTop / total) * 100 + "%" : "0";
  };
  document.addEventListener("scroll", maj, { passive: true });
  maj();
}

// Révélation des sections au défilement.
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("vu");
        observer.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Navigation mobile : un seul état, partagé entre la classe CSS et l'attribut ARIA.
const menuToggle = document.querySelector(".menu-toggle");
const menu = document.getElementById("menu-principal");
const menuNav = menuToggle?.closest("nav");

if (menuToggle && menu && menuNav) {
  const setMenuOpen = (open) => {
    menuNav.classList.toggle("menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
}
