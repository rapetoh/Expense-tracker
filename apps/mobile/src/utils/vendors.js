// Popular vendor logos and styling with Logo.dev API
// Maps vendor names to Logo.dev company identifiers (domain names)
export const VENDOR_LOGO_MAP = {
  // Streaming
  netflix: "netflix.com",
  spotify: "spotify.com",
  hulu: "hulu.com",
  "disney+": "disney.com",
  "amazon prime": "amazon.com",
  youtube: "youtube.com",

  // Food & Coffee
  starbucks: "starbucks.com",
  mcdonald: "mcdonalds.com",
  "mcdonald's": "mcdonalds.com",
  "burger king": "bk.com",
  subway: "subway.com",
  "taco bell": "tacobell.com",
  dunkin: "dunkindonuts.com",
  chipotle: "chipotle.com",

  // Transportation
  uber: "uber.com",
  lyft: "lyft.com",

  // Tech & Apps
  apple: "apple.com",
  google: "google.com",
  microsoft: "microsoft.com",

  // Shopping
  amazon: "amazon.com",
  walmart: "walmart.com",
  target: "target.com",
  "whole foods": "wholefoodsmarket.com",
  costco: "costco.com",

  // Gas Stations
  shell: "shell.com",
  exxon: "exxonmobil.com",
  bp: "bp.com",
  chevron: "chevron.com",

  // Banks & Finance
  "chase bank": "chase.com",
  "bank of america": "bankofamerica.com",
  wells: "wellsfargo.com",

  // Airlines
  delta: "delta.com",
  american: "aa.com",
  united: "united.com",
  southwest: "southwest.com",
};

// Brand colors for styling
export const VENDOR_COLORS = {
  netflix: { color: "#E50914", bgColor: "rgba(229, 9, 20, 0.1)" },
  spotify: { color: "#1DB954", bgColor: "rgba(29, 185, 84, 0.1)" },
  hulu: { color: "#00ED82", bgColor: "rgba(0, 237, 130, 0.1)" },
  "disney+": { color: "#113CCF", bgColor: "rgba(17, 60, 207, 0.1)" },
  "amazon prime": { color: "#FF9900", bgColor: "rgba(255, 153, 0, 0.1)" },
  youtube: { color: "#FF0000", bgColor: "rgba(255, 0, 0, 0.1)" },
  starbucks: { color: "#00704A", bgColor: "rgba(0, 112, 74, 0.1)" },
  mcdonald: { color: "#FFCC00", bgColor: "rgba(255, 204, 0, 0.1)" },
  "mcdonald's": { color: "#FFCC00", bgColor: "rgba(255, 204, 0, 0.1)" },
  "burger king": { color: "#D62300", bgColor: "rgba(214, 35, 0, 0.1)" },
  subway: { color: "#009639", bgColor: "rgba(0, 150, 57, 0.1)" },
  "taco bell": { color: "#7B3F99", bgColor: "rgba(123, 63, 153, 0.1)" },
  dunkin: { color: "#FF671F", bgColor: "rgba(255, 103, 31, 0.1)" },
  chipotle: { color: "#A81612", bgColor: "rgba(168, 22, 18, 0.1)" },
  uber: { color: "#000000", bgColor: "rgba(0, 0, 0, 0.1)" },
  lyft: { color: "#FF00BF", bgColor: "rgba(255, 0, 191, 0.1)" },
  apple: { color: "#000000", bgColor: "rgba(0, 0, 0, 0.1)" },
  google: { color: "#4285F4", bgColor: "rgba(66, 133, 244, 0.1)" },
  microsoft: { color: "#00BCF2", bgColor: "rgba(0, 188, 242, 0.1)" },
  amazon: { color: "#FF9900", bgColor: "rgba(255, 153, 0, 0.1)" },
  walmart: { color: "#0071CE", bgColor: "rgba(0, 113, 206, 0.1)" },
  target: { color: "#CC0000", bgColor: "rgba(204, 0, 0, 0.1)" },
  "whole foods": { color: "#00674B", bgColor: "rgba(0, 103, 75, 0.1)" },
  costco: { color: "#E31837", bgColor: "rgba(227, 24, 55, 0.1)" },
  shell: { color: "#FFDE17", bgColor: "rgba(255, 222, 23, 0.1)" },
  exxon: { color: "#E4002B", bgColor: "rgba(228, 0, 43, 0.1)" },
  bp: { color: "#00B050", bgColor: "rgba(0, 176, 80, 0.1)" },
  chevron: { color: "#E31837", bgColor: "rgba(227, 24, 55, 0.1)" },
  "chase bank": { color: "#0066B2", bgColor: "rgba(0, 102, 178, 0.1)" },
  "bank of america": { color: "#E31837", bgColor: "rgba(227, 24, 55, 0.1)" },
  wells: { color: "#D71921", bgColor: "rgba(215, 25, 33, 0.1)" },
  delta: { color: "#003366", bgColor: "rgba(0, 51, 102, 0.1)" },
  american: { color: "#B6BBBF", bgColor: "rgba(182, 187, 191, 0.1)" },
  united: { color: "#0039A6", bgColor: "rgba(0, 57, 166, 0.1)" },
  southwest: { color: "#F9B612", bgColor: "rgba(249, 182, 18, 0.1)" },
};

