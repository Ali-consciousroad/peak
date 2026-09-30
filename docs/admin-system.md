# Admin System Documentation

## Overview

The Admin System provides comprehensive user and role management capabilities for the freelance marketplace. It's built with a secure, role-based access control (RBAC) architecture.

## Architecture

### Database Models

```
User ←→ UserRole ←→ Role ←→ RolePermission ←→ Permission
User ←→ UserProfile
```

- **User**: Core user entity with Clerk integration
- **Role**: Defines user types (client, freelance, admin, support)
- **UserRole**: Many-to-many junction for flexible role assignment
- **Permission**: Granular permissions for each role
- **UserProfile**: Role-specific profile data

### Available Roles

1. **client**: Can create missions, hire freelancers
2. **freelance**: Can create services, portfolios, skills
3. **admin**: Full system access, user management
4. **support**: Limited administrative access

## Features

### 1. Admin Dashboard (`/admin`)

**Access**: Admin role required

**Features**:
- User statistics overview
- Role distribution analytics
- Recent user registrations
- Quick action navigation

**API Endpoint**: `GET /api/admin/stats`

### 2. User Management (`/admin/users`)

**Access**: Admin role required

**Features**:
- **Search**: By name, email, or company
- **Filter**: By role (client, freelance, admin, support)
- **Pagination**: 20 users per page
- **Role Management**: Add/remove roles with dropdown interface
- **Real-time Updates**: Immediate UI refresh after role changes

**API Endpoints**:
- `GET /api/admin/users?page=1&limit=20&search=john&role=admin`
- `PUT /api/admin/users` (for role updates)

### 3. Navigation Integration

**Admin Button**: Purple navbar button appears only for admin users

**Auto-routing**: Non-admins are redirected to home page

## Security

### Access Control

1. **Frontend Guards**:
   ```typescript
   // Check admin access on page load
   const userData = await fetch('/api/me');
   if (userData.role !== 'admin') {
     router.push('/');
   }
   ```

2. **API Guards**:
   ```typescript
   // Verify admin role in API endpoints
   const isAdmin = user.userRoles.some(ur => ur.role.name === 'admin');
   if (!isAdmin) {
     return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
   }
   ```

3. **Database Constraints**:
   - Foreign key relationships
   - Unique constraints on role assignments
   - Cascade deletes for data integrity

## Usage Guide

### Making a User Admin

#### Option 1: Use the Script (Recommended)
```bash
npx tsx scripts/make-current-user-admin.ts
```

#### Option 2: Manual Database Update
```typescript
// Add admin role to user
await prisma.userRole.create({
  data: {
    userId: "user-id-here",
    roleId: "admin-role-id"
  }
});
```

### Accessing Admin Features

1. **Sign in** to your account
2. **Refresh** browser after role assignment
3. **Look for purple "Admin" button** in navbar
4. **Navigate** to admin dashboard

### Managing User Roles

1. Go to `/admin/users`
2. **Search/Filter** to find specific users
3. **Click "Edit Roles"** on any user
4. **Add roles**: Select from dropdown
5. **Remove roles**: Click "×" on role badges
6. **Click "Done"** to finish editing

## API Reference

### GET /api/admin/stats

Returns admin dashboard statistics.

**Response**:
```json
{
  "totalUsers": 25,
  "usersByRole": {
    "client": 10,
    "freelance": 12,
    "admin": 2,
    "support": 1
  },
  "recentUsers": [...]
}
```

### GET /api/admin/users

Returns paginated user list with search/filter capabilities.

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term for name/email
- `role`: Filter by role name

**Response**:
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

### PUT /api/admin/users

Updates user roles.

**Request Body**:
```json
{
  "targetUserId": "user-id",
  "roleChanges": [
    { "action": "add", "roleName": "admin" },
    { "action": "remove", "roleName": "client" }
  ]
}
```

## File Structure

```
app/
├── admin/
│   ├── page.tsx              # Admin dashboard
│   └── users/
│       └── page.tsx          # User management
└── api/
    └── admin/
        ├── stats/
        │   └── route.ts      # Dashboard statistics
        └── users/
            └── route.ts      # User management API

components/
├── layout/
│   └── navbar.tsx            # Admin navigation
└── ui/
    ├── badge.tsx             # Role badges
    └── select.tsx            # Role selection

scripts/
└── make-current-user-admin.ts # Admin assignment script
```

## Troubleshooting

### "Admin access required" Error

**Cause**: User doesn't have admin role
**Solution**: Run `npx tsx scripts/make-current-user-admin.ts`

### Admin Button Not Appearing

**Causes**:
1. User not assigned admin role
2. Browser cache not refreshed
3. Need to sign out/in

**Solutions**:
1. Check role assignment in database
2. Hard refresh browser (Cmd+Shift+R)
3. Sign out and sign back in

### API Permission Errors

**Cause**: API calls failing permission checks
**Solution**: Verify user has admin role and is properly authenticated

## Development

### Adding New Admin Features

1. **Create new page** in `app/admin/`
2. **Add API endpoint** in `app/api/admin/`
3. **Add navigation link** in `components/layout/navbar.tsx`
4. **Add permission checks** in both frontend and API

### Testing Admin Features

1. **Assign admin role**: Use the provided script
2. **Test access control**: Try accessing as non-admin
3. **Test functionality**: User management, role updates
4. **Test security**: API permission validation

## Best Practices

1. **Always check permissions** on both frontend and backend
2. **Use role-based navigation** to hide unauthorized features
3. **Validate role changes** before applying to database
4. **Log admin actions** for audit trails
5. **Test with different user roles** to ensure proper access control

## Future Enhancements

- **Audit Logs**: Track admin actions
- **Bulk Operations**: Multi-user role updates
- **Role Permissions**: Granular permission management
- **User Impersonation**: Admin testing capabilities
- **Advanced Analytics**: User behavior insights