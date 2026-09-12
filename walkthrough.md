# GM Collection House — E-Commerce Platform Build Walkthrough

## 🌸 Overview
A full-stack, enterprise-grade e-commerce platform custom-built for **GM Collection House**, a women's clothing store in Nepal.

The platform provides a complete ecosystem:
1. **Customer Storefront (`apps/web`)**: Modern, high-converting fashion store with embedded TikTok video previews, cart, Nepal address checkout, and live order tracking.
2. **Admin Panel (`apps/admin`)**: Real-time product inventory management, live TikTok link validator, orders tracking, accounting & profit reports, store settings editor, and in-store POS billing.
3. **Backend API (`apps/api`)**: Robust Express.js REST API with Sparrow SMS OTP authentication, FonePay, NepalPay & COD payment processors, and NepalCanMove logistics.
4. **Database (`packages/database`)**: PostgreSQL schema with Prisma ORM encompassing all models, relations, seed data, and indexes.

---

## 🎵 TikTok Video Integration

The store owner requested: *"the preview of the clothe of direct tiktok link of that video playing in the site"*.

Here is how the entire TikTok pipeline operates:
1. **Admin Panel**: When creating or editing a product, the owner pastes any public TikTok video URL (long format or short `vm.tiktok.com` link).
2. **Backend Processing (`tiktok.service.ts`)**:
   - Resolves short URLs if needed.
   - Extracts the video ID and `@username`.
   - Fetches official oEmbed metadata (title & thumbnail) without requiring an API key.
3. **Live Admin Preview**: Admin sees an instant thumbnail and title validation directly inside the product modal.
4. **Customer Storefront**:
   - **Product Details Page (`/product/[slug]`)**: Displays a dedicated **"See It in Action 🎵 on TikTok"** section featuring an inline 9:16 responsive video player (`TikTokEmbed.tsx`).
   - **Homepage**: Features an **"As Seen on TikTok"** carousel showcasing clothing items that have styling videos attached.
   - **Product Cards**: Display a stylish `🎵 Video` badge.

---

## 🛒 Features Implemented

### Customer Storefront (`apps/web` — Port 3000)
- **Feminine Brand Design**: Rose-pink palette (`#C9184A`), clean typography, optimized for ladies' traditional (Kurta, Saree, Lehenga) and western wear.
- **Phone Number OTP Login**: 6-digit OTP authentication via Sparrow SMS Nepal (no password needed).
- **Shopping Bag & Wishlist**: Persistent cart with real-time total, item quantity steppers, and free delivery indicator above Rs. 2,000.
- **Nepal-Specific Checkout**: Province selection (Bagmati, Gandaki, Koshi, Madhesh, Lumbini, Karnali, Sudurpashchim), district, municipality, ward, and landmark.
- **Flexible Payments**:
  - Cash on Delivery (COD) — no VAT.
  - FonePay QR scan.
  - NepalPay QR scan.
- **Live NepalCanMove Tracking (`/order/[id]`)**: Visual step-by-step timeline (Order Placed ➔ Confirmed ➔ Packed ➔ Dispatched via NCM ➔ Out for Delivery ➔ Delivered) with direct tracking link.
- **AI Shopping Stylist Chatbot**: Floating chatbot widget powered by Google Gemini with store context.

### Admin Panel (`apps/admin` — Port 3001)
- **Dashboard**: Revenue trends, sales by category, order counts, top-selling products, and low stock warnings.
- **Product Management**:
  - Add/edit products with multiple images, sizes, and colors.
  - Paste TikTok video URL with live preview.
  - One-click **AI Fashion Image Generation** button.
  - Barcode and QR code generation.
- **Order Management**: Filter by status, inspect customer addresses, and advance order status (moves to `PACKED` ➔ automatically creates a shipment in NepalCanMove).
- **POS In-Store Billing Terminal (`/pos`)**:
  - Search or scan products by barcode or SKU.
  - Quantity steppers and line-item discounts.
  - Bill-level discounts and automatic cash change calculation.
  - One-click thermal receipt printer dialog.
- **Accounting & Profit Module (`/accounting`)**:
  - Revenue, COGS, gross profit, and net profit calculations.
  - Expense tracker (Rent, Utilities, Salaries, Marketing) with CRUD operations.
- **Store Settings (`/settings`)**:
  - Update store name, phone numbers, location, business hours, social links, and delivery rates directly from the UI without touching code.

---

## 🚀 Running the Project

### One-Click Start
Run the following PowerShell script from `C:\Users\ACER\Desktop\GMC`:
```powershell
.\dev.ps1
```
This script automatically:
1. Starts the local portable PostgreSQL database if not running.
2. Launches the API on `http://localhost:5000`.
3. Launches the Customer Storefront on `http://localhost:3000`.
4. Launches the Admin Panel on `http://localhost:3001`.

### Default Accounts & Credentials
- **Admin Phone**: `9800000000` (Super Admin access for owner)
- **Admin Panel URL**: [http://localhost:3001/login](http://localhost:3001/login)
- **Customer Storefront URL**: [http://localhost:3000](http://localhost:3000)
- **API Health Endpoint**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