// Fallback emoji icons
export const VENDOR_ICONS = {
  netflix: "📺",
  spotify: "🎵",
  hulu: "📺",
  "disney+": "🏰",
  "amazon prime": "📦",
  youtube: "▶️",
  starbucks: "☕",
  mcdonald: "🍟",
  "mcdonald's": "🍟",
  "burger king": "🍔",
  subway: "🥪",
  "taco bell": "🌮",
  dunkin: "🍩",
  chipotle: "🌯",
  uber: "🚗",
  lyft: "🚕",
  apple: "🍎",
  google: "🔍",
  microsoft: "💻",
  amazon: "📦",
  walmart: "🛒",
  target: "🎯",
  "whole foods": "🥬",
  costco: "🏬",
  shell: "⛽",
  exxon: "⛽",
  bp: "⛽",
  chevron: "⛽",
  "chase bank": "🏦",
  "bank of america": "🏦",
  wells: "🏦",
  delta: "✈️",
  american: "✈️",
  united: "✈️",
  southwest: "✈️",
};

// Normalize vendor name for lookup
export function normalizeVendorForLogo(vendor) {
  if (!vendor || typeof vendor !== "string") return null;
  return vendor.toLowerCase().trim();
}

// Get Logo.dev URL for a vendor domain
export function getVendorLogoUrl(domain) {
  const apiKey = process.env.EXPO_PUBLIC_LOGO_DEV_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Logo.dev API key not found in EXPO_PUBLIC_LOGO_DEV_API_KEY");
    return null;
  }
  const url = `https://img.logo.dev/${encodeURIComponent(domain)}?token=${apiKey}`;
  console.log('🔗 getVendorLogoUrl: Generated URL for domain:', domain, 'URL:', url.substring(0, 50) + '...');
  return url;
}

// Get vendor logo info (returns logoUrl, colors, and fallback icon)
export function getVendorLogo(vendor) {
  const normalized = normalizeVendorForLogo(vendor);
  if (!normalized) {
    console.log('🚫 getVendorLogo: normalized is null for vendor:', vendor);
    return null;
  }

  // Find matching vendor key
  let vendorKey = null;
  let domain = null;
  
  // Direct match
  if (VENDOR_LOGO_MAP[normalized]) {
    vendorKey = normalized;
    domain = VENDOR_LOGO_MAP[normalized];
    console.log('✅ getVendorLogo: Direct match found', { vendor, normalized, vendorKey, domain });
  } else {
    // Partial matches
    for (const [key, mappedDomain] of Object.entries(VENDOR_LOGO_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        vendorKey = key;
        domain = mappedDomain;
        console.log('✅ getVendorLogo: Partial match found', { vendor, normalized, vendorKey, domain });
        break;
      }
    }
  }

  // If we found a mapping, use it
  if (vendorKey && domain) {
    const logoUrl = getVendorLogoUrl(domain);
    const colors = VENDOR_COLORS[vendorKey] || null;
    const icon = VENDOR_ICONS[vendorKey] || null;

    console.log('📦 getVendorLogo: Returning mapped vendor', { vendor, vendorKey, domain, logoUrl: logoUrl ? 'exists' : 'null', hasIcon: !!icon });

    return {
      logoUrl,
      icon,
      color: colors?.color || null,
      bgColor: colors?.bgColor || null,
    };
  }

  // No mapping found - try direct Logo.dev API call with the vendor name
  // Logo.dev accepts company names directly and does fuzzy matching
  console.log('🔄 getVendorLogo: No mapping found, trying direct Logo.dev API for:', vendor);
  
  // Clean up the vendor name for Logo.dev (remove common suffixes, extra words)
  const cleanVendorName = normalized
    .replace(/\s+(restaurant|store|shop|market|inc|llc|corp|company|co\.|ltd)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanVendorName) {
    const directLogoUrl = getVendorLogoUrl(cleanVendorName);
    console.log('🔗 getVendorLogo: Trying direct API call with:', cleanVendorName);
    
    return {
      logoUrl: directLogoUrl,
      icon: null, // No fallback emoji for unmapped vendors - will use category icon
      color: null,
      bgColor: null,
    };
  }

  console.log('🚫 getVendorLogo: No match found and cannot try direct API for vendor:', vendor);
  return null;
}
