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

const serviceSeeds = [
  { category: "infrastructure", name: "Beszel", slug: "beszel", adapterType: "beszel", icon: "gauge", port: 8090, description: "Host and container telemetry" },
  { category: "infrastructure", name: "Portainer", slug: "portainer", adapterType: "portainer", icon: "container", port: 9443, protocol: "https", description: "Container operations" },
  { category: "infrastructure", name: "Docker", slug: "docker", adapterType: "generic", icon: "boxes", port: 9443, protocol: "https", description: "Runtime via Portainer and Beszel" },
  { category: "network", name: "AdGuard Home", slug: "adguard-home", adapterType: "adguard", icon: "shield", port: 3000, description: "DNS filtering and query activity" },
  { category: "network", name: "Unbound", slug: "unbound", adapterType: "generic", icon: "network", port: 3000, description: "Recursive DNS upstream" },
  { category: "monitoring", name: "Uptime Kuma", slug: "uptime-kuma", adapterType: "uptime-kuma", icon: "activity", port: 3001, description: "Availability and latency monitors" },
  { category: "downloads", name: "qBittorrent", slug: "qbittorrent", adapterType: "generic", icon: "download", port: 8080, description: "Transfer queue" },
  { category: "automation", name: "Radarr", slug: "radarr", adapterType: "generic", icon: "film", port: 7878, description: "Movie automation" },
  { category: "automation", name: "Sonarr", slug: "sonarr", adapterType: "generic", icon: "radar", port: 8989, description: "Series automation" },
  { category: "media", name: "Jellyfin", slug: "jellyfin", adapterType: "generic", icon: "tv", port: 8096, description: "Media streaming" },
  { category: "media", name: "Immich", slug: "immich", adapterType: "generic", icon: "image", port: 2283, description: "Private photo library" },
];

async function main() {
  for (const category of categories) await prisma.serviceCategory.upsert({ where: { slug: category.slug }, update: category, create: category });
  const records = await prisma.serviceCategory.findMany();
  const ids = Object.fromEntries(records.map((record) => [record.slug, record.id]));
  for (const [sortOrder, service] of serviceSeeds.entries()) {
    const protocol = service.protocol ?? "http";
    const seedHost = process.env.SEED_SERVICE_HOST ?? "server.home.arpa";
    const url = `${protocol}://${seedHost}:${service.port}`;
    await prisma.serviceInstance.upsert({ where: { slug: service.slug }, update: {}, create: { name: service.name, slug: service.slug, adapterType: service.adapterType, icon: service.icon, description: service.description, categoryId: ids[service.category], sortOrder, baseUrl: url, launchUrl: url } });
  }
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
