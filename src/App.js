import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Progress } from "./components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Switch } from "./components/ui/switch";
import { Toggle } from "./components/ui/toggle";
import { ScrollArea } from "./components/ui/scroll-area";
import { Separator } from "./components/ui/separator";
import { Loader2, Shield, ShieldAlert, ShieldCheck, CreditCard, DollarSign, Lock, Globe, Zap, Search, ShoppingCart, Library, PlayCircle, WifiOff, Bell } from "lucide-react";

// Helper: tiers
const TIERS = {
  general: {
    key: "general",
    name: "General",
    monthly: 10,
    description:
      "Old Yahoo-like interface, slow loading, non‑HD visuals. Mostly general news; many links restricted.",
    speed: 0.6, // used to scale loading delays
    theme: "from-stone-200 to-stone-50",
  },
  premium: {
    key: "premium",
    name: "Premium",
    monthly: 50,
    description:
      "Faster browsing, sleeker UI. More platforms unlocked, but high-value resources stay gated.",
    speed: 0.85,
    theme: "from-slate-200 to-slate-50",
  },
  plus: {
    key: "plus",
    name: "Premium Plus",
    monthly: 200,
    description:
      "Full access to everything. Prohibitively expensive in this demo.",
    speed: 1,
    theme: "from-emerald-200 to-emerald-50",
  },
};

// Helper: sample results catalogue with dynamic pricing and access rules
const CATALOGUE = [
  {
    id: "news-1",
    title: "Global News Network – Breaking Headlines",
    url: "#",
    category: "General News",
    baseCost: 0.01,
    requiredTier: "general",
    icon: Globe,
    blurb: "Top stories from around the world."
  },
  {
    id: "social-1",
    title: "FriendSquare – Your Social Feed",
    url: "#",
    category: "Social Media",
    baseCost: 0.05,
    requiredTier: "premium",
    icon: Bell,
    blurb: "See what friends are doing (in SD at General)."
  },
  {
    id: "shopping-1",
    title: "MegaMart – Daily Deals",
    url: "#",
    category: "Shopping",
    baseCost: 0.03,
    requiredTier: "premium",
    icon: ShoppingCart,
    blurb: "Thousands of discounts. Checkout fees apply per click."
  },
  {
    id: "research-1",
    title: "DeepScholar – Academic Archive",
    url: "#",
    category: "High‑Value Research",
    baseCost: 0.25,
    requiredTier: "plus",
    icon: Library,
    blurb: "Peer‑reviewed journals and datasets (metered)."
  },
  {
    id: "video-1",
    title: "StreamBox – Trending Videos (HD)",
    url: "#",
    category: "Streaming",
    baseCost: 0.08,
    requiredTier: "premium",
    icon: PlayCircle,
    blurb: "Clips and shorts. HD locked on lower tiers."
  },
];

