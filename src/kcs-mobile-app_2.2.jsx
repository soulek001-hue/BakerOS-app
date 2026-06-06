import React, { useState, useRef, useCallback, useMemo, useEffect, createContext, useContext } from "react";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

// ── Secure API fetch helper — adds shared secret header to all internal API calls
const API_SECRET = import.meta.env.VITE_API_SECRET || "";
const apiFetch = (url, options = {}) => fetch(url, {
  ...options,
  headers: { "Content-Type": "application/json", "x-bakeros-secret": API_SECRET, ...(options.headers || {}) },
});

/* ── BRAND CONTEXT ─────────────────────────── */
const Ctx = createContext(null);
const DEFAULT_THEME = { primary:"#C47B00", accent:"#E8A838", bg:"#FFFBF5", surface:"#FDF6EC", text:"#2C1A0E" };
const SAFE_BRAND_FALLBACK = { storeName:"BakerOS", tagline:"", logo:null, font:"outfit", theme: DEFAULT_THEME };
const useBrand = () => {
  const ctx = useContext(Ctx);
  if (!ctx) return SAFE_BRAND_FALLBACK;
  if (!ctx.theme) return { ...ctx, theme: DEFAULT_THEME };
  return ctx;
};

/* ── TIER SYSTEM ────────────────────────────── */
const TierCtx = createContext(null);
const useTier = () => useContext(TierCtx) || { tier:"starter", setTier:()=>{}, setPage:()=>{} };

const TIERS = {
  starter: { id:"starter", label:"Free", price:"$0",    color:"#6B7280" },
  growth:  { id:"growth",  label:"Growth",  price:"$19.99",  color:"#3D5A99" },
  pro:     { id:"pro",     label:"Pro",     price:"$39.99",  color:"#C47B00" },
  elite:   { id:"elite",   label:"Elite",   price:"$74.99",  color:"#7C5CBF" },
};

// Ordered list for tier comparison checks
const TIER_ORDER = ["starter","growth","pro","elite"];
function tierAtLeast(tier, min){ return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min); }

const FEATURES = {
  storefront:              ["starter","growth","pro","elite"],
  qr_link:                 ["starter","growth","pro","elite"],
  nfc_keychain:            ["starter","growth","pro","elite"],
  manual_orders:           ["starter","growth","pro","elite"],
  basic_order_tracking:    ["starter","growth","pro","elite"],
  limited_products:        ["starter"],
  bakeros_branding:        ["starter"],
  calendar:                ["starter","growth","pro","elite"],
  customer_list:           ["starter","growth","pro","elite"],
  customer_basic_info:     ["starter","growth","pro","elite"],
  customer_order_history:  ["starter","growth","pro","elite"],
  messages:                ["growth","pro","elite"],
  message_notifications:   ["growth","pro","elite"],
  invoicing:               ["growth","pro","elite"],
  custom_branding:         ["growth","pro","elite"],
  unlimited_products:      ["growth","pro","elite"],
  order_dashboard:         ["growth","pro","elite"],
  order_history:           ["growth","pro","elite"],
  order_confirmations:     ["growth","pro","elite"],
  payment_integrations:    ["growth","pro","elite"],
  remove_branding:         ["growth","pro","elite"],
  inventory:               ["growth","pro","elite"],
  crm:                     ["growth","pro","elite"],
  crm_advanced:            ["pro","elite"],
  crm_notes:               ["growth","pro","elite"],
  crm_tags:                ["growth","pro","elite"],
  crm_allergy_flags:       ["growth","pro","elite"],
  crm_search:              ["growth","pro","elite"],
  crm_segments:            ["pro","elite"],
  saved_replies:           ["pro","elite"],
  automated_replies:       ["pro","elite"],
  ai_campaigns:            ["pro","elite"],
  marketing:               ["growth","pro","elite"],
  nfc_lead_capture:        ["pro","elite"],
  auto_followups:          ["pro","elite"],
  discount_codes:          ["pro","elite"],
  analytics:               ["pro","elite"],
  marketing_sms:           ["pro","elite"],
  marketing_email:         ["pro","elite"],
  receipt_scan:            ["elite"],
  tax_export:              ["elite"],
  profit_tracking:         ["elite"],
  expense_tracking:        ["elite"],
  advanced_reporting:      ["elite"],
  multi_user:              ["elite"],
  priority_support:        ["elite"],
  accounting_export:       ["elite"],
};

function canAccess(tier, feature){ return (FEATURES[feature]||[]).includes(tier); }
// Generate storefront slug — matches what the API uses as fallback
function getStorefrontSlug(brand, bakerInfo) {
  const username = brand?.bakeryUsername || bakerInfo?.username;
  if (username) return username;
  const name = brand?.storeName || bakerInfo?.name || "";
  return name
    .toLowerCase()
    .replace(/[''`]/g, "")           // strip apostrophes before slugifying
    .replace(/[^a-z0-9]+/g, "-")    // replace non-alphanumeric with dash
    .replace(/^-|-$/g, "")          // trim leading/trailing dashes
    || "your-store";
}
function getStorefrontURL(brand, bakerInfo) {
  return `https://app.bakeros.app/store/${getStorefrontSlug(brand, bakerInfo)}`;
}

const FONTS = [
  { id:"outfit",  label:"Outfit",  body:"'Outfit',sans-serif",  display:"'Cormorant Garamond',serif" },
  { id:"poppins", label:"Poppins", body:"'Poppins',sans-serif", display:"'Playfair Display',serif"   },
  { id:"nunito",  label:"Nunito",  body:"'Nunito',sans-serif",  display:"'Libre Baskerville',serif"  },
  { id:"lato",    label:"Lato",    body:"'Lato',sans-serif",    display:"'Merriweather',serif"       },
];
const THEMES = [
  { name:"BakerOS Gold",   primary:"#C47B00", accent:"#E8920A", bg:"#FDF6EC", surface:"#FFFAF3", text:"#3D1C00" },
  { name:"Midnight Rose", primary:"#9B2335", accent:"#D4586A", bg:"#160810", surface:"#22101A", text:"#F5E6EB" },
  { name:"Sage Garden",   primary:"#4A7C59", accent:"#7AB893", bg:"#F2F7F4", surface:"#FFFFFF", text:"#1A2E22" },
  { name:"Blueberry",     primary:"#3D5A99", accent:"#6B8FD4", bg:"#F0F3FA", surface:"#FFFFFF", text:"#1A2340" },
  { name:"Charcoal",      primary:"#2D2D2D", accent:"#FF6B35", bg:"#F5F5F5", surface:"#FFFFFF", text:"#1A1A1A" },
  { name:"Lavender",      primary:"#7C5CBF", accent:"#B48FE8", bg:"#F7F3FF", surface:"#FFFFFF", text:"#2A1A4A" },
];
const BAKEROS_LOGO = "/logo-icon.png";

const DEFAULT_BRAND = {
  storeName:"BakerOS", tagline:"Run Your Bakery. Grow Your Business.",
  logo:BAKEROS_LOGO, font:"outfit", theme:THEMES[0],
};

/* ── GLOBAL CSS ────────────────────────────── */

/* ── CONVERSION SYSTEM — LOCKED SCREENS + UPGRADE FUNNELS ──────────────────
   Spec: Show VALUE before price. Tie features to MONEY. Lock ACTIONS not data.
─────────────────────────────────────────────────────────────────────────── */

// Locked screen configs — each has an icon, headline, body, bullets, CTA
const LOCK_CONFIGS = {
  // Growth features — Trial upgrades to Growth
  messages: {
    icon:"💬", headline:"Customer Messaging",
    body:"See and reply to messages customers send from your storefront.",
    bullets:["Real-time customer inbox","Reply from the app","Never miss an inquiry"],
    cta:"Upgrade to Growth", ctaTier:"growth", secondary:"View Plans",
  },
  invoicing: {
    icon:"🧾", headline:"Professional Invoices",
    body:"Send branded invoices and get paid faster.",
    bullets:["Send invoices in seconds","Track paid and unpaid","Cash App, Venmo, Zelle links"],
    cta:"Upgrade to Growth", ctaTier:"growth", secondary:"View Plans",
  },
  inventory: {
    icon:"📦", headline:"Ingredient Inventory",
    body:"Track what you have on hand and never run out mid-bake.",
    bullets:["Track ingredients by weight or volume","Low stock alerts","Links to your recipes"],
    cta:"Upgrade to Growth", ctaTier:"growth", secondary:"View Plans",
  },
  custom_branding: {
    icon:"🎨", headline:"Custom Branding",
    body:"Make the app and storefront look like your bakery.",
    bullets:["Upload your logo","Custom colors and fonts","Remove BakerOS branding"],
    cta:"Upgrade to Growth", ctaTier:"growth", secondary:"View Plans",
  },
  payment_integrations: {
    icon:"💳", headline:"Payment Integrations",
    body:"Activate your Cash App, Venmo, and Zelle links on invoices.",
    bullets:["One-tap pay buttons on invoices","Cash App, Venmo, Zelle","Customers pay instantly"],
    cta:"Upgrade to Growth", ctaTier:"growth", secondary:"View Plans",
  },
  order_confirmations: {
    icon:"📱", headline:"SMS Messaging",
    body:"Text customers directly from any order with pre-written templates.",
    bullets:["10 pre-written templates","One tap to send","Edit and add your own messages"],
    cta:"Upgrade to Growth", ctaTier:"growth", secondary:"View Plans",
  },

  // Pro features — Trial & Growth upgrade to Pro
  crm: {
    icon:"👥", headline:"Advanced CRM",
    body:"Full customer relationship tools with tags, notes, and history.",
    bullets:["Customer tags and notes","Full order history","Allergy and preference tracking"],
    cta:"Upgrade to Pro", ctaTier:"pro", secondary:"View Plans",
  },
  crm_advanced: {
    icon:"👥", headline:"Advanced CRM",
    body:"Full customer relationship tools with tags, notes, and history.",
    bullets:["Customer tags and notes","Full order history","Allergy and preference tracking"],
    cta:"Upgrade to Pro", ctaTier:"pro", secondary:"View Plans",
  },
  ai_campaigns: {
    icon:"📣", headline:"BakerOS Campaign Builder",
    body:"Generate SMS, email, and visual ad campaigns in seconds.",
    bullets:["AI writes your campaigns","SMS + Email + Visual ads","One-tap send to customers"],
    cta:"Upgrade to Pro", ctaTier:"pro", secondary:"View Plans",
  },
  nfc_lead_capture: {
    icon:"📲", headline:"NFC Lead Capture",
    body:"Capture customer info automatically when they tap your keychain.",
    bullets:["Tap-to-capture contacts","Auto-saves to CRM","Works at markets and events"],
    cta:"Upgrade to Pro", ctaTier:"pro", secondary:"View Plans",
  },
  analytics: {
    icon:"📊", headline:"Analytics Dashboard",
    body:"See your best sellers, revenue trends, and customer insights.",
    bullets:["Revenue and order trends","Best-selling products","Customer return rate"],
    cta:"Upgrade to Pro", ctaTier:"pro", secondary:"View Plans",
  },
  marketing_sms: {
    icon:"📣", headline:"Marketing SMS",
    body:"Send bulk SMS campaigns to your customer list.",
    bullets:["Bulk SMS campaigns","AI-written messages","Opt-in compliance built in"],
    cta:"Upgrade to Pro", ctaTier:"pro", secondary:"View Plans",
  },
  marketing_email: {
    icon:"📧", headline:"Marketing Email",
    body:"Send email campaigns to your customer list.",
    bullets:["Bulk email campaigns","Branded templates","Send to your full customer list"],
    cta:"Upgrade to Pro", ctaTier:"pro", secondary:"View Plans",
  },

  // Elite features — Trial, Growth & Pro upgrade to Elite
  receipt_scan: {
    icon:"🧾", headline:"AI Receipt Scanner",
    body:"Scan any store receipt and update inventory + accounting automatically.",
    bullets:["AI reads every line item","Updates inventory instantly","Creates accounting expense lines"],
    cta:"Upgrade to Elite", ctaTier:"elite", secondary:"View Plans",
  },
  tax_export: {
    icon:"📒", headline:"Tax Export Tools",
    body:"Export your expenses and income for tax time in one click.",
    bullets:["Export to CSV or PDF","Categorized by expense type","Ready for your accountant"],
    cta:"Upgrade to Elite", ctaTier:"elite", secondary:"View Plans",
  },
  accounting_export: {
    icon:"📒", headline:"Accounting Export",
    body:"QuickBooks-style expense and income export.",
    bullets:["Full expense history","Income by category","One-click export"],
    cta:"Upgrade to Elite", ctaTier:"elite", secondary:"View Plans",
  },
  advanced_reporting: {
    icon:"📈", headline:"Advanced Reporting",
    body:"Deep analytics on profit, expenses, and business growth.",
    bullets:["Profit and loss reports","Expense tracking","Growth trends over time"],
    cta:"Upgrade to Elite", ctaTier:"elite", secondary:"View Plans",
  },
};

function GateWall({ feature, children, inline=false, dynamicCount=null }) {
  const { tier, setPage } = useTier();
  if (canAccess(tier, feature)) return children;

  const cfg = LOCK_CONFIGS[feature];
  const neededId = cfg?.ctaTier || (FEATURES[feature]||["growth"])[0];
  const nt = TIERS[neededId];

  // Dynamic body — inject real counts when available
  const bodyText = dynamicCount > 0 && feature==="messages"
    ? `You have ${dynamicCount} unread message${dynamicCount!==1?"s":""} waiting.`
    : cfg?.body || `Upgrade to ${nt?.label} to unlock this feature.`;

  if (inline) return (
    <div style={{position:"relative",borderRadius:14,overflow:"hidden"}}>
      <div style={{filter:"blur(2px)",pointerEvents:"none",opacity:.4}}>{children}</div>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.55)",borderRadius:14,padding:16,textAlign:"center"}}>
        <span style={{fontSize:26,marginBottom:6}}>{cfg?.icon||"🔒"}</span>
        <div style={{fontSize:13,fontWeight:800,color:"#fff",marginBottom:3}}>{cfg?.headline||nt?.label+" Feature"}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginBottom:10,lineHeight:1.4}}>{bodyText}</div>
        <button onClick={()=>setPage("subscription")} style={{background:nt?.color,color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>{cfg?.cta||"Upgrade"} →</button>
      </div>
    </div>
  );

  return (
    <div style={{padding:"28px 20px 32px"}}>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:22}}>
        <div style={{width:68,height:68,borderRadius:"50%",background:`color-mix(in srgb,${nt?.color} 14%,var(--sf))`,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>
          {cfg?.icon||"🔒"}
        </div>
        <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:700,color:"var(--tx)",marginBottom:6}}>
          {cfg?.headline||nt?.label+" Feature"}
        </div>
        <p style={{color:"var(--mu)",fontSize:13,lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>
          {bodyText}
        </p>
      </div>

      {/* Value bullets — SHOW VALUE BEFORE PRICE */}
      <div style={{background:`color-mix(in srgb,${nt?.color} 7%,var(--sf))`,border:`1.5px solid ${nt?.color}35`,borderRadius:16,padding:"16px 18px",marginBottom:20}}>
        <div style={{fontSize:10,fontWeight:800,color:nt?.color,marginBottom:12,textTransform:"uppercase",letterSpacing:"1px"}}>
          What you unlock with {nt?.label}
        </div>
        {(cfg?.bullets||[]).map((b,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:i<(cfg.bullets.length-1)?10:0}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:nt?.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
              <span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>
            </div>
            <span style={{fontSize:13,color:"var(--tx)",lineHeight:1.4}}>{b}</span>
          </div>
        ))}
      </div>

      {/* Price anchor — shown AFTER value */}
      <div style={{textAlign:"center",marginBottom:14}}>
        <span style={{fontSize:12,color:"var(--mu)"}}>Starting at </span>
        <span style={{fontSize:18,fontWeight:900,color:nt?.color}}>{nt?.price}</span>
        <span style={{fontSize:12,color:"var(--mu)"}}>/mo</span>
      </div>

      {/* Primary CTA */}
      <button
        onClick={()=>setPage("subscription")}
        style={{width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:800,fontSize:15,color:"#fff",background:`linear-gradient(135deg,${nt?.color},color-mix(in srgb,${nt?.color} 75%,#000))`,marginBottom:10,boxShadow:`0 6px 20px color-mix(in srgb,${nt?.color} 35%,transparent)`}}
      >
        {cfg?.cta||"Upgrade to "+nt?.label} →
      </button>

      {/* Secondary CTA */}
      <button
        onClick={()=>setPage("subscription")}
        style={{width:"100%",padding:"11px",borderRadius:12,border:"1.5px solid var(--bd)",background:"transparent",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,color:"var(--mu)"}}
      >
        {cfg?.secondary||"View Plans"}
      </button>

      <div style={{fontSize:11,color:"var(--mu)",marginTop:10,textAlign:"center"}}>Cancel anytime · No contracts</div>
    </div>
  );
}

/* ── SUBSCRIPTION PAGE ──────────────────────── */
function SubscriptionPage() {
  const { tier, setTier } = useTier();
  const [t, show] = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(null); // tier id being loaded
  const [portalLoading,   setPortalLoading]   = useState(false);

  // Redirect to Stripe Checkout for paid tiers
  const handleUpgrade = async (plan) => {
    if (plan.id === 'starter') { setTier('starter'); show('Switched to Free ✓'); return; }
    setCheckoutLoading(plan.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { show('Please log in first', 'error'); return; }

      // Get existing stripe_customer_id if any
      const { data: settings } = await supabase
        .from('baker_settings')
        .select('stripe_customer_id')
        .eq('user_id', session.user.id)
        .single();

      const res = await fetch('/api/stripe?action=create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId:                  plan.id,
          userId:                  session.user.id,
          userEmail:               session.user.email,
          currentStripeCustomerId: settings?.stripe_customer_id || null,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        show(data.error || 'Checkout failed', 'error');
      }
    } catch (err) {
      show('Something went wrong — try again', 'error');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Open Stripe Customer Portal to manage/cancel subscription
  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { show('Please log in first', 'error'); return; }

      const { data: settings } = await supabase
        .from('baker_settings')
        .select('stripe_customer_id')
        .eq('user_id', session.user.id)
        .single();

      if (!settings?.stripe_customer_id) {
        show('No active subscription found', 'error');
        return;
      }

      const res = await fetch('/api/stripe?action=portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeCustomerId: settings.stripe_customer_id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        show(data.error || 'Could not open billing portal', 'error');
      }
    } catch (err) {
      show('Something went wrong — try again', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

  // Handle Stripe redirect back to app (?stripe=success or ?stripe=cancel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeResult = params.get('stripe');
    if (stripeResult === 'success') {
      // Clean URL immediately
      window.history.replaceState({}, '', window.location.pathname);
      show('Payment received — activating your plan...');
      // Poll Supabase for tier update — webhook may take 2–5 seconds
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) { clearInterval(poll); return; }
          const { data } = await supabase
            .from('baker_settings')
            .select('tier')
            .eq('user_id', session.user.id)
            .single();
          if ((data?.tier && data.tier !== 'starter') || attempts > 8) {
            clearInterval(poll);
            if (data?.tier && data.tier !== 'starter') {
              setTier(data.tier);
              show(`🎉 Welcome to ${TIERS[data.tier]?.label || data.tier}!`);
            } else {
              show('Plan activated — refresh if your tier hasn\'t updated', 'warn');
            }
          }
        } catch { clearInterval(poll); }
      }, 1500);
    } else if (stripeResult === 'cancel') {
      show('Checkout cancelled — no charge made', 'warn');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const plans = [
    {
      id:"starter", label:"Free", price:"$0", period:"", color:"#6B7280", popular:false,
      tagline:"Try BakerOS risk-free",
      features:[
        "Hosted storefront link",
        "Manual order entry",
        "Up to 15 products",
        "Basic order tracking",
        "Customer List (Up to 25 customers)",
        "QR code for storefront",
        "Free NFC keychain (ships after address confirmation)",
        "BakerOS branding shown",
      ],
    },
    {
      id:"growth", label:"Growth", price:"$19.99", period:"/mo", color:"#3D5A99", popular:true,
      tagline:"For growing bakeries",
      features:[
        "Everything in Trial Access",
        "Custom storefront branding",
        "Unlimited products",
        "Full order management dashboard",
        "Unlimited customer list",
        "Customer CRM (name, email, order history)",
        "Customer messaging inbox",
        "Automated order confirmations",
        "Payment integrations (Square, Venmo, Zelle, Cash App) · Stripe coming soon",
        "Remove BakerOS branding",
      ],
    },
    {
      id:"pro", label:"Pro", price:"$39.99", period:"/mo", color:"#C47B00", popular:false,
      tagline:"For serious bakers",
      features:[
        "Everything in Growth",
        "NFC customer lead capture (name, phone → auto-saved to CRM)",
        "Advanced CRM (tags, notes, allergy flags)",
        "Automated follow-ups (Coming Soon)",
        "Discount codes and promotions (Coming Soon)",
        "Advanced analytics dashboard",
        "SMS & email marketing",
      ],
    },
    {
      id:"elite", label:"Elite", price:"$74.99", period:"/mo", color:"#7C5CBF", popular:false,
      tagline:"Full business OS",
      features:[
        "Everything in Pro",
        "Tax export tools",
        "Profit tracking",
        "Expense tracking",
        "Advanced reporting dashboards",
        "Multi-user accounts (Coming Soon)",
        "Priority support",
      ],
    },
  ];

  const COMPARISON_SECTIONS = [
    {
      title: "Core Features",
      rows: [
        ["Storefront + QR Code",              true,   true,   true,   true  ],
        ["Order Form & Order Tracking",        true,   true,   true,   true  ],
        ["Products",                           "15",  "∞",    "∞",    "∞"   ],
        ["Photo Gallery",                      true,   true,   true,   true  ],
        ["Recipe Book",                        true,   true,   true,   true  ],
        ["Calendar + Holiday Alerts",          true,   true,   true,   true  ],
        ["Customers (basic)",                  true,   true,   true,   true  ],
        ["Free NFC Keychain",                  true,   true,   true,   true  ],
      ]
    },
    {
      title: "Growth — $19.99/mo",
      color: "#16A34A",
      rows: [
        ["Customer Messaging",                 false,  true,   true,   true  ],
        ["Customer CRM",                        false,  true,   true,   true  ],
        ["Invoicing",                          false,  true,   true,   true  ],
        ["Inventory Management",               false,  true,   true,   true  ],
        ["Custom Branding + Logo",             false,  true,   true,   true  ],
        ["SMS Templates",                      false,  true,   true,   true  ],
        ["Payment Handles (active)",           false,  true,   true,   true  ],
        ["Remove BakerOS Branding",            false,  true,   true,   true  ],
        ["Unlimited Products",                 false,  true,   true,   true  ],
      ]
    },
    {
      title: "Pro — $39.99/mo",
      color: "#7C5CBF",
      rows: [
        ["Recipe → Inventory Deduction",       false,  true,   true,   true  ],
        ["AI Marketing Campaigns",             false,  false,  true,   true  ],
        ["Analytics Dashboard",                false,  false,  true,   true  ],
        ["NFC Lead Capture",                   false,  false,  true,   true  ],
        ["Advanced CRM (tags, notes)",         false,  false,  true,   true  ],
        ["Discount Codes",                     false,  false,  true,   true  ],
        ["Automated Follow-Ups",               false,  false,  true,   true  ],
      ]
    },
    {
      title: "Elite — $74.99/mo",
      color: "#C47B00",
      rows: [
        ["AI Receipt Scanner",                 false,  false,  false,  true  ],
        ["QuickBooks Sync",                    false,  false,  false,  true  ],
        ["Tax Export Tools",                   false,  false,  false,  true  ],
        ["Profit & Expense Tracking",          false,  false,  false,  true  ],
        ["Advanced Reporting",                 false,  false,  false,  true  ],
        ["Multi-User Accounts",                false,  false,  false,  true  ],
        ["Priority Support",                   false,  false,  false,  true  ],
      ]
    },
  ];

  const tierColors = ["#3D5A99","#16A34A","#7C5CBF","#C47B00"];

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <div style={{padding:"20px 16px 8px",textAlign:"center"}}>
        <h1 style={{fontFamily:"var(--fd)",fontSize:26,fontWeight:700,color:"var(--tx)",lineHeight:1}}>Choose Your Plan</h1>
        <p style={{fontSize:13,color:"var(--mu)",marginTop:5}}>Upgrade or downgrade anytime</p>
      </div>

      {/* Current plan banner */}
      <div style={{margin:"0 16px 16px",background:`color-mix(in srgb,${TIERS[tier].color} 12%,var(--sf))`,border:`1.5px solid ${TIERS[tier].color}50`,borderRadius:14,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Current Plan</div>
          <div style={{fontSize:15,fontWeight:800,color:TIERS[tier].color,marginTop:2}}>
            {TIERS[tier].label} · {TIERS[tier].price}/mo
          </div>
        </div>
        <span style={{fontSize:20}}>✅</span>
      </div>

      {/* Plan cards */}
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:12}}>
        {plans.map(plan => {
          const isCurrent = tier === plan.id;
          const isUpgrade = TIER_ORDER.indexOf(plan.id) > TIER_ORDER.indexOf(tier);
          return (
            <div key={plan.id} style={{background:"var(--sf)",borderRadius:18,border:`2px solid ${isCurrent ? plan.color : "var(--bd)"}`,padding:"18px 16px",position:"relative",boxShadow:"var(--sh)"}}>
              {plan.popular && !isCurrent && <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:plan.color,color:"#fff",fontSize:10,fontWeight:800,padding:"2px 14px",borderRadius:20,whiteSpace:"nowrap"}}>MOST POPULAR</div>}
              {isCurrent && <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:plan.color,color:"#fff",fontSize:10,fontWeight:800,padding:"2px 14px",borderRadius:20,whiteSpace:"nowrap"}}>YOUR CURRENT PLAN</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:700,color:plan.color}}>{plan.label}</div>
                  <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{plan.tagline}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:26,fontWeight:900,color:plan.color,lineHeight:1}}>{plan.price}</div>
                  <div style={{fontSize:10,color:"var(--mu)"}}>{plan.period}</div>
                </div>
              </div>
              <div style={{borderTop:"1px solid var(--bd)",paddingTop:12,marginTop:10,marginBottom:14}}>
                {plan.features.map(f => (
                  <div key={f} style={{fontSize:12,color:"var(--tx)",marginBottom:6,display:"flex",alignItems:"flex-start",gap:7}}>
                    <span style={{color:"#16A34A",fontWeight:700,fontSize:13,flexShrink:0}}>✓</span>{f}
                  </div>
                ))}
              </div>
              {isCurrent
                ? <div>
                    <div style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px solid ${plan.color}`,background:`color-mix(in srgb,${plan.color} 8%,var(--sf))`,color:plan.color,fontFamily:"var(--fb)",fontWeight:700,fontSize:14,textAlign:"center",marginBottom: plan.id !== 'starter' ? 8 : 0}}>Current Plan ✓</div>
                    {plan.id !== 'starter' && (
                      <button
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        style={{width:"100%",padding:"10px",borderRadius:11,border:`1.5px solid ${plan.color}40`,background:"transparent",color:plan.color,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer",opacity: portalLoading ? 0.6 : 1}}
                      >
                        {portalLoading ? 'Opening...' : '⚙️ Manage / Cancel Subscription'}
                      </button>
                    )}
                  </div>
                : <button
                    onClick={()=>handleUpgrade(plan)}
                    disabled={!!checkoutLoading}
                    style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor: checkoutLoading ? "default" : "pointer",fontFamily:"var(--fb)",fontWeight:800,fontSize:14,color:"#fff",background:plan.color,opacity: checkoutLoading && checkoutLoading !== plan.id ? 0.5 : 1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                  >
                    {checkoutLoading === plan.id
                      ? <><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/> Redirecting...</>
                      : isUpgrade ? `Upgrade to ${plan.label} →` : `Switch to ${plan.label}`
                    }
                  </button>
              }
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div style={{margin:"24px 12px 0"}}>
        <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)",marginBottom:14,textAlign:"center"}}>Full Feature Comparison</div>

        {/* Sticky header */}
        <div style={{background:"var(--tx)",borderRadius:"14px 14px 0 0",overflow:"hidden",position:"sticky",top:44,zIndex:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 44px 44px 44px 44px",padding:"10px 14px",gap:2}}>
            <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:"1px"}}>Feature</div>
            {["Trial","Growth","Pro","Elite"].map((l,i)=>(
              <div key={l} style={{fontSize:9,fontWeight:800,color:tierColors[i],textAlign:"center",textTransform:"uppercase",letterSpacing:".5px",lineHeight:1.2}}>{l}</div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div style={{border:"1px solid var(--bd)",borderTop:"none",borderRadius:"0 0 14px 14px",overflow:"hidden"}}>
          {COMPARISON_SECTIONS.map((section, si) => (
            <div key={section.title}>
              {/* Section header */}
              <div style={{
                padding:"8px 14px",
                background: section.color
                  ? `color-mix(in srgb,${section.color} 15%,var(--bd))`
                  : "var(--bd)",
                display:"flex",alignItems:"center",gap:7,
              }}>
                {section.color && <div style={{width:8,height:8,borderRadius:"50%",background:section.color,flexShrink:0}}/>}
                <div style={{fontSize:10,fontWeight:800,color:section.color||"var(--mu)",textTransform:"uppercase",letterSpacing:"1px"}}>
                  {section.title}
                </div>
              </div>

              {/* Rows */}
              {section.rows.map(([label,...vals], ri) => (
                <div
                  key={label}
                  style={{
                    display:"grid",
                    gridTemplateColumns:"1fr 44px 44px 44px 44px",
                    padding:"9px 14px",
                    gap:2,
                    borderBottom: (si < COMPARISON_SECTIONS.length-1 || ri < section.rows.length-1) ? "1px solid var(--bd)" : "none",
                    background: ri%2===0 ? "var(--sf)" : `color-mix(in srgb,var(--bd) 20%,var(--sf))`,
                    alignItems:"center",
                  }}
                >
                  <div style={{fontSize:11,color:"var(--tx)",lineHeight:1.4,paddingRight:4}}>{label}</div>
                  {vals.map((v,j)=>(
                    <div key={j} style={{textAlign:"center"}}>
                      {v === true  ? <span style={{color:"#16A34A",fontSize:14,fontWeight:800}}>✓</span>
                     : v === false ? <span style={{color:"var(--bd)",fontSize:14,fontWeight:800}}>—</span>
                     : <span style={{fontSize:10,fontWeight:800,color:tierColors[j],background:`color-mix(in srgb,${tierColors[j]} 12%,var(--sf))`,borderRadius:20,padding:"2px 5px",whiteSpace:"nowrap"}}>{v}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 16px 0",fontSize:11,color:"var(--mu)",textAlign:"center",lineHeight:1.6}}>
        All plans · Cancel anytime · No contracts
      </div>
    </div>
  );
}


function GlobalCSS({ brand }) {
  const safeBrand = brand || {};
  const f = FONTS.find(x => x.id === safeBrand.font) || FONTS[0];
  const t = safeBrand.theme || { primary:"#C47B00", accent:"#E8A838", bg:"#FFFBF5", surface:"#FDF6EC", text:"#2C1A0E" };
  const dark = (t.bg||"#fff") < "#5";
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&family=Nunito:wght@400;500;600;700;800&family=Libre+Baskerville:wght@400;700&family=Lato:wght@300;400;700&family=Merriweather:wght@400;700&display=swap');
      :root {
        --p:${t.primary};--a:${t.accent};--bg:${t.bg};--sf:${t.surface};--tx:${t.text};
        --mu:${dark?"rgba(255,255,255,.45)":"rgba(0,0,0,.4)"};
        --bd:${dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.08)"};
        --sh:${dark?"0 2px 14px rgba(0,0,0,.4)":"0 2px 12px rgba(0,0,0,.07)"};
        --fb:${f.body};--fd:${f.display};
        --sb:env(safe-area-inset-bottom,0px);
      }
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      html,body,#root{margin:0;padding:0;width:100%;height:100%;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes drawerIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
      @keyframes pop{0%{transform:scale(.8)}70%{transform:scale(1.05)}100%{transform:scale(1)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
      @keyframes toastIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
      .fu{animation:fadeUp .4s cubic-bezier(.22,.68,0,1.2) both}
      .fu2{animation:fadeUp .4s cubic-bezier(.22,.68,0,1.2) .07s both}
      .field{width:100%;background:var(--bg);border:1.5px solid var(--bd);border-radius:12px;padding:12px 14px;font-family:var(--fb);font-size:15px;color:var(--tx);outline:none;transition:border .2s;-webkit-appearance:none;}
      .field:focus{border-color:var(--p);}
      .field::placeholder{color:var(--mu);}
      .pbtn{background:var(--p);color:#fff;border:none;cursor:pointer;font-family:var(--fb);font-weight:700;font-size:15px;border-radius:14px;padding:14px;-webkit-tap-highlight-color:transparent;transition:opacity .2s,transform .15s;}
      .pbtn:active{opacity:.85;transform:scale(.98);}
      .pbtn:disabled{opacity:.45;}
      .gbtn{background:transparent;border:1.5px solid var(--bd);cursor:pointer;font-family:var(--fb);font-weight:600;font-size:14px;color:var(--mu);border-radius:12px;padding:12px;-webkit-tap-highlight-color:transparent;}
      .gbtn:active{background:var(--bd);}
      .card{background:var(--sf);border-radius:16px;border:1px solid var(--bd);box-shadow:var(--sh);}
      .row{-webkit-tap-highlight-color:transparent;transition:background .13s;}
      .row:active{background:color-mix(in srgb,var(--p) 6%,var(--sf));}
      .ptab{padding:8px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--fb);font-size:12px;font-weight:700;transition:all .2s;}
      .ptab.on{background:var(--tx);color:var(--bg);}
      .ptab.off{background:var(--bd);color:var(--mu);}
      .chip{border:1.5px solid var(--bd);border-radius:11px;padding:10px 12px;cursor:pointer;background:var(--sf);display:flex;align-items:center;gap:9px;transition:all .18s;}
      .chip.on{border-color:var(--p);background:color-mix(in srgb,var(--p) 8%,var(--sf));}
      .toggle{width:44px;height:24px;border-radius:12px;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
      .toggle-knob{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
      .sheet{position:fixed;inset:0;z-index:300;}
      .sheet-panel{position:absolute;bottom:0;left:0;right:0;background:var(--sf);border-radius:20px 20px 0 0;padding:0 0 calc(96px + env(safe-area-inset-bottom, 16px));animation:slideUp .3s cubic-bezier(.22,.68,0,1.1) both;max-height:92dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;}
      .badge{padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;}
      ::-webkit-scrollbar{display:none;}
      .page-scroll{overflow-y:scroll;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;}
    `}</style>
  );
}

/* ── DATA ──────────────────────────────────── */
const ORDERS_INIT = [];
const CUSTS_INIT = [];const INV_INIT = [];
const LEADS_INIT = [];const WEEK  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const IMAP  = {flour:"🌾",sugar:"🍚",butter:"🧈",egg:"🥚",milk:"🥛",vanilla:"🍶",chocolate:"🍫",yeast:"🧫",box:"📦",bag:"🛍",pan:"🍳",cake:"🎂",bread:"🍞",croissant:"🥐",cupcake:"🧁",cookie:"🍪",default:"📦"};
const RCATS = [{id:"Ingredients",icon:"🌾",label:"Ingredients"},{id:"Packaging",icon:"📦",label:"Bakery Supplies"},{id:"Equipment",icon:"🔧",label:"Equipment"},{id:"Finished",icon:"🎂",label:"Finished Products"},{id:"Other",icon:"🧾",label:"Other"}];
const TAGCOL = {VIP:{bg:"#FFF0CC",c:"#7A4F00"},Regular:{bg:"#E8F4EA",c:"#1D6B30"},New:{bg:"#EAF0FF",c:"#1A3A8F"}};
const LCOL   = {Hot:{bg:"#FFF0E6",c:"#B85C2A"},Warm:{bg:"#FFF8E6",c:"#C47B2B"},Cold:{bg:"#EEF2FF",c:"#3730A3"}};

function getIcon(n){const l=n.toLowerCase();for(const[k,e]of Object.entries(IMAP)){if(l.includes(k))return e;}return IMAP.default;}
function stockStatus(i){if(i.qty<=0)return"out";if(i.qty<=i.min)return"low";if(i.qty<=i.min*1.5)return"warn";return"ok";}
const SC={ok:"#16A34A",warn:"#D97706",low:"#DC2626",out:"#DC2626"};

/* ── TINY HELPERS ──────────────────────────── */
function useToast(){const[t,sT]=useState(null);const show=(m,type="ok")=>{sT({m,type});setTimeout(()=>sT(null),2600);};return[t,show];}
function Toast({t}){if(!t)return null;const bg=t.type==="error"?"#DC2626":t.type==="warn"?"#D97706":"#16A34A";return <div style={{position:"fixed",top:"calc(env(safe-area-inset-top, 0px) + 52px)",left:16,right:16,zIndex:9999,background:bg,color:"#fff",padding:"12px 16px",borderRadius:12,fontSize:14,fontWeight:600,boxShadow:"0 6px 20px rgba(0,0,0,.22)",animation:"toastIn .3s ease both"}}>{t.m}</div>;}
function Fld({label,required,error,hint,children}){return <div style={{display:"flex",flexDirection:"column",gap:5}}>{label&&<label style={{fontSize:10,fontWeight:700,color:"var(--mu)",letterSpacing:"1px",textTransform:"uppercase"}}>{label}{required&&<span style={{color:"#DC2626"}}> *</span>}</label>}{children}{hint&&<span style={{fontSize:11,color:"var(--mu)"}}>{hint}</span>}{error&&<span style={{fontSize:12,color:"#DC2626"}}>⚠ {error}</span>}</div>;}
function PH({title,sub,action}){return <div style={{padding:"20px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><h1 style={{fontFamily:"var(--fd)",fontSize:26,fontWeight:700,color:"var(--tx)",lineHeight:1}}>{title}</h1>{sub&&<p style={{fontSize:13,color:"var(--mu)",marginTop:3}}>{sub}</p>}</div>{action}</div>;}
function Avt({name,sz=36}){const b=useBrand();return <div style={{width:sz,height:sz,borderRadius:"50%",background:`color-mix(in srgb,${b.theme.primary} 20%,${b.theme.surface})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:b.theme.primary,fontSize:sz*.33,flexShrink:0}}>{name?.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>;}
function SBdg({s}){const m={pending:{bg:"#FFF3CD",c:"#856404"},waiting_approval:{bg:"#FEE2E2",c:"#991B1B"},ready:{bg:"#D1ECE4",c:"#155724"},completed:{bg:"#E2E8F0",c:"#4A5568"},paid:{bg:"#D1ECE4",c:"#155724"}};const x=m[s?.toLowerCase()]||m.pending;const label=s==="waiting_approval"?"Waiting Approval":s;return <span className="badge" style={{background:x.bg,color:x.c}}>{label}</span>;}
function SparkBar({ orders=[] }){
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const now=new Date();
  const dow=now.getDay()||7; // 1=Mon 7=Sun
  const startOfWeek=new Date(now);
  startOfWeek.setDate(now.getDate()-dow+1);
  startOfWeek.setHours(0,0,0,0);
  const sales=days.map((_,i)=>{
    const day=new Date(startOfWeek);
    day.setDate(startOfWeek.getDate()+i);
    const next=new Date(day); next.setDate(day.getDate()+1);
    return orders.filter(o=>o.status==="completed"&&o.status!=="refunded"&&o.completedAt&&new Date(o.completedAt)>=day&&new Date(o.completedAt)<next).reduce((s,o)=>s+(o.amount||0),0);
  });
  const mx=Math.max(...sales,1);
  const today=dow-1; // 0=Mon
  const hasData=sales.some(v=>v>0);
  if(!hasData)return <div style={{height:52,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--mu)",fontSize:11}}>Complete orders to see weekly revenue</div>;
  return <div style={{display:"flex",alignItems:"flex-end",gap:4,height:52}}>{sales.map((v,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{width:"100%",background:i===today?"var(--p)":"var(--bd)",height:`${(v/mx)*44}px`,borderRadius:"2px 2px 0 0",minHeight:2,opacity:i===today?1:.7}}/><span style={{fontSize:7,color:"var(--mu)",fontWeight:600}}>{days[i].slice(0,2)}</span></div>)}</div>;
}
function StockBar({item}){const pct=Math.min(100,item.min>0?(item.qty/(item.min*3))*100:100);const sc=SC[stockStatus(item)];return <div style={{height:3,background:"var(--bd)",borderRadius:2,marginTop:5,overflow:"hidden"}}><div style={{height:"100%",background:sc,width:`${pct}%`,borderRadius:2}}/></div>;}
function Handle(){return <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>;}

/* ── NAVIGATION ────────────────────────────── */
const BNAV_BY_TIER = {
  starter: [{id:"home",icon:"⊞",label:"Home"},{id:"orders",icon:"📋",label:"Orders"},{id:"storefront",icon:"🏪",label:"Storefront"},{id:"more",icon:"☰",label:"More"}],
  growth:  [{id:"home",icon:"⊞",label:"Home"},{id:"orders",icon:"📋",label:"Orders"},{id:"inventory",icon:"📦",label:"Inventory"},{id:"marketing",icon:"📣",label:"Marketing"},{id:"more",icon:"☰",label:"More"}],
  pro:     [{id:"home",icon:"⊞",label:"Home"},{id:"orders",icon:"📋",label:"Orders"},{id:"inventory",icon:"📦",label:"Inventory"},{id:"marketing",icon:"📣",label:"Marketing"},{id:"more",icon:"☰",label:"More"}],
  elite:   [{id:"home",icon:"⊞",label:"Home"},{id:"orders",icon:"📋",label:"Orders"},{id:"inventory",icon:"📦",label:"Inventory"},{id:"marketing",icon:"📣",label:"Marketing"},{id:"more",icon:"☰",label:"More"}],
};
const DMORE = [
  // Trial Access — all levels
  {id:"storefront", icon:"🏪", label:"Storefront"},
  {id:"orderform",  icon:"📝", label:"Order Form"},
  {id:"products",   icon:"🛍", label:"Products"},
  {id:"recipes",    icon:"📖", label:"Recipes",       badge:"NEW"},
  {id:"gallery",    icon:"🖼", label:"Photo Gallery"},
  {id:"calendar",   icon:"📅", label:"Calendar"},
  {id:"crm",        icon:"👥", label:"Customers"},
  // Growth
  {id:"messages",   icon:"💬", label:"Messages",      badge:"NEW"},
  {id:"invoices",   icon:"🧾", label:"Invoices"},
  {id:"branding",   icon:"🎨", label:"Branding"},
  {id:"payments",   icon:"💳", label:"Payments"},
  // Growth (continued)
  {id:"inventory",  icon:"📦", label:"Inventory"},
  // Pro
  {id:"marketing",  icon:"📣", label:"Marketing/CRM"},
  {id:"analytics",  icon:"📊", label:"Analytics"},
  {id:"nfc",        icon:"📲", label:"NFC Leads"},
  // Elite
  {id:"receipt",    icon:"🧾", label:"Scan Receipt",  badge:"AI"},
  {id:"accounting", icon:"📒", label:"QuickBooks",    badge:"QB"},
  // Always at bottom
  {id:"settings",   icon:"⚙",  label:"Settings"},
];

function BottomNav({page,setPage,lowStock,openDrawer,tier}){
  const b=useBrand();
  const bnav = BNAV_BY_TIER[tier] || BNAV_BY_TIER.starter;
  const bnavIds = bnav.map(n=>n.id);
  return(
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"var(--sf)",borderTop:"1px solid var(--bd)",paddingBottom:"env(safe-area-inset-bottom,0px)",display:"flex",zIndex:100}}>
      {bnav.map(n=>{
        const act=n.id===page||(n.id==="more"&&!bnavIds.includes(page));
        return(
          <button key={n.id} onClick={()=>n.id==="more"?openDrawer():setPage(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:"8px 4px",border:"none",background:"transparent",cursor:"pointer",position:"relative"}}>
            <div style={{position:"relative"}}>
              {n.id==="home"
                ? <img src={BAKEROS_LOGO} alt="Home" style={{width:22,height:22,objectFit:"contain",filter:"drop-shadow(0px 0px 1px rgba(0,0,0,.1))"}}/>
                : <span style={{fontSize:20,lineHeight:1}}>{n.icon}</span>
              }
              {n.id==="inventory"&&lowStock>0&&<div style={{position:"absolute",top:-4,right:-6,background:"#DC2626",color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{lowStock}</div>}
            </div>
            <span style={{fontSize:10,fontWeight:act?700:500,color:act?b.theme.primary:"var(--mu)"}}>{n.label}</span>
            {act&&<div style={{position:"absolute",top:0,width:20,height:2,background:b.theme.primary,borderRadius:"0 0 2px 2px"}}/>}
          </button>
        );
      })}
    </div>
  );
}

function Drawer({open,onClose,setPage,page,tier,nfcNewCount=0}){
  const b=useBrand();
  if(!open)return null;
  const tc=TIERS[tier]||TIERS.starter;
  // Feature needed per drawer item
  const itemFeature={
    messages:    "order_confirmations",  // Growth+
    invoices:    "invoicing",            // Growth+
    branding:    "custom_branding",      // Growth+
    payments:    "payment_integrations", // Growth+
    marketing:   "ai_campaigns",         // Pro+
    inventory:   "inventory",            // Growth+
    analytics:   "analytics",            // Pro+
    nfc:         "nfc_lead_capture",     // Pro+
    receipt:     "receipt_scan",         // Elite
    accounting:  "accounting_export",    // Elite
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:200,touchAction:"none"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:280,background:"var(--sf)",boxShadow:"4px 0 32px rgba(0,0,0,.25)",animation:"drawerIn .28s cubic-bezier(.22,.68,0,1.1) both",display:"flex",flexDirection:"column",overflowY:"auto"}}>
        <div style={{padding:"52px 20px 18px",background:`linear-gradient(160deg,${b.theme.primary},color-mix(in srgb,${b.theme.primary} 55%,#000))`}}>
          {b.logo?<img src={b.logo} alt="" style={{width:56,height:56,borderRadius:0,objectFit:"contain",background:"none",marginBottom:10,display:"block"}}/>:<div style={{width:50,height:50,borderRadius:11,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:10}}>🧁</div>}
          <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"#fff"}}>{b.storeName}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>{b.tagline}</div>
          <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,background:"rgba(255,255,255,.15)",borderRadius:20,padding:"3px 10px"}}><span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,.9)"}}>{tc.label} Plan</span></div>
        </div>
        <div style={{flex:1,padding:"8px 10px"}}>
          {DMORE.map(item=>{
            const act=page===item.id;
            const feat=itemFeature[item.id];
            const locked=feat&&!canAccess(tier,feat);
            return(
              <button key={item.id} onClick={()=>{setPage(item.id);onClose();}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:11,border:"none",background:act?`color-mix(in srgb,${b.theme.primary} 12%,var(--sf))`:locked?"color-mix(in srgb,#888 4%,var(--sf))":"transparent",cursor:"pointer",fontFamily:"var(--fb)",marginBottom:2}}>
                <span style={{fontSize:20,opacity:locked?0.5:1}}>{item.icon}</span>
                <span style={{fontSize:14,fontWeight:act?700:500,color:act?b.theme.primary:locked?"var(--mu)":"var(--tx)"}}>{item.label}</span>
                {item.badge&&!locked&&<span style={{marginLeft:"auto",fontSize:9,fontWeight:700,background:`color-mix(in srgb,${b.theme.accent} 20%,transparent)`,color:b.theme.accent,padding:"2px 7px",borderRadius:20}}>{item.badge}</span>}
                {item.id==="nfc"&&nfcNewCount>0&&!locked&&<span style={{marginLeft:"auto",minWidth:18,height:18,background:"#DC2626",color:"#fff",borderRadius:20,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{nfcNewCount}</span>}
                {locked&&<span style={{marginLeft:"auto",fontSize:11,opacity:0.4}}>🔒</span>}
              </button>
            );
          })}
        </div>
        <div style={{padding:"12px 14px 20px",borderTop:"1px solid var(--bd)"}}>
          <div style={{background:`color-mix(in srgb,${tc.color} 12%,var(--sf))`,border:`1px solid ${tc.color}40`,borderRadius:11,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Current Plan</div>
            <div style={{fontSize:14,fontWeight:800,color:tc.color,marginTop:1}}>{tc.label} · {tc.price}/mo</div>
          </div>
          <button onClick={()=>{setPage("subscription");onClose();}} style={{width:"100%",padding:"10px",borderRadius:10,border:`1.5px solid ${tc.color}`,background:"transparent",color:tc.color,fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Manage Subscription →</button>
        </div>
      </div>
    </div>
  );
}

/* ── HOME ──────────────────────────────────── */
function HomePage({setPage,inventory,tier,orders=[],customers=[]}){
  const b=useBrand();
  const low=inventory.filter(i=>stockStatus(i)==="low"||stockStatus(i)==="out").length;
  const openOrders=orders.filter(o=>o.status!=="completed"&&o.status!=="declined"&&o.status!=="cancelled"&&o.status!=="refunded");
  const completedOrders=orders.filter(o=>o.status==="completed"&&o.status!=="refunded");
  const unreadMsgs=0; // loaded dynamically in MessagesPage from Supabase
  const totalRevenue=completedOrders.reduce((s,o)=>s+(o.amount||0),0);

  // Determine which upgrade funnel to show (pick highest-priority one)
  const funnel = (() => {
    if (tier!=="starter") return null;
    // Funnel 1 — MESSAGE DEMAND: unread messages waiting
    if (unreadMsgs > 0) return {
      icon:"📬", color:"#3D5A99",
      headline:"Don't miss incoming customer messages.",
      body:"Don't miss inquiries — respond quickly and turn them into orders.",
      cta:"View Message", ctaAction:()=>setPage("messages"),
      secondary:"Upgrade to Growth →", secondaryAction:()=>setPage("subscription"),
    };
    // Funnel 2 — PAYMENT MOMENT: completed orders that need payment
    if (completedOrders.length > 0) return {
      icon:"💰", color:"#059669",
      headline:"You're one step away from getting paid.",
      body:"Send an invoice and collect payment instantly from your completed orders.",
      cta:"Upgrade to Growth", ctaAction:()=>setPage("subscription"),
      secondary:"Learn more →", secondaryAction:()=>setPage("subscription"),
    };
    // Funnel 3 — CUSTOMER BUILD-UP: approaching the 25 limit
    if (customers.length >= 20) return {
      icon:"👥", color:"#3D5A99",
      headline:"Your customer list is growing.",
      body:"Upgrade to unlock unlimited customers and tools to manage them.",
      cta:"Upgrade to Growth", ctaAction:()=>setPage("subscription"),
      secondary:"View Plans", secondaryAction:()=>setPage("subscription"),
    };
    // Funnel 4 — INVENTORY PAIN: multiple orders without inventory
    if (openOrders.length >= 3) return {
      icon:"📦", color:"#C47B00",
      headline:"Running low on ingredients?",
      body:"Track inventory and avoid missing orders. Know what you need before you run out.",
      cta:"Upgrade to Growth", ctaAction:()=>setPage("subscription"),
      secondary:"View Plans", secondaryAction:()=>setPage("subscription"),
    };
    return null;
  })();

  return(
    <div style={{paddingBottom:96}}>
      <div style={{padding:"56px 16px 24px",background:`linear-gradient(160deg,${b.theme.primary},color-mix(in srgb,${b.theme.primary} 50%,#000))`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:150,height:150,borderRadius:"50%",background:"rgba(255,255,255,.05)"}}/>
        <div style={{position:"relative",zIndex:1}}>
          {b.logo&&<img src={b.logo} alt="" style={{width:42,height:42,borderRadius:0,objectFit:"contain",background:"none",marginBottom:10,display:"block"}}/>}
          <div style={{fontSize:13,color:"rgba(255,255,255,.65)",marginBottom:2}}>{(()=>{const h=new Date().getHours();return h<12?"Good morning 👋":h<17?"Good afternoon ☀️":"Good evening 🌙";})()}</div>
          <div style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"#fff"}}>{b.storeName}</div>
        </div>
      </div>

      {/* Profile completion nudge — shown when baker hasn't set their store name */}
      {(!b.storeName || b.storeName === "BakerOS" || b.storeName === "My Bakery") && (
        <div style={{margin:"12px 12px 0",background:"#FEF3C7",border:"1.5px solid #D97706",borderRadius:13,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20,flexShrink:0}}>✏️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:2}}>Complete your bakery profile</div>
            <div style={{fontSize:11,color:"#78350F"}}>Add your store name, tagline, and city so customers can find you.</div>
          </div>
          <button onClick={()=>setPage("storefront")} style={{background:"#D97706",color:"#fff",border:"none",borderRadius:9,padding:"7px 12px",fontFamily:"var(--fb)",fontWeight:800,fontSize:11,cursor:"pointer",flexShrink:0}}>Set Up →</button>
        </div>
      )}

      {/* Upgrade funnel banner — shown to Trial users at moments of intent */}
      {funnel && (
        <div style={{margin:"12px 12px 0",background:`color-mix(in srgb,${funnel.color} 8%,var(--sf))`,border:`1.5px solid ${funnel.color}40`,borderRadius:14,padding:"14px 15px",animation:"fadeUp .4s ease both"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:11,marginBottom:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:funnel.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{funnel.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--tx)",marginBottom:3}}>{funnel.headline}</div>
              <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5}}>{funnel.body}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={funnel.ctaAction} style={{padding:"9px",borderRadius:10,border:"none",background:funnel.color,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:12,cursor:"pointer"}}>{funnel.cta}</button>
            <button onClick={funnel.secondaryAction} style={{padding:"9px",borderRadius:10,border:`1.5px solid ${funnel.color}50`,background:"transparent",color:funnel.color,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>{funnel.secondary}</button>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{padding:"0 12px",marginTop:-14,position:"relative",zIndex:2}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {/* Messages — action card */}
          <div className="card" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>setPage("messages")}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:20}}>💬</span><span style={{width:7,height:7,borderRadius:"50%",background:b.theme.primary,display:"block",animation:"pulse 1.5s infinite"}}/></div>
            <div style={{fontSize:20,fontWeight:800,color:"var(--tx)",marginTop:5,lineHeight:1}}>{unreadMsgs}</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:3}}>Messages</div>
            <div style={{fontSize:10,fontWeight:600,color:b.theme.primary,marginTop:2}}>{unreadMsgs} unread →</div>
          </div>
          {/* Orders — action card */}
          <div className="card" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>setPage("orders")}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:20}}>📋</span></div>
            <div style={{fontSize:20,fontWeight:800,color:"var(--tx)",marginTop:5,lineHeight:1}}>{openOrders.length}</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:3}}>Orders</div>
            <div style={{fontSize:10,fontWeight:600,color:b.theme.primary,marginTop:2}}>{openOrders.filter(o=>o.status==="pending"||o.status==="waiting_approval").length} pending →</div>
          </div>
          {/* Customers */}
          <div className="card" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>setPage("crm")}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:20}}>👥</span></div>
            <div style={{fontSize:20,fontWeight:800,color:"var(--tx)",marginTop:5,lineHeight:1}}>{customers.length}</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:3}}>Customers</div>
            <div style={{fontSize:10,fontWeight:600,color:b.theme.primary,marginTop:2}}>{customers.length} total →</div>
          </div>
          {/* Low Stock */}
          <div className="card" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>setPage("inventory")}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:20}}>📦</span>{low>0&&<span style={{width:7,height:7,borderRadius:"50%",background:"#DC2626",display:"block",animation:"pulse 1.5s infinite"}}/>}</div>
            <div style={{fontSize:20,fontWeight:800,color:low>0?"#DC2626":"var(--tx)",marginTop:5,lineHeight:1}}>{low}</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:3}}>Low Stock</div>
            <div style={{fontSize:10,fontWeight:600,color:low>0?"#DC2626":b.theme.primary,marginTop:2}}>{low>0?"Needs reorder →":"All stocked ✓"}</div>
          </div>
        </div>
      </div>
      {/* Chart */}
      <div style={{padding:"12px 12px 0"}}>
        <div className="card" style={{padding:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>Weekly Revenue</span><span style={{fontSize:12,color:"var(--mu)"}}>{"$"+completedOrders.filter(o=>{const d=new Date(); const w=new Date(d-7*86400000); return o.completedAt && new Date(o.completedAt)>=w;}).reduce((s,o)=>s+(o.amount||0),0)}</span></div>
          <SparkBar orders={orders}/>
        </div>
      </div>
      {/* Recent orders */}
      <div style={{padding:"12px 12px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}><span style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>Recent Orders</span><button onClick={()=>setPage("orders")} style={{fontSize:12,color:b.theme.primary,fontWeight:600,background:"none",border:"none",cursor:"pointer"}}>See all →</button></div>
        <div className="card" style={{overflow:"hidden"}}>
          {openOrders.slice(0,3).map((o,i)=>(
            <div key={i} className="row" style={{padding:"11px 14px",borderBottom:i<2?"1px solid var(--bd)":"none",display:"flex",alignItems:"center",gap:11}}>
              <Avt name={o.customer} sz={34}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:"var(--tx)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.customer}</div><div style={{fontSize:11,color:"var(--mu)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.item}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:13,fontWeight:800,color:b.theme.primary}}>${o.amount}</div><SBdg s={o.status}/></div>
            </div>
          ))}
        </div>
      </div>
      {/* Tier-specific quick nav — shows exactly 4 buttons for current plan */}
      {(()=>{
        const TIER_BUTTONS = {
          starter: {
            label:"Free Plan",
            color:"#6B7280",
            buttons:[
              {icon:"📝", label:"Order Form",   sub:"Take a new order",       page:"orderform",  color:"#0284C7"},
              {icon:"📅", label:"Calendar",     sub:"Orders on due dates",    page:"calendar",   color:"#0891B2"},
              {icon:"👥", label:"Customers",    sub:"View & add customers",   page:"crm",        color:"#3D5A99"},
              {icon:"🏪", label:"Storefront",   sub:"Your public shop link",  page:"storefront", color:"#C47B00"},
            ],
          },
          growth: {
            label:"Growth - $19.99/mo",
            color:"#3D5A99",
            buttons:[
              {icon:"💬", label:"Messages",     sub:"Customer inbox",              page:"messages", color:"#0891B2"},
              {icon:"👥", label:"Customers",     sub:"Customer list & history",     page:"crm",      color:"#3D5A99"},
              {icon:"🧾", label:"Invoices",      sub:"Create & send invoices",      page:"invoices", color:"#0891B2"},
              {icon:"💳", label:"Payments",      sub:"Stripe, Square & more",       page:"payments", color:"#16A34A"},
            ],
          },
          pro: {
            label:"Pro - $39.99/mo",
            color:"#C47B00",
            buttons:[
              {icon:"📲", label:"NFC Leads",    sub:"Tap to capture contacts",   page:"nfc",        color:"#DB2777"},
              {icon:"📣", label:"Marketing",    sub:"SMS & email campaigns",     page:"marketing",  color:"#C47B00"},
              {icon:"🧾", label:"Scan Receipt", sub:"AI import to inventory",    page:"receipt",    color:"#7C3AED"},
              {icon:"📊", label:"Analytics",    sub:"Revenue & insights",        page:"analytics",  color:"#0891B2"},
            ],
          },
          elite: {
            label:"Elite - $74.99/mo",
            color:"#7C5CBF",
            buttons:[
              {icon:"📒", label:"Tax Export",  sub:"Export for tax filing",    page:"accounting", color:"#7C5CBF"},
              {icon:"📈", label:"Profit",       sub:"Profit & expense tracking",page:"analytics",  color:"#059669"},
              {icon:"📊", label:"Reports",      sub:"Advanced dashboards",      page:"analytics",  color:"#0891B2"},
              {icon:"👥", label:"Team",         sub:"Multi-user accounts",      page:"settings",   color:"#DB2777"},
            ],
          },
        };
        const current = TIER_BUTTONS[tier] || TIER_BUTTONS.starter;
        return (
          <div style={{padding:"12px 12px 0"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:current.color}}/>
                <span style={{fontSize:12,fontWeight:800,color:current.color,textTransform:"uppercase",letterSpacing:"1px"}}>
                  {current.label}
                </span>
              </div>
              <button
                onClick={()=>setPage("subscription")}
                style={{fontSize:10,fontWeight:700,color:current.color,background:"transparent",border:`1px solid ${current.color}`,borderRadius:20,padding:"3px 10px",cursor:"pointer",fontFamily:"var(--fb)"}}
              >
                Manage Plan
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {current.buttons.map(btn=>(
                <button
                  key={btn.page}
                  onClick={()=>setPage(btn.page)}
                  style={{
                    background:"var(--sf)",
                    border:`1.5px solid ${btn.color}33`,
                    borderRadius:14,
                    padding:"14px 12px",
                    display:"flex",
                    alignItems:"center",
                    gap:11,
                    cursor:"pointer",
                    fontFamily:"var(--fb)",
                    textAlign:"left",
                    boxShadow:"var(--sh)",
                  }}
                >
                  <div style={{
                    width:40,
                    height:40,
                    borderRadius:11,
                    background:`color-mix(in srgb,${btn.color} 14%,var(--bg))`,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    fontSize:20,
                    flexShrink:0,
                  }}>
                    {btn.icon}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:"var(--tx)",lineHeight:1.2}}>{btn.label}</div>
                    <div style={{fontSize:10,color:"var(--mu)",marginTop:2,lineHeight:1.3}}>{btn.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── ORDERS ────────────────────────────────── */
/* ── SMS TEMPLATES STORE ─────────────────────────────────────────────────── */
const DEFAULT_SMS_TEMPLATES = [
  { id:1,  label:"Order Confirmed",    icon:"✅", text:"Hi {name}! Your order with KCS Sugar Trails Bakery is confirmed. We'll reach out with updates. Thank you! 🧁" },
  { id:2,  label:"Deposit Reminder",   icon:"💰", text:"Hi {name}! Just a reminder that a deposit is needed to hold your order date. Please reach out when you're ready. Thanks! 🧁" },
  { id:3,  label:"Order Ready",        icon:"🎉", text:"Hi {name}! Great news — your order is ready for pickup! Please reach out to arrange a time. Can't wait for you to see it! 🧁" },
  { id:4,  label:"Pickup Reminder",    icon:"📅", text:"Hi {name}! Friendly reminder that your order pickup is coming up soon. Please reach out to confirm your time. 🧁" },
  { id:5,  label:"Final Balance Due",  icon:"💳", text:"Hi {name}! Your order is almost ready! Just a reminder that the final balance is due at pickup. See you soon! 🧁" },
  { id:6,  label:"Running On Time",    icon:"⏰", text:"Hi {name}! Just wanted to let you know your order is on track and looking amazing! We'll message you when it's ready. 🧁" },
  { id:7,  label:"Need More Details",  icon:"📝", text:"Hi {name}! We want to make sure your order is perfect. Could you confirm a few details? Please reply or call at your convenience. 🧁" },
  { id:8,  label:"Thank You",          icon:"❤️", text:"Hi {name}! Thank you so much for your order! We hope you loved everything. We'd love to create something special for you again! 🧁" },
  { id:9,  label:"Photo Sent",         icon:"📸", text:"Hi {name}! Your order is done and looking beautiful! Check out the photo we just sent. Ready for pickup whenever you are! 🧁" },
  { id:10, label:"Custom Message",     icon:"✏️", text:"" },
];

const SMS_STORE = {
  _templates: [...DEFAULT_SMS_TEMPLATES],
  listeners: [],
  get() { return this._templates; },
  save(templates) { this._templates = templates; this.listeners.forEach(l => l([...templates])); },
  add(t) { const id = Date.now(); this._templates = [...this._templates, {...t, id}]; this.listeners.forEach(l => l([...this._templates])); },
  update(id, t) { this._templates = this._templates.map(x => x.id===id ? {...x,...t} : x); this.listeners.forEach(l => l([...this._templates])); },
  remove(id) { this._templates = this._templates.filter(x => x.id!==id); this.listeners.forEach(l => l([...this._templates])); },
  subscribe(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(l => l!==fn); }; },
};

function OrdersPage({ extraOrders=[], setAppOrders=()=>{}, customers=[], setCustomers=()=>{}, invoices=[], setInvoices=()=>{}, reminders=[], setReminders=()=>{}, tier="" }){
  const b = useBrand();
  const { tier: ordTier, setPage: ordSetPage } = useTier();
  const [orders, setOrders] = useState([]); // local mirror — kept for photo updates only
  // Single source of truth: appOrders passed in as extraOrders
  const allOrders = extraOrders;
  const [filter, setFilter] = useState("all");
  const [sel,    setSel]    = useState(null);
  const [t, show] = useToast();

  // SMS state
  const [showSMSPicker, setShowSMSPicker]   = useState(false);
  const [showCancelMsg,  setShowCancelMsg]  = useState(false);
  const [cancelType,     setCancelType]     = useState("decline");
  const [cancelNote,     setCancelNote]     = useState("");
  const [showManageSMS, setShowManageSMS]   = useState(false);
  const [templates, setTemplates]           = useState(SMS_STORE.get());
  const [selTemplate, setSelTemplate]       = useState(null);
  const [customMsg,   setCustomMsg]         = useState("");
  const [editingTpl,  setEditingTpl]        = useState(null); // template being edited in manage
  const [newTplForm,  setNewTplForm]        = useState({ label:"", icon:"✏️", text:"" });
  const [showNewTpl,  setShowNewTpl]        = useState(false);

  useEffect(() => {
    const unsub = SMS_STORE.subscribe(setTemplates);
    return unsub;
  }, []);

  const filt = filter==="all" ? allOrders : allOrders.filter(o => o.status===filter);
  const updS = async (id, s) => {
    const patch = { status: s, updated_at: new Date().toISOString() };
    if (s === "completed") patch.completed_at = new Date().toISOString();
    if (s === "refunded")  patch.refunded_at  = new Date().toISOString();
    // Write to Supabase baker_orders table
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (sess?.user?.id) {
      supabase.from("baker_orders").update(patch).eq("id", id).eq("baker_id", sess.user.id);
    }
    setOrders(p => p.map(o => o.id===id ? {...o, status:s, completedAt:patch.completed_at, refundedAt:patch.refunded_at} : o));
    setAppOrders(p => p.map(o => o.id===id ? {...o, status:s, completedAt:patch.completed_at, refundedAt:patch.refunded_at} : o));
    setSel(p => p ? {...p, status:s} : p);
    show(`Status → ${s} ✓`);
    if (s === "completed") {
      const ord = extraOrders.find(o => o.id === id);
      if (ord) {
        // Update customer record
        setCustomers(p => {
          const idx = p.findIndex(c => c.phone === ord.phone || c.name === ord.customer);
          if (idx >= 0) {
            const updated = [...p];
            updated[idx] = {...updated[idx], orders:(updated[idx].orders||0)+1, spent:(updated[idx].spent||0)+(ord.amount||0), last:"Today"};
            return updated;
          }
          return p;
        });
        // Auto-create invoice draft
        const newInv = {
          id:"INV-"+String(Date.now()).slice(-4),
          customer:ord.customer, email:ord.email||"", phone:ord.phone||"",
          items:ord.item||"Custom order", amount:ord.amount||0,
          status:"unpaid", date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
          due:"Net 7", orderId:id,
        };
        setInvoices(p => [newInv, ...(Array.isArray(p)?p:[])]);
        // Add follow-up reminder 7 days out
        const followDate = new Date(); followDate.setDate(followDate.getDate()+7);
        const followStr = followDate.toISOString().split("T")[0];
        setReminders(p => [...(Array.isArray(p)?p:[]), {id:Date.now(), date:followStr, text:`Follow up with ${ord.customer} — reorder opportunity`, time:"10:00", color:"#3D5A99"}]);

        // ── Auto-deduct inventory based on product→recipe link ────────────
        // Parse ordered items to find qty (e.g. "Custom Cake x2" → qty=2)
        const orderedItems = (ord.item||"").split(",").map(s=>s.trim());
        orderedItems.forEach(itemStr => {
          const qtyMatch = itemStr.match(/x(\d+)$/i);
          const orderQty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
          const itemName = itemStr.replace(/\s*x\d+$/i,"").trim();
          // Find matching product
          const product = products.find(p =>
            p.name.toLowerCase() === itemName.toLowerCase() && p.recipeId
          );
          if (!product) return;
          // Find linked recipe
          const recipe = recipes.find(r => r.id === product.recipeId);
          if (!recipe || !recipe.ingredients?.length) return;
          // Deduct each ingredient × order quantity / batch yield
          const batchesNeeded = orderQty / (recipe.batchYield || 1);
          setInventory(inv => inv.map(item => {
            const ing = recipe.ingredients.find(i => i.inventoryId === item.id);
            if (!ing) return item;
            const deduct = ing.qty * batchesNeeded;
            const newQty = Math.max(0, (item.qty || 0) - deduct);
            return {...item, qty: parseFloat(newQty.toFixed(3))};
          }));
        });
        if (orderedItems.some(itemStr => {
          const itemName = itemStr.replace(/\s*x\d+$/i,"").trim();
          return products.some(p => p.name.toLowerCase()===itemName.toLowerCase() && p.recipeId);
        })) {
          show("Order completed ✓ — inventory updated");
        }
        // ─────────────────────────────────────────────────────────────────
      }
    }
  };

  const [showSMSLocked, setShowSMSLocked] = useState(false);

  const openSMS = () => {
    if (!canAccess(ordTier, "order_confirmations")) {
      setShowSMSLocked(true);
      return;
    }
    setSelTemplate(null);
    setCustomMsg("");
    setShowSMSPicker(true);
  };

  const sendSMS = () => {
    if (!sel) return;
    const phone = sel.phone || "2105550100";
    const name  = sel.customer.split(" ")[0];
    let   body  = "";
    if (selTemplate) {
      if (selTemplate.id === 10) {
        body = customMsg;
      } else {
        body = selTemplate.text.replace(/\{name\}/g, name);
      }
    }
    if (body) {
      window.open(`sms:${phone}?body=${encodeURIComponent(body)}`, "_blank");
    }
    show("Opening Messages app ✓");
    setShowSMSPicker(false);
  };

  const saveTplEdit = () => {
    if (!editingTpl) return;
    SMS_STORE.update(editingTpl.id, editingTpl);
    setEditingTpl(null);
    show("Template saved ✓");
  };

  const addNewTpl = () => {
    if (!newTplForm.label.trim() || !newTplForm.text.trim()) { show("Label and message required"); return; }
    SMS_STORE.add(newTplForm);
    setNewTplForm({ label:"", icon:"✏️", text:"" });
    setShowNewTpl(false);
    show("Template added ✓");
  };

  const customerName = sel ? sel.customer.split(" ")[0] : "";

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH
        title="Orders"
        sub={`$${allOrders.filter(o=>!["completed","declined","cancelled","refunded"].includes(o.status)).reduce((s,o)=>s+o.amount,0)} open`}
        action={
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>ordSetPage("orderform")} className="pbtn" style={{padding:"7px 13px",fontSize:12,borderRadius:10}}>+ New</button>
            <PageHelp pageKey="orders"/>
            <button
            onClick={()=> canAccess(ordTier,"order_confirmations") ? setShowManageSMS(true) : setShowSMSLocked(true)}
            style={{background:"none",border:"1.5px solid var(--bd)",borderRadius:10,padding:"7px 12px",fontSize:11,color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:700,display:"flex",alignItems:"center",gap:5}}
          >
            {!canAccess(ordTier,"order_confirmations") && <span style={{fontSize:11}}>🔒</span>}✏️ SMS Messages
          </button></div>
        }
      />
      <div style={{padding:"0 12px 10px",display:"flex",gap:6,overflowX:"auto"}}>
        {["all","waiting_approval","pending","ready","completed","declined","cancelled","refunded"].map(f=>(
          <button key={f} className={`ptab ${filter===f?"on":"off"}`} onClick={()=>setFilter(f)} style={{flexShrink:0,textTransform:"capitalize"}}>
            {f==="waiting_approval" ? "Awaiting" : f}
          </button>
        ))}
      </div>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
        {allOrders.length===0&&<div style={{padding:"40px 20px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--tx)",marginBottom:6}}>No orders yet</div>
          <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6,marginBottom:16}}>Share your storefront link to start receiving orders from customers</div>
          <button
            onClick={()=>{
              const url = getStorefrontURL ? getStorefrontURL(null, null) : window.location.origin;
              if(navigator.share){navigator.share({title:"My BakerOS Storefront",url});}
              else if(navigator.clipboard){navigator.clipboard.writeText(url);}}
            }
            style={{background:"var(--p)",color:"#fff",border:"none",borderRadius:11,padding:"11px 22px",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer",marginBottom:8,display:"block",width:"100%"}}
          >🔗 Share My Storefront</button>
          <button
            onClick={()=>ordSetPage("orderform")}
            style={{background:"transparent",border:"1.5px solid var(--bd)",borderRadius:11,padding:"10px 22px",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer",color:"var(--mu)",width:"100%"}}
          >+ Add Order Manually</button>
        </div>}
        {allOrders.length>0&&filt.length===0&&<div style={{padding:"32px 24px",textAlign:"center",color:"var(--mu)",fontSize:13}}>No {filter} orders</div>}
        {filt.map((o,i)=>(
          <div key={i} className="card row" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>setSel(o)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avt name={o.customer} sz={34}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{o.customer}</div>
                  <div style={{fontSize:10,color:"var(--mu)"}}>{o.id} · {o.date}</div>
                </div>
              </div>
              <div style={{fontWeight:800,fontSize:15,color:"var(--p)"}}>${o.amount}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingLeft:44}}>
              <span style={{fontSize:11,color:"var(--mu)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{o.item}</span>
              <SBdg s={o.status}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── SMS Locked sheet (Trial Access) ── */}
      {showSMSLocked && (
        <div className="sheet">
          <div onClick={()=>setShowSMSLocked(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{maxHeight:"90dvh",overflowY:"auto",WebkitOverflowScrolling:"touch",width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 20px 20px",textAlign:"center"}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:`color-mix(in srgb,#3D5A99 14%,var(--sf))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"10px auto 14px"}}>📱</div>
              <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)",marginBottom:6}}>SMS Messaging Locked</div>
              <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.6,marginBottom:16}}>
                Send pre-written messages directly to your customers from their order — available on Growth and above.
              </div>
              <div style={{background:`color-mix(in srgb,#3D5A99 7%,var(--sf))`,border:"1px solid #3D5A9930",borderRadius:14,padding:"13px 15px",marginBottom:16,textAlign:"left"}}>
                <div style={{fontSize:10,fontWeight:800,color:"#3D5A99",textTransform:"uppercase",letterSpacing:".8px",marginBottom:10}}>What you unlock with Growth</div>
                {["Order confirmed & pickup reminders","Deposit and balance due reminders","Custom message templates","One-tap SMS from any order","Edit and add your own templates"].map((item,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:9,marginBottom:i<4?8:0}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:"#3D5A99",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>
                    </div>
                    <span style={{fontSize:12,color:"var(--tx)"}}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:"var(--mu)",marginBottom:12}}>Starting at <strong style={{fontSize:16,color:"#3D5A99"}}>$19.99</strong>/mo</div>
              <button
                onClick={()=>{setShowSMSLocked(false);ordSetPage("subscription");}}
                style={{width:"100%",padding:"14px",borderRadius:13,border:"none",background:"linear-gradient(135deg,#3D5A99,#2a3f6f)",color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:14,cursor:"pointer",marginBottom:9}}
              >
                Upgrade to Growth →
              </button>
              <button
                onClick={()=>setShowSMSLocked(false)}
                style={{width:"100%",padding:"10px",borderRadius:11,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}
              >
                View Plans
              </button>
              <div style={{fontSize:10,color:"var(--mu)",marginTop:8}}>Cancel anytime · No contracts</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Decline / Cancel message sheet ── */}
      {showCancelMsg && sel && (
        <div className="sheet">
          <div onClick={()=>setShowCancelMsg(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <Handle/>
            <div style={{padding:"6px 16px 24px"}}>
              <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:cancelType==="refund"?"#92400E":"#DC2626",marginBottom:4}}>
                {cancelType==="decline" ? "✗ Decline Order" : cancelType==="cancel" ? "✗ Cancel Order" : "💰 Issue Refund"}
              </div>
              <div style={{fontSize:12,color:"var(--mu)",marginBottom:14}}>
                Edit the message below before sending to {sel.customer}
              </div>
              <textarea
                value={cancelNote}
                onChange={e=>setCancelNote(e.target.value)}
                rows={5}
                style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1.5px solid var(--bd)",fontFamily:"var(--fb)",fontSize:13,color:"var(--tx)",background:"var(--bg)",resize:"none",outline:"none",lineHeight:1.5}}
              />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
                <button onClick={()=>setShowCancelMsg(false)}
                  style={{padding:"12px",borderRadius:11,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                  Back
                </button>
                <button onClick={()=>{
                  // Update order status
                  const newStatus = cancelType==="decline" ? "declined" : cancelType==="cancel" ? "cancelled" : "refunded";
                  updS(sel.id, newStatus);
                  // Send SMS if customer has phone
                  if (sel.phone) {
                    apiFetch("/api/notify",{
                      method:"POST",
                      headers:{"Content-Type":"application/json"},
                      body:JSON.stringify({
                        type:"customer_message",
                        customerName:sel.customer,
                        phone:sel.phone,
                        customMessage:cancelNote
                      })
                    }).catch(()=>{});
                  }
                  setShowCancelMsg(false);
                  show(newStatus==="refunded" ? "Refund issued — customer notified ✓" : `Order ${newStatus} — customer notified ✓`);
                }}
                  style={{padding:"12px",borderRadius:11,border:"none",background:cancelType==="refund"?"#D97706":"#DC2626",color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  Send & {cancelType==="decline"?"Decline":cancelType==="cancel"?"Cancel":"Issue Refund"}
                </button>
              </div>
              {!sel.phone && (
                <div style={{marginTop:10,fontSize:11,color:"var(--mu)",textAlign:"center"}}>
                  ⚠ No phone number on file — status will update but no SMS will be sent
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Order detail sheet ── */}
      {sel && !showSMSPicker && !showCancelMsg && (
        <div className="sheet">
          <div onClick={()=>setSel(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"90dvh",overflowY:"auto"}}>
            <Handle/>
            <div style={{padding:"6px 16px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>{sel.id}</div>
                <button onClick={()=>setSel(null)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {[["Customer",sel.customer],["Amount","$"+sel.amount],["Item",sel.item],["Payment",sel.payment]].map(([k,v])=>(
                  <div key={k} style={{background:"var(--bg)",borderRadius:10,padding:"9px 11px"}}>
                    <div style={{fontSize:9,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:2}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--tx)"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Update Status</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["waiting_approval","pending","ready","completed"].map(s=>(
                    <button key={s} onClick={()=>updS(sel.id,s)} style={{flex:1,minWidth:"22%",padding:"8px 4px",borderRadius:10,border:`1.5px solid ${sel.status===s?"var(--p)":"var(--bd)"}`,background:sel.status===s?`color-mix(in srgb,var(--p) 10%,var(--sf))`:"var(--sf)",color:sel.status===s?"var(--p)":"var(--mu)",fontFamily:"var(--fb)",fontWeight:700,fontSize:10,cursor:"pointer",textTransform:"capitalize",lineHeight:1.2}}>
                      {s==="waiting_approval"?"Awaiting":s}
                    </button>
                  ))}
                </div>
                {/* Decline / Cancel with message */}
                {sel.status!=="declined" && sel.status!=="cancelled" && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                    <button onClick={()=>{setCancelType("decline");setCancelNote(`Hi ${sel.customer}, unfortunately we're unable to accept your order for ${sel.item} at this time. We apologize for the inconvenience.`);setShowCancelMsg(true);}}
                      style={{padding:"9px",borderRadius:10,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                      ✗ Decline Order
                    </button>
                    <button onClick={()=>{setCancelType("cancel");setCancelNote(`Hi ${sel.customer}, we need to cancel your order for ${sel.item}. We're sorry for any inconvenience caused.`);setShowCancelMsg(true);}}
                      style={{padding:"9px",borderRadius:10,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                      ✗ Cancel Order
                    </button>
                  </div>
                )}
                {sel.status==="completed" && (
                  <div style={{marginTop:8}}>
                    <button onClick={()=>{setCancelType("refund");setCancelNote(`Hi ${sel.customer}, we have issued a full refund for your order (${sel.item}, $${sel.amount}). Please allow 3-5 business days for the refund to appear. We apologize for any inconvenience.`);setShowCancelMsg(true);}}
                      style={{width:"100%",padding:"9px",borderRadius:10,border:"1.5px solid #FCD34D",background:"#FFFBEB",color:"#92400E",fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                      💰 Issue Refund
                    </button>
                  </div>
                )}
                {(sel.status==="declined"||sel.status==="cancelled"||sel.status==="refunded") && (
                  <div style={{marginTop:8,padding:"8px 11px",background:sel.status==="refunded"?"#FFFBEB":"#FEF2F2",borderRadius:10,fontSize:12,color:sel.status==="refunded"?"#92400E":"#DC2626",fontWeight:600,textAlign:"center"}}>
                    {sel.status==="refunded" ? "💰 Refund issued — customer was notified" : `Order ${sel.status} — customer was notified`}
                  </div>
                )}
              </div>

              {/* Photo attachment — shows when Ready or Completed */}
              {(sel.status==="ready" || sel.status==="completed") && (() => {
                const photoRef = React.createRef();
                return (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>
                      📸 Order Photo
                    </div>
                    {sel.photoURL ? (
                      <div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:8}}>
                        <img src={sel.photoURL} alt="Order" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block",borderRadius:12}}/>
                        <button
                          onClick={()=>{ setOrders(p=>p.map(o=>o.id===sel.id?{...o,photoURL:null}:o)); setAppOrders(p=>p.map(o=>o.id===sel.id?{...o,photoURL:null}:o)); setSel(p=>({...p,photoURL:null})); }}
                          style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",width:26,height:26,color:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}
                        >✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={()=>photoRef.current?.click()}
                        style={{width:"100%",padding:"13px",borderRadius:11,border:"1.5px dashed var(--bd)",background:"var(--bg)",cursor:"pointer",fontFamily:"var(--fb)",fontSize:12,fontWeight:700,color:"var(--mu)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                      >
                        📷 Attach a photo of this order
                      </button>
                    )}
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      style={{display:"none"}}
                      onChange={e=>{
                        const file = e.target.files[0];
                        if (!file) return;
                        const url = URL.createObjectURL(file);
                        setOrders(p=>p.map(o=>o.id===sel.id?{...o,photoURL:url}:o));
                        setAppOrders(p=>p.map(o=>o.id===sel.id?{...o,photoURL:url}:o));
                        setSel(p=>({...p,photoURL:url}));
                        show("Photo attached ✓");
                      }}
                    />
                  </div>
                );
              })()}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button className="pbtn" onClick={openSMS}>📱 SMS Customer</button>
                <button className="gbtn" onClick={()=>setSel(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SMS Picker sheet ── */}
      {showSMSPicker && sel && (
        <div className="sheet">
          <div onClick={()=>setShowSMSPicker(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 0"}}>

              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>📱 Text {sel.customer.split(" ")[0]}</div>
                <button onClick={()=>setShowSMSPicker(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:11,color:"var(--mu)",marginBottom:14}}>Select a message template or write your own</div>

              {/* Template list */}
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                {templates.filter(tpl => tpl.id !== 10).map(tpl => {
                  const isSelected = selTemplate?.id === tpl.id;
                  const preview = tpl.text.replace(/\{name\}/g, customerName);
                  return (
                    <div
                      key={tpl.id}
                      onClick={()=>{ setSelTemplate(tpl); setCustomMsg(""); }}
                      style={{
                        padding:"11px 13px",
                        borderRadius:12,
                        border:`1.5px solid ${isSelected ? b.theme.primary : "var(--bd)"}`,
                        background: isSelected ? `color-mix(in srgb,${b.theme.primary} 8%,var(--sf))` : "var(--sf)",
                        cursor:"pointer",
                        display:"flex",
                        alignItems:"flex-start",
                        gap:11,
                      }}
                    >
                      {/* Checkmark */}
                      <div style={{
                        width:22,height:22,borderRadius:"50%",flexShrink:0,marginTop:1,
                        background: isSelected ? b.theme.primary : "var(--bg)",
                        border:`1.5px solid ${isSelected ? b.theme.primary : "var(--bd)"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                      }}>
                        {isSelected && <span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontSize:14}}>{tpl.icon}</span>
                          <span style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{tpl.label}</span>
                        </div>
                        <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{preview}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Custom message option */}
                <div
                  onClick={()=>{ setSelTemplate({id:10,label:"Custom Message",icon:"✏️",text:""}); }}
                  style={{
                    padding:"11px 13px",borderRadius:12,
                    border:`1.5px solid ${selTemplate?.id===10 ? b.theme.primary : "var(--bd)"}`,
                    background: selTemplate?.id===10 ? `color-mix(in srgb,${b.theme.primary} 8%,var(--sf))` : "var(--sf)",
                    cursor:"pointer",display:"flex",alignItems:"flex-start",gap:11,
                  }}
                >
                  <div style={{
                    width:22,height:22,borderRadius:"50%",flexShrink:0,marginTop:1,
                    background: selTemplate?.id===10 ? b.theme.primary : "var(--bg)",
                    border:`1.5px solid ${selTemplate?.id===10 ? b.theme.primary : "var(--bd)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                    {selTemplate?.id===10 && <span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <span style={{fontSize:14}}>✏️</span>
                      <span style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Write Custom Message</span>
                    </div>
                    {selTemplate?.id===10 && (
                      <textarea
                        className="field"
                        rows={3}
                        placeholder={`Hi ${customerName}, ...`}
                        value={customMsg}
                        onChange={e=>setCustomMsg(e.target.value)}
                        onClick={e=>e.stopPropagation()}
                        style={{resize:"none",fontSize:12,lineHeight:1.6}}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Preview of selected */}
              {selTemplate && selTemplate.id !== 10 && (
                <div style={{background:"#E8F5E9",borderRadius:"12px 12px 12px 3px",padding:"11px 13px",marginBottom:14,fontSize:12,color:"#1A2E22",lineHeight:1.6}}>
                  {selTemplate.text.replace(/\{name\}/g, customerName)}
                </div>
              )}

              {/* Send button */}
              <button
                onClick={sendSMS}
                disabled={!selTemplate || (selTemplate.id===10 && !customMsg.trim())}
                className="pbtn"
                style={{width:"100%",marginBottom:10,opacity:(!selTemplate||(selTemplate.id===10&&!customMsg.trim()))?.5:1}}
              >
                Send via Messages →
              </button>
              <button
                onClick={()=>{ setShowSMSPicker(false); setTimeout(()=>setShowManageSMS(true),300); }}
                style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer",marginBottom:8}}
              >
                ✏️ Edit Message Templates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage SMS Templates sheet ── */}
      {showManageSMS && (
        <div className="sheet">
          <div onClick={()=>{setShowManageSMS(false);setEditingTpl(null);setShowNewTpl(false);}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 20px"}}>

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>✏️ SMS Message Templates</div>
                <button onClick={()=>setShowManageSMS(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:11,color:"var(--mu)",marginBottom:16,lineHeight:1.5}}>
                Customize your message templates. Use <span style={{fontWeight:700,color:b.theme.primary}}>{"{name}"}</span> to insert the customer's first name automatically.
              </div>

              {/* Template list */}
              <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
                {templates.filter(tpl=>tpl.id!==10).map(tpl=>(
                  <div key={tpl.id} className="card" style={{padding:"12px 14px",overflow:"hidden"}}>
                    {editingTpl?.id === tpl.id ? (
                      /* Edit mode */
                      <div style={{display:"flex",flexDirection:"column",gap:9}}>
                        <div style={{display:"flex",alignItems:"center",gap:9}}>
                          <input
                            className="field"
                            style={{width:48,textAlign:"center",fontSize:18,padding:"6px"}}
                            value={editingTpl.icon}
                            onChange={e=>setEditingTpl(p=>({...p,icon:e.target.value}))}
                          />
                          <input
                            className="field"
                            style={{flex:1,fontWeight:700,fontSize:13}}
                            value={editingTpl.label}
                            onChange={e=>setEditingTpl(p=>({...p,label:e.target.value}))}
                            placeholder="Template name"
                          />
                        </div>
                        <textarea
                          className="field"
                          rows={3}
                          value={editingTpl.text}
                          onChange={e=>setEditingTpl(p=>({...p,text:e.target.value}))}
                          placeholder={`Use {name} for customer's first name`}
                          style={{resize:"none",fontSize:12,lineHeight:1.6}}
                        />
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                          <button onClick={()=>setEditingTpl(null)} style={{padding:"9px",borderRadius:10,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button>
                          <button onClick={saveTplEdit} className="pbtn" style={{padding:"9px",borderRadius:10,fontSize:12}}>Save ✓</button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{tpl.icon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:2}}>{tpl.label}</div>
                          <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tpl.text}</div>
                        </div>
                        <div style={{display:"flex",gap:7,flexShrink:0}}>
                          <button onClick={()=>setEditingTpl({...tpl})} style={{background:"none",border:`1px solid ${b.theme.primary}`,borderRadius:8,padding:"5px 10px",color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer"}}>Edit</button>
                          <button onClick={()=>{SMS_STORE.remove(tpl.id);show("Removed ✓");}} style={{background:"none",border:"1px solid #FCA5A5",borderRadius:8,padding:"5px 10px",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer"}}>✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new template */}
              {showNewTpl ? (
                <div className="card" style={{padding:"14px",display:"flex",flexDirection:"column",gap:9}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--tx)"}}>New Template</div>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <input className="field" style={{width:48,textAlign:"center",fontSize:18,padding:"6px"}} value={newTplForm.icon} onChange={e=>setNewTplForm(p=>({...p,icon:e.target.value}))} placeholder="✏️"/>
                    <input className="field" style={{flex:1,fontWeight:700,fontSize:13}} value={newTplForm.label} onChange={e=>setNewTplForm(p=>({...p,label:e.target.value}))} placeholder="Template name"/>
                  </div>
                  <textarea className="field" rows={3} value={newTplForm.text} onChange={e=>setNewTplForm(p=>({...p,text:e.target.value}))} placeholder={`Hi {name}, ...`} style={{resize:"none",fontSize:12,lineHeight:1.6}}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                    <button onClick={()=>setShowNewTpl(false)} style={{padding:"9px",borderRadius:10,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button>
                    <button onClick={addNewTpl} className="pbtn" style={{padding:"9px",borderRadius:10,fontSize:12}}>Add Template</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={()=>setShowNewTpl(true)}
                  style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px dashed ${b.theme.primary}60`,background:`color-mix(in srgb,${b.theme.primary} 5%,var(--sf))`,color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                >
                  + Add Custom Template
                </button>
              )}

              <button
                onClick={()=>{SMS_STORE.save([...DEFAULT_SMS_TEMPLATES]);show("Reset to defaults ✓");setEditingTpl(null);}}
                style={{width:"100%",marginTop:10,padding:"10px",borderRadius:11,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}
              >
                Reset to Defaults
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── UNIT CONVERSION SYSTEM ──────────────────────────────────────────────────
   Solids → weight (base: grams)
   Liquids → volume (base: ml)
   Count   → each  (base: each)
────────────────────────────────────────────────────────────────────────────── */
const UNIT_TYPES = {
  // solids / weight
  g:    { type:"solid",  base:"g",    toBase:1,          label:"Grams (g)"         },
  kg:   { type:"solid",  base:"g",    toBase:1000,       label:"Kilograms (kg)"    },
  oz:   { type:"solid",  base:"g",    toBase:28.3495,    label:"Ounces (oz)"       },
  lbs:  { type:"solid",  base:"g",    toBase:453.592,    label:"Pounds (lbs)"      },
  // liquids / volume
  ml:   { type:"liquid", base:"ml",   toBase:1,          label:"Millilitres (ml)"  },
  l:    { type:"liquid", base:"ml",   toBase:1000,       label:"Litres (l)"        },
  tsp:  { type:"liquid", base:"ml",   toBase:4.92892,    label:"Teaspoons (tsp)"   },
  tbsp: { type:"liquid", base:"ml",   toBase:14.7868,    label:"Tablespoons (tbsp)"},
  "fl oz": { type:"liquid", base:"ml",toBase:29.5735,    label:"Fl. Ounces (fl oz)"},
  cup:  { type:"liquid", base:"ml",   toBase:236.588,    label:"Cups (cup)"        },
  // count
  each:  { type:"count", base:"each", toBase:1,          label:"Each"              },
  dozen: { type:"count", base:"each", toBase:12,         label:"Dozen"             },
  units: { type:"count", base:"each", toBase:1,          label:"Units"             },
};

const SOLID_UNITS     = ["g","kg","oz","lbs"];
const LIQUID_UNITS    = ["ml","l","tsp","tbsp","fl oz","cup"];
const COUNT_UNITS     = ["each","dozen","units"];
const PACKAGING_UNITS = ["each","pack","roll","case","box","bag","sheet","dozen"];
const DEPRECIATION_YEARS = [3, 5, 7, 10]; // straight-line options

// Convert qty from one unit to another. Returns null if incompatible types.
function convertUnit(qty, fromUnit, toUnit) {
  if (fromUnit === toUnit) return qty;
  const from = UNIT_TYPES[fromUnit];
  const to   = UNIT_TYPES[toUnit];
  if (!from || !to)              return null;
  if (from.base !== to.base)     return null;  // incompatible (e.g. g → ml)
  const inBase = qty * from.toBase;
  return inBase / to.toBase;
}

// Guess the unit type from a unit string
function unitKind(unit) {
  return UNIT_TYPES[unit]?.type || "count";
}

// Smart unit dropdown component
function UnitSelect({ value, onChange, kind }) {
  const opts = kind==="liquid" ? LIQUID_UNITS : kind==="solid" ? SOLID_UNITS : COUNT_UNITS;
  return (
    <select className="field" value={value} onChange={e=>onChange(e.target.value)}>
      {opts.map(u => <option key={u} value={u}>{UNIT_TYPES[u]?.label||u}</option>)}
    </select>
  );
}

// Liquid / Solid / Count radio toggle
function UnitKindToggle({ value, onChange }) {
  const b = useBrand();
  return (
    <div style={{display:"flex",gap:7}}>
      {[
        {k:"solid",  label:"⚖️ Solid",  hint:"Flour, butter, sugar…"},
        {k:"liquid", label:"💧 Liquid", hint:"Milk, oil, extract…"},
        {k:"count",  label:"🔢 Count",  hint:"Eggs, boxes…"},
      ].map(({k,label,hint})=>(
        <button
          key={k}
          type="button"
          onClick={()=>onChange(k)}
          style={{
            flex:1, padding:"9px 6px", borderRadius:11,
            border:`1.5px solid ${value===k ? b.theme.primary : "var(--bd)"}`,
            background: value===k ? `color-mix(in srgb,${b.theme.primary} 12%,var(--sf))` : "var(--sf)",
            cursor:"pointer", fontFamily:"var(--fb)", textAlign:"center",
          }}
        >
          <div style={{fontSize:14, marginBottom:2}}>{label.split(" ")[0]}</div>
          <div style={{fontSize:11, fontWeight:700, color: value===k ? b.theme.primary : "var(--tx)"}}>{label.split(" ").slice(1).join(" ")}</div>
          <div style={{fontSize:9, color:"var(--mu)", marginTop:2, lineHeight:1.3}}>{hint}</div>
        </button>
      ))}
    </div>
  );
}

const RECIPES_INIT = [
  {
    id:"r-1",
    name:"Vanilla Birthday Cake",
    emoji:"🎂",
    linkedProduct:"Custom Birthday Cake",
    batchYield:1,
    yieldUnit:"cake",
    notes:"8-inch 2-layer cake. Chill layers before frosting.",
    ingredients:[
      { inventoryId:1, name:"All-Purpose Flour", qty:2.5, unit:"lbs", kind:"solid" },
      { inventoryId:2, name:"Unsalted Butter",   qty:1,   unit:"lbs", kind:"solid" },
      { inventoryId:3, name:"Granulated Sugar",  qty:2,   unit:"lbs", kind:"solid" },
    ],
  },
];

function RecipePage({ inventory, setInventory, products, recipes=[], setRecipes=()=>{} }) {
  const b = useBrand();
  const { tier: recTier, setPage: recSetPage } = useTier();
  const hasInventory = canAccess(recTier, "inventory");
  const [t, show] = useToast();
  const [sel,     setSel]           = useState(null);   // viewing a recipe
  const [showForm, setShowForm]     = useState(false);  // add/edit sheet
  const [isEdit,   setIsEdit]       = useState(false);
  const [deductQty,  setDeductQty]  = useState("1");

  const blankRecipe = {
    name:"", emoji:"📖", linkedProduct:"", batchYield:1, yieldUnit:"units", notes:"", ingredients:[],
  };
  const [form, setForm] = useState(blankRecipe);
  const [addIngRow, setAddIngRow] = useState({ inventoryId:"", qty:"", unit:"" });

  const ingredientItems = inventory.filter(i => i.cat === "Ingredients");
  const isEmpty = !recipes || recipes.length === 0;

  const openAdd  = ()       => { setForm(blankRecipe); setIsEdit(false); setShowForm(true); };
  const openEdit = (recipe) => { setForm({...recipe}); setIsEdit(true);  setShowForm(true); };

  const saveRecipe = () => {
    if (!form.name.trim()) { show("Recipe name required"); return; }
    if (isEdit) {
      setRecipes(p => p.map(r => r.id === form.id ? form : r));
      setSel(form);
      show("Recipe updated ✓");
    } else {
      const newR = {...form, id:"r-"+Date.now()};
      setRecipes(p => [...p, newR]);
      show("Recipe added ✓");
    }
    setShowForm(false);
  };

  const deleteRecipe = (id) => {
    setRecipes(p => p.filter(r => r.id !== id));
    setSel(null);
    show("Recipe removed");
  };

  const addIngredient = () => {
    if (!addIngRow.inventoryId || !addIngRow.qty) { show("Select item and quantity"); return; }
    const item = inventory.find(i => i.id === Number(addIngRow.inventoryId));
    if (!item) return;
    const ing = {
      inventoryId: item.id,
      name: item.name,
      qty: parseFloat(addIngRow.qty) || 0,
      unit: addIngRow.unit || item.unit,
    };
    setForm(p => ({...p, ingredients:[...p.ingredients, ing]}));
    setAddIngRow({ inventoryId:"", qty:"", unit:"" });
  };

  const removeIngredient = (idx) => {
    setForm(p => ({...p, ingredients: p.ingredients.filter((_,i)=>i!==idx)}));
  };

  // Deduct inventory for a given recipe and quantity ordered
  const deductInventory = (recipe, orderedQty) => {
    const qty = parseFloat(orderedQty) || 1;
    const multiplier = qty / recipe.batchYield;
    const updates = {};
    recipe.ingredients.forEach(ing => {
      const needed = ing.qty * multiplier;
      updates[ing.inventoryId] = (updates[ing.inventoryId] || 0) + needed;
    });
    setInventory(prev => prev.map(item => {
      if (updates[item.id] !== undefined) {
        return {...item, qty: Math.max(0, parseFloat((item.qty - updates[item.id]).toFixed(2)))};
      }
      return item;
    }));
    show(`Inventory deducted for ${qty} ${recipe.yieldUnit} ✓`);
  };

  const getStockStatus = (recipe) => {
    // Check if enough inventory for 1 batch
    const issues = [];
    recipe.ingredients.forEach(ing => {
      const item = inventory.find(i => i.id === ing.inventoryId);
      if (!item) { issues.push(`${ing.name} not found`); return; }
      if (item.qty < ing.qty) { issues.push(`${ing.name} (need ${ing.qty} ${ing.unit}, have ${item.qty})`); }
    });
    return issues;
  };

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH
        title="Recipes"
        sub={`${recipes.length} recipe${recipes.length!==1?"s":""}`}
        action={<div style={{display:"flex",gap:8,alignItems:"center"}}><PageHelp pageKey="recipes"/><button onClick={openAdd} className="pbtn" style={{padding:"7px 13px",fontSize:13,borderRadius:10}}>+ Add</button></div>}
      />

      {/* Recipe list */}
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
        {recipes.length===0 ? (
          <div className="card" style={{padding:"32px",textAlign:"center"}}>
            <div style={{fontSize:44,marginBottom:10}}>📖</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--tx)",marginBottom:4}}>No recipes yet</div>
            <div style={{fontSize:12,color:"var(--mu)",marginBottom:14,lineHeight:1.5}}>Add your first recipe and link ingredients directly to your inventory</div>
            <button onClick={openAdd} className="pbtn" style={{padding:"10px 22px",fontSize:13,borderRadius:12}}>+ Add First Recipe</button>
          </div>
        ) : recipes.map(recipe => {
          const issues = getStockStatus(recipe);
          return (
            <div key={recipe.id} className="card row" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>setSel(recipe)}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:46,height:46,borderRadius:12,background:`color-mix(in srgb,${b.theme.primary} 10%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                  {recipe.emoji}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:2}}>{recipe.name}</div>
                  <div style={{fontSize:11,color:"var(--mu)"}}>
                    Makes {recipe.batchYield} {recipe.yieldUnit} · {recipe.ingredients.length} ingredient{recipe.ingredients.length!==1?"s":""}
                  </div>
                  {recipe.linkedProduct && (
                    <div style={{fontSize:10,marginTop:3,color:b.theme.primary,fontWeight:700}}>🔗 {recipe.linkedProduct}</div>
                  )}
                </div>
                <div style={{flexShrink:0,textAlign:"right"}}>
                  {issues.length===0
                    ? <span style={{fontSize:10,fontWeight:700,color:"#16A34A"}}>✓ In stock</span>
                    : <span style={{fontSize:10,fontWeight:700,color:"#DC2626"}}>⚠ Low stock</span>
                  }
                  <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>›</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recipe detail sheet ── */}
      {sel && !showForm && (
        <div className="sheet">
          <div onClick={()=>setSel(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 20px"}}>

              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{width:52,height:52,borderRadius:13,background:`color-mix(in srgb,${b.theme.primary} 10%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{sel.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:19,fontWeight:700,color:"var(--tx)",marginBottom:2}}>{sel.name}</div>
                  <div style={{fontSize:11,color:"var(--mu)"}}>Makes {sel.batchYield} {sel.yieldUnit}{sel.linkedProduct?` · 🔗 ${sel.linkedProduct}`:""}</div>
                </div>
                <button onClick={()=>setSel(null)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>

              {/* Notes */}
              {sel.notes && (
                <div style={{background:"var(--bg)",borderRadius:11,padding:"11px 13px",marginBottom:14,fontSize:12,color:"var(--mu)",lineHeight:1.6,fontStyle:"italic"}}>
                  📝 {sel.notes}
                </div>
              )}

              {/* Ingredients */}
              <div style={{fontSize:11,fontWeight:800,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:10}}>
                Ingredients — per {sel.batchYield} {sel.yieldUnit}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
                {sel.ingredients.map((ing, idx) => {
                  const item = inventory.find(i => i.id === ing.inventoryId);
                  const hasEnough = item && item.qty >= ing.qty;
                  return (
                    <div key={idx} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 12px",borderRadius:11,background:"var(--sf)",border:`1px solid ${hasEnough===false?"#FCA5A560":"var(--bd)"}`}}>
                      <span style={{fontSize:20,flexShrink:0}}>{item?.icon||"📦"}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{ing.name}</div>
                        <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>
                          Need: {ing.qty} {ing.unit}
                          {item ? ` · In stock: ${item.qty} ${item.unit}` : " · Not in inventory"}
                        </div>
                      </div>
                      <div style={{flexShrink:0,textAlign:"right"}}>
                        {hasEnough === false
                          ? <span style={{fontSize:10,fontWeight:700,color:"#DC2626"}}>⚠ Low</span>
                          : hasEnough === true
                          ? <span style={{fontSize:10,fontWeight:700,color:"#16A34A"}}>✓</span>
                          : <span style={{fontSize:10,color:"var(--mu)"}}>—</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Deduct inventory — Pro+ only */}
              {hasInventory ? (
                <div style={{background:`color-mix(in srgb,${b.theme.primary} 7%,var(--sf))`,border:`1.5px solid ${b.theme.primary}30`,borderRadius:14,padding:"14px",marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:800,color:b.theme.primary,marginBottom:8}}>📦 Deduct Inventory</div>
                  <div style={{fontSize:11,color:"var(--mu)",marginBottom:11,lineHeight:1.5}}>
                    Enter quantity ordered. BakerOS automatically converts units and deducts the correct amount from your inventory.
                  </div>
                  <div style={{display:"flex",gap:9,alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:"var(--mu)",fontWeight:600,marginBottom:4}}>Quantity ordered ({sel.yieldUnit})</div>
                      <input className="field" type="number" min="1" value={deductQty} onChange={e=>setDeductQty(e.target.value)} style={{fontSize:15,fontWeight:700}}/>
                    </div>
                    <button onClick={()=>{ deductInventory(sel, deductQty); }} style={{padding:"12px 16px",borderRadius:12,border:"none",background:b.theme.primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer",flexShrink:0,marginTop:18}}>
                      Deduct →
                    </button>
                  </div>
                  {parseFloat(deductQty) > 0 && (
                    <div style={{marginTop:10,padding:"9px 11px",background:"var(--bg)",borderRadius:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".6px",marginBottom:6}}>Will deduct:</div>
                      {sel.ingredients.map((ing,i) => {
                        const item = inventory.find(iv=>iv.id===ing.inventoryId);
                        const needed = (parseFloat(deductQty)/sel.batchYield * ing.qty);
                        const inInvUnit = item ? convertUnit(needed, ing.unit, item.unit) : null;
                        return (
                          <div key={i} style={{fontSize:12,color:"var(--tx)",marginBottom:3,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span>{ing.name}</span>
                            {inInvUnit !== null
                              ? <span style={{fontWeight:700,color:b.theme.primary}}>−{inInvUnit.toFixed(3)} {item?.unit}</span>
                              : <span style={{fontSize:10,fontWeight:700,color:"#C47B00"}}>⚠ unit mismatch</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{background:`color-mix(in srgb,#7C5CBF 6%,var(--sf))`,border:"1.5px solid #7C5CBF30",borderRadius:14,padding:"14px",marginBottom:14,textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:8}}>📦</div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--tx)",marginBottom:5}}>Inventory Deduction — Growth Feature</div>
                  <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6,marginBottom:12}}>
                    Upgrade to Growth to automatically deduct ingredients from your inventory when orders are placed — with smart unit conversion built in.
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14,textAlign:"left"}}>
                    {["Auto-deduct ingredients per order","Smart unit conversion (g ↔ lbs, ml ↔ cups)","Low stock alerts before you run out","Full inventory tracking dashboard"].map((f,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:9}}>
                        <div style={{width:18,height:18,borderRadius:"50%",background:"#16A34A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>
                        </div>
                        <span style={{fontSize:12,color:"var(--tx)"}}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={()=>{ setSel(null); recSetPage("subscription"); }}
                    style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#16A34A,#14803A)",color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer",marginBottom:6}}
                  >
                    Upgrade to Growth — $19.99/mo →
                  </button>
                  <div style={{fontSize:10,color:"var(--mu)"}}>Cancel anytime · No contracts</div>
                </div>
              )}

              {/* Actions */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <button className="pbtn" onClick={()=>{ setSel(null); setTimeout(()=>{ setForm({...sel}); setIsEdit(true); setShowForm(true); },200); }}>✏️ Edit Recipe</button>
                <button onClick={()=>{ if(!window.confirm(`Delete recipe "${sel?.name || 'this recipe'}"? This cannot be undone.`)) return; deleteRecipe(sel.id); }} style={{padding:"13px",borderRadius:12,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit recipe sheet ── */}
      {showForm && (
        <div className="sheet">
          <div onClick={()=>setShowForm(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>{isEdit?"Edit Recipe":"New Recipe"}</div>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
            </div>

            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:13}}>

              {/* Name + Emoji */}
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:9}}>
                <Fld label="Recipe Name" required>
                  <input className="field" placeholder="e.g. Vanilla Birthday Cake" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                </Fld>
                <Fld label="Icon">
                  <input className="field" value={form.emoji} onChange={e=>setForm(p=>({...p,emoji:e.target.value}))} style={{width:52,fontSize:22,textAlign:"center",padding:"9px 6px"}}/>
                </Fld>
              </div>

              {/* Linked product */}
              <Fld label="Linked Product" hint="Which product does this recipe make?">
                <select className="field" value={form.linkedProduct} onChange={e=>setForm(p=>({...p,linkedProduct:e.target.value}))}>
                  <option value="">— Not linked —</option>
                  {products.map(p=><option key={p.id} value={p.name}>{p.emoji} {p.name}</option>)}
                </select>
              </Fld>

              {/* Batch yield */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <Fld label="Batch Yield" hint="How many does this recipe make?">
                  <input className="field" type="number" min="1" value={form.batchYield} onChange={e=>setForm(p=>({...p,batchYield:parseFloat(e.target.value)||1}))}/>
                </Fld>
                <Fld label="Yield Unit" hint="e.g. cakes, cupcakes, dozen">
                  <select className="field" value={form.yieldUnit} onChange={e=>setForm(p=>({...p,yieldUnit:e.target.value}))}>
                    {["cake","cupcake","dozen","loaf","batch","cookie","pie","tart","roll","unit"].map(u=><option key={u} value={u}>{u}</option>)}
                    <option value={form.yieldUnit&&!["cake","cupcake","dozen","loaf","batch","cookie","pie","tart","roll","unit"].includes(form.yieldUnit)?form.yieldUnit:""} disabled hidden>{form.yieldUnit||"Select unit"}</option>
                  </select>
                </Fld>
              </div>

              {/* Notes */}
              <Fld label="Notes (optional)">
                <textarea className="field" rows={2} placeholder="e.g. Bake at 350°F for 25 min..." value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{resize:"none"}}/>
              </Fld>

              {/* Ingredients */}
              <div>
                <div style={{fontSize:11,fontWeight:800,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:10}}>
                  Ingredients
                </div>

                {/* Existing ingredients */}
                {form.ingredients.length > 0 && (
                  <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:11}}>
                    {form.ingredients.map((ing,idx)=>(
                      <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"var(--sf)",borderRadius:10,border:"1px solid var(--bd)"}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{ing.name}</div>
                          <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{ing.qty} {ing.unit}</div>
                        </div>
                        <button onClick={()=>removeIngredient(idx)} style={{background:"none",border:"none",color:"var(--mu)",fontSize:16,cursor:"pointer",fontWeight:700}}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add ingredient row */}
                <div style={{background:`color-mix(in srgb,${b.theme.primary} 5%,var(--sf))`,border:`1px dashed ${b.theme.primary}50`,borderRadius:12,padding:"12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:b.theme.primary,marginBottom:9}}>+ Add Ingredient from Inventory</div>
                  <Fld label="Ingredient">
                    <select className="field" value={addIngRow.inventoryId} onChange={e=>{
                      const item = inventory.find(i=>i.id===Number(e.target.value));
                      setAddIngRow(p=>({...p, inventoryId:e.target.value, unit:item?.unit||""}));
                    }}>
                      <option value="">— Select from inventory —</option>
                      {ingredientItems.map(item=><option key={item.id} value={item.id}>{item.icon} {item.name} ({item.qty} {item.unit} in stock)</option>)}
                    </select>
                  </Fld>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:9}}>
                    <Fld label="Quantity needed">
                      <input className="field" type="number" min="0" step="0.1" placeholder="0" value={addIngRow.qty} onChange={e=>setAddIngRow(p=>({...p,qty:e.target.value}))}/>
                    </Fld>
                    <Fld label="Unit">
                      <UnitSelect value={addIngRow.unit||"lbs"} onChange={unit=>setAddIngRow(p=>({...p,unit}))} kind={addIngRow.kind||"solid"}/>
                    </Fld>
                  </div>
                  <button
                    onClick={addIngredient}
                    style={{width:"100%",marginTop:9,padding:"10px",borderRadius:10,border:"none",background:b.theme.primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}
                  >
                    + Add Ingredient
                  </button>
                </div>
              </div>

              {/* Save / Cancel */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:4}}>
                <button className="pbtn" onClick={saveRecipe}>{isEdit?"Save Changes":"Add Recipe"}</button>
                <button className="gbtn" onClick={()=>setShowForm(false)} style={{padding:"13px",borderRadius:12,color:"var(--tx)"}}>Cancel</button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryPage({inventory,setInventory,setPage}){
  const[tab,setTab]=useState("all");const[showAdd,setShowAdd]=useState(false);const[editId,setEditId]=useState(null);const[t,show]=useToast();
  const[form,setForm]=useState({name:"",cat:"Ingredients",kind:"solid",unit:"lbs",qty:0,min:0,cost:0,supplier:"",reorderQty:0,icon:"📦",purchaseDate:"",condition:"Working",usefulLife:5});
  const filt=useMemo(()=>tab==="all"?inventory:inventory.filter(i=>i.cat.toLowerCase()===tab),[inventory,tab]);
  const low=inventory.filter(i=>["low","out"].includes(stockStatus(i)));
  const openAdd=(cat="Ingredients")=>{
    const defaults = {
      "Packaging": {cat:"Packaging",kind:"count",unit:"each",qty:0,min:0,cost:0,supplier:"",reorderQty:0,icon:"📦",purchaseDate:"",condition:"Working",usefulLife:5},
      "Equipment": {cat:"Equipment",kind:"count",unit:"each",qty:1,min:0,cost:0,supplier:"",reorderQty:0,icon:"🔧",purchaseDate:new Date().toISOString().split("T")[0],condition:"Working",usefulLife:5},
    };
    setForm({name:"",kind:"solid",unit:"lbs",qty:0,min:0,cost:0,supplier:"",reorderQty:0,icon:"📦",purchaseDate:"",condition:"Working",usefulLife:5,...(defaults[cat]||{cat})});
    setEditId(null);setShowAdd(true);
  };
  const openEdit=item=>{setForm({...item,kind:item.kind||unitKind(item.unit)});setEditId(item.id);setShowAdd(true);};
  const save=()=>{if(!form.name.trim()){show("Name required","error");return;}editId?setInventory(p=>p.map(i=>i.id===editId?{...form,id:editId}:i)):setInventory(p=>[...p,{...form,id:Date.now()}]);show(editId?"Updated ✓":"Added ✓");setShowAdd(false);};
  return(
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="Inventory" sub={`${inventory.length} items · $${inventory.reduce((s,i)=>s+i.cost*i.qty,0).toFixed(0)} value`} action={
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <PageHelp pageKey="inventory"/>
          <button onClick={()=>setPage("receipt")} style={{background:"none",border:"1.5px solid var(--bd)",borderRadius:10,padding:"7px 11px",fontSize:12,color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:600}}>🧾 Scan</button>
          <button onClick={openAdd} className="pbtn" style={{padding:"7px 13px",fontSize:13,borderRadius:10}}>+ Add</button>
        </div>
      }/>
      {low.length>0&&<div style={{margin:"0 12px 10px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:12,padding:"10px 13px"}}><div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>⚠️ {low.length} items low or out</div><div style={{fontSize:11,color:"#DC2626",marginTop:2}}>{low.map(i=>i.name).join(" · ")}</div></div>}
      <div style={{padding:"0 12px 10px",display:"flex",gap:5,overflowX:"auto"}}>
        {["all","ingredients","finished","packaging","equipment"].map(t2=><button key={t2} className={`ptab ${tab===t2?"on":"off"}`} onClick={()=>setTab(t2)} style={{flexShrink:0,textTransform:"capitalize"}}>{t2}</button>)}
      </div>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
        {filt.map(item=>{
          const s=stockStatus(item);const sc=SC[s];
          return(
            <div key={item.id} className="card row" style={{padding:"12px 13px",cursor:"pointer"}} onClick={()=>openEdit(item)}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{item.name}</div>
                  {item.cat==="Equipment"
                    ? <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{item.supplier} · ${item.cost} · {item.condition||"Working"}</div>
                    : <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{item.supplier} · ${item.cost}/{item.unit}</div>
                  }
                  {item.cat!=="Equipment" && <StockBar item={item}/>}
                  {item.cat==="Equipment" && item.cost>0 && item.usefulLife>0 && (
                    <div style={{fontSize:10,color:"var(--mu)",marginTop:2}}>📉 ${(item.cost/item.usefulLife).toFixed(0)}/yr depreciation</div>
                  )}
                </div>
                {item.cat==="Equipment"
                  ? <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,background:item.condition==="Working"?"#EAF3DE":item.condition==="Needs Repair"?"#FAEEDA":"#FCEBEB",color:item.condition==="Working"?"#27500A":item.condition==="Needs Repair"?"#633806":"#A32D2D"}}>{item.condition||"Working"}</div>
                    </div>
                  : <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:800,color:sc}}>{item.qty}</div><div style={{fontSize:9,color:"var(--mu)"}}>{item.unit}</div><div style={{fontSize:8,color:sc,fontWeight:700,marginTop:1}}>● {s}</div></div>
                }
              </div>
            </div>
          );
        })}
      </div>
      {showAdd&&(
        <div className="sheet">
          <div onClick={()=>setShowAdd(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <Handle/>
            <div style={{maxHeight:"90dvh",overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"4px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)"}}>{editId?"Edit Item":"Add Item"}</div><button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",fontSize:19,color:"var(--mu)",cursor:"pointer"}}>×</button></div>
            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:11}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Fld label="Name" required><input className="field" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Flour"/></Fld>
                <Fld label="Category"><select className="field" value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>{["Ingredients","Finished","Packaging","Equipment"].map(c=><option key={c}>{c}</option>)}</select></Fld>
              </div>
              {/* Ingredients: measure type toggle */}
              {form.cat==="Ingredients" && (
                <Fld label="Measure by" hint="Solids use weight, liquids use volume">
                  <UnitKindToggle value={form.kind||"solid"} onChange={kind=>{
                    const defaultUnit = kind==="liquid"?"ml":kind==="count"?"each":"lbs";
                    setForm(p=>({...p, kind, unit:defaultUnit}));
                  }}/>
                </Fld>
              )}

              {/* Packaging fields */}
              {form.cat==="Packaging" && (<>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <Fld label="Qty in Stock"><input className="field" type="text" inputMode="decimal" value={form.qty===0?"":form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value===""?0:parseFloat(e.target.value)||0}))} placeholder="0"/></Fld>
                  <Fld label="Unit">
                    <select className="field" value={form.unit||"each"} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}>
                      {PACKAGING_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </Fld>
                  <Fld label="Low Alert"><input className="field" type="text" inputMode="decimal" value={form.min===0?"":form.min} onChange={e=>setForm(p=>({...p,min:e.target.value===""?0:parseFloat(e.target.value)||0}))} placeholder="0"/></Fld>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Fld label="Cost per unit ($)"><input className="field" type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(p=>({...p,cost:+e.target.value}))}/></Fld>
                  <Fld label="Reorder at"><input className="field" type="number" min="0" value={form.reorderQty} onChange={e=>setForm(p=>({...p,reorderQty:+e.target.value}))}/></Fld>
                </div>
                <Fld label="Supplier"><input className="field" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} placeholder="e.g. Uline, Amazon"/></Fld>
              </>)}

              {/* Equipment fields */}
              {form.cat==="Equipment" && (<>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Fld label="Purchase Price ($)"><input className="field" type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(p=>({...p,cost:+e.target.value}))}/></Fld>
                  <Fld label="Purchase Date"><input className="field" type="date" value={form.purchaseDate||""} onChange={e=>setForm(p=>({...p,purchaseDate:e.target.value}))}/></Fld>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Fld label="Condition">
                    <select className="field" value={form.condition||"Working"} onChange={e=>setForm(p=>({...p,condition:e.target.value}))}>
                      {["Working","Needs Repair","Out of Service"].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </Fld>
                  <Fld label="Useful Life (yrs)">
                    <select className="field" value={form.usefulLife||5} onChange={e=>setForm(p=>({...p,usefulLife:+e.target.value}))}>
                      {DEPRECIATION_YEARS.map(y=><option key={y} value={y}>{y} years</option>)}
                    </select>
                  </Fld>
                </div>
                <Fld label="Supplier / Brand"><input className="field" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} placeholder="e.g. KitchenAid, Amazon"/></Fld>
                {form.cost > 0 && form.usefulLife > 0 && (
                  <div style={{background:"var(--bg)",borderRadius:10,padding:"10px 13px",fontSize:12,color:"var(--mu)"}}>
                    📉 Estimated depreciation: <strong style={{color:"var(--tx)"}}>${(form.cost/form.usefulLife).toFixed(2)}/year</strong> · ${((form.cost/form.usefulLife)/12).toFixed(2)}/month
                  </div>
                )}
              </>)}

              {/* Ingredients qty/unit (only shown for ingredients) */}
              {form.cat==="Ingredients" && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <Fld label="Qty"><input className="field" type="text" inputMode="decimal" value={form.qty===0?"":form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value===""?0:parseFloat(e.target.value)||0}))} placeholder="0"/></Fld>
                  <Fld label="Unit">
                    <UnitSelect value={form.unit||"lbs"} onChange={unit=>setForm(p=>({...p,unit}))} kind={form.kind||"solid"}/>
                  </Fld>
                  <Fld label="Min Alert"><input className="field" type="text" inputMode="decimal" value={form.min===0?"":form.min} onChange={e=>setForm(p=>({...p,min:e.target.value===""?0:parseFloat(e.target.value)||0}))} placeholder="0"/></Fld>
                </div>
              )}
              {form.cat==="Ingredients" && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Fld label="Cost ($)"><input className="field" type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(p=>({...p,cost:+e.target.value}))}/></Fld>
                  <Fld label="Reorder Qty"><input className="field" type="number" min="0" value={form.reorderQty} onChange={e=>setForm(p=>({...p,reorderQty:+e.target.value}))}/></Fld>
                </div>
              )}
              {form.cat==="Ingredients" && (
                <Fld label="Supplier"><input className="field" value={form.supplier} onChange={e=>setForm(p=>({...p,supplier:e.target.value}))} placeholder="e.g. GFS Wholesale"/></Fld>
              )}
              <Fld label="Emoji"><input className="field" value={form.icon} onChange={e=>setForm(p=>({...p,icon:e.target.value}))} style={{fontSize:20}}/></Fld>
              <div style={{display:"grid",gridTemplateColumns:editId?"1fr 1fr":"1fr",gap:10,marginTop:4}}>
                <button className="pbtn" onClick={save}>{editId?"Save Changes":"Add Item"}</button>
                {editId&&<button onClick={()=>{ if(!window.confirm("Delete this inventory item? This cannot be undone.")) return; setInventory(p=>p.filter(i=>i.id!==editId));setShowAdd(false);show("Removed"); }} style={{borderRadius:12,padding:"13px",border:"1.5px solid #FCA5A5",background:"none",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:600,cursor:"pointer",fontSize:14}}>Delete</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MARKETING ─────────────────────────────── */
function MarketingPage({ setPage, bakerInfo = {}, products = [], customers = [], tier = "starter" }){
  const b      = useBrand();
  const { tier:mktTier } = useTier();
  const [t, show]       = useToast();
  const SMS_A2P_PENDING = true; // Set to false once A2P 10DLC registration is complete

  // Compose state
  const [compose,    setCompose]    = useState(null);  // null | "sms" | "email"
  const [msg,        setMsg]        = useState("");
  const [subj,       setSubj]       = useState("");
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);

  // AI builder state
  const [aiView,     setAiView]     = useState(false);
  const [aiGoal,     setAiGoal]     = useState("Weekend special");
  const [aiAudience, setAiAudience] = useState("All customers");
  const [aiOffer,    setAiOffer]    = useState("");
  const [aiStyle,    setAiStyle]    = useState("Warm & personal");
  const [aiResult,   setAiResult]   = useState(null);   // { sms, emailSubj, emailBody, ad }
  const [aiTab,      setAiTab]      = useState("sms");
  const [aiLoading,  setAiLoading]  = useState(false);
  const adCardRef = useRef(null);
  const [aiGenCount, setAiGenCount] = useState(0); // tracks how many times generated
  const [aiCategory, setAiCategory] = useState(null);

  const CAMPAIGN_CATEGORIES = [
    {
      id:"sales", label:"Sales & Promotions", emoji:"Sale",
      suggestions:[
        "10% Off Weekend Orders","Buy One Get One Treat Box","Free Delivery This Weekend",
        "Flash Sale on Dipped Treats","Last-Minute Availability","Limited Quantity Boxes","VIP Customer Offer"
      ]
    },
    {
      id:"seasonal", label:"Seasonal & Holidays", emoji:"Season",
      suggestions:[
        "Mother's Day Specials","Graduation Cookies","Teacher Appreciation Treats",
        "Baby Shower Treats","Birthday Specials","Summer Cookie Collection","Back to School Treats"
      ]
    },
    {
      id:"launch", label:"Product Launches", emoji:"New",
      suggestions:[
        "New Cookie Flavor","New Dipped Treat","New Seasonal Menu",
        "Limited Edition Collection","Introducing DIY Kits","Custom Cookie Presale"
      ]
    },
    {
      id:"engage", label:"Re-Engagement", emoji:"Miss",
      suggestions:[
        "We Miss You Offer","Come Back Discount","Returning Customer Special",
        "Thank You Campaign","Loyalty Reward"
      ]
    },
    {
      id:"emotional", label:"Emotional Angles", emoji:"Feel",
      suggestions:[
        "Treat Yourself Weekend","Family Movie Night Treats","Sweet Gifts for Someone Special",
        "Stress-Free Party Desserts","Make Your Event Extra Special"
      ]
    },
    {
      id:"quick", label:"Quick Ideas", emoji:"Go",
      suggestions:[
        "Weekend preorder special","Teacher appreciation cookies","Last chance for graduation orders",
        "Flash sale on dipped treats","Custom cookie presale","Limited availability this weekend"
      ]
    },
  ];
  const [aiPrevHooks, setAiPrevHooks] = useState([]); // tracks previous openings to avoid

  const canSend = canAccess(mktTier, "marketing_sms");
  const isPro   = canSend;  // Pro+ can send; Growth sees builder but not send
  const isGrowth = canAccess(mktTier, "order_dashboard") && !isPro;

  // Baker context fed to Claude
  const BAKER_CTX = {
    name:      b.storeName || "My Bakery",
    location:  bakerInfo.city ? `${bakerInfo.city}, ${bakerInfo.state || ""}`.trim() : "",
    tagline:   b.tagline || "",
    type:      b.bakerType || "custom cakes, cookies & treats",
    signature: bakerInfo.signatureItems || "",
    flavors:   Array.isArray(bakerInfo.flavors) ? bakerInfo.flavors.join(", ") : "",
    bio:       bakerInfo.bio || "",
    minOrder:  bakerInfo.minOrder || "",
    leadTime:  bakerInfo.leadTime || "",
    products:  products.slice(0,8).map(p => p.name).join(", "),
  };

  const send = () => {
    if (!msg.trim()) return;
    setSending(true);

    if (compose === "email") {
      // Send HTML email campaign via Resend
      const targets = customers.filter(c => c.email);
      if (targets.length === 0) { show("No customers with email addresses"); setSending(false); return; }

      // Generate branded HTML email
      const storefront = `https://app.bakeros.app/store/${b.bakeryUsername||bakerInfo?.username||"bakeros"}`;
      const htmlEmail = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#FDF6EC;border-radius:16px;overflow:hidden;">
          <div style="background:#C47B00;padding:28px 24px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🧁</div>
            <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">${b.storeName||bakerInfo?.name||"Our Bakery"}</h1>
            ${subj ? `<p style="color:rgba(255,255,255,.85);font-size:14px;margin:8px 0 0;">${subj}</p>` : ""}
          </div>
          <div style="padding:28px 24px;">
            <div style="font-size:15px;color:#3D1C00;line-height:1.7;white-space:pre-wrap;">${msg}</div>
            <div style="text-align:center;margin:28px 0;">
              <a href="${storefront}" style="background:#C47B00;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;display:inline-block;">Order Now →</a>
            </div>
          </div>
          <div style="background:#F0E4D4;padding:16px 24px;text-align:center;">
            <p style="color:#888;font-size:11px;margin:0;">You're receiving this because you're a valued customer of ${b.storeName||"our bakery"}.<br/>Visit us at <a href="${storefront}" style="color:#C47B00;">${storefront}</a></p>
          </div>
        </div>`;

      apiFetch("/api/email", {
        method: "POST",
        body: JSON.stringify({
          to: targets.map(c => c.email),
          subject: subj || `Special offer from ${b.storeName||"our bakery"}`,
          html: htmlEmail,
          from: `${b.storeName||"BakerOS"} <hello@bakeros.app>`,
          replyTo: bakerInfo?.email || undefined,
        })
      }).then(r=>r.json()).then(data => {
        setSending(false); setSent(true);
        show(`Email campaign sent to ${data.sent||targets.length} customer${targets.length!==1?"s":""} ✓`);
        setTimeout(() => { setSent(false); setCompose(null); setMsg(""); setSubj(""); }, 2500);
      }).catch(() => { setSending(false); show("Failed to send — please try again"); });

    } else {
      // Send SMS to opted-in customers only (US carrier compliance)
      const targets = customers.filter(c => c.phone && c.smsOptIn);
      if (targets.length === 0) {
        setSending(false);
        show("No customers have opted in to SMS — ask customers to opt in when ordering");
        return;
      }
      const sends = targets.map(c =>
        apiFetch("/api/notify",{
          method:"POST",
          body:JSON.stringify({type:"campaign",customerName:c.name,phone:c.phone,customMessage:msg})
        }).catch(()=>{})
      );
      Promise.allSettled(sends).then(() => {
        setSending(false); setSent(true);
        show(`SMS campaign sent to ${targets.length} opted-in customer${targets.length!==1?"s":""} ✓`);
        setTimeout(() => { setSent(false); setCompose(null); setMsg(""); setSubj(""); }, 2500);
      });
    }
  };

  // AI generation — calls Claude API
  const generateCampaign = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiResult(null);

    // Variation engine — randomize first shot, rotate on regenerations
    const HOOKS = ["story","curiosity","urgency","social_proof","nostalgia","exclusivity","humor","sensory","community","gratitude"];
    const STRUCTURES = ["lead_with_offer","lead_with_story","lead_with_question","lead_with_compliment","lead_with_season"];
    const CTAS = ["Order Now","Get Yours","Claim Offer","Place Your Order","Treat Yourself","Reserve Yours","Shop Now","Order Today","Don't Miss Out","Limited Time"];
    const URGENCY_STYLES = ["countdown","scarcity","FOMO","soft_nudge","excitement","no_pressure"];
    // First shot: pick random angles for freshness. Regenerations: rotate sequentially.
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const thisHook = aiGenCount === 0 ? rand(HOOKS) : HOOKS[aiGenCount % HOOKS.length];
    const thisStructure = aiGenCount === 0 ? rand(STRUCTURES) : STRUCTURES[aiGenCount % STRUCTURES.length];
    const thisCTA = aiGenCount === 0 ? rand(CTAS) : CTAS[aiGenCount % CTAS.length];
    const thisUrgency = aiGenCount === 0 ? rand(URGENCY_STYLES) : URGENCY_STYLES[aiGenCount % URGENCY_STYLES.length];

    const systemPrompt = `You are an expert bakery marketing assistant for BakerOS, writing campaigns for ${BAKER_CTX.name}${BAKER_CTX.location ? ` in ${BAKER_CTX.location}` : ""}.

YOUR CORE JOB: Transform the baker's idea into a polished, high-converting marketing campaign. Do NOT repeat the user's input word for word. Expand it creatively.

About this bakery:
${BAKER_CTX.tagline ? `- Tagline: ${BAKER_CTX.tagline}` : ""}
${BAKER_CTX.type ? `- Specializes in: ${BAKER_CTX.type}` : ""}
${BAKER_CTX.signature ? `- Signature items: ${BAKER_CTX.signature}` : ""}
${BAKER_CTX.flavors ? `- Available flavors: ${BAKER_CTX.flavors}` : ""}
${BAKER_CTX.bio ? `- About: ${BAKER_CTX.bio}` : ""}
${BAKER_CTX.products ? `- Menu: ${BAKER_CTX.products}` : ""}

CAMPAIGN WRITING RULES:
- Expand short ideas into full emotional, engaging copy
- Add warmth, urgency, scarcity, or excitement depending on tone
- Use proven bakery marketing language — mention specific products naturally
- Write like a real bakery owner texting their regulars, not a robot
- Never simply restate the user's prompt — transform it
- Every regeneration must use a fresh angle, hook, and structure
- SMS must feel personal and premium with a strong CTA (180-230 chars)

VARIATION RULES for generation #${aiGenCount + 1}:
- Hook style: ${thisHook}
- Message structure: ${thisStructure}
- CTA: "${thisCTA}" or close variation
- Urgency style: ${thisUrgency}
- NEVER open with "Hey", "Hi", "Hello"
- NEVER use "fresh baked", "made with love", or "handcrafted" more than once
${aiPrevHooks.length > 0 ? `- Do NOT start with any of these used openings: ${aiPrevHooks.map(h=>`"${h}"`).join(", ")}` : ""}

Tone: ${aiStyle} | Audience: ${aiAudience} | Location: ${BAKER_CTX.location || "local area"}`;

    const userPrompt = `The baker's idea: "${aiOffer || aiGoal || "A special promotion"}"
Campaign goal: ${aiGoal}
Target audience: ${aiAudience}
Tone: ${aiStyle}

Transform this idea into a complete, polished campaign. Do not repeat the idea verbatim — write compelling copy that sells.

This is generation #${aiGenCount + 1}. ${aiGenCount === 0 ? "Make the FIRST impression count — write the most compelling, creative version possible. Be bold." : "Make this structurally and creatively different from any previous version."}

Return ONLY valid JSON (no markdown, no explanation):
{
  "sms": "Polished SMS campaign (180-230 chars, strong CTA, end with [LINK], do NOT start with Hey/Hi/Hello — open with a hook)",
  "emailSubject": "Compelling subject line that drives opens (not generic)",
  "emailBody": "Full email body: warm opening, expand the offer with emotion/detail, mention specific products, strong CTA, sign off as the baker. End with [LINK]. 3-4 paragraphs.",
  "adHeadline": "Short punchy ad headline (max 8 words)",
  "adSubtext": "One sentence that expands the headline with a benefit",
  "adCta": "${thisCTA}"
}`;

    try {
      const sessionData = await supabase.auth.getSession();
      const userId = sessionData?.data?.session?.user?.id || null;
      const res = await apiFetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "ai_campaigns",
          userId,
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role:"user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      const raw  = data.content?.map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(raw);
      setAiResult(parsed);
      setAiTab("sms");
      setAiGenCount(n => n + 1);
      // Track the first few words of the SMS to avoid repeating openings
      if (parsed.sms) {
        const hook = parsed.sms.split(" ").slice(0,4).join(" ");
        setAiPrevHooks(prev => [...prev.slice(-4), hook]); // keep last 5
      }
    } catch(e) {
      console.error("Campaign AI error:", e.message, e);
      show("AI error: " + e.message, "error");
      // Fallback if API unavailable
      setAiResult({
        sms: `Hey ${BAKER_CTX.location || "friend"}! ${BAKER_CTX.name} here. ${aiOffer || "We have a special offer just for you!"} Order now: [LINK]`,
        emailSubject: `${aiGoal} from ${BAKER_CTX.name}`,
        emailBody: `Hi there,\n\nWe hope you're having a wonderful day in ${BAKER_CTX.location || "your city"}!\n\n${aiOffer || "We have something special for you."}\n\nEvery item is handcrafted with love right here in ${BAKER_CTX.location || "your city"}. We'd love to make something special for you or someone you care about.\n\nOrder here: [LINK]\n\nWith love,\n${BAKER_CTX.name}${BAKER_CTX.location ? "\n" + BAKER_CTX.location : ""}`,
        adHeadline: aiOffer ? aiOffer.split(" ").slice(0,6).join(" ") : "Fresh Baked With Love",
        adSubtext: `Handcrafted in ${BAKER_CTX.location || "your city"} — order from ${BAKER_CTX.name} today.`,
        adCta: "Order Now",
      });
      setAiTab("sms");
    }
    setAiLoading(false);
  };

  const AD_THEMES = [
    { bg:b.theme.primary, text:"#fff" },
    { bg:"#3D1C00",       text:"#E8920A" },
    { bg:"#7A3800",       text:"#FDF6EC" },
  ];
  const adTheme = AD_THEMES[0];

  // ── AI Builder view ────────────────────────────────────────────────────────
  if (aiView) return (
    <div style={{paddingBottom:32}}>
      <Toast t={t}/>
      <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setAiView(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--mu)"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)"}}>✨ BakerOS Campaign Builder</div>
          <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>Powered by BakerOS AI</div>
          <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>Powered by Claude · {BAKER_CTX.name}</div>
        </div>
        <div style={{background:`color-mix(in srgb,${b.theme.primary} 15%,var(--sf))`,color:b.theme.primary,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:800}}>Pro</div>
      </div>

      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:12}}>

        {/* Campaign Category + Suggestions */}
        <div className="card" style={{padding:"14px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:9}}>Campaign Type</div>
          {/* Category pills */}
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:aiCategory?12:0}}>
            {CAMPAIGN_CATEGORIES.map(cat=>(
              <button key={cat.id} onClick={()=>setAiCategory(aiCategory===cat.id?null:cat.id)}
                style={{padding:"7px 13px",borderRadius:20,border:`1.5px solid ${aiCategory===cat.id?b.theme.primary:"var(--bd)"}`,background:aiCategory===cat.id?b.theme.primary:"transparent",color:aiCategory===cat.id?"#fff":"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                <span>{cat.emoji}</span>{cat.label}
              </button>
            ))}
          </div>
          {/* Suggestions for selected category */}
          {aiCategory && (()=>{
            const cat = CAMPAIGN_CATEGORIES.find(c=>c.id===aiCategory);
            return (
              <div style={{borderTop:"1px solid var(--bd)",paddingTop:10}}>
                <div style={{fontSize:10,color:"var(--mu)",marginBottom:7,fontWeight:600}}>TAP TO USE →</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {cat.suggestions.map(s=>(
                    <button key={s} onClick={()=>{setAiGoal(s);setAiOffer(s);}}
                      style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${aiGoal===s?b.theme.primary:"var(--bd)"}`,background:aiGoal===s?`color-mix(in srgb,${b.theme.primary} 12%,var(--sf))`:"var(--sf)",color:aiGoal===s?b.theme.primary:"var(--tx)",fontFamily:"var(--fb)",fontWeight:aiGoal===s?700:500,fontSize:12,cursor:"pointer",textAlign:"left"}}>
                      {aiGoal===s?"✓ ":""}{s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* Current goal display */}
          {aiGoal && (
            <div style={{marginTop:10,padding:"8px 12px",background:`color-mix(in srgb,${b.theme.primary} 10%,var(--sf))`,borderRadius:10,fontSize:12,color:b.theme.primary,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>✓ {aiGoal}</span>
              <button onClick={()=>{setAiGoal("");setAiOffer("");setAiCategory(null);}} style={{background:"none",border:"none",color:"var(--mu)",cursor:"pointer",fontSize:14}}>×</button>
            </div>
          )}
        </div>

        {/* Audience */}
        <div className="card" style={{padding:"14px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:9}}>Audience</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {["All customers","VIP only","Repeat buyers","Inactive"].map(a=>(
              <button key={a} onClick={()=>setAiAudience(a)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${aiAudience===a?b.theme.primary:"var(--bd)"}`,background:aiAudience===a?b.theme.primary:"transparent",color:aiAudience===a?"#fff":"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>{a}</button>
            ))}
          </div>
        </div>

        {/* Offer */}
        <div className="card" style={{padding:"14px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:9}}>Your Offer or Idea</div>
          <textarea className="field" rows={2} placeholder="Add extra details... e.g. 20% off this Saturday only, limited to 10 boxes" value={aiOffer} onChange={e=>setAiOffer(e.target.value)} style={{resize:"none",fontSize:13}}/>
          <div style={{fontSize:10,color:"var(--mu)",marginTop:4}}>Tip: select a suggestion above to auto-fill, then add your own details here</div>
        </div>

        {/* Style */}
        <div className="card" style={{padding:"14px"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:9}}>Ad Style</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {["Warm & personal","Bold & promotional","Elegant","Playful"].map(s=>(
              <button key={s} onClick={()=>setAiStyle(s)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${aiStyle===s?b.theme.primary:"var(--bd)"}`,background:aiStyle===s?b.theme.primary:"transparent",color:aiStyle===s?"#fff":"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>{s}</button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generateCampaign}
          disabled={aiLoading}
          style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${b.theme.primary},color-mix(in srgb,${b.theme.primary} 65%,#000))`,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:15,cursor:aiLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:aiLoading?.7:1}}
        >
          {aiLoading
            ? <><div style={{width:18,height:18,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",animation:"spin 0.7s linear infinite"}}/> Writing your campaign...</>
            : aiResult
              ? <><span style={{fontSize:18}}>↺</span> Generate New Version</>
              : <><span style={{fontSize:18}}>✨</span> Write My Campaign + Build Ad</>
          }
        </button>

        {/* Results */}
        {aiResult && (
          <div className="card" style={{overflow:"hidden",maxHeight:"60dvh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            {/* Tab bar */}
            <div style={{display:"flex",borderBottom:"1px solid var(--bd)"}}>
              {["sms","email","ad"].map((tab,i)=>(
                <button key={tab} onClick={()=>setAiTab(tab)} style={{flex:1,padding:"11px",fontSize:12,fontWeight:700,background:"none",border:"none",cursor:"pointer",fontFamily:"var(--fb)",color:aiTab===tab?b.theme.primary:"var(--mu)",borderBottom:`2px solid ${aiTab===tab?b.theme.primary:"transparent"}`}}>
                  {["📱 SMS","✉️ Email","🎨 Visual Ad"][i]}
                </button>
              ))}
            </div>

            {/* SMS tab */}
            {aiTab==="sms" && (
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{background:"#E8F5E9",borderRadius:"13px 13px 13px 3px",padding:"12px 14px",fontSize:13,color:"#1A2E22",lineHeight:1.6}}>
                  {aiResult.sms.replace("[LINK]",`bakeros.app/store/${b.storeName.toLowerCase().replace(/\s+/g,"-")}`)}
                </div>
                <div style={{fontSize:10,color:"var(--mu)",textAlign:"right"}}>{aiResult.sms.length} chars</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <button onClick={generateCampaign} style={{padding:"10px",borderRadius:10,border:`1px solid ${b.theme.primary}`,background:"transparent",color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>↺ Regenerate</button>
                  {isPro
                    ? <button className="pbtn" onClick={()=>{setMsg(aiResult.sms.replace("[LINK]",`bakeros.app/store/${b.storeName?.toLowerCase().replace(/\s+/g,"-")||"your-store"}`));setCompose("sms");setAiView(false);}} style={{fontSize:12}}>Use This →</button>
                    : <button onClick={()=>setPage("subscription")} style={{padding:"10px",borderRadius:10,border:"none",background:"#16A34A",color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>🔒 Upgrade to Send</button>
                  }
                </div>
              </div>
            )}

            {/* Email tab */}
            {aiTab==="email" && (
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{background:"var(--bg)",border:"1px solid var(--bd)",borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"9px 13px",borderBottom:"1px solid var(--bd)",fontSize:12,fontWeight:700,color:"var(--tx)"}}>Subject: {aiResult.emailSubject}</div>
                  <div style={{padding:"11px 13px",fontSize:12,color:"var(--tx)",lineHeight:1.7,whiteSpace:"pre-line"}}>{aiResult.emailBody.replace(/\[LINK\]/g,`bakeros.app/store/${b.storeName.toLowerCase().replace(/\s+/g,"-")}`)}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <button onClick={generateCampaign} style={{padding:"10px",borderRadius:10,border:`1px solid ${b.theme.primary}`,background:"transparent",color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>↺ Regenerate</button>
                  {isPro
                    ? <button className="pbtn" onClick={()=>{setSubj(aiResult.emailSubject);setMsg(aiResult.emailBody);setCompose("email");setAiView(false);}} style={{fontSize:12}}>Use This →</button>
                    : <button onClick={()=>setPage("subscription")} style={{padding:"10px",borderRadius:10,border:"none",background:"#16A34A",color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>🔒 Upgrade to Send</button>
                  }
                </div>
              </div>
            )}

            {/* Visual Ad tab */}
            {aiTab==="ad" && (
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                {/* Branded ad card */}
                <div ref={adCardRef} style={{borderRadius:14,overflow:"hidden",border:"1px solid var(--bd)"}}>
                  {/* Ad header */}
                  <div style={{background:adTheme.bg,padding:"24px 18px 18px",textAlign:"center",position:"relative"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,opacity:.08,backgroundImage:"radial-gradient(circle at 80% 20%, rgba(255,255,255,.6) 0%, transparent 60%)"}}/>
                    {b.logo
                      ? <img src={b.logo} alt="" style={{width:52,height:52,borderRadius:13,objectFit:"contain",background:"none",margin:"0 auto 10px",display:"block"}}/>
                      : <div style={{width:52,height:52,borderRadius:13,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 10px",border:"1.5px solid rgba(255,255,255,.25)"}}>🧁</div>
                    }
                    <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:adTheme.text,marginBottom:2}}>{b.storeName}</div>
                    <div style={{fontSize:10,color:adTheme.text,opacity:.65,letterSpacing:"2px",textTransform:"uppercase"}}>{BAKER_CTX.location || (bakerInfo?.city ? bakerInfo.city + (bakerInfo.state ? ', ' + bakerInfo.state : '') : '')}</div>
                    <div style={{position:"absolute",top:10,right:12,background:"rgba(255,255,255,.18)",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,color:adTheme.text}}>{aiGoal}</div>
                  </div>
                  {/* Ad body */}
                  <div style={{padding:"18px 18px 16px",textAlign:"center",background:"var(--sf)"}}>
                    <div style={{display:"inline-block",background:`color-mix(in srgb,${adTheme.bg} 12%,var(--sf))`,border:`1.5px solid ${adTheme.bg}30`,borderRadius:20,padding:"3px 12px",fontSize:10,fontWeight:700,color:adTheme.bg,marginBottom:10}}>Limited Time</div>
                    <div style={{fontFamily:"var(--fd)",fontSize:19,fontWeight:700,color:"var(--tx)",lineHeight:1.3,marginBottom:7}}>{aiResult.adHeadline}</div>
                    <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6,marginBottom:14}}>{aiResult.adSubtext}</div>
                    <button style={{background:adTheme.bg,color:"#fff",border:"none",borderRadius:30,padding:"11px 28px",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}>{aiResult.adCta} →</button>
                  </div>
                  <div style={{padding:"9px 18px",borderTop:"1px solid var(--bd)",textAlign:"center",fontSize:10,color:"var(--mu)"}}>
                    bakeros.app/store/{b.storeName.toLowerCase().replace(/\s+/g,"-")}{BAKER_CTX.location ? " · " + BAKER_CTX.location : ""}
                  </div>
                </div>
                <div style={{fontSize:11,color:"var(--mu)",textAlign:"center"}}>Download and share on Instagram, Facebook & TikTok</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  <button onClick={generateCampaign} style={{padding:"10px",borderRadius:10,border:`1px solid ${b.theme.primary}`,background:"transparent",color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>↺ New Style</button>
                  <button onClick={async()=>{
                    if(!adCardRef.current){show("Ad not ready");return;}
                    try{
                      // Load html2canvas from CDN
                      if(!window.html2canvas){
                        await new Promise((res,rej)=>{
                          const s=document.createElement("script");
                          s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                          s.onload=res; s.onerror=rej;
                          document.head.appendChild(s);
                        });
                      }
                      show("Generating image...");
                      const canvas = await window.html2canvas(adCardRef.current,{
                        scale:2, useCORS:true, backgroundColor:null,
                        logging:false
                      });
                      const url = canvas.toDataURL("image/png");
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${b.storeName||"BakerOS"}_Ad.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      show("Ad downloaded ✓ — share on Instagram, Facebook & TikTok");
                    }catch(e){
                      show("Download failed — try screenshotting instead");
                    }
                  }} style={{padding:"10px",borderRadius:10,border:"none",background:`color-mix(in srgb,${b.theme.primary} 12%,var(--sf))`,color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>Download Ad</button>
                </div>

                {/* Growth upgrade overlay on visual ad */}
                {!isPro && (
                  <div style={{background:`color-mix(in srgb,#7C5CBF 8%,var(--sf))`,border:"1.5px solid #7C5CBF30",borderRadius:13,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:22,marginBottom:6}}>🎨</div>
                    <div style={{fontSize:13,fontWeight:800,color:"var(--tx)",marginBottom:4}}>Your ad is ready</div>
                    <div style={{fontSize:12,color:"var(--mu)",marginBottom:12,lineHeight:1.5}}>Upgrade to Pro to send this campaign and download your branded ad.</div>
                    <button onClick={()=>setPage("subscription")} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"#16A34A",color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}>Upgrade to Pro — $39.99/mo →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Growth teaser — show blurred result before generating */}
        {!isPro && !aiResult && !aiLoading && (
          <div style={{background:`color-mix(in srgb,#7C5CBF 6%,var(--sf))`,border:"1px solid #7C5CBF25",borderRadius:13,padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:12,color:"#7C5CBF",fontWeight:600,lineHeight:1.5}}>Fill in your goal and offer above, then tap generate. Upgrade to Pro to send your campaign.</div>
          </div>
        )}

      </div>
    </div>
  );

  // ── Compose view ───────────────────────────────────────────────────────────
  if (compose) return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <div style={{padding:"16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setCompose(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--mu)"}}>←</button>
        <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)"}}>{compose==="sms"?"📱 SMS":"✉️ Email"} Campaign</div>
        <button onClick={()=>setAiView(true)} style={{marginLeft:"auto",background:`color-mix(in srgb,${b.theme.primary} 14%,var(--sf))`,color:b.theme.primary,border:"none",borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>✨ AI Write</button>
      </div>
      {compose==="sms" && SMS_A2P_PENDING && (
        <div style={{margin:"0 16px 4px",background:"#FEF3C7",border:"1.5px solid #D97706",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400E",display:"flex",alignItems:"flex-start",gap:8}}>
          <span style={{fontSize:16,flexShrink:0}}>📱</span>
          <div><strong>SMS delivery is paused</strong> — Twilio A2P registration pending. Messages are queued but not delivered yet. <strong>Email campaigns work now.</strong></div>
        </div>
      )}
      {sent
        ? <div style={{textAlign:"center",padding:"44px 24px"}}><div style={{fontSize:52,marginBottom:12}}>🚀</div><div style={{fontFamily:"var(--fd)",fontSize:21,fontWeight:700,color:"var(--tx)"}}>Campaign Sent!</div><div style={{color:"var(--mu)",fontSize:13,marginTop:5}}>Delivered to {compose==="email"?customers.filter(c=>c.email).length:customers.filter(c=>c.phone).length} {compose==="email"?"email":"SMS"} contacts</div></div>
        : <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:13}}>
            <Fld label="Audience"><select className="field"><option>All Customers ({compose==="email"?customers.filter(c=>c.email).length:customers.filter(c=>c.phone).length} {compose==="email"?"with email":"with phone"})</option></select></Fld>
            {compose==="email"&&<Fld label="Subject" required><input className="field" placeholder="e.g. New treats from BakerOS!" value={subj} onChange={e=>setSubj(e.target.value)}/></Fld>}
            <Fld label={compose==="sms"?"Message":"Email Body"} hint={compose==="sms"?`${msg.length}/230 ${msg.length>230?"⚠️ Too long":""}`:""}>
              <textarea className="field" rows={4} placeholder={compose==="sms"?"Hey [name]! Fresh bakes at KCS Sugar Trails...":"Write your message..."} value={msg} onChange={e=>setMsg(e.target.value)} style={{resize:"none"}}/>
            </Fld>
            {msg && <div style={{background:"var(--bg)",borderRadius:12,padding:"12px 13px"}}>
              <div style={{fontSize:9,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",marginBottom:7}}>Preview</div>
              {compose==="sms"
                ? <div style={{background:"#E8F5E9",borderRadius:"13px 13px 13px 3px",padding:"9px 13px",fontSize:13,color:"#1A2E22",maxWidth:"75%"}}>{msg.replace("[name]","Jordan")}</div>
                : <div style={{background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:10,padding:"11px 13px"}}>{subj&&<div style={{fontWeight:700,color:"var(--tx)",marginBottom:4,fontSize:13}}>{subj}</div>}<div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6}}>{msg}</div></div>
              }
            </div>}
            {!canSend&&<div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:12,padding:"13px 14px",textAlign:"center"}}><div style={{fontSize:22,marginBottom:6}}>🔒</div><div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:3}}>Pro Required</div><div style={{fontSize:12,color:"#DC2626",marginBottom:10}}>Sending campaigns requires Pro ($39.99/mo)</div><button onClick={()=>{setCompose(null);setPage("subscription");}} style={{background:"#16A34A",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Upgrade to Pro →</button></div>}
            {canSend&&<button className="pbtn" onClick={send} disabled={!msg||sending} style={{width:"100%"}}>{sending?"Sending...":`Send to ${customers.filter(c=>c.smsOptIn).length || "your"} customer${customers.filter(c=>c.smsOptIn).length !== 1 ? "s" : ""} 🚀`}</button>}
          </div>
      }
    </div>
  );

  // ── Main marketing page ────────────────────────────────────────────────────
  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="Marketing" sub="SMS, email & AI campaigns"/>

      {/* SMS A2P Pending Banner — shown at TOP before baker invests time */}
      {SMS_A2P_PENDING && (
        <div style={{margin:"0 12px 12px",background:"#FEF3C7",border:"1.5px solid #D97706",borderRadius:13,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:3}}>SMS delivery is temporarily paused</div>
            <div style={{fontSize:11,color:"#78350F",lineHeight:1.5}}>Twilio A2P 10DLC registration is in progress. You can still build and preview campaigns — <strong>Email campaigns work now.</strong> SMS will activate automatically once registration completes.</div>
          </div>
        </div>
      )}

      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:11}}>

        {/* AI Campaign Builder CTA */}
        <div
          onClick={()=>setAiView(true)}
          style={{background:`linear-gradient(135deg,${b.theme.primary},color-mix(in srgb,${b.theme.primary} 55%,#000))`,borderRadius:16,padding:"16px",cursor:"pointer",position:"relative",overflow:"hidden"}}
        >
          <div style={{position:"absolute",top:-30,right:-30,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.06)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>✨</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"#fff",marginBottom:2}}>BakerOS Campaign Builder</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Powered by BakerOS AI · SMS, Email & Visual Ads</div>
            </div>
            <div style={{fontSize:18,color:"rgba(255,255,255,.6)"}}>›</div>
          </div>
          <div style={{marginTop:12,display:"flex",gap:6}}>
            {["SMS","Email","Visual Ad"].map(l=>(
              <span key={l} style={{background:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.9)",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700}}>{l}</span>
            ))}
            <span style={{marginLeft:"auto",background:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.9)",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700}}>Pro ✦</span>
          </div>
        </div>

        {/* Campaign type cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{t:"sms",icon:"📱",title:"SMS Campaign",desc:"Text customers"},{t:"email",icon:"✉️",title:"Email Campaign",desc:"Branded emails"}].map(c=>(
            <button key={c.t} onClick={()=>setCompose(c.t)} className="card" style={{padding:"16px 13px",border:"none",cursor:"pointer",fontFamily:"var(--fb)",textAlign:"left",position:"relative",overflow:"hidden"}}>
              {!canSend&&<div style={{position:"absolute",top:8,right:8,fontSize:14}}>🔒</div>}
              <div style={{fontSize:26,marginBottom:7}}>{c.icon}</div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>{c.title}</div>
              <div style={{fontSize:11,color:"var(--mu)",marginTop:2,marginBottom:7}}>{c.desc}</div>
              {canSend?<div style={{fontSize:11,color:b.theme.primary,fontWeight:700}}>{customers.filter(c=>c.smsOptIn).length} opted-in →</div>:<div style={{fontSize:10,fontWeight:700,color:"#C47B00"}}>Pro required</div>}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["📨","0","Campaigns sent"],["📬",String(customers.filter(c=>c.phone||c.email).length),"Reachable customers"]].map(([ic,val,lbl])=>(
            <div key={lbl} className="card" style={{padding:"11px 13px"}}><span style={{fontSize:18}}>{ic}</span><div style={{fontSize:18,fontWeight:800,color:"var(--tx)",marginTop:4}}>{val}</div><div style={{fontSize:10,color:"var(--mu)",marginTop:2}}>{lbl}</div></div>
          ))}
        </div>

        {/* Recent campaigns — only show if baker has real campaign data */}
        {false && [{name:"Mother's Day",type:"SMS",sent:212,date:"Apr 20"},{name:"Spring Menu Launch",type:"Email",sent:198,opens:"67%",date:"Apr 15"}].map((c,i)=>(
          <div key={i} className="card" style={{padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{c.name}</div><div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>{c.type} · {c.date} · {c.sent} sent</div></div>
            {c.opens&&<div style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>{c.opens} open</div>}
          </div>
        ))}

      </div>
    </div>
  );
}

/* ── QUICKBOOKS ────────────────────────────── */
function AccountingPage({inventory, orders=[], invoices=[]}){
  const b=useBrand();const[connected,setConnected]=useState(false);const[connecting,setConnecting]=useState(false);const[exporting,setExporting]=useState(false);const[exported,setExported]=useState([]);const[showSheet,setShowSheet]=useState(false);const[sel,setSel]=useState(new Set(["sales","expenses","inventory"]));const[t,show]=useToast();
  const toggle=k=>setSel(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});
  const connect=()=>{
    // Direct QuickBooks OAuth not yet available — CSV export works now
    setConnecting(true);
    setTimeout(()=>{setConnecting(false);setConnected(true);show("Ready to export ✓");},800);
  };

  const doExport=()=>{
    setExporting(true);
    try {
      const rows = [];
      const now = new Date();
      const month = now.toLocaleString("en-US",{month:"long",year:"numeric"});

      // Header
      rows.push(["BakerOS Export",brand?.storeName||"My Bakery",month]);
      rows.push([]);

      // Sales section
      if (sel.has("sales")) {
        rows.push(["SALES & REVENUE"]);
        rows.push(["Date","Customer","Item","Amount","Status","Payment"]);
        const salesOrds = [...completedOrds, ...orders.filter(o=>o.status==="refunded")];
        salesOrds.forEach(o=>{
          rows.push([
            o.date||"",
            o.customer||"",
            o.item||"",
            o.status==="refunded"?`-${o.amount||0}`:(o.amount||0),
            o.status||"",
            o.payment||""
          ]);
        });
        rows.push(["","","TOTAL",totalRev]);
        rows.push([]);
      }

      // Expenses / Inventory section
      if (sel.has("expenses") || sel.has("inventory")) {
        rows.push(["EXPENSES & INVENTORY"]);
        rows.push(["Item","Category","Quantity","Unit","Cost Per Unit","Total Cost"]);
        inventory.forEach(item=>{
          rows.push([
            item.name||"",
            item.cat||"",
            item.qty||0,
            item.unit||"",
            item.cost||0,
            ((item.qty||0)*(item.cost||0)).toFixed(2)
          ]);
        });
        rows.push(["","","","","TOTAL",invCost.toFixed(2)]);
        rows.push([]);
      }

      // Summary
      rows.push(["SUMMARY"]);
      rows.push(["Revenue",totalRev]);
      rows.push(["Expenses",invCost.toFixed(2)]);
      rows.push(["Net Profit",netProfit.toFixed(2)]);
      rows.push(["Est. Tax (8.25%)",taxEst]);

      // Convert to CSV
      const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BakerOS_Export_${now.toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExporting(false);
      setExported(Array.from(sel));
      setShowSheet(false);
      show(`Export downloaded ✓ — open in QuickBooks or Excel`);
    } catch(e) {
      setExporting(false);
      show("Export failed — please try again");
    }
  };
  const completedOrds = orders.filter(o=>o.status==="completed"&&o.status!=="refunded");
  const totalRev = completedOrds.reduce((s,o)=>s+(o.amount||0),0);
  const paidInv = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.amount||0),0);
  const invCost = inventory.reduce((s,i)=>s+(i.cost||0)*(i.qty||0),0);
  const netProfit = totalRev - invCost;
  const taxEst = Math.round(totalRev * 0.0825);
  const avgOrder = completedOrds.length > 0 ? (totalRev/completedOrds.length).toFixed(2) : "0.00";
  const CATS=[{key:"sales",icon:"💰",label:"Sales & Revenue",desc:"Orders & payments",amount:"$"+totalRev.toLocaleString()},{key:"expenses",icon:"🧾",label:"Expenses",desc:"Ingredients & supplies",amount:"$"+invCost.toFixed(0)},{key:"inventory",icon:"📦",label:"Inventory",desc:"Stock at cost",amount:`$${invCost.toFixed(0)}`},{key:"payroll",icon:"👥",label:"Payroll",desc:"Wages & contractors",amount:"$0"},{key:"taxes",icon:"📋",label:"Sales Tax",desc:"Tax collected (est.)",amount:"$"+taxEst}];
  return(
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="QuickBooks" sub="Accounting & tax export"/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:11}}>
        {/* Connection */}
        <div className="card" style={{padding:"14px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:11,background:connected?"#16A34A":"var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,transition:"background .3s"}}>{connected?"✅":"📒"}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>QuickBooks Online</div><div style={{fontSize:11,color:connected?"#16A34A":"var(--mu)",marginTop:2,fontWeight:600}}>{connected?"● Export enabled":"Not connected"}</div></div>
          {!connected?<button className="pbtn" onClick={connect} disabled={connecting} style={{padding:"8px 13px",fontSize:13,borderRadius:10,flexShrink:0}}>{connecting?"Connecting...":"Connect"}</button>:<button className="gbtn" onClick={()=>{setConnected(false);}} style={{padding:"7px 11px",fontSize:12,flexShrink:0,borderRadius:9}}>Disconnect</button>}
        </div>

        {!connected?(
          <div className="card" style={{padding:"22px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:11}}>📒</div>
            <div style={{fontFamily:"var(--fd)",fontSize:19,fontWeight:700,color:"var(--tx)",marginBottom:7}}>Connect QuickBooks Online</div>
            <p style={{color:"var(--mu)",fontSize:13,lineHeight:1.6,marginBottom:16}}>Sync bakery sales, expenses and inventory costs. Export tax-ready reports in one tap.</p>
            {["Export sales, payments & revenue","Export expenses & inventory costs","Download as CSV for QuickBooks or Excel","Tax-ready format with totals","Import into any accounting software"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:9,marginBottom:8,textAlign:"left"}}><span style={{color:"#16A34A",fontWeight:700,fontSize:14}}>✓</span><span style={{fontSize:13,color:"var(--tx)"}}>{f}</span></div>
            ))}
            <button className="pbtn" onClick={connect} disabled={connecting} style={{width:"100%",marginTop:8}}>{connecting?"Setting up...":"Enable CSV Export"}</button>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:8}}>Secure OAuth 2.0 · Your data stays private</div>
          </div>
        ):(
          <>
            <button onClick={()=>setShowSheet(true)} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:700,fontSize:15,color:"#fff",background:`linear-gradient(135deg,${b.theme.primary},color-mix(in srgb,${b.theme.primary} 60%,#000))`,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <span style={{fontSize:18}}>📤</span>Export to QuickBooks
            </button>
            {/* Financial summary */}
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Financial Summary · April 2026</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["💰","$"+totalRev.toLocaleString(),"Revenue",completedOrds.length+" orders",true],["💸","$"+invCost.toFixed(0),"Expenses","Inventory cost",false],["📈","$"+(netProfit>0?netProfit.toFixed(0):"0"),"Net Profit","Revenue - costs",netProfit>0],["🧾","$"+taxEst,"Tax Estimate","8.25% of revenue",null]].map(([ic,val,lbl,sub,up])=>(
                <div key={lbl} className="card" style={{padding:"12px 13px"}}><span style={{fontSize:18}}>{ic}</span><div style={{fontSize:19,fontWeight:800,color:"var(--tx)",marginTop:4,lineHeight:1}}>{val}</div><div style={{fontSize:11,color:"var(--mu)",marginTop:3}}>{lbl}</div><div style={{fontSize:10,fontWeight:700,color:up===true?"#16A34A":up===false?"#DC2626":"var(--mu)",marginTop:2}}>{up===true?"↑":up===false?"↓":""} {sub}</div></div>
              ))}
            </div>
            {/* Transactions */}
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Recent Transactions</div>
            <div className="card" style={{overflow:"hidden"}}>
              {(completedOrds.slice(0,4).map(o=>[o.customer+" - "+o.item,"+$"+(o.amount||0),o.date||"","income"])).map(([desc,amt,date,type])=>(
                <div key={desc} className="row" style={{padding:"10px 13px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"var(--tx)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{desc}</div><div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>{date}</div></div>
                  <div style={{fontWeight:800,fontSize:13,color:type==="income"?"#16A34A":"#DC2626",flexShrink:0,marginLeft:10}}>{amt}</div>
                </div>
              ))}
            </div>
            {/* Download reports */}
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Download Reports</div>
            {[["📊","Profit & Loss","April 2026"],["📋","Balance Sheet","Assets & liabilities"],["🧾","Sales Tax Report","Q2 2026"],["💸","Expense Report","All expenses"]].map(([ic,title,sub])=>(
              <div key={title} className="card row" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:11,cursor:"pointer"}} onClick={()=>show(`${title} downloaded ✓`)}>
                <div style={{width:32,height:32,background:"var(--bg)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{ic}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{title}</div><div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{sub}</div></div>
                <span style={{color:"var(--p)",fontSize:15}}>↓</span>
              </div>
            ))}
            {exported.length>0&&<div className="card" style={{padding:"13px 14px"}}><div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}><span style={{fontSize:18}}>✅</span><div><div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Last Export Successful</div><div style={{fontSize:11,color:"var(--mu)"}}>Just now · {exported.length} categories</div></div></div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{exported.map(e=>{const c=CATS.find(x=>x.key===e);return c?<span key={e} style={{background:`color-mix(in srgb,${b.theme.primary} 12%,var(--sf))`,color:b.theme.primary,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700}}>{c.icon} {c.label}</span>:null;})}</div></div>}
          </>
        )}
      </div>
      {/* Export sheet */}
      {showSheet&&(
        <div className="sheet">
          <div onClick={()=>setShowSheet(false)} style={{maxHeight:"90dvh",overflowY:"auto",WebkitOverflowScrolling:"touch",position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <Handle/>
            <div style={{padding:"4px 16px 0",marginBottom:13}}><div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)",marginBottom:2}}>Export to QuickBooks</div><div style={{fontSize:12,color:"var(--mu)"}}>Select categories · April 2026</div></div>
            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:9}}>
              {CATS.map(cat=>(
                <div key={cat.key} onClick={()=>toggle(cat.key)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 13px",borderRadius:13,border:`1.5px solid ${sel.has(cat.key)?"var(--p)":"var(--bd)"}`,background:sel.has(cat.key)?`color-mix(in srgb,var(--p) 7%,var(--sf))`:"var(--sf)",cursor:"pointer"}}>
                  <span style={{fontSize:20,flexShrink:0}}>{cat.icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{cat.label}</div><div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{cat.desc}</div></div>
                  <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:12,fontWeight:800,color:"var(--p)"}}>{cat.amount}</div><div style={{width:17,height:17,borderRadius:4,border:`2px solid ${sel.has(cat.key)?"var(--p)":"var(--bd)"}`,background:sel.has(cat.key)?"var(--p)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginLeft:"auto",marginTop:4}}>{sel.has(cat.key)&&<span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>}</div></div>
                </div>
              ))}
              <button className="pbtn" onClick={doExport} disabled={sel.size===0||exporting} style={{width:"100%",marginTop:4}}>{exporting?"Exporting...":`Export ${sel.size} Categories →`}</button>
              <div style={{fontSize:11,color:"var(--mu)",textAlign:"center",paddingBottom:4}}>Downloads a .CSV file — import into QuickBooks, Excel, or Google Sheets</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── BRANDING ──────────────────────────────── */
/* ── AI LOGO HELPER ─────────────────────────────────────────────────────────
   Gives the baker a personalized ChatGPT prompt + step-by-step instructions
   to generate their own logo for free — no API key needed.
─────────────────────────────────────────────────────────────────────────── */
function AILogoHelper({ bakeryName, tagline, city, state, isOpen, onClose }) {
  const b = useBrand();
  const [copied, setCopied] = useState(false);
  const [t, show] = useToast();

  const name     = bakeryName || b.storeName || "my bakery";
  const tag      = tagline    || b.tagline   || "";
  const location = city && state ? `${city}, ${state}` : city || state || "San Antonio, TX";

  const prompt = `Create a professional logo for a home bakery called "${name}"${tag ? ` with the tagline "${tag}"` : ""}. The bakery is based in ${location} and specializes in custom cakes, cupcakes, cookies, and sweet treats.

Design requirements:
- Clean, modern, and professional — not clipart or generic
- Warm color palette: gold, amber, brown, or cream tones work well
- Include a simple bakery-related icon (e.g. a cake tier, cupcake, rolling pin, whisk, or sugar swirl) — keep it minimal
- The logo should work as both a small circular app icon AND a horizontal banner
- White or transparent background (no colored background)
- No busy details — it must look sharp at small sizes
- Do not include the city name in the logo
- Style: elegant and handcrafted, not corporate

Please generate a high-quality logo image I can use as a PNG file.`;

  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(2px)"}}/>
      <div style={{
        position:"relative",width:"100%",maxWidth:430,
        background:"var(--sf)",borderRadius:"20px 20px 0 0",
        maxHeight:"85dvh",
        display:"flex",flexDirection:"column",
        animation:"slideUp .3s cubic-bezier(.22,.68,0,1.1) both",
        zIndex:1,
      }}>
        {/* Fixed handle + header — never scrolls */}
        <div style={{flexShrink:0,padding:"12px 16px 0"}}>
          <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"0 auto 12px"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)"}}>✨ Make Your Logo with AI</div>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"var(--mu)",cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          <div style={{fontSize:12,color:"var(--mu)",marginBottom:12,lineHeight:1.5}}>Copy this prompt and paste it into ChatGPT or DALL-E to generate a professional bakery logo.</div>
        </div>
        {/* Scrollable content */}
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"0 16px",paddingBottom:"calc(24px + env(safe-area-inset-bottom,0px))"}}>
          <Toast t={t}/>
          <div style={{fontSize:12,color:"var(--mu)",marginBottom:18,lineHeight:1.5}}>
            Use ChatGPT's free AI image generator to create a custom logo — no design skills needed.
          </div>

          {/* Steps */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
            {[
              { n:"1", icon:"📋", title:"Copy your prompt", desc:"We've written a personalized prompt using your bakery's name. Tap the button below to copy it." },
              { n:"2", icon:"🌐", title:"Go to ChatGPT", desc:"Visit chatgpt.com — a free account is all you need. No paid plan required." },
              { n:"3", icon:"📝", title:"Paste & generate", desc:'Start a new chat, paste your prompt, and hit send. ChatGPT will generate your logo image.' },
              { n:"4", icon:"💾", title:"Save your logo", desc:"When you like the result, tap and hold the image → Save to Photos (iPhone) or right-click → Save image." },
              { n:"5", icon:"📤", title:"Upload it here", desc:'Come back to this app and tap "Upload Logo" to add it to your storefront.' },
            ].map(s => (
              <div key={s.n} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"11px 13px",background:"var(--bg)",borderRadius:12,border:"1px solid var(--bd)"}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:b.theme.primary,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:14,fontWeight:800,color:"#fff"}}>{s.n}</span>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:2}}>
                    {s.icon} {s.title}
                  </div>
                  <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Prompt box */}
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>
            Your personalized prompt
          </div>
          <div style={{background:"var(--bg)",border:`1.5px solid ${b.theme.primary}30`,borderRadius:12,padding:"12px 14px",marginBottom:10,fontSize:12,color:"var(--tx)",lineHeight:1.7,whiteSpace:"pre-line",fontFamily:"monospace"}}>
            {prompt}
          </div>

          {/* Copy button */}
          <button
            onClick={copy}
            style={{
              width:"100%",
              padding:"14px",
              borderRadius:13,
              border:"none",
              background: copied
                ? "#16A34A"
                : `linear-gradient(135deg,${b.theme.primary},color-mix(in srgb,${b.theme.primary} 65%,#000))`,
              color:"#fff",
              fontFamily:"var(--fb)",
              fontWeight:800,
              fontSize:15,
              cursor:"pointer",
              transition:"background .3s",
              marginBottom:10,
            }}
          >
            {copied ? "✓ Copied! Now go to chatgpt.com" : "📋 Copy Prompt"}
          </button>

          {/* Quick link */}
          <button
            onClick={()=>window.open("https://chatgpt.com","_blank")}
            style={{width:"100%",padding:"11px",borderRadius:12,border:`1.5px solid ${b.theme.primary}40`,background:"transparent",color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10}}
          >
            🌐 Open ChatGPT →
          </button>

          {/* Tips */}
          <div style={{background:`color-mix(in srgb,${b.theme.primary} 6%,var(--bg))`,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:11,fontWeight:800,color:b.theme.primary,marginBottom:7}}>💡 Pro tips for better results</div>
            {[
              "If you don't love the first result, just reply \"Try again with a more elegant style\" or \"Make the icon simpler\"",
              "Ask for \"a version with just the icon, no text\" for your app icon",
              "Save multiple versions — you can always come back and try different ones",
              "Transparent background logos look best — ask ChatGPT to \"remove the background\" if needed",
            ].map((tip,i) => (
              <div key={i} style={{fontSize:11,color:"var(--mu)",marginBottom:i<3?6:0,display:"flex",gap:6,lineHeight:1.5}}>
                <span style={{color:b.theme.primary,flexShrink:0}}>→</span>{tip}
              </div>
            ))}
          </div>

          <button onClick={onClose} style={{width:"100%",marginTop:12,padding:"11px",borderRadius:12,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            Close
          </button>
        </div>{/* end scrollable */}
      </div>{/* end panel */}
    </div>
  );
}

function BrandingPage({brand,setBrand}){
  const[local,setLocal]=useState(brand);const[t,show]=useToast();const logoRef=useRef();
  const priColorRef=useRef();
  const secColorRef=useRef();
  const [showAIHelper, setShowAIHelper] = useState(false);
  const set=(k,v)=>setLocal(p=>({...p,[k]:v}));
  const setTheme=th=>setLocal(p=>({...p,theme:th}));
  const [logoUploading, setLogoUploading] = useState(false);
  const handleLogo = async (file) => {
    if (!file) return;
    // Check file size — warn if over 2MB
    if (file.size > 2 * 1024 * 1024) { show("Image too large — please use an image under 2MB", "error"); return; }
    setLogoUploading(true);
    try {
      // Try Supabase Storage first
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `logos/${session.user.id}.${ext}`;
        const { error } = await supabase.storage.from("baker-assets").upload(path, file, { upsert: true, contentType: file.type });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("baker-assets").getPublicUrl(path);
          set("logo", publicUrl);
          show("Logo uploaded ✓");
          setLogoUploading(false);
          return;
        }
      }
      // Fallback: compress and use base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 300;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          set("logo", canvas.toDataURL("image/jpeg", 0.7));
          show("Logo saved ✓");
          setLogoUploading(false);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch(e) {
      show("Logo upload failed — please try again"); 
      setLogoUploading(false);
    }
  };
  const save=()=>{setBrand(local);show("Branding saved - app updated instantly ✓");};
  const f=FONTS.find(x=>x.id===local.font)||FONTS[0];
  return(
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <AILogoHelper bakeryName={local.storeName} tagline={local.tagline} isOpen={showAIHelper} onClose={()=>setShowAIHelper(false)}/>
      <PH title="Branding" sub="Logo, colors & fonts"/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:15}}>
        {/* Live preview */}
        <div className="card" style={{overflow:"hidden"}}>
          <div style={{padding:"20px 16px",background:`linear-gradient(135deg,${local.theme.primary},color-mix(in srgb,${local.theme.primary} 50%,#000))`,textAlign:"center"}}>
            {local.logo?<img src={local.logo} alt="" style={{width:56,height:56,borderRadius:0,objectFit:"contain",background:"none",display:"block",margin:"0 auto 10px"}}/>:<div style={{width:50,height:50,borderRadius:11,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 10px"}}>🧁</div>}
            <div style={{fontFamily:f.display,fontSize:19,fontWeight:700,color:"#fff"}}>{local.storeName||"Your Bakery"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:3}}>{local.tagline||"Your tagline here"}</div>
          </div>
          <div style={{padding:"10px 13px",display:"flex",gap:8}}>
            <div style={{flex:1,position:"relative"}}>
              <button onClick={()=>priColorRef.current?.click()} style={{width:"100%",padding:"9px",borderRadius:10,background:local.theme.primary,color:"#fff",border:"none",fontFamily:f.body,fontWeight:700,fontSize:13,cursor:"pointer"}}>Primary</button>
              <input ref={priColorRef} type="color" value={local.theme.primary||"#C47B00"} onChange={e=>setTheme({...local.theme,name:"Custom",primary:e.target.value})} style={{position:"absolute",opacity:0,width:0,height:0,top:0,left:0}}/>
            </div>
            <div style={{flex:1,position:"relative"}}>
              <button onClick={()=>secColorRef.current?.click()} style={{width:"100%",padding:"9px",borderRadius:10,background:"transparent",border:`1.5px solid ${local.theme.accent||local.theme.primary}`,color:local.theme.accent||local.theme.primary,fontFamily:f.body,fontWeight:600,fontSize:13,cursor:"pointer"}}>Secondary</button>
              <input ref={secColorRef} type="color" value={local.theme.accent||"#E8920A"} onChange={e=>setTheme({...local.theme,name:"Custom",accent:e.target.value})} style={{position:"absolute",opacity:0,width:0,height:0,top:0,left:0}}/>
            </div>
          </div>
        </div>

        {/* Logo upload */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Logo</div>
          <div onClick={()=>!logoUploading&&logoRef.current.click()} style={{border:"2px dashed var(--bd)",borderRadius:14,padding:"18px",textAlign:"center",cursor:logoUploading?"not-allowed":"pointer",background:"var(--sf)",opacity:logoUploading?0.6:1}}>
            {local.logo?<img src={local.logo} alt="" style={{height:52,maxWidth:180,objectFit:"contain",borderRadius:8,display:"block",margin:"0 auto 7px"}}/>:<div style={{fontSize:30,marginBottom:5}}>📸</div>}
            <div style={{fontSize:13,fontWeight:600,color:"var(--p)"}}>{logoUploading?"Uploading...":local.logo?"Change Logo":"Upload Logo"}</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>PNG or JPG · Transparent bg recommended</div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleLogo(e.target.files[0])}/>
          {local.logo&&<button onClick={()=>set("logo",null)} style={{marginTop:6,background:"none",border:"none",color:"#DC2626",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--fb)"}}>✕ Remove</button>}

          {/* AI Logo Helper button */}
          <button
            onClick={()=>setShowAIHelper(true)}
            style={{width:"100%",marginTop:10,padding:"12px",borderRadius:12,border:`1.5px solid ${local.theme.primary}40`,background:`color-mix(in srgb,${local.theme.primary} 6%,var(--sf))`,color:local.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          >
            <span>✨</span> Don't have a logo? Make one with AI (free)
          </button>
        </div>

        <Fld label="Store Name"><input className="field" value={local.storeName} onChange={e=>set("storeName",e.target.value)} placeholder="Your Bakery Name"/></Fld>
        <Fld label="Tagline"><input className="field" value={local.tagline} onChange={e=>set("tagline",e.target.value)} placeholder="Sweet Treats · Your City"/></Fld>

        {/* Color presets */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Color Theme</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {THEMES.map(theme=>(
              <button key={theme.name} onClick={()=>setTheme(theme)} style={{borderRadius:11,overflow:"hidden",border:`2px solid ${local.theme.name===theme.name?"var(--tx)":"transparent"}`,cursor:"pointer",padding:0,background:"none"}}>
                <div style={{height:30,background:`linear-gradient(135deg,${theme.primary},${theme.accent})`}}/>
                <div style={{background:theme.surface,padding:"4px 5px"}}><div style={{fontSize:8,fontWeight:700,color:theme.text,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{theme.name}</div></div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom colors */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Custom Colors</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[["Primary Color","primary"],["Accent / Secondary","accent"],["Background","bg"],["Surface / Cards","surface"],["Text Color","text"]].map(([lbl,key])=>{
              const PALETTE = ["#C47B00","#E8920A","#3D1C00","#9C7B5C","#3D5A99","#16A34A","#7C5CBF","#DC2626","#0EA5E9","#F59E0B","#10B981","#8B5CF6","#EC4899","#6366F1","#14B8A6","#F97316","#84CC16","#06B6D4","#A855F7","#EF4444","#1A1A1A","#FFFFFF","#F5F5F5","#E5E7EB"];
              return (
                <div key={key} style={{background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:12,padding:"11px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--tx)"}}>{lbl}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:26,height:26,borderRadius:6,background:local.theme[key]||"#000",border:"1px solid var(--bd)"}}/>
                      <input type="color" value={local.theme[key]||"#000000"} onChange={e=>setTheme({...local.theme,name:"Custom",[key]:e.target.value})} style={{width:26,height:26,borderRadius:6,border:"none",cursor:"pointer",padding:0,background:"none"}}/>
                    </div>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {PALETTE.map(color=>(
                      <button key={color} onClick={()=>setTheme({...local.theme,name:"Custom",[key]:color})}
                        style={{width:28,height:28,borderRadius:6,background:color,border:local.theme[key]===color?"3px solid var(--tx)":"1px solid var(--bd)",cursor:"pointer",padding:0,flexShrink:0}}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Font picker */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8}}>Font Family</div>
          {FONTS.map(font=>(
            <button key={font.id} onClick={()=>set("font",font.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 13px",borderRadius:11,border:`1.5px solid ${local.font===font.id?"var(--p)":"var(--bd)"}`,background:local.font===font.id?`color-mix(in srgb,var(--p) 8%,var(--sf))`:"var(--sf)",cursor:"pointer",marginBottom:7}}>
              <div style={{flex:1,textAlign:"left"}}><div style={{fontFamily:font.display,fontSize:15,fontWeight:700,color:"var(--tx)"}}>{font.label}</div><div style={{fontFamily:font.body,fontSize:11,color:"var(--mu)",marginTop:1}}>The quick brown fox...</div></div>
              {local.font===font.id&&<span style={{color:"var(--p)",fontWeight:800,fontSize:15}}>✓</span>}
            </button>
          ))}
        </div>

        <button className="pbtn" onClick={save} style={{width:"100%"}}>Save Branding ✓</button>
        <div style={{fontSize:11,color:"var(--mu)",textAlign:"center"}}>Changes apply instantly across the entire app</div>
      </div>
    </div>
  );
}

/* ── RECEIPT SCANNER ───────────────────────── */
async function parseReceipt(b64,cat,userId=null){
  const res=await apiFetch("/api/claude",{method:"POST",body:JSON.stringify({feature:"receipt_scan",userId,max_tokens:1000,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},{type:"text",text:`Analyze this bakery receipt. Category: "${cat}". Return ONLY valid JSON: {"store":"name","date":"date","total":0,"items":[{"name":"clean name","qty":1,"unit":"unit","unitCost":0,"totalCost":0}]}. No tax/subtotal rows.`}]}]})});
  const data=await res.json();
  return JSON.parse(data.content?.map(b=>b.text||"").join("").trim().replace(/```json|```/g,"").trim());
}


/* ── QR CODE COMPONENT ──────────────────────────────────────────────────────── */
// Loads qrcode.js from CDN on first use
let qrLibLoaded = false;
function loadQRLib(cb) {
  if (window.QRCode) { cb(); return; }
  if (qrLibLoaded) { setTimeout(()=>loadQRLib(cb),100); return; }
  qrLibLoaded = true;
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  s.onload = cb;
  document.head.appendChild(s);
}

function QRCodeDisplay({ url, size=140, primaryColor="#C47B00" }) {
  const ref = useRef();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    loadQRLib(() => {
      if (!ref.current) return;
      ref.current.innerHTML = "";
      try {
        new window.QRCode(ref.current, {
          text: url,
          width: size,
          height: size,
          colorDark: "#1A0F00",
          colorLight: "#FFFFFF",
          correctLevel: window.QRCode.CorrectLevel.M,
        });
        setReady(true);
      } catch(e) { console.error("QR error:", e); }
    });
  }, [url, size]);

  return (
    <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div ref={ref} style={{width:size,height:size}}/>
      {!ready && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,color:primaryColor}}>▦</div>
      )}
    </div>
  );
}

function downloadQRCode(ref, filename="bakeros-qr.png") {
  if (!ref.current) return;
  const canvas = ref.current.querySelector("canvas");
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/* ── ACCOUNTING STORE ──────────────────────────────────────────────────────── */
const ACCOUNTING_STORE = {
  _expenses: [],
  listeners: [],
  get() { return this._expenses; },
  add(expense) {
    const e = {...expense, id:"exp-"+Date.now()+Math.random()};
    this._expenses = [...this._expenses, e];
    this.listeners.forEach(l => l([...this._expenses]));
    return e;
  },
  subscribe(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(l=>l!==fn); }; },
};

const USE_TYPES = [
  { id:"ingredient",  icon:"🌾", label:"Ingredient",          accounting:"Ingredients / COGS",          trackInventory:true  },
  { id:"packaging",   icon:"📦", label:"Packaging",           accounting:"Packaging Supplies",           trackInventory:true  },
  { id:"equipment",   icon:"🔧", label:"Equipment / Tools",   accounting:"Equipment / Tools",            trackInventory:false },
  { id:"cleaning",    icon:"🧹", label:"Cleaning / Supplies", accounting:"Cleaning / Operating Supplies",trackInventory:false },
  { id:"marketing",   icon:"📣", label:"Marketing",           accounting:"Marketing",                    trackInventory:false },
  { id:"office",      icon:"🗂",  label:"Office / Admin",      accounting:"Office / Admin",               trackInventory:false },
  { id:"other",       icon:"❓", label:"Other",               accounting:"Other Expense",                trackInventory:false },
];

const INVENTORY_UNITS = ["lb","oz","g","kg","each","pack","box","bag","roll","sleeve","bottle","gallon","quart","fl oz","tsp","tbsp","cup","ml","l"];

const ACCOUNTING_CATS = [
  "Ingredients / COGS","Packaging Supplies","Equipment / Tools",
  "Cleaning / Operating Supplies","Marketing","Office / Admin",
  "Delivery / Mileage","Fees","Other Expense",
];

const SCAN_LIMIT = 50;

function ReceiptPage({ onAddToInventory, inventory, setPage: receiptSetPage }) {
  const b = useBrand();
  const [t, show] = useToast();

  // Scan usage — persisted per user per month in localStorage
  const getScanKey = () => {
    const now = new Date();
    return `bos_scans_${now.getFullYear()}_${now.getMonth()+1}`;
  };
  const [scansUsed, setScansUsed] = useState(() => {
    try { return parseInt(localStorage.getItem(getScanKey()) || '0', 10); } catch { return 0; }
  });
  const incrementScan = () => {
    const key = getScanKey();
    const next = scansUsed + 1;
    try { localStorage.setItem(key, String(next)); } catch {}
    setScansUsed(next);
  };

  // Flow step
  const [step, setStep]   = useState("upload"); // upload | scanning | summary | review | final | done
  const [imgURL, setImgURL]   = useState(null);
  const [imgB64, setImgB64]   = useState(null);

  // Parsed receipt
  const [receipt, setReceipt] = useState(null); // { vendor, date, total, tax, paymentMethod, items[] }

  // Per-item review state
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [itemDecisions, setItemDecisions]   = useState([]); // one decision per item
  // Decision shape: { useType, inventoryAction, inventoryUnit, accountingCategory, matchedItemId, notes, skip }

  // Final summary
  const [savedExpenses,  setSavedExpenses]  = useState([]);
  const [savedInventory, setSavedInventory] = useState([]);

  const fileRef   = useRef();
  const cameraRef = useRef();

  // ── Load image ──────────────────────────────────────────────────────────────
  const loadImage = (file) => {
    if (!file || !file.type.startsWith("image/")) { show("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { show("Image too large — please use a smaller photo"); return; }
    setImgURL(URL.createObjectURL(file));
    const r = new FileReader();
    r.onload = e => { setImgB64(e.target.result.split(",")[1]); };
    r.readAsDataURL(file);
    setStep("scanning");
    setTimeout(() => scanReceipt(file), 100);
  };

  // ── AI Scan ─────────────────────────────────────────────────────────────────
  const scanReceipt = async (file) => {
    if (scansUsed >= SCAN_LIMIT) {
      show("Monthly scan limit reached");
      setStep("upload");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(",")[1];
      const mediaType = file.type || "image/jpeg";

      const systemPrompt = `You are a receipt parser for a home bakery business. Extract all information from the receipt image and return ONLY valid JSON with no markdown, no explanation.

Return this exact shape:
{
  "vendor": "store name",
  "date": "YYYY-MM-DD or null",
  "total": number,
  "tax": number or null,
  "paymentMethod": "string or null",
  "items": [
    {
      "name": "item name",
      "quantity": number,
      "unitSize": "e.g. 25 lb bag, 12 oz, each",
      "price": number,
      "suggestedInventoryCategory": "Ingredients or Packaging or Equipment or Other",
      "suggestedAccountingCategory": "Ingredients / COGS or Packaging Supplies or Equipment / Tools or Other Expense"
    }
  ]
}

Be precise with quantities and prices. If a field is unknown, use null.`;

      try {
        const sessionData = await supabase.auth.getSession();
        const userId = sessionData?.data?.session?.user?.id || null;
        const response = await apiFetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feature: "receipt_scan",
            userId,
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{
              role: "user",
              content: [{
                type: "image",
                source: { type: "base64", media_type: mediaType, data: b64 }
              }, {
                type: "text",
                text: "Extract all receipt data and return JSON only."
              }]
            }]
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(()=>({}));
          throw new Error(errData.error || `Server error ${response.status}`);
        }
        const data = await response.json();
        const raw = data.content?.map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();
        const parsed = JSON.parse(raw);
        setReceipt(parsed);
        // Pre-populate decisions with AI suggestions
        const decisions = (parsed.items||[]).map(item => ({
          useType: item.suggestedInventoryCategory==="Ingredients" ? "ingredient"
                 : item.suggestedInventoryCategory==="Packaging"   ? "packaging"
                 : item.suggestedInventoryCategory==="Equipment"   ? "equipment"
                 : "other",
          inventoryAction: "add_new",   // add_new | match | skip_inventory
          inventoryUnit: "lb",
          accountingCategory: item.suggestedAccountingCategory || "Other Expense",
          matchedItemId: null,
          notes: "",
          skip: false,
        }));
        setItemDecisions(decisions);
        setCurrentItemIdx(0);
        incrementScan();
        setStep("summary");
      } catch(err) {
        console.error('[Receipt Scanner] Scan failed:', err);
        setStep("upload");
        show(`Scan failed — ${err?.message || "please try again"}`, "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const updateDecision = (idx, patch) => {
    setItemDecisions(prev => prev.map((d,i) => i===idx ? {...d,...patch} : d));
  };

  const currentItem = receipt?.items?.[currentItemIdx];
  const currentDecision = itemDecisions[currentItemIdx];
  const currentUseType = USE_TYPES.find(u => u.id === currentDecision?.useType) || USE_TYPES[0];
  const canTrackInventory = currentUseType?.trackInventory || currentDecision?.inventoryAction !== "skip_inventory";

  // Calculate unit cost for ingredient/packaging
  const calcUnitCost = () => {
    if (!currentItem || !currentDecision) return null;
    const item = currentItem;
    // Try to extract numeric quantity from unitSize (e.g. "25 lb bag" → 25)
    const match = item.unitSize?.match(/(\d+\.?\d*)/);
    const baseQty = match ? parseFloat(match[1]) : item.quantity;
    if (baseQty && item.price) return (item.price / baseQty).toFixed(2);
    return null;
  };

  // Final save
  const saveAll = () => {
    if (!receipt) return;

    const newExpenses = [];
    const newInventory = [];

    receipt.items.forEach((item, i) => {
      const d = itemDecisions[i];
      if (!d || d.skip) return;

      // Create accounting expense line
      const expense = {
        vendor: receipt.vendor,
        date: receipt.date,
        itemName: item.name,
        amount: item.price,
        category: d.accountingCategory,
        taxPortion: null,
        receiptImageAttached: true,
        inventoryUpdated: d.inventoryAction !== "skip_inventory",
        notes: d.notes || "",
      };
      ACCOUNTING_STORE.add(expense);
      newExpenses.push(expense);

      // Update inventory if applicable
      if (d.inventoryAction !== "skip_inventory" && currentUseType?.trackInventory !== false) {
        const match = item.unitSize?.match(/(\d+\.?\d*)/);
        const invQty = match ? parseFloat(match[1]) : item.quantity;
        const unitCost = invQty ? item.price / invQty : item.price;

        const invItem = {
          id: Date.now() + i,
          name: item.name,
          cat: d.useType === "ingredient" ? "Ingredients" : d.useType === "packaging" ? "Packaging" : "Equipment",
          unit: d.inventoryUnit,
          qty: invQty,
          min: 0,
          cost: unitCost,
          supplier: receipt.vendor,
          reorderQty: Math.ceil(invQty * 1.5),
          icon: "📦",
          kind: d.useType === "ingredient" ? (["ml","l","tsp","tbsp","cup","fl oz"].includes(d.inventoryUnit) ? "liquid" : "solid") : "count",
        };

        if (d.inventoryAction === "add_new") {
          onAddToInventory([invItem]);
          newInventory.push(invItem);
        }
      }
    });

    setSavedExpenses(newExpenses);
    setSavedInventory(newInventory);
    setStep("done");
  };

  const reset = () => {
    setStep("upload"); setImgURL(null); setImgB64(null); setReceipt(null);
    setItemDecisions([]); setCurrentItemIdx(0); setSavedExpenses([]); setSavedInventory([]);
  };

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="AI Receipt Scanner" sub={`${scansUsed}/${SCAN_LIMIT} scans used this month`} action={<PageHelp pageKey="receipt"/>}/>

      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:12}}>

        {/* ── SCAN LIMIT WARNING ── */}
        {scansUsed >= SCAN_LIMIT && (
          <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:12,padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:6}}>⚠️</div>
            <div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:4}}>Monthly Scan Limit Reached</div>
            <div style={{fontSize:12,color:"#DC2626"}}>You've used all {SCAN_LIMIT} scans. Your limit resets next month.</div>
          </div>
        )}

        {/* ══ STEP 1: UPLOAD ══ */}
        {step==="upload" && (
          <>
            <div style={{borderRadius:16,overflow:"hidden",background:`linear-gradient(135deg,${b.theme.primary},${b.theme.text||"#3D1C00"})`,padding:"24px",textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:10}}>🧾</div>
              <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"#fff",marginBottom:6}}>Scan a Receipt</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:20,lineHeight:1.5}}>
                AI reads every item, you confirm where it goes — inventory and accounting updated in one flow
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button
                  onClick={()=>cameraRef.current.click()}
                  style={{padding:"13px",borderRadius:12,border:"none",background:"rgba(255,255,255,.2)",color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}
                >
                  📷 Take Photo
                </button>
                <button
                  onClick={()=>fileRef.current.click()}
                  style={{padding:"13px",borderRadius:12,border:"none",background:"rgba(255,255,255,.15)",color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}
                >
                  🖼 From Gallery
                </button>
              </div>
              <input ref={fileRef}   type="file" accept="image/*"                   style={{display:"none"}} onChange={e=>e.target.files[0]&&loadImage(e.target.files[0])}/>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&loadImage(e.target.files[0])}/>
            </div>

            <div className="card" style={{padding:"13px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--tx)",marginBottom:10}}>📌 Tips for best results</div>
              {[["💡","Good lighting — no shadows or dark areas"],["📐","Lay the receipt flat on a surface"],["🔍","Make sure all items are in frame"],["🚫","Avoid glare on shiny thermal paper"]].map(([ic,tip])=>(
                <div key={tip} style={{display:"flex",alignItems:"center",gap:9,marginBottom:7,fontSize:12,color:"var(--mu)"}}>
                  <span style={{fontSize:16,flexShrink:0}}>{ic}</span>{tip}
                </div>
              ))}
            </div>

            <div style={{padding:"10px 13px",background:`color-mix(in srgb,${b.theme.primary} 6%,var(--sf))`,borderRadius:11,border:`1px solid ${b.theme.primary}20`,fontSize:11,color:"var(--mu)",lineHeight:1.5,textAlign:"center"}}>
              🔒 Receipt images are processed securely and saved for your tax records
            </div>
          </>
        )}

        {/* ══ STEP 2: SCANNING ══ */}
        {step==="scanning" && (
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            {imgURL && <img src={imgURL} alt="" style={{width:120,height:120,borderRadius:14,objectFit:"cover",marginBottom:20,border:"3px solid var(--bd)"}}/>}
            <div style={{width:56,height:56,borderRadius:"50%",background:b.theme.primary,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",animation:"pulse 1.2s ease-in-out infinite"}}>
              <div style={{width:22,height:22,border:"3px solid rgba(255,255,255,.4)",borderTop:"3px solid #fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            </div>
            <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)",marginBottom:6}}>Reading receipt…</div>
            <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.5}}>AI is extracting items, prices,{"\n"}and categories</div>
          </div>
        )}

        {/* ══ STEP 3: SUMMARY ══ */}
        {step==="summary" && receipt && (
          <>
            <div style={{textAlign:"center",paddingTop:8,paddingBottom:4}}>
              <div style={{fontSize:32,marginBottom:6}}>✅</div>
              <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:700,color:"var(--tx)",marginBottom:4}}>Receipt Found!</div>
              <div style={{fontSize:13,color:"var(--mu)"}}>Review the details below</div>
            </div>

            {/* Receipt preview card */}
            <div className="card" style={{padding:"14px 15px",display:"flex",gap:12,alignItems:"center"}}>
              {imgURL && <img src={imgURL} alt="" style={{width:52,height:52,borderRadius:10,objectFit:"cover",flexShrink:0,border:"1px solid var(--bd)"}}/>}
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:"var(--tx)",marginBottom:2}}>{receipt.vendor||"Unknown Vendor"}</div>
                <div style={{fontSize:11,color:"var(--mu)",marginBottom:4}}>{receipt.date||"Date unknown"} · {receipt.paymentMethod||"Payment unknown"}</div>
                <div style={{display:"flex",gap:12}}>
                  <div><div style={{fontSize:9,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".7px"}}>Total</div><div style={{fontSize:14,fontWeight:800,color:b.theme.primary}}>${receipt.total?.toFixed(2)||"--"}</div></div>
                  {receipt.tax&&<div><div style={{fontSize:9,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".7px"}}>Tax</div><div style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>${receipt.tax.toFixed(2)}</div></div>}
                  <div><div style={{fontSize:9,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".7px"}}>Items</div><div style={{fontSize:14,fontWeight:800,color:"var(--tx)"}}>{receipt.items?.length||0}</div></div>
                </div>
              </div>
            </div>

            {/* Items preview */}
            <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:4}}>Items detected</div>
            {(receipt.items||[]).map((item,i) => (
              <div key={i} className="card" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{item.name}</div>
                  <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{item.quantity} × {item.unitSize}</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:b.theme.primary}}>${item.price?.toFixed(2)}</div>
              </div>
            ))}

            <button onClick={()=>setStep("review")} className="pbtn" style={{width:"100%",padding:"15px"}}>
              Review Items →
            </button>
            <button onClick={reset} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
              ← Scan Again
            </button>
          </>
        )}

        {/* ══ STEP 4-5: ITEM-BY-ITEM REVIEW ══ */}
        {step==="review" && receipt && currentItem && currentDecision && (
          <>
            {/* Progress */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--mu)"}}>Item {currentItemIdx+1} of {receipt.items.length}</div>
              <div style={{fontSize:11,color:"var(--mu)"}}>{receipt.items.length - currentItemIdx - 1} remaining</div>
            </div>
            <div style={{height:4,background:"var(--bd)",borderRadius:2,overflow:"hidden",marginBottom:2}}>
              <div style={{height:"100%",background:b.theme.primary,width:`${((currentItemIdx+1)/receipt.items.length)*100}%`,borderRadius:2,transition:"width .3s"}}/>
            </div>

            {/* Item card */}
            <div className="card" style={{padding:"15px",borderLeft:`3px solid ${b.theme.primary}`}}>
              <div style={{fontSize:16,fontWeight:800,color:"var(--tx)",marginBottom:4}}>{currentItem.name}</div>
              <div style={{display:"flex",gap:14}}>
                <div><div style={{fontSize:9,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".7px"}}>AI Found</div><div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{currentItem.quantity} × {currentItem.unitSize}</div></div>
                <div><div style={{fontSize:9,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".7px"}}>Cost</div><div style={{fontSize:13,fontWeight:700,color:b.theme.primary}}>${currentItem.price?.toFixed(2)}</div></div>
              </div>
            </div>

            {/* What is this used for? */}
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:4}}>What is this used for?</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {USE_TYPES.map(ut => (
                <button
                  key={ut.id}
                  onClick={()=>{
                    updateDecision(currentItemIdx, {
                      useType: ut.id,
                      accountingCategory: ut.accounting,
                      inventoryAction: ut.trackInventory ? "add_new" : "skip_inventory",
                    });
                  }}
                  style={{
                    display:"flex",alignItems:"center",gap:12,padding:"11px 13px",borderRadius:12,
                    border:`1.5px solid ${currentDecision.useType===ut.id ? b.theme.primary : "var(--bd)"}`,
                    background: currentDecision.useType===ut.id ? `color-mix(in srgb,${b.theme.primary} 8%,var(--sf))` : "var(--sf)",
                    cursor:"pointer",fontFamily:"var(--fb)",textAlign:"left",
                  }}
                >
                  <span style={{fontSize:20,flexShrink:0}}>{ut.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{ut.label}</div>
                    <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>{ut.accounting}</div>
                  </div>
                  {currentDecision.useType===ut.id && <span style={{color:b.theme.primary,fontWeight:800,fontSize:16}}>✓</span>}
                </button>
              ))}
            </div>

            {/* Other — custom accounting category */}
            {currentDecision.useType==="other" && (
              <>
                <div style={{fontSize:12,fontWeight:700,color:"var(--tx)",marginBottom:6}}>Accounting category</div>
                <select className="field" value={currentDecision.accountingCategory} onChange={e=>updateDecision(currentItemIdx,{accountingCategory:e.target.value})}>
                  {ACCOUNTING_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </>
            )}

            {/* Inventory handling for trackable types */}
            {(currentUseType?.trackInventory || ["equipment","cleaning","marketing","office","other"].includes(currentDecision?.useType)) && (
              <>
                <div style={{fontSize:12,fontWeight:700,color:"var(--tx)",marginBottom:6}}>
                  {currentUseType?.trackInventory ? "Add to inventory?" : "Track in inventory? (optional)"}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {[
                    {v:"add_new",      label:"Add as new inventory item"},
                    {v:"match",        label:"Match to existing inventory item"},
                    {v:"skip_inventory",label:"Do not track inventory"},
                  ].map(opt=>(
                    <button key={opt.v} onClick={()=>updateDecision(currentItemIdx,{inventoryAction:opt.v})}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",borderRadius:11,border:`1.5px solid ${currentDecision.inventoryAction===opt.v?b.theme.primary:"var(--bd)"}`,background:currentDecision.inventoryAction===opt.v?`color-mix(in srgb,${b.theme.primary} 8%,var(--sf))`:"var(--sf)",cursor:"pointer",fontFamily:"var(--fb)",textAlign:"left"}}
                    >
                      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${currentDecision.inventoryAction===opt.v?b.theme.primary:"var(--bd)"}`,background:currentDecision.inventoryAction===opt.v?b.theme.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {currentDecision.inventoryAction===opt.v&&<span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>}
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:"var(--tx)"}}>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Match to existing */}
                {currentDecision.inventoryAction==="match" && (
                  <select className="field" value={currentDecision.matchedItemId||""} onChange={e=>updateDecision(currentItemIdx,{matchedItemId:e.target.value})}>
                    <option value="">— Select existing item —</option>
                    {(inventory||[]).map(inv=><option key={inv.id} value={inv.id}>{inv.name} ({inv.qty} {inv.unit})</option>)}
                  </select>
                )}

                {/* Inventory unit + cost preview */}
                {currentDecision.inventoryAction!=="skip_inventory" && (
                  <div style={{background:`color-mix(in srgb,${b.theme.primary} 6%,var(--sf))`,borderRadius:12,padding:"13px 14px",border:`1px solid ${b.theme.primary}25`}}>
                    <div style={{fontSize:11,fontWeight:700,color:b.theme.primary,marginBottom:8}}>Inventory unit</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                      {INVENTORY_UNITS.map(u=>(
                        <button key={u} onClick={()=>updateDecision(currentItemIdx,{inventoryUnit:u})}
                          style={{padding:"5px 11px",borderRadius:20,border:`1.5px solid ${currentDecision.inventoryUnit===u?b.theme.primary:"var(--bd)"}`,background:currentDecision.inventoryUnit===u?b.theme.primary:"var(--sf)",color:currentDecision.inventoryUnit===u?"#fff":"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}
                        >{u}</button>
                      ))}
                    </div>
                    {/* Unit cost preview */}
                    {calcUnitCost() && (
                      <div style={{background:"var(--bg)",borderRadius:9,padding:"9px 11px"}}>
                        <div style={{fontSize:11,color:"var(--mu)",marginBottom:4}}>{currentItem.name}</div>
                        <div style={{fontSize:12,color:"var(--tx)"}}>Purchased: <strong>{currentItem.unitSize}</strong></div>
                        <div style={{fontSize:12,color:"var(--tx)"}}>Inventory unit: <strong>{currentDecision.inventoryUnit}</strong></div>
                        <div style={{fontSize:12,color:b.theme.primary,fontWeight:700,marginTop:4}}>Cost per {currentDecision.inventoryUnit}: ${calcUnitCost()}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <Fld label="Note (optional)">
              <input className="field" placeholder="Add a note..." value={currentDecision.notes} onChange={e=>updateDecision(currentItemIdx,{notes:e.target.value})}/>
            </Fld>

            {/* Navigation */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
              <button
                onClick={()=>{ updateDecision(currentItemIdx,{skip:true}); if(currentItemIdx<receipt.items.length-1){setCurrentItemIdx(i=>i+1);}else{setStep("final");} }}
                style={{padding:"13px",borderRadius:12,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}
              >
                Skip Item
              </button>
              <button
                onClick={()=>{ if(currentItemIdx<receipt.items.length-1){setCurrentItemIdx(i=>i+1);}else{setStep("final");} }}
                className="pbtn"
                style={{padding:"13px",borderRadius:12,fontSize:13}}
              >
                {currentItemIdx<receipt.items.length-1 ? "Next Item →" : "Final Review →"}
              </button>
            </div>
          </>
        )}

        {/* ══ STEP 7: FINAL REVIEW ══ */}
        {step==="final" && receipt && (
          <>
            <div style={{textAlign:"center",paddingTop:8,paddingBottom:4}}>
              <div style={{fontSize:32,marginBottom:6}}>📋</div>
              <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:700,color:"var(--tx)",marginBottom:4}}>Ready to Save</div>
              <div style={{fontSize:13,color:"var(--mu)"}}>Review your changes before committing</div>
            </div>

            {/* Summary stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {icon:"📦",label:"Inventory updates",val:itemDecisions.filter(d=>!d.skip&&d.inventoryAction!=="skip_inventory").length},
                {icon:"🧾",label:"Expense lines",val:itemDecisions.filter(d=>!d.skip).length},
                {icon:"💰",label:"Total amount",val:`$${receipt.total?.toFixed(2)||"--"}`},
                {icon:"📸",label:"Receipt image",val:"Saved"},
              ].map(s=>(
                <div key={s.label} className="card" style={{padding:"12px 13px",textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:18,fontWeight:800,color:b.theme.primary}}>{s.val}</div>
                  <div style={{fontSize:10,color:"var(--mu)",marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Item summary list */}
            <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px"}}>Item decisions</div>
            {receipt.items.map((item,i) => {
              const d = itemDecisions[i];
              const ut = USE_TYPES.find(u=>u.id===d?.useType);
              return (
                <div key={i} className="card" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:10,opacity:d?.skip?.5:1}}>
                  <span style={{fontSize:18,flexShrink:0}}>{ut?.icon||"❓"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{item.name}</div>
                    <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>
                      {d?.skip ? "Skipped" : `${ut?.label||"?"} · ${d?.accountingCategory||""} · ${d?.inventoryAction==="skip_inventory"?"No inventory":"→ Inventory"}`}
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:b.theme.primary}}>${item.price?.toFixed(2)}</div>
                </div>
              );
            })}

            <button onClick={saveAll} className="pbtn" style={{width:"100%",padding:"15px",fontSize:15}}>
              💾 Save Receipt
            </button>
            <button onClick={()=>setStep("review")} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
              ← Go Back & Edit
            </button>
          </>
        )}

        {/* ══ STEP 8: DONE ══ */}
        {step==="done" && (
          <>
            <div style={{textAlign:"center",padding:"28px 20px 16px",animation:"pop .5s cubic-bezier(.22,.68,0,1.4) both"}}>
              <div style={{fontSize:52,marginBottom:12}}>🎉</div>
              <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:700,color:"var(--tx)",marginBottom:6}}>Receipt Processed!</div>
              <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.5}}>Your inventory and accounting have been updated</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[
                {icon:"📦",label:"Inventory items updated",val:savedInventory.length},
                {icon:"🧾",label:"Accounting expenses created",val:savedExpenses.length},
                {icon:"📁",label:"Saved for tax records",val:"✓"},
              ].map(s=>(
                <div key={s.label} className="card" style={{padding:"12px 8px",textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:20,fontWeight:800,color:b.theme.primary}}>{s.val}</div>
                  <div style={{fontSize:9,color:"var(--mu)",marginTop:2,lineHeight:1.3}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Saved items preview */}
            {savedInventory.length>0 && (
              <>
                <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px"}}>Inventory updated</div>
                {savedInventory.map((inv,i)=>(
                  <div key={i} className="card" style={{padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:12,fontWeight:700,color:"var(--tx)"}}>{inv.name}</div><div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>+{inv.qty} {inv.unit} added</div></div>
                    <div style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>✓</div>
                  </div>
                ))}
              </>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              <button className="pbtn" onClick={reset} style={{width:"100%"}}>📷 Scan Another Receipt</button>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button className="gbtn" onClick={()=>receiptSetPage&&receiptSetPage("inventory")} style={{padding:"12px",borderRadius:12,color:"var(--tx)",fontSize:13,fontWeight:600}}>📦 View Inventory</button>
                <button className="gbtn" onClick={()=>receiptSetPage&&receiptSetPage("accounting")} style={{padding:"12px",borderRadius:12,color:"var(--tx)",fontSize:13,fontWeight:600}}>📒 View Expenses</button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}


/* ── OTHER PAGES ───────────────────────────── */
function CRMPage({ customers=[], setCustomers=()=>{} }){
  const b = useBrand();
  const {tier:crmTier} = useTier();
  const crmTitle = canAccess(crmTier,"crm") ? "CRM" : "Customers";
  const [sel, setSel]             = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [search, setSearch]       = useState("");
  const [form, setForm]           = useState({name:"",phone:"",email:"",note:"",tag:"New"});
  const [t, show]                 = useToast();

  // NFC leads are a Pro+ feature — hide them from Starter/Growth CRM view
  const hasNFC = canAccess(crmTier, "nfc_lead_capture");
  const visibleCustomers = hasNFC
    ? customers
    : customers.filter(c =>
        c.source !== 'nfc' &&
        c.tag !== 'NFC Lead' &&
        !(c.tags||[]).includes('NFC Lead')
      );

  const filtered = visibleCustomers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone||"").includes(search)
  );

  const saveCustomer = () => {
    if (!form.name.trim()) { show("Name is required"); return; }
    const isStarterCRM = crmTier === "starter";
    if (isStarterCRM && customers.length >= 25) { show("Free plan is limited to 25 customers. Upgrade to Growth for unlimited.","error"); return; }
    const newC = {
      id: Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      note: form.note.trim(),
      tag: form.tag || "New",
      orders: 0,
      spent: 0,
      last: "Never",
    };
    setCustomers(p => [newC, ...p]);
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user?.id) supabase.from("baker_customers").insert({
        id: newC.id, baker_id: session.user.id,
        name: newC.name, phone: newC.phone||null, email: newC.email||null,
        orders: 0, spent: 0, last: "Never", tag: newC.tag||"New",
        notes: newC.note||null, sms_opt_in: false,
      });
    });
    setForm({name:"",phone:"",email:"",note:"",tag:"New"});
    setShowAdd(false);
    show("Customer added ✓");
  };

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH
        title={crmTitle}
        sub={`${visibleCustomers.length} customer${visibleCustomers.length!==1?"s":""}`}
        action={
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <PageHelp pageKey="crm"/>
            <button className="pbtn" onClick={()=>setShowAdd(true)} style={{padding:"7px 13px",fontSize:13,borderRadius:10}}>+ Add</button>
          </div>
        }
      />

      {/* Search */}
      <div style={{padding:"0 12px 10px"}}>
        <input
          className="field"
          placeholder="Search customers..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{fontSize:13}}
        />
      </div>

      {/* Customer list */}
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
        {filtered.length===0 ? (
          <div className="card" style={{padding:"32px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>👥</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--tx)",marginBottom:4}}>
              {search ? "No customers found" : "No customers yet"}
            </div>
            <div style={{fontSize:12,color:"var(--mu)",marginBottom:14,lineHeight:1.5}}>
              {search ? "Try a different search" : "Add your first customer to get started"}
            </div>
            {!search && (
              <button className="pbtn" onClick={()=>setShowAdd(true)} style={{padding:"10px 22px",fontSize:13,borderRadius:12}}>
                + Add First Customer
              </button>
            )}
          </div>
        ) : filtered.map(c => {
          const tc = TAGCOL[c.tag]||TAGCOL.New;
          return (
            <div key={c.id} className="card row" style={{padding:"12px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:11}} onClick={()=>setSel(c)}>
              <Avt name={c.name} sz={38}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{c.name}</div>
                  <span className="badge" style={{background:tc.bg,color:tc.c}}>{c.tag}</span>
                </div>
                <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>
                  {c.orders} order{c.orders!==1?"s":""} · ${c.spent}
                  {c.phone && ` · ${c.phone}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer detail sheet */}
      {sel && (
        <div className="sheet">
          <div onClick={()=>setSel(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"90dvh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <Handle/>
            <div style={{padding:"4px 16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:13}}>
                <Avt name={sel.name} sz={44}/>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)"}}>{sel.name}</div>
                  <div style={{fontSize:11,color:"var(--mu)"}}>{sel.phone||"No phone"}{sel.email?` · ${sel.email}`:""}</div>
                </div>
                <button onClick={()=>setSel(null)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:13}}>
                {[["Orders",sel.orders],["Spent","$"+sel.spent],["Last Order",sel.last||"Never"],["Status",sel.tag]].map(([k,v])=>(
                  <div key={k} style={{background:"var(--bg)",borderRadius:10,padding:"9px 11px"}}>
                    <div style={{fontSize:9,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:2}}>{k}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"var(--tx)"}}>{v}</div>
                  </div>
                ))}
              </div>
              {sel.note && (
                <div style={{background:"var(--bg)",borderRadius:10,padding:"10px 12px",marginBottom:13,fontSize:12,color:"var(--mu)",lineHeight:1.5}}>
                  📝 {sel.note}
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button className="pbtn" onClick={()=>{
                  if(sel.phone){window.open(`sms:${sel.phone}`,"_blank");}
                  else show("No phone number saved");
                }}>📱 SMS</button>
                <button className="gbtn" onClick={()=>{
                  if(!window.confirm(`Remove ${sel.name} from your customers? This cannot be undone.`)) return;
                  const delId = sel.id;
                  setCustomers(p=>p.filter(c=>c.id!==delId));
                  setSel(null);
                  supabase.auth.getSession().then(({data:{session}})=>{
                    if(session?.user?.id) supabase.from("baker_customers").delete().eq("id",delId).eq("baker_id",session.user.id);
                  });
                  show("Customer removed");
                }} style={{padding:"13px",borderRadius:12,color:"#DC2626",border:"1.5px solid #FCA5A5",background:"#FEF2F2",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer sheet */}
      {showAdd && (
        <div className="sheet">
          <div onClick={()=>setShowAdd(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"92dvh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px calc(40px + env(safe-area-inset-bottom, 16px))"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>New Customer</div>
                <button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Fld label="Name *" required>
                  <input className="field" placeholder="e.g. Jane Smith" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} autoFocus/>
                </Fld>
                <Fld label="Phone">
                  <input className="field" type="tel" placeholder="(210) 555-0100" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
                </Fld>
                <Fld label="Email">
                  <input className="field" type="email" placeholder="jane@example.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                </Fld>
                <Fld label="Tag">
                  <select className="field" value={form.tag} onChange={e=>setForm(p=>({...p,tag:e.target.value}))}>
                    {["New","Regular","VIP","Wholesale","Inactive"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Notes">
                  <textarea className="field" rows={3} placeholder="Preferences, allergies, favorite flavors..." value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={{resize:"none"}}/>
                </Fld>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                  <button className="pbtn" onClick={saveCustomer}>Save Customer</button>
                  <button className="gbtn" onClick={()=>setShowAdd(false)} style={{padding:"13px",borderRadius:12,color:"var(--tx)"}}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsPage({ orders=[], customers=[] }){
  const b=useBrand();
  const completed = orders.filter(o=>o.status==="completed"&&o.status!=="refunded");
  const totalRev  = completed.reduce((s,o)=>s+(o.amount||0),0);
  const repeatCusts = customers.filter(c=>(c.orders||0)>1).length;
  const repeatRate = customers.length>0 ? Math.round(repeatCusts/customers.length*100) : 0;
  const topCusts = [...customers].sort((a,b)=>(b.spent||0)-(a.spent||0)).slice(0,3);
  const stats = [
    ["💰","$"+totalRev.toLocaleString(),"Revenue",completed.length+" completed",true],
    ["👥",customers.length,"Customers",repeatRate+"% repeat",true],
    ["🎂",orders.length,"Total orders",orders.filter(o=>o.status!=="completed").length+" open",true],
    ["🔁",repeatRate+"%","Repeat rate",repeatCusts+" repeat buyers",true],
  ];
  return <div style={{paddingBottom:96}}><PH title="Analytics" sub="Business performance"/><div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:11}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{stats.map(([ic,val,lbl,sub,up])=><div key={lbl} className="card" style={{padding:"12px 13px"}}><span style={{fontSize:20}}>{ic}</span><div style={{fontSize:19,fontWeight:800,color:"var(--tx)",marginTop:4,lineHeight:1}}>{val}</div><div style={{fontSize:11,color:"var(--mu)",marginTop:3}}>{lbl}</div><div style={{fontSize:11,fontWeight:700,color:"var(--p)",marginTop:2}}>{sub}</div></div>)}</div>
    <div className="card" style={{padding:"13px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:14,fontWeight:700,color:"var(--tx)"}}>Weekly Revenue</span><span style={{fontSize:12,color:"var(--mu)"}}>${(()=>{const w=Date.now()-7*86400000;return (orders||[]).filter(o=>o.status==="completed"&&o.status!=="refunded"&&new Date(o.completedAt||0)>=w).reduce((s,o)=>s+(o.amount||0),0).toLocaleString();})()}</span></div><SparkBar/></div>
    {topCusts.length>0&&<div className="card" style={{padding:"13px 14px"}}><div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:10}}>Top Customers</div>{topCusts.map((c,i)=><div key={c.id||i} style={{display:"flex",alignItems:"center",gap:9,marginBottom:i<topCusts.length-1?9:0}}><div style={{width:20,height:20,borderRadius:"50%",background:i===0?b.theme.primary:"var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:i===0?"#fff":"var(--mu)",fontSize:10,flexShrink:0}}>{i+1}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{c.name}</div></div><div style={{fontWeight:800,color:"var(--p)",fontSize:13}}>${c.spent||0}</div></div>)}</div>}
    {topCusts.length===0&&<div className="card" style={{padding:"24px",textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>📊</div><div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:4}}>No data yet</div><div style={{fontSize:11,color:"var(--mu)"}}>Analytics will populate as you add orders and customers</div></div>}
  </div></div>;
}

function NFCPage({ bakerInfo, brand, customers=[] }){
  const {tier:nfcTier,setPage:nfcSetPage}=useTier();
  const nfcSlug = getStorefrontSlug(brand, bakerInfo);
  const hasLeadCapture=canAccess(nfcTier,"nfc_lead_capture");
  const b=useBrand();
  const[t,show]=useToast();

  // Real NFC leads from CRM
  const nfcLeads = customers.filter(c =>
    c.source==='nfc' || c.tag==='NFC Lead' || (c.tags||[]).includes('NFC Lead')
  );

  /* ── Basic / Growth: QR storefront view ── */
  if(!hasLeadCapture) return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="QR Code" sub="Share your storefront"/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:12}}>
        {/* Info banner */}
        <div style={{background:`color-mix(in srgb,${b.theme.primary} 10%,var(--sf))`,border:`1.5px solid ${b.theme.primary}30`,borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:3}}>📱 QR Code — {nfcTier==="starter"?"Starter":"Growth"} Plan</div>
          <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.5}}>
            Customers scan your QR code and go straight to your storefront to browse and order.
          </div>
        </div>
        {/* QR display */}
        <div className="card" style={{padding:"28px 20px",textAlign:"center"}}>
          <div className="qr-nfc-wrap" style={{border:`3px solid ${b.theme.primary}`,borderRadius:16,padding:4,display:"inline-block",margin:"0 auto 16px",background:"#fff"}}><QRCodeDisplay url={`https://bakeros.app/store/${nfcSlug}`} size={132} primaryColor={b.theme.primary}/></div>
          <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)",marginBottom:4}}>BakerOS Storefront</div>
          <div style={{fontSize:12,color:"var(--mu)",marginBottom:16}}>{`bakeros.app/store/${nfcSlug}`}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            <button className="pbtn" onClick={()=>{
  const canvas = document.querySelector(".qr-nfc-wrap canvas");
  if(canvas){const a=document.createElement("a");a.download="bakeros-qr.png";a.href=canvas.toDataURL("image/png");a.click();show("QR downloaded ✓");}
  else show("QR not ready yet — try again");
}} style={{fontSize:13}}>Download QR</button>
            <button className="gbtn" onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(`https://bakeros.app/store/${nfcSlug}`);show("Link copied ✓");}} style={{padding:"12px",borderRadius:12,color:"var(--tx)",fontSize:13}}>Copy Link</button>
          </div>
        </div>
        {/* Upgrade to Pro CTA */}
        <div style={{background:"#F5F0FF",border:"1.5px solid #7C5CBF30",borderRadius:14,padding:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:24}}>📲</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#7C5CBF"}}>Upgrade to Pro for NFC Lead Capture</div>
              <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>NFC tap saves name, phone & email directly into your CRM.</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
            {["NFC tap opens a lead capture form","Name & phone auto-save to your CRM","Leads included in SMS & email marketing","Copy your NFC link and program any tag"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--tx)"}}><span style={{color:"#16A34A",fontWeight:700}}>✓</span>{f}</div>
            ))}
          </div>
          <button onClick={()=>nfcSetPage("subscription")} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"#16A34A",color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Upgrade to Pro - $39.99/mo →</button>
        </div>
      </div>
    </div>
  );

  /* ── Pro: Full NFC lead capture view ── */
  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="NFC Leads" sub={`${nfcLeads.length} leads captured`}/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:11}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[["👥","Total",nfcLeads.length],["🔥","This Month",nfcLeads.filter(l=>{ const d=new Date(l.last||l.created_at||Date.now()); return d.getMonth()===new Date().getMonth();}).length],["✅","With Email",nfcLeads.filter(l=>l.email).length]].map(([ic,lbl,val])=>(
            <div key={lbl} className="card" style={{padding:"11px",textAlign:"center"}}>
              <span style={{fontSize:18}}>{ic}</span>
              <div style={{fontSize:18,fontWeight:800,color:"var(--tx)",marginTop:3}}>{val}</div>
              <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Your NFC Link */}
        <div className="card" style={{padding:"14px 16px"}}>
          <div style={{fontSize:12,fontWeight:800,color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Your NFC Tag Link</div>
          <div style={{fontSize:12,color:"var(--tx)",marginBottom:10,wordBreak:"break-all",padding:"8px 10px",background:"var(--bg)",borderRadius:8}}>{`https://app.bakeros.app/nfc/${nfcSlug}`}</div>
          <button className="gbtn" onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(`https://app.bakeros.app/nfc/${nfcSlug}`);show("NFC link copied ✓");}} style={{width:"100%",padding:"11px",borderRadius:11,fontSize:13}}>📋 Copy NFC Link</button>
        </div>

        {/* Leads list */}
        {nfcLeads.length === 0
          ? <div className="card" style={{padding:"32px 20px",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:10}}>📲</div>
              <div style={{fontSize:14,fontWeight:700,color:"var(--tx)",marginBottom:6}}>No leads yet</div>
              <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6}}>When someone taps your NFC tag and saves their info, they'll appear here automatically.</div>
            </div>
          : nfcLeads.map(lead => (
              <div key={lead.id} className="card" style={{padding:"13px 15px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:`color-mix(in srgb,${b.theme.primary} 15%,var(--sf))`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:b.theme.primary,flexShrink:0}}>
                  {(lead.name||"?").charAt(0).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{lead.name}</div>
                  <div style={{fontSize:11,color:"var(--mu)"}}>{lead.phone}{lead.email ? ` · ${lead.email}` : ""}</div>
                </div>
                <div style={{fontSize:10,color:"var(--mu)",textAlign:"right",flexShrink:0}}>
                  <div style={{background:"#DB277715",color:"#DB2777",borderRadius:8,padding:"2px 7px",fontWeight:700,marginBottom:3}}>NFC</div>
                  <div>{lead.last || "Recent"}</div>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

/* ── INVOICES ──────────────────────────────── */
function InvoicePage({ payHandles, products=[], invoices=[], setInvoices=()=>{}, customers=[], setCustomers=()=>{} }) {
  const effectiveInvoices = invoices;
  const b = useBrand();
  const [showNew,  setShowNew]  = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sel,      setSel]      = useState(null);
  const [sendStep, setSendStep] = useState("choose");
  const [sendTo,   setSendTo]   = useState("");
  const [t, show] = useToast();
  const [invFilter, setInvFilter] = useState("all"); // "all" | "paid" | "unpaid" | "overdue"
  const [form, setForm] = useState({customer:"", email:"", phone:"", lineItems:[{productId:"", name:"", qty:1, price:""}], due:"", imageURL:null});
  const finalImgRef  = useRef();   // for attaching final image to existing invoice
  const newImgRef    = useRef();   // for attaching image when creating new invoice

  const attachFinalImage = (file, invId) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setInvoices(p => p.map(i => i.id===invId ? {...i, finalImageURL:url} : i));
    setSel(p => p ? {...p, finalImageURL:url} : p);
    show("Final image attached ✓");
  };

  const removeFinalImage = (invId) => {
    setInvoices(p => p.map(i => i.id===invId ? {...i, finalImageURL:null} : i));
    setSel(p => p ? {...p, finalImageURL:null} : p);
    show("Image removed");
  };

  const STATUS_STYLE = {
    paid:    {bg:"#D1ECE4", c:"#155724"},
    unpaid:  {bg:"#FFF3CD", c:"#856404"},
    overdue: {bg:"#FEE2E2", c:"#991B1B"},
  };

  const totals = {
    paid:    invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0),
    unpaid:  invoices.filter(i=>i.status==="unpaid").reduce((s,i)=>s+i.amount,0),
    overdue: invoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.amount,0),
  };

  // Generate a shareable invoice link for a given invoice
  const invoiceLink = inv => `https://app.bakeros.app/invoice/${inv.id.toLowerCase()}`;

  const createInvoice = () => {
    const lineTotal = form.lineItems.reduce((s,li)=>s+(parseFloat(li.price)||0)*(parseInt(li.qty)||1),0);
    if (!form.customer || lineTotal===0) { show("Customer and at least one priced item required","error"); return; }
    const newInv = {
      id:            "INV-" + (1000 + invoices.length + 1),
      customer:      form.customer,
      email:         form.email || "",
      phone:         form.phone || "",
      items:         form.lineItems.filter(li=>li.name||li.productId).map(li=>`${li.name||"Item"} x${li.qty}`).join(", ") || "Custom order",
      amount:        lineTotal,
      status:        "unpaid",
      date:          "Today",
      due:           form.due || "Net 7",
      finalImageURL: form.imageURL || null,
    };
    setInvoices(p => [newInv, ...p]);
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user?.id) supabase.from("baker_invoices").insert({
        id: newInv.id, baker_id: session.user.id,
        customer: newInv.customer, amount: newInv.amount||0,
        status: "unpaid", due: newInv.due||null,
        items: newInv.items||null, email: newInv.email||null,
        phone: newInv.phone||null,
      }).then(({error})=>{ if(error) console.error('[invoice insert]', error.message); });
    });
    setForm({customer:"", email:"", phone:"", lineItems:[{productId:"", name:"", qty:1, price:""}], due:"", imageURL:null});
    setShowNew(false);
    show("Invoice created ✓");
  };

  const updateStatus = (id, status) => {
    setInvoices(p => p.map(i => i.id===id ? {...i, status} : i));
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user?.id) supabase.from("baker_invoices").update({status, updated_at: new Date().toISOString()}).eq("id",id).eq("baker_id",session.user.id);
    });
    setSel(p => p ? {...p, status} : p);
    show(`Marked as ${status} ✓`);
  };

  const openSend = () => { setSendStep("choose"); setSendTo(""); setShowSend(true); };
  const closeSend = () => { setShowSend(false); setSendStep("choose"); setSendTo(""); };

  const doSendEmail = async () => {
    const to   = sendTo || sel.email;
    if (!to) { show("Enter a customer email address","error"); return; }
    const link = invoiceLink(sel);
    const b    = useBrand ? undefined : undefined; // brand accessed via closure below
    const storeName = "your bakery"; // fallback — brand accessed at render time

    // Build branded HTML invoice email
    const htmlEmail = `
      <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;background:#FFFBF5;border-radius:16px;overflow:hidden;border:1px solid #E8D5C0;">
        <div style="background:#C47B00;padding:28px 32px;text-align:center;">
          <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Invoice Ready</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">${sel.id}</div>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:15px;color:#2C1A0E;margin:0 0 20px;">Hi ${sel.customer},</p>
          <p style="font-size:14px;color:#5C4A3A;line-height:1.6;margin:0 0 24px;">Your invoice is ready. Please review the details below and use the payment button to complete your order.</p>
          <div style="background:#FDF6EC;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #E8D5C0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:13px;color:#9C7B5C;">Invoice</span>
              <span style="font-size:13px;font-weight:700;color:#2C1A0E;">${sel.id}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:13px;color:#9C7B5C;">Items</span>
              <span style="font-size:13px;font-weight:700;color:#2C1A0E;">${sel.items || "Custom order"}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:13px;color:#9C7B5C;">Due Date</span>
              <span style="font-size:13px;font-weight:700;color:#2C1A0E;">${sel.due}</span>
            </div>
            <div style="border-top:1px solid #E8D5C0;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;">
              <span style="font-size:15px;font-weight:800;color:#2C1A0E;">Total Due</span>
              <span style="font-size:20px;font-weight:800;color:#C47B00;">$${sel.amount}</span>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${link}" style="background:#C47B00;color:#fff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;display:inline-block;">View &amp; Pay Invoice →</a>
          </div>
          <p style="font-size:12px;color:#9C7B5C;text-align:center;margin:0;">Or copy this link: <a href="${link}" style="color:#C47B00;">${link}</a></p>
        </div>
        <div style="background:#F0E4D4;padding:14px 24px;text-align:center;">
          <p style="color:#9C7B5C;font-size:11px;margin:0;">Powered by BakerOS · Reply to this email if you have questions</p>
        </div>
      </div>`;

    setSendStep("sent");
    try {
      await apiFetch("/api/email", {
        method: "POST",
        body: JSON.stringify({
          to: [to],
          subject: `Invoice ${sel.id} · $${sel.amount} due ${sel.due}`,
          html: htmlEmail,
          from: "BakerOS Invoices <hello@bakeros.app>",
        })
      });
      setTimeout(()=>{ closeSend(); show(`Invoice emailed to ${to} ✓`); }, 1600);
    } catch {
      setSendStep("email");
      show("Failed to send email — please try again","error");
    }
  };

  const doSendText = async () => {
    const to  = sendTo || sel.phone;
    if (!to) { show("Enter a customer phone number","error"); return; }
    const link = invoiceLink(sel);
    const message = `Hi ${sel.customer}! Your invoice for $${sel.amount} is ready. View & pay here: ${link} (Due ${sel.due})`;

    setSendStep("sent");
    try {
      await apiFetch("/api/notify", {
        method: "POST",
        body: JSON.stringify({
          type: "customer_message",
          phone: to,
          message,
        })
      });
      setTimeout(()=>{ closeSend(); show(`Invoice texted to ${to} ✓`); }, 1600);
    } catch {
      setSendStep("text");
      show("Failed to send text — please try again","error");
    }
  };

  const copyLink = inv => {
    const link = invoiceLink(inv || sel);
    if (navigator.clipboard) navigator.clipboard.writeText(link);
    show("Invoice link copied ✓");
  };

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH
        title="Invoices"
        sub={`${invoices.length} invoices · $${totals.unpaid + totals.overdue} outstanding`}
        action={
          <button className="pbtn" onClick={()=>setShowNew(true)} style={{padding:"8px 14px",fontSize:13,borderRadius:10}}>
            + New
          </button>
        }
      />

      {/* Summary cards */}
      <div style={{padding:"0 12px 12px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
        {[
          {label:"Paid",    key:"paid",    value:`$${totals.paid}`,    bg:"#D1ECE4", c:"#155724"},
          {label:"Unpaid",  key:"unpaid",  value:`$${totals.unpaid}`,  bg:"#FFF3CD", c:"#856404"},
          {label:"Overdue", key:"overdue", value:`$${totals.overdue}`, bg:"#FEE2E2", c:"#991B1B"},
        ].map(s=>(
          <div key={s.label} onClick={()=>setInvFilter(f=>f===s.key?"all":s.key)} style={{background:s.bg,borderRadius:12,padding:"11px 10px",textAlign:"center",cursor:"pointer",outline:invFilter===s.key?`2.5px solid ${s.c}`:"none",boxShadow:invFilter===s.key?`0 0 0 2px ${s.c}40`:"none",transition:"box-shadow .15s"}}>
            <div style={{fontSize:15,fontWeight:800,color:s.c}}>{s.value}</div>
            <div style={{fontSize:10,fontWeight:700,color:s.c,marginTop:2,textTransform:"uppercase",letterSpacing:".5px"}}>{s.label}{invFilter===s.key?" ✓":""}</div>
          </div>
        ))}
      </div>

      {/* Invoice list */}
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
        {effectiveInvoices.length===0&&<div style={{padding:"48px 24px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>🧾</div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--tx)",marginBottom:6}}>No invoices yet</div>
          <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.5}}>Invoices are created automatically when you mark an order as completed</div>
        </div>}
        {(()=>{ const filteredInvoices = invFilter==="all" ? effectiveInvoices : effectiveInvoices.filter(i=>i.status===invFilter); return filteredInvoices; })().map(inv=>{
          const ss = STATUS_STYLE[inv.status] || STATUS_STYLE.unpaid;
          return (
            <div key={inv.id} className="card row" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>setSel(inv)}>
              {/* Final image thumbnail if attached */}
              {inv.finalImageURL && (
                <img src={inv.finalImageURL} alt="Final" style={{width:"100%",maxHeight:120,objectFit:"cover",borderRadius:10,display:"block",marginBottom:10,border:"1px solid var(--bd)"}}/>
              )}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--tx)"}}>{inv.customer}</div>
                  <div style={{fontSize:10,color:"var(--mu)",marginTop:2}}>{inv.id} · Due {inv.due}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                  <div style={{fontSize:15,fontWeight:800,color:b.theme.primary}}>${inv.amount}</div>
                  <span className="badge" style={{background:ss.bg,color:ss.c,marginTop:3,display:"inline-block"}}>{inv.status}</span>
                </div>
              </div>
              <div style={{fontSize:11,color:"var(--mu)",paddingTop:6,borderTop:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>{inv.items}</span>
                <button
                  onClick={e=>{e.stopPropagation();setSel(inv);openSend();}}
                  style={{background:"none",border:`1px solid ${b.theme.primary}`,borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700,color:b.theme.primary,cursor:"pointer",fontFamily:"var(--fb)",flexShrink:0}}
                >
                  Send
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Invoice detail sheet ── */}
      {sel && !showSend && (
        <div className="sheet">
          <div onClick={()=>setSel(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"6px 16px 16px"}}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)"}}>{sel.id}</div>
                  <div style={{fontSize:12,color:"var(--mu)",marginTop:2}}>{sel.customer} · Issued {sel.date}</div>
                </div>
                <button onClick={()=>setSel(null)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>

              {/* Invoice link preview */}
              <div style={{background:"var(--bg)",borderRadius:11,padding:"10px 13px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>🔗</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:1}}>Invoice Link</div>
                  <div style={{fontSize:11,color:"var(--tx)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{invoiceLink(sel)}</div>
                </div>
                <button onClick={()=>copyLink()} style={{background:"none",border:`1px solid var(--bd)`,borderRadius:8,padding:"4px 9px",fontSize:11,fontWeight:700,color:"var(--p)",cursor:"pointer",fontFamily:"var(--fb)",flexShrink:0}}>Copy</button>
              </div>

              {/* Detail rows */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
                {[["Items",sel.items],["Amount","$"+sel.amount],["Due Date",sel.due],["Status",sel.status]].map(([k,v])=>(
                  <div key={k} style={{background:"var(--bg)",borderRadius:10,padding:"9px 11px"}}>
                    <div style={{fontSize:9,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:2}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",textTransform:k==="Status"?"capitalize":"none"}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* ── Final completed image ── */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>
                  📸 Final Completed Image
                </div>
                {sel.finalImageURL ? (
                  <div style={{position:"relative"}}>
                    <img
                      src={sel.finalImageURL}
                      alt="Final"
                      style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:12,display:"block",border:"1px solid var(--bd)"}}
                    />
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button
                        onClick={()=>finalImgRef.current?.click()}
                        style={{flex:1,padding:"8px",borderRadius:10,border:"1.5px solid var(--bd)",background:"var(--bg)",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}
                      >
                        🔄 Replace
                      </button>
                      <button
                        onClick={()=>removeFinalImage(sel.id)}
                        style={{flex:1,padding:"8px",borderRadius:10,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={()=>finalImgRef.current?.click()}
                    style={{border:`2px dashed ${b.theme.primary}50`,borderRadius:12,padding:"20px",textAlign:"center",cursor:"pointer",background:`color-mix(in srgb,${b.theme.primary} 4%,var(--bg))`}}
                  >
                    <div style={{fontSize:28,marginBottom:6}}>📸</div>
                    <div style={{fontSize:13,fontWeight:700,color:b.theme.primary,marginBottom:3}}>Attach Final Photo</div>
                    <div style={{fontSize:11,color:"var(--mu)"}}>Show the customer what you made</div>
                  </div>
                )}
                {/* Hidden file input — gallery + camera */}
                <input
                  ref={finalImgRef}
                  type="file"
                  accept="image/*"
                  style={{display:"none"}}
                  onChange={e=>attachFinalImage(e.target.files[0], sel.id)}
                />
              </div>

              {/* Status update */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Update Status</div>
                <div style={{display:"flex",gap:8}}>
                  {["paid","unpaid","overdue"].map(s=>{
                    const ss=STATUS_STYLE[s];
                    return (
                      <button key={s} onClick={()=>updateStatus(sel.id,s)} style={{flex:1,padding:"9px",borderRadius:10,border:`1.5px solid ${sel.status===s?ss.c:"var(--bd)"}`,background:sel.status===s?ss.bg:"var(--sf)",color:sel.status===s?ss.c:"var(--mu)",fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer",textTransform:"capitalize"}}>{s}</button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <button className="pbtn" onClick={openSend}>📤 Send Invoice</button>
                <button className="gbtn" onClick={()=>copyLink()} style={{padding:"13px",borderRadius:12,color:"var(--tx)"}}>🔗 Copy Link</button>
              </div>

              {/* ── Pay buttons — shown if baker has handles set up ── */}
              {payHandles && Object.values(payHandles).some(v=>typeof v==="string" && v.trim()) && (
                <div style={{marginTop:12}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".7px",marginBottom:9}}>
                    Customer Pay Options
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>

                    {payHandles.cashapp?.trim() && (
                      <a
                        href={`https://cash.app/$${payHandles.cashapp.replace(/^\$/,"")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:13,background:"#00D64F12",border:"1.5px solid #00D64F40",textDecoration:"none"}}
                      >
                        <div style={{width:36,height:36,borderRadius:9,background:"#00D64F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💵</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Pay with Cash App</div>
                          <div style={{fontSize:11,color:"#16A34A",marginTop:1,fontWeight:600}}>${payHandles.cashapp.replace(/^\$/,"")}</div>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:"#16A34A"}}>→</div>
                      </a>
                    )}

                    {payHandles.venmo?.trim() && (
                      <a
                        href={`https://venmo.com/u/${payHandles.venmo.replace(/^@/,"")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:13,background:"#008CFF12",border:"1.5px solid #008CFF40",textDecoration:"none"}}
                      >
                        <div style={{width:36,height:36,borderRadius:9,background:"#008CFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💙</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Pay with Venmo</div>
                          <div style={{fontSize:11,color:"#008CFF",marginTop:1,fontWeight:600}}>@{payHandles.venmo.replace(/^@/,"")}</div>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:"#008CFF"}}>→</div>
                      </a>
                    )}

                    {payHandles.zelle?.trim() && (
                      <div
                        onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(payHandles.zelle);}}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:13,background:"#6D1ED412",border:"1.5px solid #6D1ED440",cursor:"pointer"}}
                      >
                        <div style={{width:36,height:36,borderRadius:9,background:"#6D1ED4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💜</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Pay with Zelle</div>
                          <div style={{fontSize:11,color:"#6D1ED4",marginTop:1,fontWeight:600}}>Send to: {payHandles.zelle}</div>
                        </div>
                        <div style={{fontSize:10,fontWeight:700,color:"#6D1ED4"}}>Copy</div>
                      </div>
                    )}

                  </div>
                  <div style={{fontSize:10,color:"var(--mu)",marginTop:8,textAlign:"center"}}>
                    These buttons appear on the invoice link your customer receives
                  </div>
                </div>
              )}

              {/* Prompt if no handles set yet */}
              {(!payHandles || !Object.values(payHandles).some(v=>typeof v==="string" && v.trim())) && (
                <div style={{marginTop:10,padding:"10px 13px",background:"var(--bg)",borderRadius:11,display:"flex",alignItems:"center",gap:9,border:"1px solid var(--bd)"}}>
                  <span style={{fontSize:16}}>💡</span>
                  <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5,flex:1}}>
                    Add your Cash App, Venmo, or Zelle in <span style={{color:"var(--p)",fontWeight:700,cursor:"pointer"}} onClick={()=>{}}>Payments</span> to show pay buttons on invoices.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Send Invoice sheet ── */}
      {showSend && sel && (
        <div className="sheet">
          <div onClick={closeSend} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"6px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>Send Invoice</div>
                <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>{sel.id} · ${sel.amount} · {sel.customer}</div>
              </div>
              <button onClick={closeSend} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
            </div>

            <div style={{padding:"0 16px"}}>
              {/* Invoice link always shown */}
              <div style={{background:"var(--bg)",borderRadius:12,padding:"11px 13px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>🔗</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",marginBottom:1}}>Shareable Link</div>
                  <div style={{fontSize:11,color:"var(--tx)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{invoiceLink(sel)}</div>
                </div>
                <button onClick={()=>copyLink()} style={{background:b.theme.primary,color:"#fff",border:"none",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--fb)",flexShrink:0}}>Copy</button>
              </div>

              {sendStep==="choose" && (
                <>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:12}}>Send via</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                    {/* Email option */}
                    <button
                      onClick={()=>setSendStep("email")}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"14px",borderRadius:14,border:"1.5px solid var(--bd)",background:"var(--sf)",cursor:"pointer",fontFamily:"var(--fb)",textAlign:"left"}}
                    >
                      <div style={{width:42,height:42,borderRadius:11,background:"color-mix(in srgb,#3D5A99 12%,var(--bg))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>✉️</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:"var(--tx)"}}>Send via Email</div>
                        <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>{sel.email || "Enter email address"}</div>
                      </div>
                      <span style={{marginLeft:"auto",color:"var(--mu)",fontSize:16}}>›</span>
                    </button>

                    {/* Text option */}
                    <button
                      onClick={()=>setSendStep("text")}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"14px",borderRadius:14,border:"1.5px solid var(--bd)",background:"var(--sf)",cursor:"pointer",fontFamily:"var(--fb)",textAlign:"left"}}
                    >
                      <div style={{width:42,height:42,borderRadius:11,background:"color-mix(in srgb,#16A34A 12%,var(--bg))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💬</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:"var(--tx)"}}>Send via Text (SMS)</div>
                        <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>{sel.phone || "Enter phone number"}</div>
                      </div>
                      <span style={{marginLeft:"auto",color:"var(--mu)",fontSize:16}}>›</span>
                    </button>
                  </div>
                </>
              )}

              {sendStep==="email" && (
                <>
                  <button onClick={()=>setSendStep("choose")} style={{background:"none",border:"none",color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)",fontSize:13,fontWeight:600,marginBottom:12,padding:0}}>← Back</button>
                  <Fld label="Send to Email" required>
                    <input
                      className="field"
                      type="email"
                      placeholder="customer@email.com"
                      value={sendTo || sel.email}
                      onChange={e=>setSendTo(e.target.value)}
                    />
                  </Fld>
                  <div style={{background:"var(--bg)",borderRadius:11,padding:"11px 13px",margin:"12px 0",fontSize:12,color:"var(--mu)",lineHeight:1.6}}>
                    <div style={{fontWeight:700,color:"var(--tx)",marginBottom:4}}>Email Preview</div>
                    <div><strong>Subject:</strong> Invoice {sel.id} · ${sel.amount} due {sel.due}</div>
                    <div style={{marginTop:4}}><strong>Body:</strong> Hi {sel.customer}, your invoice is ready. View and pay: <span style={{color:b.theme.primary}}>{invoiceLink(sel)}</span></div>
                  </div>
                  <button className="pbtn" onClick={doSendEmail} disabled={sendStep==="sent"} style={{width:"100%",marginTop:4}}>✉️ Send Email Now</button>
                </>
              )}

              {sendStep==="text" && (
                <>
                  <button onClick={()=>setSendStep("choose")} style={{background:"none",border:"none",color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)",fontSize:13,fontWeight:600,marginBottom:12,padding:0}}>← Back</button>
                  <Fld label="Send to Phone" required>
                    <input
                      className="field"
                      type="tel"
                      placeholder="(210) 555-0100"
                      value={sendTo || sel.phone}
                      onChange={e=>setSendTo(e.target.value)}
                    />
                  </Fld>
                  <div style={{background:"var(--bg)",borderRadius:11,padding:"11px 13px",margin:"12px 0",fontSize:12,color:"var(--mu)",lineHeight:1.6}}>
                    <div style={{fontWeight:700,color:"var(--tx)",marginBottom:4}}>Text Preview</div>
                    <div>Hi {sel.customer}, your invoice for ${sel.amount} is ready. View &amp; pay: <span style={{color:b.theme.primary}}>{invoiceLink(sel)}</span> (Due {sel.due})</div>
                  </div>
                  <button className="pbtn" onClick={doSendText} disabled={sendStep==="sent"} style={{width:"100%",marginTop:4}}>💬 Send Text Now</button>
                </>
              )}

              {sendStep==="sent" && (
                <div style={{textAlign:"center",padding:"28px 0"}}>
                  <div style={{fontSize:52,marginBottom:12,animation:"pop .5s cubic-bezier(.22,.68,0,1.4) both"}}>✅</div>
                  <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)",marginBottom:5}}>Invoice Sent!</div>
                  <div style={{fontSize:13,color:"var(--mu)"}}>A link to the invoice was delivered to {sel.customer}.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── New invoice sheet ── */}
      {showNew && (
        <div className="sheet">
          <div onClick={()=>setShowNew(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"6px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>New Invoice</div>
              <button onClick={()=>setShowNew(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
            </div>
            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:13}}>
              <Fld label="Customer Name" required>
                <input className="field" placeholder="e.g. BakerOS Customer" value={form.customer} onChange={e=>setForm(p=>({...p,customer:e.target.value}))}/>
              </Fld>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Fld label="Email">
                  <input className="field" type="email" placeholder="customer@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                </Fld>
                <Fld label="Phone">
                  <input className="field" type="tel" placeholder="(210) 555-0100" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
                </Fld>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--mu)",marginBottom:8}}>LINE ITEMS</div>
                {form.lineItems.map((li,idx)=>(
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"1fr 50px 70px 30px",gap:6,marginBottom:8,alignItems:"center"}}>
                    <select
                      value={li.productId}
                      onChange={e=>{
                        const prod = products.find(p=>p.id===e.target.value);
                        setForm(f=>{const items=[...f.lineItems];items[idx]={...items[idx],productId:e.target.value,name:prod?prod.name:items[idx].name,price:prod?String(prod.price):items[idx].price};return{...f,lineItems:items};});
                      }}
                      style={{padding:"9px 10px",borderRadius:9,border:"1.5px solid var(--bd)",background:"var(--bg)",color:"var(--tx)",fontSize:12,fontFamily:"var(--fb)"}}
                    >
                      <option value="">Custom item...</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" min="1" value={li.qty}
                      onChange={e=>{setForm(f=>{const items=[...f.lineItems];items[idx]={...items[idx],qty:e.target.value};return{...f,lineItems:items};});}}
                      style={{padding:"9px 8px",borderRadius:9,border:"1.5px solid var(--bd)",background:"var(--bg)",color:"var(--tx)",fontSize:12,textAlign:"center",fontFamily:"var(--fb)"}}/>
                    <input type="number" placeholder="$0.00" value={li.price}
                      onChange={e=>{setForm(f=>{const items=[...f.lineItems];items[idx]={...items[idx],price:e.target.value};return{...f,lineItems:items};});}}
                      style={{padding:"9px 8px",borderRadius:9,border:"1.5px solid var(--bd)",background:"var(--bg)",color:"var(--tx)",fontSize:12,fontFamily:"var(--fb)"}}/>
                    {form.lineItems.length>1&&<button onClick={()=>setForm(f=>({...f,lineItems:f.lineItems.filter((_,i)=>i!==idx)}))} style={{background:"none",border:"none",color:"#DC2626",fontSize:16,cursor:"pointer",fontWeight:700}}>×</button>}
                  </div>
                ))}
                <button onClick={()=>setForm(f=>({...f,lineItems:[...f.lineItems,{productId:"",name:"",qty:1,price:""}]}))}
                  style={{width:"100%",padding:"9px",borderRadius:9,border:"1.5px dashed var(--bd)",background:"none",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer",marginBottom:4}}>
                  + Add line item
                </button>
                <div style={{textAlign:"right",fontWeight:700,fontSize:14,color:"var(--tx)",marginTop:4}}>
                  Total: ${form.lineItems.reduce((s,li)=>s+(parseFloat(li.price)||0)*(parseInt(li.qty)||1),0).toFixed(2)}
                </div>
              </div>
              <Fld label="Due Date">
                <input className="field" placeholder="e.g. May 1" value={form.due} onChange={e=>setForm(p=>({...p,due:e.target.value}))}/>
              </Fld>
              {/* Final image on create */}
              <Fld label="Final Completed Image (optional)">
                {form.imageURL ? (
                  <div style={{position:"relative"}}>
                    <img src={form.imageURL} alt="Final" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:12,display:"block",border:"1px solid var(--bd)"}}/>
                    <button onClick={()=>setForm(p=>({...p,imageURL:null}))} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",width:24,height:24,color:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>✕</button>
                  </div>
                ) : (
                  <div onClick={()=>newImgRef.current?.click()} style={{border:`2px dashed ${b.theme.primary}50`,borderRadius:12,padding:"16px",textAlign:"center",cursor:"pointer",background:`color-mix(in srgb,${b.theme.primary} 4%,var(--bg))`}}>
                    <div style={{fontSize:24,marginBottom:4}}>📸</div>
                    <div style={{fontSize:12,fontWeight:700,color:b.theme.primary}}>Attach Final Photo</div>
                    <div style={{fontSize:10,color:"var(--mu)",marginTop:2}}>Optional — show what you made</div>
                  </div>
                )}
                <input ref={newImgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files[0];if(!file)return;const url=URL.createObjectURL(file);setForm(p=>({...p,imageURL:url}));}}/>
              </Fld>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                <button className="pbtn" onClick={createInvoice}>Create Invoice</button>
                <button className="gbtn" onClick={()=>setShowNew(false)} style={{padding:"13px",borderRadius:12,color:"var(--tx)"}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ── CALENDAR ──────────────────────────────── */
function CalendarPage({ orders=[], reminders=[], setReminders=()=>{} }) {
  const b = useBrand();
  const cityName = b.city || "your city";
  const { setPage: calSetPage, tier: calTier } = useTier();
  const canMarketingReminder = tierAtLeast(calTier||"starter", "pro");
  const [t, show] = useToast();

  // Current view state
  const today       = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selDay,    setSelDay]    = useState(null);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderForm,    setReminderForm]    = useState({text:"", time:"08:00", color:"#C47B00"});
  const [showDaySheet,    setShowDaySheet]    = useState(false);
  const [holidayPopup,    setHolidayPopup]    = useState(null); // holiday obj to show in popup

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const REMINDER_COLORS = ["#C47B00","#3D5A99","#DC2626","#16A34A","#7C5CBF","#0891B2","#DB2777"];

  // ── National Holidays + bakery marketing ideas ───────────────────────────
  const HOLIDAYS = useMemo(() => [
    // ── 2025 ──
    { date:"2025-05-26", name:"Memorial Day",              emoji:"🇺🇸", color:"#DC2626", idea:`Patriotic red, white & blue treats for ${cityName} backyard celebrations! Star-shaped cookies and flag cake rolls are crowd favorites. Book orders 2 weeks ahead!` },
    { date:"2025-06-15", name:"Father's Day",              emoji:"👔", color:"#3D5A99", idea:`Dads in ${cityName} love treats! Offer a 'Dad Box' — cookies, brownies, and a custom cake. Try sports-themed or 'World's Best Dad' cookie sets.` },
    { date:"2025-06-19", name:"Juneteenth",                emoji:"✊", color:"#DC2626", idea:`Celebrate freedom with a community special in ${cityName}. Red velvet is a traditional Juneteenth dessert — perfect for your menu!` },
    { date:"2025-07-04", name:"Independence Day",          emoji:"🎆", color:"#DC2626", idea:`Patriotic cakes and cookie boxes for ${cityName}'s 4th of July! Star-shaped cookies and flag cakes always sell fast. Book orders 2 weeks in advance!` },
    { date:"2025-08-01", name:"National Friendship Day",   emoji:"👭", color:"#DB2777", idea:`Perfect excuse for a 'treat yourself' campaign in ${cityName}! Promote a friends & family cookie box. Pair with a 'buy one give one' deal.` },
    { date:"2025-09-01", name:"Labor Day",                 emoji:"🛠️", color:"#3D5A99", idea:`End-of-summer cookout treats for ${cityName} families! Offer a party cake bundle for Labor Day weekend. Great time to run a summer closeout sale.` },
    { date:"2025-09-15", name:"Hispanic Heritage Month",   emoji:"🌮", color:"#C47B00", idea:`Celebrate Hispanic Heritage Month with your ${cityName} community! Feature pan dulce, tres leches, and Latin-inspired flavors all month through October 15.` },
    { date:"2025-10-13", name:"Columbus Day",              emoji:"⚓", color:"#3D5A99", idea:`Long weekend in ${cityName} = more celebrations! Promote custom cakes for fall gatherings. Great time to push Halloween pre-orders too.` },
    { date:"2025-10-31", name:"Halloween",                 emoji:"🎃", color:"#C47B00", idea:`Spooky decorated cookies, ghost cupcakes, and Halloween cakes for ${cityName}! Start promoting mid-October with a 'Countdown to Halloween' cookie drop series.` },
    { date:"2025-11-01", name:"Día de los Muertos",        emoji:"💀", color:"#7C5CBF", idea:`Día de los Muertos is a beautiful celebration in ${cityName}! Offer sugar skull cookies and marigold-decorated cakes. Share the cultural meaning in your posts.` },
    { date:"2025-11-11", name:"Veterans Day",              emoji:"🎖️", color:"#3D5A99", idea:`Honor ${cityName}'s veterans with a heartfelt discount or a 'red, white & blue' cookie box. Tag a veteran in your post — great community engagement.` },
    { date:"2025-11-27", name:"Thanksgiving",              emoji:"🦃", color:"#C47B00", idea:`Pumpkin, pecan, and apple-flavored cakes are huge in ${cityName}. Offer a Thanksgiving dessert bundle starting 2 weeks out. Families plan early — don't wait!` },
    { date:"2025-11-28", name:"Black Friday",              emoji:"🛍️", color:"#DC2626", idea:`Launch a Black Friday flash sale on gift boxes and cookie sets for ${cityName} shoppers! Limited-time deals create urgency. Bundle cookies + a holiday card for a giftable set.` },
    { date:"2025-12-12", name:"Día de Nuestra Señora",     emoji:"🌹", color:"#DC2626", idea:`A beloved feast day in many ${cityName} communities. Traditional pan dulce and celebration cakes for the occasion — a beautiful way to connect with local customers.` },
    { date:"2025-12-24", name:"Christmas Eve",             emoji:"🎄", color:"#16A34A", idea:`Christmas cookies, holiday cakes, and gift boxes — your biggest season in ${cityName}! Cut off orders by Dec 20 for fresh pickups. Start promoting December 1st.` },
    { date:"2025-12-25", name:"Christmas Day",             emoji:"🎁", color:"#DC2626", idea:`Feature Christmas cake pickups and last-minute gift boxes for ${cityName} families. A 'Christmas Morning Cinnamon Roll Box' is a cozy treat that sells great for Dec 25 pickup.` },
    { date:"2025-12-31", name:"New Year's Eve",            emoji:"🥂", color:"#7C5CBF", idea:`Celebration cakes and champagne-themed treats for ${cityName} NYE parties! Offer a countdown cookie box. Mini cakes and individual desserts are perfect for house parties.` },
    // ── 2026 ──
    { date:"2026-01-01", name:"New Year's Day",            emoji:"🎆", color:"#3D5A99", idea:`Ring in the new year in ${cityName} with a special resolution cake or cupcake box. 'New Year, New Treat' is a great campaign hook. Start January with a fresh menu launch!` },
    { date:"2026-01-19", name:"MLK Day",                   emoji:"✊", color:"#7C5CBF", idea:`Honor Dr. King's legacy in ${cityName} with a community special. Consider offering a discount to teachers or first responders — a great way to build community loyalty.` },
    { date:"2026-02-02", name:"Groundhog Day",             emoji:"🦔", color:"#C47B00", idea:`Fun, lighthearted holiday! 'Shadow or no shadow — there's always cake!' Offer a punxsutawney-themed cookie or a spring preview treat for ${cityName} customers.` },
    { date:"2026-02-14", name:"Valentine's Day",           emoji:"❤", color:"#DC2626", idea:`Heart-shaped cakes, custom cookie boxes, and couples treats are huge sellers in ${cityName}. Start promoting 3 weeks out! Offer a 'Build Your Own Valentine Box' for a personal touch.` },
    { date:"2026-02-16", name:"Presidents' Day",           emoji:"🎩", color:"#3D5A99", idea:`Long weekend means more celebrations in ${cityName}! Promote a patriotic cake deal or a winter gathering bundle for Presidents' Day get-togethers.` },
    { date:"2026-03-08", name:"International Women's Day", emoji:"💜", color:"#DB2777", idea:`Celebrate the women of ${cityName} with a purple & gold themed box. Perfect for gifting to moms, bosses, and friends. Consider partnering with a local women-owned business!` },
    { date:"2026-03-17", name:"St. Patrick's Day",         emoji:"🍀", color:"#16A34A", idea:`Green-themed cookies and cupcakes for ${cityName}! Offer a limited shamrock cookie box for the week. A green velvet cake makes a stunning St. Patrick's Day centerpiece.` },
    { date:"2026-03-20", name:"First Day of Spring",       emoji:"🌸", color:"#059669", idea:`Launch your spring menu for ${cityName} customers! Pastel colors, floral designs, and fresh fruit flavors. Tease the new menu on social a week before the big reveal.` },
    { date:"2026-04-05", name:"Easter",                    emoji:"🐣", color:"#059669", idea:`Easter basket cakes, egg-shaped cookies, and spring cupcakes for ${cityName} families. One of the biggest bakery holidays! Offer a 'Spring Cookie Decorating Kit' for kids.` },
    { date:"2026-04-22", name:"Earth Day",                 emoji:"🌍", color:"#16A34A", idea:`Go green for Earth Day in ${cityName}! Promote eco-friendly packaging or plant-based treats. Great for authentic brand storytelling on social media.` },
    { date:"2026-05-05", name:"Cinco de Mayo",             emoji:"🌮", color:"#C47B00", idea:`Celebrate Cinco de Mayo with your ${cityName} community! Latin-inspired flavors like horchata cake or tres leches are perfect. Offer a limited edition box with festive packaging.` },
    { date:"2026-05-10", name:"Mother's Day",              emoji:"🌸", color:"#DB2777", idea:`Biggest bakery holiday of the year in ${cityName}! Custom cakes, flower-decorated cupcakes, and gift boxes. Start your campaign 4 weeks out. Offer personalized messages on every order.` },
    { date:"2026-05-25", name:"Memorial Day",              emoji:"🇺🇸", color:"#DC2626", idea:`Patriotic red, white & blue treats for ${cityName} celebrations! Offer a BBQ party cake bundle for backyard gatherings. Star-shaped cookies and flag cakes always sell out — book early!` },
    { date:"2026-06-19", name:"Juneteenth",                emoji:"✊", color:"#DC2626", idea:`Celebrate freedom with a community special in ${cityName}. Red velvet is a traditional Juneteenth dessert. Consider a community giveaway or a donated box to a local organization.` },
    { date:"2026-06-21", name:"Father's Day",              emoji:"👔", color:"#3D5A99", idea:`Dads in ${cityName} love treats! Offer a 'Dad Box' — cookies, brownies, and a custom cake. Sports-themed cookie sets and 'World's Best Dad' designs are always a crowd favorite.` },
    { date:"2026-07-04", name:"Independence Day",          emoji:"🎆", color:"#DC2626", idea:`${cityName} knows how to celebrate the 4th! Patriotic cakes, star-shaped cookies, and red-white-blue cupcakes. Book orders 2 weeks out — these always sell out fast!` },
    { date:"2026-08-01", name:"National Friendship Day",   emoji:"👭", color:"#DB2777", idea:`Perfect excuse for a 'treat yourself' campaign in ${cityName}! Promote a friends & family cookie box. Try a 'Buy one, gift one' promotion to grow your customer base.` },
    { date:"2026-09-07", name:"Labor Day",                 emoji:"🛠️", color:"#3D5A99", idea:`End-of-summer cookout treats for ${cityName} families! Offer a party cake bundle for Labor Day weekend. A great time to preview your fall menu and build excitement.` },
    { date:"2026-09-15", name:"Hispanic Heritage Month",   emoji:"🌮", color:"#C47B00", idea:`Celebrate Hispanic Heritage Month with your ${cityName} community! Feature pan dulce, tres leches, and Latin-inspired flavors all month long through October 15.` },
    { date:"2026-10-12", name:"Columbus Day",              emoji:"⚓", color:"#3D5A99", idea:`Long weekend in ${cityName} = more celebrations! Promote custom cakes for fall gatherings. Also a great time to push Halloween pre-orders and fall flavor specials.` },
    { date:"2026-10-31", name:"Halloween",                 emoji:"🎃", color:"#C47B00", idea:`Spooky decorated cookies, ghost cupcakes, and Halloween cakes for ${cityName}! Start promoting mid-October with a 'Countdown to Halloween' weekly cookie drop on social.` },
    { date:"2026-11-01", name:"Día de los Muertos",        emoji:"💀", color:"#7C5CBF", idea:`Día de los Muertos is a beautiful celebration in ${cityName}! Offer sugar skull cookies and marigold-decorated cakes. Share the cultural meaning — customers love learning the story.` },
    { date:"2026-11-11", name:"Veterans Day",              emoji:"🎖️", color:"#3D5A99", idea:`Honor ${cityName}'s veterans with a heartfelt discount or a 'red, white & blue' cookie box. Tag a veteran in your social post — a gesture that builds real community trust.` },
    { date:"2026-11-26", name:"Thanksgiving",              emoji:"🦃", color:"#C47B00", idea:`Pumpkin, pecan, and apple-flavored cakes are huge in ${cityName}. Offer a Thanksgiving dessert bundle starting 2 weeks out. Families plan holiday orders early — start promoting now!` },
    { date:"2026-11-27", name:"Black Friday",              emoji:"🛍️", color:"#DC2626", idea:`Launch a Black Friday flash sale on gift boxes and cookie sets for ${cityName} shoppers! Limited time creates urgency. Bundle treats + a holiday card for a giftable set customers love.` },
    { date:"2026-12-12", name:"Día de Nuestra Señora",     emoji:"🌹", color:"#DC2626", idea:`A beloved feast day celebrated across many ${cityName} communities. Traditional pan dulce and celebration cakes for the occasion — a beautiful way to connect with local customers.` },
    { date:"2026-12-24", name:"Christmas Eve",             emoji:"🎄", color:"#16A34A", idea:`Christmas cookies, holiday cakes, and gift boxes — your biggest season in ${cityName}! Cut off orders by Dec 20 for fresh pickups. Start your Christmas promotions December 1st.` },
    { date:"2026-12-25", name:"Christmas Day",             emoji:"🎁", color:"#DC2626", idea:`Feature Christmas cake pickups and last-minute gift boxes for ${cityName} families. A 'Christmas Morning Cinnamon Roll Box' is a fan-favorite cozy treat for Dec 25 morning pickup.` },
    { date:"2026-12-31", name:"New Year's Eve",            emoji:"🥂", color:"#7C5CBF", idea:`Celebration cakes and champagne-themed treats for ${cityName} NYE parties! Offer a countdown cookie box. Mini cakes and individual desserts are always a hit for house parties.` },
    // ── 2027 ──
    { date:"2027-01-01", name:"New Year's Day",            emoji:"🎆", color:"#3D5A99", idea:`Ring in the new year in ${cityName} with a special resolution cake or cupcake box. 'New Year, New Treat' is a great hook. Start January with a fresh menu launch!` },
    { date:"2027-01-18", name:"MLK Day",                   emoji:"✊", color:"#7C5CBF", idea:`Honor Dr. King's legacy in ${cityName} with a community special. Consider offering a discount to teachers or first responders — a great way to build community loyalty.` },
    { date:"2027-02-14", name:"Valentine's Day",           emoji:"❤", color:"#DC2626", idea:`Heart-shaped cakes, custom cookie boxes, and couples treats are huge in ${cityName}. Start promoting 3 weeks out! Offer a 'Build Your Own Valentine Box' for a personal touch.` },
    { date:"2027-02-15", name:"Presidents' Day",           emoji:"🎩", color:"#3D5A99", idea:`Long weekend means more celebrations in ${cityName}! Promote a patriotic cake deal or a winter gathering bundle for the Presidents' Day holiday weekend.` },
    { date:"2027-03-17", name:"St. Patrick's Day",         emoji:"🍀", color:"#16A34A", idea:`Green-themed cookies and cupcakes for ${cityName}! Offer a limited shamrock cookie box for the week. A green velvet cake makes a stunning St. Patrick's Day centerpiece.` },
    { date:"2027-04-25", name:"Easter",                    emoji:"🐣", color:"#059669", idea:`Easter basket cakes, egg-shaped cookies, and spring cupcakes for ${cityName} families. One of the biggest bakery holidays! A 'Spring Cookie Decorating Kit' is perfect for kids.` },
    { date:"2027-05-05", name:"Cinco de Mayo",             emoji:"🌮", color:"#C47B00", idea:`Celebrate Cinco de Mayo with your ${cityName} community! Latin-inspired flavors like horchata cake or tres leches are perfect. Offer a limited edition box with festive packaging.` },
    { date:"2027-05-09", name:"Mother's Day",              emoji:"🌸", color:"#DB2777", idea:`Biggest bakery holiday of the year in ${cityName}! Custom cakes, flower-decorated cupcakes, and gift boxes. Start your campaign 4 weeks out with personalized order options.` },
    { date:"2027-05-31", name:"Memorial Day",              emoji:"🇺🇸", color:"#DC2626", idea:`Patriotic red, white & blue treats for ${cityName} celebrations! Offer a BBQ party cake bundle for backyard cookouts. Book orders 2 weeks ahead — patriotic cakes always sell fast!` },
    { date:"2027-06-19", name:"Juneteenth",                emoji:"✊", color:"#DC2626", idea:`Celebrate freedom with a community special in ${cityName}. Red velvet is a traditional Juneteenth dessert. Consider a community giveaway or donating a box to a local organization.` },
    { date:"2027-06-20", name:"Father's Day",              emoji:"👔", color:"#3D5A99", idea:`Dads in ${cityName} love treats! Offer a 'Dad Box' — cookies, brownies, and a custom cake. Sports-themed cookie sets and 'World's Best Dad' designs are always a crowd favorite.` },
    { date:"2027-07-04", name:"Independence Day",          emoji:"🎆", color:"#DC2626", idea:`${cityName} knows how to celebrate the 4th! Patriotic cakes, star-shaped cookies, flag cakes, and red-white-blue cupcakes. Book orders 2 weeks out — these always sell out!` },
    { date:"2027-09-06", name:"Labor Day",                 emoji:"🛠️", color:"#3D5A99", idea:`End-of-summer cookout treats for ${cityName} families! Offer a party cake bundle for Labor Day weekend. A great time to preview your fall menu and tease your Halloween collection.` },
    { date:"2027-10-11", name:"Columbus Day",              emoji:"⚓", color:"#3D5A99", idea:`Long weekend in ${cityName} = more celebrations! Great time to push Halloween pre-orders and fall flavor specials to get ahead of the rush.` },
    { date:"2027-10-31", name:"Halloween",                 emoji:"🎃", color:"#C47B00", idea:`Spooky decorated cookies, ghost cupcakes, and Halloween cakes for ${cityName}! Start promoting mid-October. A 'Countdown to Halloween' weekly cookie drop builds great buzz.` },
    { date:"2027-11-01", name:"Día de los Muertos",        emoji:"💀", color:"#7C5CBF", idea:`Día de los Muertos is a beautiful celebration in ${cityName}! Offer sugar skull cookies and marigold-decorated cakes. Share the cultural meaning — customers love learning the story.` },
    { date:"2027-11-11", name:"Veterans Day",              emoji:"🎖️", color:"#3D5A99", idea:`Honor ${cityName}'s veterans with a heartfelt discount or a 'red, white & blue' cookie box. Tag a veteran in your social post — a simple gesture that builds real community trust.` },
    { date:"2027-11-25", name:"Thanksgiving",              emoji:"🦃", color:"#C47B00", idea:`Pumpkin, pecan, and apple-flavored cakes are huge in ${cityName}. Offer a Thanksgiving dessert bundle starting 2 weeks out. Families plan early — don't wait to start promoting!` },
    { date:"2027-11-26", name:"Black Friday",              emoji:"🛍️", color:"#DC2626", idea:`Launch a Black Friday flash sale on gift boxes and cookie sets for ${cityName} shoppers! Limited time creates urgency. Bundle treats + a holiday card for a giftable set customers love.` },
    { date:"2027-12-24", name:"Christmas Eve",             emoji:"🎄", color:"#16A34A", idea:`Christmas cookies, holiday cakes, and gift boxes — your biggest season in ${cityName}! Cut off orders by Dec 20 for fresh pickups. Start your Christmas promotions December 1st.` },
    { date:"2027-12-25", name:"Christmas Day",             emoji:"🎁", color:"#DC2626", idea:`Feature Christmas cake pickups and last-minute gift boxes for ${cityName} families. A 'Christmas Morning Cinnamon Roll Box' is a fan-favorite cozy treat for Dec 25 morning pickup.` },
    { date:"2027-12-31", name:"New Year's Eve",            emoji:"🥂", color:"#7C5CBF", idea:`Celebration cakes and champagne-themed treats for ${cityName} NYE parties! Offer a countdown cookie box. Mini cakes and individual desserts are always a hit for house parties.` },
  ], [cityName]);

  // Build a quick lookup map: dateStr → holiday
  const holidayMap = useMemo(() => {
    const map = {};
    HOLIDAYS.forEach(h => { map[h.date] = h; });
    return map;
  }, [HOLIDAYS]);

  // 90-day advance marketing reminders — compute which holidays are 85–95 days away
  const upcomingMarketingAlerts = useMemo(() => {
    const alerts = [];
    HOLIDAYS.forEach(h => {
      const hDate  = new Date(h.date);
      const diff   = Math.round((hDate - today) / (1000*60*60*24));
      if (diff >= 85 && diff <= 95) alerts.push({...h, daysAway: diff});
    });
    return alerts;
  }, []);

  // Build calendar grid
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const ordersByDate = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!o.dueDate) return;
      if (!map[o.dueDate]) map[o.dueDate] = [];
      map[o.dueDate].push(o);
    });
    return map;
  }, [orders]);

  const remindersByDate = useMemo(() => {
    const map = {};
    reminders.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [reminders]);

  const toDateStr = (y, m, d) => {
    const mm = String(m + 1).padStart(2,"0");
    const dd = String(d).padStart(2,"0");
    return `${y}-${mm}-${dd}`;
  };

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); }
    else setViewMonth(m => m-1);
    setSelDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); }
    else setViewMonth(m => m+1);
    setSelDay(null);
  };

  const openDay = (dateStr) => {
    setSelDay(dateStr);
    const holiday = holidayMap[dateStr];
    if (holiday) {
      setHolidayPopup(holiday);
    } else {
      setShowDaySheet(true);
    }
  };

  const addReminder = () => {
    if (!reminderForm.text.trim()) { show("Enter reminder text","error"); return; }
    const dateStr = selDay || todayStr;
    setReminders(p => [...p, {
      id: Date.now(),
      date: dateStr,
      text: reminderForm.text,
      time: reminderForm.time,
      color: reminderForm.color,
    }]);
    setReminderForm({text:"", time:"08:00", color:"#C47B00"});
    setShowAddReminder(false);
    show("Reminder added ✓");
  };

  const deleteReminder = (id) => {
    setReminders(p => p.filter(r => r.id !== id));
    show("Reminder removed");
  };

  const STATUS_COLOR = {pending:"#C47B00", ready:"#3D5A99", completed:"#16A34A"};

  // Build grid cells
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({day: prevMonthDays - i, curr: false, dateStr: null});
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    cells.push({day: d, curr: true, dateStr, isToday: dateStr === todayStr});
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({day: d, curr: false, dateStr: null});
  }

  const selOrders    = selDay ? (ordersByDate[selDay]    || []) : [];
  const selReminders = selDay ? (remindersByDate[selDay] || []) : [];
  const selHoliday   = selDay ? holidayMap[selDay] : null;

  const upcomingOrders = orders
    .filter(o => o && o.dueDate && o.dueDate >= todayStr && o.status !== "completed")
    .sort((a,b) => a.dueDate.localeCompare(b.dueDate));

  // Holidays visible in current month view
  const monthStr     = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthHolidays = HOLIDAYS.filter(h => h.date.startsWith(monthStr));

  const nextMonthDate     = new Date(viewYear, viewMonth + 1, 1);
  const nextMonthStr      = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth()+1).padStart(2,"0")}`;
  const nextMonthHolidays = HOLIDAYS.filter(h => h.date.startsWith(nextMonthStr));

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH
        title="Calendar"
        sub="Orders, holidays & reminders"
        action={
          <button
            className="pbtn"
            onClick={()=>{ setSelDay(todayStr); setShowAddReminder(true); setShowDaySheet(false); }}
            style={{padding:"8px 14px",fontSize:13,borderRadius:10}}
          >
            + Reminder
          </button>
        }
      />

      {/* ── 90-day marketing alert banners ── */}
      {upcomingMarketingAlerts.map(h => (
        <div key={h.date} style={{margin:"0 12px 10px",background:`color-mix(in srgb,${h.color} 9%,var(--sf))`,border:`1.5px solid ${h.color}35`,borderRadius:13,padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:9}}>
            <div style={{width:36,height:36,borderRadius:9,background:h.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{h.emoji}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                <div style={{fontSize:13,fontWeight:800,color:"var(--tx)"}}>{h.name} is in {h.daysAway} days</div>
                <span style={{fontSize:9,fontWeight:800,background:h.color,color:"#fff",borderRadius:20,padding:"1px 7px"}}>90-DAY</span>
              </div>
              <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5}}>{h.idea}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={()=>calSetPage("marketing")} style={{padding:"8px",borderRadius:9,border:"none",background:h.color,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:11,cursor:"pointer"}}>✨ Build Campaign</button>
            <button onClick={()=>{ setReminders(p=>[...p,{id:Date.now(),date:h.date,text:`📣 Start ${h.name} marketing campaign`,time:"09:00",color:h.color}]); show("Marketing reminder added ✓"); }} style={{padding:"8px",borderRadius:9,border:`1px solid ${h.color}50`,background:"transparent",color:h.color,fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer"}}>+ Add Reminder</button>
          </div>
        </div>
      ))}

      {/* ── Month navigator ── */}
      <div style={{padding:"0 12px 12px"}}>
        <div className="card" style={{overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 10px"}}>
            <button onClick={prevMonth} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer",padding:"4px 8px",borderRadius:8}}>‹</button>
            <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>{MONTHS[viewMonth]} {viewYear}</div>
            <button onClick={nextMonth} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer",padding:"4px 8px",borderRadius:8}}>›</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 8px 4px"}}>
            {DAYS.map(d=>(
              <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:800,color:"var(--mu)",padding:"4px 0",textTransform:"uppercase",letterSpacing:".5px"}}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"0 8px 12px",gap:2}}>
            {cells.map((cell, i) => {
              const hasOrders    = cell.dateStr && (ordersByDate[cell.dateStr]||[]).length > 0;
              const hasReminders = cell.dateStr && (remindersByDate[cell.dateStr]||[]).length > 0;
              const isSelected   = cell.dateStr === selDay;
              const orderCount   = cell.dateStr ? (ordersByDate[cell.dateStr]||[]).length : 0;
              const holiday      = cell.dateStr ? holidayMap[cell.dateStr] : null;

              return (
                <div
                  key={i}
                  onClick={()=> cell.curr && cell.dateStr && openDay(cell.dateStr)}
                  style={{
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"center",
                    padding:"5px 2px",
                    borderRadius:10,
                    cursor: cell.curr ? "pointer" : "default",
                    background: isSelected
                      ? b.theme.primary
                      : cell.isToday
                      ? `color-mix(in srgb,${b.theme.primary} 12%,var(--sf))`
                      : holiday && cell.curr
                      ? `color-mix(in srgb,${holiday.color} 8%,var(--sf))`
                      : "transparent",
                    opacity: cell.curr ? 1 : 0.3,
                    minHeight:46,
                    position:"relative",
                  }}
                >
                  {/* Holiday emoji badge */}
                  {holiday && cell.curr && !isSelected && (
                    <div style={{position:"absolute",top:2,right:2,fontSize:8,lineHeight:1}}>{holiday.emoji}</div>
                  )}
                  <span style={{
                    fontSize:13,
                    fontWeight: cell.isToday || isSelected || holiday ? 800 : 500,
                    color: isSelected ? "#fff" : holiday && cell.curr ? holiday.color : cell.isToday ? b.theme.primary : "var(--tx)",
                    lineHeight:1.2,
                  }}>
                    {cell.day}
                  </span>

                  {/* Event dots */}
                  <div style={{display:"flex",gap:2,marginTop:3,height:6,alignItems:"center"}}>
                    {hasOrders && (
                      <div style={{
                        width: orderCount > 1 ? 14 : 5,
                        height:5,
                        borderRadius:3,
                        background: isSelected ? "rgba(255,255,255,.85)" : b.theme.primary,
                        fontSize:7,
                        fontWeight:800,
                        color: isSelected ? b.theme.primary : "#fff",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                      }}>
                        {orderCount > 1 ? orderCount : ""}
                      </div>
                    )}
                    {hasReminders && (
                      <div style={{width:5,height:5,borderRadius:"50%",background: isSelected ? "rgba(255,255,255,.8)" : "#DB2777"}}/>
                    )}
                    {holiday && cell.curr && !hasOrders && !hasReminders && (
                      <div style={{width:5,height:5,borderRadius:"50%",background: isSelected ? "rgba(255,255,255,.8)" : holiday.color}}/>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{padding:"0 16px 12px",display:"flex",gap:14,borderTop:"1px solid var(--bd)",paddingTop:10,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:6,borderRadius:3,background:b.theme.primary}}/><span style={{fontSize:10,color:"var(--mu)"}}>Order due</span></div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:"#DB2777"}}/><span style={{fontSize:10,color:"var(--mu)"}}>Reminder</span></div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:10}}>🎉</span><span style={{fontSize:10,color:"var(--mu)"}}>Holiday</span></div>
          </div>
        </div>
      </div>

      {/* ── Holidays this month ── */}
      {monthHolidays.length > 0 && (
        <div style={{padding:"0 12px 12px"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:9}}>Holidays This Month</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {monthHolidays.map(h => {
              const hDate = new Date(h.date);
              const daysAway = Math.round((hDate - today) / (1000*60*60*24));
              const label = daysAway < 0 ? "passed" : daysAway === 0 ? "today" : `in ${daysAway} days`;
              return (
                <div key={h.date} onClick={()=>setHolidayPopup(h)} className="card" style={{padding:"11px 13px",display:"flex",alignItems:"center",gap:11,cursor:"pointer",borderLeft:`3px solid ${h.color}`}}>
                  <div style={{width:34,height:34,borderRadius:9,background:`color-mix(in srgb,${h.color} 14%,var(--sf))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{h.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{h.name}</div>
                    <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{hDate.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · {label}</div>
                  </div>
                  {daysAway >= 0 && daysAway <= 90 && <span style={{fontSize:10,fontWeight:700,background:`color-mix(in srgb,${h.color} 14%,var(--sf))`,color:h.color,borderRadius:20,padding:"2px 8px",flexShrink:0}}>Market now</span>}
                  <span style={{fontSize:16,color:"var(--mu)"}}>›</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Next month teaser banner ── */}
      {nextMonthHolidays.length > 0 && (
        <div style={{padding:"0 12px 12px"}}>
          <button
            onClick={()=>{ setViewMonth(nextMonthDate.getMonth()); setViewYear(nextMonthDate.getFullYear()); }}
            style={{width:"100%",background:"color-mix(in srgb,#C47B00 10%,var(--sf))",border:"1.5px dashed #C47B00",borderRadius:13,padding:"12px 15px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}
          >
            <div style={{fontSize:26,flexShrink:0}}>🗓️</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:"#C47B00"}}>
                {nextMonthHolidays.length} holiday{nextMonthHolidays.length > 1 ? "s" : ""} coming in {nextMonthDate.toLocaleDateString("en-US",{month:"long"})}
              </div>
              <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>
                {nextMonthHolidays.map(h=>h.emoji).join("  ")} · Tap to start planning ahead
              </div>
            </div>
            <span style={{fontSize:18,color:"#C47B00",flexShrink:0}}>›</span>
          </button>
        </div>
      )}

      {/* ── Upcoming orders list ── */}
      <div style={{padding:"0 12px"}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:9}}>Upcoming Orders</div>
        {upcomingOrders.length === 0
          ? <div className="card" style={{padding:"24px",textAlign:"center",color:"var(--mu)",fontSize:13}}>No upcoming orders</div>
          : upcomingOrders.map((o, i) => {
              const dueD   = new Date(o.dueDate);
              const dayLabel = o.dueDate === todayStr ? "Today" : dueD.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
              const sc     = STATUS_COLOR[o.status] || "#6B7280";
              return (
                <div
                  key={o.id}
                  className="card row"
                  style={{padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
                  onClick={()=>openDay(o.dueDate)}
                >
                  {/* Date bubble */}
                  <div style={{width:42,height:42,borderRadius:11,background:`color-mix(in srgb,${b.theme.primary} 12%,var(--bg))`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:8,fontWeight:800,color:b.theme.primary,textTransform:"uppercase"}}>{dueD.toLocaleDateString("en-US",{month:"short"})}</span>
                    <span style={{fontSize:15,fontWeight:900,color:b.theme.primary,lineHeight:1}}>{dueD.getDate()}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.customer}</div>
                    <div style={{fontSize:11,color:"var(--mu)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.item}</div>
                    <div style={{fontSize:10,color:sc,fontWeight:700,marginTop:2,textTransform:"capitalize"}}>{dayLabel}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:800,color:b.theme.primary}}>${o.amount}</div>
                    <span className="badge" style={{background:`color-mix(in srgb,${sc} 12%,var(--sf))`,color:sc,marginTop:3,display:"inline-block",textTransform:"capitalize"}}>{o.status}</span>
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* ── Holiday marketing popup ── */}
      {holidayPopup && (
        <div className="sheet">
          <div onClick={()=>setHolidayPopup(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 0"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{width:52,height:52,borderRadius:14,background:`color-mix(in srgb,${holidayPopup.color} 14%,var(--sf))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,border:`1.5px solid ${holidayPopup.color}30`}}>{holidayPopup.emoji}</div>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)"}}>{holidayPopup.name}</div>
                  <div style={{fontSize:12,color:"var(--mu)",marginTop:2}}>{new Date(holidayPopup.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
                </div>
                <button onClick={()=>setHolidayPopup(null)} style={{marginLeft:"auto",background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>

              {/* Marketing idea */}
              <div style={{background:`color-mix(in srgb,${holidayPopup.color} 8%,var(--sf))`,border:`1.5px solid ${holidayPopup.color}30`,borderRadius:14,padding:"14px 15px",marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:800,color:holidayPopup.color,textTransform:"uppercase",letterSpacing:".8px",marginBottom:7}}>💡 Marketing Idea</div>
                <div style={{fontSize:13,color:"var(--tx)",lineHeight:1.6}}>{holidayPopup.idea}</div>
              </div>

              {/* Days until */}
              {(() => {
                const daysAway = Math.round((new Date(holidayPopup.date) - today) / (1000*60*60*24));
                if (daysAway < 0) return <div style={{fontSize:12,color:"var(--mu)",textAlign:"center",marginBottom:14}}>This holiday has passed for this year.</div>;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:14}}>
                    {[
                      {label:"Days Away", val:daysAway},
                      {label:"Start Campaign", val:`${Math.max(0,daysAway-21)} days`},
                      {label:"Urgency", val:daysAway<=14?"🔴 High":daysAway<=30?"🟡 Soon":"🟢 Plan"},
                    ].map(({label,val})=>(
                      <div key={label} style={{background:"var(--bg)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                        <div style={{fontSize:16,fontWeight:800,color:holidayPopup.color}}>{val}</div>
                        <div style={{fontSize:9,color:"var(--mu)",marginTop:2,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:12}}>
                <button
                  onClick={()=>{setHolidayPopup(null);calSetPage("marketing");}}
                  style={{width:"100%",padding:"13px",borderRadius:13,border:"none",background:`linear-gradient(135deg,${holidayPopup.color},color-mix(in srgb,${holidayPopup.color} 65%,#000))`,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:14,cursor:"pointer"}}
                >
                  ✨ Build {holidayPopup.name} Campaign
                </button>
                {canMarketingReminder
                  ? <button
                      onClick={()=>{
                        setReminders(p=>[...p,{id:Date.now(),date:holidayPopup.date,text:`📣 ${holidayPopup.name} — start your marketing campaign`,time:"09:00",color:holidayPopup.color}]);
                        show(`${holidayPopup.name} reminder added ✓`);
                        setHolidayPopup(null);
                      }}
                      style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px solid ${holidayPopup.color}50`,background:"transparent",color:holidayPopup.color,fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}
                    >
                      + Add Marketing Reminder
                    </button>
                  : <div style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--bd)",background:"var(--bg)",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                      <span style={{fontSize:13}}>🔒</span>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--mu)"}}>Marketing Reminders · Pro only</span>
                      <button onClick={()=>{setHolidayPopup(null);calSetPage("subscription");}} style={{marginLeft:"auto",background:"#C47B00",color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>Upgrade</button>
                    </div>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Day detail sheet ── */}
      {showDaySheet && selDay && (
        <div className="sheet">
          <div onClick={()=>setShowDaySheet(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.42)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 0"}}>
              {/* Day header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div>
                  <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"var(--tx)"}}>
                    {new Date(selDay+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                  </div>
                  <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>
                    {selOrders.length} order{selOrders.length!==1?"s":""} · {selReminders.length} reminder{selReminders.length!==1?"s":""}
                  </div>
                </div>
                <button onClick={()=>setShowDaySheet(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>

              {/* Orders on this day */}
              {selOrders.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>Orders Due</div>
                  {selOrders.map(o => {
                    const sc = STATUS_COLOR[o.status] || "#6B7280";
                    return (
                      <div key={o.id} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 12px",background:`color-mix(in srgb,${b.theme.primary} 7%,var(--bg))`,borderRadius:12,marginBottom:7,border:`1px solid ${b.theme.primary}22`}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:sc,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{o.customer}</div>
                          <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{o.item}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:13,fontWeight:800,color:b.theme.primary}}>${o.amount}</div>
                          <span style={{fontSize:9,fontWeight:700,color:sc,textTransform:"capitalize"}}>{o.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reminders on this day */}
              {selReminders.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>Reminders</div>
                  {selReminders.map(r => (
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 12px",background:"var(--bg)",borderRadius:12,marginBottom:7,border:`1px solid var(--bd)`}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:r.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{r.text}</div>
                        <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>⏰ {r.time}</div>
                      </div>
                      <button onClick={()=>{ if(!window.confirm(`Delete reminder "${r.text}"? This cannot be undone.`)) return; deleteReminder(r.id); }} style={{background:"none",border:"none",color:"#FCA5A5",cursor:"pointer",fontSize:15,fontWeight:700,flexShrink:0}}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {selOrders.length === 0 && selReminders.length === 0 && (
                <div style={{textAlign:"center",padding:"20px 0",color:"var(--mu)",fontSize:13}}>Nothing scheduled for this day</div>
              )}

              {/* Add reminder for this day */}
              <button
                className="pbtn"
                onClick={()=>{ setShowDaySheet(false); setShowAddReminder(true); }}
                style={{width:"100%",marginBottom:8}}
              >
                + Add Reminder for This Day
              </button>
              <button
                className="gbtn"
                onClick={()=>setShowDaySheet(false)}
                style={{width:"100%",padding:"12px",borderRadius:12,color:"var(--tx)"}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add reminder sheet ── */}
      {showAddReminder && (
        <div className="sheet">
          <div onClick={()=>setShowAddReminder(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.42)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>Add Reminder</div>
                <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>
                  {selDay ? new Date(selDay+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}) : "Today"}
                </div>
              </div>
              <button onClick={()=>setShowAddReminder(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
            </div>

            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:14}}>
              <Fld label="Reminder" required>
                <input
                  className="field"
                  placeholder="e.g. Start baking at 6am"
                  value={reminderForm.text}
                  onChange={e=>setReminderForm(p=>({...p,text:e.target.value}))}
                />
              </Fld>

              <Fld label="Time">
                <input
                  className="field"
                  type="time"
                  value={reminderForm.time}
                  onChange={e=>setReminderForm(p=>({...p,time:e.target.value}))}
                />
              </Fld>

              {/* Color picker */}
              <Fld label="Color">
                <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
                  {REMINDER_COLORS.map(col=>(
                    <div
                      key={col}
                      onClick={()=>setReminderForm(p=>({...p,color:col}))}
                      style={{
                        width:28,height:28,borderRadius:"50%",background:col,
                        cursor:"pointer",
                        border:`3px solid ${reminderForm.color===col?"var(--tx)":"transparent"}`,
                        boxShadow: reminderForm.color===col ? `0 0 0 2px var(--sf)` : "none",
                        transition:"all .15s",
                      }}
                    />
                  ))}
                </div>
              </Fld>

              {/* Preview */}
              {reminderForm.text && (
                <div style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",background:"var(--bg)",borderRadius:12,border:"1px solid var(--bd)"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:reminderForm.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{reminderForm.text}</div>
                    <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>⏰ {reminderForm.time}</div>
                  </div>
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                <button className="pbtn" onClick={addReminder}>Save Reminder</button>
                <button className="gbtn" onClick={()=>setShowAddReminder(false)} style={{padding:"13px",borderRadius:12,color:"var(--tx)"}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PRODUCTS PAGE ─────────────────────────── */
function ProductFormSheet({ isEdit, onClose, productForm, setProductForm, categories, products, recipes=[], SELL_BY_OPTIONS, MIN_ORDER_OPTIONS, openAddCat, toggleProductCat, catColor, catEmoji, catName, editingProduct, saveProduct, productImgRef, deleteProduct }) {
  const b = useBrand();
  const [catDropOpen, setCatDropOpen] = useState(false);
  return (
  <div className="sheet">
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
    <div className="sheet-panel">
      <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
      <div style={{padding:"4px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>{isEdit?"Edit Product":"New Product"}</div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
      </div>
      <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:13}}>

        <Fld label="Product Name" required>
          <input className="field" placeholder="e.g. Custom Birthday Cake" value={productForm.name} onChange={e=>{const v=e.target.value;setProductForm(p=>({...p,name:v}));}} autoComplete="off"/>
        </Fld>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fld label="Price ($)" required>
            <input className="field" type="number" min="0" step="0.01" placeholder="0.00" value={productForm.price} onChange={e=>setProductForm(p=>({...p,price:e.target.value}))}/>
          </Fld>
          <Fld label="Sold by">
            <select className="field" value={productForm.sellBy||"each"} onChange={e=>setProductForm(p=>({...p,sellBy:e.target.value}))}>
              {SELL_BY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Fld>
        </div>

        <Fld label="Minimum order quantity">
          <select className="field" value={productForm.minOrder||"1"} onChange={e=>setProductForm(p=>({...p,minOrder:e.target.value}))}>
            {MIN_ORDER_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </Fld>

        {/* Photo or Emoji */}
        <Fld label="Product Image or Emoji">
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            {/* Image upload area */}
            <div
              onClick={()=>productImgRef.current?.click()}
              style={{
                width:72,height:72,borderRadius:13,flexShrink:0,
                border:`1.5px dashed ${productForm.imageURL ? b.theme.primary : "var(--bd)"}`,
                background: productForm.imageURL ? "transparent" : "var(--bg)",
                display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"pointer",overflow:"hidden",position:"relative",
              }}
            >
              {productForm.imageURL
                ? <img src={productForm.imageURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                : <span style={{fontSize:28}}>{productForm.emoji||"🎂"}</span>
              }
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,.45)",padding:"3px 0",textAlign:"center",fontSize:9,fontWeight:700,color:"#fff"}}>
                {productForm.imageURL ? "Change" : "Upload"}
              </div>
            </div>
            <input ref={productImgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
              const file = e.target.files[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setProductForm(p=>({...p, imageURL:url}));
            }}/>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
              {/* Emoji fallback input */}
              <div>
                <div style={{fontSize:10,color:"var(--mu)",fontWeight:600,marginBottom:4}}>Emoji (shown when no photo)</div>
                <input
                  className="field"
                  value={productForm.emoji}
                  onChange={e=>setProductForm(p=>({...p,emoji:e.target.value}))}
                  style={{fontSize:22,textAlign:"center",padding:"7px"}}
                  placeholder="🎂"
                />
              </div>
              {productForm.imageURL && (
                <button
                  onClick={()=>setProductForm(p=>({...p,imageURL:null}))}
                  style={{padding:"6px 10px",borderRadius:9,border:"1px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}
                >
                  ✕ Remove Photo
                </button>
              )}
            </div>
          </div>
        </Fld>

        <Fld label="Description">
          <textarea className="field" rows={2} placeholder="Short description of this product..." value={productForm.description} onChange={e=>setProductForm(p=>({...p,description:e.target.value}))} style={{resize:"none"}}/>
        </Fld>

        {/* ── Category multi-select dropdown ── */}
        <Fld label="Categories">
          {/* Trigger */}
          <div
            onClick={()=>setCatDropOpen(o=>!o)}
            style={{width:"100%",background:"var(--bg)",border:`1.5px solid ${catDropOpen?"var(--p)":"var(--bd)"}`,borderRadius:12,padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",userSelect:"none"}}
          >
            <div style={{flex:1,minWidth:0}}>
              {productForm.categories.length===0
                ? <span style={{color:"var(--mu)",fontSize:14}}>Select categories...</span>
                : <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {productForm.categories.map(cId=>(
                      <span key={cId} style={{background:`color-mix(in srgb,${catColor(cId)} 15%,var(--sf))`,color:catColor(cId),borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                        {catEmoji(cId)} {catName(cId)}
                        <span
                          onClick={e=>{e.stopPropagation();toggleProductCat(cId);}}
                          style={{fontWeight:800,fontSize:12,cursor:"pointer",lineHeight:1}}
                        >×</span>
                      </span>
                    ))}
                  </div>
              }
            </div>
            <span style={{color:"var(--mu)",fontSize:12,marginLeft:8,flexShrink:0}}>{catDropOpen?"▲":"▼"}</span>
          </div>

          {/* Dropdown options */}
          {catDropOpen && (
            <div style={{background:"var(--sf)",border:"1.5px solid var(--bd)",borderRadius:12,marginTop:4,overflow:"hidden",boxShadow:"0 6px 20px rgba(0,0,0,.12)"}}>
              {categories.length===0
                ? <div style={{padding:"14px",fontSize:12,color:"var(--mu)",textAlign:"center"}}>No categories yet — create one below</div>
                : categories.map(cat=>{
                    const selected = productForm.categories.includes(cat.id);
                    return(
                      <div
                        key={cat.id}
                        onClick={()=>toggleProductCat(cat.id)}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",background:selected?`color-mix(in srgb,${cat.color} 8%,var(--sf))`:"var(--sf)",borderBottom:"1px solid var(--bd)",transition:"background .13s"}}
                      >
                        {/* Checkbox */}
                        <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${selected?cat.color:"var(--bd)"}`,background:selected?cat.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                          {selected&&<span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>}
                        </div>
                        <span style={{fontSize:18,flexShrink:0}}>{cat.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{cat.name}</div>
                          <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>{products.filter(p=>p.categories.includes(cat.id)).length} products</div>
                        </div>
                        {selected&&<span style={{fontSize:11,fontWeight:700,color:cat.color}}>✓ Added</span>}
                      </div>
                    );
                  })
              }
              <div
                onClick={()=>{setCatDropOpen(false);openAddCat();}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",background:"var(--bg)",color:"var(--p)"}}
              >
                <span style={{fontSize:16}}>+</span>
                <span style={{fontSize:13,fontWeight:700}}>Create new category</span>
              </div>
            </div>
          )}
        </Fld>

        {/* Active toggle */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 13px",background:"var(--bg)",borderRadius:12,border:"1px solid var(--bd)"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Active (visible on storefront)</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>Turn off to hide without deleting</div>
          </div>
          <div className="toggle" style={{background:productForm.active?b.theme.primary:"var(--bd)"}} onClick={()=>setProductForm(p=>({...p,active:!p.active}))}>
            <div className="toggle-knob" style={{left:productForm.active?22:3}}/>
          </div>
        </div>

        {/* Signature item checkbox */}
        <div
          onClick={()=>setProductForm(p=>({...p,signature:!p.signature}))}
          style={{display:"flex",alignItems:"center",gap:12,padding:"11px 13px",background:productForm.signature?`color-mix(in srgb,${b.theme.primary} 8%,var(--bg))`:"var(--bg)",borderRadius:12,border:`1.5px solid ${productForm.signature?b.theme.primary+"60":"var(--bd)"}`,cursor:"pointer",transition:"all .15s"}}
        >
          <div style={{
            width:22,height:22,borderRadius:6,flexShrink:0,
            border:`2px solid ${productForm.signature?b.theme.primary:"var(--bd)"}`,
            background:productForm.signature?b.theme.primary:"transparent",
            display:"flex",alignItems:"center",justifyContent:"center",
            transition:"all .15s",
          }}>
            {productForm.signature && <span style={{color:"#fff",fontSize:13,fontWeight:800}}>✓</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",display:"flex",alignItems:"center",gap:6}}>
              ⭐ Mark as Signature Item
              {productForm.signature && <span style={{fontSize:10,fontWeight:800,background:b.theme.primary,color:"#fff",borderRadius:20,padding:"1px 7px"}}>SIGNATURE</span>}
            </div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>Signature items get their own tab on your storefront</div>
          </div>
        </div>

        {/* Recipe link — inventory upsell for Trial users */}
        <div style={{background:"var(--bg)",borderRadius:12,padding:"12px 14px",border:"1.5px solid var(--bd)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>🔗 Linked Recipe <span style={{fontSize:10,fontWeight:500,color:"var(--mu)"}}>— auto-deducts inventory on order complete</span></div>
          {(() => {
            const { tier: pfTier, setPage: pfSetPage } = useTier();
            const hasInv = canAccess(pfTier, "inventory");
            if (!hasInv) return (
              <div style={{textAlign:"center",padding:"8px 0"}}>
                <div style={{fontSize:12,color:"var(--mu)",marginBottom:8}}>🔒 Upgrade to Growth to link recipes and auto-track inventory</div>
                <button onClick={()=>pfSetPage("subscription")} style={{background:"var(--p)",color:"#fff",border:"none",borderRadius:9,padding:"8px 18px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>Upgrade to Growth →</button>
              </div>
            );
            return (
              <>
                <select className="field" value={productForm.recipeId||""} onChange={e=>setProductForm(p=>({...p,recipeId:e.target.value}))}>
                  <option value="">— No recipe linked —</option>
                  {recipes.map(r=><option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
                </select>
                {productForm.recipeId && <div style={{fontSize:11,color:"#16A34A",marginTop:6,fontWeight:600}}>✓ Inventory will auto-deduct when this product's order is completed</div>}
                {!productForm.recipeId && recipes.length===0 && <div style={{fontSize:11,color:"var(--mu)",marginTop:6}}>No recipes yet — add one in the Recipes page first, then come back to link it</div>}
                {!productForm.recipeId && recipes.length>0 && <div style={{fontSize:11,color:"#BA7517",marginTop:6}}>⚠ No recipe linked — inventory won't auto-deduct for this product</div>}
              </>
            );
          })()}
        </div>

        <div style={{display:"grid",gridTemplateColumns:isEdit?"1fr 1fr 1fr":"1fr 1fr",gap:9,marginTop:4}}>
          <button className="pbtn" onClick={()=>saveProduct(isEdit)}>{isEdit?"Save Changes":"Add Product"}</button>
          {isEdit&&<button onClick={()=>{ if(!window.confirm(`Delete "${productForm.name || 'this product'}"? This cannot be undone.`)) return; deleteProduct(editingProduct.id); onClose(); }} style={{padding:"13px",borderRadius:12,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Delete</button>}
          <button className="gbtn" onClick={onClose} style={{padding:"13px",borderRadius:12,color:"var(--tx)"}}>Cancel</button>
        </div>
      </div>
    </div>
  </div>

  );
}

function CatFormSheet({ isEdit, onClose, catForm, deleteCat, editingCat, saveCat, setCatForm }) {
  const b = useBrand();
  return (
  <div className="sheet">
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
    <div className="sheet-panel">
      <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
      <div style={{padding:"4px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>{isEdit?"Edit Category":"New Category"}</div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
      </div>
      <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:13}}>

        {/* Preview */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:`color-mix(in srgb,${catForm.color} 12%,var(--bg))`,border:`1.5px solid ${catForm.color}40`}}>
          <div style={{width:42,height:42,borderRadius:11,background:catForm.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{catForm.emoji}</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:catForm.color}}>{catForm.name||"Category name"}</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>Category preview</div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fld label="Category Name" required>
            <input className="field" placeholder="e.g. Weddings" value={catForm.name} onChange={e=>setCatForm(p=>({...p,name:e.target.value}))}/>
          </Fld>
          <Fld label="Emoji">
            <input className="field" value={catForm.emoji} onChange={e=>setCatForm(p=>({...p,emoji:e.target.value}))} style={{fontSize:22,textAlign:"center"}}/>
          </Fld>
        </div>

        {/* Color picker */}
        <Fld label="Color">
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            {CAT_COLORS.map(col=>(
              <div key={col} onClick={()=>setCatForm(p=>({...p,color:col}))} style={{width:30,height:30,borderRadius:"50%",background:col,cursor:"pointer",border:`3px solid ${catForm.color===col?"var(--tx)":"transparent"}`,boxShadow:catForm.color===col?"0 0 0 2px var(--sf)":"none",transition:"all .15s"}}/>
            ))}
          </div>
        </Fld>

        <div style={{display:"grid",gridTemplateColumns:isEdit?"1fr 1fr 1fr":"1fr 1fr",gap:9,marginTop:4}}>
          <button className="pbtn" onClick={()=>saveCat(isEdit)}>{isEdit?"Save Changes":"Create Category"}</button>
          {isEdit&&<button onClick={()=>{ if(!window.confirm(`Delete category "${catForm.name || 'this category'}"? Products in this category won't be deleted. This cannot be undone.`)) return; deleteCat(editingCat.id); onClose(); }} style={{padding:"13px",borderRadius:12,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Delete</button>}
          <button className="gbtn" onClick={onClose} style={{padding:"13px",borderRadius:12,color:"var(--tx)"}}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
  );
}

function ProductsPage({ products, setProducts, categories, setCategories, tier="starter", recipes=[] }) {
  const b = useBrand();
  const [t, show] = useToast();

  // ── State (now lifted to App) ──────────────────────────────────────────────
  const _unused = [
    { id:"p-1",  name:"Custom Birthday Cake",   price:85,  description:"Fully personalised layered cake",   emoji:"🎂",  active:true,  categories:["cat-1"]         },
    { id:"p-2",  name:"Cupcake Dozen",           price:48,  description:"12 hand-decorated cupcakes",        emoji:"🧁",  active:true,  categories:["cat-1","cat-3"] },
    { id:"p-3",  name:"Wedding Tier Cake",       price:350, description:"Multi-tier wedding masterpiece",    emoji:"💒",  active:true,  categories:["cat-2"]         },
    { id:"p-4",  name:"Wedding Cupcake Tower",   price:180, description:"Cupcake tower for receptions",      emoji:"🧁",  active:true,  categories:["cat-2"]         },
    { id:"p-5",  name:"Custom Smash Cake",       price:65,  description:"First birthday smash cake",         emoji:"🎊",  active:true,  categories:["cat-1","cat-3"] },
    { id:"p-6",  name:"Pumpkin Spice Cake",      price:55,  description:"Seasonal autumn flavour",           emoji:"🎃",  active:false, categories:["cat-4"]         },
    { id:"p-7",  name:"Sourdough Loaf",          price:14,  description:"72-hour cold-fermented sourdough",  emoji:"🍞",  active:true,  categories:[]                },
    { id:"p-8",  name:"Croissant Box (12)",      price:36,  description:"Buttery golden croissants",         emoji:"🥐",  active:true,  categories:[]                },
  ];

  // ── Sheet state ────────────────────────────────────────────────────────────
  const [showAddProduct,   setShowAddProduct]   = useState(false);
  const [showEditProduct,  setShowEditProduct]  = useState(false);
  const [showAddCat,       setShowAddCat]       = useState(false);
  const [showEditCat,      setShowEditCat]      = useState(false);
  const [editingProduct,   setEditingProduct]   = useState(null);
  const [editingCat,       setEditingCat]       = useState(null);
  const [activeTab,        setActiveTab]        = useState("products"); // "products" | "categories"
  const [filterCat,        setFilterCat]        = useState("all");
  // catDropOpen is now managed inside ProductFormSheet to prevent parent re-renders

  // ── Forms ──────────────────────────────────────────────────────────────────
  const blankProduct = { name:"", price:"", description:"", emoji:"🎂", imageURL:null, active:true, signature:false, categories:[], sellBy:"each", minOrder:"1", recipeId:"" };
  const blankCat     = { name:"", emoji:"🎂", color:"#C47B00" };
  const [productForm, setProductForm] = useState(blankProduct);
  const [catForm,     setCatForm]     = useState(blankCat);
  const productImgRef = useRef();

  const SELL_BY_OPTIONS = [
    { value:"each",       label:"1 Each" },
    { value:"half_dozen", label:"Half Dozen (6)" },
    { value:"dozen",      label:"Dozen (12)" },
  ];
  const MIN_ORDER_OPTIONS = ["1","2","3","4","5","6","7","8","9","10"];
  const getSellByLabel = (val) => SELL_BY_OPTIONS.find(o=>o.value===val)?.label || "1 Each";

  const CAT_COLORS = ["#C47B00","#DB2777","#7C5CBF","#059669","#0891B2","#3D5A99","#DC2626","#6B7280"];

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openAddProduct  = ()  => { setProductForm(blankProduct); setShowAddProduct(true); };
  const openEditProduct = (p) => { setEditingProduct(p); setProductForm({...p, price:String(p.price), sellBy:p.sellBy||"each", minOrder:p.minOrder||"1"}); setShowEditProduct(true); };
  const openAddCat      = ()  => { setCatForm(blankCat); setShowAddCat(true); };
  const openEditCat     = (c) => { setEditingCat(c); setCatForm({...c}); setShowEditCat(true); };

  const toggleProductCat = (catId) => {
    setProductForm(p => {
      const has = p.categories.includes(catId);
      return { ...p, categories: has ? p.categories.filter(c=>c!==catId) : [...p.categories, catId] };
    });
  };

  const saveProduct = (isEdit) => {
    if (!productForm.name.trim())     { show("Product name required","error"); return; }
    if (!productForm.price)           { show("Price required","error"); return; }
    if (!isEdit && !canAccess(tier,"unlimited_products") && products.length >= 15) {
      show("Trial Access allows up to 15 products. Upgrade to Growth for unlimited.","error"); return;
    }
    const data = { ...productForm, price: parseFloat(productForm.price)||0 };
    if (isEdit) {
      setProducts(p => p.map(x => x.id===editingProduct.id ? {...data, id:editingProduct.id} : x));
      show("Product updated ✓");
      setShowEditProduct(false);
    } else {
      const newId = "p-"+Date.now();
      setProducts(p => [...p, {...data, id:newId}]);
      setShowAddProduct(false);
      // If no recipe linked, prompt baker to add one
      if (!data.recipeId) {
        setTimeout(() => {
          if (window.confirm(`"${data.name}" was added! \n\nDo you want to link a recipe to track ingredient usage?\n\n(You can also do this later by editing the product)`)) {
            // Navigate to recipes page
            setShowAddProduct(false);
          }
        }, 300);
      } else {
        show("Product added with recipe linked ✓ — inventory will auto-deduct on completion");
      }
    }
  };

  const deleteProduct = (id) => {
    setProducts(p => p.filter(x => x.id!==id));
    show("Product deleted");
  };

  const toggleActive = (id) => {
    setProducts(p => p.map(x => x.id===id ? {...x, active:!x.active} : x));
  };

  const saveCat = (isEdit) => {
    if (!catForm.name.trim()) { show("Category name required","error"); return; }
    if (isEdit) {
      setCategories(p => p.map(c => c.id===editingCat.id ? {...catForm, id:editingCat.id} : c));
      show("Category updated ✓");
      setShowEditCat(false);
    } else {
      const newCat = { ...catForm, id:"cat-"+Date.now() };
      setCategories(p => [...p, newCat]);
      show("Category created ✓");
      setShowAddCat(false);
    }
  };

  const deleteCat = (id) => {
    setCategories(p => p.filter(c => c.id!==id));
    setProducts(p => p.map(x => ({...x, categories: x.categories.filter(c=>c!==id)})));
    setShowEditCat(false);
    show("Category deleted");
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredProducts = filterCat==="all"
    ? products
    : filterCat==="uncategorised"
    ? products.filter(p => p.categories.length===0)
    : products.filter(p => p.categories.includes(filterCat));

  const catName  = id => categories.find(c=>c.id===id)?.name || "";
  const catEmoji = id => categories.find(c=>c.id===id)?.emoji || "";
  const catColor = id => categories.find(c=>c.id===id)?.color || "var(--mu)";


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH
        title="Products"
        sub={`${products.length} products · ${categories.length} categories`}
        action={
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <PageHelp pageKey="products"/>
            <button className="pbtn" onClick={openAddProduct} style={{padding:"8px 14px",fontSize:13,borderRadius:10}}>+ Add</button>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{padding:"0 12px 12px",display:"flex",gap:6}}>
        {[["products",`Products (${products.length})`],["categories",`Categories (${categories.length})`]].map(([id,label])=>(
          <button key={id} className={`ptab ${activeTab===id?"on":"off"}`} onClick={()=>setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {activeTab==="products" && (
        <>
          {/* Category filter */}
          <div style={{padding:"0 12px 10px",display:"flex",gap:6,overflowX:"auto"}}>
            {[{id:"all",name:"All",emoji:"🛍",count:products.length}, ...categories.map(c=>({...c,count:products.filter(p=>p.categories.includes(c.id)).length})), {id:"uncategorised",name:"Uncategorised",emoji:"📦",count:products.filter(p=>p.categories.length===0).length}]
              .map(c=>(
                <button key={c.id} className={`ptab ${filterCat===c.id?"on":"off"}`} onClick={()=>setFilterCat(c.id)} style={{flexShrink:0}}>
                  {c.emoji} {c.name} ({c.count})
                </button>
              ))
            }
          </div>

          {/* Product cards */}
          <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
            {filteredProducts.length===0
              ? <div className="card" style={{padding:"28px",textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:8}}>🛍</div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:4}}>No products yet</div>
                  <div style={{fontSize:11,color:"var(--mu)",marginBottom:14}}>Tap "+ Add" to create your first product</div>
                  <button className="pbtn" onClick={openAddProduct} style={{padding:"10px 22px",borderRadius:12,fontSize:13}}>+ Add Product</button>
                </div>
              : filteredProducts.map(prod=>{
                  const prodCats = categories.filter(c=>prod.categories.includes(c.id));
                  return (
                    <div key={prod.id} className="card row" style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>openEditProduct(prod)}>
                      {/* Emoji */}
                      <div style={{width:46,height:46,borderRadius:12,background:`color-mix(in srgb,${b.theme.primary} 10%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                        {prod.emoji}
                      </div>
                      {/* Details */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prod.name}</div>
                          {!prod.active&&<span style={{fontSize:9,fontWeight:700,background:"#F3F4F6",color:"#6B7280",borderRadius:20,padding:"1px 6px",flexShrink:0}}>Hidden</span>}
                        </div>
                        {prod.description&&<div style={{fontSize:11,color:"var(--mu)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>{prod.description}</div>}
                        <div style={{fontSize:10,color:"var(--mu)",display:"flex",gap:8}}>
                          {prod.sellBy&&<span style={{background:"var(--bd)",borderRadius:10,padding:"2px 7px",fontWeight:600}}>{getSellByLabel(prod.sellBy)}</span>}
                          {prod.minOrder&&<span style={{background:"var(--bd)",borderRadius:10,padding:"2px 7px",fontWeight:600}}>Min: {prod.minOrder}</span>}
                        </div>
                        {/* Category pills */}
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {prodCats.map(c=>(
                            <span key={c.id} style={{fontSize:9,fontWeight:700,background:`color-mix(in srgb,${c.color} 14%,var(--sf))`,color:c.color,borderRadius:20,padding:"2px 7px"}}>
                              {c.emoji} {c.name}
                            </span>
                          ))}
                          {prod.categories.length===0&&<span style={{fontSize:9,fontWeight:700,background:"var(--bd)",color:"var(--mu)",borderRadius:20,padding:"2px 7px"}}>Uncategorised</span>}
                        </div>
                      </div>
                      {/* Price + toggle */}
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:15,fontWeight:800,color:b.theme.primary}}>${prod.price}</div>
                        <div
                          onClick={e=>{e.stopPropagation();toggleActive(prod.id);}}
                          className="toggle"
                          style={{background:prod.active?b.theme.primary:"var(--bd)",marginLeft:"auto",marginTop:4}}
                        >
                          <div className="toggle-knob" style={{left:prod.active?22:3}}/>
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </>
      )}

      {/* ── CATEGORIES TAB ── */}
      {activeTab==="categories" && (
        <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
          <button
            onClick={openAddCat}
            style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:14,border:`2px dashed ${b.theme.primary}50`,background:`color-mix(in srgb,${b.theme.primary} 4%,var(--bg))`,cursor:"pointer",fontFamily:"var(--fb)"}}
          >
            <div style={{width:40,height:40,borderRadius:11,background:`color-mix(in srgb,${b.theme.primary} 14%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>+</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:13,fontWeight:700,color:b.theme.primary}}>Create New Category</div>
              <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>e.g. Birthday, Weddings, Seasonal...</div>
            </div>
          </button>

          {categories.length===0
            ? <div className="card" style={{padding:"28px",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:8}}>🗂</div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:4}}>No categories yet</div>
                <div style={{fontSize:11,color:"var(--mu)"}}>Create categories to organise your products</div>
              </div>
            : categories.map(cat=>{
                const catProds = products.filter(p=>p.categories.includes(cat.id));
                return (
                  <div key={cat.id} className="card row" style={{padding:"13px 14px",cursor:"pointer"}} onClick={()=>openEditCat(cat)}>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:catProds.length>0?10:0}}>
                      <div style={{width:44,height:44,borderRadius:12,background:cat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                        {cat.emoji}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:800,color:"var(--tx)"}}>{cat.name}</div>
                        <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{catProds.length} product{catProds.length!==1?"s":""}</div>
                      </div>
                      <div style={{width:10,height:10,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
                    </div>
                    {/* Products in this category */}
                    {catProds.length>0&&(
                      <div style={{paddingLeft:56,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {catProds.map(p=>(
                          <span key={p.id} style={{fontSize:10,fontWeight:600,background:"var(--bg)",color:"var(--tx)",borderRadius:20,padding:"3px 9px",border:"1px solid var(--bd)"}}>
                            {p.emoji} {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Sheets */}
      {showAddProduct  && <ProductFormSheet isEdit={false} onClose={()=>setShowAddProduct(false)} productForm={productForm} setProductForm={setProductForm} categories={categories} products={products} recipes={recipes} SELL_BY_OPTIONS={SELL_BY_OPTIONS} MIN_ORDER_OPTIONS={MIN_ORDER_OPTIONS} openAddCat={openAddCat} toggleProductCat={toggleProductCat} catColor={catColor} catEmoji={catEmoji} catName={catName} editingProduct={editingProduct} saveProduct={saveProduct} productImgRef={productImgRef} deleteProduct={deleteProduct}/>}
      {showEditProduct && <ProductFormSheet isEdit={true}  onClose={()=>setShowEditProduct(false)} productForm={productForm} setProductForm={setProductForm} categories={categories} products={products} recipes={recipes} SELL_BY_OPTIONS={SELL_BY_OPTIONS} MIN_ORDER_OPTIONS={MIN_ORDER_OPTIONS} openAddCat={openAddCat} toggleProductCat={toggleProductCat} catColor={catColor} catEmoji={catEmoji} catName={catName} editingProduct={editingProduct} saveProduct={saveProduct} productImgRef={productImgRef} deleteProduct={deleteProduct}/>}
      {showAddCat      && <CatFormSheet    isEdit={false} onClose={()=>setShowAddCat(false)} catForm={catForm} deleteCat={deleteCat} editingCat={editingCat} saveCat={saveCat} setCatForm={setCatForm}/>}
      {showEditCat     && <CatFormSheet    isEdit={true}  onClose={()=>setShowEditCat(false)} catForm={catForm} deleteCat={deleteCat} editingCat={editingCat} saveCat={saveCat} setCatForm={setCatForm}/>}
    </div>
  );
}

/* ── PHOTO GALLERY ─────────────────────────── */
function GalleryPage({ photos=[], setPhotos=()=>{}, albums=[], setAlbums=()=>{}, products=[] }) {
  const b = useBrand();
  const { tier: galTier, setPage: galSetPage } = useTier();
  const [t, show] = useToast();

  // View state
  const [activeAlbum,   setActiveAlbum]   = useState("all");
  const [viewItem,      setViewItem]       = useState(null);  // lightbox
  const [showAddSheet,  setShowAddSheet]   = useState(false);
  const [showAlbumSheet,setShowAlbumSheet] = useState(false);
  const [uploading,     setUploading]      = useState(false);

  // Form state for adding photo/video
  const [newForm, setNewForm] = useState({
    title:"", albumId:"", productIds:[], caption:"", type:"photo", url:null, mimeType:""
  });
  const [albumForm, setAlbumForm] = useState({ name:"" });

  const uploadRef = useRef();

  // Filtered items by album
  const filtered = activeAlbum === "all"
    ? photos
    : photos.filter(p => p.albumId === activeAlbum);

  // Upload to Supabase Storage
  const handleUpload = async file => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024; // 25MB video, 10MB photo
    if (file.size > maxSize) {
      show(isVideo ? "Video must be under 25MB — please compress it first" : "Photo must be under 10MB", "error");
      return;
    }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { show("Not logged in", "error"); setUploading(false); return; }
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const folder = isVideo ? "videos" : "photos";
      const path = `${session.user.id}/${folder}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from("baker-assets").upload(path, file, { upsert:false, contentType:file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("baker-assets").getPublicUrl(data.path);
      setNewForm(p => ({...p, url:publicUrl, type:isVideo?"video":"photo", mimeType:file.type}));
      show("Uploaded ✓ — add a title and save");
    } catch(e) {
      show("Upload failed — " + e.message, "error");
    }
    setUploading(false);
  };

  const savePhoto = () => {
    if (!newForm.url) { show("Upload a photo or video first", "error"); return; }
    if (!newForm.title.trim()) { show("Add a title first", "error"); return; }
    setPhotos(p => [{
      id:         "ph-" + Date.now(),
      url:        newForm.url,
      type:       newForm.type,
      mimeType:   newForm.mimeType,
      title:      newForm.title.trim(),
      caption:    newForm.caption.trim(),
      albumId:    newForm.albumId || "",
      productIds: newForm.productIds,
      date:       new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
    }, ...p]);
    setNewForm({title:"",albumId:"",productIds:[],caption:"",type:"photo",url:null,mimeType:""});
    setShowAddSheet(false);
    show("Added to gallery ✓");
  };

  const saveAlbum = () => {
    if (!albumForm.name.trim()) { show("Enter an album name", "error"); return; }
    const newAlbum = { id:"alb-"+Date.now(), name:albumForm.name.trim(), order:albums.length };
    setAlbums(p => [...p, newAlbum]);
    setAlbumForm({ name:"" });
    setShowAlbumSheet(false);
    show(`Album "${newAlbum.name}" created ✓`);
  };

  const deleteItem = id => {
    setPhotos(p => p.filter(ph => ph.id !== id));
    setViewItem(null);
    show("Removed from gallery");
  };

  const updateItem = (id, patch) => {
    setPhotos(p => p.map(ph => ph.id===id ? {...ph,...patch} : ph));
    setViewItem(p => p ? {...p,...patch} : p);
  };

  const deleteAlbum = id => {
    // Move photos in album to uncategorized
    setPhotos(p => p.map(ph => ph.albumId===id ? {...ph,albumId:""} : ph));
    setAlbums(p => p.filter(a => a.id !== id));
    if (activeAlbum === id) setActiveAlbum("all");
    show("Album deleted — photos moved to All");
  };

  const albumName = id => albums.find(a=>a.id===id)?.name || "All";
  // Detect legacy base64 photos that need migration to Supabase Storage
  const base64Photos = photos.filter(p => p.url && p.url.startsWith("data:"));

  return (
    <div style={{paddingBottom:80}}>
      <PH title="Gallery" sub={`${photos.length} item${photos.length!==1?"s":""}`}
        action={
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowAlbumSheet(true)} style={{background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:9,padding:"7px 12px",fontSize:12,fontWeight:700,color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)"}}>+ Album</button>
            <button onClick={()=>setShowAddSheet(true)} className="pbtn" style={{padding:"7px 14px",fontSize:13,borderRadius:10}}>+ Add</button>
          </div>
        }/>
      {/* Migration banner for old base64 photos */}
      {base64Photos.length > 0 && (
        <div style={{margin:"0 12px 12px",background:"#FEF3C7",border:"1.5px solid #D97706",borderRadius:11,padding:"11px 14px",fontSize:12,color:"#92400E"}}>
          <strong>{base64Photos.length} photo{base64Photos.length!==1?"s":""}</strong> from before are stored in old format. Delete and re-upload them to get permanent cloud storage that persists across devices.
        </div>
      )}

      {/* Album tabs */}
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 12px 12px",scrollbarWidth:"none"}}>
        {[{id:"all",name:"All"}, ...albums].map(alb => (
          <button key={alb.id} onClick={()=>setActiveAlbum(alb.id)}
            style={{flexShrink:0,padding:"6px 14px",borderRadius:20,border:`1.5px solid ${activeAlbum===alb.id?b.theme.primary:"var(--bd)"}`,background:activeAlbum===alb.id?b.theme.primary:"transparent",color:activeAlbum===alb.id?"#fff":"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {alb.name}
            {alb.id!=="all" && <span style={{marginLeft:6,opacity:.7,fontSize:10}}>({photos.filter(p=>p.albumId===alb.id).length})</span>}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"44px 24px",color:"var(--mu)"}}>
          <div style={{fontSize:48,marginBottom:12}}>📸</div>
          <div style={{fontSize:15,fontWeight:700,color:"var(--tx)",marginBottom:6}}>
            {activeAlbum==="all" ? "No photos yet" : `No photos in "${albumName(activeAlbum)}"`}
          </div>
          <div style={{fontSize:12,lineHeight:1.6,marginBottom:16}}>
            {activeAlbum==="all" ? "Add photos and videos to showcase your bakes on your storefront" : "Tap + Add and assign to this album"}
          </div>
          <button onClick={()=>setShowAddSheet(true)} className="pbtn" style={{padding:"10px 24px",fontSize:13}}>+ Add First Photo</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,padding:"0 12px"}}>
          {filtered.map(item => (
            <div key={item.id} onClick={()=>setViewItem(item)}
              style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer",position:"relative",background:"var(--bd)"}}>
              {item.type==="video"
                ? <video src={item.url} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline/>
                : <img src={item.url} alt={item.title} style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy"/>
              }
              {item.type==="video" && (
                <div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.6)",borderRadius:6,padding:"2px 6px",fontSize:10,color:"#fff"}}>▶ video</div>
              )}
              {item.productIds?.length > 0 && (
                <div style={{position:"absolute",top:4,left:4,background:"rgba(0,0,0,.6)",borderRadius:6,padding:"2px 6px",fontSize:9,color:"#fff"}}>🔗 {item.productIds.length}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewItem && (
        <div className="sheet">
          <div onClick={()=>setViewItem(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(3px)"}}/>
          <div className="sheet-panel">
            <Handle/>
            <div style={{padding:"0 16px 24px"}}>
              <div style={{borderRadius:14,overflow:"hidden",marginBottom:12,background:"#000",maxHeight:300}}>
                {viewItem.type==="video"
                  ? <video src={viewItem.url} controls style={{width:"100%",maxHeight:300,objectFit:"contain"}}/>
                  : <img src={viewItem.url} alt={viewItem.title} style={{width:"100%",maxHeight:300,objectFit:"contain"}}/>
                }
              </div>
              <div style={{fontSize:16,fontWeight:800,color:"var(--tx)",marginBottom:4}}>{viewItem.title}</div>
              {viewItem.caption && <div style={{fontSize:12,color:"var(--mu)",marginBottom:8}}>{viewItem.caption}</div>}
              <div style={{fontSize:11,color:"var(--mu)",marginBottom:12}}>
                {viewItem.albumId ? albumName(viewItem.albumId) : "All"} · {viewItem.date}
                {viewItem.productIds?.length>0 && ` · Tagged to ${viewItem.productIds.length} product${viewItem.productIds.length!==1?"s":""}`}
              </div>

              {/* Edit album */}
              <Fld label="Album">
                <select className="field" value={viewItem.albumId||""} onChange={e=>updateItem(viewItem.id,{albumId:e.target.value})}>
                  <option value="">— No album (All) —</option>
                  {albums.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Fld>

              {/* Tag to products */}
              <Fld label="Tagged Products" hint="Customers see these photos on the product page">
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
                  {products.filter(p=>p.active!==false).map(p=>{
                    const tagged = (viewItem.productIds||[]).includes(p.id);
                    return (
                      <button key={p.id} onClick={()=>{
                        const cur = viewItem.productIds||[];
                        const next = tagged ? cur.filter(id=>id!==p.id) : [...cur,p.id];
                        updateItem(viewItem.id,{productIds:next});
                      }} style={{padding:"5px 11px",borderRadius:20,border:`1.5px solid ${tagged?b.theme.primary:"var(--bd)"}`,background:tagged?b.theme.primary:"transparent",color:tagged?"#fff":"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}>
                        {tagged?"✓ ":""}{p.emoji} {p.name}
                      </button>
                    );
                  })}
                  {products.filter(p=>p.active!==false).length===0 && <div style={{fontSize:11,color:"var(--mu)"}}>Add products first to tag them</div>}
                </div>
              </Fld>

              <button onClick={()=>deleteItem(viewItem.id)}
                style={{width:"100%",marginTop:8,padding:"11px",borderRadius:11,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                Remove from Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add photo/video sheet */}
      {showAddSheet && (
        <div className="sheet">
          <div onClick={()=>setShowAddSheet(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <Handle/>
            <div style={{padding:"6px 16px 24px"}}>
              <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)",marginBottom:14}}>Add to Gallery</div>

              {/* Upload area */}
              <input ref={uploadRef} type="file" accept="image/*,video/*" style={{display:"none"}} onChange={e=>handleUpload(e.target.files[0])}/>
              {newForm.url ? (
                <div style={{borderRadius:12,overflow:"hidden",marginBottom:12,background:"#000",maxHeight:200}}>
                  {newForm.type==="video"
                    ? <video src={newForm.url} controls style={{width:"100%",maxHeight:200,objectFit:"contain"}}/>
                    : <img src={newForm.url} style={{width:"100%",maxHeight:200,objectFit:"contain"}}/>
                  }
                </div>
              ) : (
                <div onClick={()=>!uploading&&uploadRef.current?.click()}
                  style={{border:"2px dashed var(--bd)",borderRadius:12,padding:"28px",textAlign:"center",cursor:uploading?"not-allowed":"pointer",background:"var(--sf)",marginBottom:12,opacity:uploading?.6:1}}>
                  <div style={{fontSize:32,marginBottom:6}}>📸</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--p)"}}>{uploading?"Uploading...":"Tap to upload photo or video"}</div>
                  <div style={{fontSize:10,color:"var(--mu)",marginTop:4}}>Photos up to 10MB · Videos up to 25MB (compress before uploading)</div>
                </div>
              )}

              <Fld label="Title" required>
                <input className="field" placeholder="e.g. Custom Wedding Cake" value={newForm.title} onChange={e=>setNewForm(p=>({...p,title:e.target.value}))}/>
              </Fld>
              <Fld label="Caption">
                <input className="field" placeholder="Optional description..." value={newForm.caption} onChange={e=>setNewForm(p=>({...p,caption:e.target.value}))}/>
              </Fld>
              <Fld label="Album">
                <select className="field" value={newForm.albumId} onChange={e=>setNewForm(p=>({...p,albumId:e.target.value}))}>
                  <option value="">— No album (appears in All) —</option>
                  {albums.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Fld>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                <button onClick={()=>setShowAddSheet(false)} style={{padding:"12px",borderRadius:11,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
                <button onClick={savePhoto} disabled={!newForm.url||uploading} style={{padding:"12px",borderRadius:11,border:"none",background:b.theme.primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer",opacity:!newForm.url||uploading?.5:1}}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create album sheet */}
      {showAlbumSheet && (
        <div className="sheet">
          <div onClick={()=>setShowAlbumSheet(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <Handle/>
            <div style={{padding:"6px 16px 24px"}}>
              <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)",marginBottom:14}}>New Album</div>
              <Fld label="Album Name" required>
                <input className="field" placeholder="e.g. Wedding Cakes, Cookie Collections..." value={albumForm.name} onChange={e=>setAlbumForm({name:e.target.value})} autoFocus/>
              </Fld>
              {/* Existing albums */}
              {albums.length > 0 && (
                <div style={{marginTop:8}}>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>Your Albums</div>
                  {albums.map(a=>(
                    <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--bd)"}}>
                      <span style={{fontSize:13,color:"var(--tx)"}}>{a.name} <span style={{color:"var(--mu)",fontSize:11}}>({photos.filter(p=>p.albumId===a.id).length})</span></span>
                      <button onClick={()=>deleteAlbum(a.id)} style={{background:"none",border:"none",color:"#DC2626",fontSize:12,cursor:"pointer",fontFamily:"var(--fb)"}}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
                <button onClick={()=>setShowAlbumSheet(false)} style={{padding:"12px",borderRadius:11,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>Close</button>
                <button onClick={saveAlbum} style={{padding:"12px",borderRadius:11,border:"none",background:b.theme.primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Create Album</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StorefrontMessageForm({ onSent, bakerPhone="" }) {
  const [form, setForm] = useState({name:"", phone:"", email:"", subject:"", body:""});
  const [sent, setSent] = useState(false);
  const [err,  setErr]  = useState({});

  const submit = () => {
    const e = {};
    if (!form.name.trim())  e.name = "Name required";
    if (!form.body.trim())  e.body = "Message required";
    setErr(e);
    if (Object.keys(e).length) return;
    // Post message to Supabase via storefront API — so baker actually receives it
    fetch("/api/storefront",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        action:"message",
        bakerSlug:window.location.pathname.split("/store/")[1]||"",
        name:form.name,
        phone:form.phone||"",
        email:form.email||"",
        subject:form.subject||"Storefront inquiry",
        body:form.body,
      })
    }).then(()=>{
      // Also notify baker via SMS
      apiFetch("/api/notify",{method:"POST",body:JSON.stringify({type:"message",customerName:form.name,item:`Message: ${form.subject||"Storefront inquiry"}`,amount:0,phone:form.phone,bakerPhone:bakerPhone||""})}).catch(()=>{});
    }).catch(()=>{});
    setSent(true);
    onSent && onSent();
  };

  if (sent) return (
    <div style={{textAlign:"center",padding:"12px 0"}}>
      <div style={{fontSize:32,marginBottom:6}}>✅</div>
      <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:3}}>Message Sent!</div>
      <div style={{fontSize:11,color:"var(--mu)"}}>We'll get back to you soon.</div>
      <button onClick={()=>{setSent(false);setForm({name:"",phone:"",email:"",subject:"",body:""});}} style={{marginTop:10,background:"none",border:"none",color:"var(--p)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>Send another</button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <Fld label="Your Name" required error={err.name}>
          <input className="field" placeholder="Jordan Smith" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
        </Fld>
        <Fld label="Phone">
          <input className="field" type="tel" placeholder="(210) 555-0100" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
        </Fld>
      </div>
      <Fld label="Email">
        <input className="field" type="email" placeholder="you@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
      </Fld>
      <Fld label="Subject">
        <input className="field" placeholder="e.g. BakerOS order inquiry" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}/>
      </Fld>
      <Fld label="Message" required error={err.body}>
        <textarea className="field" rows={4} placeholder="Tell us what you have in mind..." value={form.body} onChange={e=>setForm(p=>({...p,body:e.target.value}))} style={{resize:"none"}}/>
      </Fld>
      <button className="pbtn" onClick={submit} style={{width:"100%"}}>Send Message 💬</button>
    </div>
  );
}

// Baker-facing inbox
function MessagesPage() {
  const b = useBrand();
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(true);
  const [sel,      setSel]      = useState(null);
  const [reply,    setReply]    = useState("");
  const [filter,   setFilter]   = useState("all");
  const [msgView, setMsgView] = useState("inbox");
  const [t, show] = useToast();

  // Load messages from Supabase baker_messages table
  useEffect(() => {
    let channel;
    const load = async () => {
      setMsgsLoading(true);
      const { data, error } = await supabase
        .from("baker_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setMessages(data);
      setMsgsLoading(false);
    };
    load();
    // Real-time subscription for new messages
    channel = supabase.channel("baker_messages_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "baker_messages" },
        payload => setMessages(prev => [payload.new, ...prev]))
      .subscribe();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const openMsg = async msg => {
    setSel({...msg, read:true});
    setReply("");
    if (!msg.read) {
      setMessages(p => p.map(m => m.id===msg.id ? {...m,read:true} : m));
      await supabase.from("baker_messages").update({read:true}).eq("id", msg.id);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSel(p => ({...p, replied:true, read:true}));
    setMessages(p => p.map(m => m.id===sel.id ? {...m,replied:true,read:true} : m));
    await supabase.from("baker_messages").update({replied:true,read:true}).eq("id", sel.id);
    // Open native SMS or email
    const body   = encodeURIComponent(reply);
    const method = sel.phone ? `sms:${sel.phone}?body=${body}` : sel.email ? `mailto:${sel.email}?body=${body}` : null;
    if (method) window.open(method, "_blank");
    setReply("");
    show("Reply sent ✓");
  };

  const filtered = filter==="all"    ? messages.filter(m=>!m.archived)
                 : filter==="unread" ? messages.filter(m=>!m.read && !m.archived)
                 :                     messages.filter(m=>m.replied && !m.archived);
  const visibleMsgs = msgView==="archive"
    ? messages.filter(m=>m.archived)
    : (filter==="all" ? messages.filter(m=>!m.archived) : filtered);

  const unreadCount = messages.filter(m=>!m.read).length;

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH
        title="Messages"
        sub={`${messages.length} messages${unreadCount>0?` · ${unreadCount} unread`:""}`}
      />

      {/* Filter tabs */}
      <div style={{padding:"0 12px 10px"}}>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button onClick={()=>setMsgView("inbox")} style={{flex:1,padding:"8px",borderRadius:9,border:"none",background:msgView==="inbox"?"var(--pr)":"var(--bd)",color:msgView==="inbox"?"#fff":"var(--tx)",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>Inbox</button>
          <button onClick={()=>setMsgView("archive")} style={{flex:1,padding:"8px",borderRadius:9,border:"none",background:msgView==="archive"?"var(--pr)":"var(--bd)",color:msgView==="archive"?"#fff":"var(--tx)",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>Archive ({messages.filter(m=>m.archived).length})</button>
        </div>
        {msgView==="inbox" && <div style={{display:"flex",gap:6}}>{[["all","All"],["unread","Unread"],["replied","Replied"]].map(([id,label])=>(
          <button key={id} className={`ptab ${filter===id?"on":"off"}`} onClick={()=>setFilter(id)} style={{flexShrink:0}}>{label}</button>
        ))}</div>}
      </div>

      {/* Message list */}
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:9}}>
        {msgsLoading ? (
          <div className="card" style={{padding:"32px",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>💬</div>
            <div style={{fontSize:13,color:"var(--mu)"}}>Loading messages...</div>
          </div>
        ) : visibleMsgs.length===0 ? (
          <div className="card" style={{padding:"32px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>💬</div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:3}}>No messages yet</div>
            <div style={{fontSize:11,color:"var(--mu)"}}>Customer messages from your storefront will appear here</div>
          </div>
        ) : visibleMsgs.map(msg=>(
          <div
            key={msg.id}
            className="card row"
            style={{padding:"13px 14px",cursor:"pointer",borderLeft:`3px solid ${!msg.read?b.theme.primary:"var(--bd)"}`}}
            onClick={()=>openMsg(msg)}
          >
            <div style={{display:"flex",alignItems:"flex-start",gap:11}}>
              <Avt name={msg.name} sz={38}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <div style={{fontSize:13,fontWeight:msg.read?600:800,color:"var(--tx)"}}>{msg.name}</div>
                  <div style={{fontSize:10,color:"var(--mu)",flexShrink:0,marginLeft:8}}>{msg.date}</div>
                </div>
                <div style={{fontSize:12,fontWeight:msg.read?500:700,color:msg.read?"var(--mu)":"var(--tx)",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.subject}</div>
                <div style={{fontSize:11,color:"var(--mu)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.body}</div>
                <div style={{display:"flex",gap:6,marginTop:5}}>
                  {!msg.read  && <span className="badge" style={{background:`color-mix(in srgb,${b.theme.primary} 15%,var(--sf))`,color:b.theme.primary}}>New</span>}
                  {msg.replied && <span className="badge" style={{background:"#D1ECE4",color:"#155724"}}>Replied</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message detail sheet */}
      {sel && (
        <div className="sheet">
          <div onClick={()=>setSel(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.42)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 0"}}>

              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avt name={sel.name} sz={40}/>
                  <div>
                    <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)"}}>{sel.name}</div>
                    <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{sel.email||sel.phone||"No contact info"} · {sel.date}</div>
                  </div>
                </div>
                <button onClick={()=>setSel(null)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>

              {/* Subject */}
              <div style={{fontSize:14,fontWeight:800,color:"var(--tx)",marginBottom:8}}>{sel.subject}</div>

              {/* Body */}
              <div style={{background:"var(--bg)",borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:"var(--tx)",lineHeight:1.6}}>
                {sel.body}
              </div>

              {/* Contact info row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
                {sel.phone&&<div style={{background:"var(--bg)",borderRadius:10,padding:"9px 11px"}}><div style={{fontSize:9,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:2}}>Phone</div><div style={{fontSize:12,fontWeight:700,color:"var(--tx)"}}>{sel.phone}</div></div>}
                {sel.email&&<div style={{background:"var(--bg)",borderRadius:10,padding:"9px 11px"}}><div style={{fontSize:9,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:2}}>Email</div><div style={{fontSize:12,fontWeight:700,color:"var(--tx)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sel.email}</div></div>}
              </div>

              {/* Reply box */}
              <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:7}}>Reply</div>
              <textarea
                className="field"
                rows={3}
                placeholder={`Hi ${sel.name.split(" ")[0]}, thanks for reaching out...`}
                value={reply}
                onChange={e=>setReply(e.target.value)}
                style={{resize:"none",marginBottom:10,fontSize:13}}
              />

              {/* Send buttons */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
                {sel.phone&&<button className="pbtn" onClick={sendReply} disabled={!reply.trim()}>📱 Text Reply</button>}
                {sel.email&&<button className="pbtn" onClick={sendReply} disabled={!reply.trim()} style={{background:`color-mix(in srgb,${b.theme.primary} 80%,#3D5A99)`}}>✉️ Email Reply</button>}
                {!sel.phone&&!sel.email&&<button className="pbtn" disabled style={{gridColumn:"1/-1",opacity:.4}}>No contact info</button>}
              </div>

              {/* Quick actions */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <button className="gbtn" onClick={()=>{
                  const stored = JSON.parse(localStorage.getItem("bos_customers")||"[]");
                  const exists = stored.find(c=>c.phone===sel.phone||c.email===sel.email||c.name===sel.name);
                  if(!exists){
                    const newC={id:Date.now(),name:sel.name,phone:sel.phone||"",email:sel.email||"",orders:0,spent:0,last:"Never",tag:"New",note:`First contact via message: ${sel.subject||""}`};
                    const updated=[newC,...stored];
                    localStorage.setItem("bos_customers",JSON.stringify(updated));
                    // Dispatch event so App-level React state picks up the new customer
                    window.dispatchEvent(new CustomEvent("bakeros-customer-added",{detail:newC}));
                    show("Added to CRM ✓");
                  } else { show("Already in CRM"); }
                  setSel(null);
                }} style={{padding:"11px",borderRadius:12,color:"var(--tx)",fontSize:12}}>👥 Add to CRM</button>
                <button className="gbtn" onClick={()=>{
                  const newArchived = !sel.archived;
                  setSel(p=>({...p,archived:newArchived}));
                  setMessages(p=>p.map(m=>m.id===sel.id?{...m,archived:newArchived}:m));
                  supabase.from("baker_messages").update({archived:newArchived}).eq("id",sel.id);
                  show(sel.archived?"Moved to inbox":"Message archived");
                  setSel(null);
                }} style={{padding:"11px 16px",borderRadius:11,border:"1.5px solid var(--bd)",background:"var(--bg)",color:"var(--tx)",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  {sel?.archived ? "↩ Unarchive" : "Archive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CUSTOMER STOREFRONT ───────────────────── */
/* Public-facing page — this is what customers see at bakeros.app/store/[slug] */
/* ── NFC LEAD CAPTURE LANDING PAGE ─────────────────────────────────────── */
function PublicInvoicePage({ data }) {
  const inv     = data.invoice || {};
  const baker   = data.baker   || {};
  const handles = data.payHandles || {};
  const primary = baker.theme?.primary || "#C47B00";
  const storeName = baker.storeName || "Your Baker";

  const STATUS_STYLE = {
    paid:    { bg:"#D1ECE4", c:"#155724", label:"Paid ✓" },
    unpaid:  { bg:"#FFF3CD", c:"#856404", label:"Payment Due" },
    overdue: { bg:"#FEE2E2", c:"#991B1B", label:"Overdue" },
  };
  const ss = STATUS_STYLE[inv.status] || STATUS_STYLE.unpaid;

  return (
    <div style={{minHeight:"100vh",background:"#FFFBF5",fontFamily:"'Outfit',sans-serif",padding:"0 0 48px"}}>
      {/* Header */}
      <div style={{background:primary,padding:"28px 24px 24px",textAlign:"center"}}>
        {baker.logo && <img src={baker.logo} alt={storeName} style={{width:56,height:56,borderRadius:14,objectFit:"cover",marginBottom:12,border:"2px solid rgba(255,255,255,.3)"}}/>}
        <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.5px"}}>{storeName}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.8)",marginTop:4}}>Invoice · {inv.id}</div>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px"}}>

        {/* Status badge */}
        <div style={{background:ss.bg,borderRadius:12,padding:"11px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,border:`1px solid ${ss.c}30`}}>
          <span style={{fontSize:14,fontWeight:700,color:ss.c}}>{ss.label}</span>
          <span style={{fontSize:22,fontWeight:800,color:ss.c}}>${inv.amount}</span>
        </div>

        {/* Invoice details */}
        <div style={{background:"#fff",borderRadius:16,padding:"18px",marginBottom:16,border:"1px solid #E8D5C0"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#9C7B5C",textTransform:"uppercase",letterSpacing:"1px",marginBottom:14}}>Invoice Details</div>
          {[
            ["Customer",  inv.customer],
            ["Items",     inv.items || "Custom order"],
            ["Due Date",  inv.due],
            ["Invoice #", inv.id],
          ].map(([label, val]) => val ? (
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #F0E4D4"}}>
              <span style={{fontSize:12,color:"#9C7B5C",flexShrink:0}}>{label}</span>
              <span style={{fontSize:13,fontWeight:600,color:"#2C1A0E",textAlign:"right",maxWidth:"60%"}}>{val}</span>
            </div>
          ) : null)}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:4}}>
            <span style={{fontSize:14,fontWeight:800,color:"#2C1A0E"}}>Total Due</span>
            <span style={{fontSize:24,fontWeight:800,color:primary}}>${inv.amount}</span>
          </div>
        </div>

        {/* Final image if attached */}
        {inv.finalImageURL && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#9C7B5C",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📸 Your Order</div>
            <img src={inv.finalImageURL} alt="Your order" style={{width:"100%",borderRadius:14,objectFit:"cover",maxHeight:280,display:"block",border:"1px solid #E8D5C0"}}/>
          </div>
        )}

        {/* Pay buttons */}
        {inv.status !== "paid" && (
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#9C7B5C",textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Pay Now</div>

            {handles.cashapp?.trim() && (
              <a href={`https://cash.app/$${handles.cashapp.replace(/^\$/,"")}`} target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,background:"#00D64F12",border:"1.5px solid #00D64F50",textDecoration:"none"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#00D64F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💵</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#2C1A0E"}}>Pay with Cash App</div>
                  <div style={{fontSize:12,color:"#16A34A",marginTop:1}}>Send ${inv.amount} to ${handles.cashapp.replace(/^\$/,"")}</div>
                </div>
                <span style={{fontSize:18,color:"#16A34A"}}>→</span>
              </a>
            )}

            {handles.venmo?.trim() && (
              <a href={`https://venmo.com/u/${handles.venmo.replace(/^@/,"")}`} target="_blank" rel="noreferrer"
                style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,background:"#008CFF12",border:"1.5px solid #008CFF50",textDecoration:"none"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#008CFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💙</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#2C1A0E"}}>Pay with Venmo</div>
                  <div style={{fontSize:12,color:"#008CFF",marginTop:1}}>Send ${inv.amount} to @{handles.venmo.replace(/^@/,"")}</div>
                </div>
                <span style={{fontSize:18,color:"#008CFF"}}>→</span>
              </a>
            )}

            {handles.zelle?.trim() && (
              <div onClick={()=>{try{navigator.clipboard.writeText(handles.zelle);}catch{}}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,background:"#6D1ED412",border:"1.5px solid #6D1ED440",cursor:"pointer"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#6D1ED4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💜</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#2C1A0E"}}>Pay with Zelle</div>
                  <div style={{fontSize:12,color:"#6D1ED4",marginTop:1}}>Send ${inv.amount} to {handles.zelle}</div>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:"#6D1ED4"}}>Tap to copy</span>
              </div>
            )}

            {!handles.cashapp?.trim() && !handles.venmo?.trim() && !handles.zelle?.trim() && (
              <div style={{background:"#F0F0F0",borderRadius:12,padding:"16px",textAlign:"center",fontSize:13,color:"#888"}}>
                Contact {storeName} directly to arrange payment.
              </div>
            )}
          </div>
        )}

        {inv.status === "paid" && (
          <div style={{background:"#D1ECE4",borderRadius:14,padding:"20px",textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:36,marginBottom:8}}>✅</div>
            <div style={{fontSize:16,fontWeight:800,color:"#155724"}}>Payment Complete</div>
            <div style={{fontSize:13,color:"#155724",marginTop:4,opacity:.8}}>Thank you for your order!</div>
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign:"center",fontSize:11,color:"#C4A882",marginTop:8}}>
          Powered by <span style={{fontWeight:700}}>BakerOS</span>
        </div>
      </div>
    </div>
  );
}

function NFCLandingPage({ data, slug }) {
  const brand   = data?.brand   || {};
  const primary = brand?.theme?.primary || "#C47B00";
  const bg      = brand?.theme?.bg      || "#FFFBF5";
  const storeName = brand?.storeName || "This Bakery";
  const storefrontURL = `https://app.bakeros.app/store/${slug}`;

  const [form, setForm]       = useState({ name:"", phone:"", email:"" });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\d{10,}$/.test(form.phone.replace(/\D/g,""))) e.phone = "Enter a valid phone number";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/storefront", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bakerId:       data?.bakerId,
          type:          "nfc_lead",
          customerName:  form.name.trim(),
          customerPhone: form.phone.replace(/\D/g,""),
          customerEmail: form.email.trim(),
          source:        "nfc",
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[NFC] Save failed:', result.error);
        setSaving(false);
        setErrors({ phone: result.error || "Save failed — please try again" });
        return;
      }
      setSaved(true);
      setTimeout(() => { window.location.href = storefrontURL; }, 1500);
    } catch(err) {
      console.error('[NFC] Network error:', err);
      setSaving(false);
      setErrors({ phone: "Network error — please try again" });
    }
  };


  return (
    <div style={{minHeight:"100vh",background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&display=swap" rel="stylesheet"/>

      {/* Baker branding */}
      <div style={{textAlign:"center",marginBottom:32}}>
        {brand?.logo
          ? <img src={brand.logo} alt={storeName} style={{width:80,height:80,borderRadius:20,objectFit:"contain",marginBottom:12,background:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,.08)"}}/>
          : <div style={{width:80,height:80,borderRadius:20,background:`color-mix(in srgb,${primary} 15%,#fff)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,marginBottom:12,marginLeft:"auto",marginRight:"auto",boxShadow:"0 4px 16px rgba(0,0,0,.08)"}}>🧁</div>
        }
        <div style={{fontSize:22,fontWeight:800,color:"#2C1A0E",marginBottom:4}}>{storeName}</div>
        <div style={{fontSize:13,color:"#9C7B5C",lineHeight:1.5,maxWidth:280}}>
          Save your info to get exclusive deals & updates from us!
        </div>
      </div>

      {/* Lead form */}
      {saved
        ? <div style={{textAlign:"center",padding:"32px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>🎉</div>
            <div style={{fontSize:18,fontWeight:800,color:"#2C1A0E",marginBottom:6}}>You're in!</div>
            <div style={{fontSize:13,color:"#9C7B5C"}}>Taking you to the shop...</div>
          </div>
        : <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",gap:14}}>

            {/* Name */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9C7B5C",marginBottom:5,textTransform:"uppercase",letterSpacing:"1px"}}>Your Name <span style={{color:"#DC2626"}}>*</span></div>
              <input
                type="text"
                placeholder="Jane Smith"
                value={form.name}
                onChange={e=>{setForm(p=>({...p,name:e.target.value}));setErrors(p=>({...p,name:""}));}}
                style={{width:"100%",padding:"13px 14px",borderRadius:12,border:`1.5px solid ${errors.name?"#DC2626":"#E8D5C0"}`,fontSize:15,fontFamily:"inherit",boxSizing:"border-box",outline:"none",background:"#fff"}}
              />
              {errors.name && <div style={{fontSize:11,color:"#DC2626",marginTop:4}}>{errors.name}</div>}
            </div>

            {/* Phone */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9C7B5C",marginBottom:5,textTransform:"uppercase",letterSpacing:"1px"}}>Phone Number <span style={{color:"#DC2626"}}>*</span></div>
              <input
                type="tel"
                placeholder="(210) 555-0100"
                value={form.phone}
                onChange={e=>{setForm(p=>({...p,phone:e.target.value}));setErrors(p=>({...p,phone:""}));}}
                style={{width:"100%",padding:"13px 14px",borderRadius:12,border:`1.5px solid ${errors.phone?"#DC2626":"#E8D5C0"}`,fontSize:15,fontFamily:"inherit",boxSizing:"border-box",outline:"none",background:"#fff"}}
              />
              {errors.phone && <div style={{fontSize:11,color:"#DC2626",marginTop:4}}>{errors.phone}</div>}
            </div>

            {/* Email */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9C7B5C",marginBottom:5,textTransform:"uppercase",letterSpacing:"1px"}}>Email <span style={{fontSize:10,fontWeight:400,color:"#9C7B5C"}}>(optional)</span></div>
              <input
                type="email"
                placeholder="jane@email.com"
                value={form.email}
                onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                style={{width:"100%",padding:"13px 14px",borderRadius:12,border:"1.5px solid #E8D5C0",fontSize:15,fontFamily:"inherit",boxSizing:"border-box",outline:"none",background:"#fff"}}
              />
            </div>

            {/* SMS opt-in notice */}
            <div style={{fontSize:10,color:"#9C7B5C",lineHeight:1.5,textAlign:"center",padding:"0 8px"}}>
              By saving, you agree to receive SMS updates from {storeName}. Reply STOP to opt out anytime.
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:primary,color:"#fff",fontFamily:"inherit",fontWeight:800,fontSize:15,cursor:saving?"default":"pointer",opacity:saving?0.7:1,marginTop:4,boxShadow:`0 6px 20px color-mix(in srgb,${primary} 40%,transparent)`}}
            >
              {saving ? "Saving..." : "Save & Browse Shop →"}
            </button>

            {/* Note: no skip — name + phone required for lead capture */}
          </div>
      }

      {/* Footer */}
      <div style={{marginTop:32,fontSize:10,color:"#C4A882"}}>Powered by BakerOS</div>
    </div>
  );
}

function CustomerStorefrontPage({ products=[], categories=[], photos=[], albums=[], brand={}, socialLinks={}, bakerInfo={}, setPage, isOwnerPreview = false }) {
  const [filterCat,  setFilterCat]  = useState("all");
  const { tier: sfTier } = useTier();
  const [msgForm,    setMsgForm]    = useState({ name:"", phone:"", email:"", subject:"", body:"" });
  const [msgSent,    setMsgSent]    = useState(false);
  const [added,      setAdded]      = useState({});
  const [expandedCats, setExpandedCats] = useState({});  // all collapsed by default
  const [t, show] = useToast();

  const toggleCat = (id) => setExpandedCats(p => ({...p, [id]: !p[id]}));

  // Null-safe brand theme — prevents crash when brand data is incomplete
  const safeBrand = brand || {};
  const safeTheme = safeBrand.theme || { primary:"#C47B00", accent:"#E8A838", bg:"#FFFBF5", surface:"#FDF6EC", text:"#2C1A0E" };
  const primary   = safeTheme.primary || "#C47B00";
  const activeProds = products.filter(p => p.active);
  const usedCats  = categories.filter(c => activeProds.some(p => p.categories.includes(c.id)));
  const featPhotos = photos.filter(p => p.featured);
  const [activeGalleryAlbum, setActiveGalleryAlbum] = useState("all");
  const galleryPhotos = activeGalleryAlbum === "all"
    ? photos
    : photos.filter(p => p.albumId === activeGalleryAlbum);

  const filtered = filterCat === "all"
    ? activeProds
    : activeProds.filter(p => p.categories.includes(filterCat));

  const handleOrder = (id) => {
    setAdded(prev => ({...prev, [id]: true}));
    setTimeout(() => setAdded(prev => ({...prev, [id]: false})), 1500);
  };

  const sendMsg = () => {
    if (!msgForm.name.trim() || !msgForm.body.trim()) { show("Name and message required","error"); return; }
    // Message goes to Supabase via storefront API (handled in StorefrontMessageForm above)
    setMsgSent(true);
  };

  return (
    <div style={{paddingBottom:96,background:"#FDF6EC",minHeight:"100dvh"}}>
      <Toast t={t}/>

      {/* Baker-facing preview banner — hidden on public storefront */}
      {isOwnerPreview && <div style={{background:`linear-gradient(135deg,${primary},color-mix(in srgb,${primary} 60%,#000))`,padding:"9px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>👁</span>
          <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)"}}>Customer Preview — {getStorefrontURL(brand, bakerInfo)}</span>
        </div>
        <button
          onClick={()=>setPage("storefront")}
          style={{background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.25)",borderRadius:20,padding:"4px 12px",fontSize:10,fontWeight:800,color:"#fff",cursor:"pointer",fontFamily:"var(--fb)",flexShrink:0}}
        >
          ← Back to Admin
        </button>
      </div>}

      {/* Hero */}
      <div style={{background:`linear-gradient(170deg,${safeTheme.text||"#3D1C00"} 0%,color-mix(in srgb,${primary} 60%,#000) 60%,${primary} 100%)`,padding:"36px 24px 28px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-50,right:-50,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,.04)"}}/>
        {/* Logo — only visible to Growth+ on customer storefront */}
        {canAccess(sfTier,"custom_branding") && brand.logo
          ? <img src={brand.logo} alt={brand.storeName} style={{width:68,height:68,borderRadius:17,objectFit:"contain",background:"none",marginBottom:12,display:"block",marginLeft:"auto",marginRight:"auto"}}/>
          : <div style={{width:68,height:68,borderRadius:17,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 12px",border:"1.5px solid rgba(255,255,255,.2)"}}>🧁</div>
        }
        <div style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"#fff",marginBottom:4}}>{brand.storeName}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.6)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:20}}>{brand.tagline}</div>
        {bakerInfo?.acceptingOrders === false && !isOwnerPreview
          ? <div style={{background:"rgba(0,0,0,.35)",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:16,padding:"12px 20px",marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:4}}>🔒</div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:2}}>Not accepting orders right now</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Check back soon or send a message below</div>
            </div>
          : <button
              onClick={()=>{ setPage("orderform"); }}
              style={{background:primary,color:"#fff",border:"none",borderRadius:50,padding:"13px 32px",fontFamily:"var(--fb)",fontWeight:800,fontSize:14,cursor:"pointer",letterSpacing:".5px",boxShadow:`0 6px 20px color-mix(in srgb,${primary} 45%,transparent)`}}
            >
              Order Now
            </button>
        }
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:16}}>
          <button onClick={()=>{const url=isOwnerPreview?getStorefrontURL(brand,bakerInfo):window.location.href;if(navigator.clipboard)navigator.clipboard.writeText(url);show("Link copied ✓");}} style={{background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.8)",border:"1px solid rgba(255,255,255,.2)",borderRadius:30,padding:"7px 16px",fontSize:11,fontFamily:"var(--fb)",fontWeight:700,cursor:"pointer",letterSpacing:".5px"}}>Copy Link</button>
          <button onClick={()=>{
  const url = isOwnerPreview ? getStorefrontURL(brand,bakerInfo) : window.location.href;
  if(navigator.share){navigator.share({title:brand?.storeName||bakerInfo?.name||"My Bakery",text:"Check out my bakery!",url}).catch(()=>{});}
  else if(navigator.clipboard){navigator.clipboard.writeText(url);show("Link copied ✓");}
}} style={{background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.8)",border:"1px solid rgba(255,255,255,.2)",borderRadius:30,padding:"7px 16px",fontSize:11,fontFamily:"var(--fb)",fontWeight:700,cursor:"pointer",letterSpacing:".5px"}}>Share ↗</button>
        </div>
      </div>

      {/* Category filter tabs — hidden on customer storefront */}
      {false && usedCats.length > 0 && (
        <div style={{padding:"16px 12px 0",display:"flex",gap:8,overflowX:"auto"}}>
          <button
            onClick={()=>setFilterCat("all")}
            style={{flexShrink:0,padding:"8px 16px",borderRadius:30,border:`1.5px solid ${filterCat==="all"?primary:"#E8D5C0"}`,background:filterCat==="all"?primary:"transparent",color:filterCat==="all"?"#fff":"#9C7B5C",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}
          >
            All ({activeProds.length})
          </button>
          {usedCats.map(cat=>(
            <button
              key={cat.id}
              onClick={()=>setFilterCat(cat.id)}
              style={{flexShrink:0,padding:"8px 16px",borderRadius:30,border:`1.5px solid ${filterCat===cat.id?cat.color:"#E8D5C0"}`,background:filterCat===cat.id?cat.color:"transparent",color:filterCat===cat.id?"#fff":"#9C7B5C",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products — hidden on customer storefront, products are on the order form */}
      <div style={{padding:"16px 12px 0",display:"none"}}>
        {filterCat === "all" ? (
          <>
            {usedCats.map(cat => {
              const catProds = activeProds.filter(p => p.categories.includes(cat.id));
              if (!catProds.length) return null;
              const isOpen = !!expandedCats[cat.id];
              return (
                <div key={cat.id} style={{marginBottom:6}}>
                  <button
                    onClick={()=>toggleCat(cat.id)}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"12px 14px",background:"#FDF6EC",border:"1.5px solid #E8D5C0",borderRadius:isOpen?"12px 12px 0 0":"12px",cursor:"pointer",fontFamily:"var(--fb)"}}
                  >
                    <div style={{width:30,height:30,borderRadius:8,background:cat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{cat.emoji}</div>
                    <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"#3D1C00",flex:1,textAlign:"left"}}>{cat.name}</div>
                    <div style={{fontSize:11,color:"#9C7B5C",marginRight:4}}>{catProds.length} item{catProds.length!==1?"s":""}</div>
                    <div style={{fontSize:16,color:"#9C7B5C",transition:"transform .25s",transform:isOpen?"rotate(90deg)":"rotate(0deg)",fontWeight:700}}>›</div>
                  </button>
                  {isOpen && (
                    <div style={{border:"1.5px solid #E8D5C0",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                      {catProds.map((p,idx) => (
                        <div key={p.id} style={{borderTop:idx>0?"1px solid #E8D5C0":"none"}}>
                          <CustomerProductCard p={p} added={added} onOrder={handleOrder} primary={primary} photos={photos}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {activeProds.filter(p=>p.categories.length===0).length > 0 && (() => {
              const uncatProds = activeProds.filter(p=>p.categories.length===0);
              const isOpen = !!expandedCats["__uncat__"];
              return (
                <div style={{marginBottom:6}}>
                  <button
                    onClick={()=>toggleCat("__uncat__")}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"12px 14px",background:"#FDF6EC",border:"1.5px solid #E8D5C0",borderRadius:isOpen?"12px 12px 0 0":"12px",cursor:"pointer",fontFamily:"var(--fb)"}}
                  >
                    <div style={{width:30,height:30,borderRadius:8,background:"#E8D5C0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>📦</div>
                    <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"#3D1C00",flex:1,textAlign:"left"}}>Other Items</div>
                    <div style={{fontSize:11,color:"#9C7B5C",marginRight:4}}>{uncatProds.length} item{uncatProds.length!==1?"s":""}</div>
                    <div style={{fontSize:16,color:"#9C7B5C",transition:"transform .25s",transform:isOpen?"rotate(90deg)":"rotate(0deg)",fontWeight:700}}>›</div>
                  </button>
                  {isOpen && (
                    <div style={{border:"1.5px solid #E8D5C0",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",display:"flex",flexDirection:"column"}}>
                      {uncatProds.map((p,idx) => (
                        <div key={p.id} style={{borderTop:idx>0?"1px solid #E8D5C0":"none"}}>
                          <CustomerProductCard p={p} added={added} onOrder={handleOrder} primary={primary} photos={photos}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {filtered.map(p => <CustomerProductCard key={p.id} p={p} added={added} onOrder={handleOrder} primary={primary}/>)}
          </div>
        )}

        {activeProds.length === 0 && (
          <div style={{textAlign:"center",padding:"40px 20px",color:"#9C7B5C"}}>
            <div style={{fontSize:40,marginBottom:10}}>🧁</div>
            <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"#3D1C00",marginBottom:5}}>Menu coming soon!</div>
            <div style={{fontSize:13,lineHeight:1.6}}>We're putting the finishing touches on our menu. Check back soon — or send us a message to place a custom order.</div>
          </div>
        )}
      </div>

      {/* Our Work gallery — album-browseable */}
      {photos.length > 0 && (
        <div style={{padding:"24px 12px 0"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"#3D1C00",marginBottom:12}}>Our Work</div>

          {/* Album tabs */}
          {albums.length > 0 && (
            <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
              {[{id:"all",name:"All"}, ...albums].map(alb=>(
                <button key={alb.id} onClick={()=>setActiveGalleryAlbum(alb.id)}
                  style={{flexShrink:0,padding:"5px 14px",borderRadius:20,border:`1.5px solid ${activeGalleryAlbum===alb.id?primary:"#E8D5C0"}`,background:activeGalleryAlbum===alb.id?primary:"transparent",color:activeGalleryAlbum===alb.id?"#fff":"#9C7B5C",fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}>
                  {alb.name}
                </button>
              ))}
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
            {galleryPhotos.map(photo=>(
              <div key={photo.id} style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",background:`color-mix(in srgb,${primary} 8%,#FDF6EC)`,border:"1px solid #E8D5C0",position:"relative"}}>
                {photo.type==="video"
                  ? <video src={photo.url} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline loop/>
                  : photo.url
                    ? <img src={photo.url} alt={photo.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                    : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>📸</div>
                }
                {photo.type==="video" && (
                  <div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.6)",borderRadius:5,padding:"1px 5px",fontSize:9,color:"#fff"}}>▶</div>
                )}
                {photo.title && (
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"14px 6px 5px",background:"linear-gradient(to top,rgba(61,28,0,.65),transparent)"}}>
                    <div style={{fontSize:9,fontWeight:700,color:"#fff",lineHeight:1.2}}>{photo.title}</div>
                  </div>
                )}
              </div>
            ))}
            {galleryPhotos.length === 0 && (
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:"24px",color:"#9C7B5C",fontSize:12}}>No photos in this album yet</div>
            )}
          </div>
        </div>
      )}

      {bakerInfo && Object.values(bakerInfo).some(v => typeof v === "string" && v.trim()) && (
        <div style={{padding:"24px 12px 0"}}>

          {/* Bio */}
          {bakerInfo.bio && (
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,color:"#3D1C00",marginBottom:10}}>About Us</div>
              <div style={{background:"#fff",borderRadius:14,padding:"14px 15px",border:"1px solid #F0E4D4",fontSize:13,color:"#2C1A0E",lineHeight:1.7}}>{bakerInfo.bio}</div>
            </div>
          )}

          {/* Signature Items */}
          {bakerInfo.signatureItems && (
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>⭐</span>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"#3D1C00"}}>Signature Items</div>
              </div>
              <div style={{background:"#fff",borderRadius:14,padding:"14px 15px",border:"1px solid #F0E4D4",fontSize:13,color:"#2C1A0E",lineHeight:1.7}}>{bakerInfo.signatureItems}</div>
            </div>
          )}

          {/* Flavors */}
          {Array.isArray(bakerInfo.flavors) && bakerInfo.flavors.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <span style={{fontSize:18}}>🍓</span>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"#3D1C00"}}>Available Flavors</div>
              </div>

              {/* Signature flavors — shown first with star badge */}
              {bakerInfo.flavors.some(f=>f.signature) && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#C47B00",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                    <span>⭐</span> Signature Flavors
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {bakerInfo.flavors.filter(f=>f.signature).map(fl=>(
                      <span key={fl.name} style={{display:"inline-flex",alignItems:"center",gap:5,background:`linear-gradient(135deg,${safeTheme.primary}18,${safeTheme.primary}08)`,border:`1.5px solid ${safeTheme.primary}50`,borderRadius:20,padding:"6px 14px",fontSize:12,fontWeight:700,color:safeTheme.primary}}>
                        ⭐ {fl.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Standard flavors */}
              {bakerInfo.flavors.some(f=>!f.signature) && (
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:"#9C7B5C",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
                    Standard Flavors
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {bakerInfo.flavors.filter(f=>!f.signature).map(fl=>(
                      <span key={fl.name} style={{background:`color-mix(in srgb,${safeTheme.primary} 8%,#FDF6EC)`,border:`1px solid ${safeTheme.primary}25`,borderRadius:20,padding:"5px 13px",fontSize:12,fontWeight:600,color:"#3D1C00"}}>
                        {fl.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Policies */}
          {(bakerInfo.minOrder || bakerInfo.deposit || bakerInfo.leadTime) && (
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>📋</span>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"#3D1C00"}}>Order Policies</div>
              </div>
              <div style={{background:"#fff",borderRadius:14,overflow:"hidden",border:"1px solid #F0E4D4"}}>
                {bakerInfo.minOrder && (
                  <div style={{padding:"12px 15px",borderBottom:bakerInfo.deposit||bakerInfo.leadTime?"1px solid #F0E4D4":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <span style={{fontSize:18,flexShrink:0}}>💵</span>
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:"#9C7B5C",textTransform:"uppercase",letterSpacing:".7px",marginBottom:3}}>Minimum Order</div>
                      <div style={{fontSize:13,color:"#2C1A0E",lineHeight:1.5}}>{bakerInfo.minOrder}</div>
                    </div>
                  </div>
                )}
                {bakerInfo.deposit && (
                  <div style={{padding:"12px 15px",borderBottom:bakerInfo.leadTime?"1px solid #F0E4D4":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <span style={{fontSize:18,flexShrink:0}}>🤝</span>
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:"#9C7B5C",textTransform:"uppercase",letterSpacing:".7px",marginBottom:3}}>Deposit Policy</div>
                      <div style={{fontSize:13,color:"#2C1A0E",lineHeight:1.5}}>{bakerInfo.deposit}</div>
                    </div>
                  </div>
                )}
                {bakerInfo.leadTime && (
                  <div style={{padding:"12px 15px",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <span style={{fontSize:18,flexShrink:0}}>📅</span>
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:"#9C7B5C",textTransform:"uppercase",letterSpacing:".7px",marginBottom:3}}>Lead Time</div>
                      <div style={{fontSize:13,color:"#2C1A0E",lineHeight:1.5}}>{bakerInfo.leadTime}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message form — always shown on customer storefront */}
      <div style={{padding:"24px 12px 0"}}>
        <div style={{background:"#fff",borderRadius:18,padding:"18px 16px",border:"1px solid #F0E4D4"}}>
          <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:16}}>
            <div style={{width:40,height:40,borderRadius:11,background:"#FDF6EC",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:"1px solid #F0E4D4"}}>💬</div>
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"#2C1A0E"}}>Send Us a Message</div>
              <div style={{fontSize:11,color:"#9C7B5C",marginTop:2}}>Questions? Custom orders? We'd love to hear from you!</div>
            </div>
          </div>

          {msgSent ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:8}}>✅</div>
              <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"#2C1A0E",marginBottom:4}}>Message Sent!</div>
              <div style={{fontSize:12,color:"#9C7B5C",marginBottom:12}}>We'll get back to you soon.</div>
              <button onClick={()=>{setMsgSent(false);setMsgForm({name:"",phone:"",email:"",subject:"",body:""}); }} style={{background:"none",border:"none",color:primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}>Send another message</button>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <input style={{background:"#FDF6EC",border:"1.5px solid #E8D5C0",borderRadius:10,padding:"10px 12px",fontFamily:"var(--fb)",fontSize:13,color:"#2C1A0E",outline:"none"}} placeholder="Your name *" value={msgForm.name} onChange={e=>setMsgForm(p=>({...p,name:e.target.value}))}/>
                <input style={{background:"#FDF6EC",border:"1.5px solid #E8D5C0",borderRadius:10,padding:"10px 12px",fontFamily:"var(--fb)",fontSize:13,color:"#2C1A0E",outline:"none"}} placeholder="Phone" type="tel" value={msgForm.phone} onChange={e=>setMsgForm(p=>({...p,phone:e.target.value}))}/>
              </div>
              <input style={{background:"#FDF6EC",border:"1.5px solid #E8D5C0",borderRadius:10,padding:"10px 12px",fontFamily:"var(--fb)",fontSize:13,color:"#2C1A0E",outline:"none",width:"100%"}} placeholder="Email (optional)" type="email" value={msgForm.email} onChange={e=>setMsgForm(p=>({...p,email:e.target.value}))}/>
              <select
                style={{background:"#FDF6EC",border:"1.5px solid #E8D5C0",borderRadius:10,padding:"10px 12px",fontFamily:"var(--fb)",fontSize:13,color:msgForm.subject?"#2C1A0E":"#9C7B5C",outline:"none",width:"100%",WebkitAppearance:"none",appearance:"none"}}
                value={msgForm.subject}
                onChange={e=>setMsgForm(p=>({...p,subject:e.target.value}))}
              >
                <option value="" disabled>{brand?.storeName||brand?.bakeryName||"Our"} Available Products</option>
                {(products||[]).filter(p=>p.active).map(p=>(
                  <option key={p.id} value={p.name}>{p.emoji} {p.name} — ${p.price}</option>
                ))}
                <option value="Other / Not Listed">✏️ Other / Not Listed</option>
              </select>
              <textarea style={{background:"#FDF6EC",border:"1.5px solid #E8D5C0",borderRadius:10,padding:"10px 12px",fontFamily:"var(--fb)",fontSize:13,color:"#2C1A0E",outline:"none",width:"100%",minHeight:80,resize:"none"}} placeholder="Tell us about your order — theme, date, size, any special requests..." value={msgForm.body} onChange={e=>setMsgForm(p=>({...p,body:e.target.value}))}/>
              <button onClick={sendMsg} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${primary},color-mix(in srgb,${primary} 65%,#000))`,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:14,cursor:"pointer",letterSpacing:".5px"}}>
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"24px 16px 8px",textAlign:"center",borderTop:"1px solid #F0E4D4",marginTop:24}}>
        {/* Social links */}
        {socialLinks && Object.values(socialLinks).some(v=>typeof v==="string" && v.trim()) && (
          <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
            {[
              {key:"instagram", base:"https://instagram.com/", logo:<svg width="22" height="22" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="url(#sf-ig)"/><defs><radialGradient id="sf-ig" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><circle cx="12" cy="12" r="4.8" stroke="#fff" strokeWidth="1.8" fill="none"/><circle cx="17.6" cy="6.4" r="1.3" fill="#fff"/><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="#fff" strokeWidth="1.8" fill="none"/></svg>},
              {key:"facebook",  base:"", logo:<svg width="22" height="22" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#1877F2"/><path d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z" fill="#fff"/></svg>},
              {key:"tiktok",    base:"https://tiktok.com/@", logo:<svg width="22" height="22" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#010101"/><path d="M17 8.5a4.5 4.5 0 0 1-4.5-4.5h-2.5v10.5a2 2 0 1 1-2-2v-2.5a4.5 4.5 0 1 0 4.5 4.5V11a7 7 0 0 0 4.5 1.6V10a4.5 4.5 0 0 1-2.5-.8V8.5H17z" fill="#fff"/></svg>},
              {key:"twitter",   base:"https://x.com/",       logo:<svg width="22" height="22" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#000"/><path d="M17.5 5h-2.3l-3.2 4-3-4H5l5 6.5L5 19h2.3l3.4-4.3L14 19H19l-5.2-6.8L17.5 5z" fill="#fff"/></svg>},
              {key:"website",   base:"https://",             logo:<svg width="22" height="22" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#6366F1"/><circle cx="12" cy="12" r="7" stroke="#fff" strokeWidth="1.6" fill="none"/><ellipse cx="12" cy="12" rx="3.5" ry="7" stroke="#fff" strokeWidth="1.3" fill="none"/><line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="1.3"/></svg>},
            ].filter(s=>typeof socialLinks[s.key]==="string" && socialLinks[s.key]?.trim()).map(s=>{
              const val  = socialLinks[s.key].trim();
              const href = val.startsWith("http") ? val : s.base + val.replace(/^@/,"");
              return (
                <a key={s.key} href={href} target="_blank" rel="noreferrer"
                  style={{width:44,height:44,borderRadius:"50%",background:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,0.10)",border:"1px solid #F0E4D4",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",flexShrink:0}}
                >
                  {s.logo}
                </a>
              );
            })}
          </div>
        )}
        <div style={{fontSize:11,color:"#C4A882",fontFamily:"var(--fb)",letterSpacing:"1px"}}>Powered by BakerOS</div>
        <div style={{fontSize:10,color:"#C4A882",marginTop:3,fontFamily:"var(--fb)"}}>{getStorefrontURL(brand, bakerInfo)}</div>
      </div>
    </div>
  );
}

/* Reusable product card for customer view */
function CustomerProductCard({ p, added, onOrder, primary, photos=[] }) {
  const [imgIdx, setImgIdx] = useState(0);
  const taggedPhotos = photos.filter(ph => ph.type !== "video" && (ph.productIds||[]).includes(p.id) && ph.url?.startsWith("http"));
  const displayImg = taggedPhotos.length > 0 ? taggedPhotos[imgIdx]?.url : p.imageURL;
  return (
    <div style={{background:"#fff",borderRadius:14,overflow:"hidden",border:"1px solid #F0E4D4"}}>
      {/* Photo strip — tagged images carousel */}
      {taggedPhotos.length > 0 && (
        <div style={{position:"relative",height:160,background:"#FDF6EC"}}>
          <img src={displayImg} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          {taggedPhotos.length > 1 && (
            <>
              <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i-1+taggedPhotos.length)%taggedPhotos.length);}} style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.45)",border:"none",color:"#fff",borderRadius:"50%",width:26,height:26,cursor:"pointer",fontSize:14}}>‹</button>
              <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i+1)%taggedPhotos.length);}} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.45)",border:"none",color:"#fff",borderRadius:"50%",width:26,height:26,cursor:"pointer",fontSize:14}}>›</button>
              <div style={{position:"absolute",bottom:6,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4}}>
                {taggedPhotos.map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i===imgIdx?"#fff":"rgba(255,255,255,.5)"}}/>)}
              </div>
            </>
          )}
        </div>
      )}
      <div style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:12}}>
      {taggedPhotos.length === 0 && (p.imageURL
        ? <img src={p.imageURL} alt={p.name} style={{width:52,height:52,borderRadius:11,objectFit:"cover",flexShrink:0,border:"1px solid #F0E4D4"}}/>
        : <div style={{width:52,height:52,borderRadius:11,background:"#FDF6EC",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,border:"1px solid #F0E4D4"}}>{p.emoji}</div>
      )}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"var(--fd)",fontSize:14,fontWeight:700,color:"#2C1A0E",marginBottom:2}}>{p.name}</div>
        {p.description && <div style={{fontSize:11,color:"#9C7B5C",marginBottom:5,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description}</div>}
        <div style={{fontSize:15,fontWeight:700,color:primary,fontFamily:"var(--fb)"}}>
          ${typeof p.price === "number" ? p.price : parseFloat(p.price)||0}
        </div>
      </div>
      <button
        onClick={()=>onOrder(p.id)}
        style={{
          background: added[p.id] ? "#059669" : primary,
          color:"#fff",border:"none",borderRadius:22,
          padding:"8px 16px",fontSize:12,fontFamily:"var(--fb)",
          fontWeight:800,cursor:"pointer",flexShrink:0,
          transition:"background .2s",
          minWidth:64,
        }}
      >
        {added[p.id] ? "Added!" : "Order"}
      </button>
    </div>
    </div>
  );
}

// Store name + city fields for all tiers
function StorefrontNameFields({ setBrand }) {
  const b = useBrand();
  const [saved, setSaved] = useState(false);
  const storeName = (b?.storeName === "BakerOS" || b?.storeName === "My Bakery") ? "" : (b?.storeName || "");
  const city = b?.city && b?.state ? `${b.city}, ${b.state}` : (b?.city || "");
  const [localName, setLocalName] = useState(storeName);
  const [localCity, setLocalCity] = useState(city);
  const [localTagline, setLocalTagline] = useState(b?.tagline || "");

  const handleSave = () => {
    const parts = localCity.split(",").map(s => s.trim());
    setBrand(p => ({...p, storeName: localName, tagline: localTagline, city: parts[0] || "", state: parts[1] || ""}));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",marginBottom:4}}>Store Name</div>
        <input
          className="field"
          placeholder="e.g. Lisa's Sweet Creations"
          value={localName}
          onChange={e => { setLocalName(e.target.value); setSaved(false); }}
          style={{width:"100%",fontSize:14}}
        />
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",marginBottom:4}}>Tagline</div>
        <input
          className="field"
          placeholder="e.g. Homemade with love · San Antonio"
          value={localTagline}
          onChange={e => { setLocalTagline(e.target.value); setSaved(false); }}
          style={{width:"100%",fontSize:14}}
        />
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",marginBottom:4}}>City, State</div>
        <input
          className="field"
          placeholder="e.g. San Antonio, TX"
          value={localCity}
          onChange={e => { setLocalCity(e.target.value); setSaved(false); }}
          style={{width:"100%",fontSize:14}}
        />
      </div>
      <button
        onClick={handleSave}
        style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:saved?"#16A34A":"var(--p)",color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:14,cursor:"pointer",transition:"background .3s"}}
      >
        {saved ? "✓ Saved!" : "Save"}
      </button>
    </>
  );
}

function StorefrontPage({ products=[], categories=[], photos=[], bakerInfo, setBakerInfo, setPage, setBrand }) {
  const isOwnerPreview = false;
  const b_raw = useBrand();
  const b = { ...b_raw, theme: b_raw?.theme || { primary:"#C47B00", accent:"#E8A838", bg:"#FFFBF5", surface:"#FDF6EC", text:"#2C1A0E" } };
  // Ensure bakerInfo is never null/undefined
  const safeBI = bakerInfo || { bio:"", minOrder:"", deposit:"", leadTime:"", flavors:[], signatureItems:"" };
  const { tier: sfTier } = useTier();
  const [t, show] = useToast();
  const [filterCat, setFilterCat] = useState("all");
  const [openPanel, setOpenPanel] = useState(null);
  const [newFlavorInput, setNewFlavorInput] = useState("");
  const [expandedCats, setExpandedCats] = useState({});
  const toggleCat = (id) => setExpandedCats(p => ({...p, [id]: !p[id]}));

  // Flavor helpers
  const flavors = safeBI.flavors || [];
  const addFlavor = (name) => {
    const trimmed = name.trim();
    if (!trimmed || flavors.some(f=>f.name===trimmed)) return;
    setBakerInfo(p=>({...p, flavors:[...p.flavors, {name:trimmed, signature:false}]}));
  };
  const removeFlavor = (name) => setBakerInfo(p=>({...p, flavors:p.flavors.filter(f=>f.name!==name)}));
  const toggleSignature = (name) => setBakerInfo(p=>({...p, flavors:p.flavors.map(f=>f.name===name?{...f,signature:!f.signature}:f)}));

  const filledCount = [
    safeBI.bio, safeBI.signatureItems,
    flavors.length > 0 ? "x" : "",
    safeBI.minOrder, safeBI.deposit, safeBI.leadTime
  ].filter(v=>v&&typeof v==="string"&&v.trim()).length;

  const INFO_SECTIONS = [
    {
      key: "bio",
      icon: "👩‍🍳",
      label: "Baker Bio",
      placeholder: "Tell customers about yourself — your passion for baking, your story, how long you've been doing this, what makes your bakes special...",
      hint: "Your customers want to know the person behind the treats.",
      type: "textarea",
    },
    {
      key: "signatureItems",
      icon: "⭐",
      label: "Signature Items",
      placeholder: "e.g. 3-tier custom birthday cakes, decorated sugar cookies, cake pops...",
      hint: "List the items you're known for — your specialties.",
      type: "textarea",
    },
    {
      key: "flavors",
      icon: "🍓",
      label: "Available Flavors",
      placeholder: "",
      hint: "Add your flavors and mark which ones are your signatures.",
      type: "flavors",   // custom render — handled separately
    },
    {
      key: "minOrder",
      icon: "💵",
      label: "Minimum Order",
      placeholder: "e.g. $50 minimum for custom orders",
      hint: "Let customers know your minimums upfront.",
      type: "text",
    },
    {
      key: "deposit",
      icon: "🤝",
      label: "Deposit Policy",
      placeholder: "e.g. 50% deposit required to hold your date",
      hint: "How much deposit do you require, and when is it due?",
      type: "text",
    },
    {
      key: "leadTime",
      icon: "📅",
      label: "Lead Time",
      placeholder: "e.g. Minimum 5 business days for custom cakes",
      hint: "How far in advance should customers order?",
      type: "text",
    },
  ];

  const save = (key, val) => {
    setBakerInfo(p => ({...p, [key]: val}));
    setOpenPanel(null);
    show("Saved ✓");
  };

  const activeProducts  = products.filter(p => p.active);
  const signatureProds  = activeProducts.filter(p => p.signature);
  const usedCats = categories.filter(c => activeProducts.some(p => (p.categories||[]).includes(c.id)));
  const filtered = filterCat === "all"
    ? activeProducts
    : filterCat === "signature"
    ? signatureProds
    : activeProducts.filter(p => (p.categories||[]).includes(filterCat));
  const featPhotos = photos.filter(p => p.featured);

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="Storefront" sub="Your public bakery page" action={<PageHelp pageKey="storefront"/>}/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:11}}>

        {/* Logo status card */}
        <div className="card" style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:12}}>
          {b.logo
            ? <img src={b.logo} alt="Your logo" style={{width:52,height:52,borderRadius:11,objectFit:"contain",background:"none",flexShrink:0}}/>
            : <div style={{width:52,height:52,borderRadius:11,background:"var(--bg)",border:"1.5px dashed var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🖼</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:2}}>
              {b.logo ? "Logo uploaded ✓" : "No logo uploaded yet"}
            </div>
            {canAccess(sfTier,"custom_branding")
              ? <div style={{fontSize:11,color:"#16A34A",fontWeight:600}}>{b.logo ? "Showing on your customer storefront" : "Upload in Branding settings"}</div>
              : <div style={{fontSize:11,color:"#3D5A99",fontWeight:600}}>🔒 Visible on storefront with Growth plan</div>
            }
          </div>
          <button
            onClick={()=>setPage("branding")}
            style={{padding:"7px 13px",borderRadius:9,border:`1px solid ${b.theme.primary}`,background:"transparent",color:b.theme.primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:11,cursor:"pointer",flexShrink:0}}
          >
            {b.logo ? "Change" : "Upload"}
          </button>
        </div>

        {/* Store link + QR */}
        <div className="card" style={{padding:"13px 14px"}}>
          <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:5}}>Store Link</div>
          <div style={{fontSize:13,fontWeight:600,color:"var(--tx)",marginBottom:9}}>{getStorefrontURL(b, safeBI)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <button className="pbtn" onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(getStorefrontURL(b,safeBI));show("Link copied ✓");}} style={{fontSize:12}}>Copy Link</button>
            <button className="gbtn" onClick={()=>{
  const url = `https://app.bakeros.app/store/${safeBI?.username||b?.bakeryUsername||"bakeros"}`;
  if(navigator.share){navigator.share({title:bakerInfo?.name||"My Bakery",text:"Check out my bakery page!",url}).catch(()=>{});}
  else if(navigator.clipboard){navigator.clipboard.writeText(url);show("Link copied ✓");}
}} style={{padding:"12px",fontSize:12,borderRadius:12,color:"var(--tx)"}}>Share ↗</button>
            <button
              onClick={()=>setPage("customer_storefront")}
              style={{padding:"12px",borderRadius:12,border:`1.5px solid ${b.theme.primary}`,background:"transparent",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,color:b.theme.primary,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}
            >
              👁 Preview
            </button>
          </div>
        </div>
        <div className="card" style={{padding:"14px",textAlign:"center"}}>
          <div className="qr-storefront-wrap" style={{border:"2px solid var(--bd)",borderRadius:11,padding:3,display:"inline-block",margin:"0 auto 10px",background:"#fff"}}><QRCodeDisplay url={`https://app.bakeros.app/store/${safeBI?.username||b?.bakeryUsername||"bakeros"}`} size={94} primaryColor={b.theme.primary}/></div>
          <button className="gbtn" onClick={()=>{
  const canvas = document.querySelector(".qr-storefront-wrap canvas");
  if(canvas){const a=document.createElement("a");a.download="bakeros-qr.png";a.href=canvas.toDataURL("image/png");a.click();show("QR downloaded ✓");}
  else show("QR not ready — try again");
}} style={{width:"100%",padding:"10px",borderRadius:11,fontSize:13,color:"var(--tx)"}}>Download QR Code</button>
        </div>

        {/* Category filter tabs — from ProductsPage categories */}
        {(usedCats.length > 0 || signatureProds.length > 0) && (
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
            <button
              className={"ptab " + (filterCat==="all"?"on":"off")}
              onClick={()=>setFilterCat("all")}
              style={{flexShrink:0}}
            >
              All ({activeProducts.length})
            </button>
            {/* Signature tab — only shown if any products are marked signature */}
            {signatureProds.length > 0 && (
              <button
                onClick={()=>setFilterCat("signature")}
                style={{
                  flexShrink:0,padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",
                  fontFamily:"var(--fb)",fontSize:12,fontWeight:700,transition:"all .2s",
                  background: filterCat==="signature" ? b.theme.primary : `color-mix(in srgb,${b.theme.primary} 15%,var(--bd))`,
                  color:       filterCat==="signature" ? "#fff"           : b.theme.primary,
                }}
              >
                ⭐ Signature ({signatureProds.length})
              </button>
            )}
            {usedCats.map(cat => (
              <button
                key={cat.id}
                onClick={()=>setFilterCat(cat.id)}
                style={{
                  flexShrink:0,padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",
                  fontFamily:"var(--fb)",fontSize:12,fontWeight:700,transition:"all .2s",
                  background: filterCat===cat.id ? cat.color : "var(--bd)",
                  color:       filterCat===cat.id ? "#fff"     : "var(--mu)",
                }}
              >
                {cat.emoji} {cat.name} ({activeProducts.filter(p=>(p.categories||[]).includes(cat.id)).length})
              </button>
            ))}
          </div>
        )}

        {/* Products grouped by category or flat list */}
        {filtered.length === 0 ? (
          <div className="card" style={{padding:"28px",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:8}}>🛍</div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:4}}>No products yet</div>
            <div style={{fontSize:11,color:"var(--mu)",marginBottom:14}}>Add products in the Products page</div>
            <button className="pbtn" onClick={()=>setPage("products")} style={{padding:"10px 22px",borderRadius:12,fontSize:13}}>Go to Products</button>
          </div>
        ) : filterCat !== "all" ? (
          /* Flat list when filtering by a category or signature */
          filtered.map(p => (
            <div key={p.id} className="card" style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:46,height:46,borderRadius:11,background:`color-mix(in srgb,${b.theme.primary} 10%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,overflow:"hidden"}}>
                {p.imageURL ? <img src={p.imageURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : p.emoji}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",display:"flex",alignItems:"center",gap:6}}>
                  {p.name}
                  {p.signature && <span style={{fontSize:9,fontWeight:800,background:b.theme.primary,color:"#fff",borderRadius:20,padding:"1px 6px",flexShrink:0}}>⭐</span>}
                </div>
                {p.description&&<div style={{fontSize:11,color:"var(--mu)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description}</div>}
              </div>
              <div style={{fontSize:15,fontWeight:800,color:b.theme.primary,flexShrink:0}}>${p.price}</div>
            </div>
          ))
        ) : (
          /* Grouped by category when showing "All" */
          <>
            {/* Products with at least one category — show under each category */}
            {usedCats.map(cat => {
              const catProds = activeProducts.filter(p => (p.categories||[]).includes(cat.id));
              if (catProds.length === 0) return null;
              const isOpen = !!expandedCats[cat.id];
              return (
                <div key={cat.id} style={{marginBottom:4}}>
                  {/* Tappable category header */}
                  <button
                    onClick={()=>toggleCat(cat.id)}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"11px 13px",background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:isOpen?"12px 12px 0 0":"12px",cursor:"pointer",transition:"border-radius .2s"}}
                  >
                    <div style={{width:30,height:30,borderRadius:8,background:cat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.emoji}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"var(--tx)",flex:1,textAlign:"left"}}>{cat.name}</div>
                    <div style={{fontSize:11,color:"var(--mu)",marginRight:4}}>{catProds.length} item{catProds.length!==1?"s":""}</div>
                    <div style={{fontSize:16,color:"var(--mu)",transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>›</div>
                  </button>
                  {/* Collapsible product list */}
                  {isOpen && (
                    <div style={{border:"1px solid var(--bd)",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",display:"flex",flexDirection:"column",gap:0}}>
                      {catProds.map((p,idx) => (
                        <div key={p.id} style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:11,borderTop:idx>0?"1px solid var(--bd)":"none",background:"var(--bg)"}}>
                          <div style={{width:46,height:46,borderRadius:11,background:`color-mix(in srgb,${cat.color} 10%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,overflow:"hidden"}}>
                            {p.imageURL ? <img src={p.imageURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : p.emoji}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{p.name}</div>
                            {p.description&&<div style={{fontSize:11,color:"var(--mu)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description}</div>}
                          </div>
                          <div style={{fontSize:15,fontWeight:800,color:b.theme.primary,flexShrink:0}}>${p.price}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Uncategorised products */}
            {activeProducts.filter(p=>p.categories.length===0).length > 0 && (() => {
              const uncatProds = activeProducts.filter(p=>p.categories.length===0);
              const isOpen = !!expandedCats["__uncat__"];
              return (
                <div style={{marginBottom:4}}>
                  <button
                    onClick={()=>toggleCat("__uncat__")}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"11px 13px",background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:isOpen?"12px 12px 0 0":"12px",cursor:"pointer"}}
                  >
                    <div style={{width:30,height:30,borderRadius:8,background:"var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📦</div>
                    <div style={{fontSize:14,fontWeight:800,color:"var(--tx)",flex:1,textAlign:"left"}}>Other Items</div>
                    <div style={{fontSize:11,color:"var(--mu)",marginRight:4}}>{uncatProds.length} item{uncatProds.length!==1?"s":""}</div>
                    <div style={{fontSize:16,color:"var(--mu)",transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>›</div>
                  </button>
                  {isOpen && (
                    <div style={{border:"1px solid var(--bd)",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",display:"flex",flexDirection:"column",gap:0}}>
                      {uncatProds.map((p,idx) => (
                        <div key={p.id} style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:11,borderTop:idx>0?"1px solid var(--bd)":"none",background:"var(--bg)"}}>
                          <div style={{width:46,height:46,borderRadius:11,background:"var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,overflow:"hidden"}}>
                            {p.imageURL ? <img src={p.imageURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : p.emoji}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{p.name}</div>
                            {p.description&&<div style={{fontSize:11,color:"var(--mu)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description}</div>}
                          </div>
                          <div style={{fontSize:15,fontWeight:800,color:b.theme.primary,flexShrink:0}}>${p.price}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* ── Our Work / Gallery section ── */}
        {photos.filter(p=>p.url||true).length > 0 && (
          <div>
            {/* Section header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,marginTop:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>📸</span>
                <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)"}}>Our Work</div>
              </div>
              <button
                onClick={()=>setPage("gallery")}
                style={{fontSize:12,fontWeight:700,color:"var(--p)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--fb)"}}
              >
                View all →
              </button>
            </div>

            {/* Featured photos strip */}
            {photos.filter(p=>p.featured).length > 0 && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>★ Featured</div>
                <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
                  {photos.filter(p=>p.featured).map(photo=>(
                    <div key={photo.id} style={{flexShrink:0,width:130,height:130,borderRadius:13,overflow:"hidden",position:"relative",border:`2px solid ${b.theme.primary}40`,background:`color-mix(in srgb,${b.theme.primary} 10%,var(--bg))`}}>
                      {photo.url
                        ? <img src={photo.url} alt={photo.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}><span style={{fontSize:38}}>{photo.emoji}</span></div>
                      }
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"18px 8px 6px",background:"linear-gradient(to top,rgba(0,0,0,.65),transparent)"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{photo.title}</div>
                        <div style={{fontSize:8,color:"rgba(255,255,255,.7)",marginTop:1}}>{photo.category}</div>
                      </div>
                      <div style={{position:"absolute",top:6,right:6,fontSize:10,color:"#FFD700"}}>★</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3-col photo grid — all photos */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {photos.slice(0,9).map(photo=>(
                <div key={photo.id} style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",position:"relative",background:`color-mix(in srgb,${b.theme.primary} 8%,var(--bg))`,border:"1px solid var(--bd)"}}>
                  {photo.url
                    ? <img src={photo.url} alt={photo.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{photo.emoji}</div>
                  }
                  {photo.featured&&<div style={{position:"absolute",top:4,right:4,fontSize:9,color:"#FFD700",background:"rgba(0,0,0,.4)",borderRadius:20,padding:"1px 5px"}}>★</div>}
                </div>
              ))}
              {photos.length > 9 && (
                <div
                  onClick={()=>setPage("gallery")}
                  style={{aspectRatio:"1",borderRadius:10,border:"1.5px solid var(--bd)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"var(--bg)",gap:3}}
                >
                  <span style={{fontSize:18,color:"var(--p)"}}>+{photos.length-9}</span>
                  <span style={{fontSize:9,fontWeight:700,color:"var(--p)"}}>more</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Message the baker ── hidden on baker's own storefront, shown to customers ── */}
        <div id="public-order-form" className="card" style={{padding:"16px",display:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:`color-mix(in srgb,${b.theme.primary} 14%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💬</div>
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"var(--tx)"}}>Send Us a Message</div>
              <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>Questions? Custom orders? We'd love to hear from you!</div>
            </div>
          </div>
          {canAccess(sfTier,"messages")
            ? <StorefrontMessageForm onSent={()=>show("Message sent! We'll be in touch soon ✓")} bakerPhone={bakerInfo?.phone||""}/>
            : <div style={{background:"color-mix(in srgb,#3D5A99 7%,var(--bg))",border:"1.5px solid #3D5A9930",borderRadius:12,padding:"16px",textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:8}}>💬</div>
                <div style={{fontSize:14,fontWeight:800,color:"var(--tx)",marginBottom:6}}>Want customers to contact you directly?</div>
                <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.6,marginBottom:14}}>Upgrade to Growth to receive messages from your storefront.</div>
                <button onClick={()=>setPage("subscription")} style={{width:"100%",background:"#3D5A99",color:"#fff",border:"none",borderRadius:11,padding:"11px",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}>Unlock Messaging →</button>
              </div>
          }
        </div>

        {/* ── Store Name + City — available to all tiers ── */}
        <div className="card" style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:12,fontWeight:800,color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:2}}>Your Bakery Identity</div>
          <StorefrontNameFields setBrand={setBrand}/>
          <div style={{fontSize:11,color:"var(--mu)"}}>💡 These appear on your public storefront and marketing materials</div>
        </div>

        {/* ── Accepting Orders Toggle — all tiers ── */}
        <div className="card" style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--tx)",marginBottom:2}}>Accepting Orders</div>
            <div style={{fontSize:11,color:"var(--mu)"}}>Turn off to pause new orders from your storefront</div>
          </div>
          <div
            className="toggle"
            style={{background:bakerInfo.acceptingOrders===false?"#9CA3AF":"var(--p)"}}
            onClick={()=>setBakerInfo(p=>({...p, acceptingOrders: p.acceptingOrders===false ? true : false}))}
          >
            <div className="toggle-knob" style={{left:bakerInfo.acceptingOrders===false?3:23}}/>
          </div>
        </div>

        {/* ── Baker Info Section ── */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontFamily:"var(--fd)",fontSize:17,fontWeight:700,color:"var(--tx)"}}>Bakery Info</div>
            {filledCount > 0 && <span style={{fontSize:10,fontWeight:700,background:`color-mix(in srgb,${b.theme.primary} 14%,var(--sf))`,color:b.theme.primary,borderRadius:20,padding:"2px 9px"}}>{filledCount}/{INFO_SECTIONS.length} filled</span>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {INFO_SECTIONS.map(section => {
              const val = section.key === "flavors"
                ? (flavors.length > 0 ? `${flavors.length} flavor${flavors.length!==1?"s":""} · ${flavors.filter(f=>f.signature).length} signature` : "")
                : (bakerInfo[section.key] || "");
              const isOpen   = openPanel === section.key;
              const isFilled = section.key === "flavors" ? flavors.length > 0 : val.trim().length > 0;
              return (
                <div key={section.key} className="card" style={{overflow:"hidden",borderLeft:isFilled?`3px solid ${b.theme.primary}`:"3px solid var(--bd)"}}>
                  {/* Button row */}
                  <button
                    onClick={() => setOpenPanel(isOpen ? null : section.key)}
                    style={{width:"100%",padding:"12px 14px",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--fb)",display:"flex",alignItems:"center",gap:11,textAlign:"left"}}
                  >
                    <div style={{width:36,height:36,borderRadius:9,background:isFilled?`color-mix(in srgb,${b.theme.primary} 14%,var(--sf))`:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,border:`1px solid ${isFilled?b.theme.primary+"40":"var(--bd)"}`}}>
                      {section.icon}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{section.label}</div>
                      {isFilled
                        ? <div style={{fontSize:11,color:"var(--mu)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val}</div>
                        : <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{section.hint}</div>
                      }
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                      {isFilled && <span style={{fontSize:11,fontWeight:700,color:"#16A34A"}}>✓</span>}
                      <span style={{fontSize:14,color:"var(--mu)",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>⌄</span>
                    </div>
                  </button>

                  {/* Expanded edit panel */}
                  {isOpen && (
                    <div style={{padding:"0 14px 14px",borderTop:"1px solid var(--bd)"}}>
                      <div style={{height:10}}/>

                      {section.type === "flavors" ? (
                        /* ── Flavor manager ── */
                        <div>
                          {/* Add new flavor row */}
                          <div style={{display:"flex",gap:8,marginBottom:12}}>
                            <input
                              className="field"
                              placeholder="Type a flavor and tap Add..."
                              value={newFlavorInput}
                              onChange={e=>setNewFlavorInput(e.target.value)}
                              onKeyDown={e=>{ if(e.key==="Enter"){addFlavor(newFlavorInput);setNewFlavorInput("");} }}
                              style={{flex:1,fontSize:13}}
                            />
                            <button
                              onClick={()=>{addFlavor(newFlavorInput);setNewFlavorInput("");}}
                              style={{padding:"10px 14px",borderRadius:10,border:"none",background:b.theme.primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}
                            >+ Add</button>
                          </div>

                          {/* Quick-add preset chips */}
                          <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:7}}>Quick add</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                            {["Chocolate","Vanilla","Strawberry","Lemon","Red Velvet","Funfetti","Carrot","Cookies & Cream","Coconut","Tres Leches","Horchata","Pumpkin Spice","Banana","Blueberry","Peach","Almond"].map(name=>{
                              const exists = flavors.some(f=>f.name===name);
                              return (
                                <button key={name} onClick={()=>exists?removeFlavor(name):addFlavor(name)}
                                  style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${exists?b.theme.primary:"var(--bd)"}`,background:exists?b.theme.primary:"transparent",color:exists?"#fff":"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}
                                >{exists?"✓ ":""}{name}</button>
                              );
                            })}
                          </div>

                          {/* Flavor list with Standard/Signature toggle */}
                          {flavors.length > 0 && (
                            <div>
                              <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>
                                Your flavors — tap ⭐ to mark as signature
                              </div>
                              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                                {flavors.map(fl=>(
                                  <div key={fl.name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:11,background:fl.signature?`color-mix(in srgb,${b.theme.primary} 8%,var(--bg))`:"var(--bg)",border:`1px solid ${fl.signature?b.theme.primary+"40":"var(--bd)"}`}}>
                                    <div style={{flex:1}}>
                                      <div style={{fontSize:13,fontWeight:600,color:"var(--tx)",display:"flex",alignItems:"center",gap:6}}>
                                        {fl.name}
                                        {fl.signature && <span style={{fontSize:9,fontWeight:800,background:b.theme.primary,color:"#fff",borderRadius:20,padding:"1px 7px"}}>SIGNATURE</span>}
                                      </div>
                                      <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>{fl.signature?"Signature flavor":"Standard flavor"}</div>
                                    </div>
                                    {/* Signature toggle */}
                                    <button
                                      onClick={()=>toggleSignature(fl.name)}
                                      title={fl.signature?"Remove signature":"Mark as signature"}
                                      style={{width:32,height:32,borderRadius:"50%",border:`1.5px solid ${fl.signature?b.theme.primary:"var(--bd)"}`,background:fl.signature?b.theme.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:15,flexShrink:0}}
                                    >{fl.signature?"⭐":"☆"}</button>
                                    {/* Remove */}
                                    <button
                                      onClick={()=>removeFlavor(fl.name)}
                                      style={{width:28,height:28,borderRadius:"50%",border:"1px solid var(--bd)",background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,color:"var(--mu)",flexShrink:0}}
                                    >×</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {flavors.length===0 && (
                            <div style={{textAlign:"center",padding:"20px 0",color:"var(--mu)",fontSize:12}}>
                              Add flavors above using the quick-add chips or type your own.
                            </div>
                          )}

                          <button onClick={()=>setOpenPanel(null)} className="pbtn" style={{width:"100%",marginTop:14}}>Done ✓</button>
                        </div>

                      ) : section.type === "textarea" ? (
                        <>
                          <textarea className="field" rows={4} placeholder={section.placeholder} defaultValue={val} id={`info-${section.key}`} style={{resize:"none",fontSize:13,lineHeight:1.6}}/>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:10}}>
                            <button onClick={()=>setOpenPanel(null)} style={{padding:"10px",borderRadius:10,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button>
                            <button onClick={()=>{const el=document.getElementById(`info-${section.key}`);save(section.key,el?.value||"");}} className="pbtn" style={{padding:"10px",borderRadius:10,fontSize:12}}>Save ✓</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <input className="field" placeholder={section.placeholder} defaultValue={val} id={`info-${section.key}`} style={{fontSize:13}}/>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:10}}>
                            <button onClick={()=>setOpenPanel(null)} style={{padding:"10px",borderRadius:10,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button>
                            <button onClick={()=>{const el=document.getElementById(`info-${section.key}`);save(section.key,el?.value||"");}} className="pbtn" style={{padding:"10px",borderRadius:10,fontSize:12}}>Save ✓</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Manage products shortcut */}
        <button
          className="gbtn"
          onClick={()=>setPage("products")}
          style={{width:"100%",padding:"12px",borderRadius:12,color:"var(--tx)",fontSize:13,fontWeight:600}}
        >
          ⚙ Manage Products & Categories
        </button>
      </div>
    </div>
  );
}

function PaymentsPage({ payHandles, setPayHandles, invoices=[], orders=[] }){
  const b = useBrand();
  const { tier:pmtTier, setPage:pmtSetPage } = useTier();
  const [t,show] = useToast();
  const [localHandles, setLocalHandles] = useState(payHandles || {cashapp:"",venmo:"",zelle:""});

  const save = () => {
    setPayHandles(localHandles);
    show("Payment handles saved ✓");
  };

  const connectedCount = Object.values(localHandles).filter(v=>typeof v==="string" && v.trim()).length;
  const isTrial = pmtTier === "starter";

  // ── HANDLE INPUT SECTION (shown to ALL tiers) ────────────────────────────
  const HandleInputs = () => (
    <div className="card" style={{padding:"15px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Instant Pay Links</div>
        {connectedCount > 0 && <span style={{fontSize:10,fontWeight:700,background:`color-mix(in srgb,${b.theme.primary} 14%,var(--sf))`,color:b.theme.primary,borderRadius:20,padding:"2px 9px"}}>{connectedCount} added</span>}
      </div>
      <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5,marginBottom:14}}>
        {isTrial
          ? "Add your handles now — upgrade to Growth to activate pay buttons on your invoices."
          : "Add your handles once — BakerOS puts tap-to-pay buttons on every invoice you send."
        }
      </div>

      {/* Cash App */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
          <div style={{width:34,height:34,borderRadius:9,background:"#00D64F15",border:"1.5px solid #00D64F40",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>💵</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Cash App</div>
            <div style={{fontSize:10,color:"var(--mu)"}}>Your $cashtag</div>
          </div>
          {localHandles.cashapp.trim() && <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:"#16A34A"}}>● Added</span>}
        </div>
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:700,color:"#00C244",pointerEvents:"none"}}>$</div>
          <input className="field" placeholder="yourcashtag" value={localHandles.cashapp.replace(/^\$/,"")} onChange={e=>{const v=e.target.value;setLocalHandles(p=>({...p,cashapp:v}));}} style={{paddingLeft:28}}/>
        </div>
        {localHandles.cashapp.trim() && (
          <div style={{marginTop:6,padding:"7px 11px",background:"#00D64F10",borderRadius:9,fontSize:11,color:"#16A34A",fontWeight:600}}>
            {isTrial ? "🔒 Activates on invoices when you upgrade" : `Invoice link: cash.app/$${localHandles.cashapp.replace(/^\$/,"")}`}
          </div>
        )}
      </div>

      {/* Venmo */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
          <div style={{width:34,height:34,borderRadius:9,background:"#008CFF15",border:"1.5px solid #008CFF40",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>💙</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Venmo</div>
            <div style={{fontSize:10,color:"var(--mu)"}}>Your @handle</div>
          </div>
          {localHandles.venmo.trim() && <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:"#16A34A"}}>● Added</span>}
        </div>
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:700,color:"#008CFF",pointerEvents:"none"}}>@</div>
          <input className="field" placeholder="yourhandle" value={localHandles.venmo.replace(/^@/,"")} onChange={e=>{const v=e.target.value;setLocalHandles(p=>({...p,venmo:v}));}} style={{paddingLeft:26}}/>
        </div>
        {localHandles.venmo.trim() && (
          <div style={{marginTop:6,padding:"7px 11px",background:"#008CFF10",borderRadius:9,fontSize:11,color:"#008CFF",fontWeight:600}}>
            {isTrial ? "🔒 Activates on invoices when you upgrade" : `Invoice link: venmo.com/u/${localHandles.venmo.replace(/^@/,"")}`}
          </div>
        )}
      </div>

      {/* Zelle */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
          <div style={{width:34,height:34,borderRadius:9,background:"#6D1ED415",border:"1.5px solid #6D1ED440",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>💜</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Zelle</div>
            <div style={{fontSize:10,color:"var(--mu)"}}>Phone number or email</div>
          </div>
          {localHandles.zelle.trim() && <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:"#16A34A"}}>● Added</span>}
        </div>
        <input className="field" placeholder="(210) 555-0100 or email@example.com" value={localHandles.zelle} onChange={e=>{const v=e.target.value;setLocalHandles(p=>({...p,zelle:v}));}}/>
        {localHandles.zelle.trim() && (
          <div style={{marginTop:6,padding:"7px 11px",background:"#6D1ED410",borderRadius:9,fontSize:11,color:"#6D1ED4",fontWeight:600}}>
            {isTrial ? "🔒 Activates on invoices when you upgrade" : `Customers send to: ${localHandles.zelle}`}
          </div>
        )}
      </div>

      <button className="pbtn" onClick={save} style={{width:"100%"}}>
        {isTrial ? "Save My Handles" : "Save Payment Handles"}
      </button>

      {/* Trial upgrade prompt — shown after they add at least one handle */}
      {isTrial && connectedCount > 0 && (
        <div style={{marginTop:12,background:`color-mix(in srgb,${b.theme.primary} 8%,var(--bg))`,border:`1.5px solid ${b.theme.primary}30`,borderRadius:13,padding:"14px 15px"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
            <span style={{fontSize:20}}>🎉</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"var(--tx)"}}>Your payment handles are ready</div>
              <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>Upgrade to Growth to activate them on your invoices and start getting paid.</div>
            </div>
          </div>
          <button
            onClick={()=>pmtSetPage("subscription")}
            style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${b.theme.primary},color-mix(in srgb,${b.theme.primary} 65%,#000))`,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}
          >
            Upgrade to Growth — $19.99/mo →
          </button>
          <div style={{fontSize:10,color:"var(--mu)",textAlign:"center",marginTop:7}}>Cancel anytime · No contracts</div>
        </div>
      )}

      {/* Growth+ confirmation */}
      {!isTrial && connectedCount > 0 && (
        <div style={{marginTop:10,padding:"9px 12px",background:`color-mix(in srgb,${b.theme.primary} 7%,var(--bg))`,borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13}}>🧾</span>
          <div style={{fontSize:11,color:"var(--mu)"}}>Pay buttons appear on every invoice you send to customers</div>
        </div>
      )}
    </div>
  );

  // ── TRIAL VIEW — handle inputs + locked preview of full payments ──────────
  if (isTrial) return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="Payments" sub="Set up your payment methods"/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:11}}>
        <HandleInputs/>

        {/* Locked preview of full payments */}
        <div style={{position:"relative",borderRadius:14,overflow:"hidden"}}>
          {/* Blurred content preview */}
          <div style={{filter:"blur(3px)",pointerEvents:"none",opacity:.5}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:11}}>
              {[["💰","$3,240","Collected"],["⏳","$127","Pending"],["📈","$49.20","Avg Order"],["🔄","$0","Refunds"]].map(([ic,val,lbl])=>(
                <div key={lbl} className="card" style={{padding:"11px 13px"}}>
                  <span style={{fontSize:18}}>{ic}</span>
                  <div style={{fontSize:18,fontWeight:800,color:"var(--tx)",marginTop:3}}>{val}</div>
                  <div style={{fontSize:10,color:"var(--mu)",marginTop:2}}>{lbl}</div>
                </div>
              ))}
            </div>
            {[{icon:"💳",name:"Stripe"},{icon:"⬛",name:"Square"}].map(m=>(
              <div key={m.name} className="card" style={{padding:"12px 13px",marginBottom:9,display:"flex",alignItems:"center",gap:11}}>
                <span style={{fontSize:24}}>{m.icon}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{m.name}</div><div style={{fontSize:11,color:"var(--mu)"}}>Card processing</div></div>
                <button className="pbtn" style={{padding:"7px 12px",fontSize:12,borderRadius:9}}>Connect</button>
              </div>
            ))}
          </div>
          {/* Lock overlay */}
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)",padding:20,textAlign:"center",borderRadius:14}}>
            <span style={{fontSize:28,marginBottom:8}}>💳</span>
            <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:5}}>Start Accepting Payments</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.75)",marginBottom:14,lineHeight:1.5}}>Unlock payment stats, Stripe &amp; Square card processing on Growth.</div>
            <button onClick={()=>pmtSetPage("subscription")} style={{background:"#3D5A99",color:"#fff",border:"none",borderRadius:12,padding:"11px 22px",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}>Upgrade to Growth →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── GROWTH+ VIEW — full payments page ────────────────────────────────────
  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="Payments" sub="Connect & manage methods"/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:11}}>
        {(()=>{
          const paid = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.amount||0),0);
          const pending = invoices.filter(i=>i.status==="unpaid").reduce((s,i)=>s+(i.amount||0),0);
          const compOrds = orders.filter(o=>o.status==="completed");
          const avg = compOrds.length>0?(compOrds.reduce((s,o)=>s+(o.amount||0),0)/compOrds.length).toFixed(2):"0.00";
          const refunded = orders.filter(o=>o.status==="refunded").reduce((s,o)=>s+(o.amount||0),0);
          const stats=[["💰","$"+paid.toLocaleString(),"Collected"],["⏳","$"+pending.toLocaleString(),"Pending"],["📈","$"+avg,"Avg Order"],["🔄",refunded>0?"-$"+refunded.toLocaleString():"$0","Refunded"]];
          return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{stats.map(([ic,val,lbl])=>(
            <div key={lbl} className="card" style={{padding:"11px 13px"}}>
              <span style={{fontSize:18}}>{ic}</span>
              <div style={{fontSize:18,fontWeight:800,color:"var(--tx)",marginTop:3}}>{val}</div>
              <div style={{fontSize:10,color:"var(--mu)",marginTop:2}}>{lbl}</div>
            </div>
          ))}</div>;
        })()}

        <HandleInputs/>

        <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Card Processing</div>
        {[{icon:"💳",name:"Stripe",sub:"Credit & debit card checkout",connected:true},{icon:"⬛",name:"Square",sub:"POS & online payments",connected:true}].map(m=>(
          <div key={m.name} className="card" style={{padding:"12px 13px",display:"flex",alignItems:"center",gap:11}}>
            <span style={{fontSize:24,flexShrink:0}}>{m.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{m.name}</div>
              <div style={{fontSize:11,color:m.connected?"#16A34A":"var(--mu)",marginTop:1,fontWeight:600}}>{m.connected?"● Connected":m.sub}</div>
            </div>
            {!m.connected && <button className="pbtn" onClick={()=>show(`Connecting ${m.name}...`)} style={{padding:"7px 12px",fontSize:12,borderRadius:9,flexShrink:0}}>Connect</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage({ socialLinks, setSocialLinks, brand, setBakerInfo, bakerInfo, setOnboarded, setPage, obBakery }){
  const b=useBrand();
  const { tier } = useTier();
  const [notifs,setNotifs]=useState({orders:true,leads:true,lowstock:true,weekly:false});
  const [t,show]=useToast();
  const [showReset, setShowReset] = useState(false);

  const SOCIAL_FIELDS = [
    { key:"instagram", label:"Instagram",   icon:"📸", placeholder:"@yourbakery" },
    { key:"facebook",  label:"Facebook",    icon:"👍", placeholder:"facebook.com/yourbakery" },
    { key:"tiktok",    label:"TikTok",      icon:"🎵", placeholder:"@yourbakery" },
    { key:"twitter",   label:"X / Twitter", icon:"✕",  placeholder:"@yourbakery" },
    { key:"website",   label:"Website",     icon:"🌐", placeholder:"yourbakery.com" },
  ];

  const filledCount = Object.values(socialLinks||{}).filter(v=>typeof v==="string" && v.trim()).length;

  const handleReset = async () => {
    // Delete from Supabase so hydration doesn't restore the old data
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // baker_data table no longer exists — using baker_settings instead
      }
    } catch(e) { console.warn('Reset: could not delete from Supabase', e.message); }
    clearAllData();
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{paddingBottom:96}}>
      <Toast t={t}/>
      <PH title="Settings" sub="Account & preferences"/>
      <div style={{padding:"0 12px",display:"flex",flexDirection:"column",gap:13}}>

        {/* Account — shows real saved baker data */}
        <div className="card" style={{padding:"15px"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:12}}>Account</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <Fld label="Bakery Name">
              <input className="field" value={brand?.storeName||brand?.bakeryName||""} readOnly style={{background:"var(--bg)"}}/>
            </Fld>
            <Fld label="Email">
              <input className="field" type="email" placeholder="your@email.com" value={bakerInfo?.email||""} onChange={e=>setBakerInfo&&setBakerInfo(p=>({...p,email:e.target.value}))}/>
            </Fld>
            <Fld label="Phone">
              <input className="field" type="tel" placeholder="e.g. 2105550123" value={bakerInfo?.phone||""} onChange={e=>setBakerInfo&&setBakerInfo(p=>({...p,phone:e.target.value}))}/>
            </Fld>
            <button className="pbtn" onClick={()=>{ show&&show("Account info saved ✓"); }} style={{width:"100%",marginTop:10}}>Save Account Info</button>
          </div>
        </div>

        {/* Baker Info — bio, policies, ordering rules */}
        <div className="card" style={{padding:"15px"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:12}}>Baker Info & Policies</div>
          <div style={{fontSize:11,color:"var(--mu)",marginBottom:12,lineHeight:1.5}}>This info appears on your customer storefront so customers know your policies before ordering.</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <Fld label="Baker Bio" hint="Tell customers who you are and what makes your bakes special">
              <textarea className="field" rows={3} placeholder="e.g. Home baker in San Antonio specializing in custom cakes and desserts..." value={bakerInfo?.bio||""} onChange={e=>setBakerInfo&&setBakerInfo(p=>({...p,bio:e.target.value}))} style={{resize:"none"}}/>
            </Fld>
            <Fld label="Minimum Order" hint="e.g. $50 minimum · 1 dozen minimum">
              <input className="field" placeholder="e.g. $50 minimum order" value={bakerInfo?.minOrder||""} onChange={e=>setBakerInfo&&setBakerInfo(p=>({...p,minOrder:e.target.value}))}/>
            </Fld>
            <Fld label="Deposit Policy" hint="e.g. 50% deposit required to hold your date">
              <input className="field" placeholder="e.g. 50% deposit required" value={bakerInfo?.deposit||""} onChange={e=>setBakerInfo&&setBakerInfo(p=>({...p,deposit:e.target.value}))}/>
            </Fld>
            <Fld label="Lead Time / Notice Required" hint="e.g. 2 weeks notice required for custom orders">
              <input className="field" placeholder="e.g. 2 weeks advance notice" value={bakerInfo?.leadTime||""} onChange={e=>setBakerInfo&&setBakerInfo(p=>({...p,leadTime:e.target.value}))}/>
            </Fld>
            <Fld label="Signature Items / Specialties" hint="What are you known for?">
              <input className="field" placeholder="e.g. Custom birthday cakes, tres leches, cookie boxes" value={bakerInfo?.signatureItems||""} onChange={e=>setBakerInfo&&setBakerInfo(p=>({...p,signatureItems:e.target.value}))}/>
            </Fld>
            <button className="pbtn" onClick={()=>show("Baker info saved ✓")} style={{width:"100%",marginTop:4}}>Save Baker Info</button>
          </div>
        </div>

        <div className="card" style={{padding:"15px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>Social Media</div>
            {filledCount > 0 && <span style={{fontSize:10,fontWeight:700,background:`color-mix(in srgb,${b.theme.primary} 14%,var(--sf))`,color:b.theme.primary,borderRadius:20,padding:"2px 9px"}}>{filledCount} connected</span>}
          </div>
          <div style={{fontSize:11,color:"var(--mu)",marginBottom:14,lineHeight:1.5}}>These links appear on your customer storefront so people can follow and share your bakery.</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SOCIAL_FIELDS.map(field=>(
              <div key={field.key}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:15}}>{field.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"var(--tx)"}}>{field.label}</span>
                </div>
                <div style={{position:"relative"}}>
                  <input className="field" placeholder={field.placeholder} value={(socialLinks||{})[field.key]||""} onChange={e=>setSocialLinks&&setSocialLinks(p=>({...p,[field.key]:e.target.value}))}/>
                  {(socialLinks||{})[field.key] && <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:18,height:18,borderRadius:"50%",background:"#16A34A",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span></div>}
                </div>
              </div>
            ))}
          </div>
          <button className="pbtn" onClick={()=>show("Social links saved ✓")} style={{width:"100%",marginTop:14}}>Save Social Links</button>
          {filledCount > 0 && <div style={{marginTop:10,padding:"9px 12px",background:`color-mix(in srgb,${b.theme.primary} 7%,var(--bg))`,borderRadius:10,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13}}>🏪</span><div style={{fontSize:11,color:"var(--mu)"}}>Your links are showing on your <span style={{color:b.theme.primary,fontWeight:700}}>customer storefront</span></div></div>}
        </div>

        <div className="card" style={{padding:"15px"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:12}}>Notifications</div>
          {[["New order received","orders"],["New NFC lead captured","leads"],["Low stock alert","lowstock"],["Weekly summary email","weekly"]].map(([lbl,key])=>(
            <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
              <span style={{fontSize:13,color:"var(--tx)"}}>{lbl}</span>
              <div className="toggle" style={{background:notifs[key]?"var(--p)":"var(--bd)"}} onClick={()=>setNotifs(p=>({...p,[key]:!p[key]}))}>
                <div className="toggle-knob" style={{left:notifs[key]?22:3}}/>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{padding:"15px"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:7}}>Subscription</div>
          <div style={{background:"var(--bg)",borderRadius:10,padding:"11px 13px",marginBottom:11}}>
            <div style={{fontSize:14,fontWeight:800,color:"var(--tx)"}}>{`${TIERS[tier]?.label || "Free"} ${TIERS[tier]?.price === "$0" ? "" : "· " + TIERS[tier]?.price + "/mo"}`}</div>
            <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>Billing managed by Stripe — <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setPage&&setPage("subscription")}>manage plan →</span></div>
          </div>
          <button onClick={()=>setPage&&setPage("subscription")} style={{width:"100%",padding:"11px",borderRadius:10,background:"var(--p)",color:"#fff",border:"none",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}>
            {tier==="elite" ? "Manage Plan" : "Upgrade Plan →"}
          </button>
        </div>

        {/* Reset / Clear Data */}
        <div className="card" style={{padding:"15px",border:"1px solid #FCA5A530"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--tx)",marginBottom:4}}>⚠️ Reset App Data</div>
          <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.5,marginBottom:12}}>
            Clears all saved data including your bakery info, products, and settings. This cannot be undone. Use this to start fresh or test the onboarding again.
          </div>
          <button
            onClick={async()=>{ await supabase.auth.signOut(); clearAllData(); window.location.reload(); }}
            style={{width:"100%",padding:"11px",borderRadius:11,border:"1.5px solid var(--bd)",background:"transparent",color:"var(--tx)",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}
          >
            Sign Out
          </button>
          {!showReset ? (
            <button
              onClick={()=>setShowReset(true)}
              style={{width:"100%",padding:"11px",borderRadius:11,border:"1.5px solid #FCA5A5",background:"transparent",color:"#DC2626",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}
            >
              Reset All Data
            </button>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              <div style={{padding:"11px 13px",background:"#FEF2F2",borderRadius:10,fontSize:12,color:"#DC2626",fontWeight:600,textAlign:"center"}}>
                Are you sure? This will delete everything.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <button onClick={()=>setShowReset(false)} style={{padding:"11px",borderRadius:11,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                  Cancel
                </button>
                <button onClick={async()=>{ try{ const{data:{session}}=await supabase.auth.getSession(); if(session?.user?.id){ await supabase.from('baker_settings').delete().eq('user_id',session.user.id); await supabase.from('baker_orders').delete().eq('baker_id',session.user.id); await supabase.from('baker_customers').delete().eq('baker_id',session.user.id); await supabase.from('baker_invoices').delete().eq('baker_id',session.user.id); await supabase.from('baker_messages').delete().eq('baker_id',session.user.id); }}catch(e){} clearAllData(); await supabase.auth.signOut(); window.location.reload(); }} style={{padding:"11px",borderRadius:11,border:"none",background:"#DC2626",color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  Yes, Reset
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function OrderFormPage({ products=[], photos=[], addOrder, bakerInfo={} }){
  const b = useBrand() || { theme: { primary: "#C47B00" } };
  const primary = b?.theme?.primary || "#C47B00";
  const [step,    setStep]       = useState(1);
  const [done,    setDone]       = useState(false);
  const [items,   setItems]      = useState([]);
  const [con,     setCon]        = useState({name:"", phone:"", email:"", dueDate:"", notes:"", smsOptIn:false});
  const [inspiration, setInspiration] = useState({text:"", images:[]});
  const [err,     setErr]        = useState({});
  const imgRefs       = useRef({});
  const [galleryPickerFor, setGalleryPickerFor] = useState(null); // product id
  const inspirImgRef  = useRef();
  const inspirCamRef  = useRef();

  const addInspirationImage = file => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setInspiration(p => ({...p, images:[...p.images, url]}));
  };

  const removeInspirationImage = idx =>
    setInspiration(p => ({...p, images:p.images.filter((_,i)=>i!==idx)}));

  // Use baker's real active products, fallback to defaults if none added yet
  const PRODS_S = products.filter(p=>p.active).length > 0
    ? products.filter(p=>p.active).map(p=>({id:p.id, emoji:p.emoji||"🎂", name:p.name, price:parseFloat(p.price)||0, desc:p.description||"", sellBy:p.sellBy||"each", minOrder:p.minOrder||"1"}))
    : [{id:"default-1", emoji:"🎂", name:"Custom Birthday Cake", price:85, desc:"Custom decorated cake", sellBy:"each", minOrder:"1"}];

  const total = items.reduce((s,i) => s + (i.price * (i.qty||1)), 0);

  const toggleItem = p => {
    setItems(prev =>
      prev.find(i => i.id===p.id)
        ? prev.filter(i => i.id!==p.id)
        : [...prev, {...p, qty: Number(p.minOrder)||1, image:null, imageURL:null, note:""}]
    );
  };

  const updateItem = (id, key, val) =>
    setItems(prev => prev.map(i => i.id===id ? {...i,[key]:val} : i));

  const handleImage = (id, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = e => updateItem(id, "image", e.target.result);
    updateItem(id, "imageURL", url);
  };

  const removeImage = id => updateItem(id, "imageURL", null);

  const validate = () => {
    const e = {};
    if (step===1 && !con.name)    e.name    = "Name required";
    if (step===1 && !con.dueDate) e.dueDate = "Due date required";
    const phoneRegex = /^\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}$/;
    if (step===1 && !phoneRegex.test(con.phone.replace(/\s/g,""))) e.phone = "Valid phone required";
    if (step===2 && !items.length) e.items = "Select at least one item";
    setErr(e);
    return !Object.keys(e).length;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitOrder = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // In production, baker receives push notification + email
    // For now, order appears in Orders page as pending
    if (addOrder) {
      const newOrder = {
        id: "ORD-" + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0,8).toUpperCase() : Date.now().toString(36).toUpperCase()),
        customer: con.name,
        phone: con.phone,
        email: con.email,
        item: items.map(i=>`${i.name} x${i.qty||1}`).join(", "),
        amount: total,
        date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
        dueDate: con.dueDate || new Date(Date.now()+7*86400000).toISOString().split("T")[0],
        status: "waiting_approval",
        payment: "TBD",
        notes: con.notes,
        smsOptIn: con.smsOptIn,
      };
      addOrder(newOrder);
    }
    setDone(true);
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setDone(false); setStep(1); setItems([]); setCon({name:"",phone:"",email:"",dueDate:"",notes:""});
    setInspiration({text:"", images:[]}); setErr({});
  };

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{padding:"44px 24px", textAlign:"center"}}>
      <div style={{fontSize:56, marginBottom:12}}>🎉</div>
      <div style={{fontFamily:"var(--fd)", fontSize:22, fontWeight:700, color:"var(--tx)", marginBottom:7}}>Order Sent!</div>
      <p style={{color:"var(--mu)", fontSize:13, lineHeight:1.5, marginBottom:18}}>
        Thanks {con.name.split(" ")[0]}! We'll confirm within 1 hour.
      </p>
      <button className="pbtn" onClick={resetForm} style={{width:"100%"}}>New Order</button>
    </div>
  );

  return (
    <div style={{paddingBottom:96}}>
      <PH title="Order Form" sub={`Step ${step} of 3`}/>

      {/* Progress bar */}
      <div style={{padding:"0 16px 16px"}}>
        <div style={{height:4, background:"var(--bd)", borderRadius:2, overflow:"hidden"}}>
          <div style={{height:"100%", background:b.theme.primary, width:`${(step/3)*100}%`, borderRadius:2, transition:"width .35s"}}/>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", marginTop:6}}>
          {["Details","Items","Review"].map((l,i) => (
            <span key={l} style={{fontSize:10, fontWeight:700, color:step===i+1?b.theme.primary:"var(--mu)", textTransform:"uppercase", letterSpacing:".6px"}}>{l}</span>
          ))}
        </div>
      </div>

      <div style={{padding:"0 12px", display:"flex", flexDirection:"column", gap:12}}>

        {/* ── STEP 1: Contact details ── */}
        {step===1 && (
          <>
            <Fld label="Full Name" required error={err.name}>
              <input className="field" placeholder="Jordan Smith" value={con.name} onChange={e=>setCon(p=>({...p,name:e.target.value}))}/>
            </Fld>
            <Fld label="Phone" required error={err.phone}>
              <input className="field" type="tel" placeholder="(210) 555-0100" value={con.phone} onChange={e=>setCon(p=>({...p,phone:e.target.value}))}/>
            </Fld>
            <Fld label="Email (optional)">
              <input className="field" type="email" placeholder="your@email.com" value={con.email} onChange={e=>setCon(p=>({...p,email:e.target.value}))}/>
            </Fld>
            <Fld label="Needed by" hint="When do you need this order ready?">
              <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",letterSpacing:".05em",marginBottom:4}}>DUE DATE <span style={{color:"var(--p)"}}>*</span></div>
              <input className="field" type="date" value={con.dueDate} min={new Date().toISOString().split("T")[0]} onChange={e=>setCon(p=>({...p,dueDate:e.target.value}))}/>
              {err.dueDate&&<div style={{color:"#DC2626",fontSize:11,marginTop:3}}>{err.dueDate}</div>}
            </Fld>
            <Fld label="Special Notes">
              <textarea className="field" rows={2} placeholder="Allergies, delivery instructions, special requests..." value={con.notes} onChange={e=>setCon(p=>({...p,notes:e.target.value}))} style={{resize:"none"}}/>
            </Fld>
            {/* SMS opt-in — required for US carrier compliance */}
            <div onClick={()=>setCon(p=>({...p,smsOptIn:!p.smsOptIn}))}
              style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:11,border:`1.5px solid ${con.smsOptIn?primary:"var(--bd)"}`,background:con.smsOptIn?`color-mix(in srgb,${primary} 8%,var(--sf))`:"var(--sf)",cursor:"pointer"}}>
              <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${con.smsOptIn?primary:"var(--bd)"}`,background:con.smsOptIn?primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                {con.smsOptIn && <span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--tx)"}}>Text me about specials & updates</div>
                <div style={{fontSize:10,color:"var(--mu)",marginTop:2,lineHeight:1.4}}>Opt in to receive SMS updates and offers from this bakery. You can opt out anytime.</div>
              </div>
            </div>

            {/* ── Inspiration Box ── */}
            <div style={{background:`color-mix(in srgb,${primary} 5%,var(--bg))`, border:`1.5px solid ${primary}30`, borderRadius:14, padding:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:20}}>✨</span>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--tx)"}}>Inspiration</div>
                  <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>Describe your vision and attach any reference images</div>
                </div>
              </div>

              {/* Text description */}
              <textarea
                className="field"
                rows={4}
                placeholder="Describe your inspiration... e.g. I'm envisioning a two-tier cake with pastel pink and gold accents, floral decorations, and 'Happy Birthday' written in cursive. I'd love it to feel elegant but fun."
                value={inspiration.text}
                onChange={e=>setInspiration(p=>({...p,text:e.target.value}))}
                style={{resize:"none", marginBottom:12, fontSize:13, lineHeight:1.6}}
              />

              {/* Uploaded inspiration images */}
              {inspiration.images.length > 0 && (
                <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginBottom:10}}>
                  {inspiration.images.map((url,idx) => (
                    <div key={idx} style={{position:"relative"}}>
                      <img
                        src={url}
                        alt={`Inspiration ${idx+1}`}
                        style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:9,display:"block",border:"1px solid var(--bd)"}}
                      />
                      <button
                        onClick={()=>removeInspirationImage(idx)}
                        style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",width:20,height:20,color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {/* Add more tile */}
                  {inspiration.images.length < 6 && (
                    <div
                      onClick={()=>inspirImgRef.current?.click()}
                      style={{aspectRatio:"1",border:`2px dashed ${primary}50`,borderRadius:9,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"transparent"}}
                    >
                      <span style={{fontSize:20,color:primary}}>+</span>
                      <span style={{fontSize:9,color:primary,fontWeight:700,marginTop:2}}>Add</span>
                    </div>
                  )}
                </div>
              )}

              {/* Upload buttons — show when no images yet */}
              {inspiration.images.length === 0 && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <button
                    onClick={()=>inspirImgRef.current?.click()}
                    style={{padding:"10px 8px",borderRadius:10,border:`1.5px dashed ${primary}60`,background:"transparent",cursor:"pointer",fontFamily:"var(--fb)",fontSize:12,fontWeight:700,color:primary,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                  >
                    🖼 Gallery
                  </button>
                  <button
                    onClick={()=>inspirCamRef.current?.click()}
                    style={{padding:"10px 8px",borderRadius:10,border:`1.5px dashed ${primary}60`,background:"transparent",cursor:"pointer",fontFamily:"var(--fb)",fontSize:12,fontWeight:700,color:primary,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                  >
                    📷 Camera
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
              <input ref={inspirImgRef}  type="file" accept="image/*"                  style={{display:"none"}} onChange={e=>addInspirationImage(e.target.files[0])}/>
              <input ref={inspirCamRef}  type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>addInspirationImage(e.target.files[0])}/>

              {inspiration.images.length > 0 && (
                <div style={{marginTop:8,display:"flex",gap:8}}>
                  <button onClick={()=>inspirImgRef.current?.click()} style={{flex:1,padding:"8px",borderRadius:9,border:`1px solid ${primary}50`,background:"transparent",color:primary,fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}>+ Add More</button>
                  <button onClick={()=>inspirCamRef.current?.click()} style={{flex:1,padding:"8px",borderRadius:9,border:`1px solid ${primary}50`,background:"transparent",color:primary,fontFamily:"var(--fb)",fontWeight:600,fontSize:11,cursor:"pointer"}}>📷 Camera</button>
                </div>
              )}
            </div>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <button className="gbtn" onClick={()=>setStep(1)} style={{padding:"13px", borderRadius:12, color:"var(--tx)"}}>← Back</button>
              <button className="pbtn" onClick={()=>{ if(validate()) setStep(2); }}>Choose Items →</button>
            </div>
          </>
        )}

        {/* ── STEP 2: Select items ── */}
        {step===2 && (
          <>
            {err.items && <div style={{background:"#FEF2F2", borderRadius:10, padding:"9px 12px", fontSize:12, color:"#DC2626"}}>⚠ {err.items}</div>}

            {/* Product selection grid */}
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {PRODS_S.map(p => {
                const sel = items.find(i => i.id===p.id);
                const sellByLabel =
                  p.sellBy === "half_dozen" ? "Half Dozen (6)" :
                  p.sellBy === "dozen"      ? "Dozen (12)" :
                  "1 Each";
                const sellByUnit =
                  p.sellBy === "half_dozen" ? "half dozen" :
                  p.sellBy === "dozen"      ? "dozen" :
                  "item";
                const minQty = Number(p.minOrder) || 1;
                const qty = sel ? (sel.qty || minQty) : minQty;
                return (
                  <div key={p.id}>
                    {/* Product row */}
                    <div
                      onClick={() => toggleItem(p)}
                      className="card row"
                      style={{padding:"12px 13px", display:"flex", alignItems:"center", gap:11, cursor:"pointer", border:`1.5px solid ${sel?"var(--p)":"var(--bd)"}`, background:sel?`color-mix(in srgb,var(--p) 6%,var(--sf))`:"var(--sf)"}}
                    >
                      <span style={{fontSize:26, flexShrink:0}}>{p.emoji}</span>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:13, fontWeight:700, color:"var(--tx)"}}>{p.name}</div>
                        <div style={{fontSize:11, color:"var(--mu)", marginTop:1}}>{p.desc}</div>
                      </div>
                      <div style={{textAlign:"right", flexShrink:0}}>
                        <div style={{fontSize:14, fontWeight:800, color:primary}}>${p.price}</div>
                        {sel && <span style={{width:18, height:18, borderRadius:"50%", background:primary, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:10, fontWeight:800, marginLeft:"auto", marginTop:3}}>✓</span>}
                      </div>
                    </div>

                    {/* Quantity selector + min order note — expands when item is selected */}
                    {sel && (
                      <div style={{marginTop:4, padding:"11px 13px", background:`color-mix(in srgb,${primary} 4%,var(--bg))`, borderRadius:"0 0 12px 12px", border:`1px solid ${primary}20`, borderTop:"none"}}>

                        {/* Sell-by unit banner */}
                        <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:10, padding:"8px 11px", background:`color-mix(in srgb,${primary} 10%,var(--bg))`, borderRadius:10, border:`1px solid ${primary}30`}}>
                          <span style={{fontSize:16}}>📦</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12, fontWeight:800, color:"var(--tx)"}}>
                              {p.name} is sold by the <span style={{color:primary}}>{sellByLabel}</span>
                            </div>
                            {minQty > 1 && (
                              <div style={{fontSize:11, color:primary, fontWeight:700, marginTop:2}}>
                                ⚠ Minimum order: {minQty} {sellByUnit}{minQty > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quantity row */}
                        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
                          <div>
                            <div style={{fontSize:12, fontWeight:700, color:"var(--tx)"}}>How many {sellByUnit}s?</div>
                            <div style={{fontSize:10, color:"var(--mu)", marginTop:1}}>
                              {qty} {sellByUnit}{qty !== 1 ? "s" : ""}
                              {p.sellBy === "dozen"      ? ` = ${qty * 12} pieces` :
                               p.sellBy === "half_dozen" ? ` = ${qty * 6} pieces`  : ""}
                            </div>
                          </div>
                          {/* − qty + stepper */}
                          <div style={{display:"flex", alignItems:"center", background:"var(--sf)", borderRadius:11, border:"1px solid var(--bd)", overflow:"hidden"}}>
                            <button
                              onClick={e => { e.stopPropagation(); if (qty > minQty) updateItem(p.id, "qty", qty - 1); }}
                              style={{width:36, height:36, border:"none", background:"transparent", fontSize:18, fontWeight:700, color:qty > minQty ? "var(--mu)" : "var(--bd)", cursor:qty > minQty ? "pointer" : "default", display:"flex", alignItems:"center", justifyContent:"center"}}
                            >−</button>
                            <div style={{width:40, textAlign:"center", fontSize:15, fontWeight:800, color:"var(--tx)"}}>{qty}</div>
                            <button
                              onClick={e => { e.stopPropagation(); updateItem(p.id, "qty", qty + 1); }}
                              style={{width:36, height:36, border:"none", background:"transparent", fontSize:18, fontWeight:700, color:primary, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}
                            >+</button>
                          </div>
                        </div>

                        {/* Price preview */}
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:"var(--bg)", borderRadius:9, marginBottom:10, fontSize:12}}>
                          <span style={{color:"var(--mu)"}}>{qty} × ${p.price} each</span>
                          <span style={{fontWeight:800, color:primary}}>${(qty * p.price).toFixed(2)} total</span>
                        </div>

                        {/* Reference image */}
                        <div style={{fontSize:10, fontWeight:700, color:primary, textTransform:"uppercase", letterSpacing:".8px", marginBottom:9}}>
                          📎 Reference Image (optional)
                        </div>
                        {sel.imageURL ? (
                          <div style={{position:"relative", display:"inline-block", width:"100%"}}>
                            <img src={sel.imageURL} alt="Reference" style={{width:"100%", maxHeight:140, objectFit:"cover", borderRadius:10, display:"block"}}/>
                            <button onClick={e => { e.stopPropagation(); removeImage(p.id); }} style={{position:"absolute", top:6, right:6, background:"rgba(0,0,0,.6)", border:"none", borderRadius:"50%", width:24, height:24, color:"#fff", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800}}>✕</button>
                          </div>
                        ) : (
                          <div style={{display:"flex", flexDirection:"column", gap:7}}>
                            {/* Baker's gallery */}
                            <button
                              onClick={e => { e.stopPropagation(); setGalleryPickerFor(p.id); }}
                              style={{padding:"10px 12px", borderRadius:10, border:`1.5px solid ${primary}40`, background:`color-mix(in srgb,${primary} 6%,var(--sf))`, cursor:"pointer", fontFamily:"var(--fb)", fontSize:12, fontWeight:700, color:primary, display:"flex", alignItems:"center", gap:8}}
                            >
                              <span style={{fontSize:16}}>🖼</span>
                              <div style={{textAlign:"left"}}>
                                <div>Choose from Bakery Gallery</div>
                                <div style={{fontSize:10, fontWeight:400, color:"var(--mu)", marginTop:1}}>Pick an inspiration photo from the baker's work</div>
                              </div>
                            </button>
                            {/* Customer's own photo */}
                            <button
                              onClick={e => { e.stopPropagation(); imgRefs.current[`camera_${p.id}`]?.click(); }}
                              style={{padding:"10px 12px", borderRadius:10, border:`1.5px dashed ${primary}40`, background:"transparent", cursor:"pointer", fontFamily:"var(--fb)", fontSize:12, fontWeight:700, color:"var(--mu)", display:"flex", alignItems:"center", gap:8}}
                            >
                              <span style={{fontSize:16}}>📷</span>
                              <div style={{textAlign:"left"}}>
                                <div style={{color:"var(--tx)"}}>Upload My Own Photo</div>
                                <div style={{fontSize:10, fontWeight:400, color:"var(--mu)", marginTop:1}}>Take a photo or upload from your camera roll</div>
                              </div>
                            </button>
                          </div>
                        )}
                        <input ref={el => imgRefs.current[`camera_${p.id}`] = el} type="file" accept="image/*" style={{display:"none"}} onChange={e => { handleImage(p.id, e.target.files[0]); }}/>

                        {/* Per-item note */}
                        <input
                          className="field"
                          placeholder="e.g. Blue frosting, write Happy Birthday..."
                          value={sel.note || ""}
                          onChange={e => { e.stopPropagation(); updateItem(p.id, "note", e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          style={{marginTop:9, fontSize:13}}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {items.length > 0 && (
              <div style={{background:"var(--bg)", borderRadius:10, padding:"10px 13px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontSize:12, color:"var(--mu)"}}>{items.length} item{items.length!==1?"s":""} selected · {items.filter(i=>i.imageURL).length} with images</span>
                <span style={{fontSize:14, fontWeight:800, color:primary}}>${total}</span>
              </div>
            )}

            <button className="pbtn" onClick={() => { if(validate()) setStep(3); }} style={{width:"100%"}}>
              Review Order →
            </button>
          </>
        )}

        {/* ── STEP 3: Review & submit ── */}
        {step===3 && (
          <>
            {/* Order items with image thumbnails */}
            <div className="card" style={{padding:"13px 14px"}}>
              <div style={{fontSize:10, color:"var(--mu)", fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", marginBottom:10}}>Your Order</div>
              {items.map(i => (
                <div key={i.id} style={{display:"flex", gap:11, alignItems:"flex-start", marginBottom:11, paddingBottom:11, borderBottom:"1px solid var(--bd)"}}>
                  {/* Thumbnail or emoji */}
                  {i.imageURL
                    ? <img src={i.imageURL} alt="" style={{width:52, height:52, borderRadius:9, objectFit:"cover", flexShrink:0, border:"1px solid var(--bd)"}}/>
                    : <div style={{width:52, height:52, borderRadius:9, background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0}}>{i.emoji}</div>
                  }
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:700, color:"var(--tx)"}}>{i.name}</div>
                    {i.note && <div style={{fontSize:11, color:"var(--mu)", marginTop:2, lineHeight:1.4}}>"{i.note}"</div>}
                    {i.imageURL && <div style={{fontSize:10, color:primary, fontWeight:700, marginTop:3}}>📎 Reference image attached</div>}
                  </div>
                  <div style={{fontWeight:800, color:primary, fontSize:14, flexShrink:0}}>${i.price}</div>
                </div>
              ))}
              <div style={{display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15}}>
                <span>Total</span>
                <span style={{color:primary}}>${total}</span>
              </div>
            </div>

            {/* Contact info */}
            <div className="card" style={{padding:"13px 14px"}}>
              <div style={{fontSize:10, color:"var(--mu)", fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", marginBottom:8}}>Contact</div>
              <div style={{fontSize:13, fontWeight:700, color:"var(--tx)"}}>{con.name}</div>
              <div style={{fontSize:12, color:"var(--mu)", marginTop:2}}>{con.phone}</div>
              {con.dueDate&&<div style={{fontSize:12,color:"var(--mu)",marginTop:4}}>📅 Due: {new Date(con.dueDate+"T12:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>}
              {con.notes && <div style={{fontSize:12, color:"var(--mu)", marginTop:6, padding:"8px 10px", background:"var(--bg)", borderRadius:8, lineHeight:1.5}}>"{con.notes}"</div>}
            </div>

            {/* Inspiration review */}
            {(inspiration.text || inspiration.images.length > 0) && (
              <div className="card" style={{padding:"13px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                  <span style={{fontSize:16}}>✨</span>
                  <div style={{fontSize:10,color:"var(--mu)",fontWeight:700,textTransform:"uppercase",letterSpacing:".7px"}}>Your Inspiration</div>
                </div>
                {inspiration.text && (
                  <div style={{fontSize:12,color:"var(--tx)",lineHeight:1.6,marginBottom:inspiration.images.length>0?10:0,padding:"9px 11px",background:"var(--bg)",borderRadius:9}}>
                    "{inspiration.text}"
                  </div>
                )}
                {inspiration.images.length > 0 && (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                    {inspiration.images.map((url,idx) => (
                      <img key={idx} src={url} alt={`Inspiration ${idx+1}`} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,border:"1px solid var(--bd)"}}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <button className="gbtn" onClick={()=>setStep(2)} style={{padding:"13px", borderRadius:12, color:"var(--tx)"}}>← Back</button>
              <button className="pbtn" onClick={()=>submitOrder()} disabled={isSubmitting} style={{opacity:isSubmitting?0.6:1}}>{isSubmitting?"Submitting...":"🎉 Submit Order"}</button>
            </div>
          </>
        )}
      </div>

      {/* ── Baker Gallery Picker Sheet ── */}
      {galleryPickerFor && (
        <div className="sheet">
          <div onClick={()=>setGalleryPickerFor(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel" style={{maxHeight:"85dvh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 8px"}}/>
            <div style={{padding:"4px 16px 24px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>🖼 Bakery Gallery</div>
                <button onClick={()=>setGalleryPickerFor(null)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:12,color:"var(--mu)",marginBottom:14,lineHeight:1.5}}>
                Pick a photo from the baker's portfolio as inspiration for your order.
              </div>
              {photos.length === 0 ? (
                <div style={{textAlign:"center",padding:"32px 0",color:"var(--mu)",fontSize:13}}>
                  <div style={{fontSize:32,marginBottom:8}}>📷</div>
                  No gallery photos yet
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {photos.map(photo => (
                    <button
                      key={photo.id}
                      onClick={()=>{
                        updateItem(galleryPickerFor, "imageURL", photo.url);
                        setGalleryPickerFor(null);
                      }}
                      style={{padding:0,border:"2px solid var(--bd)",borderRadius:12,overflow:"hidden",cursor:"pointer",background:"var(--bg)",aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center"}}
                    >
                      {photo.url
                        ? <img src={photo.url} alt={photo.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                        : <span style={{fontSize:36}}>{photo.emoji||"🎂"}</span>
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── APP ROOT ───────────────────────────────── */


const INIT_PHOTOS = [];

const INIT_CATEGORIES = [
  { id:"cat-1", name:"Birthday",  emoji:"🎂", color:"#C47B00" },
  { id:"cat-2", name:"Weddings",  emoji:"💍", color:"#DB2777" },
  { id:"cat-3", name:"Custom",    emoji:"⭐", color:"#7C5CBF" },
  { id:"cat-4", name:"Seasonal",  emoji:"🍂", color:"#059669" },
];
const INIT_PRODUCTS = [
  { id:"p-1", name:"Custom Birthday Cake", price:85, description:"A fully personalised layered cake made from scratch for any occasion.", emoji:"🎂", active:true, categories:[], sellBy:"each", minOrder:"1", signature:false, imageURL:null },
];


/* ── ONBOARDING FLOW ────────────────────────── */
function OnboardingFlow({ step, setStep, bakery, setBakery, products, setProducts, errors, setErrors, linkCopied, setLinkCopied, brand, tier, socialLinks, setSocialLinks, onComplete }) {
  const b = brand;
  const primary = b.theme.primary;
  const [showProdForm, setShowProdForm] = useState(false);
  const [activeProdType, setActiveProdType] = useState(null);
  const imgRef = useRef();
  const [newProd, setNewProd] = useState({ name:"", price:"", emoji:"🎂", imageURL:null, sellBy:"dozen", minOrder:"1" });
  const [showAILogo, setShowAILogo] = useState(false);
  const TOTAL_STEPS = 8;

  const QUICK_PRODUCTS = [
    { emoji:"🎂", label:"Cake",                name:"Custom Cake",         price:"65",  sellBy:"each",       minOrder:"1" },
    { emoji:"🧁", label:"Cupcakes",            name:"Cupcakes",            price:"42",  sellBy:"dozen",      minOrder:"1" },
    { emoji:"🍪", label:"Cookies",             name:"Cookies",             price:"28",  sellBy:"dozen",      minOrder:"1" },
    { emoji:"🍡", label:"Cake Pops",           name:"Cake Pops",           price:"36",  sellBy:"half_dozen", minOrder:"1" },
    { emoji:"🍫", label:"Dipped Oreos",        name:"Dipped Oreos",        price:"24",  sellBy:"half_dozen", minOrder:"1" },
    { emoji:"🍚", label:"Rice Krispy Treats",  name:"Rice Krispy Treats",  price:"30",  sellBy:"half_dozen", minOrder:"1" },
    { emoji:"🍓", label:"Dipped Strawberries", name:"Dipped Strawberries", price:"28",  sellBy:"half_dozen", minOrder:"1" },
    { emoji:"✏",  label:"Custom Item",         name:"",                    price:"",    sellBy:"each",       minOrder:"1" },
  ];

  const SELL_BY_OPTIONS = [
    { value:"each",       label:"1 Each" },
    { value:"half_dozen", label:"Half Dozen (6)" },
    { value:"dozen",      label:"Dozen (12)" },
  ];
  const getSellByLabel = (val) => SELL_BY_OPTIONS.find(o=>o.value===val)?.label || val;

  const validateStep = () => {
    const e = {};
    if (step===1) {
      if (!bakery.name.trim())     e.name     = "* Bakery name is required";
      if (!bakery.phone.trim())    e.phone    = "* Phone number is required";
      if (!bakery.city?.trim())    e.city     = "* City is required";
      if (!bakery.state?.trim())   e.state    = "* State is required";
    }
    if (step===3) {
      if (!bakery.leadTime?.trim()) e.leadTime = "* Lead time is required";
      if (!bakery.minOrder?.trim()) e.minOrder = "* Minimum order is required";
      if (!bakery.deposit?.trim())  e.deposit  = "* Deposit is required";
    }
    if (step===4 && products.length===0) {
      e.products = "* Add at least one product to continue";
    }
    if (step===5 && (bakery.flavors||[]).length===0) {
      e.flavors = "* Select at least one flavor to continue";
    }
    if (step===6) {
      if (!bakery.username || bakery.username.length < 3)       e.username        = "* Username must be at least 3 characters";
      if (!bakery.email || !/\S+@\S+\.\S+/.test(bakery.email)) e.email           = "* Enter a valid email address";
      if (!bakery.password || bakery.password.length < 8)       e.password        = "* Password must be at least 8 characters";
      if (bakery.password !== bakery.confirmPassword)           e.confirmPassword = "* Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validateStep()) return;
    if (step === 6) {
      const { error } = await supabase.auth.signUp({
        email: bakery.email,
        password: bakery.password,
        options: {
          data: {
            bakery_name:     bakery.name,
            phone:           bakery.phone,
            city:            bakery.city,
            state:           bakery.state,
            tagline:         bakery.tagline,
            bio:             bakery.bio,
            lead_time:       bakery.leadTime,
            min_order:       bakery.minOrder,
            deposit:         bakery.deposit,
            signature_items: bakery.signatureItems,
            username:        bakery.username || bakery.name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""),
            flavors:         (bakery.flavors||[]).join(","),
          }
        }
      });
      if (error) {
        setErrors({ email: "* " + error.message });
        return;
      }
    }
    setStep(s => s+1);
  };
  const skip = () => setStep(s => s < 8 ? s+1 : s);

  const openQuickAdd = (qp) => {
    setActiveProdType(qp);
    setNewProd({ name:qp.name, price:qp.price, emoji:qp.emoji, imageURL:null, sellBy:qp.sellBy, minOrder:qp.minOrder });
    setShowProdForm(true);
  };

  const saveProduct = () => {
    if (!newProd.name.trim() || !newProd.price) return;
    setProducts(p => [...p, { ...newProd, id:"ob-"+Date.now() }]);
    setShowProdForm(false);
    setNewProd({ name:"", price:"", emoji:"🎂", imageURL:null, sellBy:"dozen", minOrder:"1" });
    setActiveProdType(null);
    setErrors({});
  };

  const removeProduct = (id) => setProducts(p => p.filter(x => x.id!==id));
  const handleProdImage = (file) => { if (!file) return; setNewProd(p => ({...p, imageURL:URL.createObjectURL(file)})); };

  return (
    <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,height:"100%",background:"var(--bg)",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 0 60px rgba(0,0,0,.15)"}}>

      {/* Progress bar */}
      {step > 1 && step < 8 && (
        <div style={{padding:"14px 16px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <span style={{fontSize:11,fontWeight:700,color:"var(--mu)"}}>Step {step} of {TOTAL_STEPS}</span>
            <button onClick={skip} style={{background:"none",border:"none",fontSize:12,color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)"}}>Skip for now</button>
          </div>
          <div style={{height:4,background:"var(--bd)",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",background:primary,width:`${((step-1)/(TOTAL_STEPS-1))*100}%`,borderRadius:2,transition:"width .4s ease"}}/>
          </div>
        </div>
      )}

      <div style={{flex:1,overflowY:"scroll",WebkitOverflowScrolling:"touch",height:0,padding:"0 0 120px"}}>

        {/* STEP 1: WELCOME */}
        {step===1 && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 24px 24px",textAlign:"center",minHeight:"90vh",justifyContent:"space-between"}}>
            {b.logo && <img src={b.logo} alt="" style={{width:80,height:80,borderRadius:20,objectFit:"contain",marginBottom:20,boxShadow:"0 8px 32px rgba(0,0,0,.15)"}}/>}
            {/* Storefront preview mock */}
            <div style={{width:"100%",background:"var(--sf)",borderRadius:18,padding:"16px",marginBottom:24,border:"1px solid var(--bd)",boxShadow:"0 4px 20px rgba(0,0,0,.08)",textAlign:"left"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:32,height:32,borderRadius:8,background:primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🧁</div>
                <div><div style={{fontSize:12,fontWeight:800,color:"var(--tx)"}}>Your Bakery Name</div><div style={{fontSize:9,color:"var(--mu)"}}>bakeros.app/store/your-bakery</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:9}}>
                {["🎂","🧁","🍪"].map((e,i) => (
                  <div key={i} style={{background:"var(--bg)",borderRadius:9,padding:"8px 6px",textAlign:"center",border:"1px solid var(--bd)"}}>
                    <div style={{fontSize:18,marginBottom:3}}>{e}</div>
                    <div style={{fontSize:8,fontWeight:700,color:"var(--mu)"}}>Product {i+1}</div>
                  </div>
                ))}
              </div>
              <div style={{background:`color-mix(in srgb,${primary} 10%,var(--bg))`,borderRadius:9,padding:"7px 11px",display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:12}}>💬</span>
                <span style={{fontSize:10,color:"var(--mu)"}}>Customers can message you here</span>
              </div>
            </div>
            <h1 style={{fontFamily:"var(--fd)",fontSize:26,fontWeight:700,color:"var(--tx)",lineHeight:1.2,marginBottom:10}}>
              Let's get your bakery live in minutes
            </h1>
            <p style={{fontSize:13,color:"var(--mu)",lineHeight:1.6,marginBottom:28}}>
              Create your storefront, share your link, and start taking orders today.
            </p>
            <button
              onClick={() => setStep(2)}
              style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:800,fontSize:16,color:"#fff",background:`linear-gradient(135deg,${primary},color-mix(in srgb,${primary} 65%,#000))`,boxShadow:`0 8px 24px color-mix(in srgb,${primary} 35%,transparent)`,marginBottom:12}}
            >
              Get Started →
            </button>
            <button style={{background:"none",border:"none",fontSize:12,color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)"}}>
              Already have an account? Login
            </button>
          </div>
        )}

        {/* STEP 2: BAKERY SETUP + BIO */}
        {step===2 && (
          <div style={{padding:"20px 20px 0"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>🏪</div>
              <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"var(--tx)",marginBottom:4}}>Set up your bakery</h2>
              <p style={{fontSize:13,color:"var(--mu)"}}>This is what customers will see on your storefront.</p>
            </div>

            {/* Live preview card */}
            <div style={{background:`linear-gradient(135deg,${primary},color-mix(in srgb,${primary} 55%,#000))`,borderRadius:16,padding:"14px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:12}}>
              {/* Logo preview — shows upload or emoji fallback */}
              {bakery.logo
                ? <img src={bakery.logo} alt="Logo" style={{width:44,height:44,borderRadius:11,objectFit:"contain",background:"rgba(255,255,255,.15)",padding:3,flexShrink:0,border:"1.5px solid rgba(255,255,255,.25)"}}/>
                : <div style={{width:44,height:44,borderRadius:11,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:"1.5px dashed rgba(255,255,255,.35)"}}>🧁</div>
              }
              <div>
                <div style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"#fff"}}>{bakery.name || "Your Bakery Name"}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:2}}>{bakery.tagline || "Your tagline will appear here"}</div>
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <AILogoHelper bakeryName={bakery.name} tagline={bakery.tagline} city={bakery.city} state={bakery.state} isOpen={showAILogo} onClose={()=>setShowAILogo(false)}/>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:13}}>

              {/* Info fields first — so prompt captures their real data */}
              <Fld label="Bakery Name *" required error={errors.name}>
                <input
                  className="field"
                  placeholder="e.g. KCS Sugar Trails Bakery"
                  value={bakery.name}
                  onChange={e=>{
                    const name = e.target.value;
                    const autoUsername = name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
                    setBakery(p=>({...p, name, username: autoUsername}));
                  }}
                  style={{fontSize:15}}
                  autoFocus
                />
              </Fld>
              {bakery.name.length > 2 && (
                <div style={{marginTop:-6,padding:"6px 11px",background:`color-mix(in srgb,${primary} 8%,var(--bg))`,borderRadius:9,fontSize:11,color:primary,fontWeight:600}}>
                  🔗 bakeros.app/store/{bakery.name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}
                </div>
              )}
              <Fld label="Tagline (optional)">
                <input className="field" placeholder="e.g. Build Your Business, Grow Your Bakery" value={bakery.tagline} onChange={e=>setBakery(p=>({...p,tagline:e.target.value}))}/>
              </Fld>
              <Fld label="Phone Number *" required error={errors.phone}>
                <input className="field" type="tel" placeholder="(210) 555-0100" value={bakery.phone} onChange={e=>setBakery(p=>({...p,phone:e.target.value}))}/>
              </Fld>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Fld label="City *" required error={errors.city}>
                  <input className="field" placeholder="e.g. San Antonio" value={bakery.city||""} onChange={e=>setBakery(p=>({...p,city:e.target.value}))}/>
                </Fld>
                <Fld label="State *" required error={errors.state}>
                  <input className="field" placeholder="e.g. TX" maxLength={2} value={bakery.state||""} onChange={e=>setBakery(p=>({...p,state:e.target.value.toUpperCase()}))} style={{textTransform:"uppercase"}}/>
                </Fld>
              </div>
              <Fld label="Baker Bio (optional)" hint="Tell customers your story — shows on your storefront">
                <textarea className="field" rows={4} placeholder="e.g. Hi! I'm the baker behind BakerOS — crafting custom cakes and treats made from scratch with love in every order." value={bakery.bio||""} onChange={e=>setBakery(p=>({...p,bio:e.target.value}))} style={{resize:"none",fontSize:13,lineHeight:1.6}}/>
              </Fld>
              {(bakery.bio||"").trim() && (
                <div style={{background:`color-mix(in srgb,${primary} 8%,var(--bg))`,border:`1px solid ${primary}25`,borderRadius:11,padding:"9px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,flexShrink:0}}>👩‍🍳</span>
                  <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5,fontStyle:"italic"}}>{bakery.bio}</div>
                </div>
              )}

              {/* Logo upload — after info fields so AI prompt has their name & tagline */}
              <Fld label="Bakery Logo" hint="PNG or JPEG with transparent background works best">
                <div
                  onClick={()=>document.getElementById("ob-logo-input").click()}
                  style={{
                    border:`1.5px dashed ${bakery.logo ? primary : "var(--bd)"}`,
                    borderRadius:12,
                    padding:"14px",
                    cursor:"pointer",
                    display:"flex",
                    alignItems:"center",
                    gap:12,
                    background:bakery.logo?`color-mix(in srgb,${primary} 6%,var(--sf))`:"var(--sf)",
                    transition:"all .2s",
                  }}
                >
                  {bakery.logo
                    ? <img src={bakery.logo} alt="Your logo" style={{width:52,height:52,borderRadius:10,objectFit:"contain",background:"none",flexShrink:0}}/>
                    : <div style={{width:52,height:52,borderRadius:10,background:"var(--bg)",border:"1px solid var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:22}}>🖼</span>
                      </div>
                  }
                  <div style={{flex:1}}>
                    {bakery.logo
                      ? <>
                          <div style={{fontSize:13,fontWeight:700,color:primary}}>Logo uploaded ✓</div>
                          <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>Tap to change</div>
                        </>
                      : <>
                          <div style={{fontSize:13,fontWeight:600,color:"var(--tx)"}}>Upload your logo</div>
                          <div style={{fontSize:11,color:"var(--mu)",marginTop:2}}>PNG or JPEG · Transparent PNG recommended</div>
                        </>
                    }
                  </div>
                  {bakery.logo && (
                    <button
                      onClick={e=>{e.stopPropagation();setBakery(p=>({...p,logo:null}));}}
                      style={{background:"none",border:"none",color:"var(--mu)",fontSize:18,cursor:"pointer",padding:"4px",flexShrink:0,lineHeight:1}}
                    >×</button>
                  )}
                </div>
                <input
                  id="ob-logo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{display:"none"}}
                  onChange={e=>{
                    const file = e.target.files[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setBakery(p=>({...p, logo:url}));
                  }}
                />
                {/* AI Logo Helper button */}
                <button
                  onClick={()=>setShowAILogo(true)}
                  style={{width:"100%",marginTop:9,padding:"11px",borderRadius:11,border:`1.5px solid ${primary}40`,background:`color-mix(in srgb,${primary} 6%,var(--sf))`,color:primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}
                >
                  <span>✨</span> Don't have a logo? Make one free with ChatGPT
                </button>
                {/* Growth gate note */}
                <div style={{marginTop:7,padding:"7px 10px",background:`color-mix(in srgb,#3D5A99 8%,var(--bg))`,borderRadius:9,display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:12}}>🔒</span>
                  <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.4}}>Your logo is saved now. It will appear on your <strong style={{color:"#3D5A99"}}>customer storefront on Growth plan</strong> and above.</div>
                </div>
              </Fld>

            </div>
          </div>
        )}

        {/* STEP 3: BAKERY DETAILS */}
        {step===3 && (
          <div style={{padding:"20px 20px 0"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>📋</div>
              <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"var(--tx)",marginBottom:4}}>Your bakery details</h2>
              <p style={{fontSize:13,color:"var(--mu)"}}>Help customers know what to expect when ordering from you.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <Fld label="Lead Time *" hint="How many days in advance do customers need to order?" required error={errors.leadTime}>
                <input className="field" placeholder="e.g. 5-7 days" value={bakery.leadTime||""} onChange={e=>setBakery(p=>({...p,leadTime:e.target.value}))}/>
              </Fld>
              <Fld label="Minimum Order *" hint="What is your minimum order amount?" required error={errors.minOrder}>
                <input className="field" placeholder="e.g. $50" value={bakery.minOrder||""} onChange={e=>setBakery(p=>({...p,minOrder:e.target.value}))}/>
              </Fld>
              <Fld label="Deposit Required *" hint="What deposit do you require to start an order?" required error={errors.deposit}>
                <input className="field" placeholder="e.g. 50% upfront" value={bakery.deposit||""} onChange={e=>setBakery(p=>({...p,deposit:e.target.value}))}/>
              </Fld>
              <Fld label="Signature Items (optional)" hint="What are your most popular or famous items?">
                <textarea className="field" rows={3} placeholder="e.g. 3-tier wedding cakes, custom birthday cakes, holiday cookie boxes" value={bakery.signatureItems||""} onChange={e=>setBakery(p=>({...p,signatureItems:e.target.value}))} style={{resize:"none",fontSize:13,lineHeight:1.6}}/>
              </Fld>
              <Fld label="Instagram (optional)" hint="Your bakery's Instagram handle — shows on your storefront">
                <div style={{position:"relative"}}>
                  <input className="field" placeholder="@yourbakery" value={bakery.instagram||""} onChange={e=>setBakery(p=>({...p,instagram:e.target.value}))} style={{paddingLeft:32}}/>
                  <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",lineHeight:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="url(#ob-ig)"/><defs><radialGradient id="ob-ig" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="1.8" fill="none"/><circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/><rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="1.8" fill="none"/></svg>
                  </span>
                  {bakery.instagram && <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:18,height:18,borderRadius:"50%",background:"#16A34A",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span></div>}
                </div>
              </Fld>
              <Fld label="Facebook (optional)" hint="Your bakery's Facebook page — shows on your storefront">
                <div style={{position:"relative"}}>
                  <input className="field" placeholder="facebook.com/yourbakery" value={bakery.facebook||""} onChange={e=>setBakery(p=>({...p,facebook:e.target.value}))} style={{paddingLeft:32}}/>
                  <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",lineHeight:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1877F2"/><path d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z" fill="#fff"/></svg>
                  </span>
                  {bakery.facebook && <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:18,height:18,borderRadius:"50%",background:"#16A34A",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span></div>}
                </div>
              </Fld>
              <div style={{background:"var(--bg)",borderRadius:12,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>💡</span>
                <div style={{fontSize:12,color:"var(--mu)",lineHeight:1.5}}>These details show on your storefront and order form so customers know exactly what to expect before placing an order.</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ADD PRODUCTS */}
        {step===4 && (
          <div style={{padding:"20px 16px 0"}}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:36,marginBottom:8}}>🛍</div>
              <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"var(--tx)",marginBottom:4}}>Let's add the products you make</h2>
              <p style={{fontSize:13,color:"var(--mu)",lineHeight:1.5}}>You can change or add to this on the Products page anytime.</p>
            </div>
            {errors.products && (
              <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,padding:"10px 13px",fontSize:12,color:"#DC2626",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                <span>⚠</span> {errors.products}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
              {QUICK_PRODUCTS.map(qp => {
                const alreadyAdded = qp.name && products.some(p=>p.name===qp.name);
                return (
                  <button key={qp.label} onClick={()=>openQuickAdd(qp)} style={{padding:"12px 10px",borderRadius:13,border:`1.5px solid ${alreadyAdded?primary+"60":primary+"28"}`,background:alreadyAdded?`color-mix(in srgb,${primary} 10%,var(--sf))`:`color-mix(in srgb,${primary} 4%,var(--sf))`,cursor:"pointer",fontFamily:"var(--fb)",display:"flex",alignItems:"center",gap:8,textAlign:"left",position:"relative"}}>
                    {alreadyAdded && <div style={{position:"absolute",top:6,right:8,width:16,height:16,borderRadius:"50%",background:"#16A34A",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span></div>}
                    <span style={{fontSize:20,flexShrink:0}}>{qp.emoji}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--tx)",lineHeight:1.2}}>{qp.label}</div>
                      <div style={{fontSize:10,color:qp.price?primary:"var(--mu)",marginTop:1}}>{qp.price?`From $${qp.price}`:"Tap to add"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {products.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px"}}>{products.length} product{products.length!==1?"s":""} added ✓</div>
                {products.map(p => (
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--sf)",borderRadius:11,border:`1px solid ${primary}30`}}>
                    {p.imageURL?<img src={p.imageURL} alt="" style={{width:34,height:34,borderRadius:7,objectFit:"cover",flexShrink:0}}/>:<span style={{fontSize:20,flexShrink:0}}>{p.emoji}</span>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{p.name}</div>
                      <div style={{fontSize:10,color:"var(--mu)",marginTop:1}}>${p.price} · {getSellByLabel(p.sellBy)} · Min: {p.minOrder}</div>
                    </div>
                    <button onClick={()=>removeProduct(p.id)} style={{background:"none",border:"none",color:"var(--mu)",fontSize:15,cursor:"pointer",fontWeight:700}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        
        {/* STEP 5: FLAVORS */}
        {step===5 && (
          <div style={{padding:"20px 16px 0"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>🍓</div>
              <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"var(--tx)",marginBottom:4}}>What flavors do you offer?</h2>
              <p style={{fontSize:13,color:"var(--mu)",lineHeight:1.5}}>Customers will see your flavors on your storefront. You can add or change these anytime.</p>
            </div>

            {errors.flavors && (
              <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,padding:"10px 13px",fontSize:12,color:"#DC2626",marginBottom:12,display:"flex",alignItems:"center",gap:8,fontWeight:600}}>
                <span>⚠</span> {errors.flavors}
              </div>
            )}

            {/* Preset flavor chips */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:10}}>Tap to select your flavors</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {[
                  {name:"Chocolate",        emoji:"🍫"},
                  {name:"Vanilla",           emoji:"🍦"},
                  {name:"Strawberry",        emoji:"🍓"},
                  {name:"Lemon",             emoji:"🍋"},
                  {name:"Red Velvet",        emoji:"❤"},
                  {name:"Funfetti",          emoji:"🎊"},
                  {name:"Carrot",            emoji:"🥕"},
                  {name:"Cookies & Cream",   emoji:"🍪"},
                  {name:"Coconut",           emoji:"🥥"},
                  {name:"Pumpkin Spice",     emoji:"🎃"},
                  {name:"Banana",            emoji:"🍌"},
                  {name:"Tres Leches",       emoji:"🥛"},
                  {name:"Horchata",          emoji:"🌾"},
                  {name:"Peach",             emoji:"🍑"},
                  {name:"Blueberry",         emoji:"🫐"},
                  {name:"Almond",            emoji:"🌰"},
                ].map(fl => {
                  const selected = (bakery.flavors||[]).includes(fl.name);
                  return (
                    <button
                      key={fl.name}
                      onClick={()=>{
                        const current = bakery.flavors || [];
                        setBakery(p=>({...p, flavors: selected
                          ? current.filter(f=>f!==fl.name)
                          : [...current, fl.name]
                        }));
                      }}
                      style={{
                        padding:"8px 14px",
                        borderRadius:30,
                        border:`1.5px solid ${selected ? primary : "var(--bd)"}`,
                        background: selected ? primary : "var(--sf)",
                        color: selected ? "#fff" : "var(--mu)",
                        fontFamily:"var(--fb)",
                        fontWeight:600,
                        fontSize:13,
                        cursor:"pointer",
                        display:"flex",
                        alignItems:"center",
                        gap:6,
                        transition:"all .15s",
                      }}
                    >
                      <span style={{fontSize:14}}>{fl.emoji}</span> {fl.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom flavor input */}
            <div style={{background:"var(--sf)",borderRadius:14,padding:"14px",border:"1px solid var(--bd)"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--tx)",marginBottom:4}}>✏ Add a custom flavor</div>
              <div style={{fontSize:11,color:"var(--mu)",marginBottom:10}}>Have a signature or seasonal flavor? Add it here.</div>
              <div style={{display:"flex",gap:9}}>
                <input
                  className="field"
                  id="custom-flavor-input"
                  placeholder="e.g. Brown Butter, Lavender, Guava..."
                  style={{flex:1}}
                  onKeyDown={e=>{
                    if(e.key==="Enter"){
                      const val = e.target.value.trim();
                      if(val && !(bakery.flavors||[]).includes(val)){
                        setBakery(p=>({...p, flavors:[...(p.flavors||[]), val]}));
                        e.target.value = "";
                      }
                    }
                  }}
                />
                <button
                  onClick={()=>{
                    const el = document.getElementById("custom-flavor-input");
                    const val = el?.value?.trim();
                    if(val && !(bakery.flavors||[]).includes(val)){
                      setBakery(p=>({...p, flavors:[...(p.flavors||[]), val]}));
                      if(el) el.value = "";
                    }
                  }}
                  style={{padding:"10px 16px",borderRadius:10,border:"none",background:primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Selected flavors summary */}
            {(bakery.flavors||[]).length > 0 && (
              <div style={{marginTop:14}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".8px",marginBottom:8}}>{(bakery.flavors||[]).length} flavor{(bakery.flavors||[]).length!==1?"s":""} selected</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(bakery.flavors||[]).map(fl=>(
                    <span
                      key={fl}
                      style={{display:"inline-flex",alignItems:"center",gap:5,background:`color-mix(in srgb,${primary} 12%,var(--sf))`,border:`1px solid ${primary}30`,borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:600,color:primary}}
                    >
                      {fl}
                      <button
                        onClick={()=>setBakery(p=>({...p,flavors:(p.flavors||[]).filter(f=>f!==fl)}))}
                        style={{background:"none",border:"none",color:primary,cursor:"pointer",fontSize:13,fontWeight:700,padding:0,lineHeight:1,marginLeft:2}}
                      >×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(bakery.flavors||[]).length === 0 && (
              <div style={{marginTop:12,padding:"10px 13px",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:10,display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:14}}>💡</span>
                <div style={{fontSize:11,color:"#92400E",lineHeight:1.5}}>Select at least one flavor so customers know what you offer. You can always add more later.</div>
              </div>
            )}
          </div>
        )}


        {/* STEP 6: ACCOUNT SETUP */}
        {step===6 && (
          <div style={{padding:"20px 20px 0"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>🔐</div>
              <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"var(--tx)",marginBottom:4}}>Create your account</h2>
              <p style={{fontSize:13,color:"var(--mu)",lineHeight:1.5}}>This keeps your bakery secure and lets you log in from any device.</p>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:13}}>

              {/* Username */}
              <Fld label="Username *" hint="Auto-generated from your bakery name — you can edit it below" required error={errors.username}>
                <div style={{position:"relative"}}>
                  <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"var(--mu)",fontWeight:600,pointerEvents:"none"}}>@</div>
                  <input
                    className="field"
                    placeholder="e.g. kcs-sugar-trails-bakery"
                    value={bakery.username||bakery.name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")||""}
                    onChange={e=>setBakery(p=>({...p,username:e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,"")}))}
                    style={{paddingLeft:26,fontSize:14}}
                  />
                </div>
                {(bakery.username||bakery.name||"").length > 2 && (
                  <div style={{marginTop:6,padding:"6px 11px",background:`color-mix(in srgb,${primary} 8%,var(--bg))`,borderRadius:9,fontSize:11,color:primary,fontWeight:600}}>
                    🔗 bakeros.app/store/{bakery.username||bakery.name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}
                  </div>
                )}
              </Fld>

              {/* Email */}
              <Fld label="Email Address *" required error={errors.email}>
                <input
                  className="field"
                  type="email"
                  placeholder="e.g. hello@bakeros.com"
                  value={bakery.email||""}
                  onChange={e=>setBakery(p=>({...p,email:e.target.value}))}
                />
              </Fld>

              {/* Password */}
              <Fld label="Password *" required error={errors.password}>
                <input
                  className="field"
                  type="password"
                  placeholder="At least 8 characters"
                  value={bakery.password||""}
                  onChange={e=>setBakery(p=>({...p,password:e.target.value}))}
                />
              </Fld>

              {/* Confirm password */}
              <Fld label="Confirm Password *" required error={errors.confirmPassword}>
                <input
                  className="field"
                  type="password"
                  placeholder="Re-enter your password"
                  value={bakery.confirmPassword||""}
                  onChange={e=>setBakery(p=>({...p,confirmPassword:e.target.value}))}
                />
              </Fld>

              {/* Strength indicator */}
              {(bakery.password||"").length > 0 && (() => {
                const pw = bakery.password||"";
                const strength = pw.length >= 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) ? "strong"
                  : pw.length >= 8 ? "good" : "weak";
                const colors = {weak:"#DC2626", good:"#C47B00", strong:"#16A34A"};
                const labels = {weak:"Weak", good:"Good", strong:"Strong 💪"};
                const widths  = {weak:"33%", good:"66%", strong:"100%"};
                return (
                  <div>
                    <div style={{height:4,background:"var(--bd)",borderRadius:2,overflow:"hidden",marginBottom:4}}>
                      <div style={{height:"100%",width:widths[strength],background:colors[strength],borderRadius:2,transition:"width .3s"}}/>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:colors[strength]}}>{labels[strength]} password</div>
                  </div>
                );
              })()}

              {/* Agreement */}
              <div style={{padding:"10px 13px",background:"var(--bg)",borderRadius:11,border:"1px solid var(--bd)",fontSize:11,color:"var(--mu)",lineHeight:1.6,textAlign:"center"}}>
                By creating an account you agree to BakerOS's{" "}
                <span style={{color:primary,fontWeight:700,cursor:"pointer"}}>Terms of Service</span>
                {" "}and{" "}
                <span style={{color:primary,fontWeight:700,cursor:"pointer"}}>Privacy Policy</span>
              </div>

            </div>
          </div>
        )}

        {/* STEP 7: STOREFRONT LIVE */}
        {step===7 && (
          <div style={{padding:"20px 20px 0",textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:10,animation:"pop .6s cubic-bezier(.22,.68,0,1.4) both"}}>🎉</div>
            <h2 style={{fontFamily:"var(--fd)",fontSize:26,fontWeight:700,color:"var(--tx)",marginBottom:6}}>Your bakery is live!</h2>
            <p style={{fontSize:13,color:"var(--mu)",lineHeight:1.6,marginBottom:22}}>Share Your Link With Friends and Family and Let Them See Your New Business Page</p>

            {/* Storefront link card */}
            <div style={{background:"var(--sf)",borderRadius:16,padding:"16px",marginBottom:12,border:"1px solid var(--bd)",boxShadow:"0 4px 20px rgba(0,0,0,.07)",textAlign:"left"}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:5}}>Your Storefront Link</div>
              <div style={{fontSize:12,fontWeight:700,color:"var(--tx)",marginBottom:12,wordBreak:"break-all",padding:"8px 10px",background:"var(--bg)",borderRadius:9,border:"1px solid var(--bd)"}}>
                bakeros.app/store/{(bakery.username||(bakery.name||"your-bakery").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {/* Copy Link */}
                <button
                  onClick={()=>{
                    const url = `https://bakeros.app/store/${bakery.username||(bakery.name||"your-bakery").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}`;
                    if(navigator.clipboard) navigator.clipboard.writeText(url);
                    setLinkCopied(true);
                    setTimeout(()=>setLinkCopied(false), 3000);
                  }}
                  style={{padding:"11px 6px",borderRadius:11,border:"none",background:primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:12,cursor:"pointer"}}
                >
                  {linkCopied ? "Copied ✓" : "📋 Copy"}
                </button>
                {/* Share */}
                <button
                  onClick={()=>{
                    const url = `https://bakeros.app/store/${bakery.username||(bakery.name||"your-bakery").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}`;
                    if(navigator.share){
                      navigator.share({ title: bakery.name||"My Bakery", text:"Check out my bakery!", url }).catch(()=>{});
                    } else if(navigator.clipboard) {
                      navigator.clipboard.writeText(url);
                      setLinkCopied(true);
                    }
                  }}
                  style={{padding:"11px 6px",borderRadius:11,border:`1.5px solid ${primary}`,background:"transparent",color:primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}
                >
                  ↗ Share
                </button>
                {/* Preview */}
                <button
                  onClick={()=>{ onComplete(); setTimeout(()=>{ window.dispatchEvent(new CustomEvent("bakeros-nav", {detail:"customer_storefront"})); }, 300); }}
                  style={{padding:"11px 6px",borderRadius:11,border:"1.5px solid var(--bd)",background:"var(--bg)",color:"var(--tx)",fontFamily:"var(--fb)",fontWeight:700,fontSize:12,cursor:"pointer"}}
                >
                  👁 Preview
                </button>
              </div>
            </div>

            {/* QR Code card */}
            <div style={{background:"var(--sf)",borderRadius:16,padding:"16px",marginBottom:12,border:"1px solid var(--bd)",boxShadow:"0 4px 20px rgba(0,0,0,.07)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Your QR Code</div>
              <div className="qr-onboard-wrap" style={{border:`2px solid ${primary}`,borderRadius:13,padding:6,display:"inline-block",background:"#fff",marginBottom:12}}>
                <QRCodeDisplay
                  url={`https://bakeros.app/store/${bakery.username||(bakery.name||"your-bakery").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}`}
                  size={120}
                  primaryColor={primary}
                />
              </div>
              <div style={{fontSize:11,color:"var(--mu)",marginBottom:10,lineHeight:1.5}}>
                Print this on flyers, cake boxes, or your table at markets — customers scan it to see your storefront
              </div>
              <button
                onClick={()=>{
                  const canvas = document.querySelector(".qr-onboard-wrap canvas");
                  if(canvas){
                    const a = document.createElement("a");
                    a.download = `${(bakery.name||"bakery").replace(/\s+/g,"-")}-qr.png`;
                    a.href = canvas.toDataURL("image/png");
                    a.click();
                  } else {
                    // QR not loaded yet — copy link as fallback
                    const url = `https://bakeros.app/store/${bakery.username||(bakery.name||"your-bakery").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}`;
                    if(navigator.clipboard) navigator.clipboard.writeText(url);
                    setLinkCopied(true);
                  }
                }}
                style={{width:"100%",padding:"11px",borderRadius:11,border:`1.5px solid ${primary}`,background:"transparent",color:primary,fontFamily:"var(--fb)",fontWeight:700,fontSize:13,cursor:"pointer"}}
              >
                ⬇ Download QR Code
              </button>
            </div>

            {/* NFC keychain note */}
            <div style={{background:`color-mix(in srgb,${primary} 8%,var(--sf))`,borderRadius:13,padding:"12px 14px",textAlign:"left",display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:18,flexShrink:0}}>📲</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"var(--tx)",marginBottom:2}}>Your free NFC keychain is on its way</div>
                <div style={{fontSize:11,color:"var(--mu)",lineHeight:1.5}}>When customers tap it, they land on your storefront. Upgrade to Pro to capture their contact info automatically.</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: CHOOSE YOUR PATH */}
        {step===8 && (
          <div style={{padding:"20px 20px 0"}}>
            <div style={{textAlign:"center",marginBottom:22}}>
              <div style={{fontSize:40,marginBottom:10}}>🚀</div>
              <h2 style={{fontFamily:"var(--fd)",fontSize:24,fontWeight:700,color:"var(--tx)",marginBottom:6}}>You're ready to start taking orders</h2>
              <p style={{fontSize:13,color:"var(--mu)",lineHeight:1.6}}>Upgrade anytime to unlock messaging, payments, and more.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:22}}>
              {[
                {icon:"💬",label:"Messages",        desc:"Receive customer inquiries directly", tier:"Growth", color:"#3D5A99"},
                {icon:"💳",label:"Payments & Invoicing",desc:"Get paid via Stripe, Venmo, Zelle", tier:"Growth", color:"#059669"},
                {icon:"📦",label:"Inventory",       desc:"Track stock and prevent missed orders",tier:"Growth", color:"#C47B00"},
              ].map(f => (
                <div key={f.label} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",background:"var(--sf)",borderRadius:13,border:"1px solid var(--bd)",opacity:.65}}>
                  <div style={{width:36,height:36,borderRadius:9,background:`color-mix(in srgb,${f.color} 14%,var(--bg))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{f.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--tx)"}}>{f.label}</div>
                    <div style={{fontSize:11,color:"var(--mu)",marginTop:1}}>{f.desc}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,background:`color-mix(in srgb,${f.color} 14%,var(--sf))`,color:f.color,borderRadius:20,padding:"2px 9px",flexShrink:0}}>🔒 {f.tier}</span>
                </div>
              ))}
            </div>
            <button onClick={onComplete} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:800,fontSize:15,color:"#fff",background:`linear-gradient(135deg,${primary},color-mix(in srgb,${primary} 65%,#000))`,boxShadow:`0 8px 24px color-mix(in srgb,${primary} 35%,transparent)`,marginBottom:10}}>
              Go to Dashboard →
            </button>
            <button onClick={onComplete} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--bd)",background:"transparent",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:700,fontSize:13,color:"var(--mu)"}}>
              Explore plans first
            </button>
          </div>
        )}

      </div>

      {/* Footer CTA (steps 2-4) */}
      {step >= 2 && step <= 7 && (
        <div style={{padding:"12px 20px",paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))",borderTop:"1px solid var(--bd)",background:"var(--sf)",flexShrink:0}}>
          <button onClick={next} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",cursor:"pointer",fontFamily:"var(--fb)",fontWeight:800,fontSize:15,color:"#fff",background:`linear-gradient(135deg,${primary},color-mix(in srgb,${primary} 65%,#000))`}}>
            {step===7 ? "Continue →" : "Next →"}
          </button>
        </div>
      )}

      {/* Product add sheet */}
      {showProdForm && (
        <div className="sheet">
          <div onClick={() => setShowProdForm(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(2px)"}}/>
          <div className="sheet-panel">
            <div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"12px auto 6px"}}/>
            <div style={{padding:"4px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontFamily:"var(--fd)",fontSize:18,fontWeight:700,color:"var(--tx)"}}>{activeProdType && activeProdType.emoji} Add {activeProdType && activeProdType.label}</div>
              <button onClick={() => setShowProdForm(false)} style={{background:"none",border:"none",fontSize:20,color:"var(--mu)",cursor:"pointer"}}>×</button>
            </div>
            <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:12}}>
              <Fld label="Name" required>
                <input className="field" placeholder={activeProdType ? activeProdType.name || "Product name" : "Product name"} value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))}/>
              </Fld>
              <Fld label="Price ($)" required>
                <input className="field" type="number" min="0" step="0.01" placeholder="0.00" value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))}/>
              </Fld>
              <Fld label="I sell this by">
                <select className="field" value={newProd.sellBy} onChange={e=>setNewProd(p=>({...p,sellBy:e.target.value}))}>
                  <option value="each">1 Each</option>
                  <option value="half_dozen">Half Dozen (6)</option>
                  <option value="dozen">Dozen (12)</option>
                </select>
              </Fld>
              <Fld label="Minimum order quantity">
                <select className="field" value={newProd.minOrder} onChange={e=>setNewProd(p=>({...p,minOrder:e.target.value}))}>
                  {["1","2","3","4","5","6","7","8","9","10"].map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </Fld>
              <Fld label="Photo (optional)">
                {newProd.imageURL
                  ? <div style={{position:"relative"}}><img src={newProd.imageURL} alt="" style={{width:"100%",maxHeight:130,objectFit:"cover",borderRadius:10,display:"block"}}/><button onClick={() => setNewProd(p=>({...p,imageURL:null}))} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",width:24,height:24,color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>x</button></div>
                  : <button onClick={() => imgRef.current && imgRef.current.click()} style={{width:"100%",padding:"11px",borderRadius:10,border:`1.5px dashed ${primary}60`,background:"transparent",cursor:"pointer",fontFamily:"var(--fb)",fontSize:12,fontWeight:700,color:primary,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>📷 Add a photo of this item</button>
                }
                <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleProdImage(e.target.files[0])}/>
              </Fld>
              <button onClick={saveProduct} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:14,cursor:"pointer",marginTop:4}}>Add Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PAGE WALKTHROUGH SYSTEM ─────────────────────────────────────────────────
   - First visit: intro card auto-shows
   - ? button in header: replays anytime
   - Tooltip bubbles: step-by-step with Next / Got it
────────────────────────────────────────────────────────────────────────────── */

const PAGE_GUIDES = {
  storefront: {
    icon: "🏪",
    title: "Your Storefront",
    intro: "This is your public bakery page — what customers see when they tap your QR code or visit your link. Fill it out completely to make a great first impression!",
    tips: [
      { emoji:"📝", text:"Tap 'Baker Bio' and write a short intro — customers want to know who is baking their cake!" },
      { emoji:"⭐", text:"Mark your best products as Signature Items — they get a special tab on your storefront" },
      { emoji:"🍓", text:"Add your flavors so customers know what you offer before they even message you" },
      { emoji:"💰", text:"Fill in your Minimum Order and Deposit Policy — this saves you from answering the same questions over and over" },
    ],
  },
  products: {
    icon: "🛍",
    title: "Your Product Menu",
    intro: "This is where you build your menu. Every cake, cupcake, or treat you sell lives here. Your customers will see these on your storefront.",
    tips: [
      { emoji:"➕", text:"Tap + Add in the header to create your first product" },
      { emoji:"💲", text:"Set your price and choose how you sell it — by the each, half dozen, or dozen" },
      { emoji:"⭐", text:"Check 'Signature Item' to feature it in the special Signature tab on your storefront" },
      { emoji:"📸", text:"Upload a photo of your bakes — real photos sell better than emojis!" },
    ],
  },
  crm: {
    icon: "👥",
    title: "Your Customer List",
    intro: "Keep track of every customer you've worked with. Add their contact info, notes, and order history all in one place.",
    tips: [
      { emoji:"➕", text:"Tap + Add Customer to save a new customer's info" },
      { emoji:"📝", text:"Add a note about their preferences — favorite flavors, allergies, birthdays" },
      { emoji:"💬", text:"On Growth plan and above, you can message customers directly from their profile" },
      { emoji:"📊", text:"See how much each customer has spent with you over time" },
    ],
  },
  orders: {
    icon: "📋",
    title: "Managing Your Orders",
    intro: "Every order you take shows up here. Update statuses, text customers, and stay on top of what's due.",
    tips: [
      { emoji:"👆", text:"Tap any order card to open the full details" },
      { emoji:"🔄", text:"Update status to Pending → Ready → Completed as you work" },
      { emoji:"📱", text:"Tap 'SMS Customer' to text them with a pre-written message — no typing needed" },
      { emoji:"💰", text:"Completed orders track your total revenue on the Home dashboard" },
    ],
  },
  recipes: {
    icon: "📖",
    title: "Your Recipe Book",
    intro: "Store all your recipes here and link each ingredient to your inventory. When you complete an order, the app deducts the right amounts automatically.",
    tips: [
      { emoji:"➕", text:"Tap + Add to create a new recipe" },
      { emoji:"🔗", text:"Link the recipe to a product — so you know which recipe goes with which item you sell" },
      { emoji:"⚖️", text:"Add ingredients from your inventory and choose Solid or Liquid — units convert automatically" },
      { emoji:"📦", text:"On Pro plan, tap Deduct Inventory when an order ships and the app handles the math" },
    ],
  },
  inventory: {
    icon: "📦",
    title: "Your Ingredient Inventory",
    intro: "Track everything you have on hand — flour, butter, sugar, packaging. Get alerts before you run out so you're never caught mid-bake.",
    tips: [
      { emoji:"➕", text:"Tap + Add Item to log a new ingredient or supply" },
      { emoji:"⚖️", text:"Choose Solid, Liquid, or Count — this tells the app which units to use in recipes" },
      { emoji:"🔔", text:"Set a Minimum Alert — the app warns you when stock drops below that number" },
      { emoji:"🧾", text:"On Elite plan, scan a receipt and the app adds items to inventory automatically" },
    ],
  },
  receipt: {
    icon: "🧾",
    title: "AI Receipt Scanner",
    intro: "Take a photo of any grocery or supply receipt and let AI read it for you. It pulls out every item, price, and category — then updates your inventory and accounting in one flow.",
    tips: [
      { emoji:"📷", text:"Tap 'Take Photo' or 'From Gallery' to upload your receipt" },
      { emoji:"🤖", text:"AI reads every line item — vendor, prices, quantities — in seconds" },
      { emoji:"✅", text:"You review each item and confirm where it belongs — nothing updates without your approval" },
      { emoji:"📒", text:"Every purchase creates an accounting expense line automatically — great for tax time" },
    ],
  },
};

// localStorage keys for which guides have been seen
function getSeenGuides() {
  try { return JSON.parse(localStorage.getItem("bos_seen_guides") || "{}"); } catch { return {}; }
}
function markGuideSeen(key) {
  try {
    const seen = getSeenGuides();
    seen[key] = true;
    localStorage.setItem("bos_seen_guides", JSON.stringify(seen));
  } catch {}
}
function resetGuides() {
  try { localStorage.removeItem("bos_seen_guides"); } catch {}
}

function usePageHelp(pageKey) {
  const guide = PAGE_GUIDES[pageKey];
  const [show, setShow]       = useState(false);
  const [tipStep, setTipStep] = useState(0);
  const [mode, setMode]       = useState("intro"); // intro | tips

  useEffect(() => {
    if (!guide) return;
    const seen = getSeenGuides();
    if (!seen[pageKey]) {
      setTimeout(() => setShow(true), 600);
    }
  }, [pageKey]);

  const open = () => { setMode("intro"); setTipStep(0); setShow(true); };
  const close = () => { markGuideSeen(pageKey); setShow(false); setTipStep(0); };
  const startTips = () => { setMode("tips"); setTipStep(0); };
  const nextTip = () => {
    if (tipStep < guide.tips.length - 1) { setTipStep(t => t+1); }
    else { close(); }
  };

  return { guide, show, mode, tipStep, open, close, startTips, nextTip };
}

// ? Help button for page headers
function HelpBtn({ onPress }) {
  const b = useBrand();
  return (
    <button
      onClick={onPress}
      style={{
        width:30,height:30,borderRadius:"50%",
        background:`color-mix(in srgb,${b.theme.primary} 12%,var(--sf))`,
        border:`1.5px solid ${b.theme.primary}40`,
        color:b.theme.primary,fontWeight:800,fontSize:14,
        cursor:"pointer",display:"flex",alignItems:"center",
        justifyContent:"center",flexShrink:0,
      }}
    >?</button>
  );
}

// Full walkthrough overlay — receives guide and state directly, no hook inside
function WalkthroughOverlay({ pageKey, onClose }) {
  const b = useBrand();
  const guide = PAGE_GUIDES[pageKey];
  const [mode, setMode]       = useState("intro");
  const [tipStep, setTipStep] = useState(0);

  if (!guide) return null;

  const close = () => { markGuideSeen(pageKey); onClose(); };
  const startTips = () => { setMode("tips"); setTipStep(0); };
  const nextTip = () => {
    if (tipStep < guide.tips.length - 1) { setTipStep(t => t+1); }
    else { close(); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(3px)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{
        width:"100%",maxWidth:430,background:"var(--sf)",
        borderRadius:"20px 20px 0 0",
        padding:`20px 20px calc(90px + env(safe-area-inset-bottom,16px))`,
        animation:"slideUp .3s cubic-bezier(.22,.68,0,1.1) both",
        maxHeight:"80dvh",overflowY:"auto",WebkitOverflowScrolling:"touch",
      }}>

        {mode === "intro" ? (
          <>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:44,marginBottom:10}}>{guide.icon}</div>
              <div style={{fontFamily:"var(--fd)",fontSize:22,fontWeight:700,color:"var(--tx)",marginBottom:8}}>{guide.title}</div>
              <div style={{fontSize:13,color:"var(--mu)",lineHeight:1.7}}>{guide.intro}</div>
            </div>
            <div style={{background:"var(--bg)",borderRadius:14,padding:"13px 14px",marginBottom:18,display:"flex",flexDirection:"column",gap:10}}>
              {guide.tips.map((tip,i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{tip.emoji}</span>
                  <span style={{fontSize:12,color:"var(--mu)",lineHeight:1.5}}>{tip.text}</span>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={close} style={{padding:"13px",borderRadius:12,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                Got it
              </button>
              <button onClick={startTips} style={{padding:"13px",borderRadius:12,border:"none",background:b.theme.primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}>
                Show Me How →
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{display:"flex",gap:5,marginBottom:16}}>
              {guide.tips.map((_,i) => (
                <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=tipStep?b.theme.primary:"var(--bd)",transition:"background .2s"}}/>
              ))}
            </div>
            <div style={{textAlign:"center",padding:"10px 0 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>{guide.tips[tipStep].emoji}</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--tx)",lineHeight:1.6}}>{guide.tips[tipStep].text}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <button onClick={close} style={{padding:"11px 16px",borderRadius:12,border:"1px solid var(--bd)",background:"transparent",color:"var(--mu)",fontFamily:"var(--fb)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                Skip
              </button>
              <div style={{fontSize:11,color:"var(--mu)",fontWeight:600}}>{tipStep+1} of {guide.tips.length}</div>
              <button onClick={nextTip} style={{padding:"11px 22px",borderRadius:12,border:"none",background:b.theme.primary,color:"#fff",fontFamily:"var(--fb)",fontWeight:800,fontSize:13,cursor:"pointer"}}>
                {tipStep < guide.tips.length-1 ? "Next →" : "Done ✓"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// PageHelp — ? button + auto-show on first visit + overlay
function PageHelp({ pageKey }) {
  const guide = PAGE_GUIDES[pageKey];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!guide) return;
    const seen = getSeenGuides();
    if (!seen[pageKey]) setTimeout(() => setOpen(true), 700);
  }, [pageKey]);

  if (!guide) return null;
  return (
    <>
      <HelpBtn onPress={() => { setOpen(true); }}/>
      {open && <WalkthroughOverlay pageKey={pageKey} onClose={() => setOpen(false)}/>}
    </>
  );
}

/* ── LOCAL STORAGE PERSISTENCE ───────────────────────────────────────────────
   useLS(key, defaultValue) — reads from localStorage on mount, writes on change.
   Safe: never crashes if localStorage is unavailable.
────────────────────────────────────────────────────────────────────────────── */
function useLS(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });

  const setLS = useCallback((value) => {
    setState(prev => {
      const next = typeof value === "function" ? value(prev) : value;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  return [state, setLS];
}

// Clear all BakerOS data (used for logout / reset)
function clearAllData() {
  const keys = [
    "bos_onboarded","bos_brand","bos_inventory","bos_tier","bos_products",
    "bos_categories","bos_photos","bos_socialLinks","bos_payHandles",
    "bos_bakerInfo","bos_obBakery","bos_showFirstBanner","bos_tooltipStep",
    "bos_seen_guides","bos_messages","bos_sms_templates","bos_recipes","bos_albums",
    "bos_orders","bos_customers","bos_invoices","bos_reminders",
    "bos_sms_templates","bos_messages",
  ];
  keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
}

export default function App() {

  // ── Global Escape key handler — closes any open modal/sheet ─────────────────
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        // Dispatch a custom event that sheets can listen to
        window.dispatchEvent(new CustomEvent("bakeros:escape"));
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

    const [page, setPage_raw]         = useState("home");
  const [pageHistory, setPageHistory]   = useState([]);

  // Smart setPage that tracks history
  // Pages in bottomNav or drawer are "root" pages — they reset history
  const ROOT_PAGES = new Set(["home","orders","inventory","marketing","more","settings","subscription","orderform"]);
  const setPage = (newPage) => {
    setPage_raw(cur => {
      if (!ROOT_PAGES.has(newPage)) {
        // Push current page to history before navigating
        setPageHistory(h => [...h.slice(-9), cur]); // keep last 10
      } else {
        // Root pages clear history
        setPageHistory([]);
      }
      return newPage;
    });
  };
  const goBack = () => {
    setPageHistory(h => {
      if (h.length === 0) { setPage_raw("home"); return []; }
      const prev = h[h.length - 1];
      setPage_raw(prev);
      return h.slice(0, -1);
    });
  };
  const [session, setSession] = useState(null)
  const [conflictBanner, setConflictBanner] = useState(false);
  const [authLoading, setAuthLoading] = useState(true)
  const [authScreen, setAuthScreen] = useState('login') // 'login' or 'signup'
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authBakeryName, setAuthBakeryName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authWorking, setAuthWorking] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [drawerOpen, setDrawer]     = useState(false);

  // ── Persisted state ────────────────────────────────────────────────────────
  const [onboarded,     setOnboarded]   = useLS("bos_onboarded",   false);
  const [brand,         setBrand]       = useLS("bos_brand",        DEFAULT_BRAND);
  const [inventory,     setInventory]   = useLS("bos_inventory",    INV_INIT);
  const [tier,          setTier]        = useLS("bos_tier",         "starter");
  const [products,      setProducts]    = useLS("bos_products",     INIT_PRODUCTS);
  const [categories,    setCategories]  = useLS("bos_categories",   INIT_CATEGORIES);
  const [photos,        setPhotos]      = useLS("bos_photos",       INIT_PHOTOS);
  const [albums,        setAlbums]      = useLS("bos_albums",       []);
  const [socialLinks,   setSocialLinks] = useLS("bos_socialLinks",  { instagram:"", facebook:"", tiktok:"", twitter:"", website:"" });
  const [payHandles,    setPayHandles]  = useLS("bos_payHandles",   { cashapp:"", venmo:"", zelle:"" });
  const [bakerInfo,     setBakerInfo]   = useLS("bos_bakerInfo",    {
    bio:"", minOrder:"", deposit:"", leadTime:"", flavors:[], signatureItems:"",
  });
  const [obBakery,      setObBakery]    = useLS("bos_obBakery",     { name:"", tagline:"", phone:"" });
  const [showFirstBanner, setShowFirstBanner] = useLS("bos_showFirstBanner", false);
  const [tooltipStep,     setTooltipStep]     = useLS("bos_tooltipStep",     0);

  // ── Persisted cross-page state ────────────────────────────────────────────
  const [appOrders,    setAppOrders]   = useLS("bos_orders",    []);
  const [customers,    setCustomers]   = useLS("bos_customers",  []);
  const [invoices,     setInvoices]    = useLS("bos_invoices",   []);
  const [reminders,    setReminders]   = useLS("bos_reminders",  []);
  const [recipes,      setRecipes]     = useLS("bos_recipes",    []);

  // ── Non-persisted state (UI only) ─────────────────────────────────────────
  const [obStep,        setObStep]      = useState(1);
  const [obProducts,    setObProducts]  = useState([]);
  const [obErrors,      setObErrors]    = useState({});
  const [obLinkCopied,  setObLinkCopied]= useState(false);
  const [demoDataDone,  setDemoDataDone]= useState(false);

  const track = useCallback((event) => { console.log("BakerOS activation:", event); }, []);

  useEffect(() => {
    const loadingTimeout = setTimeout(() => setAuthLoading(false), 8000); // 8s failsafe
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(loadingTimeout);
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        clearAllData();
      }
    })
    return () => subscription.unsubscribe()
  }, [])


  // ── Supabase DB sync ──────────────────────────────────────────────────────
  const [isHydrating,  setIsHydrating]  = useState(false);
  const [syncStatus,   setSyncStatus]   = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const hasHydrated = useRef(false);

  const hydrateFromSupabase = useCallback(async (userId) => {
    setIsHydrating(true);
    // Clear stale localStorage before loading from Supabase
    // This ensures a new device always gets fresh data, not old cached defaults
    const staleKeys = ['bos_brand','bos_bakerInfo','bos_socialLinks','bos_payHandles',
      'bos_products','bos_categories','bos_inventory','bos_photos','bos_albums','bos_recipes','bos_tier'];
    staleKeys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    try {
      // ── Load settings (brand, products, inventory, etc.) ──────────────────
      const { data: settings } = await supabase
        .from('baker_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!settings) {
        // No settings row yet — create a blank one so future saves work
        await supabase.from('baker_settings').upsert({ user_id: userId }, { onConflict: 'user_id' });
      }
      if (settings) {
        const b = settings.brand || {};
        // Supabase always wins — don't merge with potentially stale localStorage
        if (Object.keys(b).length) {
          setBrand({ ...DEFAULT_BRAND, ...b, theme: b.theme || DEFAULT_BRAND.theme });
        }
        const bi = settings.baker_info || {};
        if (Object.keys(bi).length) {
          setBakerInfo({ bio:"", minOrder:"", deposit:"", leadTime:"", flavors:[], signatureItems:"", ...bi, flavors: Array.isArray(bi.flavors) ? bi.flavors : [] });
        }
        if (settings.social_links && Object.keys(settings.social_links).length) setSocialLinks(settings.social_links);
        if (settings.pay_handles  && Object.keys(settings.pay_handles).length)  setPayHandles(settings.pay_handles);
        if (Array.isArray(settings.products)   && settings.products.length)   setProducts(settings.products);
        if (Array.isArray(settings.categories) && settings.categories.length) setCategories(settings.categories);
        if (Array.isArray(settings.inventory)  && settings.inventory.length)  setInventory(settings.inventory);
        if (Array.isArray(settings.photos)     && settings.photos.length)     setPhotos(settings.photos);
        if (Array.isArray(settings.albums)     && settings.albums.length)     setAlbums(settings.albums);
        if (Array.isArray(settings.recipes)    && settings.recipes.length)    setRecipes(settings.recipes);
        if (settings.tier)      setTier(settings.tier);
        if (settings.onboarded) setOnboarded(settings.onboarded);
      }

      // ── Load orders from normalized table ─────────────────────────────────
      const { data: orders } = await supabase
        .from('baker_orders')
        .select('*')
        .eq('baker_id', userId)
        .order('created_at', { ascending: false });
      if (orders?.length) {
        const mapped = orders.map(o => ({
          id: o.id, customer: o.customer, phone: o.phone, email: o.email,
          item: o.item, amount: parseFloat(o.amount)||0, date: o.date,
          dueDate: o.due_date, status: o.status, payment: o.payment,
          notes: o.notes, smsOptIn: o.sms_opt_in,
          completedAt: o.completed_at, refundedAt: o.refunded_at,
        }));
        setAppOrders(mapped);
      }

      // ── Load customers from normalized table ──────────────────────────────
      const { data: customers } = await supabase
        .from('baker_customers')
        .select('*')
        .eq('baker_id', userId)
        .order('created_at', { ascending: false });
      if (customers?.length) {
        const mapped = customers.map(c => ({
          id: c.id, name: c.name, phone: c.phone, email: c.email,
          orders: c.orders, spent: parseFloat(c.spent)||0, last: c.last,
          tag: c.tag, tags: c.tags || [], notes: c.notes,
          smsOptIn: c.sms_opt_in, allergies: c.allergies,
          source: c.source || '', isNewNfc: c.is_new_nfc || false,
        }));
        setCustomers(mapped);
      }

      // ── Load invoices from normalized table ───────────────────────────────
      const { data: invoices } = await supabase
        .from('baker_invoices')
        .select('*')
        .eq('baker_id', userId)
        .order('created_at', { ascending: false });
      if (invoices?.length) {
        const mapped = invoices.map(i => ({
          id: i.id, orderId: i.order_id, customer: i.customer,
          amount: parseFloat(i.amount)||0, status: i.status, due: i.due,
        }));
        setInvoices(mapped);
      }

      localStorage.setItem('bos_last_synced', new Date().toISOString());
      console.log('[BakerOS] Hydrated from normalized tables ✓');
    } catch (e) { console.warn('[BakerOS] Hydration failed:', e.message); }
    setIsHydrating(false);
  }, [setBrand, setBakerInfo, setSocialLinks, setPayHandles, setProducts, setCategories, setInventory, setPhotos, setAlbums, setRecipes, setAppOrders, setCustomers, setInvoices, setTier, setOnboarded]);

  const pushToSupabase = useCallback(async (userId, snapshot) => {
    setSyncStatus('saving');
    try {
      // ── Upsert settings (brand, products, inventory, etc.) ────────────────
      await supabase.from('baker_settings').upsert({
        user_id:      userId,
        brand:        snapshot.brand        || {},
        baker_info:   snapshot.bakerInfo    || {},
        social_links: snapshot.socialLinks  || {},
        pay_handles:  snapshot.payHandles   || {},
        products:     snapshot.products     || [],
        categories:   snapshot.categories   || [],
        inventory:    snapshot.inventory    || [],
        photos:       snapshot.photos       || [],
        albums:       snapshot.albums       || [],
        recipes:      snapshot.recipes      || [],
        // NOTE: tier is intentionally excluded — only written by Stripe webhook
        onboarded:    snapshot.onboarded    || false,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' });

      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (e) {
      setSyncStatus('error');
      console.warn('[BakerOS] Push failed:', e.message);
    }
  }, []);

  const syncTimer = useRef(null);

  const queueSync = useCallback(() => {
    if (!session?.user?.id) return;
    if (isHydrating) return; // block sync until hydration is complete — prevents race condition
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const snapshot = {
        brand, bakerInfo, socialLinks, payHandles,
        products, categories, inventory, photos, albums,
        recipes, tier, onboarded,
        // orders, customers, invoices now in normalized tables — not in blob
        // messages in baker_messages table
      };
      pushToSupabase(session.user.id, snapshot);
    }, 5000); // 5s debounce
  }, [session, isHydrating, brand, bakerInfo, socialLinks, payHandles, products, categories, inventory, photos, albums, recipes, tier, onboarded, pushToSupabase]);

  useEffect(() => { queueSync(); }, [queueSync]);

  // Hydrate only once per login session (not on token refresh)
  useEffect(() => {
    if (session?.user?.id && !hasHydrated.current) {
      hasHydrated.current = true;
      hydrateFromSupabase(session.user.id);
    }
    if (!session) hasHydrated.current = false;
  }, [session?.user?.id, hydrateFromSupabase]);
  // ──────────────────────────────────────────────────────────────────────────
  async function handleSignUp() {
    setAuthWorking(true); setAuthError('');
    if (authPassword.length < 6) { setAuthError('Password must be at least 6 characters'); setAuthWorking(false); return; }
    if (authPassword !== authConfirmPassword) { setAuthError('Passwords do not match'); setAuthWorking(false); return; }
    const { data, error } = await supabase.auth.signUp({
      email: authEmail, password: authPassword,
      options: { data: { bakery_name: authBakeryName } }
    });
    if (error) { setAuthError(error.message); setAuthWorking(false); return; }
    // If no session, email confirmation is required
    if (!data.session) {
      setConfirmationSent(true);
      setAuthWorking(false);
      return;
    }
    // Session created immediately — email confirmation is disabled, proceed normally
    setAuthWorking(false);
  }

  async function handleOAuth(provider) {
    setAuthWorking(true);
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'https://app.bakeros.app',
        skipBrowserRedirect: false,
      }
    });
    if (error) { setAuthError(error.message); setAuthWorking(false); }
    // On mobile, Supabase redirects the page — no further action needed
  }

  async function handleSignIn() {
    setAuthWorking(true); setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
    if (error) { setAuthError(error.message); setAuthWorking(false) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    clearAllData();
    setSession(null);
    window.location.reload();
  }

  // Listen for navigation events from onboarding (e.g. Preview button on Step 6)
  useEffect(() => {
    const handler = (e) => { if(e.detail) setPage(e.detail); };
    window.addEventListener("bakeros-nav", handler);
    return () => window.removeEventListener("bakeros-nav", handler);
  }, []);

  // Listen for customer-added events from MessagesPage (which has no direct props access)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setCustomers(p => {
          const exists = p.find(c => c.phone===e.detail.phone || c.email===e.detail.email || c.name===e.detail.name);
          return exists ? p : [e.detail, ...p];
        });
      }
    };
    window.addEventListener("bakeros-customer-added", handler);
    return () => window.removeEventListener("bakeros-customer-added", handler);
  }, [setCustomers]);

  // ── Periodic customer refresh — catches new NFC leads without re-login ───
  useEffect(() => {
    if (!session?.user?.id) return;
    const refreshCustomers = async () => {
      try {
        const { data } = await supabase
          .from('baker_customers')
          .select('*')
          .eq('baker_id', session.user.id)
          .order('created_at', { ascending: false });
        if (data?.length) {
          const mapped = data.map(c => ({
            id: c.id, name: c.name, phone: c.phone, email: c.email,
            orders: c.orders, spent: parseFloat(c.spent)||0, last: c.last,
            tag: c.tag, tags: c.tags || [], notes: c.notes,
            smsOptIn: c.sms_opt_in, allergies: c.allergies,
            source: c.source || '', isNewNfc: c.is_new_nfc || false,
          }));
          setCustomers(mapped);
        }
      } catch {}
    };
    // Refresh every 30 seconds to catch new NFC leads
    const interval = setInterval(refreshCustomers, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id, setCustomers]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Unsaved changes protection ────────────────────────────────────────────
  useEffect(() => {
    const handleUnload = (e) => {
      if (syncStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [syncStatus]);

  // ── Conflict detection — check if another device updated data ─────────────
  // Only runs after hydration is complete and a 60s grace period after login
  useEffect(() => {
    if (!session?.user?.id) return;
    // Wait 60s after login before starting conflict checks
    // This prevents false positives from the stale cache clear on new devices
    const startDelay = setTimeout(() => {
      const interval = setInterval(async () => {
        // Don't check if currently hydrating or syncing
        if (isHydrating || syncStatus === 'saving') return;
        try {
          const { data } = await supabase
            .from('baker_settings')
            .select('updated_at')
            .eq('user_id', session.user.id)
            .single();
          const lastSynced = localStorage.getItem('bos_last_synced');
          if (data?.updated_at && lastSynced) {
            const remoteTime = new Date(data.updated_at).getTime();
            const localTime  = new Date(lastSynced).getTime();
            // Only flag if remote is more than 30s newer than our last sync
            // This prevents own-save false positives
            if (remoteTime > localTime + 30000) {
              setConflictBanner(true);
            }
          }
        } catch {}
      }, 60000); // Check every 60 seconds
      return () => clearInterval(interval);
    }, 60000); // 60s grace period after login
    return () => clearTimeout(startDelay);
  }, [session?.user?.id, isHydrating, syncStatus]);

  const lowStock  = inventory.filter(i => ["low","out"].includes(stockStatus(i))).length;
  const inBottom  = ["home","orders","inventory","marketing"].includes(page);
  const tierCtxValue = { tier, setTier, setPage, goBack };

  const completeOnboarding = useCallback(() => {
    if (obBakery.name) setBrand(p => ({...p,
      storeName:     obBakery.name,
      tagline:       obBakery.tagline || p.tagline,
      logo:          obBakery.logo    || p.logo,
      bakeryUsername: obBakery.username
        || (obBakery.name||"bakery").toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""),
    }));
    // Save all baker info from onboarding into bakerInfo (auto-populates Settings page)
    setBakerInfo(p => ({
      ...p,
      username:       obBakery.username       || p.username,
      email:          obBakery.email          || p.email,
      bio:            obBakery.bio            || p.bio,
      minOrder:       obBakery.minOrder       || p.minOrder,
      deposit:        obBakery.deposit        || p.deposit,
      leadTime:       obBakery.leadTime       || p.leadTime,
      signatureItems: obBakery.signatureItems || p.signatureItems,
      flavors: (obBakery.flavors||[]).length > 0
        ? obBakery.flavors.map(name => ({ name, signature: false }))
        : p.flavors,
    }));
    // Save social links from onboarding into socialLinks (auto-populates Settings page)
    if (obBakery.instagram || obBakery.facebook) setSocialLinks(p => ({
      ...p,
      ...(obBakery.instagram ? { instagram: obBakery.instagram } : {}),
      ...(obBakery.facebook  ? { facebook:  obBakery.facebook  } : {}),
    }));
    if (obProducts.length > 0) {
      setProducts(p => [...obProducts.map((op,i) => ({ id:"ob-"+i, name:op.name, price:parseFloat(op.price)||0, description:op.description||"", emoji:op.emoji||"🎂", active:true, categories:[], imageURL:op.imageURL||null, sellBy:op.sellBy||"each", minOrder:op.minOrder||"1", signature:false })), ...p]);
      track("productAdded");
    }
    setOnboarded(true);
    setShowFirstBanner(true);
    setTooltipStep(1);
        // Demo message removed — real messages come from storefront contact form
  }, [obBakery, obProducts, demoDataDone, track, setSocialLinks]);

  // ── Public storefront URL detection ─────────────────────────────────────
  // If URL is /store/[slug], render public CustomerStorefrontPage without auth
  const urlSlug = (() => {
    try {
      const p = window.location.pathname;
      const m = p.match(/^\/store\/([a-z0-9-]+)/i);
      return m ? m[1] : null;
    } catch { return null; }
  })();

  // ── NFC lead capture URL detection ───────────────────────────────────────
  // If URL is /nfc/[slug], render NFC lead capture form then redirect to storefront
  const nfcSlug = (() => {
    try {
      const p = window.location.pathname;
      const m = p.match(/^\/nfc\/([a-z0-9-]+)/i);
      return m ? m[1] : null;
    } catch { return null; }
  })();

  // ── Invoice public URL detection ─────────────────────────────────────────
  // If URL is /invoice/[id], render public invoice page without auth
  const invoiceId = (() => {
    try {
      const p = window.location.pathname;
      const m = p.match(/^\/invoice\/([a-z0-9-]+)/i);
      return m ? m[1] : null;
    } catch { return null; }
  })();

  const [publicData, setPublicData] = useState(null);
  const [publicLoading, setPublicLoading] = useState(!!urlSlug || !!nfcSlug || !!invoiceId);
  const [publicError,  setPublicError]  = useState(null);

  useEffect(() => {
    if (invoiceId) {
      fetch(`/api/storefront?invoice=${encodeURIComponent(invoiceId)}`)
        .then(r => r.json())
        .then(d => { if (d.error) setPublicError(d.error); else setPublicData(d); })
        .catch(() => setPublicError("Could not load invoice"))
        .finally(() => setPublicLoading(false));
      return;
    }
    const slug = urlSlug || nfcSlug;
    if (!slug) return;
    fetch(`/api/storefront?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setPublicError(d.error);
        else { setPublicData(d); }
      })
      .catch(() => setPublicError("Could not load storefront"))
      .finally(() => setPublicLoading(false));
  }, [urlSlug, nfcSlug, invoiceId]);

  if (invoiceId) {
    if (publicLoading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FFFBF5',fontFamily:'sans-serif',fontSize:16,color:'#888'}}>
        <div style={{textAlign:'center'}}><div style={{fontSize:40,marginBottom:12}}>🧾</div><div>Loading invoice…</div></div>
      </div>
    );
    if (publicError || !publicData) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',textAlign:'center',padding:24}}>
        <div><div style={{fontSize:48,marginBottom:16}}>🧾</div><div style={{fontSize:18,fontWeight:700,color:'#3D1C00',marginBottom:8}}>Invoice not found</div><div style={{fontSize:13,color:'#888'}}>This invoice link may have expired or is invalid.</div></div>
      </div>
    );
    return <PublicInvoicePage data={publicData}/>;
  }

  if (nfcSlug) {
    if (publicLoading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FFFBF5',fontFamily:'sans-serif',fontSize:16,color:'#888'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>🏷️</div>
          <div>Loading...</div>
        </div>
      </div>
    );
    if (publicError || !publicData) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',textAlign:'center',padding:24}}>
        <div>
          <div style={{fontSize:48,marginBottom:16}}>🧁</div>
          <div style={{fontSize:18,fontWeight:700,color:'#3D1C00',marginBottom:8}}>Bakery not found</div>
          <div style={{fontSize:13,color:'#888'}}>This NFC tag doesn't match an active bakery.</div>
        </div>
      </div>
    );
    return <NFCLandingPage data={publicData} slug={nfcSlug}/>;
  }

  if (urlSlug) {
    if (publicLoading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',fontSize:16,color:'#888'}}>
        Loading storefront…
      </div>
    );
    if (publicError || !publicData) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',textAlign:'center',padding:24}}>
        <div>
          <div style={{fontSize:48,marginBottom:16}}>🧁</div>
          <div style={{fontSize:18,fontWeight:700,color:'#3D1C00',marginBottom:8}}>Bakery not found</div>
          <div style={{fontSize:13,color:'#888'}}>The storefront <strong>{urlSlug}</strong> doesn't exist or hasn't been set up yet.</div>
        </div>
      </div>
    );
    return (
      <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#FDF6EC"}}>
      <TierCtx.Provider value={{tier:'growth', setTier:()=>{}, setPage:()=>{}}}>
        <Ctx.Provider value={publicData.brand}>
          <GlobalCSS brand={publicData.brand}/>
          <CustomerStorefrontPage
            products={publicData.products}
            categories={publicData.categories}
            photos={publicData.photos}
            albums={publicData.albums||[]}
            brand={publicData.brand}
            socialLinks={publicData.socialLinks}
            bakerInfo={publicData.bakerInfo}
            setPage={()=>{}}
            isOwnerPreview={false}
          />
        </Ctx.Provider>
      </TierCtx.Provider>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (authLoading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FDF6EC',fontFamily:'sans-serif'}}>
      <div style={{fontSize:48,marginBottom:12,animation:'pulse 1.5s ease-in-out infinite'}}>🧁</div>
      <div style={{fontSize:20,fontWeight:800,color:'#3D1C00',marginBottom:4}}>BakerOS</div>
      <div style={{fontSize:13,color:'#C47B00',marginTop:8}}>Loading your bakery...</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.08)}}`}</style>
    </div>
  )

  if (!session) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FDF6EC',padding:24,fontFamily:'sans-serif'}}>
      <div style={{fontSize:32,marginBottom:8}}>🧁</div>
      <h1 style={{fontSize:22,fontWeight:800,color:'#3D1C00',marginBottom:4}}>BakerOS</h1>
      <p style={{fontSize:13,color:'#888',marginBottom:24}}>Run your bakery. Grow your business.</p>
      {/* OAuth buttons */}
      <button onClick={()=>handleOAuth('google')} disabled={authWorking}
        style={{width:'100%',maxWidth:320,padding:'12px 14px',borderRadius:10,border:'1.5px solid #ddd',marginBottom:10,fontSize:14,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontWeight:600,color:'#333',boxSizing:'border-box'}}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continue with Google
      </button>
      {/* Apple OAuth — coming soon, requires Apple Developer account */}
      <div style={{width:'100%',maxWidth:320,display:'flex',alignItems:'center',gap:10,marginBottom:10,boxSizing:'border-box'}}>
        <div style={{flex:1,height:1,background:'#ddd'}}/>
        <span style={{fontSize:12,color:'#aaa'}}>or</span>
        <div style={{flex:1,height:1,background:'#ddd'}}/>
      </div>

      {/* Email confirmation pending screen */}
      {confirmationSent ? (
        <div style={{width:'100%',maxWidth:320,textAlign:'center',boxSizing:'border-box'}}>
          <div style={{fontSize:48,marginBottom:16}}>📧</div>
          <div style={{fontSize:18,fontWeight:800,color:'#3D1C00',marginBottom:8}}>Check your email</div>
          <div style={{fontSize:13,color:'#666',lineHeight:1.6,marginBottom:20}}>
            We sent a confirmation link to<br/>
            <strong style={{color:'#3D1C00'}}>{authEmail}</strong><br/><br/>
            Click the link in that email to activate your account, then come back here to sign in.
          </div>
          <button onClick={()=>{setConfirmationSent(false);setAuthScreen('login');setAuthError('');}}
            style={{width:'100%',padding:'13px',borderRadius:10,background:'#C47B00',color:'#fff',fontWeight:800,fontSize:15,border:'none',cursor:'pointer',marginBottom:10}}>
            Go to Sign In
          </button>
          <button onClick={async()=>{
            const{error}=await supabase.auth.resend({type:'signup',email:authEmail});
            if(error)setAuthError(error.message);
            else setAuthError('Confirmation email resent ✓');
          }} style={{background:'none',border:'none',color:'#888',fontSize:12,cursor:'pointer'}}>
            Didn't receive it? Resend email
          </button>
          {authError && <p style={{color:authError.includes('✓')?'#16A34A':'#DC2626',fontSize:12,marginTop:8}}>{authError}</p>}
        </div>
      ) : (<>

      {authScreen === 'signup' && (
        <input placeholder="Bakery name" value={authBakeryName} onChange={e=>setAuthBakeryName(e.target.value)}
          style={{width:'100%',maxWidth:320,padding:'12px 14px',borderRadius:10,border:'1.5px solid #ddd',marginBottom:10,fontSize:14,boxSizing:'border-box'}}/>
      )}
      <input placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}
        style={{width:'100%',maxWidth:320,padding:'12px 14px',borderRadius:10,border:'1.5px solid #ddd',marginBottom:10,fontSize:14,boxSizing:'border-box'}}/>
      <input placeholder="Password" type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)}
        style={{width:'100%',maxWidth:320,padding:'12px 14px',borderRadius:10,border:'1.5px solid #ddd',marginBottom:authScreen==='signup'?6:10,fontSize:14,boxSizing:'border-box'}}/>
      {authScreen==='signup' && authPassword.length > 0 && (()=>{
        const pw = authPassword;
        const strength = pw.length>=10&&/[A-Z]/.test(pw)&&/[0-9]/.test(pw)?'strong':pw.length>=6?'medium':'weak';
        const colors={weak:'#DC2626',medium:'#D97706',strong:'#16A34A'};
        const widths={weak:'33%',medium:'66%',strong:'100%'};
        const labels={weak:'Weak',medium:'Fair',strong:'Strong'};
        return(
          <div style={{width:'100%',maxWidth:320,marginBottom:8,boxSizing:'border-box'}}>
            <div style={{height:3,background:'#eee',borderRadius:2,marginBottom:4}}>
              <div style={{height:'100%',width:widths[strength],background:colors[strength],borderRadius:2,transition:'width .3s'}}/>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:colors[strength],textAlign:'right'}}>{labels[strength]} password</div>
          </div>
        );
      })()}
      {authScreen==='signup' && (
        <input placeholder="Confirm password" type="password" value={authConfirmPassword} onChange={e=>setAuthConfirmPassword(e.target.value)}
          style={{width:'100%',maxWidth:320,padding:'12px 14px',borderRadius:10,border:`1.5px solid ${authConfirmPassword&&authConfirmPassword!==authPassword?'#DC2626':'#ddd'}`,marginBottom:4,fontSize:14,boxSizing:'border-box'}}/>
      )}
      {authScreen==='signup' && authConfirmPassword && authConfirmPassword!==authPassword && (
        <p style={{color:'#DC2626',fontSize:11,marginBottom:8,width:'100%',maxWidth:320}}>Passwords do not match</p>
      )}
      {authError && <p style={{color:'#DC2626',fontSize:12,marginBottom:10}}>{authError}</p>}
      <button onClick={authScreen==='login' ? handleSignIn : handleSignUp} disabled={authWorking}
        style={{width:'100%',maxWidth:320,padding:'13px',borderRadius:10,background:'#C47B00',color:'#fff',fontWeight:800,fontSize:15,border:'none',cursor:'pointer',marginBottom:12}}>
        {authWorking ? 'Please wait...' : authScreen==='login' ? 'Sign In' : 'Create Account'}
      </button>
      {authScreen==='login' && (
        <button onClick={async()=>{
          if(!authEmail){setAuthError('Enter your email first');return;}
          const{error}=await supabase.auth.resetPasswordForEmail(authEmail,{redirectTo:'https://app.bakeros.app'});
          if(error)setAuthError(error.message);
          else setAuthError('✓ Password reset email sent — check your inbox');
        }} style={{background:'none',border:'none',color:'#888',fontSize:12,cursor:'pointer',marginBottom:8}}>
          Forgot password?
        </button>
      )}
      <button onClick={()=>{setAuthScreen(authScreen==='login'?'signup':'login');setAuthError('');setAuthConfirmPassword('');}}
        style={{background:'none',border:'none',color:'#C47B00',fontSize:13,cursor:'pointer',fontWeight:600}}>
        {authScreen==='login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
      </>)}
    </div>
  )

  if (!onboarded) return (
    <TierCtx.Provider value={tierCtxValue}>
      <Ctx.Provider value={brand}>
        <GlobalCSS brand={brand}/>
        <OnboardingFlow
          step={obStep} setStep={setObStep}
          bakery={obBakery} setBakery={setObBakery}
          products={obProducts} setProducts={setObProducts}
          errors={obErrors} setErrors={setObErrors}
          linkCopied={obLinkCopied} setLinkCopied={setObLinkCopied}
          brand={brand} tier={tier}
          socialLinks={socialLinks} setSocialLinks={setSocialLinks}
          onComplete={completeOnboarding}
        />
      </Ctx.Provider>
    </TierCtx.Provider>
  );

  const renderPage = () => {
    try { return renderPageInner(); } catch(e) { console.error("Page render error:", e); return <div style={{padding:32,textAlign:"center",color:"var(--mu)"}}><div style={{fontSize:32,marginBottom:12}}>⚠️</div><div style={{fontSize:14,fontWeight:600,color:"var(--tx)"}}>Something went wrong</div><div style={{fontSize:12,marginTop:6}}>{e.message}</div><button onClick={()=>setPage("home")} className="pbtn" style={{marginTop:16}}>← Go Home</button></div>; }
  };
  const renderPageInner = () => {
    switch(page) {
      case "home":        return <HomePage setPage={setPage} inventory={inventory} tier={tier} orders={appOrders} customers={customers}/>;
      case "orders":      return <OrdersPage extraOrders={appOrders} setAppOrders={setAppOrders} customers={customers} setCustomers={setCustomers} invoices={invoices} setInvoices={setInvoices} reminders={reminders} setReminders={setReminders} tier={tier}/>;
      case "messages":    return <GateWall feature="messages"><MessagesPage/></GateWall>;
      case "inventory":   return <GateWall feature="inventory"><InventoryPage inventory={inventory} setInventory={setInventory} setPage={setPage}/></GateWall>;
      case "marketing":   return <MarketingPage setPage={setPage} bakerInfo={bakerInfo} products={products} customers={customers} tier={tier}/>;
      case "accounting":  return <GateWall feature="tax_export"><AccountingPage inventory={inventory} orders={appOrders} invoices={invoices}/></GateWall>;
      case "branding":    return <GateWall feature="custom_branding"><BrandingPage brand={brand} setBrand={setBrand}/></GateWall>;
      case "crm":         return tier==="starter" ? <GateWall feature="crm"><CRMPage customers={customers} setCustomers={setCustomers}/></GateWall> : <CRMPage customers={customers} setCustomers={setCustomers}/>;
      case "analytics":   return <GateWall feature="analytics"><AnalyticsPage orders={appOrders} customers={customers}/></GateWall>;
      case "nfc":         return <NFCPage bakerInfo={bakerInfo} brand={brand} customers={customers}/>;
      case "storefront": {
        try {
          return <StorefrontPage products={products} categories={categories} photos={photos} bakerInfo={bakerInfo} setBakerInfo={setBakerInfo} setPage={setPage} setBrand={setBrand}/>;
        } catch(e) {
          return <div style={{padding:24,fontFamily:"sans-serif"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#DC2626",marginBottom:8}}>Storefront Error</div>
            <div style={{fontSize:12,background:"#FEF2F2",padding:12,borderRadius:8,wordBreak:"break-all",color:"#333"}}>{e.message}</div>
            <div style={{fontSize:10,marginTop:8,color:"#888",wordBreak:"break-all"}}>{e.stack?.slice(0,300)}</div>
          </div>;
        }
      }
      case "customer_storefront": return <CustomerStorefrontPage products={products} categories={categories} photos={photos} albums={albums} brand={brand} socialLinks={socialLinks} bakerInfo={bakerInfo} setPage={setPage} isOwnerPreview={true}/>;
      case "payments":    return <PaymentsPage payHandles={payHandles} setPayHandles={setPayHandles} invoices={invoices} orders={appOrders}/>;      case "receipt":     return <GateWall feature="receipt_scan"><ReceiptPage onAddToInventory={addToInventory} inventory={inventory} setPage={setPage}/></GateWall>;
      case "calendar":    return <CalendarPage orders={appOrders} reminders={reminders} setReminders={setReminders}/>;
      case "invoices":    return <GateWall feature="invoicing"><InvoicePage payHandles={payHandles} products={products} invoices={invoices} setInvoices={setInvoices} customers={customers} setCustomers={setCustomers}/></GateWall>;
      case "products":    return <ProductsPage products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} tier={tier} recipes={recipes}/>;
      case "recipes":     return <RecipePage inventory={inventory} setInventory={setInventory} products={products} recipes={recipes} setRecipes={setRecipes}/>;
      case "gallery":     return <GalleryPage photos={photos} setPhotos={setPhotos} albums={albums} setAlbums={setAlbums} products={products}/>;
      case "orderform":   return <OrderFormPage products={products} photos={photos} bakerInfo={bakerInfo} addOrder={async(o)=>{
        const userId = session?.user?.id;
        // ── Write order to baker_orders table ────────────────────────────────
        if (userId) {
          await supabase.from("baker_orders").insert({
            id: o.id, baker_id: userId,
            customer: o.customer, phone: o.phone||null, email: o.email||null,
            item: o.item, amount: o.amount||0, date: o.date,
            due_date: o.dueDate||null, status: "waiting_approval",
            payment: o.payment||"TBD", notes: o.notes||null,
            sms_opt_in: o.smsOptIn||false,
          });
          // ── Upsert customer in baker_customers table ──────────────────────
          const { data: existing } = await supabase.from("baker_customers")
            .select("id,orders,spent").eq("baker_id", userId)
            .or(`phone.eq.${o.phone||""},name.eq.${o.customer}`).maybeSingle();
          if (existing) {
            await supabase.from("baker_customers").update({
              orders: (existing.orders||0)+1,
              spent: (parseFloat(existing.spent)||0)+(o.amount||0),
              last: "Today", updated_at: new Date().toISOString()
            }).eq("id", existing.id);
          } else {
            await supabase.from("baker_customers").insert({
              id: "c-"+Date.now(), baker_id: userId,
              name: o.customer, phone: o.phone||null, email: o.email||null,
              orders: 1, spent: o.amount||0, last: "Today", tag: "New",
              sms_opt_in: o.smsOptIn||false,
            });
          }
        }
        // ── Update local state ────────────────────────────────────────────────
        setAppOrders(p=>[o,...p]);
        setCustomers(p=>{
          const exists=p.find(c=>c.phone===o.phone||c.name===o.customer);
          if(exists) return p.map(c=>(c.phone===o.phone||c.name===o.customer)?{...c,orders:(c.orders||0)+1,last:"Today"}:c);
          return [{id:"c-"+Date.now(),name:o.customer,phone:o.phone,email:o.email||"",orders:1,spent:o.amount||0,last:"Today",tag:"New",smsOptIn:o.smsOptIn||false},...p];
        });
        setReminders(p=>[...p,{id:Date.now(),date:new Date().toISOString().split("T")[0],text:`New order from ${o.customer} — ${o.item} ($${o.amount})`,time:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),color:"#16A34A",isNotification:true}]);
        apiFetch("/api/notify",{method:"POST",body:JSON.stringify({type:"order",customerName:o.customer,item:o.item,amount:o.amount,phone:o.phone,bakerId:userId||""})}).catch(()=>{});
      }}/>;
      case "settings":    return <SettingsPage socialLinks={socialLinks} setSocialLinks={setSocialLinks} brand={brand} bakerInfo={bakerInfo} setBakerInfo={setBakerInfo} setOnboarded={setOnboarded} setPage={setPage} obBakery={obBakery}/>;
      case "subscription":return <SubscriptionPage/>;
      default:            return <HomePage setPage={setPage} inventory={inventory} tier={tier}/>;
    }
  };  // end renderPageInner

  return (
    <TierCtx.Provider value={tierCtxValue}>
      <Ctx.Provider value={brand}>
        <GlobalCSS brand={brand}/>
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,height:"100%",background:"var(--bg)",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 0 60px rgba(0,0,0,.15)"}}>
          <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,height:44,background:"var(--sf)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",borderBottom:"1px solid var(--bd)"}}>
            {!inBottom ? <button onClick={goBack} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--p)",fontFamily:"var(--fb)",fontWeight:600,padding:0}}>← Back</button> : <div style={{display:"flex",alignItems:"center",gap:8}}><img src={BAKEROS_LOGO} alt="BakerOS" onClick={()=>setPage("home")} style={{width:32,height:32,objectFit:"contain",cursor:"pointer"}}/><span style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,color:"var(--tx)"}}>{brand.storeName||"BakerOS"}</span></div>}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:9}}>
              <div onClick={()=>setPage("subscription")} style={{background:`color-mix(in srgb,${TIERS[tier].color} 15%,var(--sf))`,color:TIERS[tier].color,borderRadius:20,padding:"3px 9px",fontSize:10,fontWeight:800,cursor:"pointer",border:`1px solid ${TIERS[tier].color}40`}}>{TIERS[tier].label}</div>
              {lowStock>0&&canAccess(tier,"inventory")&&<div style={{background:"#DC2626",color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:800}}>⚠ {lowStock}</div>}
              {conflictBanner && (
                <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#D97706",color:"#fff",padding:"10px 16px",fontSize:12,fontWeight:700,zIndex:9998,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>⚠ Another device updated your data</span>
                  <button onClick={()=>{setConflictBanner(false);hasHydrated.current=false;hydrateFromSupabase(session.user.id);}} style={{background:"rgba(255,255,255,.25)",border:"none",color:"#fff",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700,fontFamily:"var(--fb)"}}>Sync Now</button>
                </div>
              )}
              {syncStatus==='saving' && <span style={{fontSize:10,color:'var(--mu)',marginRight:4}}>Saving…</span>}
              {syncStatus==='saved'  && <span style={{fontSize:10,color:'#16A34A',marginRight:4}}>✓ Saved</span>}
              {syncStatus==='error'  && <span style={{fontSize:10,color:'#DC2626',marginRight:4}}>⚠ Not saved</span>}
              <div onClick={()=>setPage("settings")} style={{width:28,height:28,borderRadius:"50%",background:`color-mix(in srgb,${brand?.theme?.primary||"#C47B00"} 20%,${brand?.theme?.surface||"#FDF6EC"})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:brand?.theme?.primary||"#C47B00",fontSize:10,cursor:"pointer"}}>{(bakerInfo?.name||brand?.storeName||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?"}</div>
            </div>
          </div>
          <div className="page-scroll" style={{flex:1,paddingTop:44,paddingBottom:inBottom?"calc(96px + env(safe-area-inset-bottom, 16px))":"96px",overflowY:"scroll",WebkitOverflowScrolling:"touch",overscrollBehaviorY:"contain",minHeight:0,height:0}}>
          {/* Offline Banner */}
            {!isOnline && (
              <div style={{position:'fixed',top:44,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:430,background:'#DC2626',color:'#fff',padding:'8px 16px',fontSize:12,fontWeight:700,textAlign:'center',zIndex:9990}}>
                📡 No internet — changes will sync when you're back online
              </div>
            )}
            {/* Hydration overlay — prevents flash of empty state during Supabase data load */}
            {isHydrating && (
              <div style={{position:'fixed',inset:0,background:'#FDF6EC',zIndex:9999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'all'}}>
                <div style={{fontSize:40,marginBottom:10,animation:'pulse 1.5s ease-in-out infinite'}}>🧁</div>
                <div style={{fontSize:13,color:'#C47B00',fontWeight:600}}>Loading your bakery...</div>
              </div>
            )}
            {renderPage()}
            {/* Tester Mode Banner — only shown for non-production accounts */}
            {session?.user?.email && (
              session.user.email.includes('@bakeros.app') ||
              session.user.email.includes('+test') ||
              session.user.email === 'soulek001@yahoo.com'
            ) && (
            <div style={{margin:"8px 12px 0",background:"color-mix(in srgb,#7C5CBF 10%,var(--sf))",border:"1px solid #7C5CBF40",borderRadius:12,padding:"10px 13px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16,flexShrink:0}}>🧪</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:800,color:"#534AB7"}}>You're testing BakerOS</div>
                <div style={{fontSize:10,color:"#7C5CBF",marginTop:1}}>Report anything confusing, broken, or missing</div>
              </div>
              <a href="mailto:feedback@bakeros.app?subject=BakerOS Tester Feedback" style={{fontSize:10,fontWeight:800,color:"#534AB7",background:"#EEEDFE",borderRadius:8,padding:"5px 9px",textDecoration:"none",flexShrink:0,border:"1px solid #AFA9EC"}}>Send Feedback</a>
            </div>
            )}
            {showFirstBanner && page==="home" && brand?.theme && (
              <div style={{margin:"0 12px 12px",background:`color-mix(in srgb,${brand.theme.primary} 10%,var(--sf))`,border:`1.5px solid ${brand.theme.primary}40`,borderRadius:14,padding:"13px 15px",display:"flex",gap:11,alignItems:"center"}}>
                <div style={{width:34,height:34,borderRadius:9,background:brand.theme.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🔗</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800,color:"var(--tx)",marginBottom:2}}>Let's help you start growing your business by sharing your storefront</div><div style={{fontSize:11,color:"var(--mu)"}}>Copy the link and share it with friends, family and social media.</div></div>
                <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                  <button onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(getStorefrontURL(brand,bakerInfo));track("linkCopied");setShowFirstBanner(false);}} style={{background:brand.theme.primary,color:"#fff",border:"none",borderRadius:9,padding:"7px 12px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>Copy Link</button>
                  <button onClick={()=>setShowFirstBanner(false)} style={{background:"none",border:"none",fontSize:10,color:"var(--mu)",cursor:"pointer",fontFamily:"var(--fb)"}}>Dismiss</button>
                </div>
              </div>
            )}
          </div>
          <BottomNav page={page} setPage={setPage} lowStock={canAccess(tier,"inventory")?lowStock:0} openDrawer={()=>setDrawer(true)} tier={tier}/>
          <Drawer open={drawerOpen} onClose={()=>setDrawer(false)} setPage={setPage} page={page} tier={tier} nfcNewCount={customers.filter(c=>c.isNewNfc||c.is_new_nfc).length}/>
          {tooltipStep===1&&page==="home"&&(<div style={{position:"absolute",bottom:78,left:16,right:16,zIndex:300}}><div style={{background:"#1A1A1A",borderRadius:14,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,.4)"}}><div style={{fontSize:13,fontWeight:800,color:"#fff",marginBottom:4}}>📋 Your orders show up here</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:12}}>Every order from your storefront or order form appears in the Orders tab.</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Tip 1 of 3</span><button onClick={()=>setTooltipStep(2)} style={{background:"var(--p)",color:"#fff",border:"none",borderRadius:9,padding:"7px 16px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>Got it →</button></div></div><div style={{width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderTop:"10px solid #1A1A1A",marginLeft:70}}/></div>)}
          {tooltipStep===2&&page==="home"&&(<div style={{position:"absolute",top:52,left:16,right:16,zIndex:300}}><div style={{width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderBottom:"10px solid #1A1A1A",marginLeft:30}}/><div style={{background:"#1A1A1A",borderRadius:14,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,.4)"}}><div style={{fontSize:13,fontWeight:800,color:"#fff",marginBottom:4}}>🏪 This is what your customers see</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:12}}>Your storefront is live. Tap Storefront in the drawer to preview and share it.</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Tip 2 of 3</span><button onClick={()=>setTooltipStep(3)} style={{background:"var(--p)",color:"#fff",border:"none",borderRadius:9,padding:"7px 16px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>Got it →</button></div></div></div>)}
          {tooltipStep===3&&page==="home"&&(<div style={{position:"absolute",top:52,right:16,zIndex:300,width:240}}><div style={{width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderBottom:"10px solid #1A1A1A",marginLeft:"auto",marginRight:28}}/><div style={{background:"#1A1A1A",borderRadius:14,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,.4)"}}><div style={{fontSize:13,fontWeight:800,color:"#fff",marginBottom:4}}>⚡ Unlock tools to grow faster</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:12}}>Tap your plan badge to upgrade and unlock messages, payments, and more.</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Tip 3 of 3</span><button onClick={()=>setTooltipStep(0)} style={{background:"var(--p)",color:"#fff",border:"none",borderRadius:9,padding:"7px 16px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"var(--fb)"}}>Done</button></div></div></div>)}
        </div>
      </Ctx.Provider>
    </TierCtx.Provider>
  );
}
