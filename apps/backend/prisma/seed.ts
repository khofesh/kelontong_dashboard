import { faker } from "@faker-js/faker";
import { PrismaClient, Role } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

faker.seed(20261023);

const categories = [
  { name: "Snacks", slug: "snacks" },
  { name: "Minuman", slug: "minuman" },
  { name: "Sembako", slug: "sembako" },
  { name: "Bumbu Dapur", slug: "bumbu-dapur" },
  { name: "Perlengkapan Mandi", slug: "perlengkapan-mandi" },
  { name: "Kebersihan Rumah", slug: "kebersihan-rumah" },
  { name: "Rokok", slug: "rokok" },
  { name: "Makanan Instan", slug: "makanan-instan" },
];

const productNames: Record<string, string[]> = {
  snacks: [
    "Ciki Ciki Pedas",
    "Keripik Singkong Balado",
    "Kacang Garuda Panggang",
    "Biskuit Kelapa Renyah",
    "Wafer Cokelat Susu",
    "Kerupuk Udang Mentah",
    "Taro Net Seaweed",
    "Kacang Atom Pedas Manis",
  ],
  minuman: [
    "Teh Botol Sosro",
    "Air Mineral Cleo",
    "Susu Ultra Cokelat",
    "Kopi Kapal Api Special",
    "Minuman Jeruk Segar",
    "Sari Roti Susu Kedelai",
    "Pocari Sweat Botol",
    "Floridina Orange",
  ],
  sembako: [
    "Beras Pandan Wangi 5kg",
    "Minyak Goreng Bimoli 2L",
    "Gula Pasir Gulaku 1kg",
    "Telur Ayam Negeri",
    "Tepung Terigu Segitiga Biru",
    "Kacang Hijau Kupas",
    "Beras Merah Organik",
    "Mie Telur Kering",
  ],
  "bumbu-dapur": [
    "Garam Beryodium Refina",
    "Kecap Manis ABC",
    "Saus Sambal ABC",
    "Bawang Putih Kupas",
    "Merica Bubuk Ladaku",
    "Penyedap Rasa Royco",
    "Ketumbar Bubuk",
    "Cuka Dapur DIXI",
  ],
  "perlengkapan-mandi": [
    "Sabun Lifebuoy Batang",
    "Shampoo Pantene 340ml",
    "Pasta Gigi Pepsodent",
    "Sikat Gigi Formula",
    "Sabun Cair Dettol",
    "Handuk Mandi Katun",
    "Deodoran Rexona Roll On",
    "Sisir Plastik",
  ],
  "kebersihan-rumah": [
    "Detergen Rinso 1kg",
    "Pembersih Lantai Super Pell",
    "Spons Cuci Piring",
    "Sapu Ijuk Panjang",
    "Kantong Sampah Hitam",
    "Pembersih Kaca Windex",
    "Sikat WC Plastik",
    "Pengharum Ruangan Stella",
  ],
  rokok: [
    "Rokok Gudang Garam Surya",
    "Rokok Djarum Super",
    "Rokok Sampoerna Mild",
    "Rokok Bentoel Biru",
    "Rokok Marlboro Filter",
    "Rokok Dji Sam Soe",
  ],
  "makanan-instan": [
    "Indomie Goreng Spesial",
    "Mie Sedaap Soto",
    "Sarimi Ayam Bawang",
    "Pop Mie Rasa Ayam",
    "Nugget Fiesta Ayam",
    "Sosis So Nice Ayam",
    "Bakso Instan So Good",
    "Corned Beef Pronas",
  ],
};

const variants = [
  "Original",
  "Jumbo",
  "Family Pack",
  "Renceng",
  "Isi 12",
  "Refill",
  "Ekonomis",
  "Premium",
];

function skuFor(index: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let n = index * 7919 + 104729;
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / 7.3);
  }
  return out;
}

async function main() {
  const [adminHash, staffHash] = await Promise.all([
    argon2.hash("Admin12345"),
    argon2.hash("Staff12345"),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kelontong.test" },
    update: {
      name: "Admin kelontong",
      role: Role.ADMIN,
      passwordHash: adminHash,
    },
    create: {
      email: "admin@kelontong.test",
      name: "Admin kelontong",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@kelontong.test" },
    update: {
      name: "Staff kelontong",
      role: Role.STAFF,
      passwordHash: staffHash,
    },
    create: {
      email: "staff@kelontong.test",
      name: "Staff kelontong",
      passwordHash: staffHash,
      role: Role.STAFF,
    },
  });

  const categoryRows = [];
  for (const category of categories) {
    categoryRows.push(
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category,
      }),
    );
  }

  const usedSkus = new Set<string>();
  for (let i = 0; i < 100; i += 1) {
    const category = categoryRows[i % categoryRows.length];
    const baseNames = productNames[category.slug];
    const baseName =
      baseNames[Math.floor(i / categoryRows.length) % baseNames.length];
    const variant = variants[i % variants.length];
    const name = `${baseName} ${variant}`;

    let sku = skuFor(i);
    let attempt = 0;
    while (usedSkus.has(sku)) {
      attempt += 1;
      sku = skuFor(i + attempt * 1000);
    }
    usedSkus.add(sku);

    const price =
      Math.round(faker.number.int({ min: 1000, max: 150000 }) / 500) * 500;
    const stock = faker.number.int({ min: 0, max: 500 });
    const isActive = i % 10 !== 0;
    const archived = i % 20 === 7;
    const imageUrl =
      i % 10 === 3 ? null : `https://picsum.photos/seed/${sku}/400/400`;
    const now = Date.now();

    await prisma.product.upsert({
      where: { sku },
      update: {},
      create: {
        sku,
        name,
        description: `${name} — produk pilihan toko kelontong kami.`,
        categoryId: category.id,
        weight: faker.number.int({ min: 50, max: 2000 }),
        width: faker.number.int({ min: 3, max: 40 }),
        length: faker.number.int({ min: 3, max: 40 }),
        height: faker.number.int({ min: 2, max: 30 }),
        imageUrl,
        price,
        stock,
        isActive,
        deletedAt: archived ? new Date(now - 1000 * 60 * 60 * 24 * 14) : null,
        createdById: admin.id,
        updatedById: admin.id,
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * (100 - i)),
      },
    });
  }

  const productCount = await prisma.product.count();
  console.log(
    `Seed complete: ${categoryRows.length} categories, ${productCount} products.`,
  );
  console.log(
    "Test accounts: admin@kelontong.test / Admin12345, staff@kelontong.test / Staff12345",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
