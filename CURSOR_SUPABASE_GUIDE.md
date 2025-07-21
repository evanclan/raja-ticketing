# 🚀 Cursor + Supabase Integration Guide

## ✅ **What We've Set Up:**

1. **Fixed Vite Error**: Downgraded to Vite 6.0.0 for Node.js compatibility
2. **Supabase Client**: Configured in `src/lib/supabase.js`
3. **Helper Functions**: Created `src/lib/supabase-helpers.js` with all database operations
4. **Connection Test**: Working test component in `src/components/ConnectionTest.jsx`
5. **Development Server**: Running at `http://localhost:5173`

---

## 🎯 **How to Use Cursor with Supabase:**

### **1. Database Operations with Cursor AI**

You can now ask Cursor to:

- ✅ Create database tables
- ✅ Generate SQL queries
- ✅ Create React components that use Supabase
- ✅ Handle authentication flows
- ✅ Manage events and registrations

### **2. Example Cursor Prompts:**

**Create a login component:**

```
"Create a React login component using the supabaseHelpers from src/lib/supabase-helpers.js"
```

**Create an event listing page:**

```
"Create a React component that displays events using supabaseHelpers.getEvents()"
```

**Create an admin dashboard:**

```
"Create an admin dashboard component that shows pending registrations and guest applications"
```

**Generate SQL for new table:**

```
"Generate SQL to create a notifications table for the ticketing system"
```

### **3. Available Helper Functions:**

```javascript
// User Management
supabaseHelpers.createUser(email, fullName, role)
supabaseHelpers.getUserProfile(userId)

// Event Management
supabaseHelpers.createEvent(eventData)
supabaseHelpers.getEvents(status)
supabaseHelpers.updateEvent(eventId, updates)

// Registration Management
supabaseHelpers.registerForEvent(userId, eventId)
supabaseHelpers.getUserRegistrations(userId)

// Guest Applications
supabaseHelpers.submitGuestApplication(applicationData)
supabaseHelpers.getGuestApplications(status)

// Admin Functions
supabaseHelpers.updateRegistrationStatus(registrationId, status)
supabaseHelpers.updateGuestApplicationStatus(applicationId, status, notes)
```

---

## 🗄️ **Database Schema (Ready to Use):**

### **Tables to Create in Supabase:**

1. **users** - User profiles and roles
2. **events** - Event information
3. **registrations** - User event registrations
4. **guest_applications** - Guest user applications

### **SQL Templates Available:**

- `sqlTemplates.createUsersTable`
- `sqlTemplates.createEventsTable`
- `sqlTemplates.createRegistrationsTable`
- `sqlTemplates.createGuestApplicationsTable`

---

## 🎨 **Next Steps with Cursor:**

### **Phase 1: Basic Components**

Ask Cursor to create:

1. **Authentication Components** (Login/Register)
2. **Event Listing Page**
3. **User Dashboard**
4. **Guest Application Form**

### **Phase 2: Advanced Features**

Ask Cursor to create:

1. **Admin Dashboard**
2. **Event Management**
3. **Registration Approval System**
4. **Payment Status Tracking**

### **Phase 3: Polish**

Ask Cursor to:

1. **Add loading states**
2. **Implement error handling**
3. **Add form validation**
4. **Create responsive design**

---

## 🔧 **Cursor AI Prompts Examples:**

### **For Authentication:**

```
"Create a login form component with email/password fields using Supabase auth. Include error handling and loading states."
```

### **For Event Management:**

```
"Create an event card component that displays event details and has a register button. Use Tailwind CSS for styling."
```

### **For Admin Features:**

```
"Create an admin panel component that shows pending registrations and allows admins to approve/reject them."
```

### **For Database Operations:**

```
"Generate the SQL to create RLS policies for the events table that allow users to view active events and admins to manage all events."
```

---

## 📁 **Project Structure:**

```
src/
├── lib/
│   ├── supabase.js          # Supabase client
│   └── supabase-helpers.js  # Database helper functions
├── components/
│   ├── ConnectionTest.jsx   # Connection test
│   ├── Auth/               # Authentication components
│   ├── Events/             # Event-related components
│   ├── Admin/              # Admin components
│   └── Common/             # Shared components
├── pages/                  # Page components
├── hooks/                  # Custom React hooks
└── utils/                  # Utility functions
```

---

## 🚀 **Quick Start Commands:**

```bash
# Start development server
npm run dev

# Test Supabase connection
# Open http://localhost:5173

# Create new component with Cursor
# Ask: "Create a React component for [feature]"
```

---

## 💡 **Pro Tips for Cursor:**

1. **Be Specific**: Instead of "create a form", say "create a registration form with validation"
2. **Reference Files**: Mention existing files like "use the supabaseHelpers from src/lib/supabase-helpers.js"
3. **Ask for Explanations**: Add "explain what this code does" to understand the generated code
4. **Iterate**: Ask Cursor to "improve this component by adding error handling"

---

## 🎯 **Ready to Build!**

Your setup is complete! You can now:

- ✅ Test the connection at `http://localhost:5173`
- ✅ Use Cursor AI to generate components
- ✅ Use the helper functions for database operations
- ✅ Build your ticketing system step by step

**Start by asking Cursor to create your first component!**
