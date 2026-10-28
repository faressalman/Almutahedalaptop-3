import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle, ArrowDownLeft, Check, CheckCircle2, ChevronDown, CirclePlus,
  Laptop, LoaderCircle, LogOut, Package, Pencil, RefreshCw, Search, ShieldCheck,
  Trash2, X,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Product } from '@/data/products';
import { createProduct, removeProduct, updateProduct, type ProductInput } from '@/lib/products-api';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import './admin.css';

type AdminPageProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  onToast: (message: string) => void;
};

type ProductForm = {
  name: string;
  brand: string;
  model: string;
  imageUrl: string;
  price: string;
  cpu: string;
  ram: string;
  storage: string;
  condition: Product['condition'];
  defects: string;
  warranty: string;
  stock: string;
  featured: boolean;
};

const blankForm: ProductForm = {
  name: '', brand: '', model: '', imageUrl: '', price: '', cpu: '', ram: '',
  storage: '', condition: 'used', defects: '', warranty: '', stock: '0', featured: false,
};

function productToForm(product: Product): ProductForm {
  return {
    name: product.name,
    brand: product.brand,
    model: product.model,
    imageUrl: product.images[0] ?? '',
    price: String(product.price),
    cpu: product.cpu,
    ram: product.ram,
    storage: product.storage,
    condition: product.condition,
    defects: product.defects,
    warranty: product.warranty,
    stock: String(product.stock),
    featured: product.featured,
  };
}

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(value);

