<!-- Indie Flower font from Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap" rel="stylesheet">
<script>

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

// The ONLY 3 venues shown in the sidebar (name → term slug). These slugs must
// match WooCommerce → Products → Attributes → 中心地点 Centre Location terms
// AND 上课地点 Course Location terms of the same name.
const allLocations = {
    "CT Hub": "ct-hub",
    "Pasir Ris West": "pasir-ris-west",
    "Tampines North CC": "tampines-north-cc"
};

// Which location attribute is actually used for filtering on THIS page.
// Set live by findWorkingLocationUrl() once a working query format is found.
let LOCATION_FILTER_KEY = "centre_location";

// Single source of truth for every candidate query-string format this site
// might use for location filtering. Tried in this order everywhere (probing,
// display, active-filter detection, resetting).
// NOTE: MUST use the "filter_" prefix — WooCommerce's built-in layered nav
// widget hardcodes `filter_{attribute}` as the query key it reads
// (class-wc-widget-layered-nav.php); a bare param like `centre_location=...`
// is silently ignored and the page falls back to the unfiltered product
// list (confirmed 08/07/2026 via live screenshot showing mixed-venue
// results for `?centre_location=ct-hub`).
const LOCATION_PARAM_CANDIDATES = [
    { key: "centre_location", param: "filter_centre_location", queryType: "query_type_centre_location" },
    { key: "course_location", param: "filter_course_location", queryType: "query_type_course_location" }
];

const languageRoutes = {
    "tri-love-elderly-nsa": {
        base: "/product-category/courses/tri-love-elderly-nsa/",
        languages: { "中文 Mandarin": "mandarin", "双语 Bilingual": "engman", "英文 English": "english", "马来文 Malay": "malay" }
    },
    "tri-love-elderly-ilp": {
        base: "/product-category/courses/tri-love-elderly-ilp/",
        languages: { "中文 Mandarin": "mandarin", "双语 Bilingual": "engman", "英文 English": "english", "马来文 Malay": "malay" }
    },
    "talks-and-seminar": {
        base: "/product-category/talks-and-seminar/",
        filterBase: "/product-category/talks-and-seminar/talks-and-seminar/",
        languages: { "中文 Mandarin": "mandarin", "双语 Bilingual": "engman", "英文 English": "english", "马来文 Malay": "malay" }
    },
    "marriage-preparation-programme": {
        base: "https://ecss.org.sg/product-category/marriage-preparation-programme/",
        filterBase: "https://ecss.org.sg/product-category/marriage-preparation-programme/marriage-preparation-programme/",
        languages: { "中文 Mandarin": "mandarin", "双语 Bilingual": "engman", "英文 English": "english", "马来文 Malay": "malay" }
    },
    "default": {
        base: "https://ecss.org.sg/product-category/courses/",
        filterBase: "/product-category/courses/",
        languages: { "中文 Mandarin": "mandarin", "双语 Bilingual": "engman", "英文 English": "english", "马来文 Malay": "malay" }
    }
};

const locationRoutes = {
    "tri-love-elderly-nsa": {
        base: "https://ecss.org.sg/product-category/courses/tri-love-elderly-nsa/",
        filterBase: "/product-category/courses/tri-love-elderly-nsa/",
        locations: allLocations
    },
    "tri-love-elderly-ilp": {
        base: "https://ecss.org.sg/product-category/courses/tri-love-elderly-ilp/",
        filterBase: "/product-category/courses/tri-love-elderly-ilp/",
        locations: allLocations
    },
    "talks-and-seminar": {
        base: "/product-category/talks-and-seminar/",
        filterBase: "/product-category/talks-and-seminar/talks-and-seminar/",
        locations: allLocations
    },
    "marriage-preparation-programme": {
        base: "https://ecss.org.sg/product-category/marriage-preparation-programme/",
        filterBase: "https://ecss.org.sg/product-category/marriage-preparation-programme/marriage-preparation-programme/",
        locations: allLocations
    },
    "default": {
        base: "https://ecss.org.sg/product-category/courses",
        filterBase: "https://ecss.org.sg/product-category/courses/",
        locations: allLocations
    }
};

const sideBarConfig = {
    language: {
        routeKeys: Object.keys(languageRoutes).filter(k => k !== "default"),
        defaultUrlPattern: "product-category"
    },
    location: {
        routeKeys: Object.keys(locationRoutes).filter(k => k !== "default"),
        defaultUrlPattern: "product-category"
    }
};

