export const seedServices = [
  { id: 'svc_1', name: "Men's Haircut", category: 'Hair', gender: 'Male', price: 300, duration: 30 },
  { id: 'svc_2', name: "Women's Haircut", category: 'Hair', gender: 'Female', price: 600, duration: 45 },
  { id: 'svc_3', name: 'Hair Wash & Blow Dry', category: 'Hair', gender: 'Unisex', price: 250, duration: 25 },
  { id: 'svc_4', name: 'Beard Trim & Shape', category: 'Hair', gender: 'Male', price: 150, duration: 20 },
  { id: 'svc_5', name: 'Global Hair Colour', category: 'Colour', gender: 'Unisex', price: 2200, duration: 90 },
  { id: 'svc_6', name: 'Root Touch-up', category: 'Colour', gender: 'Unisex', price: 1200, duration: 60 },
  { id: 'svc_7', name: 'Keratin Treatment', category: 'Treatment', gender: 'Unisex', price: 3500, duration: 120 },
  { id: 'svc_8', name: 'Classic Facial', category: 'Skin', gender: 'Unisex', price: 900, duration: 45 },
  { id: 'svc_9', name: 'De-Tan Facial', category: 'Skin', gender: 'Unisex', price: 700, duration: 40 },
  { id: 'svc_10', name: 'Manicure', category: 'Nails', gender: 'Unisex', price: 400, duration: 30 },
  { id: 'svc_11', name: 'Pedicure', category: 'Nails', gender: 'Unisex', price: 500, duration: 40 },
  { id: 'svc_12', name: 'Full Body Massage', category: 'Wellness', gender: 'Unisex', price: 1800, duration: 60 },
  { id: 'svc_13', name: 'Threading (Eyebrows)', category: 'Skin', gender: 'Unisex', price: 60, duration: 10 },
  { id: 'svc_14', name: 'Bridal Makeup', category: 'Makeup', gender: 'Female', price: 8000, duration: 150 },
]

export const seedProducts = [
  { id: 'prd_1', name: 'Argan Shampoo 250ml', category: 'Haircare', price: 650, stock: 24, lowStockAt: 5 },
  { id: 'prd_2', name: 'Keratin Conditioner 250ml', category: 'Haircare', price: 720, stock: 18, lowStockAt: 5 },
  { id: 'prd_3', name: 'Hair Serum 100ml', category: 'Haircare', price: 450, stock: 30, lowStockAt: 8 },
  { id: 'prd_4', name: 'Beard Oil 30ml', category: 'Grooming', price: 380, stock: 15, lowStockAt: 5 },
  { id: 'prd_5', name: 'Sunscreen SPF 50', category: 'Skincare', price: 550, stock: 4, lowStockAt: 5 },
  { id: 'prd_6', name: 'Face Wash 100ml', category: 'Skincare', price: 320, stock: 22, lowStockAt: 6 },
  { id: 'prd_7', name: 'Nail Polish Set', category: 'Nails', price: 500, stock: 12, lowStockAt: 4 },
]

export const defaultSettings = {
  salonName: 'Snip & Style',
  tagline: 'Unisex Salon & Spa',
  address: 'Court Road, Purnia, Bihar 854301',
  phone: '+91 90000 00000',
  email: 'hello@snipstyle.in',
  gstNumber: '',
  invoicePrefix: 'SS',
  invoiceCounter: 1,
  invoiceFooter: 'Thank you for visiting! Follow us @snipstyle for offers.',
  defaultTaxPercent: 5,
  currencySymbol: '\u20B9',
  upiId: 'snipstyle@upi',
  // Follow-up reminders
  followUpEnabled: true,
  followUpDays: 25,
  followUpDefaultTemplateId: 'tpl_1',
  // Automatic sending. When followUpAutoEnabled is on and followUpWebhookUrl
  // is set, the Follow-ups page sends messages by POSTing to that URL instead
  // of opening WhatsApp manually. That URL should point at your own small
  // backend (see README) which holds the real WhatsApp API credentials and
  // actually calls Meta's API — this app never talks to Meta directly.
  followUpAutoEnabled: false,
  followUpWebhookUrl: '',
  followUpApiProvider: '',
  followUpSenderNumber: '',
}

export const seedTemplates = [
  {
    id: 'tpl_1',
    name: 'We miss you',
    body: "Hi {clientName}, it's been {daysSinceVisit} days since your last visit to {salonName}! We'd love to see you again for your {lastService}. Book your next appointment whenever suits you 💇",
    isDefault: true,
  },
  {
    id: 'tpl_2',
    name: 'Comeback offer',
    body: 'Hi {clientName}! It\u2019s time for your next {lastService} at {salonName}. Book this week and get 10% off your total bill. See you soon!',
    isDefault: false,
  },
  {
    id: 'tpl_3',
    name: 'Simple reminder',
    body: 'Hi {clientName}, just a friendly reminder from {salonName} — it\u2019s been a while since your last visit ({lastVisitDate}). We\u2019re here whenever you\u2019re ready for your next appointment!',
    isDefault: false,
  },
]

export const seedStaff = [
  { id: 'stf_1', name: 'Rhea Kapoor', role: 'Senior Stylist', phone: '+91 98765 43210', commissionPercent: 10, salary: 22000, joinedAt: '2023-03-14', active: true },
  { id: 'stf_2', name: 'Arjun Mehta', role: 'Barber', phone: '+91 98765 11223', commissionPercent: 10, salary: 18000, joinedAt: '2023-07-01', active: true },
  { id: 'stf_3', name: 'Sana Iqbal', role: 'Beautician', phone: '+91 98765 44556', commissionPercent: 8, salary: 17000, joinedAt: '2024-01-20', active: true },
]

export const defaultAuth = {
  username: 'admin',
  password: 'salon123',
}
