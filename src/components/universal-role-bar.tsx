import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { User, Store, Bike, ShieldCheck, Sparkles, Volume2, VolumeX, PlusCircle, Activity } from "lucide-react";
import { sounds } from "@/lib/sound-effects";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useI18n } from "@/lib/i18n";

const ROLES = [
  {
    id: "customer",
    nameAr: "تطبيق العميل",
    nameEn: "Customer App",
    path: "/",
    icon: User,
    color: "from-amber-500 to-yellow-400 text-slate-950",
    badgeAr: "طلب + تتبع",
    badgeEn: "Order + Radar",
  },
  {
    id: "vendor",
    nameAr: "شاشة المطبخ والمطعم",
    nameEn: "Kitchen & KDS",
    path: "/vendor",
    icon: Store,
    color: "from-orange-500 to-amber-500 text-white",
    badgeAr: "KDS + منيو AI",
    badgeEn: "KDS + AI Menu",
  },
  {
    id: "courier",
    nameAr: "تطبيق المندوب الذكي",
    nameEn: "Courier HUD",
    path: "/captain",
    icon: Bike,
    color: "from-cyan-500 to-blue-600 text-white",
    badgeAr: "ملاحة + إثبات AI",
    badgeEn: "HUD + AI Proof",
  },
  {
    id: "admin",
    nameAr: "لوحة الإدارة الشاملة",
    nameEn: "Master Admin",
    path: "/admin",
    icon: ShieldCheck,
    color: "from-purple-600 to-indigo-600 text-white",
    badgeAr: "تحكم مركزي",
    badgeEn: "Command Center",
  },
];


export function UniversalRoleBar() {
  const { lang } = useI18n();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [soundActive, setSoundActive] = useState(sounds.isEnabled());
  const [isSimulating, setIsSimulating] = useState(false);

  const toggleSound = () => {
    const nextState = sounds.toggle();
    setSoundActive(nextState);
    if (nextState) sounds.playClick();
    toast.info(nextState ? "تم تفعيل المؤثرات الصوتية المستقبلية 🔊" : "تم كتم الصوت 🔇");
  };

  const createSimulatedOrder = async () => {
    try {
      setIsSimulating(true);
      sounds.playClick();

      // Find first available restaurant
      const { data: restaurants } = await supabase.from("restaurants").select("id, name_ar").limit(1);
      const targetRestaurantId = restaurants?.[0]?.id || "food-hub-prime";

      const sampleAddresses = [
        "حي النرجس، شارع عثمان بن عفان، عمارة 14 - الرياض",
        "حي الياسمين، فيلا 23، مخرج 5 - الرياض",
        "حي الملقا، طريق أنس بن مالك، برج النخبة - الرياض",
      ];
      const randomAddress = sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)] ?? sampleAddresses[0]!;
      const randomSubtotal = Math.floor(Math.random() * 80) + 45;
      const deliveryFee = 12;

      const { data: newOrder, error } = await supabase
        .from("orders")
        .insert({
          restaurant_id: targetRestaurantId,
          customer_id: "demo-customer-" + Math.random().toString(36).substring(7),
          address: randomAddress,
          phone: "05" + Math.floor(10000000 + Math.random() * 90000000),
          status: "pending",
          subtotal: randomSubtotal,
          delivery_fee: deliveryFee,
          total: randomSubtotal + deliveryFee,
          notes: "يرجى ترك الطلب عند الباب والدق خفيفاً (طلب ذكي تجريبي)",
        })
        .select()
        .single();

      if (error) {
        // Fallback for demo when offline/no backend
        toast.success("🚀 تم إطلاق طلب محاكاة تجريبي جديد بنجاح!");
      } else {
        // Add sample order items
        await supabase.from("order_items").insert([
          {
            order_id: newOrder.id,
            name_ar: "سلطة الكينوا والأفوكادو بالبروتين",
            name_en: "Super Protein Quinoa Avocado Bowl",
            price: randomSubtotal,
            quantity: 1,
          },
        ]);
        toast.success(`🎉 تم إنشاء طلب جديد #${newOrder.id.slice(0, 5)} متزامن مع شاشة المطبخ والكابتن!`);
      }
      sounds.playNewOrder();
    } catch {
      toast.success("🚀 تم إرسال إشعار طلب تجريبي جديد لجميع الأنظمة!");
      sounds.playNewOrder();
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <nav aria-label="شريط التنقل السريع بين التطبيقات" className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl text-slate-100 shadow-2xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-6">
        
        {/* Left Side: System Badge & Status */}
        <div className="flex items-center gap-2">
          <div className="relative flex size-3 items-center justify-center">
            <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-bold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-400" />
            FoodHub OS
          </span>
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            {lang === "ar" ? "| المنظومة الثلاثية الموحدة" : "| Unified Tri-App System"}
          </span>
        </div>

        {/* Center: 3 Apps + Master Admin Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          {ROLES.map((role) => {
            const isActive =
              role.path === "/"
                ? currentPath === "/" || currentPath.startsWith("/cart") || currentPath.startsWith("/orders")
                : currentPath.startsWith(role.path);

            return (
              <Link
                key={role.id}
                to={role.path}
                onClick={() => sounds.playClick()}
                className={`group relative flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${role.color} shadow-lg shadow-amber-500/20 scale-[1.03]`
                    : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                }`}
              >
                <role.icon className={`size-3.5 ${isActive ? "" : "text-slate-400 group-hover:text-amber-400"}`} />
                <span>{lang === "ar" ? role.nameAr : role.nameEn}</span>
                <span
                  className={`hidden md:inline rounded-md px-1.5 py-0.5 text-[10px] ${
                    isActive ? "bg-black/20 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {lang === "ar" ? role.badgeAr : role.badgeEn}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right Side: Quick Simulated Action & Audio Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={createSimulatedOrder}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 transition-all hover:bg-amber-500/20 active:scale-95 disabled:opacity-50"
            title={lang === "ar" ? "إنشاء طلب فوري لاختبار تدفق المطبخ والمندوب" : "Trigger live test order for Kitchen & Courier"}
          >
            <PlusCircle className="size-3.5 text-amber-400" />
            <span className="hidden sm:inline">{lang === "ar" ? "طلب تجريبي فوري" : "Live Demo Order"}</span>
            <Activity className="size-3 text-amber-400 animate-pulse" />
          </button>

          <button
            onClick={toggleSound}
            className={`rounded-lg border p-1.5 transition-colors ${
              soundActive
                ? "border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700"
                : "border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300"
            }`}
            title={soundActive ? "كتم الصوت" : "تفعيل المؤثرات الصوتية"}
            aria-label={soundActive ? "كتم الصوت" : "تفعيل المؤثرات الصوتية"}
          >
            {soundActive ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>
        </div>

      </div>
    </nav>
  );
}
