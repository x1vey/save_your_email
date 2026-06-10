import type { EspGuess } from "./types";

// Map an MX hostname or an SPF include domain to a known provider.
// `likelySelectors` are the DKIM selectors we'll probe for that provider,
// since DKIM selectors can't be enumerated from DNS without knowing them.
interface EspSignature {
  name: string;
  // Substrings to look for in MX targets.
  mx: string[];
  // Substrings to look for in SPF include: mechanisms.
  spfIncludes: string[];
  selectors: string[];
}

const SIGNATURES: EspSignature[] = [
  {
    name: "Google Workspace",
    mx: ["google.com", "googlemail.com"],
    spfIncludes: ["_spf.google.com"],
    selectors: ["google"],
  },
  {
    name: "Microsoft 365",
    mx: ["outlook.com", "protection.outlook.com"],
    spfIncludes: ["spf.protection.outlook.com"],
    selectors: ["selector1", "selector2"],
  },
  {
    name: "Mailchimp / Mandrill",
    mx: ["mandrillapp.com"],
    spfIncludes: ["spf.mandrillapp.com", "servers.mcsv.net"],
    selectors: ["k1", "k2", "k3", "mte1", "mte2"],
  },
  {
    name: "SendGrid",
    mx: ["sendgrid.net"],
    spfIncludes: ["sendgrid.net"],
    selectors: ["s1", "s2", "smtpapi"],
  },
  {
    name: "Amazon SES",
    mx: ["amazonses.com"],
    spfIncludes: ["amazonses.com"],
    selectors: ["amazonses"],
  },
  {
    name: "Mailgun",
    mx: ["mailgun.org"],
    spfIncludes: ["mailgun.org"],
    selectors: ["k1", "mg", "smtp"],
  },
  {
    name: "Postmark",
    mx: ["mtasv.net"],
    spfIncludes: ["spf.mtasv.net"],
    selectors: ["pm", "20240101"],
  },
  {
    name: "Zoho Mail",
    mx: ["zoho.com", "zoho.eu"],
    spfIncludes: ["zoho.com", "zoho.eu"],
    selectors: ["zoho", "zmail"],
  },
  {
    name: "Klaviyo",
    mx: [],
    spfIncludes: ["_spf.klaviyo.com"],
    selectors: ["kl", "kl2", "dkim"],
  },
  {
    name: "Shopify Email",
    mx: [],
    spfIncludes: ["shops.shopify.com", "spf.shopifyemail.com"],
    selectors: ["shopify1", "shopify2"],
  },
  {
    name: "HubSpot",
    mx: [],
    spfIncludes: ["_spf.hubspotemail.net"],
    selectors: ["hs1", "hs2"],
  },
];

// Common selectors to fall back to when the provider is unknown.
export const GENERIC_SELECTORS = [
  "default",
  "dkim",
  "mail",
  "selector1",
  "selector2",
  "google",
  "k1",
  "s1",
  "mxvault",
];

export function detectEsp(mxTargets: string[], spfIncludes: string[]): EspGuess | null {
  for (const sig of SIGNATURES) {
    const mxHit = sig.mx.some((needle) =>
      mxTargets.some((mx) => mx.toLowerCase().includes(needle))
    );
    if (mxHit) {
      return { name: sig.name, source: "mx", likelySelectors: sig.selectors };
    }
  }
  // No MX match — try SPF includes (covers ESPs that only send, like Klaviyo).
  for (const sig of SIGNATURES) {
    const spfHit = sig.spfIncludes.some((needle) =>
      spfIncludes.some((inc) => inc.toLowerCase().includes(needle))
    );
    if (spfHit) {
      return { name: sig.name, source: "spf", likelySelectors: sig.selectors };
    }
  }
  return null;
}
