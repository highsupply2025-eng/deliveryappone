import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpLeft, ChevronDown, Globe2, MapPin, ShoppingBag, Smartphone, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FoodHubLogo } from "@/components/food-hub-logo";
import { useI18n } from "@/lib/i18n";
import videoAsset from "@/assets/foodhub-rider-final-dot-top.webm.asset.json";
import mp4Asset from "@/assets/foodhub-rider-final-dot-top.mp4.asset.json";
import posterAsset from "@/assets/foodhub-rider-final-dot-top-poster.jpg.asset.json";
import homeScreen from "@/assets/foodhub-current-customer-home.jpg.asset.json";
import ordersScreen from "@/assets/foodhub-current-customer-orders.jpg.asset.json";
import accountScreen from "@/assets/foodhub-current-customer-account.jpg.asset.json";

export function PublicWebsite() {
  const { lang, setLang } = useI18n();
  const ar = lang === "ar";
  useEffect(() => {
    if (!localStorage.getItem("lang")) setLang("ar");
  }, [setLang]);
  const t = (a:string,e:string) => ar?a:e;
  const [openFaq,setOpenFaq] = useState<number | null>(0);
  const faqs = [
    [t("كيف أطلب من FoodHub؟","How do I order from FoodHub?"),t("افتح تطبيق العميل، تصفح المطاعم المتاحة، واختر وجبتك وعنوان التسليم ثم أكمل الطلب.","Open the customer app, browse available restaurants, select your meal and delivery address, then place your order.")],
    [t("أين أتابع طلبي؟","Where can I track my order?"),t("من قسم طلباتي في تطبيق العميل يمكنك مشاهدة حالة الطلب وموقع المندوب عند مشاركته للموقع.","The Orders section shows your order status and courier location when location sharing is available.")],
    [t("كيف ينضم المطعم أو المندوب؟","How do restaurants and couriers join?"),t("تتولى الإدارة تسجيل حسابات المطاعم والمناديب وتفعيلها. لا يوجد تسجيل ذاتي لهذه الحسابات.","Restaurant and courier accounts are created and activated by the administration, not through self-registration.")],
    [t("هل يمكنني الطلب من المتصفح؟","Can I order from my browser?"),t("نعم، زر «اطلب الآن» يفتح تجربة العميل مباشرة في المتصفح.","Yes. Order now opens the customer experience directly in your browser.")],
  ];
  const orderButton = <Button asChild className="web-cta"><Link to="/" search={{ app: "customer" }}>{t("اطلب الآن","Order now")}<ArrowUpLeft className="size-4"/></Link></Button>;
  return <div className="foodhub-web" dir={ar?"rtl":"ltr"}>
    <header className="web-header"><div className="web-container flex items-center justify-between gap-4">
      <Link to="/" aria-label="FoodHub"><FoodHubLogo size={38}/></Link>
      <nav aria-label={t("القائمة الرئيسية","Main navigation")} className="hidden items-center gap-7 text-sm md:flex"><Link to="/" search={{ app: "customer" }}>{t("المطاعم","Restaurants")}</Link><Link to="/help">{t("المساعدة","Help")}</Link><Link to="/privacy">{t("الخصوصية","Privacy")}</Link></nav>
      <div className="flex items-center gap-3"><Button variant="ghost" size="sm" onClick={()=>setLang(ar?"en":"ar")} aria-label={t("English","العربية")}><Globe2 className="size-4"/>{ar?"En":"عربي"}</Button>{orderButton}</div>
    </div></header>
    <main>
      <section id="home" className="web-video" aria-label={t("مندوب FoodHub في طريقه للتوصيل","FoodHub courier delivery film")}>
        <video ref={video} autoPlay muted loop playsInline preload="auto" poster={posterAsset.url} onPlay={()=>setPaused(false)} onPause={()=>setPaused(true)}><source src={videoAsset.url} type="video/webm"/><source src={mp4Asset.url} type="video/mp4"/></video>
        <div className="web-video-caption"><span><Bike className="size-4"/> FOODHUB · {t("من المطعم إلى بابك","From the kitchen to your door")}</span><Button variant="ghost" size="icon" aria-label={paused?t("تشغيل الفيديو","Play video"):t("إيقاف الفيديو مؤقتاً","Pause video")} onClick={()=>{const player=video.current;if(!player)return;if(player.paused)void player.play();else player.pause();}}>{paused?<Play className="size-4"/>:<Pause className="size-4"/>}</Button></div>
      </section>
      <section className="web-intro">
        <div className="web-container text-center"><h1>FOOD<span>HUB</span></h1><h2>{t("وجبتك، بكل بساطة","Your meal. Made simple.")}</h2><p className="web-lead">{t("اختر من المطاعم المتاحة، أكمل طلبك، وتابع توصيله.","Browse available restaurants, place your order, and follow its delivery.")}</p>{orderButton}
          <div className="web-showcase"><Phone src={homeScreen.url} alt={t("الرئيسية في تطبيق FoodHub","FoodHub home screen")}/></div>
        </div>
      </section>
      <section id="benefits" className="web-benefits web-container">
        <div className="web-benefit-copy"><h2>{t("من اختيارك إلى بابك","From your choice to your door")}</h2>
          {[ [UtensilsCrossed,t("اختيارات على ذوقك","Made for your cravings"),t("تصفّح المطاعم والوجبات، واختر اللي يناسب مزاجك.","Browse restaurants and meals to find what you're in the mood for.")], [ShoppingBag,t("طلب بدون تعقيد","Ordering without the fuss"),t("من اختيار الوجبة إلى عنوان التسليم، كل شيء في مكان واحد.","Your meal and delivery address, all in one place.")], [MapPin,t("تابع طلبك","Follow your order"),t("شاهد تحديثات الطلب وموقع المندوب أثناء التوصيل.","See order updates and the courier's location during delivery.")] ].map(([Icon,title,description],i)=>{const Symbol=Icon as typeof MapPin;return <div className="web-feature" key={i}><Symbol className="size-6"/><div><h3>{String(title)}</h3><p>{String(description)}</p></div></div>;})}
        </div>
      </section>
      <section className="web-together"><div className="web-container"><Smartphone className="mx-auto mb-5 size-8"/><h2>{t("كل شيء في مكانه","Everything in its place")}</h2><div className="web-screen-gallery"><figure><Phone src={ordersScreen.url} alt={t("طلباتي في FoodHub","FoodHub orders screen")}/><figcaption>{t("طلباتي","My orders")}</figcaption></figure><figure><Phone src={accountScreen.url} alt={t("حسابي في FoodHub","FoodHub account screen")}/><figcaption>{t("حسابي","My account")}</figcaption></figure></div></div></section>
      <section id="faq" className="web-faq web-container"><div><p className="web-eyebrow">{t("نسهّلها عليك","Keep it simple")}</p><h2>{t("عندك سؤال؟","Have a question?")}<br/><span>{t("عندنا الجواب.","We've got answers.")}</span></h2><FoodHubLogo size={76} showText={false}/></div><div>{faqs.map(([question,answer],i)=><div className="web-faq-item" key={i}><Button variant="ghost" className="web-faq-trigger" aria-expanded={openFaq===i} onClick={()=>setOpenFaq(openFaq===i?null:i)}>{question}<ChevronDown className={`size-5 shrink-0 transition-transform ${openFaq===i?"rotate-180":""}`}/></Button>{openFaq===i&&<p>{answer}</p>}</div>)}</div></section>
      <section className="web-final"><div className="web-container"><p className="web-eyebrow">FOODHUB</p><h2>{t("وش مشتهي اليوم؟","What are you craving today?")}</h2>{orderButton}</div></section>
    </main>
    <footer className="web-footer web-container"><FoodHubLogo size={30}/><p>© {t("فود هب · مؤسسة التموين العالي للتجارة","FoodHub · High Supply Trading Establishment")}</p><div className="flex flex-wrap justify-center gap-5 text-sm"><Link to="/privacy">{t("الخصوصية","Privacy")}</Link><Link to="/help">{t("المساعدة","Help")}</Link><Link to="/" search={{ app: "customer" }}>{t("حسابي","My account")}</Link></div></footer>
  </div>;
}
function Phone({src,alt}:{src:string;alt:string}){return <div className="web-phone"><img src={src} alt={alt} loading="lazy" width={780} height={1688}/></div>;}