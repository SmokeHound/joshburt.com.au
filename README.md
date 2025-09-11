# Josh Burt - Website with Server-Side Authentication

[![🚀 Deploy website via FTP on push.](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/SmokeHound/joshburt.com.au/actions/workflows/main.yml)

## Overview
This is a full-stack website for joshburt.com.au featuring secure server-side authentication, user role management, and a responsive design. The application includes both a static frontend and a Node.js/Express backend with JWT authentication.

## Features

### Frontend
- Responsive sidebar navigation with mobile hamburger menu
- Dark/Light mode toggle (persistent via localStorage)
- Consistent color scheme: blue, green, purple, dark grey
- Unified typography (Inter font family)
- Responsive grid layouts and spacing
- TailwindCSS styling throughout

### Backend Authentication
- **JWT-based authentication** with access/refresh tokens
- **User role system**: Admin, Manager, User levels
- **Password security**: bcrypt hashing with configurable rounds
- **Password reset flow** with secure tokens and email notifications
- **User registration** with email validation
- **OAuth integration** (Google, GitHub) ready for configuration
- **Rate limiting** on authentication endpoints
- **Audit logging** for security tracking
- **Role-based access control** for API endpoints

### Security Features
- CORS configuration for cross-origin requests
- Helmet.js for security headers
- Input validation and sanitization
- SQL injection protection with parameterized queries
- Password complexity requirements
- Secure token storage and refresh mechanism

## Pages
- **Home** (`index.html`): Landing page with authentication
- **Admin** (`admin.html`): Dashboard with management links
- **User Management** (`users.html`): User CRUD operations (Admin/Manager only)
- **Analytics** (`analytics.html`): Site metrics
- **Settings** (`settings.html`): Site configuration  
- **Oil Orders** (`oil.html`): Castrol product ordering with CSV export
- **Login** (`login.html`): Authentication page with OAuth options
- **Register** (`register.html`): User registration with validation
- **Reset Password** (`reset-password.html`): Password reset flow

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start backend server (port 3000)
npm run dev

# In another terminal, start frontend server (port 8000)
python3 -m http.server 8000
```

### Production
```bash
# Install production dependencies
npm install --production

# Start server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Complete password reset
- `GET /api/auth/me` - Get current user profile

### User Management (Admin/Manager only)
- `GET /api/users` - List users with pagination
- `POST /api/users` - Create new user (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)
- `PUT /api/users/:id/password` - Change user password
- `GET /api/users/stats/overview` - User statistics

### OAuth (Optional)
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/github` - GitHub OAuth login

## User Roles

### Admin
- Full system access
- User management (create, update, delete)
- Access to all pages and APIs
- Default: admin@joshburt.com.au / admin123!

### Manager  
- User viewing and limited management
- Access to analytics and user lists
- Cannot delete users or change roles
- Default: manager@example.com / manager123

### User
- Basic access to personal dashboard
- Can update own profile
- Limited page access
- Default: test@example.com / password

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `name` - User's full name
- `password_hash` - bcrypt hashed password
- `role` - User role (admin/manager/user)
- `is_active` - Account status
- `email_verified` - Email verification status
- `oauth_provider` - OAuth provider (google/github)
- `oauth_id` - OAuth provider user ID
- `avatar_url` - Profile picture URL
- `reset_token` - Password reset token
- `reset_token_expires` - Token expiration
- `created_at` - Account creation date
- `updated_at` - Last modification date

### Refresh Tokens Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `token_hash` - Hashed refresh token
- `expires_at` - Token expiration
- `created_at` - Token creation date

### Audit Logs Table
- `id` - Primary key
- `user_id` - Foreign key to users (nullable)
- `action` - Action performed
- `details` - Action details (JSON)
- `ip_address` - Client IP address
- `user_agent` - Client user agent
- `created_at` - Log entry date

## Architecture
- **Frontend**: Static HTML/CSS/JS with TailwindCSS
- **Backend**: Node.js/Express with SQLite database
- **Authentication**: JWT tokens with refresh mechanism
- **Security**: bcrypt, helmet, CORS, rate limiting
- **Deployment**: Static files + Node.js server

## Testing
```bash
# Run test suite
npm test

# Test coverage includes:
# - User registration and login
# - JWT token validation
# - Role-based access control
# - Password reset flow
# - Rate limiting
# - API endpoint security
```

## Deployment

See [deployment.md](deployment.md) for detailed deployment instructions including:
- Render.com deployment (recommended)
- Heroku deployment
- Environment variable configuration
- Database setup options
- Security considerations

## Manual Testing Checklist

### Authentication Flow
- [x] User registration with validation
- [x] User login with JWT tokens
- [x] Token refresh mechanism
- [x] Password reset via email
- [x] User logout and token cleanup
- [x] Role-based page access

### User Interface
- [x] Responsive sidebar navigation  
- [x] Dark/light mode toggle
- [x] Mobile hamburger menu
- [x] Login/logout state management
- [x] Role-based welcome messages
- [x] Form validation and error messages

### API Security
- [x] Role-based endpoint protection
- [x] JWT token validation
- [x] Rate limiting on auth endpoints
- [x] Input validation and sanitization
- [x] CORS configuration
- [x] Audit logging

## Known Limitations
- **CDN Blocking**: TailwindCSS CDN may be blocked in restricted environments
- **Email Service**: Requires SMTP configuration for password reset emails
- **OAuth**: Requires client ID/secret configuration for Google/GitHub
- **Database**: Uses SQLite by default (suitable for small-medium applications)

## Security Notes
- Default admin password should be changed in production
- JWT secret must be set to a secure random value
- HTTPS required for production deployment
- OAuth credentials should be kept secure
- Regular security updates recommended

---
**Production URL**: [https://joshburt.com.au](https://joshburt.com.au)  
**Repository**: [https://github.com/SmokeHound/joshburt.com.au](https://github.com/SmokeHound/joshburt.com.au)
