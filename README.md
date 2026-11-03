# Campus Service Booking System

A full-stack university booking platform with a React frontend, Express backend and SQLite-backed local development database. The project also ships with a MySQL script in `database/campus_service_booking.sql` so the schema matches the assignment specification.

## Quick start

### 1. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and the API runs on http://localhost:5001.

## Default admin account

- Email: admin@campus.local
- Password: Admin@123

This credential is seeded automatically when the database initializes.

## Database setup

A MySQL-compatible schema is available in `database/campus_service_booking.sql`. The application defaults to a local SQLite database for fast local development, but the schema remains aligned with the assignment requirements.

## Core features

- Student registration and login
- Role-based admin access
- Service catalogue and slot browsing
- Booking creation with capacity checks
- Booking cancellation and status tracking
- Admin dashboard metrics and booking management

## Team structure

The implementation follows the three-member team model from the project brief and keeps the backend, frontend and database concerns separated for maintainability.
