(function () {
    "use strict";

    const body = document.body;
    const themeKey = "chemsearch-theme";
    const themeToggle = document.getElementById("themeToggle");
    const mobileMenuToggle = document.getElementById("mobileMenuToggle");
    const mobileNav = document.getElementById("mobileNav");
    const track = document.getElementById("screenshotsCarouselTrack");
    const prev = document.getElementById("screenshotsPrev");
    const next = document.getElementById("screenshotsNext");
    const dots = document.getElementById("screenshotsCarouselDots");
    const status = document.getElementById("screenshotsCarouselStatus");
    const lightbox = document.getElementById("galleryLightbox");
    const lightboxImage = document.getElementById("galleryLightboxImage");
    const lightboxCaption = document.getElementById("galleryLightboxCaption");
    const lightboxClose = document.getElementById("galleryLightboxClose");
    const apkDownloadLinks = Array.from(document.querySelectorAll("[data-download-apk]"));
    const latestReleaseApiUrl = "https://api.github.com/repos/FurtherSecrets24680/chemsearch-android/releases/latest";
    const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    const fallbackApk = {
        name: "ChemSearch.v1.13.7.apk",
        url: "https://github.com/FurtherSecrets24680/chemsearch-android/releases/download/1.13.7/ChemSearch.v1.13.7.apk",
        version: "v1.13.7"
    };
    let returnFocus = null;

    function setTheme(theme, persist) {
        const isDark = theme === "dark";
        body.setAttribute("data-theme", isDark ? "dark" : "light");
        if (themeToggle) {
            themeToggle.setAttribute("aria-pressed", String(isDark));
            themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
            themeToggle.setAttribute("data-state", isDark ? "a" : "b");
        }
        if (persist) localStorage.setItem(themeKey, isDark ? "dark" : "light");
    }

    setTheme(localStorage.getItem(themeKey) || "dark", false);

    function formatVersion(value) {
        const raw = typeof value === "string" ? value.trim() : "";
        const match = raw.match(/v?\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?/);
        if (!match) return "";
        return match[0].startsWith("v") ? match[0] : `v${match[0]}`;
    }

    function setApkDownload(url, name, version) {
        const label = version ? `Download Latest (${version})` : "Download Latest";
        apkDownloadLinks.forEach((link) => {
            link.href = url;
            link.setAttribute("download", name);
            link.setAttribute("aria-label", `${label} APK`);
            const labelNode = link.querySelector("[data-download-label]");
            if (labelNode) labelNode.textContent = label;
        });
    }

    async function updateLatestApkLinks() {
        if (!apkDownloadLinks.length) return;
        setApkDownload(fallbackApk.url, fallbackApk.name, fallbackApk.version);

        try {
            const response = await fetch(latestReleaseApiUrl, {
                headers: { Accept: "application/vnd.github+json" }
            });
            if (!response.ok) return;

            const release = await response.json();
            const apkAsset = Array.isArray(release.assets)
                ? release.assets.find((asset) => {
                    const name = typeof asset.name === "string" ? asset.name.toLowerCase() : "";
                    return name.endsWith(".apk") && asset.browser_download_url;
                })
                : null;

            if (apkAsset) {
                const version = formatVersion(release.tag_name) || formatVersion(release.name) || formatVersion(apkAsset.name);
                setApkDownload(apkAsset.browser_download_url, apkAsset.name, version);
            }
        } catch (_) {
            setApkDownload(fallbackApk.url, fallbackApk.name, fallbackApk.version);
        }
    }

    updateLatestApkLinks();

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            setTheme(body.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
        });
    }

    function setMobileNav(open) {
        if (!mobileNav || !mobileMenuToggle) return;
        mobileNav.setAttribute("data-open", String(open));
        mobileMenuToggle.setAttribute("aria-expanded", String(open));
        mobileMenuToggle.setAttribute("data-state", open ? "b" : "a");
        const sr = mobileMenuToggle.querySelector(".sr-only");
        if (sr) sr.textContent = open ? "Close menu" : "Open menu";
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener("click", () => {
            setMobileNav(mobileNav ? mobileNav.getAttribute("data-open") !== "true" : false);
        });
    }

    if (mobileNav) {
        mobileNav.addEventListener("click", (event) => {
            if (event.target instanceof HTMLAnchorElement) setMobileNav(false);
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMobileNav(false);
            closeLightbox();
        }
    });

    if (track) {
        const slides = Array.from(track.querySelectorAll(".screenshot-slide"));
        const dotButtons = [];
        let activeIndex = 0;

        slides.forEach((_, index) => {
            if (!dots) return;
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "carousel-dot";
            dot.setAttribute("aria-label", `Go to screenshot ${index + 1}`);
            dot.addEventListener("click", () => goTo(index));
            dots.appendChild(dot);
            dotButtons.push(dot);
        });

        function nearestIndex() {
            let nearest = 0;
            let distance = Infinity;
            slides.forEach((slide, index) => {
                const nextDistance = Math.abs(slide.offsetLeft - track.scrollLeft);
                if (nextDistance < distance) {
                    distance = nextDistance;
                    nearest = index;
                }
            });
            return nearest;
        }

        function sync() {
            activeIndex = nearestIndex();
            if (status) status.textContent = `${activeIndex + 1} / ${slides.length}`;
            if (prev) prev.disabled = activeIndex === 0;
            if (next) next.disabled = activeIndex === slides.length - 1;
            dotButtons.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
        }

        function goTo(index) {
            const slide = slides[Math.max(0, Math.min(index, slides.length - 1))];
            if (!slide) return;
            track.scrollTo({ left: slide.offsetLeft, behavior: "auto" });
            window.setTimeout(sync, 40);
        }

        if (prev) prev.addEventListener("click", () => goTo(activeIndex - 1));
        if (next) next.addEventListener("click", () => goTo(activeIndex + 1));
        track.addEventListener("scroll", () => window.requestAnimationFrame(sync), { passive: true });
        track.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft") goTo(activeIndex - 1);
            if (event.key === "ArrowRight") goTo(activeIndex + 1);
        });
        window.addEventListener("resize", sync);
        sync();
    }

    const modalCloseMs = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")
    ) || 150;

    function openLightbox(src, caption, trigger) {
        if (!lightbox || !lightboxImage || !lightboxCaption) return;
        returnFocus = trigger || null;
        lightboxImage.src = src;
        lightboxImage.alt = caption;
        lightboxCaption.textContent = caption;
        lightbox.classList.remove("is-closing");
        lightbox.classList.add("is-open");
        document.body.style.overflow = "hidden";
        if (lightboxClose) lightboxClose.focus();
    }

    function closeLightbox() {
        if (!lightbox || !lightbox.classList.contains("is-open")) return;
        lightbox.classList.remove("is-open");
        lightbox.classList.add("is-closing");
        document.body.style.overflow = "";
        setTimeout(() => {
            lightbox.classList.remove("is-closing");
            if (lightboxImage) lightboxImage.src = transparentPixel;
        }, modalCloseMs);
        if (returnFocus) returnFocus.focus();
        returnFocus = null;
    }

    document.querySelectorAll(".screenshot-card").forEach((card) => {
        card.addEventListener("click", () => {
            openLightbox(card.dataset.previewSrc || "", card.dataset.previewCaption || "Screenshot", card);
        });
    });

    if (lightbox) {
        lightbox.addEventListener("click", (event) => {
            if (event.target === lightbox && lightbox.classList.contains("is-open")) closeLightbox();
        });
    }

    if (lightboxClose) {
        lightboxClose.addEventListener("click", closeLightbox);
    }
}());
