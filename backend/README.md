# menuPilot Backend

Laravel REST API backend for the menuPilot project.

## Main modules
- Authentication
- Restaurants and owners
- Categories
- Products
- Tables and QR codes
- Customer sessions
- Orders
- Kitchen
- Billing and subscriptions

## Local setup

1. Copy `.env.example` to `.env`.
2. Configure the MySQL database in `.env`.
3. Run `composer install`.
4. Run `php artisan key:generate`.
5. Run `php artisan migrate`.
6. Start the API with `php artisan serve`.

Never commit `.env` or real credentials.