// Popup modal content keyed by image title attribute
const MODAL_DATA = {
    "En Ball Excerise": {
        chi: "通过使用恩球改善身体的灵活性和功能性动作",
        eng: "To improve mobility and functional movements of the body with the use of En Ball.",
        dayChi: "星期四", dayEng: "Thursday",
        timeChi: "上午9点到上午10点", timeEng: "9:00am - 10:00am"
    },
    "Resistance Band Exercise": {
        chi: "通过使用拉力带进行阻力训练，以提高身体的力量和肌肉耐力",
        eng: "Resistance training to improve strength and muscular endurance of the body with the use of resistance bands.",
        dayChi: "星期一", dayEng: "Monday",
        timeChi: "上午9点到上午10点", timeEng: "9:00am - 10:00am"
    }
};

// Special course categories that use the registration form instead of WooCommerce checkout
const SPECIAL_CATEGORIES = ["NSA", "Talks And Seminar", "ILP", "Marriage Preparation Programme", "Others"];

// ─────────────────────────────────────────────────────────────
// LOCATION ATTRIBUTE DETECTION (DISPLAY) & LIVE VERIFICATION (FILTERING)
// ─────────────────────────────────────────────────────────────

const CENTRE_HEADING_RE = /centre\s*location/i;
const COURSE_HEADING_RE = /course\s*location/i;
function isCentreHeadingText(t) { return CENTRE_HEADING_RE.test(t) || t.includes("中心地点"); }
function isCourseHeadingText(t) { return COURSE_HEADING_RE.test(t) || t.includes("上课地点"); }

function getWidgetHeadingText(widget) {
    const h = widget.querySelector("h3, h4, .qodef-widget-title, .widget-title");
    return h ? h.textContent.trim() : "";
}

// Find the two possible location widgets (if present) by their heading text.
function findLocationWidgets() {
    const widgets = document.querySelectorAll(".woocommerce-widget-layered-nav");
    let centre = null, course = null;
    widgets.forEach(w => {
        const t = getWidgetHeadingText(w);
        if (!t) return;
        if (isCentreHeadingText(t)) centre = w;
        else if (isCourseHeadingText(t)) course = w;
    });
    return { centre, course };
}

function widgetHasRealTerms(widget) {
    if (!widget) return false;
    const list = widget.querySelector(".woocommerce-widget-layered-nav-list");
    return !!(list && list.querySelectorAll("li").length > 0);
}

// Reads whichever location-filter param is present in a URL, using the shared
// candidate list, returning { key, value } or null if none is present.
function readActiveLocationFilter(urlSearchParams) {
    for (const c of LOCATION_PARAM_CANDIDATES) {
        const value = urlSearchParams.get(c.param);
        if (value) return { key: c.key, value };
    }
    return null;
}

// Sets up the "Venue" sidebar section for DISPLAY purposes only: relabels
// whichever physical location widget exists and forces its list down to
// exactly the 3 configured venues. The key used for actual filtering is
// re-verified live per click (see findWorkingLocationUrl) since this
// heuristic can guess wrong (confirmed: site has only ONE location widget,
// bound to centre_location, even when a category's real data lives under
// course_location).
function resolveVenueSidebar(currentUrl) {
    const params = new URL(currentUrl).searchParams;
    const { centre, course } = findLocationWidgets();
    const displayWidget = centre || course || null;

    const activeFilter = readActiveLocationFilter(params);
    if (activeFilter) {
        LOCATION_FILTER_KEY = activeFilter.key;
    } else if (widgetHasRealTerms(centre)) {
        LOCATION_FILTER_KEY = "centre_location";
    } else if (widgetHasRealTerms(course)) {
        LOCATION_FILTER_KEY = "course_location";
    } else {
        LOCATION_FILTER_KEY = "centre_location";
    }

    // If somehow both widgets exist, keep only the one we're displaying.
    if (centre && course) (displayWidget === centre ? course : centre).remove();

    const populate = (listEl) => {
        listEl.innerHTML = "";
        Object.keys(allLocations).forEach(name => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.textContent = name;
            li.appendChild(a);
            listEl.appendChild(li);
        });
    };

    if (displayWidget) {
        const heading = displayWidget.querySelector("h3, h4, .qodef-widget-title, .widget-title");
        if (heading) heading.textContent = "Venue";
        const list = displayWidget.querySelector(".woocommerce-widget-layered-nav-list");
        if (list) populate(list);
        return true;
    }

    // Neither widget exists at all — clone the Language widget as a fallback.
    const lists = document.querySelectorAll(".woocommerce-widget-layered-nav-list");
    if (lists.length === 0) return false;
    const langList = lists[0];
    const langWidget = langList.closest(".woocommerce-widget-layered-nav") || langList.parentElement;
    if (!langWidget) return false;

    const venueWidget = langWidget.cloneNode(true);
    venueWidget.removeAttribute("id");
    venueWidget.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));

    const heading = venueWidget.querySelector("h3, h4, .qodef-widget-title, .widget-title");
    if (heading) heading.textContent = "Venue";

    const venueList = venueWidget.querySelector(".woocommerce-widget-layered-nav-list");
    if (!venueList) return false;
    populate(venueList);

    langWidget.after(venueWidget);
    return true;
}

