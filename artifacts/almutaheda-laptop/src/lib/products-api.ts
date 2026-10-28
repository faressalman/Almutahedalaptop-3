import { supabase } from './supabase';
import type { Product } from '../data/products';

type ProductRecord = {
  id: string;
  name: string;
  brand: string;
  model: string;
  image_url: string;
  price: number | string;
  cpu: string;
  ram: string;
  storage: string;
  condition: Product['condition'];
  defects: string;
  warranty: string;
  stock: number;
  featured: boolean;
};

export type ProductInput = Omit<Product, 'id'>;

function requireSupabase() {
  if (!supabase) {
    throw new Error('أضف VITE_SUPABASE_URL وVITE_SUPABASE_ANON_KEY لإعداد الاتصال بقاعدة البيانات.');
  }
  return supabase;
}

function fromRecord(record: ProductRecord): Product {
  return {
    id: record.id,
    name: record.name,
    brand: record.brand,
    model: record.model,
    images: record.image_url ? [record.image_url] : [],
    price: Number(record.price),
    cpu: record.cpu,
    ram: record.ram,
    storage: record.storage,
    condition: record.condition,
    defects: record.defects,
    warranty: record.warranty,
    stock: record.stock,
    featured: record.featured,
  };
}

function toRecord(product: ProductInput) {
  return {
    name: product.name.trim(),
    brand: product.brand.trim(),
    model: product.model.trim(),
    image_url: product.images[0]?.trim() ?? '',
    price: product.price,
    cpu: product.cpu.trim(),
    ram: product.ram.trim(),
    storage: product.storage.trim(),
    condition: product.condition,
    defects: product.defects.trim(),
    warranty: product.warranty.trim(),
    stock: product.stock,
    featured: product.featured,
  };
}

export async function loadProducts(): Promise<Product[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .select('id,name,brand,model,image_url,price,cpu,ram,storage,condition,defects,warranty,stock,featured')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProductRecord[]).map(fromRecord);
}

export async function createProduct(product: ProductInput): Promise<Product> {
  const client = requireSupabase();
  const { data, error } = await client.from('products').insert(toRecord(product))
    .select('id,name,brand,model,image_url,price,cpu,ram,storage,condition,defects,warranty,stock,featured')
    .single();
  if (error) throw new Error(error.message);
  return fromRecord(data as ProductRecord);
}

export async function updateProduct(id: string, product: ProductInput): Promise<Product> {
  const client = requireSupabase();
  const { data, error } = await client.from('products').update(toRecord(product)).eq('id', id)
    .select('id,name,brand,model,image_url,price,cpu,ram,storage,condition,defects,warranty,stock,featured')
    .single();
  if (error) throw new Error(error.message);
  return fromRecord(data as ProductRecord);
}

export async function removeProduct(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
