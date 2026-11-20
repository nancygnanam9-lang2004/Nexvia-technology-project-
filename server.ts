import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 4001);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required. Copy .env.example to .env and set it.");

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

type AuthRequest = express.Request & { user?: { id: string; role: Role } };
function authenticate(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET!) as { id: string; role: Role };
    next();
  } catch { return res.status(401).json({ error: "Invalid or expired token" }); }
}
function allow(...roles: Role[]) {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

app.get("/health", (_req, res) => res.json({ status: "ok", project: "FS-01 marketplace" }));

app.post("/api/auth/register", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2), email: z.string().email(),
    password: z.string().min(8), role: z.enum(["CUSTOMER", "VENDOR"]).default("CUSTOMER"),
    storeName: z.string().min(2).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password, role, storeName } = parsed.data;
  if (role === "VENDOR" && !storeName) return res.status(400).json({ error: "storeName is required for vendors" });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role,
        ...(role === "VENDOR" ? { vendor: { create: { storeName: storeName!, approved: false } } } : {}) },
      select: { id: true, name: true, email: true, role: true }
    });
    res.status(201).json({ user, message: role === "VENDOR" ? "Vendor account created; admin approval is pending." : "Account created." });
  } catch { res.status(409).json({ error: "Email may already be registered." }); }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email and password are required" });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET!, { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/products", async (req, res) => {
  const search = String(req.query.search || "");
  const products = await prisma.product.findMany({
    where: { active: true, name: { contains: search, mode: "insensitive" } },
    include: { vendor: { select: { storeName: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(products);
});

app.post("/api/products", authenticate, allow(Role.VENDOR), async (req: AuthRequest, res) => {
  const parsed = z.object({
    name: z.string().min(2), description: z.string().min(5),
    price: z.number().positive(), stock: z.number().int().min(0), imageUrl: z.string().url().optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
  if (!vendor?.approved) return res.status(403).json({ error: "Vendor approval is required before listing products." });
  const product = await prisma.product.create({ data: { ...parsed.data, vendorId: vendor.id } });
  res.status(201).json(product);
});

app.patch("/api/products/:id", authenticate, allow(Role.VENDOR, Role.ADMIN), async (req: AuthRequest, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { vendor: true } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (req.user!.role === Role.VENDOR && product.vendor.userId !== req.user!.id) return res.status(403).json({ error: "You can only edit your own products" });
  const parsed = z.object({ name: z.string().min(2).optional(), description: z.string().min(5).optional(), price: z.number().positive().optional(), stock: z.number().int().min(0).optional(), active: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.json(await prisma.product.update({ where: { id: product.id }, data: parsed.data }));
});

app.get("/api/admin/vendors", authenticate, allow(Role.ADMIN), async (_req, res) => {
  res.json(await prisma.vendor.findMany({ include: { user: { select: { name: true, email: true } } } }));
});
app.patch("/api/admin/vendors/:id/approve", authenticate, allow(Role.ADMIN), async (req, res) => {
  res.json(await prisma.vendor.update({ where: { id: req.params.id }, data: { approved: true } }));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
app.listen(PORT, () => console.log(`FS-01 API running at http://localhost:${PORT}`));
