# Family Registration Feature Guide

## Overview

The RaJA Ticketing System now supports family registration, allowing users to register family members under their account. When admins scan the main user's QR code, they can see all registered family members.

## Features Implemented

### 1. Database Structure

- **New Table**: `family_members`
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, References auth.users)
  - `full_name` (VARCHAR, Required)
  - `age` (INTEGER, Optional)
  - `relationship` (VARCHAR, Optional - spouse, child, parent, sibling, etc.)
  - `notes` (TEXT, Optional - dietary requirements, special needs, etc.)
  - `created_at` & `updated_at` (Timestamps)

### 2. User Dashboard - Family Registration

**Location**: User Dashboard (top section)

**Features**:

- ✅ Add family members with form validation
- ✅ Edit/remove family members
- ✅ Relationship dropdown (spouse, child, parent, sibling, etc.)
- ✅ Age field for better organization
- ✅ Notes field for special requirements
- ✅ Family member count display
- ✅ Helpful instructions about QR code usage

**Form Fields**:

- **Full Name** (Required)
- **Age** (Optional, 0-120)
- **Relationship** (Dropdown: spouse, child, parent, sibling, grandparent, grandchild, other)
- **Notes** (Optional - for dietary restrictions, special needs, etc.)

### 3. QR Code Scanner Enhancement

**Location**: Admin Dashboard → Events → QR Scanner

**Enhanced Features**:

- ✅ Shows family members when scanning participant QR codes
- ✅ Displays family member count in success/already-checked-in messages
- ✅ Shows individual family member details (name, age, relationship, notes)
- ✅ Different styling for family member information
- ✅ Works for both successful check-ins and already-checked-in cases

**Display Format**:

```
✅ Check-in Successful!
John Doe (john@example.com)

👨‍👩‍👧‍👦 Family Members (3):
• Jane Doe (35) - spouse
• Bobby Doe (12) - child
  Note: No nuts allergy
• Sarah Doe (8) - child
```

### 4. Participants Modal Enhancement

**Location**: Admin Dashboard → Events → Participants Button

**Enhanced Features**:

- ✅ Shows family member count for each participant
- ✅ Family member count badge with emoji
- ✅ Total family members count in summary
- ✅ Updated table with Family column

**Display Format**:

```
Found 5 approved participant(s) + 12 family members

| Email | Name | Family | Registered |
|-------|------|--------|------------|
| john@example.com | John Doe | 👨‍👩‍👧‍👦 3 | 01/15/2025 |
| mary@example.com | Mary Smith | None | 01/16/2025 |
```

## Setup Instructions

### 1. Database Setup

Run the following SQL script in your Supabase SQL Editor:

```sql
-- See create-family-members-table.sql for complete script
CREATE TABLE IF NOT EXISTS family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    relationship VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ... (plus indexes, RLS policies, triggers, and functions)
```

### 2. Deploy Updated Code

The following components have been updated:

- `src/components/User/FamilyRegistration.jsx` (NEW)
- `src/components/User/UserDashboard.jsx` (Enhanced)
- `src/components/Admin/QRScanner.jsx` (Enhanced)
- `src/components/Admin/ParticipantsModal.jsx` (Enhanced)

## User Workflow

### For Regular Users:

1. **Log into User Dashboard**
2. **Register Family Members**:

   - Click "Add Family Member" button
   - Fill out the form with family member details
   - Save the family member
   - Repeat for all family members

3. **Event Registration**:

   - Register for events as normal
   - Family members are automatically included
   - Only the main user gets a QR code

4. **Event Attendance**:
   - Show QR code to admin scanner
   - All family members are automatically checked in

### For Admins:

1. **View Participants**:

   - Go to Events → Click "Participants" on any event
   - See participant list with family member counts
   - Get total count including all family members

2. **Check-in Process**:
   - Use QR Scanner as normal
   - Scanner automatically shows all family members
   - All family members are included in the check-in

## Security & Permissions

### Row Level Security (RLS)

- ✅ Users can only manage their own family members
- ✅ Admins can view all family members (read-only for display)
- ✅ Family members are automatically deleted if user account is deleted

### Data Privacy

- Family member information is only visible to:
  - The account owner (full access)
  - Admins during check-in/participant viewing (read-only)

## Benefits

### For Users:

- **Convenience**: Register entire family with one account
- **Simplicity**: One QR code for everyone
- **Organization**: Keep family information organized
- **Flexibility**: Add notes for special needs/requirements

### For Admins:

- **Complete View**: See total attendance including family
- **Better Planning**: Know exact numbers for catering, seating, etc.
- **Special Needs**: Access to dietary restrictions and special requirements
- **Efficient Check-in**: One scan checks in entire family

### For Event Organizers:

- **Accurate Counts**: True attendance numbers including family
- **Better Analytics**: Understanding of family vs individual attendance
- **Improved Service**: Preparation for special needs and requirements

## Technical Notes

### Performance Considerations

- Family member data is fetched only when needed (QR scan, participant view)
- Uses efficient database queries with proper indexing
- Batch operations for multiple family member lookups

### Future Enhancements (Potential)

- Family member photo uploads
- Individual check-in tracking per family member
- Family-specific event pricing
- Family member-specific ticket types
- Bulk family member import/export

## Troubleshooting

### Common Issues:

1. **Family members not showing**: Ensure database migration is applied
2. **QR scanner not showing family**: Check Supabase RLS policies
3. **Family count incorrect**: Use "Refresh" button in Participants modal

### Support:

- Check browser console for errors
- Verify Supabase connection and permissions
- Ensure all database tables and functions are created correctly
