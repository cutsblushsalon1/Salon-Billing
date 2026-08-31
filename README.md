# ✂️ Cuts & Blush Unisex Salon — Salon Billing & Management System

A modern **salon billing and front-desk management system** built for day-to-day salon operations.

It helps a salon manage **billing, clients, appointments, staff, services, products, memberships, follow-ups, reports, and salon settings** from one simple web application.

The app is built with **React + Vite + Tailwind CSS** and uses **Supabase** for authentication, cloud data sync, appointments, public invoices, and real-time updates.

---

## 📌 What is this project?

**Cuts & Blush Unisex Salon** is an internal salon management dashboard.

Instead of managing bills, customer records, appointments, staff information, memberships, and reports in separate tools, the salon can manage everything from one place.

### Main workflow

**Customer books → Appointment appears → Staff confirms → Customer visits → Bill is created → Invoice is shared → Visit is saved → Follow-up becomes due → Customer returns**

The system also supports a separate public salon website/booking experience through Supabase.

---

## ✨ Features

### 🔐 Login & Access
- Secure email/password login with Supabase Auth.
- Protected dashboard and staff screens.
- Public invoice pages can be opened without login.

### 📊 Dashboard
- Today's revenue.
- Monthly revenue.
- Revenue trend.
- Popular services.
- Recent bills.
- Quick actions.

### 🧾 Billing
- Create new bills quickly.
- Search and select existing clients.
- Add new clients while billing.
- Add services and retail products.
- Apply discounts.
- Apply tax.
- Select payment method.
- Assign staff to bill items.
- Track service and product revenue.
- Generate invoice numbers automatically.

### 📄 Invoice
- Clean invoice preview.
- Print invoices.
- Download invoices as PDF.
- Share invoices through WhatsApp.
- Public invoice links such as `/invoice/INV-0001`.
- Public invoice links do not require customer login.

### 📚 Billing History
- Search by bill number or client.
- Filter by date.
- Filter by payment method.
- Open previous bills.
- Print, download PDF, or share previous invoices.

### 👥 Clients
- Central client directory.
- Search clients.
- Track visit history.
- Track total spending.
- View individual client profiles.
- Reuse client information while creating bills.

### 📅 Appointments
- Receive bookings from the salon's public website.
- Upcoming, today, past, and all appointment views.
- Pending/confirmed/completed/cancelled statuses.
- Assign a preferred staff member.
- Prevent double-booking for the same staff member and time slot.
- Automatically show new bookings through Supabase Realtime.
- Browser notifications for new appointments.
- Quickly convert an appointment into a bill.

### 🔔 Follow-ups & Retention
- Automatically identify clients who have not visited for a configured number of days.
- Search and filter follow-up clients.
- Member-only follow-up filtering.
- WhatsApp follow-up messages.
- Custom message templates.
- Template variables such as client name, salon name, last visit date, and days since visit.
- Optional webhook-based automated messaging.
- Follow-up history tracking.

### 👑 Memberships
- Create membership plans.
- Enroll clients into memberships.
- Renew memberships.
- Track active and expiring memberships.
- Service discounts.
- Product discounts.
- Birthday discounts.
- Anniversary discounts.
- Free services by gender.
- Free-service validity.
- Membership sales commission.
- Share membership information through WhatsApp.

### 👨‍💼 Staff
- Staff directory.
- Add/edit staff.
- Staff roles.
- Staff phone numbers.
- Joining dates.
- Salary tracking.
- Service commission percentage.
- Product commission percentage.
- Staff performance and revenue tracking.
- Membership sales tracking.
- Attendance management.
- Attendance statuses: Present, Absent, Half Day, Leave.
- Export attendance to Excel.

### ✂️ Services
- Manage salon services.
- Service categories.
- Male/Female/Unisex service support.
- Service pricing.
- Service duration.
- Search services.
- Edit/delete services.
- Export service catalog to Excel.

### 📦 Products & Stock
- Manage retail products.
- Product categories.
- Product pricing.
- Stock quantity.
- Low-stock threshold.
- Low-stock warnings.
- Increase/decrease stock.
- Search products.
- Export product catalog to Excel.

### 📈 Reports
- Revenue trends.
- Top clients.
- Service performance.
- Payment-method breakdown.
- Date-range filtering.

