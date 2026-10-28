import { useCallback, useEffect, useMemo, useState, createContext, useContext, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { Form } from '@/components/ui/form';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft, ArrowUpLeft, BadgeCheck, Check, ChevronLeft, CircleHelp, Cpu,
  Laptop, Menu, Minus, Moon, Plus, Search, ShieldCheck, ShoppingBag,
  ShoppingCart, SlidersHorizontal, Sun, Trash2, X, RotateCcw, Info, Phone, Wallet,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import type { Product } from './data/products';
import AdminPage from './components/admin/AdminPage';
import { loadProducts } from './lib/products-api';
import { supabase, supabaseConfigured } from './lib/supabase';

const queryClient = new QueryClient();
const officialLogo = `${import.meta.env.BASE_URL}almutaheda-logo.webp`;
type CartItem = { id: string; quantity: number };
type DemoConfirmation = { id: string; items: CartItem[]; total: number; deposit: number; remaining: number; paymentMethod: string };
type Store = {
  products: Product[]; productsLoading: boolean; productsError: string | null;
  cart: CartItem[]; demoReservationCount: number;
  refreshProducts: () => Promise<void>;
  add: (id: string) => void; remove: (id: string) => void; qty: (id: string, amount: number) => void;
  recordDemoReservation: () => void; toast: (message: string) => void;
};
const StoreContext = createContext<Store | null>(null);
const useStore = () => {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Store context is missing');
  return store;
};
const formatPrice = (price: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(price);
const calculateDeposit = (amount: number) => Number((amount * 0.1).toFixed(2));

function ProductPhoto({ product, className = '' }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed || !product.images[0] ? (
    <div className={`photo-fallback ${className}`} role="img" aria-label={`صورة توضيحية ${product.name}`} data-testid={`image-fallback-${product.id}`}>
      <Laptop size={76} strokeWidth={1.2} /><span>{product.brand}</span>
    </div>
  ) : (
    <img className={className} src={product.images[0]} alt={`صورة توضيحية لحاسوب ${product.name}`} onError={() => setFailed(true)} data-testid={`image-product-${product.id}`} />
  );
}

function DemoNotice({ children }: { children: ReactNode }) {
  return <div className="notice" data-testid="notice-demo"><Info size={15} style={{ verticalAlign: 'middle', marginLeft: 7 }} />{children}</div>;
}

function AppShell({ children, darkMode, onToggleTheme }: { children: ReactNode; darkMode: boolean; onToggleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const { cart } = useStore();
  const [location] = useLocation();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const links = [
    ['/', 'الرئيسية'], ['/products', 'الأجهزة'], ['/help', 'المساعدة'],
  ];
  return <div className="site-shell" dir="rtl">
    <div className="topnote">كتالوج الأجهزة والمخزون يُدار مباشرة من المتجر · الحجز والدفع الإلكتروني غير متاحين حالياً</div>
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand" data-testid="link-home-brand">
          <img className="brand-logo" src={officialLogo} alt="" width="58" height="58" data-testid="img-brand-logo" />
          <span>المتحدة لابتوب <small>اختيارك التقني بثقة</small></span>
        </Link>
        <nav className="nav" aria-label="التنقل الرئيسي">
          {links.map(([href, label]) => <Link key={href} href={href} className={location === href ? 'active' : ''} data-testid={`link-nav-${href.replace('/', 'home')}`}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <button className="icon-btn theme-toggle" type="button" onClick={onToggleTheme} aria-label={darkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الليلي'} aria-pressed={darkMode} title={darkMode ? 'الوضع الفاتح' : 'الوضع الليلي'} data-testid="button-toggle-theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/cart" className="icon-btn" aria-label="سلة الأجهزة" data-testid="link-cart">
            <ShoppingCart size={19} />{count > 0 && <span className="cart-count" data-testid="text-cart-count">{count}</span>}
          </Link>
          <Link href="/products" className="btn btn-green btn-small" data-testid="link-browse">تصفّح الأجهزة <ArrowLeft size={15} /></Link>
          <button className="icon-btn mobile-menu" aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'} onClick={() => setOpen(!open)} data-testid="button-mobile-menu">{open ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
      {open && <nav className="mobile-nav" aria-label="تنقل الجوال">
        {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} data-testid={`mobile-link-${href.replace('/', 'home')}`}>{label}</Link>)}
        <Link href="/cart" onClick={() => setOpen(false)} data-testid="mobile-link-cart">سلة الأجهزة ({count})</Link>
      </nav>}
    </header>
    <main>{children}</main>
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div><Link href="/" className="brand" data-testid="footer-brand"><img className="brand-logo" src={officialLogo} alt="" width="58" height="58" data-testid="img-footer-logo" /><span style={{ color: 'white' }}>المتحدة لابتوب<small style={{ color: '#aab9c7' }}>اختيارك التقني بثقة</small></span></Link><p>تصفّح أجهزة مستعملة ومجددة بمواصفات وأسعار وكميات يعرضها كتالوج المتجر.</p></div>
          <div><h3>تصفّح</h3><div className="footer-links"><Link href="/products" data-testid="footer-products">الأجهزة</Link><Link href="/help" data-testid="footer-help">الأسئلة والمعلومات</Link><Link href="/cart" data-testid="footer-cart">سلة الأجهزة</Link></div></div>
          <div><h3>معلومات المتجر</h3><p>تُعرض بيانات الأجهزة والأسعار والمخزون من كتالوج المتجر. الحجز والدفع الإلكتروني غير مفعّلين حالياً.</p></div>
        </div>
        <div className="footer-bottom"><span>© المتحدة لابتوب</span><span>الكتالوج متصل بقاعدة بيانات المتجر</span></div>
      </div>
    </footer>
  </div>;
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="section-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}

function CatalogStatus() {
  const { productsLoading, productsError, refreshProducts } = useStore();
  if (productsLoading) return <div className="notice" role="status">جارٍ تحميل كتالوج الأجهزة...</div>;
  if (productsError) return <div className="admin-banner" role="alert">
    <strong>تعذّر تحميل كتالوج الأجهزة.</strong> تحقق من إعداد Supabase والجدول وسياسات الوصول.
    <button className="btn btn-outline btn-small" style={{ marginRight: 12 }} onClick={() => void refreshProducts()}>إعادة المحاولة</button>
  </div>;
  return null;
}

function ProductCard({ product }: { product: Product }) {
  const { add, toast, cart } = useStore();
  const inCart = cart.find(item => item.id === product.id)?.quantity ?? 0;
  return <article className={`product-card ${inCart ? 'in-cart' : ''}`} data-testid={`card-product-${product.id}`}>
    <Link href={`/product/${product.id}`} className={`product-image-wrap ${inCart ? 'in-cart' : ''}`} aria-label={`عرض ${product.name}`} data-testid={`link-product-${product.id}`}>
      <span className="condition-chip">{product.condition === 'refurbished' ? 'مجدّد' : 'مستعمل'}</span>
      <ProductPhoto product={product} className="product-image" />
    </Link>
    <div className="product-body">
      <div className="product-brand">{product.brand} · {product.model}</div>
      <h3 className="product-name">{product.name}</h3>
      <div className="spec-inline"><span>{product.cpu}</span><span>{product.ram} رام</span><span>{product.storage}</span></div>
      <div className="price-row">
        <div className="price">{formatPrice(product.price)}</div>
        <div className="card-actions">
          <Link href={`/product/${product.id}`} className="card-action-icon" aria-label="تفاصيل الجهاز" data-testid={`button-details-${product.id}`}><ArrowUpLeft size={16} /></Link>
          <button className="btn btn-green btn-small" disabled={product.stock < 1 || inCart >= product.stock} onClick={() => { add(product.id); toast('أضيف الجهاز إلى السلة'); }} data-testid={`button-add-${product.id}`}><ShoppingBag size={14} />{inCart ? `أضف آخر · ${inCart} في السلة` : 'أضف'}</button>
        </div>
      </div>
    </div>
  </article>;
}

function Home() {
  const { products, productsLoading, productsError } = useStore();
  const featured = products.filter(p => p.featured).slice(0, 3);
  const hero = products[0];
  return <>
    <section className="hero">
      <div className="container hero-layout">
        <div>
          <span className="eyebrow"><ShieldCheck size={15} /> فحص موضح، واختيار أهدأ</span>
          <h1>حاسوبك القادم،<br /><span>اختيار مدروس.</span></h1>
          <p>تعرّف إلى أجهزة مستعملة ومجددة بمواصفات واضحة، ثم اختر ما يناسب استخدامك من كتالوج المتجر المحدّث.</p>
          <div className="hero-actions"><Link href="/products" className="btn btn-green" data-testid="button-hero-products">اكتشف الأجهزة <ArrowLeft size={16} /></Link><Link href="/help" className="btn btn-outline" data-testid="button-hero-help">كيف نعرض الأجهزة؟</Link></div>
          <div className="trust-row"><span><BadgeCheck size={15} /> تفاصيل الجهاز أمامك</span><span><RotateCcw size={15} /> حالة الجهاز موضّحة</span><span><ShoppingBag size={15} /> المخزون محدث</span></div>
        </div>
        <div className="hero-visual">{hero ? <ProductPhoto product={hero} className="hero-product" /> : <div className="hero-product-empty"><Laptop size={74} strokeWidth={1.1} /></div>}<div className="float-note"><span className="benefit-icon"><Check size={18} /></span><span><strong>بيانات واضحة</strong>تفاصيل الجهاز والمخزون محدثة</span></div></div>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <SectionTitle title="أجهزة مختارة" subtitle="مجموعة من الأجهزة المميزة في كتالوج المتجر." action={<Link href="/products" className="text-link" data-testid="link-all-products">عرض جميع الأجهزة <ArrowLeft size={15} /></Link>} />
        <CatalogStatus />
        {featured.length ? <div className="products-grid">{featured.map(product => <ProductCard product={product} key={product.id} />)}</div> :
          !productsLoading && !productsError && <div className="empty-state"><div className="empty-icon"><Laptop /></div><h2>لا توجد أجهزة مميزة حالياً</h2><p>تصفّح قائمة الأجهزة للاطلاع على الكتالوج المتاح.</p><Link href="/products" className="btn btn-green">عرض الأجهزة</Link></div>}
      </div>
    </section>
    <section className="section" style={{ paddingTop: 5 }}>
      <div className="container"><div className="benefit-strip">
        <div className="benefit"><span className="benefit-icon"><Cpu size={21} /></span><div><strong>مواصفات على المكشوف</strong><span>المعالج والذاكرة والتخزين ظاهرة في بطاقة الجهاز.</span></div></div>
        <div className="benefit"><span className="benefit-icon"><ShieldCheck size={21} /></span><div><strong>ملاحظات الحالة واضحة</strong><span>ملاحظات كل جهاز تظهر ضمن تفاصيله.</span></div></div>
        <div className="benefit"><span className="benefit-icon"><ShoppingBag size={21} /></span><div><strong>معلومات مخزون مباشرة</strong><span>تُحدّث الكميات والأسعار من كتالوج المتجر.</span></div></div>
      </div></div>
    </section>
    <section className="section" style={{ paddingTop: 2 }}><div className="container"><div className="cta-band"><div><h2>ابدأ بما تحتاجه فعلاً</h2><p>قارن الأجهزة حسب الاستخدام والمواصفات، من دون استعجال.</p></div><Link href="/products" className="btn btn-navy" data-testid="button-cta-catalog">تصفّح الأجهزة <ArrowLeft size={16} /></Link></div></div></section>
  </>;
}

function ProductsPage() {
  const { products, productsLoading, productsError } = useStore();
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('الكل');
  const [condition, setCondition] = useState('الكل');
  const [minRam, setMinRam] = useState('');
  const [maxPrice, setMaxPrice] = useState(500);
  const [sort, setSort] = useState('featured');
  const brands = Array.from(new Set(products.map(p => p.brand)));
  const shown = useMemo(() => {
    let list = products.filter(p => {
      const query = search.trim().toLowerCase();
      const matchQuery = !query || `${p.name} ${p.model} ${p.brand} ${p.cpu}`.toLowerCase().includes(query);
      const ramNum = parseInt(p.ram, 10);
      return matchQuery && (brand === 'الكل' || p.brand === brand) &&
        (condition === 'الكل' || p.condition === condition) && p.price <= maxPrice &&
        (!minRam || ramNum >= Number(minRam));
    });
    if (sort === 'low') list = [...list].sort((a,b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a,b) => b.price - a.price);
    if (sort === 'name') list = [...list].sort((a,b) => a.name.localeCompare(b.name, 'en'));
    return list;
  }, [products, search, brand, condition, maxPrice, minRam, sort]);
  const reset = () => { setSearch(''); setBrand('الكل'); setCondition('الكل'); setMinRam(''); setMaxPrice(500); setSort('featured'); };
  return <div className="container">
    <div className="page-head"><div className="crumb"><Link href="/">الرئيسية</Link><ChevronLeft size={13} /> الأجهزة</div><h1>الأجهزة</h1><p>قارن بين أجهزة مستعملة ومجددة من كتالوج المتجر.</p></div>
    <CatalogStatus />
    <div className="catalog-layout" style={{ marginTop: 18 }}>
      <aside className="filter-panel">
        <div className="filter-title"><span><SlidersHorizontal size={16} style={{ verticalAlign: 'middle', marginLeft: 7 }} /> التصفية</span><button className="remove" onClick={reset} data-testid="button-reset-filters">إعادة ضبط</button></div>
        <div className="filter-inner">
          <div className="filter-group"><h3>العلامة التجارية</h3><select className="select" value={brand} onChange={e => setBrand(e.target.value)} aria-label="العلامة التجارية" data-testid="select-brand"><option>الكل</option>{brands.map(b => <option key={b}>{b}</option>)}</select></div>
          <div className="filter-group"><h3>حالة الجهاز</h3>{[['الكل','الكل'],['used','مستعمل'],['refurbished','مجدّد']].map(([v, label]) => <label key={v}><input type="radio" name="condition" checked={condition === v} onChange={() => setCondition(v)} data-testid={`filter-condition-${v}`} />{label}</label>)}</div>
          <div className="filter-group"><h3>الذاكرة العشوائية</h3><select className="select" value={minRam} onChange={e => setMinRam(e.target.value)} data-testid="select-ram"><option value="">أي سعة</option><option value="8">٨ جيجابايت فأكثر</option><option value="16">١٦ جيجابايت فأكثر</option></select></div>
          <div className="filter-group"><h3>أقصى سعر: {formatPrice(maxPrice)}</h3><input type="range" min="100" max="500" step="10" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} aria-label="أقصى سعر بالدولار" data-testid="range-price" /><div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'#84909c' }}><span>$100</span><span>$500</span></div></div>
        </div>
      </aside>
      <div>
         <div className="catalog-top"><span className="catalog-count" data-testid="text-products-count">عرض {shown.length} من {products.length} جهاز</span><div className="catalog-controls"><label style={{ position:'relative', flex:1 }}><Search size={15} style={{ position:'absolute',right:11,top:12,color:'#81909d' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الطراز" style={{ paddingRight:34 }} aria-label="البحث عن جهاز" data-testid="input-search-products" /></label><select className="select" value={sort} onChange={e => setSort(e.target.value)} aria-label="ترتيب الأجهزة" data-testid="select-sort"><option value="featured">الترتيب الافتراضي</option><option value="low">السعر: الأقل أولاً</option><option value="high">السعر: الأعلى أولاً</option><option value="name">الاسم</option></select></div></div>
         {shown.length ? <div className="products-grid">{shown.map(product => <ProductCard product={product} key={product.id} />)}</div> : !productsLoading && !productsError && <div className="empty-state"><div className="empty-icon"><Search size={24} /></div><h2>{products.length ? 'لم نجد جهازاً مطابقاً' : 'لا توجد أجهزة في الكتالوج بعد'}</h2><p>{products.length ? 'جرّب تغيير كلمة البحث أو تخفيف خيارات التصفية.' : 'ستظهر الأجهزة هنا بعد إضافتها إلى كتالوج المتجر.'}</p>{products.length > 0 && <button className="btn btn-outline" onClick={reset} data-testid="button-empty-reset">إعادة ضبط التصفية</button>}</div>}
      </div>
    </div>
  </div>;
}

function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, productsLoading, productsError, add, toast, cart } = useStore();
  const product = products.find(p => p.id === id);
  if (productsLoading || productsError || !product) return <div className="container" style={{ padding: '55px 0' }}>
    <CatalogStatus />
    {!productsLoading && !productsError && <div className="empty-state"><div className="empty-icon"><Laptop /></div><h2>هذا الجهاز غير موجود</h2><p>قد يكون الرابط غير صحيح، أو أن الجهاز لم يعد متاحاً.</p><Link href="/products" className="btn btn-green" data-testid="link-product-not-found">العودة إلى الأجهزة</Link></div>}
  </div>;
  const inCart = cart.find(item => item.id === product.id)?.quantity ?? 0;
  return <div className="container">
    <div className="page-head"><div className="crumb"><Link href="/">الرئيسية</Link><ChevronLeft size={13} /><Link href="/products">الأجهزة</Link><ChevronLeft size={13} />{product.model}</div></div>
    <div className="detail-layout">
      <div className={`detail-photo ${inCart ? 'in-cart' : ''}`}><ProductPhoto product={product} /></div>
      <div className="detail-info">
        <div className="product-brand">{product.brand} · {product.model}</div><h1>{product.name}</h1>
        <div className="detail-badges"><span>{product.condition === 'refurbished' ? 'مجدّد' : 'مستعمل'}</span><span>{product.stock > 0 ? 'متوفر بالمخزون' : 'نفد من المخزون'}</span>{product.warranty && <span>ضمان: {product.warranty}</span>}</div>
        <div className="price">{formatPrice(product.price)}</div>
        <div className="reservation-hint">الكمية المتاحة: <strong>{product.stock}</strong></div>
        <p className="detail-desc">تعرّف إلى مواصفات هذا الجهاز وحالته، وتحقق من التوفر قبل إتمام أي طلب.</p>
        <div className="spec-table">
          <div className="spec-row"><span>المعالج</span><strong>{product.cpu}</strong></div>
          <div className="spec-row"><span>الذاكرة</span><strong>{product.ram}</strong></div>
          <div className="spec-row"><span>التخزين</span><strong>{product.storage}</strong></div>
          <div className="spec-row"><span>حالة الجهاز</span><strong>{product.condition === 'refurbished' ? 'مجدّد' : 'مستعمل'}</strong></div>
          <div className="spec-row"><span>ملاحظة الحالة</span><strong>{product.defects}</strong></div>
          <div className="spec-row"><span>مدة الضمان المذكورة</span><strong>{product.warranty}</strong></div>
          <div className="spec-row"><span>المتاح في المخزون</span><strong>{product.stock} وحدات</strong></div>
        </div>
        <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:14 }}>
          <button className="btn btn-green" disabled={product.stock < 1 || inCart >= product.stock} onClick={() => { add(product.id); toast('أضيف الجهاز إلى السلة'); }} data-testid={`button-add-detail-${product.id}`}><ShoppingBag size={16} />{inCart ? `أضف آخر · ${inCart} في السلة` : 'أضف إلى السلة'}</button>
          <Link className="btn btn-outline" href="/products" data-testid="link-back-catalog">متابعة التصفّح</Link>
        </div>
        <DemoNotice>يتم تحديث بيانات الكتالوج من المتجر. الحجز والدفع الإلكتروني غير مفعّلين حالياً.</DemoNotice>
      </div>
    </div>
  </div>;
}

