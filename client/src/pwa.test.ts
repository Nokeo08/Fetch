import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const PUBLIC_DIR = resolve(import.meta.dir, "../public");

describe("PWA Manifest", () => {
    const manifestPath = resolve(PUBLIC_DIR, "manifest.json");

    test("manifest.json exists in public directory", () => {
        expect(existsSync(manifestPath)).toBe(true);
    });

    test("manifest.json is valid JSON", () => {
        const content = readFileSync(manifestPath, "utf-8");
        expect(() => JSON.parse(content)).not.toThrow();
    });

    test("manifest has required 'name' field", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(manifest.name).toBe("Fetch Shopping Lists");
    });

    test("manifest has required 'short_name' field", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(manifest.short_name).toBe("Fetch");
    });

    test("manifest has required 'description' field", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(typeof manifest.description).toBe("string");
        expect(manifest.description.length).toBeGreaterThan(0);
    });

    test("manifest has start_url set to '/'", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(manifest.start_url).toBe("/");
    });

    test("manifest has display set to 'standalone'", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(manifest.display).toBe("standalone");
    });

    test("manifest has background_color", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(typeof manifest.background_color).toBe("string");
        expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test("manifest has theme_color", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(typeof manifest.theme_color).toBe("string");
        expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test("manifest has orientation", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(["portrait", "any"]).toContain(manifest.orientation);
    });

    test("manifest has scope set to '/'", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(manifest.scope).toBe("/");
    });

    test("manifest has lang set to 'en'", () => {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        expect(manifest.lang).toBe("en");
    });
});

describe("PWA Icons", () => {
    const manifestPath = resolve(PUBLIC_DIR, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    const requiredSizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];

    test("manifest has icons array", () => {
        expect(Array.isArray(manifest.icons)).toBe(true);
        expect(manifest.icons.length).toBeGreaterThanOrEqual(requiredSizes.length);
    });

    for (const size of requiredSizes) {
        test(`icon for ${size}x${size} exists in manifest`, () => {
            const icon = manifest.icons.find(
                (i: { sizes: string }) => i.sizes === `${size}x${size}`,
            );
            expect(icon).toBeDefined();
            expect(icon.type).toBe("image/png");
        });

        test(`icon file for ${size}x${size} exists on disk`, () => {
            const iconPath = resolve(PUBLIC_DIR, `icons/icon-${size}.png`);
            expect(existsSync(iconPath)).toBe(true);
        });
    }

    test("has a maskable icon", () => {
        const maskable = manifest.icons.find(
            (i: { purpose?: string }) => i.purpose === "maskable",
        );
        expect(maskable).toBeDefined();
    });

    test("apple touch icon (180px) exists on disk", () => {
        const iconPath = resolve(PUBLIC_DIR, "icons/icon-180.png");
        expect(existsSync(iconPath)).toBe(true);
    });

    test("favicon.ico exists", () => {
        const faviconPath = resolve(PUBLIC_DIR, "favicon.ico");
        expect(existsSync(faviconPath)).toBe(true);
    });

    test("all icon files are PNG format (non-zero size)", () => {
        for (const size of requiredSizes) {
            const iconPath = resolve(PUBLIC_DIR, `icons/icon-${size}.png`);
            const stat = Bun.file(iconPath);
            expect(stat.size).toBeGreaterThan(0);
        }
    });
});

