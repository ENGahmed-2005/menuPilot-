# menuPilot Backend

Laravel 12 REST API for the existing React/Vite frontend.

## Main modules
- Authentication with Laravel Sanctum
- Owner and staff roles: owner, kitchen, cashier, waiter, admin
- Categories and menu items
- Tables and QR codes
- Customer dining sessions
- Orders and kitchen status
- Billing, payments and bill adjustments
- Subscription plan and dashboard theme
- Platform admin endpoints

## Local setup

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

API: `http://localhost:8000/api`

Demo owner: `owner@menupilot.test` / `password123`

## Connect frontend

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCKS=false
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

The frontend API client sends `Authorization: Bearer <token>` automatically. Mock mode is now opt-in only (`VITE_USE_MOCKS=true`).

Never commit `.env` or real credentials.
