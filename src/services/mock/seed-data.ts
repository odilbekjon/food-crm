import type { ExpenseCategory, RoleId, SalaryType } from '@/types'

/** Demo ma'lumotlar uchun statik ro'yxatlar. Hisob-kitoblar seed.ts da domen funksiyalari orqali bajariladi. */

export const CATEGORY_NAMES = [
  'Sut mahsulotlari',
  'Non va qandolat',
  'Ichimliklar',
  "Go'sht va baliq",
  'Meva-sabzavot',
  'Bakaleya',
  'Shirinliklar',
  'Maishiy kimyo',
] as const

export type SupplierKey = 'dairy' | 'bakery' | 'farm' | 'meat' | 'trade' | 'home'

export interface SeedProduct {
  name: string
  category: (typeof CATEGORY_NAMES)[number]
  unit: 'dona' | 'kg' | 'litr' | 'gramm'
  cost: number
  price: number
  minStock: number
  shelfLife: number | null
  /** Ommabopligi 1..10 — savdoda uchrash ehtimoli */
  pop: number
  supplier: SupplierKey
  /** true bo'lsa, oxirgi kunlarda qayta xarid qilinmaydi (kam qolgan zaxira demosi uchun) */
  noRestockLate?: boolean
}

export const SEED_PRODUCTS: SeedProduct[] = [
  // Sut mahsulotlari
  { name: 'Sut 1 litr', category: 'Sut mahsulotlari', unit: 'dona', cost: 9500, price: 12000, minStock: 20, shelfLife: 10, pop: 9, supplier: 'dairy' },
  { name: 'Qatiq 500 g', category: 'Sut mahsulotlari', unit: 'dona', cost: 5500, price: 7500, minStock: 15, shelfLife: 12, pop: 6, supplier: 'dairy' },
  { name: 'Smetana 400 g', category: 'Sut mahsulotlari', unit: 'dona', cost: 11000, price: 14500, minStock: 10, shelfLife: 14, pop: 5, supplier: 'dairy' },
  { name: 'Tvorog', category: 'Sut mahsulotlari', unit: 'kg', cost: 38000, price: 48000, minStock: 6, shelfLife: 7, pop: 3, supplier: 'dairy' },
  { name: "Sariyog' 200 g", category: 'Sut mahsulotlari', unit: 'dona', cost: 22000, price: 28000, minStock: 10, shelfLife: 40, pop: 4, supplier: 'dairy' },
  { name: 'Pishloq (Rossiya)', category: 'Sut mahsulotlari', unit: 'kg', cost: 78000, price: 98000, minStock: 5, shelfLife: 30, pop: 3, supplier: 'dairy' },
  { name: 'Kefir 1 litr', category: 'Sut mahsulotlari', unit: 'dona', cost: 8500, price: 11000, minStock: 12, shelfLife: 10, pop: 5, supplier: 'dairy' },
  // Non va qandolat
  { name: 'Patir non', category: 'Non va qandolat', unit: 'dona', cost: 3500, price: 5000, minStock: 30, shelfLife: 4, pop: 10, supplier: 'bakery' },
  { name: 'Bulka', category: 'Non va qandolat', unit: 'dona', cost: 2200, price: 3500, minStock: 20, shelfLife: 4, pop: 7, supplier: 'bakery' },
  { name: 'Lavash', category: 'Non va qandolat', unit: 'dona', cost: 2500, price: 4000, minStock: 20, shelfLife: 5, pop: 6, supplier: 'bakery' },
  { name: 'Napoleon torti', category: 'Non va qandolat', unit: 'kg', cost: 65000, price: 90000, minStock: 2, shelfLife: 5, pop: 1, supplier: 'bakery' },
  { name: 'Pechenye 450 g', category: 'Non va qandolat', unit: 'dona', cost: 9000, price: 12500, minStock: 12, shelfLife: 120, pop: 4, supplier: 'trade' },
  { name: 'Vafli 300 g', category: 'Non va qandolat', unit: 'dona', cost: 7000, price: 9500, minStock: 12, shelfLife: 150, pop: 3, supplier: 'trade' },
  // Ichimliklar
  { name: 'Kola 1,5 litr', category: 'Ichimliklar', unit: 'dona', cost: 9500, price: 12000, minStock: 24, shelfLife: 270, pop: 8, supplier: 'trade' },
  { name: 'Apelsin ichimligi 1,5 litr', category: 'Ichimliklar', unit: 'dona', cost: 9000, price: 11500, minStock: 18, shelfLife: 270, pop: 5, supplier: 'trade' },
  { name: 'Mineral suv 1,5 litr', category: 'Ichimliklar', unit: 'dona', cost: 3000, price: 4500, minStock: 30, shelfLife: 365, pop: 8, supplier: 'trade' },
  { name: 'Qora choy (100 paketcha)', category: 'Ichimliklar', unit: 'dona', cost: 28000, price: 36000, minStock: 10, shelfLife: 700, pop: 3, supplier: 'trade' },
  { name: 'Eruvchan kofe 95 g', category: 'Ichimliklar', unit: 'dona', cost: 36000, price: 46000, minStock: 8, shelfLife: 500, pop: 3, supplier: 'trade' },
  { name: 'Meva sharbati 1 litr', category: 'Ichimliklar', unit: 'dona', cost: 8500, price: 11000, minStock: 15, shelfLife: 180, pop: 4, supplier: 'trade' },
  // Go'sht va baliq
  { name: "Mol go'shti", category: "Go'sht va baliq", unit: 'kg', cost: 95000, price: 118000, minStock: 10, shelfLife: 5, pop: 4, supplier: 'meat', noRestockLate: true },
  { name: "Tovuq go'shti", category: "Go'sht va baliq", unit: 'kg', cost: 36000, price: 46000, minStock: 15, shelfLife: 6, pop: 7, supplier: 'meat' },
  { name: 'Doktorskiy kolbasa', category: "Go'sht va baliq", unit: 'kg', cost: 62000, price: 80000, minStock: 6, shelfLife: 20, pop: 4, supplier: 'meat' },
  { name: 'Sosiska', category: "Go'sht va baliq", unit: 'kg', cost: 48000, price: 62000, minStock: 6, shelfLife: 15, pop: 4, supplier: 'meat' },
  { name: 'Seld baliq', category: "Go'sht va baliq", unit: 'kg', cost: 42000, price: 55000, minStock: 4, shelfLife: 10, pop: 2, supplier: 'meat' },
  // Meva-sabzavot
  { name: 'Kartoshka', category: 'Meva-sabzavot', unit: 'kg', cost: 5500, price: 8000, minStock: 40, shelfLife: 20, pop: 9, supplier: 'farm' },
  { name: 'Piyoz', category: 'Meva-sabzavot', unit: 'kg', cost: 3500, price: 5500, minStock: 30, shelfLife: 30, pop: 8, supplier: 'farm' },
  { name: 'Sabzi', category: 'Meva-sabzavot', unit: 'kg', cost: 4000, price: 6000, minStock: 30, shelfLife: 25, pop: 7, supplier: 'farm' },
  { name: 'Pomidor', category: 'Meva-sabzavot', unit: 'kg', cost: 9000, price: 13000, minStock: 20, shelfLife: 7, pop: 6, supplier: 'farm' },
  { name: 'Bodring', category: 'Meva-sabzavot', unit: 'kg', cost: 7000, price: 10000, minStock: 15, shelfLife: 7, pop: 6, supplier: 'farm' },
  { name: 'Olma', category: 'Meva-sabzavot', unit: 'kg', cost: 12000, price: 17000, minStock: 20, shelfLife: 20, pop: 5, supplier: 'farm' },
  { name: 'Banan', category: 'Meva-sabzavot', unit: 'kg', cost: 16000, price: 22000, minStock: 15, shelfLife: 6, pop: 5, supplier: 'farm', noRestockLate: true },
  // Bakaleya
  { name: 'Guruch (lazer)', category: 'Bakaleya', unit: 'kg', cost: 16000, price: 21000, minStock: 40, shelfLife: 365, pop: 7, supplier: 'trade' },
  { name: 'Makaron 400 g', category: 'Bakaleya', unit: 'dona', cost: 5500, price: 7500, minStock: 20, shelfLife: 540, pop: 6, supplier: 'trade' },
  { name: 'Un (oliy nav)', category: 'Bakaleya', unit: 'kg', cost: 6500, price: 8500, minStock: 50, shelfLife: 365, pop: 6, supplier: 'trade' },
  { name: 'Shakar', category: 'Bakaleya', unit: 'kg', cost: 11500, price: 14000, minStock: 40, shelfLife: 730, pop: 8, supplier: 'trade' },
  { name: "O'simlik yog'i", category: 'Bakaleya', unit: 'litr', cost: 20000, price: 25500, minStock: 30, shelfLife: 365, pop: 7, supplier: 'trade' },
  { name: 'Tuz 1 kg', category: 'Bakaleya', unit: 'dona', cost: 2000, price: 3000, minStock: 20, shelfLife: 1000, pop: 4, supplier: 'trade' },
  { name: 'Grechka', category: 'Bakaleya', unit: 'kg', cost: 15000, price: 19500, minStock: 20, shelfLife: 400, pop: 4, supplier: 'trade' },
  { name: 'Zira (gramm)', category: 'Bakaleya', unit: 'gramm', cost: 110, price: 170, minStock: 800, shelfLife: 500, pop: 2, supplier: 'trade', noRestockLate: true },
  // Shirinliklar
  { name: 'Sutli shokolad 90 g', category: 'Shirinliklar', unit: 'dona', cost: 9500, price: 12500, minStock: 15, shelfLife: 300, pop: 5, supplier: 'trade' },
  { name: 'Konfet assorti', category: 'Shirinliklar', unit: 'kg', cost: 45000, price: 58000, minStock: 6, shelfLife: 180, pop: 3, supplier: 'trade' },
  { name: 'Muzqaymoq', category: 'Shirinliklar', unit: 'dona', cost: 6000, price: 8500, minStock: 20, shelfLife: 120, pop: 4, supplier: 'dairy' },
  // Maishiy kimyo
  { name: 'Kir yuvish kukuni 3 kg', category: 'Maishiy kimyo', unit: 'dona', cost: 62000, price: 79000, minStock: 6, shelfLife: null, pop: 2, supplier: 'home' },
  { name: 'Idish yuvish vositasi 500 ml', category: 'Maishiy kimyo', unit: 'dona', cost: 12000, price: 16000, minStock: 10, shelfLife: null, pop: 3, supplier: 'home' },
  { name: 'Kir sovun', category: 'Maishiy kimyo', unit: 'dona', cost: 3500, price: 5000, minStock: 15, shelfLife: null, pop: 4, supplier: 'home' },
  { name: 'Qog‘oz salfetka', category: 'Maishiy kimyo', unit: 'dona', cost: 3000, price: 4500, minStock: 20, shelfLife: null, pop: 4, supplier: 'home' },
]

