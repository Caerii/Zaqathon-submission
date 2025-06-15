# 🚀 Smart Order Intake System - Setup & Running Instructions

## 📋 **System Overview**
AI-powered email order processing platform with:
- **Backend:** Node.js + Express + Gemini 2.5 AI + Product Catalog
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Supabase
- **PDF Generation:** Professional sales order forms
- **Database:** Supabase PostgreSQL with real-time analytics

---

## ⚡ **Quick Start (Windows PowerShell)**

### **Step 1: Install Dependencies**

**Backend:**
```powershell
cd backend
npm install
```

**Frontend:**
```powershell
cd frontend
npm install
```

### **Step 2: Environment Setup**

**Backend Environment (.env in backend folder):**
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
NODE_ENV=development
```

**Frontend Environment (.env in frontend folder):**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Step 3: Start the Servers**

**Option A: Two Separate PowerShell Windows (Recommended)**

**Window 1 - Backend:**
```powershell
cd backend
npm run dev
```
✅ Backend starts on: **http://localhost:3001**

**Window 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
✅ Frontend starts on: **http://localhost:5173**

**Option B: Background Processes**
```powershell
# From project root
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

---

## 🔧 **Detailed Setup Instructions**

### **Prerequisites**
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 9+** (comes with Node.js)
- **Gemini API Key** ([Get one here](https://ai.google.dev/))
- **Supabase Account** ([Create account](https://supabase.com/))

### **1. Clone & Navigate**
```powershell
git clone <your-repo-url>
cd Zaqathon-submission
```

### **2. Backend Setup**
```powershell
cd backend
npm install

# Create .env file with your keys
New-Item -Path ".env" -ItemType File
# Edit .env and add:
# GEMINI_API_KEY=your_key_here
# PORT=3001
# NODE_ENV=development
```

### **3. Frontend Setup**
```powershell
cd ../frontend
npm install

# Create .env file
New-Item -Path ".env" -ItemType File
# Edit .env and add:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### **4. Database Setup (Supabase)**
Run the SQL schema in your Supabase dashboard:
```sql
-- Located in: supabase-schema.sql
-- Creates tables: orders, products, customers, order_validations
-- Sets up RLS policies and triggers
```

---

## 🎯 **Testing the System**

### **1. Health Check**
Visit: http://localhost:3001/health
```json
{
  "status": "healthy",
  "timestamp": "2024-12-05T10:30:00.000Z",
  "services": {
    "catalog": {
      "products_loaded": 502,
      "categories": 6
    }
  }
}
```

### **2. Process Sample Email**
1. Go to: http://localhost:5173/process
2. Paste this sample email:
```text
From: john.smith@company.com
Subject: Furniture Order Request

Hi,

I need to order some office furniture for our new branch:
- 2 executive desks (white oak finish)
- 2 ergonomic office chairs (black leather)
- 1 filing cabinet (4-drawer, metal gray)

Delivery to: 123 Main Street, Suite 200, Anytown, CA 90210
Preferred delivery: December 15th

Thanks,
John Smith
Acme Corp
```

3. Click **"Process Email"**
4. Get AI-extracted order data
5. Click **"Download PDF"** for professional sales order form

---

## 📊 **System Features Demo**

### **AI Processing Pipeline:**
1. **Email Input** → Raw customer email
2. **Gemini 2.5 Processing** → Structured JSON extraction
3. **Product Validation** → SKU matching against 500+ catalog
4. **Confidence Scoring** → Multi-dimensional quality assessment
5. **Database Storage** → Supabase persistence
6. **PDF Generation** → Professional sales order forms

### **Available Endpoints:**
- **POST** `/api/orders/process-email` - Process email with AI
- **GET** `/api/products/search?q=desk` - Search product catalog
- **GET** `/api/products/DSK-WH-6030` - Get specific product
- **POST** `/api/orders/generate-pdf` - Generate PDF order form

### **Frontend Pages:**
- **Dashboard** (`/`) - Analytics and system overview
- **Email Processor** (`/process`) - Main AI processing interface
- **Order Details** (`/orders/:id`) - Individual order management
- **Settings** (`/settings`) - System configuration

---

## 🏗️ **Architecture Overview**

```
Frontend (React + Vite)     Backend (Node.js + Express)
├── Email Processor         ├── Gemini AI Service
├── Dashboard              ├── Product Catalog (CSV)
├── Order Management       ├── PDF Generator (Puppeteer)
├── PDF Downloads          ├── Rate Limiting
└── Real-time Analytics    └── Caching Service
            │                        │
            └── Supabase Database ────┘
                ├── Orders Table
                ├── Products Table
                ├── Customers Table
                └── Order Validations
```

---

## 🐛 **Troubleshooting**

### **Common Issues:**

**1. Port Already in Use**
```powershell
# Check what's using the port
netstat -an | findstr ":3001"
netstat -an | findstr ":5173"

# Kill Node processes if needed
taskkill /f /im node.exe
```

**2. Missing Environment Variables**
- Make sure `.env` files exist in both `/backend` and `/frontend`
- Check that API keys are valid and properly formatted

**3. Package Installation Issues**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

**4. Supabase Connection Issues**
- Verify your Supabase URL and anon key
- Check that RLS policies allow your operations
- Ensure tables are created from the schema file

**5. PDF Generation Issues**
- Puppeteer might need additional setup on Windows
- Try running: `npm install puppeteer --save` in backend

---

## 📈 **Performance & Scaling**

### **Current Limits:**
- **Rate Limiting:** 100 requests/minute per IP
- **Cache Duration:** 5 minutes for email processing
- **PDF Generation:** ~2-3 seconds per document
- **Product Catalog:** 502 products loaded in memory

### **Optimization Features:**
- **Intelligent Caching** for repeated email processing
- **Product Search Indexing** for fast SKU lookups
- **Confidence-based Processing** to reduce manual review
- **Background PDF Generation** to avoid UI blocking

---

## 🎉 **Success Indicators**

When everything is working correctly, you should see:

✅ **Backend Console:**
```
✅ Services initialized successfully
🚀 Server running on port 3001
📊 Product catalog loaded: 502 products
🔧 Rate limiter active: 100 req/min
🎯 PDF generator ready
```

✅ **Frontend Console:**
```
VITE v5.0.8  ready in 432 ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

✅ **Test Results:**
- Email processing with 85%+ confidence scores
- SKU matching against product catalog
- PDF downloads with professional formatting
- Real-time dashboard analytics

---

## 🔗 **Important URLs**

- **Frontend App:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Email Processor:** http://localhost:5173/process
- **Dashboard:** http://localhost:5173

---

## 📝 **Development Commands**

**Backend:**
```powershell
npm run dev      # Development with hot reload
npm run build    # Build for production
npm run start    # Run production build
npm run test     # Run test suite
npm run lint     # Code linting
```

**Frontend:**
```powershell
npm run dev      # Development server (Vite)
npm run build    # Build for production
npm run preview  # Preview production build
npm run test     # Run tests
npm run lint     # Code linting
```

---

**🎯 Your Smart Order Intake system is now ready for the Zaqathon demo!** 

The system showcases advanced AI integration, real-world business applications, and professional-grade output generation. Perfect for demonstrating the future of automated order processing! 🚀 