function CartPage() {
  const { products, cart, qty, remove } = useStore();
  const rows = cart.map(item => ({ item, product: products.find(p => p.id === item.id) })).filter((x): x is { item: CartItem; product: Product } => Boolean(x.product));
  const total = rows.reduce((sum, row) => sum + row.product.price * row.item.quantity, 0);
  const deposit = calculateDeposit(total);
  const remaining = Number((total - deposit).toFixed(2));
  return <div className="container">
    <div className="page-head"><div className="crumb"><Link href="/">الرئيسية</Link><ChevronLeft size={13} /> السلة</div><h1>سلة الأجهزة</h1><p>مراجعة محلية لعناصر العينة قبل نموذج الحجز التجريبي.</p></div>
    <DemoNotice>السلة محفوظة في هذا المتصفح فقط؛ لا يتم إرسال الطلبات أو تنفيذ الحجز والدفع الإلكتروني حالياً.</DemoNotice>
    {!rows.length ? <div className="empty-state" style={{ marginTop:18 }}><div className="empty-icon"><ShoppingCart size={24} /></div><h2>سلتك فارغة حالياً</h2><p>أضف جهازاً من الكتالوج لتظهر تفاصيله هنا.</p><Link href="/products" className="btn btn-green" data-testid="button-empty-shop">تصفّح الأجهزة <ArrowLeft size={15} /></Link></div> :
      <div className="cart-layout" style={{ marginTop:18 }}>
        <div className="cart-list">{rows.map(({ item, product }) => <div className="cart-line" key={item.id} data-testid={`cart-item-${product.id}`}>
          <Link href={`/product/${product.id}`} className="cart-product-photo in-cart" aria-label={`تفاصيل ${product.name}`} data-testid={`cart-product-link-${product.id}`}><ProductPhoto product={product} className="cart-product-image" /></Link>
          <div><h3>{product.name}</h3><p>{product.brand} · {product.model} · {formatPrice(product.price)}</p>
            <div className="quantity"><button aria-label="تقليل الكمية" disabled={item.quantity <= 1} onClick={() => qty(product.id, item.quantity - 1)} data-testid={`button-qty-minus-${product.id}`}><Minus size={13} /></button><strong data-testid={`text-qty-${product.id}`}>{item.quantity}</strong><button aria-label="زيادة الكمية" disabled={item.quantity >= product.stock} onClick={() => qty(product.id, item.quantity + 1)} data-testid={`button-qty-plus-${product.id}`}><Plus size={13} /></button><button className="remove" onClick={() => remove(product.id)} data-testid={`button-remove-${product.id}`}><Trash2 size={13} style={{ verticalAlign:'middle',marginLeft:4 }} />إزالة</button></div>
          </div>
          <div className="price">{formatPrice(product.price * item.quantity)}</div>
        </div>)}</div>
        <aside className="summary-card"><h2>ملخص السلة</h2><div className="summary-line"><span>عدد الوحدات</span><strong>{rows.reduce((s,r)=>s+r.item.quantity,0)}</strong></div><div className="summary-line"><span>قيمة الأجهزة</span><strong>{formatPrice(total)}</strong></div><div className="summary-line summary-deposit"><span>عربون الحجز (10%)</span><strong>{formatPrice(deposit)}</strong></div><div className="summary-line"><span>المتبقي عند الاستلام (90%)</span><strong>{formatPrice(remaining)}</strong></div><div className="summary-line"><span>طريقة العربون</span><strong>سيريتل كاش — غير مفعّل</strong></div><DemoNotice>لا يتم تحويل أو تحصيل أموال من هذا الموقع.</DemoNotice><Link href="/checkout" className="btn btn-green" style={{ width:'100%', marginTop:14 }} data-testid="button-go-checkout">متابعة إلى صفحة المعلومات <ArrowLeft size={15} /></Link></aside>
      </div>}
  </div>;
}