describe("PWA Screenshots", () => {
    const manifestPath = resolve(PUBLIC_DIR, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    test("manifest has screenshots array", () => {
        expect(Array.isArray(manifest.screenshots)).toBe(true);
        expect(manifest.screenshots.length).toBeGreaterThanOrEqual(2);
    });

    test("has a wide (desktop) screenshot with form_factor", () => {
        const wide = manifest.screenshots.find(
            (s: { form_factor?: string }) => s.form_factor === "wide",
        );
        expect(wide).toBeDefined();
        expect(wide.type).toBe("image/png");
    });

    test("has a narrow (mobile) screenshot with form_factor", () => {
        const narrow = manifest.screenshots.find(
            (s: { form_factor?: string }) => s.form_factor === "narrow",
        );
        expect(narrow).toBeDefined();
        expect(narrow.type).toBe("image/png");
    });

    test("screenshot files exist on disk", () => {
        expect(existsSync(resolve(PUBLIC_DIR, "screenshots/desktop.png"))).toBe(true);
        expect(existsSync(resolve(PUBLIC_DIR, "screenshots/mobile.png"))).toBe(true);
    });
});

describe("HTML Meta Tags", () => {
    const htmlPath = resolve(import.meta.dir, "../index.html");
    const html = readFileSync(htmlPath, "utf-8");

    test("has manifest link", () => {
        expect(html).toContain('<link rel="manifest" href="/manifest.json"');
    });

    test("has theme-color meta tag", () => {
        expect(html).toContain('<meta name="theme-color"');
    });

    test("has description meta tag", () => {
        expect(html).toContain('<meta name="description"');
    });

    test("has mobile-web-app-capable meta tag", () => {
        expect(html).toContain('<meta name="mobile-web-app-capable" content="yes"');
    });

    test("has apple-mobile-web-app-capable meta tag", () => {
        expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
    });

    test("has apple-mobile-web-app-status-bar-style meta tag", () => {
        expect(html).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    });

    test("has apple-mobile-web-app-title meta tag", () => {
        expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Fetch"');
    });

    test("has apple-touch-icon link", () => {
        expect(html).toContain('<link rel="apple-touch-icon"');
        expect(html).toContain('icon-180.png');
    });

    test("has favicon link (not default vite.svg)", () => {
        expect(html).not.toContain('vite.svg');
        expect(html).toContain('favicon.ico');
    });

    test("has correct title", () => {
        expect(html).toContain("<title>Fetch Shopping Lists</title>");
    });

    test("has viewport meta tag", () => {
        expect(html).toContain('<meta name="viewport"');
        expect(html).toContain("width=device-width");
    });

    test("has lang attribute on html element", () => {
        expect(html).toContain('<html lang="en"');
    });
});

describe("Service Worker", () => {
    const swPath = resolve(PUBLIC_DIR, "sw.js");

    test("service worker file exists", () => {
        expect(existsSync(swPath)).toBe(true);
    });

    test("service worker has install event listener", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain('addEventListener("install"');
    });

    test("service worker has activate event listener", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain('addEventListener("activate"');
    });

    test("service worker has fetch event listener", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain('addEventListener("fetch"');
    });

    test("service worker has sync event listener", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain('addEventListener("sync"');
    });

    test("service worker caches static assets", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain("STATIC_ASSETS");
        expect(sw).toContain('"/index.html"');
        expect(sw).toContain('"/manifest.json"');
        expect(sw).toContain('"/favicon.ico"');
    });

    test("service worker handles API requests (network-only)", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain('/api/');
    });

    test("service worker handles navigation fallback for offline", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain("navigate");
        expect(sw).toContain("/index.html");
    });

    test("service worker handles SKIP_WAITING message", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain("SKIP_WAITING");
        expect(sw).toContain("skipWaiting");
    });

    test("service worker claims clients on activate", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain("clients.claim()");
    });

    test("service worker cleans up old caches", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain("caches.keys()");
        expect(sw).toContain("caches.delete");
    });

    test("service worker has build version placeholder for cache busting", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain("VERSION");
        expect(sw).toContain("CACHE_NAME");
    });

    test("service worker uses network-first for navigation requests", () => {
        const sw = readFileSync(swPath, "utf-8");
        expect(sw).toContain('event.request.mode === "navigate"');
    });
});

describe("Service Worker Registration", () => {
    const mainPath = resolve(import.meta.dir, "main.tsx");
    const main = readFileSync(mainPath, "utf-8");

    test("main.tsx registers service worker", () => {
        expect(main).toContain("serviceWorker");
        expect(main).toContain('register("/sw.js")');
    });

    test("main.tsx checks for serviceWorker support", () => {
        expect(main).toContain('"serviceWorker" in navigator');
    });

    test("main.tsx listens for controllerchange to auto-reload", () => {
        expect(main).toContain("controllerchange");
        expect(main).toContain("window.location.reload()");
    });

    test("main.tsx polls for service worker updates periodically", () => {
        expect(main).toContain("registration.update()");
        expect(main).toContain("setInterval");
    });
});

describe("Install Prompt Hook", () => {
    const hookPath = resolve(import.meta.dir, "useInstallPrompt.ts");

    test("useInstallPrompt hook file exists", () => {
        expect(existsSync(hookPath)).toBe(true);
    });

    test("hook listens for beforeinstallprompt event", () => {
        const hook = readFileSync(hookPath, "utf-8");
        expect(hook).toContain("beforeinstallprompt");
    });

    test("hook listens for appinstalled event", () => {
        const hook = readFileSync(hookPath, "utf-8");
        expect(hook).toContain("appinstalled");
    });

    test("hook detects iOS devices", () => {
        const hook = readFileSync(hookPath, "utf-8");
        expect(hook).toContain("iPad");
        expect(hook).toContain("iPhone");
    });

    test("hook detects standalone mode (already installed)", () => {
        const hook = readFileSync(hookPath, "utf-8");
        expect(hook).toContain("display-mode: standalone");
    });

    test("hook provides dismiss functionality with persistence", () => {
        const hook = readFileSync(hookPath, "utf-8");
        expect(hook).toContain("localStorage");
        expect(hook).toContain("dismiss");
    });

    test("hook exports expected interface", () => {
        const hook = readFileSync(hookPath, "utf-8");
        expect(hook).toContain("canInstall");
        expect(hook).toContain("isInstalled");
        expect(hook).toContain("isIOS");
        expect(hook).toContain("showPrompt");
        expect(hook).toContain("dismissed");
        expect(hook).toContain("dismiss");
    });
});

