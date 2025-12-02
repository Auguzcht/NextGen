# NextGen - CCF NXTGen Children's Ministry Management System

<div align="center">
  <img src="https://raw.githubusercontent.com/Auguzcht/NextGen/main/.github/nextgen-logo.svg" alt="NextGen Logo" width="200" height="200">
  
  <p><strong>A comprehensive management system designed exclusively for CCF NXTGen Children's Ministry</strong></p>
  
  [![Version](https://img.shields.io/badge/version-1.10.0-blue.svg)](https://github.com/Auguzcht/NextGen)
  [![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#license)
  [![Built with React](https://img.shields.io/badge/built%20with-React-61dafb.svg)](https://reactjs.org/)
  [![Powered by Supabase](https://img.shields.io/badge/powered%20by-Supabase-3ecf8e.svg)](https://supabase.com/)
</div>

## 🌟 About NextGen

NextGen is a modern, full-featured children's ministry management system built specifically for **CCF NXTGen Ministry**. This platform streamlines attendance tracking, child registration, guardian management, staff assignments, email communications, and comprehensive reporting - all designed to enhance ministry operations and child safety.

### 🎯 Built For NXTGen Ministry

This system is exclusively designed and licensed for use by **Christ's Commission Fellowship (CCF) NXTGen Children's Ministry**. It incorporates ministry-specific workflows, age group structures, and operational requirements tailored to NXTGen's unique needs.

## ✨ Key Features

### 👶 Child & Family Management
- **Smart Registration System** - Streamlined child enrollment with automatic formal ID generation
- **Guardian Portal** - Complete family information management with relationship tracking  
- **Age-Based Categorization** - Automatic age group assignment (Preschool, Elementary 1, Elementary 2, Preteen)
- **Photo Management** - Secure child photo storage with Firebase integration

### 📊 Attendance & Check-In
- **Quick Check-In/Out** - Efficient attendance tracking with QR code support
- **Service Management** - Multiple service time tracking (First, Second, Third Service)
- **Real-time Analytics** - Live attendance metrics and growth tracking
- **Safety Protocols** - Secure child pickup verification system

### 👥 Staff & Volunteer Management
- **Role-Based Access** - Granular permissions for different ministry roles
- **Staff Assignments** - Service-specific volunteer scheduling
- **Profile Management** - Staff photo and contact information system
- **Authentication** - Secure login with Supabase Auth

### 📧 Communication Hub
- **Email Templates** - Pre-designed ministry communication templates
- **Batch Processing** - Mass email capabilities with personalization
- **Email Analytics** - Delivery tracking and engagement metrics
- **Guardian Notifications** - Automated parent communication system

### 📈 Analytics & Reporting
- **Weekly Reports** - Automated attendance summaries with PDF generation
- **Growth Tracking** - Trend analysis and ministry growth metrics
- **Age Group Analytics** - Demographic breakdowns and insights
- **Custom Dashboards** - Real-time ministry statistics

### 📚 Materials Management
- **Digital Resources** - File upload and organization system
- **Age-Appropriate Content** - Materials categorized by age groups
- **Google Drive Integration** - Cloud storage for ministry resources
- **Service Assignments** - Link materials to specific services

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Framer Motion** - Smooth animations and transitions
- **React Router** - Client-side routing and navigation

### Backend & Database
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Row Level Security** - Database-level security policies
- **Edge Functions** - Serverless functions for complex operations
- **Real-time Sync** - Live data updates across all clients

### Integrations
- **Firebase Storage** - Secure photo and file storage
- **Google Drive API** - Cloud storage integration
- **Resend API** - Professional email delivery service
- **QR Code Generation** - For quick check-in processes

### Infrastructure
- **Vercel** - Production deployment and hosting
- **PostgreSQL** - Robust relational database
- **Edge Computing** - Global content delivery

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Auguzcht/NextGen.git
   cd NextGen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_FIREBASE_CONFIG=your_firebase_config
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Database Setup**
   ```bash
   # Run the database schema
   psql -f public/postgre_nextgen.sql
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Production Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
npm run deploy
```

## 📱 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │────│  Supabase API   │────│   PostgreSQL    │
│                 │    │                 │    │    Database     │
│  • Dashboard    │    │  • Auth         │    │                 │
│  • Check-in     │    │  • Real-time    │    │  • Children     │
│  • Reports      │    │  • RLS          │    │  • Attendance   │
│  • Email        │    │                 │    │  • Analytics    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────│  External APIs  │
                        │                 │
                        │  • Firebase     │
                        │  • Google Drive │
                        │  • Resend       │
                        └─────────────────┘
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run test suite
```

### Code Structure

```
src/
├── components/      # Reusable UI components
│   ├── auth/       # Authentication components
│   ├── children/   # Child management components
│   ├── email/      # Email system components
│   └── ui/         # Base UI components
├── pages/          # Application pages/routes
├── services/       # API and external service integrations
├── utils/          # Utility functions and helpers
├── hooks/          # Custom React hooks
└── context/        # React context providers
```

## 📄 License & Usage Rights

**⚠️ IMPORTANT: Proprietary License**

This software is the **exclusive property** of **Christ's Commission Fellowship (CCF) NXTGen Children's Ministry**. 

### Usage Rights
- ✅ **Authorized Use**: CCF NXTGen Ministry staff and authorized volunteers only
- ✅ **Ministry Operations**: Use for CCF NXTGen children's ministry management
- ✅ **Internal Development**: Modifications for ministry-specific needs

### Restrictions
- ❌ **No Redistribution**: Cannot be copied, distributed, or shared outside CCF NXTGen
- ❌ **No Commercial Use**: Cannot be used for commercial purposes
- ❌ **No Derivative Works**: Cannot be used as basis for other applications
- ❌ **No Public Access**: Source code is confidential and proprietary

### Copyright Notice
```
© 2025 Christ's Commission Fellowship (CCF) NXTGen Children's Ministry
All rights reserved. Unauthorized use, reproduction, or distribution is prohibited.
```

## 👨‍💻 Development Team

**Lead Developer**: Alfred Nodado  
**Ministry**: NXTGen Children's Ministry  
**Organization**: Christ's Commission Fellowship  

## 📞 Support & Contact

For technical support, feature requests, or ministry-specific questions:

- **Ministry Leadership**: Contact NXTGen ministry team
- **Technical Issues**: Create an issue in this repository (authorized users only)
- **Emergency Support**: Contact ministry administrators

---

<div align="center">
  <p><strong>Built with ❤️ for CCF NXTGen Children's Ministry</strong></p>
  <p><em>Empowering ministry through technology</em></p>
</div>
