# GM Collection House — E-Commerce Platform

> **Full-stack e-commerce platform for GM Collection House, Nepal's women's clothing store.**  
> Built with Next.js 15 · Express.js · PostgreSQL · Prisma · Tailwind CSS

---

## 🏗️ Project Structure

```
gmc-ecommerce/
├── apps/
│   ├── api/          # Express.js REST API (Port 5000)
│   ├── web/          # Next.js Customer Storefront (Port 3000)
│   └── admin/        # Next.js Admin Panel (Port 3001)
└── packages/
    └── database/     # Prisma schema & migrations
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL 15+
- A Cloudinary account (free tier works)
- Sparrow SMS account (for OTP — Nepal)

### 1. Clone & Install
```bash
git clone <repo>
cd gmc-ecommerce
npm install
```

### 2. Configure Environment
```bash
# API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your credentials

# Web
cp apps/web/.env.example apps/web/.env.local

# Admin
cp apps/admin/.env.example apps/admin/.env.local
```

### 3. Set Up Database
```bash
# Make sure PostgreSQL is running
# Create database: gmc_ecommerce

cd packages/database
npm run db:push       # Apply schema to DB
npm run db:generate   # Generate Prisma client
npm run db:studio     # (Optional) Open Prisma Studio
```

### 4. Create Super Admin
```bash
# Connect to your DB and run:
INSERT INTO users (id, name, phone, role, "isVerified", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Admin', '98XXXXXXXX', 'SUPER_ADMIN', true, NOW(), NOW());

# Or use Prisma Studio: npm run db:studio
```

### 5. Run Development
```bash
# Run all apps simultaneously
npm run dev

# Or run individually:
cd apps/api   && npm run dev    # API on :5000
cd apps/web   && npm run dev    # Storefront on :3000
cd apps/admin && npm run dev    # Admin on :3001
```

---

## 🔑 Key Features

| Feature | Status |
|---------|--------|
| Phone OTP Login | ✅ Ready |
| Product Management + AI Fashion Images | ✅ Ready |
| **TikTok Video Embed on Products** | ✅ Ready |
| Cart, Wishlist, Checkout | ✅ Ready |
| FonePay Payment | ⚙️ Stub (activate with API keys) |
| NepalPay Payment | ⚙️ Stub (activate with API keys) |
| Cash on Delivery | ✅ Ready |
| NepalCanMove Delivery | ✅ Integrated & Live Tested (Demo/Production Ready) |
| Live Order Tracking | ✅ Ready (NCM tracking + status sync) |
| Thermal Shipping Label | ✅ Ready (NCM standard label printable from Admin) |
| POS In-Store Billing | ✅ Ready |
| Thermal Receipt Printing | ✅ Ready |
| Accounting & Reports | ✅ Ready |
| AI Chatbot (Gemini) | ✅ Ready |
| AI Search | ✅ Ready |
| Admin Panel (full) | ✅ Ready |
| Store Settings (from admin) | ✅ Ready |
| Barcode / QR Code Generation | ✅ Ready |

---

## 📱 TikTok Integration

When adding a product in the Admin Panel:
1. Paste any TikTok URL (long or short link)
2. Admin sees a live preview (thumbnail + title)
3. On the product page, customers see the video embedded directly
4. Homepage shows an **"As Seen on TikTok 🎵"** section

---

## 🚚 NepalCanMove (NCM) Logistics Integration

The platform connects directly to NepalCanMove for automated order dispatch, branch routing, and live tracking.

### Configuration (`apps/api/.env`)
```env
# NepalCanMove API Token (Header format: Token <TOKEN>)
NCM_API_TOKEN=0c593255a1805c938fd006ab01db5465fa680d8c
NCM_BASE_URL=https://demo.nepalcanmove.com
NCM_DEFAULT_FROM_BRANCH=TINKUNE
```

> **Switch to Live Production:** Simply update `NCM_BASE_URL=https://nepalcanmove.com` and replace `NCM_API_TOKEN` with your live merchant token.

---

## 💳 Payment Gateways

When you receive live payment credentials:

### FonePay
```env
FONEPAY_MERCHANT_CODE=your-merchant-code
FONEPAY_SECRET_KEY=your-secret-key
FONEPAY_BASE_URL=https://clientapi.fonepay.com/api/merchantRequest
```

### NepalPay
```env
NEPALPAY_MERCHANT_ID=your-merchant-id
NEPALPAY_SECRET_KEY=your-secret-key
NEPALPAY_BASE_URL=https://api.nepalpay.com.np/v1
```

---

## 🛡️ Security Features

- JWT access tokens (15min) + refresh tokens (30 days) with rotation
- OTP rate limiting (3 OTPs/minute, 5 OTPs/15 min per IP)
- HMAC-SHA512 payment webhook verification
- Helmet.js security headers
- CORS whitelist
- Global API rate limiting (200 req/15min)
- Account blocking system
- Role-based access control (CUSTOMER, CASHIER, ADMIN, SUPER_ADMIN)

---

## 🌐 API Endpoints

| Module | Base URL |
|--------|---------|
| Auth | `POST /api/auth/send-otp` |
| Products | `GET /api/products` |
| Orders | `GET /api/orders` |
| Cart | `GET /api/cart` |
| Payments | `POST /api/payments/initiate` |
| Tracking | `GET /api/orders/:id/tracking` |
| POS | `POST /api/pos/sales` |
| AI Chat | `POST /api/ai/chat` |
| Settings | `GET /api/settings` |

Full API docs: `http://localhost:5000/api/health`

---

## 📞 Support

**GM Collection House**  
Configure all store details from the Admin Panel → Settings page.

---

*Built with ❤️ for GM Collection House, Nepal*
