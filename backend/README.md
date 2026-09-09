# MenuPilot Backend

Laravel 12 API backend matching the current React frontend contract.

## Run

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

The frontend defaults to `http://localhost:8000/api` when `VITE_API_BASE_URL` is not set.

## Modules

- Authentication and password reset
- Menu item CRUD + public QR menu
- Table CRUD + unique QR code + status
- Dining sessions + waiter assistance
- Customer orders + kitchen + owner order tracking
- Billing + payment + cashier adjustments
- Staff CRUD
- Subscription plan + dashboard theme
- System admin restaurant list + plan override

Authentication uses Bearer tokens returned by register/login. Tokens are stored hashed in the users table.
