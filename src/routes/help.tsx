import { createFileRoute, Link } from "@tanstack/react-router";
import { CustomerInformationLayout } from "@/components/customer/customer-information-layout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [
    { title: "مركز المساعدة | FoodHub" },
    { name: "description", content: "مساعدة FoodHub بشأن الحساب والسلة والطلبات والتتبع، وحالة توفر قنوات التواصل الرسمية." },
    { property: "og:title", content: "مركز المساعدة | FoodHub" },
    { property: "og:description", content: "إجابات حول طلبات FoodHub والحساب والتتبع والخصوصية." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: HelpCenterPage,
});

export function HelpCenterPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const topics = [
    ["لماذا لا تظهر مطاعم؟", "Why are no restaurants shown?", "تظهر المطاعم الفعالة والوجبات المتاحة المسجلة فقط. إذا لم توجد مطاعم متاحة، لا يعرض التطبيق أسماء أو وجبات بديلة.", "Only stored active restaurants and available meals are shown. If none are available, no sample businesses or meals are substituted."],
    ["كيف أراجع السلة؟", "How do I review my cart?", "افتح السلة من الشريط السفلي لمراجعة الأصناف والكميات. إضافة صنف إلى السلة لا تعني إرسال طلب للمطعم.", "Open Cart in the bottom navigation to review items and quantities. Adding an item does not submit an order."],
    ["أين أتابع الطلب؟", "Where can I track my order?", "سجّل دخولك وافتح «طلباتي» لمراجعة الطلبات النشطة وحالتها. ظهور موقع المندوب يعتمد على مشاركة موقعه؛ عدم وجود تحديث لا يعني تحركه على الخريطة.", "Sign in and open Orders to review active orders and their status. Courier location depends on shared updates; missing updates do not imply movement."],
    ["كيف أعدل معلومات الحساب؟", "How do I edit my profile?", "بعد تسجيل الدخول افتح «حسابي» ثم «معلوماتك» لتعديل الاسم ورقم الجوال وحفظهما.", "After signing in, open Account then Your information to edit and save your name and phone number."],
    ["كيف أتواصل بشأن مشكلة في الطلب؟", "How can I report an order issue?", "قنوات التواصل الرسمية لم تُضف بعد. لا تستقبل هذه الصفحة بلاغات ولا تُصدر أرقام تذاكر. عند إتاحة التواصل، احتفظ برقم الطلب ووصف المشكلة.", "Official contact channels have not yet been added. This page does not receive reports or issue ticket numbers. Keep your order number and a description ready for when contact becomes available."],
  ];
  return <CustomerInformationLayout title={ar ? "مركز المساعدة" : "Help center"}>
    <section className="customer-information-document">
      <h2>{ar ? "كيف نقدر نساعدك؟" : "How can we help?"}</h2>
      {topics.map(([qa, qe, aa, ae]) => <details key={qe}><summary>{ar ? qa : qe}</summary><p>{ar ? aa : ae}</p></details>)}
      <h2>{ar ? "التواصل مع FoodHub" : "Contact FoodHub"}</h2>
      <p className="customer-information-status">{ar ? "البريد الإلكتروني ورقم الجوال وواتساب غير متاحين حاليًا؛ سنضيف بيانات التواصل الرسمية لاحقًا." : "Email, phone and WhatsApp are not currently available. Official contact details will be added later."}</p>
      <Link to="/privacy">{ar ? "سياسة الخصوصية" : "Privacy policy"}</Link>
    </section>
  </CustomerInformationLayout>;
}
