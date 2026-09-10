const scrollDown = document.querySelector(".scroll-down");

window.addEventListener("scroll", () => {
    if (window.scrollY > 100) {
        scrollDown.style.opacity = "0";
    } else {
        scrollDown.style.opacity = "1";
    }
});

let targetScroll = window.scrollY;
let isScrolling = false;

window.addEventListener("wheel", (event) => {
    event.preventDefault();

    targetScroll += event.deltaY;
    targetScroll = Math.max(
        0,
        Math.min(targetScroll, document.documentElement.scrollHeight - window.innerHeight)
    );

    if (!isScrolling) {
        smoothScroll();
    }
}, { passive: false });

function smoothScroll() {
    isScrolling = true;

    const currentScroll = window.scrollY;
    const distance = targetScroll - currentScroll;

    window.scrollTo(0, currentScroll + distance * 0.12);

    if (Math.abs(distance) > 0.5) {
        requestAnimationFrame(smoothScroll);
    } else {
        window.scrollTo(0, targetScroll);
        isScrolling = false;
    }
}
const about = document.querySelector("#about");

window.addEventListener("scroll", () => {
    const aboutPosition = about.getBoundingClientRect().top;
    const screenPosition = window.innerHeight * 0.8;

    if (aboutPosition < screenPosition) {
        about.classList.add("show");
    }
});
const heroTitle = document.querySelector(".hero h1");
const heroSubtitle = document.querySelector(".hero-subtitle");
const heroLabel = document.querySelector(".hero-label");

window.addEventListener("scroll", () => {
    const scroll = window.scrollY;

    const scale = Math.max(0.7, 1 - scroll / 1000);
    const opacity = Math.max(0, 1 - scroll / 400);

    heroTitle.style.transform = `scale(${scale})`;
    heroSubtitle.style.transform = `scale(${scale})`;
heroLabel.style.transform = `scale(${scale})`;
    heroTitle.style.opacity = opacity;
    heroSubtitle.style.opacity = opacity;
    heroLabel.style.opacity = opacity;
});