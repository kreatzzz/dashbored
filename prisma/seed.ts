import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Infrastructure", slug: "infrastructure", icon: "server", sortOrder: 10 },
  { name: "Network", slug: "network", icon: "network", sortOrder: 20 },
  { name: "Monitoring", slug: "monitoring", icon: "activity", sortOrder: 30 },
  { name: "Downloads", slug: "downloads", icon: "download", sortOrder: 40 },
  { name: "Automation", slug: "automation", icon: "radar", sortOrder: 50 },
  { name: "Media", slug: "media", icon: "film", sortOrder: 60 },
];

async function main() {
  for (const category of categories) await prisma.serviceCategory.upsert({ where: { slug: category.slug }, update: category, create: category });
  if (await prisma.user.count() === 0) {
    const email = process.env.BOOTSTRAP_EMAIL; const password = process.env.BOOTSTRAP_PASSWORD;
    if (!email || !password || password.length < 12) throw new Error("BOOTSTRAP_EMAIL and a 12+ character BOOTSTRAP_PASSWORD are required for first run");
    process.env.ALLOW_SIGNUP = "true";
    const { auth } = await import("../src/lib/auth");
    const result = await auth.api.signUpEmail({ body: { name: "Dashbored Owner", email, password } });
    if (!result.user) throw new Error("Could not create bootstrap owner");
  }
}

main().finally(() => prisma.$disconnect());