export interface SeedSupplier {
  key: SupplierKey
  name: string
  phone: string
  address: string
  note: string
}

export const SEED_SUPPLIERS: SeedSupplier[] = [
  { key: 'dairy', name: 'Sut-Oziq MChJ', phone: '+998 71 234 56 78', address: 'Toshkent, Yunusobod tumani', note: 'Haftada 2 marta yetkazadi' },
  { key: 'bakery', name: 'Baraka novvoyxonasi', phone: '+998 90 111 22 33', address: 'Toshkent, Chilonzor tumani', note: 'Har kuni ertalab' },
  { key: 'farm', name: 'Agro-Fresh fermer xo‘jaligi', phone: '+998 93 456 78 90', address: 'Toshkent viloyati, Zangiota', note: 'Mavsumiy narxlar' },
  { key: 'meat', name: 'Go‘sht-Plus', phone: '+998 91 777 88 99', address: 'Toshkent, Sergeli tumani', note: 'Sovutgichli transport' },
  { key: 'trade', name: 'Toshkent Oziq-ovqat Savdo', phone: '+998 71 200 30 40', address: 'Toshkent, Qibray tumani', note: 'Ulgurji bakaleya va ichimliklar' },
  { key: 'home', name: 'Maishiy-Market ulgurji', phone: '+998 97 555 66 77', address: 'Toshkent, Olmazor tumani', note: '' },
]

