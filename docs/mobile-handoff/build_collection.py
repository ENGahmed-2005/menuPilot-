"""Build the mobile collection and complete Laravel route inventory.

From backend: php artisan route:list --path=api --json > <routes.json>
Then: python docs/mobile-handoff/build_collection.py <routes.json>
This only writes documentation artifacts, never calls a remote API.
"""
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
routes = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
def dump(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
dump("api-routes.json", routes)
lines = ["# Laravel API — جرد كامل من route:list", "", "يشمل aliases قديمة وإدارة المنصة التي ليست ضمن MVP للموبايل. /api/auth/* على Vercel يوجّه إلى خدمة Node؛ استخدم /api/account/* للعمليات التي بقيت في Laravel. وجود route لا يثبت سلامة النشر.", "", "| Method | Path | Middleware | Handler |", "|---|---|---|---|"]
for r in routes:
    lines.append(f"| {r['method'].replace('|', '/')} | `{r['uri']}` | {', '.join(r.get('middleware', [])).replace('|', ' OR ')} | `{r['action'].split(chr(92))[-1]}` |")
(OUT / "API-ROUTES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

groups = {}
coverage = set()
numeric = {"menu_item_id", "zone_id", "driver_id", "target_session_id"}
def request(folder, name, method, path, body=None, capture=None, status=None, auth="cookie", note="", origin=False):
    route_path = re.sub(r"\{\{[^}]+\}\}", "{}", path.split('?')[0])
    match = next((r for r in routes if method in r['method'].split('|') and re.sub(r"\{[^}]+\}", "{}", r['uri'][4:]) == route_path), None)
    if not path.startswith(('auth/', 'auth-config')) and not match:
        raise ValueError(f"Unknown endpoint: {method} {path}")
    desc = note
    if match:
        coverage.add((method, match['uri']))
        desc += "\n\nMiddleware: " + ", ".join(match.get('middleware', []))
        desc += "\nSource: " + match['action']
    desc += "\n\nAuth: " + ("Postman cookie jar; real session. Read API.md." if auth == 'cookie' else auth)
    headers = [{"key": "Accept", "value": "application/json"}]
    if origin or path.startswith('auth/'):
        headers.append({"key": "Origin", "value": "{{origin}}"})
    if auth == 'order_token':
        headers.append({"key": "X-Order-Token", "value": "{{order_token}}"})
    if auth == 'session_token':
        headers.append({"key": "X-Session-Token", "value": "{{session_token}}"})
    req = {"method": method, "header": headers, "url": "{{base_url}}/" + path, "description": desc.strip(), "auth": {"type": "noauth"}}
    if body is not None:
        raw = json.dumps(body, ensure_ascii=False, indent=2)
        for var in numeric:
            raw = raw.replace('"{{' + var + '}}"', '{{' + var + '}}')
        req["body"] = {"mode": "raw", "raw": raw, "options": {"raw": {"language": "json"}}}
        headers.append({"key": "Content-Type", "value": "application/json"})
    script = ["pm.test('Successful response', function () { pm.expect(pm.response.code).to.be.oneOf(" + json.dumps(status or [200]) + "); });"]
    if capture:
        script += ["if (pm.response.code >= 200 && pm.response.code < 300) {", "  const body = pm.response.json();", "  const d = Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;"]
        for key, expr in capture.items():
            script.append(f"  if ({expr} !== undefined && {expr} !== null) pm.environment.set('{key}', String({expr}));")
        script.append("}")
    item = {"name": name, "request": req, "event": [{"listen": "test", "script": {"type": "text/javascript", "exec": script}}], "response": []}
    # All business mutations require an explicit local/staging testing decision.
    if method != 'GET' and not path.startswith('auth/'):
        item['event'].insert(0, {"listen": "prerequest", "script": {"type": "text/javascript", "exec": [
            "if (pm.environment.get('allow_writes') !== 'true') {",
            "  console.warn('Skipped: set allow_writes=true only for an approved test restaurant/environment.');",
            "  pm.execution.skipRequest();",
            "}",
        ]}})
    groups.setdefault(folder, []).append(item)

request('01 Auth', 'Auth capabilities', 'GET', 'auth-config', auth='public')
request('01 Auth', 'Sign in — cookie, not a JSON token', 'POST', 'auth/sign-in/email', {"email":"{{email}}", "password":"{{password}}", "rememberMe":True}, auth='public', note='Keep Postman cookie jar enabled. If twoFactorRedirect is true, verify TOTP before /account/me.')
request('01 Auth', 'Verify TOTP', 'POST', 'auth/two-factor/verify-totp', {"code":"{{otp}}", "trustDevice":False})
request('01 Auth', 'Verify backup code — alternative to TOTP', 'POST', 'auth/two-factor/verify-backup-code', {"code":"{{backup_code}}", "trustDevice":False})
request('01 Auth', 'Get auth session', 'GET', 'auth/get-session')
request('01 Auth', 'Me — permissions and subscription', 'GET', 'account/me')
request('01 Auth', 'Permission catalogue', 'GET', 'permissions')
request('01 Auth', 'List devices', 'GET', 'auth/list-sessions')
request('01 Auth', 'Revoke one device', 'POST', 'auth/revoke-device', {"id":"{{device_session_id}}"})
request('01 Auth', 'Request password-reset email', 'POST', 'auth/request-password-reset', {"email":"{{email}}", "redirectTo":"/reset-password"}, auth='public')
request('01 Auth', 'Sign out — run at end', 'POST', 'auth/sign-out', {})

request('02 Customer delivery', 'Directory — includes not-ready delivery restaurants', 'GET', 'public/restaurants', auth='public', note='id is the card key. slug can be null. open controls ordering; use delivery_status/menu_available. An empty response is valid.', capture={"restaurant_slug": "d.find?.(r => r.open && r.slug)?.slug"})
request('02 Customer delivery', 'Restaurant menu', 'GET', 'public/restaurants/{{restaurant_slug}}', auth='public', capture={"menu_item_id":"d.items?.find(i => i.is_available)?.id", "zone_id":"d.zones?.[0]?.id"})
order = {"type":"delivery", "name":"زبون اختبار", "phone":"{{customer_phone}}", "address":"عنوان اختبار — لا ترسل لمطعم حقيقي", "zone_id":"{{zone_id}}", "notes":"طلب تكامل تجريبي", "payment_method":"cash", "items":[{"menuItemId":"{{menu_item_id}}", "quantity":2, "note":"بدون بصل", "options":[]}]}
request('02 Customer delivery', 'Create delivery — review zone minimum first', 'POST', 'public/restaurants/{{restaurant_slug}}/orders', order, {"order_id":"d.id", "order_token":"d.token"}, [201], 'public', 'Set a real test zone and available item. Server prices win. quantity=2 may not meet every zone minimum. Do not automatically retry after timeout.')
transfer = order | {"payment_method":"transfer", "proof":"{{proof_data_url}}"}
request('02 Customer delivery', 'Create delivery with bank-transfer proof — alternative flow', 'POST', 'public/restaurants/{{restaurant_slug}}/orders', transfer, {"order_id":"d.id", "order_token":"d.token"}, [201], 'public', 'proof_data_url must be a real test PNG/JPEG/WebP data URL, decoded size <=5MB. No automatic payment verification.')
pickup = {k:v for k,v in order.items() if k not in ('address','zone_id')}
pickup['type'] = 'pickup'
request('02 Customer delivery', 'Create pickup — alternative flow', 'POST', 'public/restaurants/{{restaurant_slug}}/orders', pickup, {"order_id":"d.id", "order_token":"d.token"}, [201], 'public')
request('02 Customer delivery', 'Track order with secret header', 'GET', 'public/outside-orders/{{order_id}}', auth='order_token')

for state in ['active','awaiting','done','delivery']:
    request('03 Operations', 'Outside orders — '+state, 'GET', 'outside-orders?status='+state, note='Drivers always receive assigned ready delivery orders, regardless of this filter. General done view is only the past two days. Limit 200, no cursor.')
request('03 Operations', 'Accept outside order', 'POST', 'outside-orders/{{order_id}}/accept', {"prep_minutes":20})
request('03 Operations', 'Reject — alternative to acceptance', 'POST', 'outside-orders/{{order_id}}/reject', {"reason":"المطعم لا يستطيع تجهيز الطلب التجريبي"})
request('03 Operations', 'Verify bank transfer', 'POST', 'outside-orders/{{order_id}}/verify-payment', {}, note='Only for a transfer order after checking the real payment. Not used in the cash happy path.')
request('03 Operations', 'Owner orders', 'GET', 'owner/orders')
request('03 Operations', 'One owner order', 'GET', 'owner/orders/{{order_id}}')
request('04 Kitchen', 'Kitchen queue', 'GET', 'kitchen/orders')
for state in ['preparing','ready']:
    request('04 Kitchen', 'Kitchen → '+state, 'PATCH', 'kitchen/orders/{{order_id}}/status', {"status":state})
request('05 Delivery staff', 'Ready delivery board / assigned to me', 'GET', 'outside-orders?status=delivery')
request('05 Delivery staff', 'Drivers and workload', 'GET', 'outside-orders/drivers', capture={"driver_id":"d[0]?.id"})
request('05 Delivery staff', 'Assign driver — dispatcher', 'POST', 'outside-orders/{{order_id}}/assign', {"driver_id":"{{driver_id}}"}, note='id comes from drivers, not the staff table. Kitchen must be ready.')
request('05 Delivery staff', 'Out for delivery', 'POST', 'outside-orders/{{order_id}}/dispatch', {})
request('05 Delivery staff', 'Delivered and collected', 'POST', 'outside-orders/{{order_id}}/complete', {}, note='Confirm delivery and cash collection before calling. Transfer payments must already be verified.')

request('06 Tables and waiter', 'Tables', 'GET', 'tables', capture={"table_id":"d[0]?.id", "table_code":"d[0]?.table_code"})
request('06 Tables and waiter', 'Active sessions', 'GET', 'sessions')
request('06 Tables and waiter', 'Table status', 'GET', 'tables/{{table_id}}/status')
request('06 Tables and waiter', 'Resolve assistance request', 'PATCH', 'assistance-requests/{{assistance_id}}/resolve', {})
request('06 Tables and waiter', 'Resolve assistance for session', 'POST', 'sessions/{{session_id}}/assistance/resolve', {})
request('06 Tables and waiter', 'Cancel order item', 'POST', 'order-items/{{order_item_id}}/cancel', {"reason":"طلب الزبون إلغاء الصنف"})
request('06 Tables and waiter', 'Reassign cancelled item', 'POST', 'order-items/{{order_item_id}}/reassign', {"target_session_id":"{{target_session_id}}"})

request('07 Cashier', 'Session bill', 'GET', 'sessions/{{session_id}}/bill')
request('07 Cashier', 'Record cash payment', 'POST', 'sessions/{{session_id}}/payment', {"method":"cash", "close":False}, status=[201])
request('07 Cashier', 'Adjust bill item', 'PATCH', 'sessions/{{session_id}}/bill-items/{{bill_item_id}}', {"new_price":15, "reason":"تصحيح سعر تجريبي"})
request('07 Cashier', 'Close session', 'POST', 'sessions/{{session_id}}/close', {})
request('07 Cashier', 'Pending payments', 'GET', 'payments/pending')
request('07 Cashier', 'Verify payment', 'POST', 'payments/{{payment_id}}/verify', {})
request('07 Cashier', 'Reject payment', 'POST', 'payments/{{payment_id}}/reject', {"reason":"إثبات غير واضح"})

request('08 Menu and settings', 'Menu items', 'GET', 'menu-items')
request('08 Menu and settings', 'Disable menu item', 'PUT', 'menu-items/{{menu_item_id}}', {"is_available":False})
request('08 Menu and settings', 'Enable menu item', 'PUT', 'menu-items/{{menu_item_id}}', {"is_available":True})
request('08 Menu and settings', 'Online ordering settings', 'GET', 'online-ordering/settings')
request('08 Menu and settings', 'Enable delivery / set test zones', 'PUT', 'online-ordering/settings', {"enabled":True,"paused":False,"pickup_enabled":True,"delivery_enabled":True,"prep_minutes":20,"zones":[{"name":"منطقة اختبار","fee":5,"min_order":0,"active":True}]}, note='zones replaces the whole list and changes zone IDs. Use only a dedicated test restaurant. Re-read the public menu afterwards.')
request('08 Menu and settings', 'Pause incoming orders', 'PUT', 'online-ordering/settings', {"paused":True})
request('08 Menu and settings', 'Resume incoming orders', 'PUT', 'online-ordering/settings', {"paused":False})
request('08 Menu and settings', 'Staff list', 'GET', 'staff')

request('09 QR guest — optional', 'Public table menu', 'GET', 'public/tables/{{table_code}}/menu', auth='public')
request('09 QR guest — optional', 'Open table session', 'POST', 'public/tables/{{table_code}}/sessions', {"name":"زبون اختبار", "phone":"{{customer_phone}}", "latitude":31.5, "longitude":34.46}, {"session_id":"d.id", "session_token":"d.access_token"}, [200,201], 'public', 'Real restaurants enforce location. Use actual test-restaurant coordinates, not these illustrative coordinates.')
request('09 QR guest — optional', 'Session details', 'GET', 'public/sessions/{{session_id}}', auth='session_token')
request('09 QR guest — optional', 'Send table order', 'POST', 'public/sessions/{{session_id}}/orders', {"items":order['items']}, status=[200,201], auth='session_token')
request('09 QR guest — optional', 'Guest session orders', 'GET', 'public/sessions/{{session_id}}/orders', auth='session_token')
request('09 QR guest — optional', 'Call waiter', 'POST', 'public/sessions/{{session_id}}/assistance-requests', {}, status=[200,201], auth='session_token')
request('09 QR guest — optional', 'Request bill', 'POST', 'public/sessions/{{session_id}}/bill-request', {}, status=[200,201], auth='session_token')
request('09 QR guest — optional', 'Guest bill', 'GET', 'public/sessions/{{session_id}}/bill', auth='session_token')

collection = {"info":{"name":"MenuPilot — Flutter Mobile", "schema":"https://schema.getpostman.com/json/collection/v2.1.0/collection.json", "description":"Source-checked requests for customer, staff and delivery apps. Import an environment. Cookies are required for real accounts; no JSON login token. Business writes are skipped unless allow_writes=true. This is a catalogue, not a run-all scenario: acceptance/rejection, pickup/delivery, sign-out and different roles are alternatives. Read API.md and select one workflow on staging."}, "item":[{"name":k,"item":v} for k,v in groups.items()]}
dump("MenuPilot-Mobile.postman_collection.json", collection)
variables = {"origin":"http://localhost:5173", "base_url":"http://localhost:5173/api", "allow_writes":"false", "email":"", "password":"", "otp":"", "backup_code":"", "restaurant_slug":"", "customer_phone":"0599000000", "menu_item_id":"1", "zone_id":"1", "order_id":"", "order_token":"", "driver_id":"1", "table_id":"", "table_code":"", "session_id":"", "session_token":"", "assistance_id":"", "order_item_id":"", "bill_item_id":"", "payment_id":"", "target_session_id":"1", "device_session_id":""}
variables['proof_data_url'] = ''
secret = {"password","otp","backup_code","order_token","session_token"}
for label, origin in [('Local','http://localhost:5173'),('Production','https://menupilot-lilac.vercel.app')]:
    vals = variables | {"origin":origin,"base_url":origin+'/api'}
    dump(f"MenuPilot-{label}.postman_environment.json", {"name":f"MenuPilot {label} — writes disabled", "values":[{"key":k,"value":v,"type":"secret" if k in secret else "default","enabled":True} for k,v in vals.items()], "_postman_variable_scope":"environment"})
print(json.dumps({"routes":len(routes), "mobile_requests":sum(map(len,groups.values())), "matched_laravel_operations":len(coverage)}, ensure_ascii=False))