### ⚙️ Settings
- Salon name and profile.
- Tagline and address.
- Invoice settings.
- Tax defaults.
- Invoice numbering.
- Invoice footer/custom text.
- Follow-up configuration.
- Login email/password update.
- JSON backup.
- JSON restore.
- Reset catalog to defaults.
- Publish service catalog.
- Publish staff roster.

### ☁️ Cloud Sync & Offline Cache
- Supabase acts as the shared cloud data source.
- Data is synchronized across devices/browsers.
- LocalStorage is maintained as a local cache/fallback.
- Initial cloud data takes priority over local seed data.
- Billing uses safe fetch-and-merge syncing to reduce accidental overwrites.

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | Frontend UI |
| Vite | Development and production build |
| Tailwind CSS | Styling |
| React Router | Page routing |
| Supabase | Auth, database, realtime sync |
| Recharts | Dashboard and report charts |
| jsPDF | PDF invoices |
| jsPDF AutoTable | Invoice tables |
| SheetJS / XLSX | Excel exports |
| PapaParse | CSV handling |
| Lucide React | Icons |
| Vercel | Deployment |

---

## 📁 Project Structure

```text
Salon-Billing-main/
├── src/
│   ├── components/
│   │   ├── BillPreview.jsx
│   │   ├── EditBillModal.jsx
│   │   ├── Layout.jsx
│   │   ├── Login.jsx
│   │   ├── Sidebar.jsx
│   │   └── ui.jsx
│   │
│   ├── context/
│   │   └── AppContext.jsx
│   │
│   ├── data/
│   │   └── seed.js
│   │
│   ├── lib/
│   │   ├── appStateSync.js
│   │   └── supabaseClient.js
│   │
│   ├── pages/
│   │   ├── Appointments.jsx
│   │   ├── BillingHistory.jsx
│   │   ├── ClientProfile.jsx
│   │   ├── Clients.jsx
│   │   ├── Dashboard.jsx
│   │   ├── FollowUps.jsx
│   │   ├── Memberships.jsx
│   │   ├── NewBill.jsx
│   │   ├── Products.jsx
│   │   ├── PublicInvoice.jsx
│   │   ├── Reports.jsx
│   │   ├── Services.jsx
│   │   ├── Settings.jsx
│   │   └── Staff.jsx
│   │
│   └── utils/
│       ├── appointmentAlerts.js
│       ├── appointmentsSync.js
│       ├── excel.js
│       ├── helpers.js
│       ├── invoiceSync.js
│       ├── pdf.js
│       └── publicCatalogSync.js
│
├── supabase/
│   ├── app_state.sql
│   ├── invoices.sql
│   ├── appointments.sql
│   ├── public_catalog.sql
│   ├── staff_availability.sql
│   └── appointment_notifications.sql
│
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vercel.json
```

---

# 🚀 Getting Started

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

Create a project in Supabase.

The application requires Supabase for:

- Login/authentication.
- Cloud data synchronization.
- Appointments.
- Public invoices.
- Public service/staff catalog.
- Realtime appointment updates.

## 3. Run the SQL files

Open **Supabase → SQL Editor** and run the SQL files from the `supabase/` directory.

Recommended order:

```text
1. app_state.sql
2. invoices.sql
3. appointments.sql
4. public_catalog.sql
5. staff_availability.sql
6. appointment_notifications.sql
```

### What each SQL file does

| File | Purpose |
|---|---|
| `app_state.sql` | Stores salon application data |
| `invoices.sql` | Stores public/shareable invoices |
| `appointments.sql` | Stores customer bookings |
| `public_catalog.sql` | Publishes services and safe staff data |
| `staff_availability.sql` | Handles appointment slot availability and capacity |
| `appointment_notifications.sql` | Sends new-appointment notifications through ntfy |

---

## 4. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from:

**Supabase → Project Settings → API**

> Never put a Supabase `service_role` key in the frontend.

---

## 5. Create a login user

In Supabase:

**Authentication → Users → Add user**

Create an email/password account for salon staff.

Then sign in through the application.

---

## 6. Start the development server

```bash
npm run dev
```

Vite will show the local development URL in the terminal.

---

# 🏗️ Build for Production

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

# ☁️ Deploy to Vercel

The project already includes `vercel.json` for client-side routing.

### Steps

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Select **Vite** if Vercel does not detect it automatically.
4. Add these environment variables:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

5. Deploy.

Recommended build settings:

```text
Build Command: npm run build
Output Directory: dist
```

---