export interface SeedCustomer {
  name: string
  phone: string
  address: string
  note: string
  /** Faollik og'irligi (savdolar ulushi) */
  weight: number
  /** Nasiyaga olish ehtimoli yuqori mijoz */
  creditProne: boolean
}

export const SEED_CUSTOMERS: SeedCustomer[] = [
  { name: 'Aziza Karimova', phone: '+998 90 123 45 67', address: 'Chilonzor, 12-kvartal', note: '', weight: 10, creditProne: false },
  { name: 'Bobur Rahimov', phone: '+998 91 234 56 78', address: 'Yunusobod, 4-mavze', note: '', weight: 8, creditProne: true },
  { name: 'Dilnoza Yusupova', phone: '+998 93 345 67 89', address: 'Mirzo Ulug‘bek tumani', note: 'Doimiy mijoz, sut mahsulotlarini yoqtiradi', weight: 9, creditProne: false },
  { name: 'Jasur Toshmatov', phone: '+998 94 456 78 90', address: 'Sergeli, 7-mavze', note: '', weight: 6, creditProne: true },
  { name: 'Malika Abdullayeva', phone: '+998 95 567 89 01', address: 'Chilonzor, 9-kvartal', note: '', weight: 7, creditProne: false },
  { name: 'Sardor Ergashev', phone: '+998 97 678 90 12', address: 'Olmazor tumani', note: 'Oyiga bir marta hisob-kitob qiladi', weight: 7, creditProne: true },
  { name: 'Nodira Saidova', phone: '+998 98 789 01 23', address: 'Shayxontohur tumani', note: '', weight: 5, creditProne: false },
  { name: 'Otabek Nazarov', phone: '+998 99 890 12 34', address: 'Yakkasaroy tumani', note: '', weight: 4, creditProne: false },
  { name: 'Gulnora Ismoilova', phone: '+998 90 901 23 45', address: 'Chilonzor, 20-kvartal', note: '', weight: 5, creditProne: false },
  { name: 'Rustam Qodirov', phone: '+998 91 012 34 56', address: 'Uchtepa tumani', note: '', weight: 3, creditProne: true },
  { name: 'Shahlo Mirzayeva', phone: '+998 93 123 45 98', address: 'Yunusobod, 11-mavze', note: '', weight: 4, creditProne: false },
  { name: 'Anvar Sobirov', phone: '+998 94 234 56 09', address: 'Bektemir tumani', note: '', weight: 3, creditProne: false },
  { name: 'Zilola Hamidova', phone: '+998 95 345 67 10', address: 'Chilonzor, 3-kvartal', note: '', weight: 3, creditProne: false },
  { name: 'Ulug‘bek Tursunov', phone: '+998 97 456 78 21', address: 'Sergeli, 2-mavze', note: 'Nasiyani vaqtida to‘laydi', weight: 4, creditProne: true },
  { name: 'Feruza Normatova', phone: '+998 98 567 89 32', address: 'Mirobod tumani', note: '', weight: 2, creditProne: false },
  { name: 'Jahongir Aliyev', phone: '+998 99 678 90 43', address: 'Yashnobod tumani', note: '', weight: 2, creditProne: true },
  { name: 'Madina Xolmatova', phone: '+998 90 789 01 54', address: 'Chilonzor, 14-kvartal', note: '', weight: 3, creditProne: false },
  { name: 'Sherzod Botirov', phone: '+998 91 890 12 65', address: 'Olmazor tumani', note: '', weight: 2, creditProne: false },
  { name: 'Kamola Raximova', phone: '+998 93 901 23 76', address: 'Yunusobod, 1-mavze', note: '', weight: 2, creditProne: false },
  { name: 'Behzod Umarov', phone: '+998 94 012 34 87', address: 'Uchtepa tumani', note: '', weight: 1, creditProne: false },
  { name: 'Lola Ganiyeva', phone: '+998 95 123 45 11', address: 'Shayxontohur tumani', note: '', weight: 1, creditProne: false },
  { name: 'Doniyor Salimov', phone: '+998 97 234 56 22', address: 'Sergeli, 5-mavze', note: '', weight: 1, creditProne: true },
  { name: 'Nargiza choyxonasi', phone: '+998 71 245 67 80', address: 'Chilonzor, ko‘cha bozori', note: 'Yuridik shaxs, oyiga hisob-kitob', weight: 6, creditProne: true },
  { name: 'Ixlos kafe', phone: '+998 71 256 78 91', address: 'Yunusobod, Amir Temur shoh ko‘chasi', note: 'Haftada 2 marta ulgurji xarid', weight: 5, creditProne: true },
]

