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
};