# 🔄 How Data Sync Works

The application uses a simple cloud + local-cache model.

```text
                    ┌─────────────────┐
                    │    Supabase     │
                    │  Cloud Database │
                    └────────┬────────┘
                             │
                       Sync / Fetch
                             │
                             ▼
                    ┌─────────────────┐
                    │  React App      │
                    │  Salon Dashboard│
                    └────────┬────────┘
                             │
                     Local Cache
                             │
                             ▼
                    ┌─────────────────┐
                    │   LocalStorage  │
                    │  Offline Cache  │
                    └─────────────────┘
```

When the application starts:

1. Local data loads immediately.
2. Supabase data is fetched.
3. Supabase data becomes the shared source of truth.
4. Changes are saved locally.
5. Changes are synchronized to Supabase.

Appointments are stored separately in Supabase and use **Realtime** so new bookings can appear without manually refreshing the dashboard.

---

# 🔗 Public Invoice

Generated invoices can be opened through a public route:

```text
/invoice/:billNo
```

Example:

```text
/invoice/INV-0001
```

This page is intentionally public so a salon can send the invoice link to a customer without requiring the customer to log in.

---

# 📱 WhatsApp Sharing

The application supports WhatsApp-based sharing for:

- Invoices.
- Follow-up messages.
- Membership information.

The app can also use a configured webhook for automated follow-up delivery.

> WhatsApp API automation is not automatically provided by the frontend itself. A WhatsApp provider/API or webhook must be configured separately when automated sending is required.

---

# 🔔 Appointment Notifications

New website bookings can trigger notifications.

The Supabase notification setup uses:

```text
ntfy.sh
```

The configured topic is:

```text
CutsBlushSalonAppointmentsNotification
```

The notification can include:

- Client name.
- Service.
- Preferred staff.
- Appointment date.
- Appointment time.
- Phone number.

---

# 💾 Backup & Restore

Use:

**Settings → Backup & Restore**

The application can export salon data as a JSON backup.

Example filename:

```text
salon-backup-YYYY-MM-DD.json
```

You can restore a previous backup from the same settings screen.

> Keep regular backups before major changes or migrations.

---

# 🎨 Customization

### Seed data

Default services, products, staff, membership plans, templates, and settings are defined in:

```text
src/data/seed.js
```

### Styling

Tailwind configuration:

```text
tailwind.config.js
```

### Pages

Application pages are located in:

```text
src/pages/
```

### Business logic

Shared application state and major operations are handled in:

```text
src/context/AppContext.jsx
```

---

# 🛡️ Security Notes

- Authentication is handled by Supabase Auth.
- Main salon application data is restricted to authenticated users through Row Level Security.
- Public invoices are intentionally readable without authentication.
- Public staff data only exposes safe fields such as ID, name, and role.
- Sensitive staff information such as salary and commission rates is not published to the public catalog.
- Do not expose Supabase secret/service-role credentials in frontend environment variables.

---

# 🧭 Application Routes

| Route | Purpose |
|---|---|
| `/login` | Staff login |
| `/` | Dashboard |
| `/new-bill` | Create a new bill |
| `/appointments` | Appointment management |
| `/history` | Billing history |
| `/clients` | Client directory |
| `/clients/:id` | Client profile |
| `/staff` | Staff & attendance |
| `/follow-ups` | Client follow-ups |
| `/reports` | Business reports |
| `/services` | Service catalog |
| `/products` | Product & stock management |
| `/memberships` | Memberships & plans |
| `/settings` | Salon configuration |
| `/invoice/:billNo` | Public invoice |

---

# ✅ Feature Summary

In short, this system provides:

**Billing** → Create and manage salon invoices  
**Clients** → Customer database and visit history  
**Appointments** → Website bookings and staff scheduling  
**Staff** → Staff management, commissions, and attendance  
**Services** → Service menu and pricing  
**Products** → Retail inventory and low-stock alerts  
**Memberships** → Plans, discounts, free services, renewals  
**Follow-ups** → Customer retention and WhatsApp outreach  
**Reports** → Revenue and business performance insights  
**Invoices** → PDF, print, WhatsApp, and public links  
**Cloud Sync** → Supabase-powered multi-device data  
**Notifications** → New appointment alerts  
**Backup** → JSON export and restore  
**Deployment** → Vercel-ready React/Vite application

---

## 📄 License

This project is private/proprietary unless a separate license is added by the project owner.
