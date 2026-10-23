import { useState, useMemo } from "react";
import {
  MapPin,
  Search,
  Flame,
  Clock,
  Star,
  Plus,
  Minus,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  Zap,
  Home,
  UtensilsCrossed,
  Radar,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Share2,
  Phone,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  DollarSign,
  Gift,
  Bike,
  Store,
  Navigation,
  CheckCircle2,
  RotateCcw,
  Tag,
  Heart,
  ChevronLeft,
  Wallet,
  Award,
  Bell,
  Sliders,
  Receipt,
  Car,
  CheckCheck,
  Compass,
  Layers,
  Info,
  Calendar,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { sounds } from "@/lib/sound-effects";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveTrackingList } from "./live-tracking-list";
import { CustomerDiscovery } from "./customer-discovery";
import { FoodHubLogo } from "@/components/food-hub-logo";

// ============================================================================
// RIYADH LOCALITIES & DISTRICTS
// ============================================================================
const DISTRICTS = [
  "حي النرجس، شمال الرياض (شارع أنس بن مالك)",
  "حي الملقا، طريق الإمام سعود",
  "حي حطين، البوليفارد",
  "حي الياسمين، مخرج 5",
  "حي الصحافة، شارع العليا",
  "حي العليا، وسط الرياض",
  "حي الروضة، شرق الرياض",
  "حي النخيل، طريق التخصصي",
];

// ============================================================================
// DAILY PROMO STORIES (Instagram/Snapchat Style)
// ============================================================================
const STORIES = [
  { id: "s1", titleAr: "خصم 50%", titleEn: "50% OFF", emoji: "🔥", tag: "كود: FOOD50", code: "FOOD50", discount: 50 },
  { id: "s2", titleAr: "توصيل 0 ر.س", titleEn: "Free Delivery", emoji: "🛵", tag: "أول 3 طلبات", code: "FREE3", discount: "delivery" },
  { id: "s3", titleAr: "كيتو وهيلثي", titleEn: "Keto & Health", emoji: "🥑", tag: "ماكروز دقيقة", code: "KETO10", discount: 10 },
  { id: "s4", titleAr: "أقوى برجر", titleEn: "Top Burgers", emoji: "🍔", tag: "لحم أنجوس 100%", code: "BURGER", discount: 15 },
  { id: "s5", titleAr: "شاورما حطب", titleEn: "Shawarma", emoji: "🌯", tag: "ثومية إضافية", code: "SHAWARMA", discount: 10 },
  { id: "s6", titleAr: "قهوة وسويت", titleEn: "Sweets & Cafe", emoji: "🍰", tag: "قهوة مختصة", code: "SWEET", discount: 15 },
];

// ============================================================================
// FOOD CATEGORIES
// ============================================================================
const CATEGORIES = [
  { id: "all", nameAr: "الكل", nameEn: "All", emoji: "🍽️" },
  { id: "burger", nameAr: "برجر وسلايدرز", nameEn: "Burgers", emoji: "🍔" },
  { id: "shawarma", nameAr: "شاورما ومشاوي", nameEn: "Shawarma", emoji: "🌯" },
  { id: "healthy", nameAr: "صحي وكيتو", nameEn: "Healthy & Keto", emoji: "🥗" },
  { id: "pizza", nameAr: "بيتزا وباستا", nameEn: "Pizza", emoji: "🍕" },
  { id: "sweets", nameAr: "حلى وتشيزكيك", nameEn: "Desserts", emoji: "🍰" },
  { id: "drinks", nameAr: "قهوة وعصائر", nameEn: "Beverages", emoji: "☕" },
  { id: "cloud", nameAr: "مطابخ سحابية", nameEn: "Cloud Kitchens", emoji: "☁️" },
];

// ============================================================================
// CLOUD KITCHENS & RESTAURANTS DATA
// ============================================================================
export interface Restaurant {
  id: string;
  nameAr: string;
  nameEn: string;
  tagAr: string;
  rating: number;
  reviews: number;
  eta: string;
  deliveryFee: number;
  minOrder: number;
  category: string;
  image: string;
  coverImage: string;
  badge: string;
  districtAr: string;
  distanceKm: number;
  menu: Meal[];
}

export interface Meal {
  id: string;
  restaurantId: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  price: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: string;
  image: string;
  isPopular?: boolean;
}