// Fetch a same-origin URL and count how many products it actually shows.
// Returns -1 on network error (treated as "unknown" by callers).
async function fetchProductCount(url) {
    try {
        const res = await fetch(url, { credentials: "same-origin" });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (doc.querySelector(".woocommerce-info")) return 0; // "No products were found..."
        return doc.querySelectorAll("ul.products li.product").length;
    } catch (e) {
        return -1;
    }
}

// Live-tests each candidate query format from LOCATION_PARAM_CANDIDATES and
// picks whichever one ACTUALLY has the MOST matching products (not just the
// first one that beats baseline) — this is the "either one OR both" pick:
// a location can live under centre_location, course_location, or both, and
// we want the richer starting page before mergeAlternateLocationResults()
// unions in whatever the other attribute has on load. Falls back to the
// standard centre_location URL if nothing conclusively filters.
async function findWorkingLocationUrl(filterBase, slug, languageFilterQS) {
    const baselineUrl = languageFilterQS ? `${filterBase}?${languageFilterQS}` : filterBase;
    const baselineCount = await fetchProductCount(baselineUrl);
    const languageSuffix = languageFilterQS ? `&${languageFilterQS}` : "";

    let best = null; // { url, count, key }

    for (const c of LOCATION_PARAM_CANDIDATES) {
        const url = `${filterBase}?${c.param}=${slug}&${c.queryType}=or${languageSuffix}`;
        const count = await fetchProductCount(url);
        const isConclusive = count > 0 && (baselineCount < 0 || count < baselineCount);
        if (isConclusive && (!best || count > best.count)) {
            best = { url, count, key: c.key };
        }
    }

    if (best) {
        LOCATION_FILTER_KEY = best.key;
        return best.url;
    }

    LOCATION_FILTER_KEY = "centre_location";
    return `${filterBase}?filter_centre_location=${slug}&query_type_centre_location=or${languageSuffix}`;
}

// ─────────────────────────────────────────────────────────────
// MERGE RESULTS ACROSS BOTH LOCATION ATTRIBUTES (UNION)
// ─────────────────────────────────────────────────────────────
// WooCommerce ANDs different attribute taxonomies together, so one URL can
// only match ONE of centre_location / course_location. To show the UNION
// (products tagged under either attribute with the same venue name), the
// page loads normally with whichever attribute already has results, then we
// fetch the OTHER attribute's URL in the background and append any products
// it has that aren't already on the page (deduped by product permalink).

function getProductKey(li) {
    const link = li.querySelector("a[href]");
    return link ? link.getAttribute("href") : li.textContent.trim();
}

async function fetchProductListItems(url) {
    try {
        const res = await fetch(url, { credentials: "same-origin" });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        return Array.from(doc.querySelectorAll("ul.products li.product"));
    } catch (e) {
        return [];
    }
}