function CheckoutPage() {
  const { products, cart, remove, recordDemoReservation } = useStore();
  const [completed, setCompleted] = useState<DemoConfirmation | null>(null);
  const checkoutSchema = z.object({
    name: z.string().trim().min(2, 'يرجى إدخال الاسم كاملاً.'),
    phone: z.string().trim().regex(/^[0-9٠-٩۰-۹+\s()-]{8,18}$/, 'أدخل رقم هاتف صحيحاً من ٨ إلى ١٨ خانة.'),
    address: z.string().trim().min(8, 'يرجى كتابة عنوان توصيل واضح.'),
    notes: z.string(),
  });
  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { name: '', phone: '', address: '', notes: '' },
  });
  const rows = cart.map(item => ({ item, product: products.find(p => p.id === item.id) })).filter((x): x is { item: CartItem; product: Product } => Boolean(x.product));
  const total = rows.reduce((sum,row) => sum + row.product.price * row.item.quantity,0);
  const deposit = calculateDeposit(total);
  const remaining = Number((total - deposit).toFixed(2));
  const submit = form.handleSubmit(() => {
    const confirmation: DemoConfirmation = {
      id: `DEMO-${Date.now().toString().slice(-6)}`,
      items: rows.map(row => row.item),
      total,
      deposit,
      remaining,
      paymentMethod: 'Syriatel Cash (محاكاة تجريبية)',
    };
    recordDemoReservation();
    setCompleted(confirmation);
    form.reset();
    rows.forEach(row => remove(row.product.id));
  });
  if (completed) return <div className="container">
    <div className="page-head"><div className="crumb"><Link href="/">الرئيسية</Link><ChevronLeft size={13} /> نتيجة النموذج</div></div>
    <div className="success-panel"><div className="empty-icon"><Check size={28} /></div><span className="eyebrow">محاكاة تجريبية فقط</span><h1>اكتملت محاكاة الحجز</h1><p>لم يُنشأ حجز فعلي ولم يتم تحويل أو تحصيل أي مبلغ عبر سيريتل كاش. لم يُرسل أو يُحفظ اسمك أو رقم هاتفك أو عنوانك.</p>
      <div className="success-detail"><span>رقم التجربة</span><strong data-testid="text-reservation-id">{completed.id}</strong><span>عدد الوحدات</span><strong>{completed.items.reduce((sum,i)=>sum+i.quantity,0)}</strong><span>قيمة الأجهزة</span><strong>{formatPrice(completed.total)}</strong><span>عربون الحجز (10%)</span><strong data-testid="text-reservation-deposit">{formatPrice(completed.deposit)}</strong><span>المتبقي عند الاستلام (90%)</span><strong>{formatPrice(completed.remaining)}</strong><span>طريقة الدفع التجريبية</span><strong>{completed.paymentMethod}</strong></div>
      <DemoNotice>هذا تأكيد لعرض تجريبي فقط، وليس إيصال دفع أو حجزاً لدى المتجر.</DemoNotice>
      <div style={{ marginTop:20 }}><Link href="/products" className="btn btn-green" data-testid="button-success-products">العودة إلى الأجهزة</Link></div>
    </div>
  </div>;
  return <div className="container">
    <div className="page-head"><div className="crumb"><Link href="/">الرئيسية</Link><ChevronLeft size={13} /><Link href="/cart">السلة</Link><ChevronLeft size={13} /> نموذج الحجز</div><h1>بيانات نموذج الحجز</h1><p>احسب عربون الحجز التجريبي بنسبة 10% من قيمة الأجهزة.</p></div>
    <DemoNotice>سيريتل كاش هنا محاكاة للعرض فقط. لن يتم طلب بيانات المحفظة أو تحويل/تحصيل أموال. بيانات التواصل لا تُحفظ ولا تُرسل.</DemoNotice>
    {!rows.length ? <div className="empty-state" style={{ marginTop:18 }}><div className="empty-icon"><ShoppingBag /></div><h2>لا توجد أجهزة في السلة</h2><p>أضف عينة واحدة على الأقل قبل فتح نموذج الحجز.</p><Link href="/products" className="btn btn-green" data-testid="button-checkout-empty">تصفّح الأجهزة</Link></div> :
      <div className="checkout-grid" style={{ marginTop:18 }}>
        <Form {...form}><form className="form-card" onSubmit={submit} noValidate data-testid="form-checkout">
          <h2>معلومات التواصل والتوصيل</h2><p>البيانات تُستخدم للتحقق من الحقول فقط، ولا تُخزّن بعد انتهاء التجربة.</p>
          <div className="field"><label htmlFor="checkout-name">الاسم الكامل <span style={{ color:'#b44742' }}>*</span></label><input id="checkout-name" autoComplete="name" {...form.register('name')} placeholder="اكتب اسمك" aria-invalid={!!form.formState.errors.name} data-testid="input-checkout-name" />{form.formState.errors.name && <div className="field-error" data-testid="error-name">{form.formState.errors.name.message}</div>}</div>
          <div className="field"><label htmlFor="checkout-phone">رقم الهاتف <span style={{ color:'#b44742' }}>*</span></label><input id="checkout-phone" type="tel" autoComplete="tel" {...form.register('phone')} placeholder="اكتب رقم هاتف للتجربة فقط" aria-invalid={!!form.formState.errors.phone} data-testid="input-checkout-phone" />{form.formState.errors.phone && <div className="field-error" data-testid="error-phone">{form.formState.errors.phone.message}</div>}</div>
          <div className="field"><label htmlFor="checkout-address">عنوان التوصيل كاملاً <span style={{ color:'#b44742' }}>*</span></label><textarea id="checkout-address" autoComplete="street-address" {...form.register('address')} placeholder="المدينة، المنطقة، الشارع، وأي تفاصيل توضيحية" aria-invalid={!!form.formState.errors.address} data-testid="input-checkout-address" />{form.formState.errors.address && <div className="field-error" data-testid="error-address">{form.formState.errors.address.message}</div>}</div>
          <div className="field"><label>طريقة دفع العربون</label><div className="payment-demo-method" data-testid="payment-method-syriatel-demo"><span className="payment-method-icon"><Wallet size={20} /></span><span><strong>سيريتل كاش · Syriatel Cash</strong><small>محاكاة تجريبية فقط، لا توجد عملية تحويل</small></span><span className="payment-selected">محدد</span></div></div>
          <div className="field"><label htmlFor="checkout-notes">ملاحظات إضافية <span style={{ fontWeight:400,color:'#81909d' }}>اختياري</span></label><textarea id="checkout-notes" {...form.register('notes')} placeholder="أي تفاصيل أخرى" data-testid="input-checkout-notes" /></div>
          <button className="btn btn-green" type="submit" data-testid="button-submit-reservation"><Check size={16} /> محاكاة الحجز ودفع العربون</button>
        </form></Form>
        <aside className="summary-card"><h2>ملخص الحجز التجريبي</h2>{rows.map(({item,product})=><div className="summary-line" key={product.id}><span>{product.name} × {item.quantity}</span><strong>{formatPrice(product.price*item.quantity)}</strong></div>)}<div className="summary-line summary-total"><span>قيمة الأجهزة</span><strong>{formatPrice(total)}</strong></div><div className="summary-line summary-deposit"><span>عربون الحجز (10%)</span><strong>{formatPrice(deposit)}</strong></div><div className="summary-line"><span>المتبقي عند الاستلام (90%)</span><strong>{formatPrice(remaining)}</strong></div><div className="summary-line"><span>الدفع التجريبي</span><strong>سيريتل كاش</strong></div><DemoNotice>لا يتم خصم أو تحويل أي مبلغ. المبالغ للتوضيح فقط.</DemoNotice></aside>
      </div>}
  </div>;
}

