# Crestline Capital — First Admin Setup

The application includes a one-time first-admin bootstrap flow.

## 1. Configure Vercel

In **Vercel → Project → Settings → Environment Variables**, add this variable for **Production** (and Preview if needed during testing):

```text
ADMIN_BOOTSTRAP_SECRET=<generate-a-random-secret-of-at-least-32-characters>
```

Do not commit the real secret to GitHub or put it in client-side environment variables (`NEXT_PUBLIC_*`).

The existing `MONGODB_URI` and `JWT_SECRET` must also be configured.

## 2. Deploy

Push/merge the latest `main` commit and wait for the Vercel deployment to become **Ready**.

## 3. Open the setup page

```text
https://YOUR-DOMAIN/admin/setup
```

The page checks `/api/admin/bootstrap/status` first. The bootstrap endpoint is available only when:

- `ADMIN_BOOTSTRAP_SECRET` exists and is at least 16 characters; and
- no user with `isAdmin: true` exists in MongoDB.

## 4. Create the administrator

Enter:

- Administrator name
- Administrator email
- A new strong password (12+ characters)
- A 4–6 digit transfer PIN
- The exact `ADMIN_BOOTSTRAP_SECRET`

The password and PIN are hashed with bcrypt before storage. The response never returns either secret.

## 5. Bootstrap closes permanently

After the first admin is created, subsequent bootstrap requests return HTTP `410` and cannot create another administrator through this endpoint. The setup page will report that initial administrator setup has already been completed.

The created user has:

```text
isAdmin: true
isFrozen: false
balance: 0
```

A unique 10-digit account number is generated automatically.

## Security notes

- Do not reuse a password that has been exposed in chat, screenshots, logs, or source control.
- Rotate any previously exposed Vercel, MongoDB, or application secrets.
- Keep `ADMIN_BOOTSTRAP_SECRET` server-side only.
- After creating the first admin, you may remove `ADMIN_BOOTSTRAP_SECRET` from Vercel Production; the endpoint is already closed because an admin exists.
- For a real production banking deployment, protect the bootstrap route with additional platform-level WAF/rate limiting and private administrative access.