export interface SeedEmployee {
  name: string
  phone: string
  position: string
  role: RoleId
  hireDate: string
  salaryType: SalaryType
  salary: number
  status: 'active' | 'inactive'
}

export const SEED_EMPLOYEES: SeedEmployee[] = [
  { name: 'Akmal Yo‘ldoshev', phone: '+998 90 100 20 30', position: 'Direktor', role: 'owner', hireDate: '2021-03-01', salaryType: 'monthly', salary: 3_500_000, status: 'active' },
  { name: 'Nilufar Qosimova', phone: '+998 91 200 30 40', position: 'Menejer', role: 'manager', hireDate: '2022-06-15', salaryType: 'monthly', salary: 3_000_000, status: 'active' },
  { name: 'Dilshod Karimov', phone: '+998 93 300 40 50', position: 'Kassir', role: 'cashier', hireDate: '2023-02-10', salaryType: 'monthly', salary: 1_900_000, status: 'active' },
  { name: 'Sevara Abdurahmonova', phone: '+998 94 400 50 60', position: 'Kassir', role: 'cashier', hireDate: '2023-09-01', salaryType: 'monthly', salary: 2_000_000, status: 'active' },
  { name: 'Hamid Rustamov', phone: '+998 95 500 60 70', position: 'Kassir', role: 'cashier', hireDate: '2024-04-20', salaryType: 'monthly', salary: 1_900_000, status: 'active' },
  { name: 'Bekzod Tillayev', phone: '+998 97 600 70 80', position: 'Omborchi', role: 'storekeeper', hireDate: '2022-11-05', salaryType: 'monthly', salary: 2_200_000, status: 'active' },
  { name: 'Mohira Sultonova', phone: '+998 98 700 80 90', position: 'Buxgalter', role: 'accountant', hireDate: '2023-05-12', salaryType: 'monthly', salary: 2_200_000, status: 'active' },
  { name: 'Jamshid Ortiqov', phone: '+998 99 800 90 10', position: 'Sotuvchi', role: 'cashier', hireDate: '2024-01-15', salaryType: 'daily', salary: 130_000, status: 'inactive' },
]

export const EXPENSE_NOTES: Record<ExpenseCategory, string[]> = {
  rent: ['Do‘kon ijarasi'],
  utilities: ['Elektr energiyasi', 'Suv va kanalizatsiya', 'Internet va telefon', 'Gaz'],
  transport: ['Yetkazib berish — yoqilg‘i', 'Yuk tashish xizmati', 'Taksi — tovar tashish'],
  repair: ['Muzlatkich ta’miri', 'Javonlarni almashtirish', 'Kassa apparati servisi'],
  other: ['Paketlar va chek qog‘ozi', 'Tozalash vositalari', 'Reklama (banner)', 'Ro‘yxatdan o‘tish to‘lovi'],
}