const clamp2 = (n) => Math.round(n * 100) / 100;

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(CATALOGUE);
  const [balance, setBalance] = useState(10);
  const [topupPool, setTopupPool] = useState(50);
  const [tier, setTier] = useState("general");
  const [redFlash, setRedFlash] = useState(false);
  const [greenFlash, setGreenFlash] = useState(false);
  const [popup, setPopup] = useState(null);
  const [interstitial, setInterstitial] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [meteredReminders, setMeteredReminders] = useState(true);
  const [ads, setAds] = useState([]);
  const [adPopup, setAdPopup] = useState(null);

  const tierData = TIERS[tier];

  // Audio: simple WebAudio blips instead of external files
  const audioCtxRef = useRef(null);
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };
  const playBeep = (freq = 880, dur = 0.07, type = "triangle") => {
    const ctx = ensureAudio();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  };
  const playCoin = () => { // coin flip-esque chirp
    playBeep(1200, 0.08, "square");
    setTimeout(() => playBeep(900, 0.06, "triangle"), 40);
  };
  const playSwipe = () => { // card swipe-esque sweep
    const ctx = ensureAudio();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(2000, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.22);
  };

  useEffect(() => {
    // periodic popups about credits / upgrade
    if (!meteredReminders) return;
    const id = setInterval(() => {
      const messages = [
        `You have $${balance.toFixed(2)} credits left.`,
        `Upgrade required for some results.`,
        `Top‑up available: $${topupPool.toFixed(2)}.`,
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setPopup({ msg });
    }, 9000);
    return () => clearInterval(id);
  }, [balance, topupPool, meteredReminders]);
  // inject banner ads if General tier
  useEffect(() => {
    if (tier !== "general") {
      setAds([]);
      return;
    }
    const fakeAds = [
      { id: 1, img: "https://placekitten.com/400/120", url: "#" },
      { id: 2, img: "https://placehold.co/400x120?text=Buy+Now!", url: "#" },
      { id: 3, img: "https://placehold.co/400x120?text=Cheap+VPN", url: "#" },
    ];
    setAds(fakeAds);
  }, [tier]);

  const visibleResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [query, results]);

  const effectiveCost = (r) => clamp2(r.baseCost * (tier === "general" ? 1.25 : tier === "premium" ? 1 : 0.75));

  const attemptClick = async (r) => {
    const cost = effectiveCost(r);

    // Gate by tier
    const order = ["general", "premium", "plus"]; 
const allowed = order.indexOf(tier) >= order.indexOf(r.requiredTier);

// For General users, random popup ad
if (tier === "general" && Math.random() < 0.6) {
  setAdPopup({
    title: "🔥 Hot Deal!",
    img: "https://placehold.co/400x200?text=Crazy+Discount",
    url: "#"
  });
}

    // Not enough balance?
    if (balance < cost) {
      setRedFlash(true);
      playSwipe();
      setPopup({ msg: `Balance too low for this click ($${cost.toFixed(2)}). Please top‑up.` });
      setTimeout(() => setRedFlash(false), 600);
      return;
    }

    // If restricted, show slow loading and then Upgrade gate
    if (!allowed) {
      // simulate slow load based on tier speed
      setInterstitial({ id: r.id, title: r.title, seconds: Math.ceil(3 / tierData.speed) + 1 });
      playSwipe();
      await new Promise((res) => setTimeout(res, (2000 / tierData.speed)));
      setInterstitial(null);
      setUpgradeOpen(true);
      return;
    }

    // Proceed: charge cost, coin sfx, quick interstitial
    setBalance((b) => clamp2(b - cost));
    playCoin();
    setInterstitial({ id: r.id, title: r.title, seconds: Math.max(1, Math.ceil(1.2 / tierData.speed)) });
    setTimeout(() => setInterstitial(null), Math.max(600, 1200 / tierData.speed));
  };

  const topUp = (amount) => {
    if (topupPool <= 0) {
      setPopup({ msg: "No top‑up funds available. Consider upgrading your plan." });
      playSwipe();
      return;
    }
    const amt = Math.min(amount, topupPool);
    setTopupPool((p) => clamp2(p - amt));
    setBalance((b) => clamp2(b + amt));
    setGreenFlash(true);
    playCoin();
    setTimeout(() => setGreenFlash(false), 500);
  };

  const upgradeTo = (target) => {
    if (target === "premium") {
      if (topupPool < 50) {
        setPopup({ msg: "Insufficient funds to start Premium ($50/month)." });
        playSwipe();
        return;
      }
      setTopupPool((p) => clamp2(p - 50));
      setTier("premium");
      setGreenFlash(true);
      playCoin();
      setTimeout(() => setGreenFlash(false), 500);
    } else if (target === "plus") {
      if (topupPool < 200) {
        setPopup({ msg: "Premium Plus ($200/month) unavailable in this demo." });
        playSwipe();
        return;
      }
      setTopupPool((p) => clamp2(p - 200));
      setTier("plus");
      setGreenFlash(true);
      playCoin();
      setTimeout(() => setGreenFlash(false), 500);
    }
  };

  const progress = Math.min(100, Math.max(0, (balance / 10) * 100));

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${tierData.theme} pb-24`}>
      {/* Top Bar: Balance + Tier */}
      <div className="sticky top-0 z-30 backdrop-blur border-b border-black/5 bg-white/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            <span className="font-semibold">MeterNet</span>
            <Badge variant="secondary" className="ml-2 flex items-center gap-1"><Zap className="h-3 w-3"/> {TIERS[tier].name}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Balance</div>
            <div className="text-xl font-mono tabular-nums">${balance.toFixed(2)}</div>
            <Progress value={progress} className="w-24" />
            <Button size="sm" variant="outline" onClick={() => topUp(5)} className="flex items-center gap-1"><DollarSign className="h-4 w-4"/>Top‑up $5</Button>
            <Button size="sm" onClick={() => setUpgradeOpen(true)} className="flex items-center gap-1"><Shield className="h-4 w-4"/>Upgrade</Button>
          </div>
        </div>
      </div>

      {/* Flashes */}
      {redFlash && <div className="fixed inset-0 z-[60] pointer-events-none bg-red-500/40 animate-pulse" />}
      {greenFlash && <div className="fixed inset-0 z-[60] pointer-events-none bg-emerald-400/25 animate-pulse" />}

      {/* Search Area */}
      <div className="max-w-3xl mx-auto mt-10">
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Search the Pay‑Per‑Click Web</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try: news, social, research, video…" className="text-base" />
              <Button onClick={() => playSwipe()} variant="secondary" className="gap-2"><Search className="h-4 w-4"/>Search</Button>
            </div>
            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
              <div>Dynamic pricing per result. Clicks deduct from your balance.</div>
              <div>Top‑up pool remaining: ${topupPool.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pop-up reminders */}
      {popup && (
        <div className="fixed right-4 bottom-4 z-50">
          <Alert className="max-w-sm shadow-xl">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Metered Notice</AlertTitle>
            <AlertDescription>{popup.msg}</AlertDescription>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPopup(null)}>Close</Button>
              <Button size="sm" onClick={() => { setUpgradeOpen(true); setPopup(null); }}>Upgrade</Button>
            </div>
          </Alert>
        </div>
      )}

      {/* Interstitial loading */}
      {interstitial && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Card className="w-[420px] text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin"/> Loading…</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Preparing <span className="font-medium">{interstitial.title}</span>. Because your plan is limited, this may take a few seconds.</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <WifiOff className="h-4 w-4"/> Estimated wait: {interstitial.seconds}s
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      <div className="max-w-3xl mx-auto mt-6">
        {tier === "general" && ads.length > 0 && (
          <div className="mb-4 space-y-2">
            {ads.map((ad) => (
              <a key={ad.id} href={ad.url} target="_blank" rel="noopener noreferrer">
                <img src={ad.img} alt="Ad banner" className="rounded-lg shadow" />
              </a>
            ))}
          </div>
        )}
        <ScrollArea className="h-[560px] rounded-lg border bg-white/70 p-3">
          <div className="space-y-3">
            {visibleResults.map((r) => {
              const Icon = r.icon || Globe;
              const cost = effectiveCost(r);
              const order = ["general", "premium", "plus"]; 
              const allowed = order.indexOf(tier) >= order.indexOf(r.requiredTier);
              const locked = !allowed;
              return (
                <Card key={r.id} className={`group transition ${locked ? "opacity-80" : "opacity-100"}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1"><Icon className="h-5 w-5"/></div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a className={`text-lg font-semibold hover:underline ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
                             onClick={() => attemptClick(r)}>
                            {r.title}
                          </a>
                          <Badge variant="outline">{r.category}</Badge>
                          <Badge className="gap-1" variant="secondary"><CreditCard className="h-3 w-3"/> ${cost.toFixed(2)} / click</Badge>
                          {locked && <Badge className="gap-1" variant="destructive"><Lock className="h-3 w-3"/> Requires {TIERS[r.requiredTier].name}</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{r.blurb}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5"/> Choose a Subscription</DialogTitle>
            <DialogDescription>
              Plans gate speed, quality and access. This demo charges upgrades from your top‑up pool to emphasize inequality.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            {/* General */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> General — $10/mo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{TIERS.general.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge>Current</Badge>
                  <div className="text-xs text-muted-foreground">Speed: slow • Access: limited</div>
                </div>
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className={tier === "premium" ? "ring-2 ring-slate-400" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4"/> Premium — $50/mo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{TIERS.premium.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Speed: medium • Access: broader</div>
                  <Button disabled={tier === "premium"} onClick={() => upgradeTo("premium")}>Start Premium ($50)</Button>
                </div>
              </CardContent>
            </Card>

            {/* Premium Plus */}
            <Card className="opacity-90">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4"/> Premium Plus — $200/mo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{TIERS.plus.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Speed: fast • Access: all sites</div>
                  <Button variant="destructive" onClick={() => upgradeTo("plus")}>Try to Upgrade ($200)</Button>
                </div>
              </CardContent>
            </Card>

            <Separator />
            <div className="flex items-center justify-between text-sm">
              <div>Top‑up pool available: <span className="font-mono">${topupPool.toFixed(2)}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Reminders</span>
                <Switch checked={meteredReminders} onCheckedChange={setMeteredReminders} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setUpgradeOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ad Popup Dialog */}
      <Dialog open={!!adPopup} onOpenChange={() => setAdPopup(null)}>
        <DialogContent className="sm:max-w-[440px]">
          {adPopup && (
            <>
              <DialogHeader>
                <DialogTitle>{adPopup.title}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3">
                <img src={adPopup.img} alt="Ad" className="rounded-lg shadow" />
                <Button asChild>
                  <a href={adPopup.url} target="_blank" rel="noopener noreferrer">Go to Offer</a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer note */}
      <div className="max-w-3xl mx-auto mt-6 text-center text-xs text-muted-foreground pb-10">
        This interactive prototype simulates a metered, pay‑per‑click web shaped by 1990s browser wars—complete with prices, tier gates, and sensory feedback.
      </div>
    </div>
  );
}
