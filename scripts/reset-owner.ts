import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type Options = { email?: string; currentEmail?: string; passwordFromStdin: boolean; help: boolean };

class InputError extends Error {}

function usage() {
  return `Usage: bun run owner:reset -- --email NEW_EMAIL --password-stdin [--current-email CURRENT_EMAIL]

Reads the new password from standard input, updates the only owner account (or
the explicit current owner), and revokes every existing Dashbored session.`;
}

function parseOptions(argv: string[]): Options {
  const options: Options = { passwordFromStdin: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--password-stdin") options.passwordFromStdin = true;
    else if (argument === "--email") options.email = argv[++index];
    else if (argument === "--current-email") options.currentEmail = argv[++index];
    else throw new InputError(`Unknown option: ${argument}`);
  }
  return options;
}

function validEmail(value: string | undefined) {
  return Boolean(value && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

async function readPassword() {
  const raw = await new Response(Bun.stdin.stream()).text();
  return raw.replace(/\r?\n$/, "");
}

async function main() {
  const options = parseOptions(Bun.argv.slice(2));
  if (options.help) {
    console.info(usage());
    return;
  }
  if (!validEmail(options.email)) throw new InputError("Provide a valid new email with --email.");
  if (options.currentEmail && !validEmail(options.currentEmail)) throw new InputError("--current-email must be a valid email address.");
  if (!options.passwordFromStdin) throw new InputError("Use --password-stdin so the new password is never placed in shell history.");

  const password = await readPassword();
  if (password.length < 12 || password.length > 128) throw new InputError("The new password must be between 12 and 128 characters.");
  if (!process.env.DATABASE_URL) throw new InputError("DATABASE_URL is not configured.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await prisma.$transaction(async (tx) => {
      const owners = await tx.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, email: true } });
      const owner = options.currentEmail
        ? owners.find((candidate) => candidate.email.toLowerCase() === options.currentEmail!.toLowerCase())
        : owners.length === 1 ? owners[0] : undefined;
      if (!owner) {
        if (!owners.length) throw new InputError("No Dashbored owner exists. Run the migration service with bootstrap credentials first.");
        throw new InputError("Multiple users exist. Repeat the command with --current-email to select the owner safely.");
      }
      const duplicate = await tx.user.findUnique({ where: { email: options.email! }, select: { id: true } });
      if (duplicate && duplicate.id !== owner.id) throw new InputError("Another Dashbored user already uses that email address.");

      const passwordHash = await hashPassword(password);
      const account = await tx.account.findFirst({ where: { userId: owner.id, providerId: "credential" }, select: { id: true } });
      await tx.user.update({ where: { id: owner.id }, data: { email: options.email! } });
      if (account) {
        await tx.account.update({ where: { id: account.id }, data: { password: passwordHash } });
      } else {
        await tx.account.create({ data: { id: crypto.randomUUID(), userId: owner.id, providerId: "credential", accountId: owner.id, password: passwordHash } });
      }
      await tx.session.deleteMany({ where: { userId: owner.id } });
    });
    console.info("Owner credentials updated. All existing sessions were revoked.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  if (error instanceof InputError) console.error(`Error: ${error.message}`);
  else console.error("Dashbored could not update the owner account. Check that this command runs inside the deployed stack with database access.");
  process.exitCode = 1;
});
