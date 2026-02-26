# Restaurant Superstar Group

A private group chat application for up to 15 users with role-based access and time-limited passes.

## Features

- Private group chat with real-time messaging
- User roles: ADMIN, VIP, TEMP
- TEMP users have time-limited passes (24h, 3d, 7d, 30d)
- Email and SMS notifications
- Admin panel for user management
- Master Admin settings for global configuration

## Tech Stack

- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Node.js + TypeScript + Express
- Real-time: Socket.io
- Database: PostgreSQL with Prisma ORM
- Notifications: SendGrid (email), Twilio (SMS)

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the values
3. Set up PostgreSQL database
4. Run `npm install` in root
5. Run `npm run db:migrate` to create tables
6. Run `npm run db:seed` to seed initial data
7. Run `npm run dev` to start development servers

## Environment Variables

See `.env.example` for required variables.

### Notification Setup

**Email**: Sign up at [SendGrid](https://sendgrid.com), get API key and verified sender email.

**SMS**: 
1. Sign up for [AWS](https://aws.amazon.com)
2. Create IAM user with SNS permissions
3. Get access key and secret
4. Enable SMS in SNS (may require support ticket for production)
5. Free tier: 100 SMS/month

## Deployment

Build with Docker:

```bash
docker build -t restaurant-superstar .
docker run -p 3000:3000 restaurant-superstar
```

## API

- POST /auth/login - Group login
- GET /users/active - Get active users
- GET /messages/history - Get message history
- POST /admin/users - Create user
- GET /admin/users - List users
- PUT /master-settings - Update global settings