describe("Install Banner Component", () => {
    const bannerPath = resolve(import.meta.dir, "InstallBanner.tsx");

    test("InstallBanner component file exists", () => {
        expect(existsSync(bannerPath)).toBe(true);
    });

    test("component uses i18n translations", () => {
        const banner = readFileSync(bannerPath, "utf-8");
        expect(banner).toContain("useTranslation");
        expect(banner).toContain("pwa.installTitle");
        expect(banner).toContain("pwa.installButton");
        expect(banner).toContain("pwa.dismissButton");
        expect(banner).toContain("pwa.iosInstructions");
    });

    test("component uses the install prompt hook", () => {
        const banner = readFileSync(bannerPath, "utf-8");
        expect(banner).toContain("useInstallPrompt");
    });

    test("component renders nothing when installed or dismissed", () => {
        const banner = readFileSync(bannerPath, "utf-8");
        expect(banner).toContain("return null");
    });
});

describe("PWA i18n Translations", () => {
    test("English has pwa namespace with all keys", async () => {
        const en = (await import("./i18n/en.ts")).default;
        expect(en.pwa).toBeDefined();
        expect(en.pwa.installTitle).toBe("Install Fetch");
        expect(en.pwa.installDescription).toBeDefined();
        expect(en.pwa.installButton).toBeDefined();
        expect(en.pwa.dismissButton).toBeDefined();
        expect(en.pwa.iosInstructions).toBeDefined();
    });

    const languages = ["de", "el", "es", "fr", "lt", "no", "pl", "pt", "ru", "sk", "sv", "uk"] as const;

    for (const lang of languages) {
        test(`${lang} translation has pwa namespace with all keys`, async () => {
            const mod = await import(`./i18n/${lang}.ts`);
            const translations = mod.default;
            expect(translations.pwa).toBeDefined();
            expect(typeof translations.pwa.installTitle).toBe("string");
            expect(typeof translations.pwa.installDescription).toBe("string");
            expect(typeof translations.pwa.installButton).toBe("string");
            expect(typeof translations.pwa.dismissButton).toBe("string");
            expect(typeof translations.pwa.iosInstructions).toBe("string");
            expect(translations.pwa.installTitle.length).toBeGreaterThan(0);
            expect(translations.pwa.installDescription.length).toBeGreaterThan(0);
        });
    }
});

describe("Responsive CSS", () => {
    const cssPath = resolve(import.meta.dir, "index.css");
    const css = readFileSync(cssPath, "utf-8");

    test("has box-sizing border-box reset", () => {
        expect(css).toContain("box-sizing: border-box");
    });

    test("has overflow-x hidden on html", () => {
        expect(css).toContain("overflow-x: hidden");
    });

    test("has safe area inset CSS variables", () => {
        expect(css).toContain("safe-area-inset-top");
        expect(css).toContain("safe-area-inset-bottom");
    });

    test("has tap highlight disabled", () => {
        expect(css).toContain("-webkit-tap-highlight-color: transparent");
    });

    test("buttons have min-height 44px for touch targets", () => {
        expect(css).toContain("min-height: 44px");
    });

    test("inputs have font-size 16px to prevent iOS zoom", () => {
        expect(css).toContain("font-size: 16px");
    });

    test("has touch-action manipulation on interactive elements", () => {
        expect(css).toContain("touch-action: manipulation");
    });

    test("has standalone display mode styles", () => {
        expect(css).toContain("display-mode: standalone");
    });

    test("has dynamic viewport height (100dvh)", () => {
        expect(css).toContain("100dvh");
    });

    test("has webkit text size adjust", () => {
        expect(css).toContain("-webkit-text-size-adjust: 100%");
    });
});

describe("App Integration", () => {
    const mainPath = resolve(import.meta.dir, "main.tsx");
    const main = readFileSync(mainPath, "utf-8");

    test("main.tsx imports InstallBanner", () => {
        expect(main).toContain("InstallBanner");
    });

    test("main.tsx renders InstallBanner component", () => {
        expect(main).toContain("<InstallBanner");
    });
});