async function mergeAlternateLocationResults(currentUrl) {
    const urlObj = new URL(currentUrl);
    const activeFilter = readActiveLocationFilter(urlObj.searchParams);
    if (!activeFilter) return; // no location filter active, nothing to merge

    const otherCandidate = LOCATION_PARAM_CANDIDATES.find(c => c.key !== activeFilter.key);
    if (!otherCandidate) return;

    const params = new URLSearchParams(urlObj.search);
    LOCATION_PARAM_CANDIDATES.forEach(c => { params.delete(c.param); params.delete(c.queryType); });
    params.set(otherCandidate.param, activeFilter.value);
    params.set(otherCandidate.queryType, "or");
    const alternateUrl = `${urlObj.pathname}?${params.toString()}`;

    const currentItems = Array.from(document.querySelectorAll("ul.products li.product"));
    const alternateItems = await fetchProductListItems(alternateUrl);

    // Classify + log which of the 3 scenarios this page falls into, so it's
    // obvious at a glance whether results are coming from centre_location
    // only, course_location only, or a genuine union of both.
    const primaryCount = currentItems.length;
    const alternateCount = alternateItems.length;
    let scenario;
    if (primaryCount > 0 && alternateCount === 0) {
        scenario = `${activeFilter.key} only`;
    } else if (primaryCount === 0 && alternateCount > 0) {
        scenario = `${otherCandidate.key} only`;
    } else if (primaryCount > 0 && alternateCount > 0) {
        scenario = "both (union)";
    } else {
        scenario = "neither has results";
    }
    console.log(`📍 Location scenario for "${activeFilter.value}": ${scenario}`, {
        [`${activeFilter.key}Count`]: primaryCount,
        [`${otherCandidate.key}Count`]: alternateCount
    });

    if (alternateItems.length === 0) return; // nothing to merge in

    const notice = document.querySelector(".woocommerce-info");
    let productList = document.querySelector("ul.products");

    // Zero-result pages: WooCommerce doesn't render <ul class="products"> at
    // all when the primary attribute matched nothing — only the "No products
    // were found..." notice. Build the list ourselves so results from the
    // OTHER attribute (e.g. course_location) can still be shown instead of a
    // blank page (confirmed 08/07/2026: filter_centre_location=ct-hub on the
    // NSA category returns 0 products since NSA is tagged under
    // course_location, not centre_location).
    if (!productList) {
        productList = document.createElement("ul");
        productList.className = "products columns-4";
        if (notice && notice.parentNode) {
            notice.parentNode.insertBefore(productList, notice);
        } else {
            const container = document.querySelector(".woocommerce, main, #main, .site-main");
            if (!container) return;
            container.appendChild(productList);
        }
    }

    const existingKeys = new Set(currentItems.map(getProductKey));
    let addedCount = 0;

    alternateItems.forEach(item => {
        const key = getProductKey(item);
        if (existingKeys.has(key)) return;
        existingKeys.add(key);
        productList.appendChild(item.cloneNode(true));
        addedCount++;
    });

    if (addedCount > 0) {
        if (notice) notice.remove();
        console.log(`📍 Merged ${addedCount} product(s) from ${otherCandidate.key} into the ${activeFilter.key} results.`);
    }
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

function navigateToLanguage(currentUrl, language) {
    const routeKey = Object.keys(languageRoutes).find(
        key => key !== "default" && currentUrl.includes(key)
    ) ?? "default";

    const route = languageRoutes[routeKey];
    const filterBase = route.filterBase ?? route.base;
    const langCode = route.languages[language];

    const urlObj = new URL(currentUrl);
    const activeLocationFilter = readActiveLocationFilter(urlObj.searchParams);
    const locationSuffix = activeLocationFilter
        ? `&filter_${activeLocationFilter.key}=${activeLocationFilter.value}&query_type_${activeLocationFilter.key}=or`
        : "";

    if (language === "All Languages") {
        window.location.href = activeLocationFilter
            ? `${filterBase}?filter_${activeLocationFilter.key}=${activeLocationFilter.value}&query_type_${activeLocationFilter.key}=or`
            : route.base;
    } else if (langCode) {
        window.location.href = `${filterBase}?filter_language=${langCode}&query_type_language=or${locationSuffix}`;
    }
}

// Async: live-verifies which query format actually filters correctly before
// navigating (see findWorkingLocationUrl), instead of assuming a fixed param.
async function navigateToLocation(currentUrl, location) {
    const locationName = location.split(" (")[0].trim().replace(/\u2013/g, '-');

    const routeKey = Object.keys(locationRoutes).find(
        key => key !== "default" && currentUrl.includes(key)
    ) ?? "default";

    const route = locationRoutes[routeKey];
    const filterBase = route.filterBase ?? route.base;
    const locationSlug = route.locations[locationName];

    const urlObj = new URL(currentUrl);
    const languageFilter = urlObj.searchParams.get("filter_language");
    const languageFilterQS = languageFilter ? `filter_language=${languageFilter}&query_type_language=or` : "";

    if (locationName === "All Locations") {
        window.location.href = languageFilter ? `${filterBase}?${languageFilterQS}` : route.base;
        return;
    }
    if (!locationSlug) return;

    const workingUrl = await findWorkingLocationUrl(filterBase, locationSlug, languageFilterQS);
    window.location.href = workingUrl;
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR HIGHLIGHTING
// No filter active  → ALL items bold (default state)
// Filter active     → matched item bold, others faded
// ─────────────────────────────────────────────────────────────

function handlingLanguageSideBar(item, currentUrl) {
    const text = item.textContent.trim();
    const isProgrammePage = sideBarConfig.language.routeKeys.some(key => currentUrl.includes(key))
        || currentUrl.includes(sideBarConfig.language.defaultUrlPattern);

    item.classList.remove("bold", "fade");
    if (!isProgrammePage) return;

    const activeFilter = new URL(currentUrl).searchParams.get("filter_language");

    if (!activeFilter) {
        item.classList.add("bold");
        return;
    }

    const routeKey = sideBarConfig.language.routeKeys.find(key => currentUrl.includes(key)) ?? "default";
    const languages = languageRoutes[routeKey].languages;
    const activeLabel = Object.keys(languages).find(k => languages[k] === activeFilter);
    item.classList.add(text === activeLabel ? "bold" : "fade");
}

function handlingLocationSideBar(item, currentUrl) {
    const text = item.textContent.trim();
    const isProgrammePage = sideBarConfig.location.routeKeys.some(key => currentUrl.includes(key))
        || currentUrl.includes(sideBarConfig.location.defaultUrlPattern);

    item.classList.remove("bold", "fade");
    if (!isProgrammePage) return;

    const activeFilter = readActiveLocationFilter(new URL(currentUrl).searchParams);

    if (!activeFilter) {
        item.classList.add("bold");
        return;
    }

    const activeLabel = Object.keys(allLocations).find(k => allLocations[k] === activeFilter.value);
    item.classList.add(text === activeLabel ? "bold" : "fade");
}

// ─────────────────────────────────────────────────────────────
// PAGE FUNCTIONS
// ─────────────────────────────────────────────────────────────

function removeSopBreadcrumb(breadcrumbs) {
    if (!breadcrumbs) return;
    const links = breadcrumbs.querySelectorAll("a");
    const separators = breadcrumbs.querySelectorAll(".qodef-breadcrumbs-separator");
    let index = 0;
    links.forEach((link, i) => {
        if (link.textContent === "Shop") { index = i; link.remove(); }
    });
    if (separators[index]) separators[index].remove();
}

function newTitleBar(currentUrl) {
    const isProductPage = currentUrl.includes("https://ecss.org.sg/product/");
    const isSupportUs = currentUrl.includes("product-category/support-us/");
    if (!isProductPage && !isSupportUs) return;

    if (isProductPage) {
        removePriceIFFree(document.querySelector(".woocommerce-Price-amount.amount"), currentUrl);
    }
    removeSopBreadcrumb(document.querySelector(".qodef-breadcrumbs"));
}

function newTitleNameDisplayed(currentUrl) {
    if (!currentUrl.includes("https://ecss.org.sg/product/")) return;

    const title = document.querySelector(".qodef-breadcrumbs-current");
    if (!title) return;
    title.querySelectorAll("br").forEach(br => {
        br.parentNode.insertBefore(document.createTextNode(" "), br);
        br.remove();
    });
}

function editbreadcrumbs(currentUrl) {
    if (
        !currentUrl.includes("product-category/talks-and-seminar") &&
        !currentUrl.includes("product-category/courses/") &&
        !currentUrl.includes("product-category/marriage-preparation-programme/") &&
        !currentUrl.includes("product-category/others")
    ) return;
    removeSopBreadcrumb(document.querySelector(".qodef-breadcrumbs"));
}

function removeHrefFromLinks(items) {
    items.forEach(item => {
        const link = item.querySelector("a");
        if (link) link.removeAttribute("href");
    });
}

function removeSpanFromLinks(items) {
    items.forEach(item => {
        const span = item.querySelector("span");
        if (span) span.remove();
    });
}

function resetLanguageFilter() {
    document.querySelectorAll('.language-filter a').forEach(el => el.classList.remove('active'));
    const url = new URL(window.location.href);
    url.searchParams.delete('filter_language');
    url.searchParams.delete('query_type_language');
    window.location.href = url.pathname + url.search;
}

function resetLocationFilter() {
    document.querySelectorAll('.location-filter a').forEach(el => el.classList.remove('active'));
    const url = new URL(window.location.href);
    LOCATION_PARAM_CANDIDATES.forEach(c => {
        url.searchParams.delete(c.param);
        url.searchParams.delete(c.queryType);
    });
    window.location.href = url.pathname + url.search;
}

function addPriceFurtherDetails(currentUrl) {
    if (!currentUrl.includes("product-category")) return;

    const titles = document.querySelectorAll(".qodef-woo-product-content");
    const priceTags = document.querySelectorAll("span.price");

    function insertAfter(ref, ...nodes) {
        let cursor = ref;
        nodes.forEach(n => {
            cursor.parentNode.insertBefore(n, cursor.nextSibling);
            cursor = n;
        });
    }

    priceTags.forEach((element, index) => {
        const bdiElement = element.querySelector("bdi");
        if (!bdiElement) return;

        const courseTitle = titles[index] ? titles[index].textContent : "";
        const priceAmount = parseFloat(bdiElement.textContent.replace('$', '').trim());
        const computedStyles = window.getComputedStyle(element);
        const sharedStyle = `font-size:${computedStyles.fontSize};font-family:${computedStyles.fontFamily};font-weight:${computedStyles.fontWeight};`;

        const span1 = document.createElement('span');
        const br    = document.createElement('br');
        const span3 = document.createElement('span');
        span1.textContent = 'After Subsidy';
        span3.textContent = 'SkillsFuture Credit Eligible';
        span1.style.cssText = sharedStyle + `color:${computedStyles.color};`;
        span3.style.cssText = sharedStyle + `color:#228B22;`;

        if (
            courseTitle.includes("My Story") ||
            courseTitle.includes("Community Ukulele – Mandarin L1") ||
            courseTitle.includes("Community Ukulele Level 2")
        ) {
            insertAfter(element, span1);
        } else if (courseTitle.includes("MPrep")) {
            insertAfter(element, span1, br, span3);
            span1.style.display = "none";
            span3.style.display = "none";
        } else if (priceAmount <= 0.00) {
            bdiElement.style.display = "none";
        } else {
            insertAfter(element, span1, br, span3);
        }
    });
}

function removePriceTag(currentUrl) {
    document.querySelectorAll(".woocommerce-Price-amount.amount").forEach(element => {
        const recentViewedContainer = element.closest('.widget.woocommerce.widget_recently_viewed_products');
        if (!recentViewedContainer) return;
        const priceContainer = element.closest('.woocommerce-Price-amount.amount');
        if (priceContainer && recentViewedContainer.contains(priceContainer)) priceContainer.remove();
    });
}

function removePriceIFFree(item, currentUrl) {
    // Placeholder: price removal logic for free products on individual product pages
}

function parseCourseNameParts(html) {
    const parts = html.replace(/&/g, "&").split("<br>");
    if (parts.length === 3) return { engName: parts[1] };
    return { engName: parts[0] };
}

function getRegistrationURL() {
    const link = encodeURIComponent(window.location.href);
    console.log('📍 Link parameter:', link);

    const titleEl = document.querySelector(".qodef-woo-product-title.product_title.entry-title");
    // if (titleEl && titleEl.textContent.includes('Understanding Traditional Chinese Medicine Products')) {
    //     return `http://localhost:3000/form?link=${link}&category=`;
    // }

    let category = '';
    const productMeta = document.querySelector('.product_meta .posted_in .qodef-woo-meta-value');
    if (productMeta) {
        const categoryLinks = productMeta.querySelectorAll('a');
        for (const catLink of categoryLinks) {
            const catText = catLink.textContent.trim();
            if (catText.includes('Tri-Love Elderly: ILP')) { category = 'ILP'; break; }
            else if (catText.includes('Tri-Love Elderly: NSA')) { category = 'NSA'; break; }
            else if (catText.includes('Talks And Seminar')) { category = 'Talks And Seminar'; break; }
            else if (catText.includes('Marriage Preparation Programme')) { category = 'Marriage Preparation Programme'; break; }
            else if (catText.includes('Others')) { category = 'Others'; break; }
        }
    }

    console.log('📦 Category detected:', category || 'none');
    return `https://salmon-wave-09f02b100.6.azurestaticapps.net/form?link=${link}&category=${encodeURIComponent(category)}`;
}

// ─────────────────────────────────────────────────────────────
// BOLD STYLING
// ─────────────────────────────────────────────────────────────

function boldWidgetHeaders() {
    const widgets = document.querySelectorAll(".woocommerce-widget-layered-nav");
    widgets.forEach(widget => {
        const heading = widget.querySelector("h3, h4, .qodef-widget-title, .widget-title");
        if (!heading) return;
        const text = heading.textContent.trim().toUpperCase();
        if (
            text.includes("LANGUAGE") ||
            text.includes("语文") ||
            text === "VENUE" ||
            text.includes("CENTRE LOCATION") ||
            text.includes("中心地点") ||
            text.includes("COURSE LOCATION") ||
            text.includes("上课地点")
        ) {
            heading.style.fontWeight = "900";
            heading.style.fontSize = "1.2em";
        }
    });
}

function boldVenueItems() {
    const sideNavBars = document.querySelectorAll(".woocommerce-widget-layered-nav-list");
    if (sideNavBars.length >= 2) {
        const venueList = sideNavBars[1];
        const venueItems = venueList.querySelectorAll("li");

        venueItems.forEach(item => {
            if (item.classList.contains("bold")) {
                item.style.fontWeight = "700";
                item.style.opacity = "1";
            } else if (item.classList.contains("fade")) {
                item.style.fontWeight = "700";
                item.style.opacity = "0.75";
            }

            const link = item.querySelector("a");
            if (link) {
                if (item.classList.contains("bold")) {
                    link.style.fontWeight = "700";
                    link.style.opacity = "1";
                } else if (item.classList.contains("fade")) {
                    link.style.fontWeight = "700";
                    link.style.opacity = "0.75";
                }
            }
        });
    }
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

window.addEventListener("load", function () {
    const currentUrl = window.location.href;
    if (!currentUrl.includes("support-us")) return;

    document.querySelectorAll("span.price").forEach(element => {
        const bdiElement = element.querySelector("bdi");
        if (!bdiElement) return;
        if (parseFloat(bdiElement.textContent.replace('$', '').trim()) <= 0.00) {
            bdiElement.style.display = "none";
        }
    });

    boldWidgetHeaders();
    boldVenueItems();
});

document.addEventListener("DOMContentLoaded", function () {
    const currentUrl = window.location.href;

    document.cookie.split(";").forEach(cookie => {
        const name = cookie.split("=")[0].trim();
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    });

    resolveVenueSidebar(currentUrl);

    // Diagnostic: show BOTH attributes' state at once (widget presence, real
    // terms, active URL filter value) instead of just the single guessed key
    // — makes it possible to see at a glance why one attribute filtered
    // (or didn't) without guessing.
    (function logLocationDiagnostics() {
        const { centre, course } = findLocationWidgets();
        const activeFilter = readActiveLocationFilter(new URL(currentUrl).searchParams);
        console.log('📍 Location diagnostics:', {
            guessedFilterKey: LOCATION_FILTER_KEY,
            activeUrlFilter: activeFilter, // { key, value } or null
            centre_location: {
                widgetPresent: !!centre,
                hasRealTerms: widgetHasRealTerms(centre)
            },
            course_location: {
                widgetPresent: !!course,
                hasRealTerms: widgetHasRealTerms(course)
            }
        });
    })();

    if (sideBarConfig.location.routeKeys.some(key => currentUrl.includes(key)) || currentUrl.includes(sideBarConfig.location.defaultUrlPattern)) {
        mergeAlternateLocationResults(currentUrl);
    }

    boldWidgetHeaders();

    // Wire up the sidebar (Language + Venue) click handlers EARLY and inside
    // their own try/catch. Everything else in this handler runs
    // synchronously after this point — if any of it throws, that must not
    // silently prevent the venue/language click handlers from ever being
    // attached (previously reported symptom: "clicking a venue does
    // nothing", with no visible error).
    try {
        const sideNavBar = document.querySelectorAll(".woocommerce-widget-layered-nav-list");
        if (sideNavBar.length >= 2) {
            sideNavBar.forEach(navBar => {
                const items = navBar.querySelectorAll("li");
                removeHrefFromLinks(items);
                removeSpanFromLinks(items);
            });

            const languageItems = Array.from(sideNavBar[0].querySelectorAll("li"));
            const newLangItem = document.createElement('li');
            const newLangLink = document.createElement('a');
            newLangLink.textContent = 'All Languages';
            newLangItem.appendChild(newLangLink);
            sideNavBar[0].appendChild(newLangItem);
            languageItems.push(newLangItem);

            languageItems.forEach(item => {
                item.addEventListener("click", () => {
                    try {
                        navigateToLanguage(currentUrl, item.textContent.trim());
                    } catch (err) {
                        console.error('📍 navigateToLanguage failed:', err);
                    }
                });
                handlingLanguageSideBar(item, currentUrl);
            });

            const locationItems = Array.from(sideNavBar[1].querySelectorAll("li"));
            const newLocItem = document.createElement('li');
            const newLocLink = document.createElement('a');
            newLocLink.textContent = 'All Locations';
            newLocItem.appendChild(newLocLink);
            sideNavBar[1].appendChild(newLocItem);
            locationItems.push(newLocItem);

            locationItems.forEach(item => {
                item.addEventListener("click", () => {
                    navigateToLocation(currentUrl, item.textContent.trim())
                        .catch(err => console.error('📍 navigateToLocation failed:', err));
                });
                handlingLocationSideBar(item, currentUrl);
            });
        } else {
            console.warn('📍 Sidebar wiring skipped: found', sideNavBar.length, '.woocommerce-widget-layered-nav-list element(s), need >= 2.');
        }

        boldVenueItems();
    } catch (err) {
        console.error('📍 Sidebar wiring threw — venue/language clicks will NOT work:', err);
    }

    document.querySelectorAll('.qodef-woo-product-mark.qodef-out-of-stock').forEach(el => {
        if (el.parentElement) {
            el.parentElement.style.position = 'relative';
        }
        el.innerHTML = '<span style="font-size:2em; font-weight:bold; padding:8px 12px; border-radius:4px; text-alignment: right">Class Full</span>';
    });

    const outOfStock = document.querySelector(".stock.out-of-stock");
    if (outOfStock) {
        outOfStock.textContent = "FULL";
        outOfStock.style.fontSize = "300%";
        outOfStock.style.fontWeight = "bold";
    }

    const stockStatus = document.getElementById("stock_status");
    if (stockStatus) stockStatus.textContent = outOfStock ? "OUT OF STOCK" : "IN STOCK";

    const productQuantity = document.querySelector(".stock.in-stock");
    if (productQuantity) productQuantity.style.display = "none";

    const productImage = document.querySelector(".qodef-woo-product-image");
    if (productImage) {
        productImage.style.transition = "none";
        productImage.style.transform = "none";
        productImage.style.boxShadow = "none";
    }

    document.querySelectorAll("img").forEach(img => {
        const data = MODAL_DATA[img.title];
        if (!data) return;

        img.addEventListener("click", function () {
            const overlay = document.createElement("div");
            overlay.className = "overlay";
            const modal = document.createElement("div");
            modal.className = "modal";

            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">×</span>
                    <div class="modal-body">
                        <p><strong>${data.chi}</strong></p>
                        <p><strong>${data.eng}</strong></p>
                        <div class="schedule-info">
                            <div class="column" id="column1">
                                <p><strong>星期：</strong>${data.dayChi}</p>
                                <p><strong>Day: </strong>${data.dayEng}</p>
                            </div>
                            <div class="column" id="column2">
                                <p><strong>时间：</strong>${data.timeChi}</p>
                                <p><strong>Time: </strong>${data.timeEng}</p>
                            </div>
                        </div>
                    </div>
                </div>`;

            function closeModal() { overlay.remove(); modal.remove(); }

            modal.querySelector(".close-modal").addEventListener("click", closeModal, { once: true });
            overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); }, { once: true });

            document.body.append(overlay, modal);
        });
    });

    const category = document.querySelector(".qodef-woo-meta-value");
    if (category) {
        const categoryText = category.innerHTML + category.textContent;

        if (SPECIAL_CATEGORIES.some(c => categoryText.includes(c))) {
            localStorage.setItem("currentPageLink", currentUrl);

            let addToCartButton =
                document.querySelector(".single_add_to_cart_button.button.alt") ||
                document.querySelector(".single_add_to_cart_button") ||
                document.querySelector('button[name="add-to-cart"]') ||
                document.querySelector(".add_to_cart_button") ||
                document.querySelector('input[name="add-to-cart"]');

            const quantity = document.querySelector(".qodef-quantity-buttons.quantity");
            if (quantity) quantity.style.display = "none";

            if (document.querySelectorAll(".stock.out-of-stock").length > 0) {
                [addToCartButton, document.getElementById("reg"), document.getElementById("reglink"), document.querySelector(".nta_wa_button")]
                    .forEach(el => { if (el) el.style.display = "none"; });
            } else {
                if (!addToCartButton) {
                    addToCartButton = document.createElement("button");
                    addToCartButton.className = "custom-register-button button alt";
                    addToCartButton.style.cssText = "background-color:#007cba;color:white;padding:12px 24px;border:none;border-radius:4px;cursor:pointer;font-size:16px;margin:10px 0;display:block;width:200px;";
                    const container = document.querySelector(".summary, .product-summary, .single-product-summary, .entry-summary");
                    if (container) container.appendChild(addToCartButton);
                }

                addToCartButton.textContent = "Register Here";
                addToCartButton.style.display = "block";
                addToCartButton.style.visibility = "visible";
                addToCartButton.style.opacity = "1";
                addToCartButton.removeAttribute("onclick");

                addToCartButton.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const registrationUrl = getRegistrationURL();
                    console.log('🎯 [Registration] Redirecting to form:', registrationUrl);
                    window.location.href = registrationUrl;
                }, true);
            }
        }
    }

    try {
        editbreadcrumbs(currentUrl);
        newTitleBar(currentUrl);
        newTitleNameDisplayed(currentUrl);
    } catch (err) {
        console.error('📍 Breadcrumb/title handling failed:', err);
    }

    try {
        addPriceFurtherDetails(currentUrl);
        removePriceTag(currentUrl);
    } catch (err) {
        console.error('📍 Price display handling failed:', err);
    }
});
</script>