function HelpPage() {
  const [sent, setSent] = useState(false);
  const contactSchema = z.object({ name: z.string().trim().min(2, 'أدخل اسماً صحيحاً.'), message: z.string().trim().min(8, 'اكتب رسالة من ٨ أحرف على الأقل.') });
  const form = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema), defaultValues: { name: '', message: '' } });
  const submit = form.handleSubmit(() => { setSent(true); form.reset(); });
  return <div className="container">
    <div className="page-head"><div className="crumb"><Link href="/">الرئيسية</Link><ChevronLeft size={13} /> المساعدة</div><h1>معلومات تساعدك على الاختيار</h1><p>إجابات توضيحية حول نموذج المتجر. السياسات هنا أمثلة وليست شروطاً رسمية.</p></div>
    <DemoNotice>الأسئلة وسياسات الضمان والاسترجاع والمراسلة في هذه الصفحة أمثلة تجريبية فقط. لا توجد بيانات تواصل رسمية.</DemoNotice>
    <div className="help-grid" style={{ marginTop:18 }}>
      <section className="faq-card"><h2><CircleHelp size={17} style={{ verticalAlign:'middle',marginLeft:7 }} /> أسئلة شائعة</h2>
        {[
          ['هل الأجهزة المعروضة متاحة للشراء؟','تعرض الصفحة الأجهزة المسجلة في كتالوج المتجر. الحجز والدفع الإلكتروني غير متاحين حالياً.'],
          ['ما الفرق بين مستعمل ومجدّد؟','تصف حالة الجهاز كما يحددها المتجر في بيانات كل منتج.'],
          ['كيف يتم حساب عربون الحجز؟','تظهر قيمة توضيحية بنسبة 10% في صفحة السلة، لكن لا يتم تحصيل أي دفعة.'],
          ['ماذا تعني مدة الضمان؟','مدة الضمان المدخلة تظهر ضمن مواصفات الجهاز، ويرجى التأكد من تفاصيلها قبل الطلب.'],
        ].map(([q,a],i)=><details className="faq-item" key={q} open={i===0}><summary data-testid={`faq-question-${i}`}>{q}</summary><p data-testid={`faq-answer-${i}`}>{a}</p></details>)}
      </section>
      <section className="faq-card"><h2><ShieldCheck size={17} style={{ verticalAlign:'middle',marginLeft:7 }} /> الضمان والاسترجاع</h2>
        <div className="faq-item"><strong style={{ fontSize:13 }}>كيف تعمل هذه المعلومات في الموقع؟</strong><p>تعرض صفحة كل جهاز مواصفاته وملاحظات حالته ومدة الضمان كما أدخلها المتجر.</p></div>
        <div className="faq-item"><strong style={{ fontSize:13 }}>ماذا عن الاستبدال أو الاسترجاع؟</strong><p>لا توجد سياسة متجر فعلية مرتبطة بهذا النموذج. يجب الاتفاق على سياسة واضحة ومعتمدة قبل إطلاق خدمة حقيقية.</p></div>
        <DemoNotice>لا تعتمد على أي مدة أو سياسة واردة هنا لاتخاذ قرار شراء حقيقي.</DemoNotice>
      </section>
      <section className="faq-card"><h2><Phone size={17} style={{ verticalAlign:'middle',marginLeft:7 }} /> رسالة تجريبية</h2>
        {sent ? <div className="empty-state" style={{ padding:24 }}><div className="empty-icon"><Check /></div><h2 style={{ fontSize:17 }}>تم تأكيد الرسالة محلياً</h2><p>لم تُرسل هذه الرسالة إلى المتجر أو أي جهة أخرى، ولم تُحفظ بياناتها.</p><button className="btn btn-outline btn-small" onClick={()=>setSent(false)} data-testid="button-contact-reset">كتابة رسالة أخرى</button></div> :
          <Form {...form}><form onSubmit={submit} noValidate data-testid="form-contact"><p style={{ color:'#788795',fontSize:12,lineHeight:1.8 }}>هذا النموذج للعرض فقط ولا يرسل رسائل حقيقية.</p><div className="field"><label htmlFor="help-name">الاسم</label><input id="help-name" {...form.register('name')} placeholder="اسمك" data-testid="input-contact-name" />{form.formState.errors.name && <div className="field-error" data-testid="error-contact-name">{form.formState.errors.name.message}</div>}</div><div className="field"><label htmlFor="help-message">الرسالة</label><textarea id="help-message" {...form.register('message')} placeholder="اكتب استفسارك" data-testid="input-contact-message" />{form.formState.errors.message && <div className="field-error" data-testid="error-contact-message">{form.formState.errors.message.message}</div>}</div><button className="btn btn-green btn-small" type="submit" data-testid="button-send-contact">تأكيد محلي للرسالة</button></form></Form>}
      </section>
    </div>
  </div>;
}

