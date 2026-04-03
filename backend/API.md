# Hotel Surveillance API — Testing Reference (Postman)

Base path: **`http://localhost:<PORT>/api`**

Replace `<PORT>` with your `.env` `PORT` (example: **5001**).  
Protected routes need: **`Authorization: Bearer <access_token>`**

Set Postman variables (recommended):

| Variable | Example | Purpose |
|----------|---------|---------|
| `baseUrl` | `http://localhost:5001/api` | All request URLs |
| `accessToken` | *(paste after login)* | Bearer token |

After **Login**, copy `data.token` from the response into `accessToken`.

---

## 1. Health

### `GET /health`

- **Auth:** No  
- **Purpose:** Liveness + PostgreSQL connectivity.  
- **Success:** `200`, `database: "connected"`  
- **Failure:** `503` if DB down  

**Postman:** GET `{{baseUrl}}/health`

---

## 2. Authentication

### `POST /auth/register`

- **Auth:** No  
- **Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "minimum8chars",
  "fullName": "Full Name",
  "role": "hotel"
}
```

- **`role`:** `hotel` | `police` | `admin`  
- **Success:** `201`, returns `token` + `user`  

### `POST /auth/login`

- **Auth:** No  
- **Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

- **Success:** `200`, returns `token` + `user` — use token as `accessToken`  

---

## 3. Guests

All require **Bearer** + roles **`hotel`**, **`police`**, or **`admin`**.

### `POST /guests`

Creates a **guest** and a **stay** in one transaction. May trigger blacklist matching and return `blacklistCheck` if an alert is created.

**Body (JSON):**

```json
{
  "fullName": "Jane Doe",
  "idNumber": "PASS-001",
  "hotelId": "00000000-0000-0000-0000-000000000001",
  "checkIn": "2026-04-01T14:00:00.000Z",
  "checkOut": null,
  "roomNumber": "101",
  "phone": "+251900000000",
  "email": "jane@example.com",
  "notes": "optional",
  "dateOfBirth": "1990-05-15",
  "status": "active"
}
```

- **`status` (optional):** `active` | `checked_out` | `cancelled`  
- **Hotel users** must belong to `hotelId` via **`hotel_users`**.  

### `GET /guests`

- **Query (optional):** `hotelId=<uuid>` — filter guests who have a stay at that hotel.  
- **Police / admin:** all guests, or filtered by `hotelId`.  
- **Hotel:** only guests with stays at hotels the user is assigned to.  

**Examples:**

- `GET {{baseUrl}}/guests`  
- `GET {{baseUrl}}/guests?hotelId={{hotelId}}`  

### `GET /guests/:id`

- **Path:** `:id` = guest UUID  
- **Returns:** guest + list of stays (hotel users only see stays for hotels they can access).  

---

## 4. Stays

### `POST /stays`

- **Auth:** Bearer + `hotel` | `police` | `admin`  
- **Purpose:** Add a stay for an **existing** guest.  

**Body (JSON):**

```json
{
  "guestId": "00000000-0000-0000-0000-000000000002",
  "hotelId": "00000000-0000-0000-0000-000000000001",
  "checkIn": "2026-04-02T12:00:00.000Z",
  "checkOut": null,
  "roomNumber": "205",
  "status": "active"
}
```

---

## 5. Alerts

### `GET /alerts`

- **Auth:** Bearer  
- **Police / admin:** all alerts.  
- **Hotel:** alerts only for hotels in **`hotel_users`**.  

### `PATCH /alerts/:id`

- **Auth:** Bearer  
- **Purpose:** Mark alert as reviewed (`acknowledged_at` set if it was null).  
- **Roles:** `hotel` (must be allowed for alert’s hotel), `police`, `admin`  
- **Body:** none required  

**Example:** `PATCH {{baseUrl}}/alerts/{{alertId}}`

---

## 6. Blacklist (global)

Entries apply **system-wide**: guest registration checks the full blacklist regardless of hotel.  
`id_number` is unique across the system.

### `GET /blacklist`

- **Auth:** Bearer — **`police`** or **`admin`**  
- **Query (optional):** pagination (`page`, `limit`) per API defaults.  

**Example:** `GET {{baseUrl}}/blacklist`

### `POST /blacklist`

- **Auth:** Bearer — **`police`** only  
- **Body (JSON):** do **not** send `hotelId`.  

```json
{
  "name": "John Doe",
  "idNumber": "ID-12345",
  "dateOfBirth": "1985-03-20",
  "reason": "Suspicious activity"
}
```

### `DELETE /blacklist/:id`

- **Auth:** Bearer — **`police`** or **`admin`**  
- **Path:** `:id` = blacklist row UUID  

---

## 7. Blacklist (legacy — hotel-scoped routes)

Optional nested routes still exist for tooling; prefer **§6** for police UI.

Base: **`/hotels/:hotelId/blacklist`**

### `GET /hotels/:hotelId/blacklist`

- **Auth:** Bearer — **`police`** or **`admin`** — lists entries for that hotel only.  

### `POST /hotels/:hotelId/blacklist`

- **Auth:** Bearer — **`police`** only — `hotel_id` is taken from the URL.  

### `DELETE /hotels/:hotelId/blacklist/:id`

- **Auth:** Bearer — **`police`** only  

---

## 8. Hotels (alerts by hotel)

### `GET /hotels/:hotelId/alerts`

- **Auth:** Bearer  
- **Purpose:** Alerts for one hotel; uses **`requireHotelAccess`** (hotel staff only for their hotels).  

---

## 9. Documents (file upload)

### `POST /documents`

- **Auth:** Bearer — `hotel` | `police` | `admin`  
- **Content-Type:** `multipart/form-data` (not JSON)  
- **Fields:**
  - **`file`** — file (required). Allowed: **JPEG, PNG, GIF, WebP, PDF**. Max **5 MB**.
  - **`stayId`** — UUID (text field)
  - **`title`** — optional (default `"ID document"`)

**Postman:** Body → **form-data** → add `stayId`, `title`, `file` (type **File**).

---

## Common HTTP codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `204` | No content (e.g. blacklist delete) |
| `400` | Validation / bad input |
| `401` | Missing or invalid JWT |
| `403` | Forbidden (role / hotel access) |
| `404` | Not found |
| `409` | Conflict (e.g. duplicate email / blacklist) |
| `413` | File too large (documents) |
| `503` | Service unavailable (e.g. health DB down) |

---

## Postman import

Import **`apis.json`** (same folder as this file) via **Import → File**.  
Update collection variables **`baseUrl`** and **`accessToken`**, then run **Login** and paste the token into **`accessToken`**.

Use real UUIDs from your database for `hotelId`, `guestId`, `stayId`, etc., or create them via register + SQL / app flows.
