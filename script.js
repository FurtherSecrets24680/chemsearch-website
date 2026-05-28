(function () {
    'use strict';

    const body = document.body;
    const themeKey = 'chemsearch-theme';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileBreakpoint = window.matchMedia('(max-width: 980px)');

    const themeToggle = document.getElementById('themeToggle');
    const themeToggleIcon = document.getElementById('themeToggleIcon');
    const releaseStatus = document.getElementById('releaseStatus');
    const releaseStatusText = document.getElementById('releaseStatusText');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenuIcon = document.getElementById('mobileMenuIcon');
    const mobileNavPanel = document.getElementById('mobileNavPanel');
    const mobileNavDropdown = document.getElementById('mobileNavDropdown');
    const toTopBtn = document.getElementById('toTopBtn');
    let mobileNavCloseTimer = null;

    function cssMs(name, fallback) {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        if (!raw) return fallback;
        if (raw.endsWith('ms')) return parseFloat(raw) || fallback;
        if (raw.endsWith('s')) return (parseFloat(raw) || 0) * 1000 || fallback;
        return parseFloat(raw) || fallback;
    }

    function setTheme(theme, persist) {
        const isDark = theme === 'dark';
        body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', String(isDark));
            themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
        if (themeToggleIcon) {
            themeToggleIcon.dataset.state = isDark ? 'b' : 'a';
        }
        if (persist) localStorage.setItem(themeKey, isDark ? 'dark' : 'light');
    }

    const savedTheme = localStorage.getItem(themeKey);
    setTheme(savedTheme || 'dark', false);
    if (!prefersReducedMotion) body.classList.add('motion-ready');

    const tagChars = Array.from(document.querySelectorAll('.tag-char'));
    tagChars.forEach((el, index) => {
        el.style.setProperty('--tag-delay', `${260 + (index * 18)}ms`);
        el.style.setProperty('--tag-hover-delay', `${index * 16}ms`);
    });
    if (tagChars.length) {
        if (prefersReducedMotion) {
            body.classList.add('tagline-settled');
        } else {
            setTimeout(() => body.classList.add('tagline-settled'), 1120);
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = body.getAttribute('data-theme') === 'dark';
            setTheme(isDark ? 'light' : 'dark', true);
        });
    }

    function setMobileNavState(isOpen) {
        clearTimeout(mobileNavCloseTimer);
        body.classList.toggle('mobile-nav-open', isOpen);
        if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
        if (mobileMenuIcon) mobileMenuIcon.dataset.state = isOpen ? 'b' : 'a';
        if (!mobileNavDropdown) return;
        if (isOpen) {
            mobileNavDropdown.classList.remove('is-closing');
            mobileNavDropdown.classList.add('is-open');
            return;
        }
        mobileNavDropdown.classList.remove('is-open');
        mobileNavDropdown.classList.add('is-closing');
        if (prefersReducedMotion) {
            mobileNavDropdown.classList.remove('is-closing');
            return;
        }
        mobileNavCloseTimer = setTimeout(() => {
            mobileNavDropdown.classList.remove('is-closing');
        }, cssMs('--dropdown-close-dur', 150));
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            setMobileNavState(!body.classList.contains('mobile-nav-open'));
        });
    }

    mobileBreakpoint.addEventListener('change', (e) => {
        if (!e.matches) setMobileNavState(false);
    });

    document.querySelectorAll('.mobile-nav a, .primary-nav a').forEach((link) => {
        link.addEventListener('click', () => {
            if (mobileBreakpoint.matches) setMobileNavState(false);
        });
    });

    document.addEventListener('click', (event) => {
        if (!body.classList.contains('mobile-nav-open') || !mobileBreakpoint.matches) return;
        if (!(event.target instanceof Node)) return;
        if (mobileNavPanel && mobileNavPanel.contains(event.target)) return;
        if (mobileMenuToggle && mobileMenuToggle.contains(event.target)) return;
        setMobileNavState(false);
    });

    function createTransitionLayer(className) {
        const layer = document.createElement('div');
        layer.className = `page-transition ${className}`;
        layer.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 5; i += 1) {
            const panel = document.createElement('span');
            panel.style.setProperty('--panel-index', String(i));
            layer.appendChild(panel);
        }
        document.body.appendChild(layer);
        return layer;
    }

    if (!prefersReducedMotion) {
        const enteringLayer = createTransitionLayer('is-entering');
        setTimeout(() => enteringLayer.remove(), 820);

        document.addEventListener('click', (event) => {
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
            if (!anchor) return;
            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
            if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

            const targetUrl = new URL(href, window.location.href);
            const samePageHash = targetUrl.origin === window.location.origin
                && targetUrl.pathname === window.location.pathname
                && targetUrl.hash;
            if (targetUrl.origin !== window.location.origin || samePageHash) return;

            event.preventDefault();
            const exitLayer = createTransitionLayer('is-exiting');
            requestAnimationFrame(() => exitLayer.classList.add('is-active'));
            setTimeout(() => {
                window.location.href = targetUrl.href;
            }, 430);
        });
    }

    function markJumpTarget(hash) {
        if (!hash) return;
        const target = document.querySelector(hash);
        if (!target) return;
        target.classList.remove('is-jump-target');
        void target.offsetWidth;
        target.classList.add('is-jump-target');
        setTimeout(() => target.classList.remove('is-jump-target'), 900);
    }

    document.addEventListener('click', (event) => {
        const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
        if (!anchor) return;
        const targetUrl = new URL(anchor.getAttribute('href') || '', window.location.href);
        if (targetUrl.origin !== window.location.origin || targetUrl.pathname !== window.location.pathname || !targetUrl.hash) return;
        setTimeout(() => markJumpTarget(targetUrl.hash), 360);
    });

    window.addEventListener('hashchange', () => markJumpTarget(window.location.hash));

    const revealEls = Array.from(document.querySelectorAll('.reveal'));
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach((el) => io.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('is-visible'));
    }

    const avatarGroups = Array.from(document.querySelectorAll('.t-avatar-group'));
    if (!prefersReducedMotion) {
        const rootStyles = getComputedStyle(document.documentElement);
        const num = (name, fallback) => {
            const value = parseFloat(rootStyles.getPropertyValue(name));
            return Number.isFinite(value) ? value : fallback;
        };
        const ease = (name, fallback) => rootStyles.getPropertyValue(name).trim() || fallback;

        avatarGroups.forEach((group) => {
            const avatars = Array.from(group.querySelectorAll('.t-avatar'));
            const setShifts = (activeIdx, phase) => {
                const lift = num('--avatar-lift', -4);
                const falloff = num('--avatar-falloff', 0.45);
                const scale = num('--avatar-scale', 1.05);
                const timing = phase === 'out'
                    ? ease('--avatar-ease-out', 'cubic-bezier(0.34, 3.85, 0.64, 1)')
                    : ease('--avatar-ease-in', 'cubic-bezier(0.22, 1, 0.36, 1)');

                avatars.forEach((el, index) => {
                    el.style.transitionTimingFunction = timing;
                    if (activeIdx == null) {
                        el.style.setProperty('--shift', '0px');
                        el.style.setProperty('--scale-active', '1');
                        return;
                    }
                    const distance = Math.abs(index - activeIdx);
                    el.style.setProperty('--shift', `${(lift * Math.pow(falloff, distance)).toFixed(3)}px`);
                    el.style.setProperty('--scale-active', index === activeIdx ? String(scale) : '1');
                });
            };

            avatars.forEach((el, index) => {
                el.addEventListener('mouseenter', () => setShifts(index, 'in'));
            });
            group.addEventListener('mouseleave', () => setShifts(null, 'out'));
        });
    }

    const canUsePlayfulHover = !prefersReducedMotion
        && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (canUsePlayfulHover) {
        const playfulEls = Array.from(document.querySelectorAll([
            '.hero-title-mark',
            '.header-cta',
            '.btn',
            '.footer-pill',
            '.metric-item',
            '.gallery-card',
            '.control-card'
        ].join(',')));

        playfulEls.forEach((el) => {
            el.classList.add('is-playful');

            el.addEventListener('pointermove', (event) => {
                const rect = el.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
                const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
                const tiltY = (x - 0.5) * 7;
                const tiltX = (0.5 - y) * 7;
                el.style.setProperty('--spot-x', `${(x * 100).toFixed(1)}%`);
                el.style.setProperty('--spot-y', `${(y * 100).toFixed(1)}%`);
                el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
                el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
            });

            el.addEventListener('pointerleave', () => {
                el.style.setProperty('--spot-x', '50%');
                el.style.setProperty('--spot-y', '50%');
                el.style.setProperty('--tilt-x', '0deg');
                el.style.setProperty('--tilt-y', '0deg');
            });
        });
    }

    const sectionLinks = Array.from(document.querySelectorAll('[data-section-link]'))
        .filter((link) => (link.getAttribute('href') || '').startsWith('#'));
    const sections = sectionLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    if (sections.length && sectionLinks.length) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const targetHref = `#${entry.target.id}`;
                sectionLinks.forEach((link) => {
                    link.classList.toggle('is-active', link.getAttribute('href') === targetHref);
                });
            });
        }, { threshold: 0.3, rootMargin: '0px 0px -40% 0px' });
        sections.forEach((section) => sectionObserver.observe(section));
    }

    const galleryLightbox = document.getElementById('galleryLightbox');
    const galleryLightboxImage = document.getElementById('galleryLightboxImage');
    const galleryLightboxCaption = document.getElementById('galleryLightboxCaption');
    const galleryLightboxClose = document.getElementById('galleryLightboxClose');
    const galleryLightboxShell = galleryLightbox ? galleryLightbox.querySelector('.lightbox-shell') : null;
    const galleryCards = Array.from(document.querySelectorAll('.gallery-card'));
    const galleryImages = galleryCards
        .map((card) => card.querySelector('img'))
        .filter(Boolean);
    let galleryReturnFocus = null;
    let galleryCloseTimer = null;

    function syncGalleryCardWidths() {
        galleryImages.forEach((img) => {
            const slide = img.closest('.carousel-slide');
            if (!slide || !img.naturalWidth || !img.naturalHeight) return;
            const targetHeight = img.getBoundingClientRect().height;
            if (!targetHeight) return;
            const previewWidth = Math.round((img.naturalWidth / img.naturalHeight) * targetHeight);
            slide.style.setProperty('--preview-width', `${previewWidth}px`);
        });
    }

    function openLightbox(src, caption) {
        if (!galleryLightbox || !galleryLightboxImage) return;
        clearTimeout(galleryCloseTimer);
        galleryLightboxImage.src = src;
        galleryLightboxImage.alt = caption || '';
        if (galleryLightboxCaption) galleryLightboxCaption.textContent = caption || '';
        galleryLightbox.hidden = false;
        if (galleryLightboxShell) {
            galleryLightboxShell.classList.remove('is-closing');
            if (prefersReducedMotion) {
                galleryLightboxShell.classList.add('is-open');
            } else {
                requestAnimationFrame(() => galleryLightboxShell.classList.add('is-open'));
            }
        }
        document.body.style.overflow = 'hidden';
        if (galleryLightboxClose) galleryLightboxClose.focus();
    }

    function closeLightbox() {
        if (!galleryLightbox) return;
        clearTimeout(galleryCloseTimer);

        const finishClose = () => {
            if (galleryLightboxShell) galleryLightboxShell.classList.remove('is-closing');
            galleryLightbox.hidden = true;
            document.body.style.overflow = '';
            if (galleryReturnFocus) {
                galleryReturnFocus.focus();
                galleryReturnFocus = null;
            }
        };

        if (!galleryLightboxShell || prefersReducedMotion) {
            if (galleryLightboxShell) galleryLightboxShell.classList.remove('is-open');
            finishClose();
            return;
        }

        galleryLightboxShell.classList.remove('is-open');
        galleryLightboxShell.classList.add('is-closing');
        galleryCloseTimer = setTimeout(finishClose, cssMs('--modal-close-dur', 150));
    }

    if (galleryLightbox) {
        galleryLightbox.addEventListener('keydown', (event) => {
            if (galleryLightbox.hidden || event.key !== 'Tab') return;
            const focusable = Array.from(galleryLightbox.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )).filter((el) => !el.disabled && el.offsetParent !== null);
            if (!focusable.length) {
                event.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        galleryLightbox.addEventListener('click', (event) => {
            if (event.target === galleryLightbox) closeLightbox();
        });
    }

    galleryCards.forEach((card) => {
        card.addEventListener('click', () => {
            galleryReturnFocus = card;
            openLightbox(card.dataset.previewSrc || '', card.dataset.previewCaption || '');
        });
    });

    galleryImages.forEach((img) => {
        if (img.complete) return;
        img.addEventListener('load', syncGalleryCardWidths);
    });

    syncGalleryCardWidths();
    window.addEventListener('load', syncGalleryCardWidths, { once: true });

    if (galleryLightboxClose) {
        galleryLightboxClose.addEventListener('click', closeLightbox);
    }

    const screenshotsTrack = document.getElementById('screenshotsCarouselTrack');
    const screenshotsPrev = document.getElementById('screenshotsPrev');
    const screenshotsNext = document.getElementById('screenshotsNext');
    const screenshotsDots = document.getElementById('screenshotsCarouselDots');
    const screenshotsStatus = document.getElementById('screenshotsCarouselStatus');
    const screenshotSlides = screenshotsTrack
        ? Array.from(screenshotsTrack.querySelectorAll('.carousel-slide'))
        : [];

    if (screenshotsTrack && screenshotSlides.length) {
        const total = screenshotSlides.length;
        let currentIndex = 0;
        const dotButtons = [];

        screenshotSlides.forEach((_, index) => {
            if (!screenshotsDots) return;
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `Go to screenshot ${index + 1}`);
            dot.setAttribute('aria-selected', 'false');
            dot.tabIndex = -1;
            dot.addEventListener('click', () => goTo(index));
            screenshotsDots.appendChild(dot);
            dotButtons.push(dot);
        });

        function getScrollTargetForIndex(index) {
            const slide = screenshotSlides[index];
            if (!slide) return 0;
            return slide.offsetLeft - screenshotsTrack.offsetLeft;
        }

        function updateUI(index) {
            currentIndex = Math.max(0, Math.min(total - 1, index));
            dotButtons.forEach((dot, dotIndex) => {
                const active = dotIndex === currentIndex;
                dot.classList.toggle('is-active', active);
                dot.setAttribute('aria-selected', String(active));
                dot.tabIndex = active ? 0 : -1;
            });
            if (screenshotsStatus) screenshotsStatus.textContent = `${currentIndex + 1} / ${total}`;
            if (screenshotsPrev) screenshotsPrev.disabled = currentIndex === 0;
            if (screenshotsNext) screenshotsNext.disabled = currentIndex === total - 1;
        }

        function goTo(index, smooth = true) {
            const target = Math.max(0, Math.min(total - 1, index));
            updateUI(target);
            const left = getScrollTargetForIndex(target);
            screenshotsTrack.scrollTo({
                left,
                behavior: smooth && !prefersReducedMotion ? 'smooth' : 'auto'
            });
        }

        let syncTimer = null;
        function syncFromScroll() {
            let closest = 0;
            let closestDist = Infinity;
            const trackLeft = screenshotsTrack.scrollLeft;
            screenshotSlides.forEach((slide, index) => {
                const slideLeft = slide.offsetLeft - screenshotsTrack.offsetLeft;
                const dist = Math.abs(slideLeft - trackLeft);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = index;
                }
            });
            if (closest !== currentIndex) updateUI(closest);
        }

        screenshotsTrack.addEventListener('scroll', () => {
            clearTimeout(syncTimer);
            syncTimer = setTimeout(syncFromScroll, 80);
        }, { passive: true });

        screenshotsTrack.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                goTo(currentIndex + 1);
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                goTo(currentIndex - 1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                goTo(0);
            } else if (event.key === 'End') {
                event.preventDefault();
                goTo(total - 1);
            }
        });

        let isDragging = false;
        let didDrag = false;
        let dragStartX = 0;
        let dragStartScroll = 0;

        screenshotsTrack.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            if (event.target instanceof Element && event.target.closest('.gallery-card')) return;
            isDragging = true;
            didDrag = false;
            dragStartX = event.clientX;
            dragStartScroll = screenshotsTrack.scrollLeft;
            screenshotsTrack.setPointerCapture(event.pointerId);
        });

        screenshotsTrack.addEventListener('pointermove', (event) => {
            if (!isDragging) return;
            const delta = event.clientX - dragStartX;
            if (Math.abs(delta) > 14) didDrag = true;
            screenshotsTrack.scrollLeft = dragStartScroll - delta;
        });

        function endDrag(event) {
            if (!isDragging) return;
            isDragging = false;
            if (didDrag) {
                screenshotsTrack.dataset.dragged = '1';
                requestAnimationFrame(() => {
                    screenshotsTrack.dataset.dragged = '0';
                });
                syncFromScroll();
                goTo(currentIndex, true);
            }
            if (event && event.pointerId !== undefined) {
                try {
                    screenshotsTrack.releasePointerCapture(event.pointerId);
                } catch (_) {
                    // no-op
                }
            }
        }

        screenshotsTrack.addEventListener('pointerup', endDrag);
        screenshotsTrack.addEventListener('pointercancel', endDrag);
        screenshotsTrack.addEventListener('click', (event) => {
            if (screenshotsTrack.dataset.dragged === '1') event.stopPropagation();
        }, true);
        screenshotsTrack.addEventListener('wheel', (event) => {
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
            event.preventDefault();
            screenshotsTrack.scrollLeft += event.deltaY;
        }, { passive: false });

        if (screenshotsPrev) screenshotsPrev.addEventListener('click', () => goTo(currentIndex - 1));
        if (screenshotsNext) screenshotsNext.addEventListener('click', () => goTo(currentIndex + 1));

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                syncGalleryCardWidths();
                goTo(currentIndex, false);
            }, 120);
        }, { passive: true });

        syncGalleryCardWidths();
        goTo(0, false);
    }

    if (toTopBtn) {
        window.addEventListener('scroll', () => {
            toTopBtn.classList.toggle('is-visible', window.scrollY > 420);
        }, { passive: true });

        toTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (galleryLightbox && !galleryLightbox.hidden) {
            closeLightbox();
            return;
        }
        if (body.classList.contains('mobile-nav-open')) setMobileNavState(false);
    });

    async function loadRelease() {
        if (!releaseStatus) return;
        releaseStatus.setAttribute('aria-busy', 'true');
        try {
            const response = await fetch(
                'https://api.github.com/repos/FurtherSecrets24680/chemsearch-android/releases/latest',
                { headers: { Accept: 'application/vnd.github+json' } }
            );
            if (!response.ok) throw new Error('fetch failed');
            const data = await response.json();
            const tag = data.tag_name || 'latest';
            const date = data.published_at
                ? new Date(data.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
                : '';
            if (data.html_url) releaseStatus.href = data.html_url;
            if (releaseStatusText) {
                releaseStatusText.textContent = date ? `${tag} · ${date}` : tag;
            }
        } catch (_) {
            if (releaseStatusText) releaseStatusText.textContent = 'Latest release on GitHub';
        } finally {
            releaseStatus.setAttribute('aria-busy', 'false');
        }
    }

    loadRelease();
})();