const RESTAURANTS_DATA: Restaurant[] = [
  {
    id: "fh-prime",
    nameAr: "مطبخ فود هب المركزي (FoodHub Prime)",
    nameEn: "FoodHub Prime Cloud Kitchen",
    tagAr: "مطبخ سحابي موثق ⚡",
    rating: 4.95,
    reviews: 1420,
    eta: "15-20 دقيقة",
    deliveryFee: 0,
    minOrder: 25,
    category: "healthy",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&auto=format&fit=crop&q=80",
    badge: "الأكثر طلباً بالرياض",
    districtAr: "حي العليا (وسط الرياض)",
    distanceKm: 3.2,
    menu: [
      {
        id: "meal-prime-1",
        restaurantId: "fh-prime",
        nameAr: "وعاء السلمون المشوي مع الكينوا (كيتو)",
        nameEn: "Grilled Salmon Quinoa Keto Bowl",
        descAr: "فيليه سلمون نرويجي طازج مع كينوا عضوية، أفوكادو، وخضار سوتيه بصلصة الليمون",
        price: 49,
        calories: 410,
        proteinG: 38,
        carbsG: 18,
        fatG: 14,
        category: "healthy",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
      {
        id: "meal-prime-2",
        restaurantId: "fh-prime",
        nameAr: "صدر دجاج تندرلوين مشوي مع أرز الزعفران",
        nameEn: "Tenderloin Chicken Breast with Saffron Rice",
        descAr: "صدر دجاج متبل بالأعشاب الطبيعية مع أرز بسمتي معطر بالزعفران وخضار مشكلة",
        price: 36,
        calories: 460,
        proteinG: 44,
        carbsG: 45,
        fatG: 8,
        category: "healthy",
        image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
      {
        id: "meal-prime-3",
        restaurantId: "fh-prime",
        nameAr: "سلطة الكيل بالأفوكادو وجوز البيكان",
        nameEn: "Kale Avocado Pecan Super Salad",
        descAr: "أوراق الكيل الطازجة مع جوز البيكان المحمص، جبن فيتا لايت، وخل البلسميك المركز",
        price: 29,
        calories: 280,
        proteinG: 12,
        carbsG: 14,
        fatG: 16,
        category: "healthy",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "fh-burger",
    nameAr: "سماش أنجوس كلود برجر",
    nameEn: "Smash Angus Cloud Burger",
    tagAr: "برجر أنجوس فاخر 🍔",
    rating: 4.92,
    reviews: 980,
    eta: "15-22 دقيقة",
    deliveryFee: 9,
    minOrder: 30,
    category: "burger",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    coverImage: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=900&auto=format&fit=crop&q=80",
    badge: "أنجوس أسود 100%",
    districtAr: "حي الملقا (شارع أنس)",
    distanceKm: 2.4,
    menu: [
      {
        id: "meal-burger-1",
        restaurantId: "fh-burger",
        nameAr: "سماش برجر كلاسيك دبل تشيز",
        nameEn: "Classic Double Cheese Smash Burger",
        descAr: "شريحتين لحم أنجوس فاخر مشوية على الصاج مع جبنة شيدر ذائبة وصوص فود هب السري",
        price: 34,
        calories: 520,
        proteinG: 34,
        carbsG: 38,
        fatG: 24,
        category: "burger",
        image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
      {
        id: "meal-burger-2",
        restaurantId: "fh-burger",
        nameAr: "ترافل بيكون سماش برجر",
        nameEn: "Truffle Bacon Smash Burger",
        descAr: "لحم أنجوس مدخن مع صوص الكمأة السوداء وبيكون بقري مقرمش وبصل مكرمل",
        price: 42,
        calories: 610,
        proteinG: 38,
        carbsG: 40,
        fatG: 29,
        category: "burger",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
      {
        id: "meal-burger-3",
        restaurantId: "fh-burger",
        nameAr: "بطاطس كرينكل المقرمشة ببهارات الكاجن",
        nameEn: "Crispy Cajun Crinkle Fries",
        descAr: "بطاطس ذهبية مقرمشة متبلة ببهارات الكاجن اللذيذة مع صوص الشيدر الذائب",
        price: 14,
        calories: 320,
        proteinG: 4,
        carbsG: 42,
        fatG: 14,
        category: "burger",
        image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "fh-shawarma",
    nameAr: "شاورما الحطب الأصلية",
    nameEn: "Original Woodfire Shawarma",
    tagAr: "مشاوي وشاورما 🌯",
    rating: 4.89,
    reviews: 1250,
    eta: "12-18 دقيقة",
    deliveryFee: 9,
    minOrder: 20,
    category: "shawarma",
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80",
    coverImage: "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=900&auto=format&fit=crop&q=80",
    badge: "خبز صاج طازج",
    districtAr: "حي الياسمين (مخرج 5)",
    distanceKm: 4.1,
    menu: [
      {
        id: "meal-shawarma-1",
        restaurantId: "fh-shawarma",
        nameAr: "صحن شاورما عربي دجاج مع ثومية وبطاطس",
        nameEn: "Arabic Chicken Shawarma Plate",
        descAr: "شاورما دجاج متبلة 24 ساعة ومقطعة قطع صغيرة بخبز الصاج مع بطاطس مقرمشة وثومية طازجة",
        price: 28,
        calories: 480,
        proteinG: 32,
        carbsG: 44,
        fatG: 18,
        category: "shawarma",
        image: "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
      {
        id: "meal-shawarma-2",
        restaurantId: "fh-shawarma",
        nameAr: "صاروخ شاورما لحم بلدي بالمخلل والطحينة",
        nameEn: "Beef Shawarma Jumbo Wrap",
        descAr: "لحم بقري محلي مشوي على لهب الحطب مع بقدونس، طماطم، طحينة فاخرة وخيار مخلل",
        price: 24,
        calories: 430,
        proteinG: 28,
        carbsG: 36,
        fatG: 16,
        category: "shawarma",
        image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "fh-pizza",
    nameAr: "أرتيزان نابولي بيتزا",
    nameEn: "Artisan Napoli Pizza Kitchen",
    tagAr: "بيتزا إيطالية مخمرة 🍕",
    rating: 4.93,
    reviews: 640,
    eta: "18-25 دقيقة",
    deliveryFee: 0,
    minOrder: 35,
    category: "pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    coverImage: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=900&auto=format&fit=crop&q=80",
    badge: "مخمرة 48 ساعة",
    districtAr: "حي حطين (البوليفارد)",
    distanceKm: 3.8,
    menu: [
      {
        id: "meal-pizza-1",
        restaurantId: "fh-pizza",
        nameAr: "بيتزا تروفل بالمشروم والموزاريلا الإيطالية",
        nameEn: "Truffle Mushroom Artisan Pizza",
        descAr: "عجينة نابولية رقيقة مع زيت التروفل الأسود المركز وموزاريلا بافلو طازجة وفطر بري",
        price: 42,
        calories: 620,
        proteinG: 24,
        carbsG: 68,
        fatG: 22,
        category: "pizza",
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
      {
        id: "meal-pizza-2",
        restaurantId: "fh-pizza",
        nameAr: "بيتزا مارغريتا كلاسيكية بصلصة سان مارزانو",
        nameEn: "Classic Margherita Pizza",
        descAr: "صلصة طماطم إيطالية أصيلة مع ريحان طازج وجبنة موزاريلا مقرمشة الحواف",
        price: 36,
        calories: 540,
        proteinG: 20,
        carbsG: 65,
        fatG: 18,
        category: "pizza",
        image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "fh-sweets",
    nameAr: "سان سيباستيان & كافيه",
    nameEn: "San Sebastian Cheesecake & Cafe",
    tagAr: "حلى فاخر وقهوة مختصة 🍰",
    rating: 4.96,
    reviews: 1100,
    eta: "10-16 دقيقة",
    deliveryFee: 0,
    minOrder: 20,
    category: "sweets",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80",
    coverImage: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&auto=format&fit=crop&q=80",
    badge: "شوكولاتة بلجيكية",
    districtAr: "حي النرجس (طريق الملك فهد)",
    distanceKm: 1.8,
    menu: [
      {
        id: "meal-sweet-1",
        restaurantId: "fh-sweets",
        nameAr: "تشيز كيك سان سيباستيان مع صوص شوكولاتة بلجيكية",
        nameEn: "San Sebastian Cheesecake with Belgian Chocolate",
        descAr: "كيكة الجبن الإسبانية المحروقة بقوام كريمي ناعم مغطاة بغزارة بصوص الشوكولاتة البلجيكية الدافئة",
        price: 26,
        calories: 340,
        proteinG: 8,
        carbsG: 32,
        fatG: 20,
        category: "sweets",
        image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
      {
        id: "meal-sweet-2",
        restaurantId: "fh-sweets",
        nameAr: "سبانش لاتيه بارد بحليب الشوفان والكراميل",
        nameEn: "Iced Spanish Latte (Oat Milk)",
        descAr: "شوت إسبريسو كولومبي مركز مع حليب الشوفان الخفيف وطبقة صوص كراميل ذهبي",
        price: 19,
        calories: 160,
        proteinG: 4,
        carbsG: 22,
        fatG: 5,
        category: "drinks",
        image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80",
        isPopular: true,
      },
    ],
  },
];

// Flat list of all popular meals across restaurants
const ALL_POPULAR_MEALS: Meal[] = RESTAURANTS_DATA.flatMap((r) => r.menu);

// ============================================================================
// CUSTOMER MOBILE SUPER-APP COMPONENT
// ============================================================================
export function CustomerMobileApp() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const cart = useCart();

  // Navigation Stack & Tabs
  type TabId = "home" | "kitchens" | "cart" | "radar" | "profile";
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [historyStack, setHistoryStack] = useState<TabId[]>(["home"]);

  // District Location Picker
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0] ?? "");
  const [districtModalOpen, setDistrictModalOpen] = useState(false);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Sub-Views
  const [activeStory, setActiveStory] = useState<(typeof STORIES)[0] | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [customizingMeal, setCustomizingMeal] = useState<Meal | null>(null);

  // Meal Customizer State
  const [customSize, setCustomSize] = useState<"regular" | "double" | "combo">("regular");
  const [customBread, setCustomBread] = useState<string>("خبز بطاطس بريوش طازج");
  const [customExtras, setCustomExtras] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [customQty, setCustomQty] = useState<number>(1);

  // Checkout Flow State
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountSar: number } | null>({
    code: "FOOD50",
    discountSar: 15,
  });
  const [selectedPayment, setSelectedPayment] = useState<"apple_pay" | "mada" | "stc_pay" | "wallet" | "cash">("apple_pay");
  const [selectedTip, setSelectedTip] = useState<number>(3); // 3 SAR default captain tip

  // Customer Wallet & Loyalty Points
  const [walletBalance, setWalletBalance] = useState<number>(85.0);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(350);

  // Live Radar & Order Tracking State
  interface LiveOrder {
    id: string;
    orderNumber: string;
    otp: string; // Secret 4-digit code to give to captain
    step: 1 | 2 | 3 | 4; // 1: Confirmed, 2: Preparing, 3: On The Way, 4: At Door
    restaurantName: string;
    items: string[];
    totalSar: number;
    estimatedMinutes: number;
    captain: {
      name: string;
      phone: string;
      vehicle: string;
      plate: string;
      rating: number;
      deliveriesCount: number;
    };
  }

  const [activeLiveOrder, setActiveLiveOrder] = useState<LiveOrder | null>({
    id: "ord-8831",
    orderNumber: "#4892",
    otp: "4492",
    step: 3,
    restaurantName: "سماش أنجوس كلود برجر",
    items: ["سماش برجر كلاسيك دبل تشيز (x1)", "بطاطس كرينكل بهارات كاجن (x1)"],
    totalSar: 48.0,
    estimatedMinutes: 9,
    captain: {
      name: "كابتن أحمد الشمري",
      phone: "0559876543",
      vehicle: "دراجة نارية (Yamaha 150)",
      plate: "أ ب ج 4492",
      rating: 4.96,
      deliveriesCount: 142,
    },
  });

  // Post-Delivery 360° Rating & 1 SAR Captain Bonus Modal
  const [ratingModalOpen, setRatingModalOpen] = useState<boolean>(false);
  const [restaurantStars, setRestaurantStars] = useState<number>(5);
  const [captainStars, setCaptainStars] = useState<number>(5);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  // Past Orders History for Profile
  const [pastOrders, setPastOrders] = useState([
    {
      id: "ord-8820",
      orderNum: "#4885",
      restaurant: "مطبخ فود هب المركزي (FoodHub Prime)",
      items: "وعاء السلمون المشوي مع الكينوا (كيتو)",
      date: "أمس، 08:30 م",
      price: 49.0,
      status: "تم التسليم بنجاح",
    },
    {
      id: "ord-8812",
      orderNum: "#4871",
      restaurant: "سان سيباستيان & كافيه",
      items: "تشيز كيك سان سيباستيان + سبانش لاتيه بارد",
      date: "25 سبتمبر، 04:15 م",
      price: 45.0,
      status: "تم التسليم بنجاح",
    },
  ]);

  // Handle Tab Navigation with History Stack
  const navigateToTab = (tab: TabId) => {
    sounds.playClick();
    setSelectedRestaurant(null);
    setCustomizingMeal(null);
    setHistoryStack((prev) => [...prev, tab]);
    setActiveTab(tab);
  };

  const handleGoBack = () => {
    sounds.playClick();
    if (customizingMeal) {
      setCustomizingMeal(null);
      return;
    }
    if (selectedRestaurant) {
      setSelectedRestaurant(null);
      return;
    }
    if (historyStack.length > 1) {
      const nextStack = [...historyStack];
      nextStack.pop();
      const previous = nextStack[nextStack.length - 1] ?? "home";
      setHistoryStack(nextStack);
      setActiveTab(previous);
    } else {
      setActiveTab("home");
    }
  };

  // Quick Add To Cart from Feed
  const handleQuickAdd = (meal: Meal) => {
    sounds.playAdd();
    cart.add({
      id: meal.id,
      restaurant_id: meal.restaurantId,
      name_ar: meal.nameAr,
      name_en: meal.nameEn,
      price: meal.price,
    });
    toast.success(ar ? `✓ أُضيف للسلة: ${meal.nameAr}` : `✓ Added to Cart: ${meal.nameEn}`, {
      description: `${meal.price} ${ar ? "ر.س" : "SAR"}`,
      duration: 1500,
    });
  };

  // Open Meal Customizer
  const handleOpenCustomizer = (meal: Meal) => {
    sounds.playClick();
    setCustomizingMeal(meal);
    setCustomSize("regular");
    setCustomBread("خبز بطاطس بريوش طازج");
    setCustomExtras([]);
    setCustomInstructions("");
    setCustomQty(1);
  };

  // Calculate Custom Meal Total Price
  const customMealPrice = useMemo(() => {
    if (!customizingMeal) return 0;
    let base = customizingMeal.price;
    if (customSize === "double") base += 8;
    if (customSize === "combo") base += 14;
    base += customExtras.length * 3;
    return base * customQty;
  }, [customizingMeal, customSize, customExtras, customQty]);

  // Confirm Customizer Add to Cart
  const handleConfirmCustomAdd = () => {
    if (!customizingMeal) return;
    sounds.playAdd();
    cart.add({
      id: `${customizingMeal.id}-${customSize}-${customExtras.join("-")}`,
      restaurant_id: customizingMeal.restaurantId,
      name_ar: `${customizingMeal.nameAr} (${customSize === "combo" ? "وجبة كومبو" : customSize === "double" ? "دبل" : "عادي"})`,
      name_en: `${customizingMeal.nameEn} (${customSize})`,
      price: customMealPrice / customQty,
    });
    toast.success(ar ? `✓ تم تخصيص وإضافة: ${customizingMeal.nameAr}` : `✓ Customized and Added!`, {
      description: `${customMealPrice} ${ar ? "ر.س" : "SAR"}`,
    });
    setCustomizingMeal(null);
  };

  // Cart Calculations
  const cartSubtotal = cart.subtotal;
  const deliveryFee = cartSubtotal > 50 || appliedPromo?.code === "FREE3" ? 0 : 9;
  const promoDiscount = appliedPromo ? Math.min(appliedPromo.discountSar, cartSubtotal) : 0;
  const vatTax = Math.round((cartSubtotal - promoDiscount) * 0.15 * 100) / 100;
  const cartTotal = Math.max(0, cartSubtotal - promoDiscount + deliveryFee + vatTax + selectedTip);
  const totalItemCount = cart.lines.reduce((sum, item) => sum + item.quantity, 0);

  // Apply Promo Code
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    sounds.playClick();
    if (code === "FOOD50") {
      setAppliedPromo({ code: "FOOD50", discountSar: 15 });
      toast.success(ar ? "🎉 تم تفعيل خصم 50% (وفرت 15 ر.س)" : "FOOD50 applied!");
    } else if (code === "FREE3") {
      setAppliedPromo({ code: "FREE3", discountSar: 9 });
      toast.success(ar ? "🎉 تم تفعيل التوصيل المجاني!" : "Free Delivery applied!");
    } else if (code === "KETO10") {
      setAppliedPromo({ code: "KETO10", discountSar: 10 });
      toast.success(ar ? "🎉 تم تفعيل خصم الكيتو 10 ر.س" : "KETO10 applied!");
    } else {
      toast.error(ar ? "كود الخصم غير صحيح أو منتهي الصلاحية" : "Invalid promo code");
    }
  };

  // Confirm Order & Place to Radar
  const handlePlaceOrder = () => {
    if (cart.lines.length === 0) {
      toast.error(ar ? "السلة فارغة حالياً!" : "Cart is empty!");
      return;
    }
    sounds.playSuccess();
    const newOrderNum = `#${Math.floor(4900 + Math.random() * 90)}`;
    const newOtp = `${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: LiveOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: newOrderNum,
      otp: newOtp,
      step: 1,
      restaurantName: selectedRestaurant?.nameAr || "سماش أنجوس كلود برجر",
      items: cart.lines.map((l) => `${l.name_ar} (x${l.quantity})`),
      totalSar: cartTotal,
      estimatedMinutes: 18,
      captain: {
        name: "كابتن أحمد الشمري",
        phone: "0559876543",
        vehicle: "دراجة نارية (Yamaha 150)",
        plate: "أ ب ج 4492",
        rating: 4.96,
        deliveriesCount: 142,
      },
    };

    setActiveLiveOrder(newOrder);
    cart.clear();
    setHistoryStack((prev) => [...prev, "radar"]);
    setActiveTab("radar");
    toast.success(ar ? "🎉 تم تأكيد طلبك بنجاح! جاري تحضيره ومتابعته على الرادار المباشر." : "Order placed successfully!");
  };

  // Submit Post-Delivery Rating with 1 SAR Bonus Highlight
  const handleSubmitRating = () => {
    sounds.playSuccess();
    setRatingSubmitted(true);
    setLoyaltyPoints((prev) => prev + 50);

    setTimeout(() => {
      setRatingModalOpen(false);
      setRatingSubmitted(false);
      toast.success(ar ? "شكراً لتقييمك! أُضيفت 50 نقطة ولاء لمحفظتك 🌟" : "Thank you for your rating! +50 Points added");
    }, 2200);
  };

  // Re-Order 1-Click Action
  const handleReorder = (order: (typeof pastOrders)[0]) => {
    sounds.playAdd();
    cart.add({
      id: `reorder-${order.id}`,
      restaurant_id: "fh-prime",
      name_ar: order.items,
      name_en: order.items,
      price: order.price,
    });
    setHistoryStack((prev) => [...prev, "cart"]);
    setActiveTab("cart");
    toast.success(ar ? "✓ تم تجهيز طلبك في السلة بنقرة واحدة!" : "Order loaded into cart!");
  };

  // Filter meals for home search
  const filteredMeals = useMemo(() => {
    return ALL_POPULAR_MEALS.filter((meal) => {
      const matchesCategory = selectedCategory === "all" || meal.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        meal.nameAr.includes(searchQuery) ||
        meal.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="foodhub-customer" dir={ar ? "rtl" : "ltr"}>
      <div className="customer-app-shell">
        <header className="customer-app-header">
          <FoodHubLogo size={38} showText={false} />
          <div className="customer-header-brand"><strong>FOODHUB</strong><Button variant="ghost" onClick={() => setDistrictModalOpen(true)} className="customer-location"><MapPin /><span>{selectedDistrict.split("،")[0]}</span><ChevronDown /></Button></div>
          <Button variant="outline" size="icon" onClick={() => navigateToTab("radar")} aria-label="تتبع طلباتي" className="customer-header-orders"><Receipt /></Button>
        </header>

        {/* ==================================================== */}
        {/* MAIN SCROLLABLE APP BODY                             */}
        {/* ==================================================== */}
        <main className="customer-app-body no-scrollbar">
          {/* -------------------------------------------------- */}
          {/* TAB 1: HOME FEED VIEW                              */}
          {/* -------------------------------------------------- */}
          {(activeTab === "home" || activeTab === "kitchens") && !selectedRestaurant && <CustomerDiscovery
            ar={ar} categories={CATEGORIES} category={selectedCategory} onCategory={setSelectedCategory}
            search={searchQuery} onSearch={setSearchQuery} meals={filteredMeals} restaurants={RESTAURANTS_DATA}
            onRestaurant={setSelectedRestaurant} onMeal={handleOpenCustomizer} onAdd={handleQuickAdd}
            onBrowse={() => navigateToTab("kitchens")} directory={activeTab === "kitchens"}
          />}

          {/* -------------------------------------------------- */}
          {/* RESTAURANT FULL MENU VIEW                          */}
          {/* -------------------------------------------------- */}
          {selectedRestaurant && (
            <div className="space-y-4">
              {/* Cover & Back Header */}
              <div className="relative h-44 w-full">
                <img
                  src={selectedRestaurant.coverImage}
                  alt={selectedRestaurant.nameAr}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card to-card" />

                <Button variant="ghost"
                  onClick={handleGoBack}
                  className="absolute top-3 start-3 size-9 rounded-xl bg-card backdrop-blur-md text-foreground border border-border flex items-center justify-center hover:bg-card active:scale-95 transition-transform"
                  title="رجوع"
                >
                  <ChevronRight className="size-5" />
                </Button>

                <div className="absolute bottom-3 start-3 end-3 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-foreground font-black">
                      {selectedRestaurant.tagAr}
                    </span>
                    <h2 className="text-base font-black text-foreground mt-1">
                      {selectedRestaurant.nameAr}
                    </h2>
                    <p className="text-[10px] text-foreground flex items-center gap-1">
                      <MapPin className="size-3 text-foreground" />
                      {selectedRestaurant.districtAr} • {selectedRestaurant.distanceKm} كم
                    </p>
                  </div>
                  <div className="text-left bg-card backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-border">
                    <span className="text-xs font-black text-foreground flex items-center gap-1 font-mono">
                      <Star className="size-3 fill-primary" />
                      {selectedRestaurant.rating}
                    </span>
                    <span className="text-[9px] text-foreground block font-mono">
                      {selectedRestaurant.reviews} تقييم
                    </span>
                  </div>
                </div>
              </div>

              {/* Restaurant Stats Bar */}
              <div className="grid grid-cols-3 gap-2 px-3 text-center text-xs">
                <div className="p-2.5 rounded-2xl bg-card border border-border">
                  <span className="text-[10px] text-foreground block">وقت التوصيل</span>
                  <span className="font-bold text-foreground font-mono mt-0.5 block">
                    {selectedRestaurant.eta}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-card border border-border">
                  <span className="text-[10px] text-foreground block">رسوم التوصيل</span>
                  <span className="font-bold text-foreground font-mono mt-0.5 block">
                    {selectedRestaurant.deliveryFee === 0 ? "مجاني" : `${selectedRestaurant.deliveryFee} ر.س`}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-card border border-border">
                  <span className="text-[10px] text-foreground block">الحد الأدنى</span>
                  <span className="font-bold text-foreground font-mono mt-0.5 block">
                    {selectedRestaurant.minOrder} ر.س
                  </span>
                </div>
              </div>

              {/* Restaurant Menu Items */}
              <div className="p-3 space-y-2.5">
                <h4 className="text-xs font-bold text-foreground px-1 flex items-center gap-1.5">
                  <UtensilsCrossed className="size-3.5 text-foreground" />
                  قائمة وجبات المطعم
                </h4>

                <div className="space-y-2.5">
                  {selectedRestaurant.menu.map((meal) => (
                    <div
                      key={meal.id}
                      className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 hover:border-border transition-colors"
                    >
                      <div
                        onClick={() => handleOpenCustomizer(meal)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <img
                          src={meal.image}
                          alt={meal.nameAr}
                          className="size-16 rounded-xl object-cover shrink-0 border border-border"
                        />
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-foreground truncate">{meal.nameAr}</h5>
                          <p className="text-[10.5px] text-foreground line-clamp-1">{meal.descAr}</p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-xs font-black text-foreground font-mono">
                              {meal.price} ر.س
                            </span>
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-card text-foreground font-mono">
                              {meal.calories} كالوري
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <Button variant="ghost"
                          onClick={() => handleQuickAdd(meal)}
                          className="size-8 rounded-xl bg-primary hover:bg-primary active:scale-95 text-foreground flex items-center justify-center font-black shadow-md shadow-card transition-all"
                          title="إضافة للسلة"
                        >
                          <Plus className="size-4 stroke-[3]" />
                        </Button>
                        <Button variant="ghost"
                          onClick={() => handleOpenCustomizer(meal)}
                          className="text-[9.5px] text-foreground hover:text-foreground"
                        >
                          تخصيص
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------- */}
          {/* TAB 2: KITCHENS DIRECTORY                          */}
          {/* -------------------------------------------------- */}
          {/* -------------------------------------------------- */}
          {/* TAB 3: SMART CART & CHECKOUT                       */}
          {/* -------------------------------------------------- */}
          {activeTab === "cart" && (
            <div className="p-3.5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShoppingBag className="size-4 text-foreground" />
                  سلة الشراء وتأكيد الطلب
                </h3>
                {cart.lines.length > 0 && (
                  <Button variant="ghost"
                    onClick={() => {
                      sounds.playClick();
                      cart.clear();
                      toast.info(ar ? "تم تفريغ السلة" : "Cart cleared");
                    }}
                    className="text-[11px] text-foreground hover:underline"
                  >
                    تفريغ السلة
                  </Button>
                )}
              </div>

              {cart.lines.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="size-16 rounded-full bg-card border border-border flex items-center justify-center mx-auto text-3xl">
                    🛒
                  </div>
                  <h4 className="text-sm font-bold text-foreground">سلتك فارغة حالياً</h4>
                  <p className="text-xs text-foreground max-w-xs mx-auto">
                    استكشف وجبات ومطابخ الرياض السحابية وأضف أطباقك المفضلة لتجربة توصيل خارقة.
                  </p>
                  <Button
                    onClick={() => navigateToTab("home")}
                    className="bg-primary hover:bg-primary text-foreground font-bold rounded-2xl text-xs"
                  >
                    تصفح الوجبات الآن
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items List */}
                  <div className="space-y-2">
                    {cart.lines.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-card border border-border flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-foreground truncate">{item.name_ar}</h5>
                          <span className="text-xs font-mono text-foreground font-black">
                            {item.price * item.quantity} ر.س
                          </span>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2 bg-card border border-border px-2 py-1 rounded-xl">
                          <Button variant="ghost"
                            onClick={() => {
                              sounds.playClick();
                              if (item.quantity > 1) {
                                cart.setQty(item.id, item.quantity - 1);
                              } else {
                                cart.remove(item.id);
                              }
                            }}
                            className="size-5 rounded bg-card text-foreground flex items-center justify-center hover:text-foreground"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="text-xs font-bold font-mono text-foreground min-w-[16px] text-center">
                            {item.quantity}
                          </span>
                          <Button variant="ghost"
                            onClick={() => {
                              sounds.playClick();
                              cart.setQty(item.id, item.quantity + 1);
                            }}
                            className="size-5 rounded bg-primary text-foreground flex items-center justify-center hover:bg-primary font-bold"
                          >
                            <Plus className="size-3 stroke-[3]" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Promo Code Input */}
                  <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="size-3.5 text-foreground" />
                      كود الخصم الترويجي
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="أدخل الكود مثل FOOD50"
                        className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground uppercase tracking-wider font-mono focus:outline-none focus:border-primary"
                      />
                      <Button variant="ghost"
                        onClick={handleApplyPromo}
                        className="px-3 py-2 rounded-xl bg-card hover:bg-card text-xs font-bold text-foreground transition-colors"
                      >
                        تطبيق
                      </Button>
                    </div>
                    {appliedPromo && (
                      <div className="flex items-center justify-between text-[11px] text-foreground pt-1">
                        <span>تم تطبيق الكود ({appliedPromo.code})</span>
                        <span className="font-mono font-bold">-{appliedPromo.discountSar} ر.س</span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Location Confirmation */}
                  <div className="p-3 rounded-2xl bg-card border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-foreground" />
                        عنوان التوصيل
                      </span>
                      <Button variant="ghost"
                        onClick={() => setDistrictModalOpen(true)}
                        className="text-[10px] text-foreground hover:underline"
                      >
                        تغيير
                      </Button>
                    </div>
                    <p className="text-xs text-foreground font-medium">{selectedDistrict}</p>
                    <p className="text-[10px] text-foreground">
                      وقت الوصول المقدر: 15-20 دقيقة عبر أقرب كابتن
                    </p>
                  </div>

                  {/* Captain Tip Pill Selector */}
                  <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Award className="size-3.5 text-foreground" />
                        إكرامية الكابتن (اختياري)
                      </span>
                      <span className="text-[10px] text-foreground">تذهب بالكامل للمندوب</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 3, 5, 10].map((tip) => (
                        <Button variant="ghost"
                          key={tip}
                          onClick={() => {
                            sounds.playClick();
                            setSelectedTip(tip);
                          }}
                          className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                            selectedTip === tip
                              ? "bg-primary text-foreground shadow-md shadow-card"
                              : "bg-card text-foreground border border-border hover:text-foreground"
                          }`}
                        >
                          {tip === 0 ? "بدون" : `+${tip} ر.س`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-foreground" />
                      طريقة الدفع
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "apple_pay", name: "Apple Pay", icon: "🍏", badge: "موصى به" },
                        { id: "mada", name: "بطاقة مدى / ائتمانية", icon: "💳" },
                        { id: "stc_pay", name: "STC Pay", icon: "🟣" },
                        { id: "wallet", name: `محفظة ميلفاي (رصيدك: ${walletBalance} ر.س)`, icon: "💰" },
                        { id: "cash", name: "الدفع نقداً عند الاستلام", icon: "💵" },
                      ].map((pay) => (
                        <label
                          key={pay.id}
                          onClick={() => {
                            sounds.playClick();
                            setSelectedPayment(pay.id as typeof selectedPayment);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                            selectedPayment === pay.id
                              ? "bg-primary border-primary text-foreground font-bold"
                              : "bg-card border-border text-foreground hover:border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{pay.icon}</span>
                            <span>{pay.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {pay.badge && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary text-foreground font-bold">
                                {pay.badge}
                              </span>
                            )}
                            <input
                              type="radio"
                              name="payment"
                              checked={selectedPayment === pay.id}
                              onChange={() => {}}
                              className="accent-primary size-3.5"
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Bill Summary Breakdown */}
                  <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1.5 text-xs text-foreground">
                    <div className="flex justify-between">
                      <span className="text-foreground">مجموع الوجبات:</span>
                      <span className="font-mono text-foreground">{cartSubtotal} ر.س</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-foreground">
                        <span>خصم الكوبون ({appliedPromo?.code}):</span>
                        <span className="font-mono font-bold">-{promoDiscount} ر.س</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-foreground">رسوم التوصيل:</span>
                      <span className="font-mono text-foreground">
                        {deliveryFee === 0 ? "مجاني" : `${deliveryFee} ر.س`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground">ضريبة القيمة المضافة (15%):</span>
                      <span className="font-mono text-foreground">{vatTax} ر.س</span>
                    </div>
                    {selectedTip > 0 && (
                      <div className="flex justify-between text-foreground">
                        <span>إكرامية الكابتن:</span>
                        <span className="font-mono font-bold">+{selectedTip} ر.س</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between text-sm font-black text-foreground">
                      <span>المجموع الإجمالي:</span>
                      <span className="font-mono text-foreground text-base">{cartTotal} ر.س</span>
                    </div>
                  </div>

                  {/* Submit Order Button */}
                  <Button
                    onClick={handlePlaceOrder}
                    className="w-full bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary active:scale-95 text-foreground font-black rounded-2xl py-3 text-sm shadow-xl shadow-card"
                  >
                    تأكيد الطلب والدفع الفوري ({cartTotal} ر.س) ⚡
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------- */}
          {/* TAB 4: LIVE RADAR & ORDER TRACKING                 */}
          {/* -------------------------------------------------- */}
          {activeTab === "radar" && <LiveTrackingList />}

          {/* -------------------------------------------------- */}
          {/* TAB 5: PROFILE, WALLET & ORDERS                    */}
          {/* -------------------------------------------------- */}
          {activeTab === "profile" && (
            <div className="p-3.5 space-y-4">
              {/* User Header Card */}
              <div className="p-4 rounded-3xl bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center text-foreground font-black text-lg">
                    ع
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">عبد الله الشمري</h3>
                    <p className="text-[11px] text-foreground font-mono">0501234567 • الرياض</p>
                    <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-primary text-foreground font-bold">
                      عميل ذهبي مميز 🌟
                    </span>
                  </div>
                </div>
                <Button variant="ghost"
                  onClick={() => toast.info(ar ? "فتح إعدادات الحساب" : "Settings")}
                  className="p-2 rounded-xl bg-card border border-border text-foreground hover:text-foreground"
                >
                  <Sliders className="size-4" />
                </Button>
              </div>

              {/* Wallet & Loyalty Points Dual Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-3xl bg-gradient-to-br from-primary to-card border border-primary space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-foreground font-bold">رصيد المحفظة</span>
                    <Wallet className="size-3.5 text-foreground" />
                  </div>
                  <h4 className="text-xl font-black text-foreground font-mono">
                    {walletBalance.toFixed(2)} <span className="text-xs">ر.س</span>
                  </h4>
                  <Button variant="ghost"
                    onClick={() => {
                      sounds.playSuccess();
                      setWalletBalance((prev) => prev + 50);
                      toast.success(ar ? "تم شحن 50 ر.س بنجاح!" : "+50 SAR Added!");
                    }}
                    className="text-[10px] text-foreground font-bold hover:underline flex items-center gap-0.5 pt-1"
                  >
                    + شحن سريع
                  </Button>
                </div>

                <div className="p-3.5 rounded-3xl bg-gradient-to-br from-primary to-card border border-primary space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-foreground font-bold">نقاط المكافآت</span>
                    <Gift className="size-3.5 text-foreground" />
                  </div>
                  <h4 className="text-xl font-black text-foreground font-mono">
                    {loyaltyPoints} <span className="text-xs">نقطة</span>
                  </h4>
                  <span className="text-[10px] text-foreground block pt-1">
                    تساوي {(loyaltyPoints * 0.1).toFixed(1)} ر.س كاش
                  </span>
                </div>
              </div>

              {/* Saved Addresses List */}
              <div className="p-3.5 rounded-3xl bg-card border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-foreground" />
                    العناوين المحفوظة
                  </h4>
                  <Button variant="ghost"
                    onClick={() => setDistrictModalOpen(true)}
                    className="text-[10px] text-foreground hover:underline"
                  >
                    + إضافة عنوان
                  </Button>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "المنزل", address: "حي النرجس، شارع أنس بن مالك، فيلا 24" },
                    { label: "العمل", address: "أبراج العليا، طريق الملك فهد، الطابق 14" },
                  ].map((addr, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-2xl bg-card border border-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground">{addr.label}</span>
                        <p className="text-[10.5px] text-foreground">{addr.address}</p>
                      </div>
                      <span className="text-[10px] text-foreground">افتراضي</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Past Orders with Re-Order in 1-Click */}
              <div className="p-3.5 rounded-3xl bg-card border border-border space-y-2.5">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Receipt className="size-3.5 text-foreground" />
                  الطلبات السابقة
                </h4>

                <div className="space-y-2.5">
                  {pastOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 rounded-2xl bg-card border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-foreground">{ord.restaurant}</span>
                          <span className="text-[10px] text-foreground block">{ord.date}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {ord.price} ر.س
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground">{ord.items}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <span className="text-[9.5px] text-foreground flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          {ord.status}
                        </span>
                        <Button variant="ghost"
                          onClick={() => handleReorder(ord)}
                          className="px-2.5 py-1 rounded-xl bg-primary hover:bg-primary active:scale-95 text-foreground text-[10.5px] font-bold flex items-center gap-1 transition-transform"
                        >
                          <RotateCcw className="size-3" />
                          إعادة الطلب بنقرة واحدة
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ==================================================== */}
        {/* DOCKED NATIVE BOTTOM NAVIGATION BAR                  */}
        {/* ==================================================== */}
        <nav className="customer-bottom-nav" aria-label="تنقل تطبيق العميل">
          {[
            { id: "home" as TabId, label: ar ? "الرئيسية" : "Home", icon: Home },
            { id: "kitchens" as TabId, label: ar ? "الأقسام" : "Categories", icon: Layers },
            { id: "radar" as TabId, label: ar ? "طلباتي" : "Orders", icon: Radar },
            { id: "cart" as TabId, label: ar ? "السلة" : "Cart", icon: ShoppingBag },
            { id: "profile" as TabId, label: ar ? "حسابي" : "Account", icon: User },
          ].map(nav => <Button key={nav.id} variant="ghost" aria-current={activeTab === nav.id && !selectedRestaurant ? "page" : undefined} onClick={() => navigateToTab(nav.id)} className={`customer-nav-item ${nav.id === "radar" ? "customer-nav-orders" : ""}`}><span><nav.icon />{nav.id === "cart" && totalItemCount > 0 && <b>{totalItemCount}</b>}</span><small>{nav.label}</small></Button>)}
        </nav>

        {/* ==================================================== */}
        {/* MODAL 1: MEAL CUSTOMIZER POPUP                       */}
        {/* ==================================================== */}
        {customizingMeal && (
          <div className="absolute inset-0 z-50 bg-ink/40 backdrop-blur-md flex items-end justify-center p-3 animate-in fade-in duration-150">
            <div className="w-full rounded-3xl bg-card border border-border p-4 space-y-3.5 max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-6 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={customizingMeal.image}
                    alt={customizingMeal.nameAr}
                    className="size-16 rounded-2xl object-cover border border-border"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-foreground">{customizingMeal.nameAr}</h3>
                    <p className="text-[10px] text-foreground line-clamp-1">{customizingMeal.descAr}</p>
                    <span className="text-xs font-black text-foreground font-mono mt-0.5 block">
                      {customizingMeal.price} ر.س
                    </span>
                  </div>
                </div>
                <Button variant="ghost"
                  onClick={() => setCustomizingMeal(null)}
                  className="size-7 rounded-full bg-card text-foreground hover:text-foreground flex items-center justify-center text-xs"
                >
                  ✕
                </Button>
              </div>

              {/* Nutrition & Macros Breakdown */}
              <div className="p-2.5 rounded-2xl bg-card border border-border grid grid-cols-4 gap-2 text-center text-[10px]">
                <div>
                  <span className="text-foreground block">السعرات</span>
                  <span className="font-bold text-foreground font-mono">{customizingMeal.calories}</span>
                </div>
                <div>
                  <span className="text-foreground block">بروتين</span>
                  <span className="font-bold text-foreground font-mono">{customizingMeal.proteinG}g</span>
                </div>
                <div>
                  <span className="text-foreground block">كارب</span>
                  <span className="font-bold text-foreground font-mono">{customizingMeal.carbsG}g</span>
                </div>
                <div>
                  <span className="text-foreground block">دهون</span>
                  <span className="font-bold text-foreground font-mono">{customizingMeal.fatG}g</span>
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">اختر الحجم:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "regular", label: "عادي", extra: 0 },
                    { id: "double", label: "دبل لحم", extra: 8 },
                    { id: "combo", label: "كومبو كامل", extra: 14 },
                  ].map((s) => (
                    <Button variant="ghost"
                      key={s.id}
                      onClick={() => {
                        sounds.playClick();
                        setCustomSize(s.id as typeof customSize);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        customSize === s.id
                          ? "bg-primary text-foreground shadow-md shadow-card"
                          : "bg-card text-foreground border border-border hover:text-foreground"
                      }`}
                    >
                      {s.label}
                      <span className="block text-[9.5px] font-mono opacity-80">
                        {s.extra === 0 ? "سعر أصلي" : `+${s.extra} ر.س`}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bread Selection */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">نوع الخبز:</span>
                <div className="space-y-1">
                  {[
                    "خبز بطاطس بريوش طازج",
                    "خبز حب كامل صحي (بر)",
                    "لفافة خس طبيعية (دايت كيتو)",
                  ].map((b) => (
                    <label
                      key={b}
                      onClick={() => {
                        sounds.playClick();
                        setCustomBread(b);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer ${
                        customBread === b
                          ? "bg-primary border-primary text-foreground font-bold"
                          : "bg-card border-border text-foreground"
                      }`}
                    >
                      <span>{b}</span>
                      <input
                        type="radio"
                        name="bread"
                        checked={customBread === b}
                        onChange={() => {}}
                        className="accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Extra Addons Checkboxes */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">إضافات مقترحة (+3 ر.س):</span>
                <div className="space-y-1">
                  {[
                    { id: "extra_cheese", label: "شريحة جبنة شيدر إضافية ذائبة" },
                    { id: "extra_sauce", label: "صوص فود هب السري مضاعف" },
                    { id: "jalapeno", label: "قطع هلابينو مخلل حار" },
                  ].map((ex) => {
                    const checked = customExtras.includes(ex.id);
                    return (
                      <label
                        key={ex.id}
                        onClick={() => {
                          sounds.playClick();
                          setCustomExtras((prev) =>
                            checked ? prev.filter((x) => x !== ex.id) : [...prev, ex.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer ${
                          checked
                            ? "bg-primary border-primary text-foreground font-bold"
                            : "bg-card border-border text-foreground"
                        }`}
                      >
                        <span>{ex.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="accent-primary"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Special Instructions Note */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground">ملاحظات خاصة للشيف:</span>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="مثال: بدون بصل، ثومية زيادة..."
                  className="w-full bg-card border border-border rounded-xl p-2 text-xs text-foreground placeholder:text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {/* Quantity Counter & Add Button */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl">
                  <Button variant="ghost"
                    onClick={() => {
                      sounds.playClick();
                      if (customQty > 1) setCustomQty(customQty - 1);
                    }}
                    className="size-7 rounded bg-card text-foreground flex items-center justify-center hover:text-foreground"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="text-xs font-bold font-mono text-foreground min-w-[20px] text-center">
                    {customQty}
                  </span>
                  <Button variant="ghost"
                    onClick={() => {
                      sounds.playClick();
                      setCustomQty(customQty + 1);
                    }}
                    className="size-7 rounded bg-primary text-foreground flex items-center justify-center hover:bg-primary font-bold"
                  >
                    <Plus className="size-3.5 stroke-[3]" />
                  </Button>
                </div>

                <Button
                  onClick={handleConfirmCustomAdd}
                  className="flex-1 bg-primary hover:bg-primary active:scale-95 text-foreground font-black rounded-xl py-2.5 text-xs shadow-md shadow-card"
                >
                  إضافة للسلة ({customMealPrice} ر.س)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL 2: DISTRICT LOCATION PICKER                    */}
        {/* ==================================================== */}
        {districtModalOpen && (
          <div className="absolute inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end justify-center p-3 animate-in fade-in duration-150">
            <div className="w-full rounded-3xl bg-card border border-border p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-foreground" />
                  <h3 className="font-bold text-xs text-foreground">اختر موقع التوصيل في الرياض</h3>
                </div>
                <Button variant="ghost"
                  onClick={() => setDistrictModalOpen(false)}
                  className="text-foreground hover:text-foreground text-xs px-2 py-0.5 rounded-lg bg-card"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
                {DISTRICTS.map((dist) => (
                  <Button variant="ghost"
                    key={dist}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedDistrict(dist);
                      setDistrictModalOpen(false);
                      toast.success(`تم تحديث موقع التوصيل: ${dist}`);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-start ${
                      selectedDistrict === dist
                        ? "bg-primary text-foreground shadow-md"
                        : "bg-card border border-border text-foreground hover:bg-card"
                    }`}
                  >
                    <span>{dist}</span>
                    {selectedDistrict === dist && <Check className="size-3.5 stroke-[3]" />}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL 3: DAILY STORY PREVIEW POPUP                   */}
        {/* ==================================================== */}
        {activeStory && (
          <div className="absolute inset-0 z-50 bg-ink/40 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xs rounded-3xl bg-gradient-to-b from-card to-card border border-primary p-5 text-center space-y-3 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="size-16 mx-auto rounded-full bg-primary border-2 border-primary flex items-center justify-center text-3xl shadow-lg">
                {activeStory.emoji}
              </div>
              <div>
                <span className="text-[10px] text-foreground font-bold px-2 py-0.5 rounded-full bg-primary border border-primary">
                  {activeStory.tag}
                </span>
                <h3 className="text-base font-black text-foreground mt-1.5">
                  {ar ? activeStory.titleAr : activeStory.titleEn}
                </h3>
                <p className="text-[11px] text-foreground mt-1">
                  عرض حصري متاح اليوم لجميع مطابخ الرياض السحابية مع كود التخفيض الفوري.
                </p>
              </div>
              <Button
                onClick={() => {
                  sounds.playSuccess();
                  setPromoCode(activeStory.code);
                  setAppliedPromo({ code: activeStory.code, discountSar: 15 });
                  setActiveStory(null);
                  toast.success(`🎉 تم تفعيل الكود (${activeStory.code}) في سلتك بنجاح!`);
                }}
                className="w-full bg-gradient-to-r from-primary to-primary text-foreground font-black rounded-xl text-xs"
              >
                تطبيق الكود بالسلة فوراً ⚡
              </Button>
              <Button variant="ghost"
                onClick={() => setActiveStory(null)}
                className="text-xs text-foreground hover:text-foreground"
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL 4: 360° RATING & 1 SAR CAPTAIN BONUS POPUP     */}
        {/* ==================================================== */}
        {ratingModalOpen && (
          <div className="absolute inset-0 z-50 bg-ink/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-xs rounded-3xl bg-card border border-primary p-5 text-center space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-200">
              {ratingSubmitted ? (
                <div className="py-6 space-y-3">
                  <div className="size-16 rounded-full bg-primary border-2 border-primary text-foreground flex items-center justify-center text-3xl mx-auto animate-bounce">
                    ✓
                  </div>
                  <h3 className="text-sm font-black text-foreground">شكراً لتقييمك الراقي!</h3>
                  <p className="text-xs text-foreground">
                    أُضيفت 50 نقطة ولاء لمحفظتك وتم إيداع البونص للكابتن فوراً.
                  </p>
                </div>
              ) : (
                <>
                  <div className="size-12 rounded-2xl bg-primary border border-primary flex items-center justify-center mx-auto text-foreground text-2xl">
                    ⭐
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-foreground">تقييم الوجبة والكابتن</h3>
                    <p className="text-[11px] text-foreground mt-0.5">
                      تقييمك يدعم الكابتن ويضمن أعلى معايير الجودة
                    </p>
                  </div>

                  {/* Rating 1: Food & Restaurant */}
                  <div className="p-2.5 rounded-2xl bg-card border border-border space-y-1.5">
                    <span className="text-[11px] font-bold text-foreground block">
                      تقييم جودة الوجبة والمطعم:
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button variant="ghost"
                          key={star}
                          onClick={() => {
                            sounds.playClick();
                            setRestaurantStars(star);
                          }}
                          className="p-1 hover:scale-125 transition-transform"
                        >
                          <Star
                            className={`size-5 ${
                              star <= restaurantStars
                                ? "text-foreground fill-primary"
                                : "text-foreground"
                            }`}
                          />
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Rating 2: Captain Delivery Speed & Politeness */}
                  <div className="p-2.5 rounded-2xl bg-card border border-border space-y-1.5">
                    <span className="text-[11px] font-bold text-foreground block">
                      تقييم سرعة ولباقة المندوب (كابتن أحمد):
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button variant="ghost"
                          key={star}
                          onClick={() => {
                            sounds.playClick();
                            setCaptainStars(star);
                          }}
                          className="p-1 hover:scale-125 transition-transform"
                        >
                          <Star
                            className={`size-5 ${
                              star <= captainStars
                                ? "text-foreground fill-primary"
                                : "text-foreground"
                            }`}
                          />
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Explicit 1 SAR Captain Bonus Celebration Banner */}
                  {captainStars === 5 && (
                    <div className="p-2.5 rounded-2xl bg-primary border border-primary text-foreground text-[11px] space-y-1 leading-snug animate-in fade-in duration-200">
                      <div className="flex items-center justify-center gap-1 font-bold text-foreground">
                        <Sparkles className="size-3.5 text-foreground" />
                        بونص التقييم الكامل 100% (+1.00 ر.س)
                      </div>
                      <p>
                        تقييمك الكامل (5 نجوم) مَنح الكابتن فورياً <strong>+1.00 ريال بونص</strong> أُضيف لمحفظته تقديراً لسرعة استلام وتسليم الوجبة!
                      </p>
                    </div>
                  )}

                  {/* Submit Rating Button */}
                  <Button
                    onClick={handleSubmitRating}
                    className="w-full bg-gradient-to-r from-primary to-primary text-foreground font-black rounded-xl py-2.5 text-xs shadow-lg shadow-card"
                  >
                    إرسال التقييم واعتماد التسليم 🌟
                  </Button>

                  <Button variant="ghost"
                    onClick={() => setRatingModalOpen(false)}
                    className="text-xs text-foreground hover:text-foreground"
                  >
                    تخطي لاحقاً
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