export default function AdminPage({ products, loading, error, refresh, onToast }: AdminPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setAuthLoading(false);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setAdminError(sessionError.message);
      setSession(data.session);
      setAuthLoading(false);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const checkAdmin = async () => {
      if (!session?.user || !supabase) {
        setIsAdmin(false);
        setAdminError('');
        setAdminLoading(false);
        return;
      }
      setAdminLoading(true);
      setAdminError('');
      const { data, error: lookupError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!alive) return;
      setIsAdmin(Boolean(data));
      setAdminError(lookupError?.message ?? '');
      setAdminLoading(false);
    };
    void checkAdmin();
    return () => { alive = false; };
  }, [session?.user?.id]);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return products;
    return products.filter(product =>
      `${product.name} ${product.brand} ${product.model}`.toLocaleLowerCase().includes(needle),
    );
  }, [products, query]);

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm(productToForm(product));
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setFormError('');
  };

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) onToast(`تعذّر تسجيل الخروج: ${signOutError.message}`);
    else onToast('تم تسجيل الخروج');
  }, [onToast]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSignInError('');
    setSignInBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSignInBusy(false);
    if (authError) setSignInError(authError.message);
    else setPassword('');
  };

  const validate = (): string => {
    if (!form.name.trim() || !form.brand.trim() || !form.model.trim()) {
      return 'يرجى إدخال اسم الجهاز والعلامة التجارية والطراز.';
    }
    if (form.imageUrl.trim()) {
      try {
        const url = new URL(form.imageUrl.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
      } catch {
        return 'أدخل رابط صورة صحيحاً يبدأ بـ https:// أو http://.';
      }
    }
    const price = Number(form.price);
    if (form.price.trim() === '' || !Number.isFinite(price) || price < 0) {
      return 'السعر مطلوب ويجب أن يكون صفراً أو أكثر.';
    }
    const stock = Number(form.stock);
    if (form.stock.trim() === '' || !Number.isInteger(stock) || stock < 0) {
      return 'الكمية مطلوبة ويجب أن تكون عدداً صحيحاً غير سالب.';
    }
    return '';
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const input: ProductInput = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
      price: Number(form.price),
      cpu: form.cpu.trim(),
      ram: form.ram.trim(),
      storage: form.storage.trim(),
      condition: form.condition,
      defects: form.defects.trim(),
      warranty: form.warranty.trim(),
      stock: Number(form.stock),
      featured: form.featured,
    };
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await updateProduct(editing.id, input);
        onToast('تم تحديث بيانات الجهاز');
      } else {
        await createProduct(input);
        onToast('تمت إضافة الجهاز إلى الكتالوج');
      }
      await refresh();
      setFormOpen(false);
      setEditing(null);
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : 'تعذّر حفظ الجهاز. حاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = window.confirm(`هل تريد حذف «${product.name}»؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!confirmed) return;
    setDeletingId(product.id);
    try {
      await removeProduct(product.id);
      await refresh();
      onToast('تم حذف الجهاز');
    } catch (mutationError) {
      onToast(`تعذّر حذف الجهاز: ${mutationError instanceof Error ? mutationError.message : 'حاول مجدداً.'}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (!supabaseConfigured || !supabase) {
    return <AdminFrame><StatusPanel
      icon={<AlertCircle size={24} />}
      eyebrow="إعداد مطلوب"
      title="الاتصال بقاعدة البيانات غير مُعدّ"
      body="أضف إعدادات Supabase للمشروع قبل استخدام مساحة إدارة الأجهزة."
      detail="VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY"
      tone="warning"
    /></AdminFrame>;
  }

  if (authLoading || (session && adminLoading)) {
    return <AdminFrame><div className="adm-loading" role="status"><span className="adm-skeleton adm-sk-title" /><span className="adm-skeleton adm-sk-line" /><span className="adm-skeleton adm-sk-panel" /><span className="adm-loading-label"><LoaderCircle size={16} /> جارٍ التحقق من صلاحية الوصول</span></div></AdminFrame>;
  }

  if (!session) {
    return <AdminFrame>
      <section className="adm-login">
        <div className="adm-login-mark"><Laptop size={25} strokeWidth={1.8} /></div>
        <div className="adm-kicker"><span className="adm-live-dot" /> مساحة خاصة · إدارة المخزون</div>
        <h1>مرحباً بعودتك</h1>
        <p className="adm-login-copy">سجّل الدخول بحساب الإدارة للوصول إلى كتالوج المتحدة لابتوب.</p>
        {adminError && <div className="adm-alert adm-alert-error"><AlertCircle size={16} />{adminError}</div>}
        <form className="adm-login-form" onSubmit={handleSignIn}>
          <label htmlFor="adm-email">البريد الإلكتروني</label>
          <input id="adm-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" data-testid="input-admin-email" />
          <label htmlFor="adm-password">كلمة المرور</label>
          <input id="adm-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="أدخل كلمة المرور" data-testid="input-admin-password" />
          {signInError && <div className="adm-field-error" role="alert" data-testid="error-admin-signin">{signInError}</div>}
          <button className="adm-button adm-button-primary adm-login-submit" type="submit" disabled={signInBusy} data-testid="button-admin-signin">
            {signInBusy ? <><LoaderCircle className="adm-spin" size={17} /> جارٍ التحقق...</> : <>تسجيل الدخول <ArrowDownLeft size={17} /></>}
          </button>
        </form>
        <div className="adm-login-foot"><ShieldCheck size={15} /> وصول مخصص لحسابات الإدارة المعتمدة فقط</div>
      </section>
    </AdminFrame>;
  }

  if (adminError) {
    return <AdminFrame><StatusPanel icon={<AlertCircle size={24} />} eyebrow="تعذّر التحقق" title="لم نتمكن من تأكيد صلاحية الحساب" body={adminError} action={<button className="adm-button adm-button-primary" onClick={() => window.location.reload()}>إعادة المحاولة <RefreshCw size={15} /></button>} tone="warning" /></AdminFrame>;
  }

  if (!isAdmin) {
    return <AdminFrame><StatusPanel
      icon={<ShieldCheck size={24} />}
      eyebrow="حساب غير مخوّل"
      title="هذه المساحة مخصصة للإدارة"
      body="تم تسجيل الدخول بنجاح، لكن هذا الحساب غير مدرج ضمن مستخدمي الإدارة."
      action={<button className="adm-button adm-button-primary" onClick={() => void signOut()}><LogOut size={16} /> تسجيل الخروج</button>}
      tone="quiet"
    /></AdminFrame>;
  }

  return <AdminFrame>
    <header className="adm-topbar">
      <div className="adm-brand">
        <div className="adm-brand-icon"><Laptop size={20} /></div>
        <div><strong>المتحدة لابتوب</strong><span>مساحة إدارة خاصة</span></div>
      </div>
      <div className="adm-topbar-actions">
        <span className="adm-session"><span className="adm-live-dot" /> جلسة آمنة</span>
        <button className="adm-button adm-button-quiet" onClick={() => void signOut()} data-testid="button-admin-signout"><LogOut size={16} /> تسجيل الخروج</button>
      </div>
    </header>
    <main className="adm-main">
      <div className="adm-heading">
        <div>
          <div className="adm-breadcrumb"><span>مساحة العمل</span><span className="adm-breadcrumb-sep">/</span><strong>الأجهزة</strong></div>
          <h1>الأجهزة</h1>
          <p>إدارة بيانات الكتالوج والمخزون من مكان واحد.</p>
        </div>
        <button className="adm-button adm-button-primary" onClick={openCreate} data-testid="button-product-create"><CirclePlus size={17} /> إضافة جهاز</button>
      </div>

      {error && <div className="adm-alert adm-alert-error adm-page-alert" role="alert" data-testid="error-products"><AlertCircle size={17} /><span>{error}</span><button onClick={() => void refresh()} className="adm-alert-action">إعادة المحاولة</button></div>}

      <section className="adm-overview" aria-label="ملخص المخزون">
        <div className="adm-overview-icon"><Package size={20} /></div>
        <div className="adm-overview-copy"><span>إجمالي الأجهزة في الكتالوج</span><strong>{loading ? '—' : products.length.toLocaleString('ar')}</strong></div>
        <div className="adm-overview-divider" />
        <div className="adm-overview-stat"><span>متوفر بالمخزون</span><strong>{loading ? '—' : products.filter(product => product.stock > 0).length.toLocaleString('ar')}</strong></div>
        <div className="adm-overview-stat"><span>نفد من المخزون</span><strong>{loading ? '—' : products.filter(product => product.stock === 0).length.toLocaleString('ar')}</strong></div>
        <span className="adm-overview-note"><CheckCircle2 size={14} /> بيانات مباشرة</span>
      </section>

      <section className="adm-catalog">
        <div className="adm-catalog-head">
          <div><h2>كتالوج الأجهزة</h2><span>{loading ? 'جارٍ تحميل البيانات' : `${filteredProducts.length.toLocaleString('ar')} جهاز`}</span></div>
          <div className="adm-catalog-tools">
            <label className="adm-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالاسم أو العلامة أو الطراز" aria-label="البحث في الأجهزة" data-testid="input-admin-search" /><kbd>⌘ K</kbd></label>
            <button className="adm-icon-button" onClick={() => void refresh()} aria-label="تحديث قائمة الأجهزة" title="تحديث" data-testid="button-products-refresh"><RefreshCw className={loading ? 'adm-spin' : ''} size={17} /></button>
          </div>
        </div>
        {loading ? <ProductSkeleton /> : filteredProducts.length === 0 ? (
          query ? <div className="adm-empty"><div className="adm-empty-icon"><Search size={22} /></div><h3>لا توجد نتائج مطابقة</h3><p>جرّب البحث باسم أو علامة تجارية أخرى.</p><button className="adm-button adm-button-outline" onClick={() => setQuery('')}>مسح البحث</button></div> :
          <div className="adm-empty"><div className="adm-empty-icon"><Package size={22} /></div><h3>الكتالوج جاهز لاستقبال أول جهاز</h3><p>أضف بيانات الجهاز والسعر والمخزون ليظهر في كتالوج المتجر.</p><button className="adm-button adm-button-primary" onClick={openCreate}><CirclePlus size={16} /> إضافة أول جهاز</button></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>الجهاز</th><th>العلامة والطراز</th><th>الحالة</th><th>السعر</th><th>المخزون</th><th>الظهور</th><th><span className="adm-sr-only">إجراءات</span></th></tr></thead>
              <tbody>{filteredProducts.map(product => <tr key={product.id} data-testid={`row-admin-product-${product.id}`}>
                <td><div className="adm-product-cell"><ProductThumb product={product} /><div><strong>{product.name}</strong><small>{product.cpu || 'المواصفات غير مضافة'}</small></div></div></td>
                <td><span className="adm-brand-model">{product.brand}</span><small className="adm-model">{product.model}</small></td>
                <td><span className={`adm-condition ${product.condition}`}>{product.condition === 'refurbished' ? 'مجدّد' : 'مستعمل'}</span></td>
                <td><strong className="adm-price">{money(product.price)}</strong></td>
                <td><span className={`adm-stock ${product.stock === 0 ? 'out' : product.stock <= 2 ? 'low' : ''}`}><i />{product.stock.toLocaleString('ar')} {product.stock === 1 ? 'قطعة' : 'قطع'}</span></td>
                <td>{product.featured ? <span className="adm-featured">مميّز</span> : <span className="adm-muted">عادي</span>}</td>
                <td><div className="adm-row-actions">
                  <button className="adm-row-action" onClick={() => openEdit(product)} aria-label={`تعديل ${product.name}`} title="تعديل" data-testid={`button-product-edit-${product.id}`}><Pencil size={15} /></button>
                  <button className="adm-row-action danger" onClick={() => void deleteProduct(product)} disabled={deletingId === product.id} aria-label={`حذف ${product.name}`} title="حذف" data-testid={`button-product-delete-${product.id}`}>{deletingId === product.id ? <LoaderCircle className="adm-spin" size={15} /> : <Trash2 size={15} />}</button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {!loading && filteredProducts.length > 0 && <div className="adm-table-foot"><span>عرض {filteredProducts.length.toLocaleString('ar')} من {products.length.toLocaleString('ar')} جهاز</span><span>تُحفظ التعديلات مباشرة في الكتالوج</span></div>}
      </section>
      <footer className="adm-footer"><span>المتحدة لابتوب <i /> إدارة الكتالوج</span><span>وصول خاص · بيانات محمية</span></footer>
    </main>

    {formOpen && <div className="adm-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeForm(); }}>
      <section className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-form-title" dir="rtl">
        <header className="adm-modal-head"><div><span className="adm-modal-kicker">{editing ? 'تحديث الكتالوج' : 'إدخال إلى الكتالوج'}</span><h2 id="adm-form-title">{editing ? 'تعديل بيانات الجهاز' : 'إضافة جهاز جديد'}</h2></div><button className="adm-icon-button" onClick={closeForm} aria-label="إغلاق النموذج" disabled={saving}><X size={18} /></button></header>
        <form onSubmit={submitProduct} noValidate>
          <div className="adm-form-scroll">
            {formError && <div className="adm-alert adm-alert-error" role="alert" data-testid="error-product-form"><AlertCircle size={16} />{formError}</div>}
            <div className="adm-form-section"><span className="adm-form-section-title">التعريف بالجهاز</span>
              <div className="adm-form-grid">
                <Field label="اسم الجهاز" required><input autoFocus value={form.name} onChange={event => setField('name', event.target.value)} placeholder="مثال: ThinkPad X1 Carbon" data-testid="input-product-name" /></Field>
                <Field label="العلامة التجارية" required><input value={form.brand} onChange={event => setField('brand', event.target.value)} placeholder="Lenovo" data-testid="input-product-brand" /></Field>
                <Field label="الطراز" required><input value={form.model} onChange={event => setField('model', event.target.value)} placeholder="X1 Carbon Gen 9" data-testid="input-product-model" /></Field>
                <Field label="رابط الصورة" hint="رابط مباشر للصورة، اختياري"><input type="url" dir="ltr" value={form.imageUrl} onChange={event => setField('imageUrl', event.target.value)} placeholder="https://example.com/laptop.jpg" data-testid="input-product-image" /></Field>
              </div>
            </div>
            <div className="adm-form-section"><span className="adm-form-section-title">السعر والمخزون</span>
              <div className="adm-form-grid adm-form-grid-3">
                <Field label="السعر بالدولار" required><div className="adm-input-suffix"><input type="number" min="0" step="0.01" value={form.price} onChange={event => setField('price', event.target.value)} placeholder="0.00" data-testid="input-product-price" /><span>USD</span></div></Field>
                <Field label="الكمية المتاحة" required><input type="number" min="0" step="1" value={form.stock} onChange={event => setField('stock', event.target.value)} placeholder="0" data-testid="input-product-stock" /></Field>
                <Field label="حالة الجهاز"><div className="adm-select-wrap"><select value={form.condition} onChange={event => setField('condition', event.target.value as Product['condition'])} data-testid="select-product-condition"><option value="used">مستعمل</option><option value="refurbished">مجدّد</option></select><ChevronDown size={15} /></div></Field>
              </div>
            </div>
            <div className="adm-form-section"><span className="adm-form-section-title">المواصفات والملاحظات <small>كل الحقول اختيارية</small></span>
              <div className="adm-form-grid adm-form-grid-3">
                <Field label="المعالج"><input value={form.cpu} onChange={event => setField('cpu', event.target.value)} placeholder="Intel Core i5-1135G7" data-testid="input-product-cpu" /></Field>
                <Field label="الذاكرة العشوائية"><input value={form.ram} onChange={event => setField('ram', event.target.value)} placeholder="16GB" data-testid="input-product-ram" /></Field>
                <Field label="التخزين"><input value={form.storage} onChange={event => setField('storage', event.target.value)} placeholder="512GB SSD" data-testid="input-product-storage" /></Field>
                <Field label="ملاحظات الحالة"><input value={form.defects} onChange={event => setField('defects', event.target.value)} placeholder="أي خدوش أو ملاحظات معروفة" data-testid="input-product-defects" /></Field>
                <Field label="الضمان"><input value={form.warranty} onChange={event => setField('warranty', event.target.value)} placeholder="مثال: شهر واحد" data-testid="input-product-warranty" /></Field>
              </div>
            </div>
            <label className="adm-feature-toggle"><input type="checkbox" checked={form.featured} onChange={event => setField('featured', event.target.checked)} data-testid="checkbox-product-featured" /><span className="adm-toggle-ui" /><span><strong>جهاز مميّز</strong><small>إبرازه ضمن اختيارات المتجر</small></span></label>
          </div>
          <footer className="adm-modal-foot"><button type="button" className="adm-button adm-button-outline" onClick={closeForm} disabled={saving}>إلغاء</button><button type="submit" className="adm-button adm-button-primary" disabled={saving} data-testid="button-product-save">{saving ? <><LoaderCircle className="adm-spin" size={16} /> جارٍ الحفظ</> : <><Check size={16} />{editing ? 'حفظ التعديلات' : 'إضافة الجهاز'}</>}</button></footer>
        </form>
      </section>
    </div>}
  </AdminFrame>;
}

function AdminFrame({ children }: { children: ReactNode }) {
  return <div className="adm-root" dir="rtl"><div className="adm-ambient" aria-hidden="true" />{children}</div>;
}

function StatusPanel({ icon, eyebrow, title, body, detail, action, tone }: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  action?: ReactNode;
  tone: 'warning' | 'quiet';
}) {
  return <section className={`adm-status-panel ${tone}`}><div className="adm-status-icon">{icon}</div><span className="adm-kicker">{eyebrow}</span><h1>{title}</h1><p>{body}</p>{detail && <code>{detail}</code>}{action}</section>;
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return <label className="adm-field"><span className="adm-field-label">{label}{required && <em>مطلوب</em>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function ProductThumb({ product }: { product: Product }) {
  const [broken, setBroken] = useState(false);
  return product.images[0] && !broken
    ? <img className="adm-thumb" src={product.images[0]} alt="" onError={() => setBroken(true)} />
    : <div className="adm-thumb adm-thumb-fallback"><Laptop size={21} /></div>;
}

function ProductSkeleton() {
  return <div className="adm-skeleton-table" aria-label="جارٍ تحميل الأجهزة">{Array.from({ length: 5 }, (_, index) => <div className="adm-skeleton-row" key={index}><span className="adm-skeleton adm-sk-thumb" /><span className="adm-skeleton adm-sk-product" /><span className="adm-skeleton adm-sk-short" /><span className="adm-skeleton adm-sk-short" /><span className="adm-skeleton adm-sk-short" /></div>)}</div>;
}

