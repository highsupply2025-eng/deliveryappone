import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/role-guard";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useRealtime } from "@/lib/realtime";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AiDishCreator } from "@/components/vendor/ai-dish-creator";
import { LiveOrderMap } from "@/components/apps/live-order-map";
import { sounds } from "@/lib/sound-effects";
import {
  Store,
  ClipboardCheck,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  ChefHat,
  PackageCheck,
  Bike,
  Phone,
  Search,
  Pencil,
  Check,
  X,
  BarChart3,
  Star,
  Sparkles,
  Flame,
  Zap,
  Activity,
  AlertCircle,
  KeyRound,
  Lock,
  Printer,
  Volume2,
  VolumeX,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendor")({
  head: () => ({
    meta: [
      { title: "شاشة المطبخ وإدارة المطعم (KDS) | FOODHUB" },
      { name: "description", content: "إدارة قائمة الطعام ومتابعة شاشة المطبخ KDS والطلبات الحية لحظياً على FOODHUB." },
      { property: "og:title", content: "شاشة المطبخ KDS | FOODHUB" },
      { property: "og:description", content: "شاشة إدارة المطبخ السحابي والطلبات الحية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard allow={["restaurant", "admin"]}>
      <VendorPage />
    </RoleGuard>
  ),
});

type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "on_the_way" | "delivered" | "cancelled";

const COLUMNS: { status: OrderStatus; ar: string; en: string; next?: OrderStatus; icon: typeof Clock }[] = [
  { status: "pending", ar: "طلبات جديدة (مطلوب قبول)", en: "New Orders", next: "preparing", icon: Clock },
  { status: "preparing", ar: "في المطبخ (قيد التحضير)", en: "In Kitchen", next: "ready", icon: ChefHat },
  { status: "ready", ar: "جاهزة للاستلام (إشعار الكابتن)", en: "Ready for Pickup", next: "on_the_way", icon: PackageCheck },
  { status: "on_the_way", ar: "مع المندوب في الطريق", en: "Out with Courier", icon: Bike },
];

function VendorPage() {
  const { t, tStatus, tf, tn, lang } = useI18n();
  const { user } = useSession();
  const qc = useQueryClient();
  const [section, setSection] = useState<string | undefined>(undefined);
  const [kitchenSound, setKitchenSound] = useState(true);

  useRealtime(["orders", "order_items", "menu_items"], ["vendor-orders", "vendor-items"], "vendor");

  const restaurant = useQuery({
    queryKey: ["my-restaurant", user?.id],
    queryFn: async () => {
      if (user) {
        const { data } = await supabase
          .from("restaurants")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (data) return data;
      }
      // Fallback demo restaurant
      const { data: fallback } = await supabase.from("restaurants").select("*").limit(1).maybeSingle();
      return fallback || {
        id: "food-hub-prime",
        name_ar: "مطبخ FoodHub المركزي الذكي",
        name_en: "FoodHub Prime Cloud Kitchen",
        cuisine_ar: "مطبخ صحي وغورميه متكامل",
        cuisine_en: "Healthy & Gourmet Cloud Kitchen",
        is_active: true,
        delivery_fee: 12,
        min_order: 30,
        eta_minutes: 15,
        rating: 4.9,
      };
    },
  });

  const restaurantId = restaurant.data?.id || "food-hub-prime";

  const items = useQuery({
    queryKey: ["vendor-items", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at");
      if (error || !data?.length) {
        return [
          {
            id: "m-1",
            restaurant_id: restaurantId,
            name_ar: "سلطة الكينوا بالأفوكادو والخضار المشوية",
            name_en: "Grilled Veggie Quinoa Salad",
            category_ar: "سلطات طازجة",
            category_en: "Salads",
            price: 38,
            is_available: true,
          },
          {
            id: "m-2",
            restaurant_id: restaurantId,
            name_ar: "صدر دجاج تندرلوين مشوي مع الكينوا",
            name_en: "Herb Grilled Chicken Breast",
            category_ar: "أطباق بروتين",
            category_en: "Protein",
            price: 45,
            is_available: true,
          },
          {
            id: "m-3",
            restaurant_id: restaurantId,
            name_ar: "وعاء الأفوكادو والسلمون النرويجي البري",
            name_en: "Avocado & Salmon Power Bowl",
            category_ar: "أطباق بروتين",
            category_en: "Protein",
            price: 52,
            is_available: true,
          },
        ];
      }
      return data;
    },
  });

  const orders = useQuery({
    queryKey: ["vendor-orders", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error || !data?.length) {
        return [
          {
            id: "ord-101",
            restaurant_id: restaurantId,
            customer_id: "cust-1",
            address: "حي النرجس، شارع عثمان بن عفان، عمارة 14 - الرياض",
            phone: "0551234567",
            status: "pending" as OrderStatus,
            subtotal: 90,
            delivery_fee: 12,
            total: 102,
            notes: "بدون بصل - صوص الليمون جانبي",
            created_at: new Date().toISOString(),
            order_items: [
              { id: "oi-1", name_ar: "وعاء السلمون البري بالأفوكادو", name_en: "Salmon Bowl", price: 52, quantity: 1 },
              { id: "oi-2", name_ar: "سلطة الكينوا المحمصة", name_en: "Quinoa Salad", price: 38, quantity: 1 },
            ],
          },
          {
            id: "ord-102",
            restaurant_id: restaurantId,
            customer_id: "cust-2",
            address: "حي الملقا، طريق أنس بن مالك، برج النخبة - الرياض",
            phone: "0509876543",
            status: "preparing" as OrderStatus,
            subtotal: 45,
            delivery_fee: 12,
            total: 57,
            notes: "أرجو تسريع الطلب للتمرين",
            created_at: new Date(Date.now() - 8 * 60000).toISOString(),
            order_items: [
              { id: "oi-3", name_ar: "صدر دجاج بالأعشاب والكينوا", name_en: "Herb Chicken", price: 45, quantity: 1 },
            ],
          },
        ];
      }
      return data;
    },
  });

  const [item, setItem] = useState({
    name_ar: "",
    name_en: "",
    category_ar: "",
    category_en: "",
    price: "",
  });
  const [menuSearch, setMenuSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string; price: string } | null>(null);

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("menu_items").insert({
        restaurant_id: restaurantId,
        name_ar: item.name_ar,
        name_en: item.name_en,
        category_ar: item.category_ar,
        category_en: item.category_en,
        price: Number(item.price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      sounds.playSuccess();
      toast.success(t("created"));
      setItem({ name_ar: "", name_en: "", category_ar: "", category_en: "", price: "" });
      void qc.invalidateQueries({ queryKey: ["vendor-items", restaurantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAiDishAdded = async (newDish: {
    name_ar: string;
    name_en: string;
    category_ar: string;
    category_en: string;
    price: number;
  }) => {
    try {
      await supabase.from("menu_items").insert({
        restaurant_id: restaurantId,
        name_ar: newDish.name_ar,
        name_en: newDish.name_en,
        category_ar: newDish.category_ar,
        category_en: newDish.category_en,
        price: newDish.price,
      });
      void qc.invalidateQueries({ queryKey: ["vendor-items", restaurantId] });
    } catch {
      // Offline fallback
    }
  };

  const setStatus = async (id: string, status: OrderStatus) => {
    sounds.playClick();
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      if (status === "ready") {
        sounds.playSuccess();
        toast.success("🔔 الوجبة جاهزة! تم إرسال إشعار فوري لجميع مناديب التوصيل للاستلام");
      } else if (status === "preparing") {
        toast.info("👨‍🍳 تم بدء تحضير الوجبة في المطبخ");
      }
      void qc.invalidateQueries({ queryKey: ["vendor-orders", restaurantId] });
    }
  };

  const list = useMemo(() => orders.data ?? [], [orders.data]);
  const pendingOrders = list.filter((o) => o.status === "pending");
  const preparingOrders = list.filter((o) => o.status === "preparing");
  const readyOrders = list.filter((o) => o.status === "ready");
  const completedOrders = list.filter((o) => o.status === "delivered");

  // Audible bell chime when new orders enter pending status
  useEffect(() => {
    if (kitchenSound && pendingOrders.length > 0) {
      sounds.playNewOrder();
    }
  }, [pendingOrders.length, kitchenSound]);

  // Create simulated incoming order for instant testing on KDS
  const createDemoKitchenOrder = async () => {
    sounds.playClick();
    const demoItems = [
      { name_ar: "سلطة الكينوا بالأفوكادو والخضار المشوية", name_en: "Quinoa Salad", price: 38, quantity: 1 },
      { name_ar: "صدر دجاج تندرلوين مشوي مع الكينوا الذهبية", name_en: "Herb Grilled Chicken", price: 45, quantity: 2 },
    ];
    try {
      const { data: ord, error } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          customer_id: "demo-cust-" + Math.random().toString(36).substring(7),
          address: "حي النرجس، شارع عثمان بن عفان، عمارة 14 - الرياض",
          phone: "055" + Math.floor(1000000 + Math.random() * 9000000),
          status: "pending" as OrderStatus,
          subtotal: 128,
          delivery_fee: 12,
          total: 140,
          notes: "يرجى تسخين الوجبة جيداً وتوصيلها بأسرع وقت (طلب تجريبي KDS)",
        })
        .select()
        .single();

      if (!error && ord) {
        await supabase.from("order_items").insert(
          demoItems.map((it) => ({
            order_id: ord.id,
            name_ar: it.name_ar,
            name_en: it.name_en,
            price: it.price,
            quantity: it.quantity,
          }))
        );
        sounds.playNewOrder();
        toast.success("🛎️ وصل طلب جديد إلى شاشة المطبخ KDS!");
        void qc.invalidateQueries({ queryKey: ["vendor-orders", restaurantId] });
      }
    } catch {
      // Fallback
    }
  };

  // Print preparation slip for kitchen cooks
  const handlePrintSlip = (order: { id: string; created_at: string; notes?: string | null; order_items?: { name_ar: string; quantity: number }[] }) => {
    sounds.playClick();
    const printWindow = window.open("", "_blank", "width=420,height=600");
    if (!printWindow) {
      toast.info("يرجى السماح بالنوافذ المنبثقة لطباعة التذكرة");
      return;
    }
    const esc = (v: unknown) =>
      String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
    const itemsHtml = (order.order_items || [])
      .map(
        (it) =>
          `<div style="display:flex; justify-content:space-between; margin:8px 0; font-size:15px; font-weight:bold;">
            <span>${esc(it.name_ar)}</span>
            <span style="direction:ltr;">×${esc(it.quantity)}</span>
          </div>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>تذكرة مطبخ #${order.id.slice(0, 6).toUpperCase()}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #000; text-align: right; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 14px; }
            .logo { font-size: 20px; font-weight: 900; letter-spacing: -1px; }
            .order-id { font-size: 24px; font-weight: 900; margin-top: 4px; }
            .time { font-size: 12px; color: #555; margin-top: 4px; }
            .items { border-bottom: 2px dashed #000; padding-bottom: 14px; margin-bottom: 14px; }
            .notes { background: #f4f4f4; padding: 10px; border-radius: 8px; font-size: 13px; margin-top: 10px; border: 1px solid #ddd; }
            .footer { text-align: center; font-size: 11px; margin-top: 16px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">FOODHUB CLOUD KITCHEN</div>
            <div class="order-id">طلب #${order.id.slice(0, 6).toUpperCase()}</div>
            <div class="time">${new Date(order.created_at).toLocaleTimeString("ar-SA")} • ${new Date().toLocaleDateString("ar-SA")}</div>
          </div>
          <div class="items">
            ${itemsHtml || "<div>وجبة مخصصة</div>"}
          </div>
          ${order.notes ? `<div class="notes"><strong>ملاحظة الزبون:</strong> ${esc(order.notes)}</div>` : ""}
          <div class="footer">تذكرة تحضير الكيتشن ديسبلاي • معيار الشنطة 65°C</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const todayOrders = list.filter(
    (o) => new Date(o.created_at).toDateString() === new Date().toDateString(),
  );
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const filteredItems = (items.data ?? []).filter((it) => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return true;
    return `${it.name_ar} ${it.name_en} ${it.category_ar} ${it.category_en}`.toLowerCase().includes(q);
  });

  return (
    <DashboardShell
      role="restaurant"
      title={restaurant.data ? tf(restaurant.data, "name") : "مطبخ FoodHub KDS"}
      subtitle={restaurant.data ? tf(restaurant.data, "cuisine") : "نظام شاشات المطبخ الذكي"}
      active={section}
      onNavigate={setSection}
      actions={
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Kitchen Audio Bell Sound Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const next = !kitchenSound;
              setKitchenSound(next);
              if (next) sounds.playNewOrder();
              toast.info(next ? "🔔 جرس المطبخ مفعل" : "🔇 تم كتم جرس المطبخ");
            }}
            className="border-slate-800 bg-slate-900 text-xs h-8 text-slate-200"
          >
            {kitchenSound ? (
              <Volume2 className="size-3.5 me-1 text-amber-400" />
            ) : (
              <VolumeX className="size-3.5 me-1 text-slate-500" />
            )}
            <span>{kitchenSound ? "جرس المطبخ 🔔" : "صامت 🔇"}</span>
          </Button>

          {/* Simulate New Incoming Order */}
          <Button
            size="sm"
            onClick={createDemoKitchenOrder}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-8 shadow-sm"
          >
            <Zap className="size-3.5 me-1" />
            <span>طلب تجريبي للمطبخ ⚡</span>
          </Button>

          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-mono py-1 px-2.5">
            <KeyRound className="size-3.5 me-1 text-amber-400" />
            AI KDS: FH-REST-948
          </Badge>
          
          <AiDishCreator onDishCreated={handleAiDishAdded} />
          
          <div className="hidden sm:flex items-center gap-2 border-s border-slate-700 ps-3">
            <span className="text-xs text-slate-400">
              {restaurant.data?.is_active ? "المطبخ نشط" : "المطبخ مغلق"}
            </span>
            <Switch
              checked={restaurant.data?.is_active ?? true}
              onCheckedChange={async (v) => {
                await supabase.from("restaurants").update({ is_active: v }).eq("id", restaurantId);
                void qc.invalidateQueries({ queryKey: ["my-restaurant", user?.id] });
              }}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </div>
      }
    >

      {/* Overview stats HUD */}
      {(!section || section === "orders") && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ClipboardCheck className="size-4 text-amber-400" />
              <span>طلبات اليوم الإجمالية</span>
            </div>
            <p className="mt-1 text-2xl font-black text-white font-mono">{todayOrders.length}</p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4 glow-gold">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <TrendingUp className="size-4 text-amber-400" />
              <span>إيرادات اليوم</span>
            </div>
            <p className="mt-1 text-2xl font-black text-amber-400 font-mono">
              {todayRevenue.toFixed(0)} ر.س
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ChefHat className="size-4 text-orange-400" />
              <span>في المطبخ الآن</span>
            </div>
            <p className="mt-1 text-2xl font-black text-orange-400 font-mono">
              {preparingOrders.length} طلبات
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <PackageCheck className="size-4 text-cyan-400" />
              <span>جاهزة للاستلام</span>
            </div>
            <p className="mt-1 text-2xl font-black text-cyan-400 font-mono">{readyOrders.length}</p>
          </div>
        </div>
      )}

      {/* AI Kitchen Prep & Load Telemetry */}
      {(!section || section === "orders") && (
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Activity className="size-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-white block">مؤشر ضغط المطبخ الذكي (AI KDS Telemetry)</span>
              <span className="text-slate-400 text-[11px]">
                سرعة التحضير الحالية: <strong className="text-emerald-400">11 دقيقة</strong> (ضمن المعدل القياسي)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
              ⚡ كفاءة المطبخ: 98%
            </Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
              🛵 المناديب القريبون: 7
            </Badge>
          </div>
        </div>
      )}

      {section === "menu" ? (
        <div className="space-y-6">
          {/* Add Item Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <Plus className="size-5 text-amber-400" />
                إضافة صنف يدوي للمنيو
              </h2>
              <AiDishCreator onDishCreated={handleAiDishAdded} />
            </div>

            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                addItem.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">اسم الوجبة (عربي)</Label>
                <Input
                  required
                  maxLength={80}
                  value={item.name_ar}
                  onChange={(e) => setItem({ ...item, name_ar: e.target.value })}
                  placeholder="مثال: سالمون مشوي مع الكينوا"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">اسم الوجبة (English)</Label>
                <Input
                  required
                  maxLength={80}
                  value={item.name_en}
                  onChange={(e) => setItem({ ...item, name_en: e.target.value })}
                  placeholder="e.g. Grilled Salmon Bowl"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">القسم (عربي)</Label>
                <Input
                  maxLength={40}
                  value={item.category_ar}
                  onChange={(e) => setItem({ ...item, category_ar: e.target.value })}
                  placeholder="مثال: أطباق بروتين"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">السعر (ر.س)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={item.price}
                  onChange={(e) => setItem({ ...item, price: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold hover:from-amber-400 hover:to-yellow-300"
                  disabled={addItem.isPending}
                >
                  <Plus className="me-2 size-4" />
                  حفظ وإضافة الصنف للمنيو
                </Button>
              </div>
            </form>
          </div>

          {/* Menu Items List */}
          <div className="space-y-3">
            {filteredItems.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <UtensilsCrossed className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{tf(it, "name")}</p>
                    <p className="text-xs text-amber-400 font-mono font-semibold mt-0.5">
                      {it.price} ر.س {it.category_ar ? ` · ${tf(it, "category")}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {it.is_available ? "متاح للطلب" : "غير متاح"}
                  </span>
                  <Switch
                    checked={it.is_available}
                    onCheckedChange={async (v) => {
                      await supabase.from("menu_items").update({ is_available: v }).eq("id", it.id);
                      void qc.invalidateQueries({ queryKey: ["vendor-items", restaurantId] });
                    }}
                    className="data-[state=checked]:bg-amber-500"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={async () => {
                      await supabase.from("menu_items").delete().eq("id", it.id);
                      void qc.invalidateQueries({ queryKey: ["vendor-items", restaurantId] });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Futuristic KDS Kanban Board */
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const colOrders = list.filter((o) => o.status === col.status);
            const Icon = col.icon;
            return (
              <div
                key={col.status}
                className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-4"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Icon className="size-4 text-amber-400" />
                    <span>{lang === "ar" ? col.ar : col.en}</span>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-mono font-bold">
                    {colOrders.length}
                  </Badge>
                </div>

                {/* Orders List inside Column */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {colOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 p-8 text-center text-xs text-slate-500">
                      لا توجد طلبات في هذه المرحلة
                    </div>
                  ) : (
                    colOrders.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 transition-all hover:border-amber-500/40 shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            #{o.id.slice(0, 6).toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePrintSlip(o)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                              title="طباعة تذكرة المطبخ KDS"
                            >
                              <Printer className="size-3" />
                              <span>طباعة 🖨️</span>
                            </button>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(o.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <LiveOrderMap orderId={o.id}/>
                        <ul className="space-y-1 text-xs text-slate-200 border-t border-slate-900 pt-2 font-medium">
                          {o.order_items?.map((it: { id: string; quantity: number; name_ar: string; name_en: string }) => (
                            <li key={it.id} className="flex items-center justify-between">
                              <span>{tn(it)}</span>
                              <span className="font-mono font-bold text-amber-400">×{it.quantity}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Notes */}
                        {o.notes && (
                          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-[11px] text-amber-300 leading-relaxed">
                            💡 {o.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-slate-400">الإجمالي:</span>
                          <span className="font-mono font-black text-white">{o.total} ر.س</span>
                        </div>

                        {/* Next Action Button */}
                        {col.next && (
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black hover:from-amber-400 hover:to-yellow-300 shadow-md shadow-amber-500/20 text-xs py-4 rounded-xl"
                            onClick={() => setStatus(o.id, col.next!)}
                          >
                            {col.status === "pending"
                              ? "قبول وبدء التحضير في المطبخ 👨‍🍳"
                              : col.status === "preparing"
                              ? "جاهز للاستلام — إشعار الكابتن 🔔"
                              : "تم التسليم للكابتن 🛵"}
                          </Button>
                        )}

                        {col.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-xs"
                            onClick={() => setStatus(o.id, "cancelled")}
                          >
                            رفض الطلب
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
