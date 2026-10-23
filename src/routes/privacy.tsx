import { createFileRoute, Link } from "@tanstack/react-router";
import { CustomerInformationLayout } from "@/components/customer/customer-information-layout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "سياسة الخصوصية | FoodHub" },
    { name: "description", content: "معلومات الخصوصية لمنصة FoodHub لتوصيل وجبات المطاعم والمطابخ، وبيانات الحساب والطلبات والتتبع." },
    { property: "og:title", content: "سياسة الخصوصية | FoodHub" },
    { property: "og:description", content: "إشعار خصوصية FoodHub وبيانات الحساب والطلبات والتوصيل." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PrivacyPage,
});

export function PrivacyPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  return <CustomerInformationLayout title={ar ? "سياسة الخصوصية" : "Privacy policy"}>
    <article className="customer-information-document">
      <h2>{ar ? "FoodHub — توصيل وجبات المطاعم" : "FoodHub — Restaurant delivery"}</h2>
      <p>{ar ? "مؤسسة التموين العالي للتجارة" : "مؤسسة التموين العالي للتجارة"}</p>
      <p className="customer-information-status">{ar ? "هذا إشعار أولي قيد اعتماد المؤسسة. ستُضاف تفاصيل التواصل ومدد الاحتفاظ بالبيانات وإجراءات طلب حذفها بعد اعتمادها؛ لا يمثل هذا النص شهادة امتثال أو ضمانًا أمنيًا." : "This preliminary notice awaits the owner's approval. Contact details, retention periods and data-deletion procedures will be added once approved. This notice is not a compliance certification or security guarantee."}</p>
      <h2>{ar ? "نطاق هذا الإشعار" : "Scope"}</h2>
      <p>{ar ? "يخص هذا الإشعار موقع FoodHub وتطبيقات العميل والمندوب والمطعم والإدارة." : "This notice concerns the FoodHub website and customer, courier, restaurant and administration apps."}</p>
      <h2>{ar ? "معلومات الحساب والطلب" : "Account and order information"}</h2>
      <p>{ar ? "عند استخدام الحساب تدخل معلومات تسجيل الدخول، ويمكنك إدخال الاسم ورقم الجوال في معلوماتك الشخصية. عند تقديم طلب تدخل عنوان التسليم وتفاصيل الطلب، وتشمل سجلاته الأصناف والكميات والأسعار وحالة التوصيل." : "Account use involves sign-in details. You can enter your name and phone number in your profile. Orders include a delivery address, items, quantities, prices and delivery status."}</p>
      <h2>{ar ? "الموقع وتتبع التوصيل" : "Location and delivery tracking"}</h2>
      <p>{ar ? "يعتمد تتبع الطلب على إحداثيات الاستلام والتسليم المحفوظة وتحديثات موقع المندوب عندما يشارك موقع جهازه أثناء التوصيل. يطلب الجهاز إذن الموقع عند استخدام هذه الوظيفة؛ ويمكن إدارة الإذن من إعدادات الجهاز." : "Order tracking uses stored pickup and delivery coordinates and courier location updates when the courier shares device location during delivery. Location permission is managed through device settings."}</p>
      <h2>{ar ? "السلة وإعدادات الجهاز" : "Cart and device preferences"}</h2>
      <p>{ar ? "تُحفظ السلة وبعض تفضيلات العرض محليًا على الجهاز لاستعادتها عند العودة. حذف بيانات التطبيق أو المتصفح قد يزيل هذه المعلومات المحلية، ولا يحذف حسابك أو سجلات الطلبات المحفوظة." : "The cart and some display preferences are stored locally on your device. Clearing app or browser data may remove local information but does not delete your account or stored orders."}</p>
      <h2>{ar ? "مراجعة معلوماتك" : "Reviewing your information"}</h2>
      <p>{ar ? "يمكنك مراجعة الاسم ورقم الجوال وتعديلهما من «حسابي — معلوماتك». تسجيل الخروج لا يعني حذف الحساب. لا تتوفر عبر هذه الصفحة حاليًا قناة لاستقبال طلبات الخصوصية أو زر لحذف الحساب." : "You can review and edit your name and phone number under Account — Your information. Signing out does not delete your account. This page does not currently provide a privacy-request channel or an account-deletion button."}</p>
      <h2>{ar ? "التواصل بشأن الخصوصية" : "Privacy enquiries"}</h2>
      <p>{ar ? "لم تُضف بيانات التواصل الرسمية بعد. سيظهر البريد ورقم الجوال وواتساب في مركز المساعدة بعد تزويد المؤسسة بها؛ لا توجد أرقام أو عناوين بديلة على هذه الصفحة." : "Official contact details have not yet been added. Email, phone and WhatsApp details will appear in the help center once provided by the owner."}</p>
      <Link to="/help">{ar ? "مركز المساعدة" : "Help center"}</Link>
    </article>
  </CustomerInformationLayout>;
}
