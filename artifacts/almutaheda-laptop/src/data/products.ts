export type Product = {
  id: string;
  name: string;
  brand: string;
  model: string;
  images: string[];
  price: number;
  cpu: string;
  ram: string;
  storage: string;
  condition: 'used' | 'refurbished';
  defects: string;
  warranty: string;
  stock: number;
  featured: boolean;
  demo: boolean;
};

export const products: Product[] = [
  {
    id: 'dell-latitude-5420', name: 'Dell Latitude 5420', brand: 'Dell', model: 'Latitude 5420',
    images: ['/laptop-dell.jpg'], price: 248, cpu: 'Intel Core i5-1145G7', ram: '16 جيجابايت',
    storage: '512 جيجابايت SSD', condition: 'used', defects: 'خدوش سطحية بسيطة على الغطاء — مثال',
    warranty: '٣ أشهر — مثال توضيحي', stock: 4, featured: true, demo: true,
  },
  {
    id: 'hp-elitebook-840', name: 'HP EliteBook 840 G7', brand: 'HP', model: 'EliteBook 840 G7',
    images: ['/laptop-hp.jpg'], price: 285, cpu: 'Intel Core i5-10310U', ram: '16 جيجابايت',
    storage: '256 جيجابايت SSD', condition: 'refurbished', defects: 'علامة استخدام خفيفة بجانب لوحة اللمس — مثال',
    warranty: '٦ أشهر — مثال توضيحي', stock: 2, featured: true, demo: true,
  },
  {
    id: 'lenovo-thinkpad-t14', name: 'Lenovo ThinkPad T14 Gen 2', brand: 'Lenovo', model: 'ThinkPad T14 Gen 2',
    images: ['/laptop-lenovo.jpg'], price: 319, cpu: 'AMD Ryzen 5 PRO 5650U', ram: '16 جيجابايت',
    storage: '512 جيجابايت SSD', condition: 'used', defects: 'لا توجد ملاحظات إضافية في هذه العينة — مثال',
    warranty: '٣ أشهر — مثال توضيحي', stock: 3, featured: true, demo: true,
  },
  {
    id: 'asus-vivobook-15', name: 'ASUS VivoBook 15', brand: 'ASUS', model: 'VivoBook 15',
    images: ['/laptop-asus.jpg'], price: 219, cpu: 'Intel Core i5-1135G7', ram: '8 جيجابايت',
    storage: '512 جيجابايت SSD', condition: 'refurbished', defects: 'خدش صغير أسفل الجهاز — مثال',
    warranty: '٦ أشهر — مثال توضيحي', stock: 5, featured: false, demo: true,
  },
  {
    id: 'dell-inspiron-5510', name: 'Dell Inspiron 15 5510', brand: 'Dell', model: 'Inspiron 15 5510',
    images: ['/laptop-dell-inspiron.jpg'], price: 269, cpu: 'Intel Core i7-11370H', ram: '16 جيجابايت',
    storage: '512 جيجابايت SSD', condition: 'used', defects: 'آثار استخدام بسيطة على الحواف — مثال',
    warranty: '٣ أشهر — مثال توضيحي', stock: 1, featured: false, demo: true,
  },
  {
    id: 'hp-probook-450', name: 'HP ProBook 450 G8', brand: 'HP', model: 'ProBook 450 G8',
    images: ['/laptop-hp-probook.jpg'], price: 297, cpu: 'Intel Core i5-1135G7', ram: '16 جيجابايت',
    storage: '512 جيجابايت SSD', condition: 'refurbished', defects: 'تم تغيير البطارية في مثال العينة — مثال',
    warranty: '٦ أشهر — مثال توضيحي', stock: 3, featured: false, demo: true,
  },
];