function NotFound() {
  return <div className="container" style={{ padding:'60px 0' }}><div className="empty-state"><div className="empty-icon"><Laptop /></div><h2>الصفحة غير موجودة</h2><p>تحقق من الرابط أو ابدأ من الصفحة الرئيسية.</p><Link href="/" className="btn btn-green" data-testid="link-not-found-home">العودة للرئيسية</Link></div></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('almutaheda-demo-cart') || '[]') as CartItem[]; } catch { return []; }
  });
  const [demoReservationCount, setDemoReservationCount] = useState(0);
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('almutaheda-demo-theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => { localStorage.setItem('almutaheda-demo-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('almutaheda-demo-theme', darkMode ? 'dark' : 'light'); } catch { /* Theme remains active for this visit. */ }
  }, [darkMode]);
  useEffect(() => { if (!message) return; const timer=window.setTimeout(()=>setMessage(''),2600); return ()=>window.clearTimeout(timer); }, [message]);
  const refreshProducts = useCallback(async () => {
    if (!supabaseConfigured) {
      setProducts([]);
      setProductsError('بيانات اتصال Supabase غير مُعدّة.');
      setProductsLoading(false);
      return;
    }
    setProductsLoading(true);
    try {
      setProducts(await loadProducts());
      setProductsError(null);
    } catch (loadError) {
      setProducts([]);
      setProductsError(loadError instanceof Error ? loadError.message : 'تعذّر تحميل المنتجات.');
    } finally {
      setProductsLoading(false);
    }
  }, []);
  useEffect(() => { void refreshProducts(); }, [refreshProducts]);
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshProducts();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const timer = window.setInterval(refreshWhenVisible, 60_000);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(timer);
    };
  }, [refreshProducts]);
  const add = (id:string) => setCart(prev => {
    const p=products.find(product=>product.id===id); if (!p) return prev;
    const found=prev.find(item=>item.id===id);
    if (found) { if(found.quantity>=p.stock) { setMessage('وصلت إلى الحد المتاح في المخزون'); return prev; } return prev.map(item=>item.id===id?{...item,quantity:item.quantity+1}:item); }
    return [...prev,{id,quantity:1}];
  });
  const remove = (id:string) => setCart(prev=>prev.filter(item=>item.id!==id));
  const qty = (id:string, amount:number) => setCart(prev=>prev.map(item=>item.id===id?{...item,quantity:Math.min(products.find(p=>p.id===id)?.stock ?? 1,Math.max(1,amount))}:item));
  const recordDemoReservation = () => setDemoReservationCount(count => count + 1);
  const store: Store = { products,productsLoading,productsError,cart,demoReservationCount,refreshProducts,add,remove,qty,recordDemoReservation,toast:setMessage };
  return <QueryClientProvider client={queryClient}><TooltipProvider><StoreContext.Provider value={store}>
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}>
      <RoutedErrorBoundary><RoutedPages darkMode={darkMode} onToggleTheme={() => setDarkMode(value => !value)} /></RoutedErrorBoundary>
    </WouterRouter>
    {message&&<div className="toast-message" role="status" data-testid="status-toast">{message}</div>}
  </StoreContext.Provider><Toaster /></TooltipProvider></QueryClientProvider>;
}

function RoutedPages({ darkMode, onToggleTheme }: { darkMode: boolean; onToggleTheme: () => void }) {
  const [location] = useLocation();
  const { products, productsLoading, productsError, refreshProducts, toast } = useStore();
  const routes = <Switch>
    <Route path="/admin" component={() => <AdminPage products={products} loading={productsLoading} error={productsError} refresh={refreshProducts} onToast={toast} />} />
    <Route path="/" component={Home} />
    <Route path="/products" component={ProductsPage} />
    <Route path="/product/:id" component={ProductPage} />
    <Route path="/cart" component={CartPage} />
    <Route path="/checkout" component={CheckoutPage} />
    <Route path="/help" component={HelpPage} />
    <Route component={NotFound} />
  </Switch>;
  return location === '/admin' ? routes : <AppShell darkMode={darkMode} onToggleTheme={onToggleTheme}>{routes}</AppShell>;
}

export default App;
