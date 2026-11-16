# Firestore Security Specification

## 1. Data Invariants
1. Only a verified administrator (`request.auth.token.email == 'pawankumar36uhdj@gmail.com' && request.auth.token.email_verified == true` or document in `/admins/{uid}`) may create, update, or delete any document in `/settings`, `/prizes`, `/winners`, `/lookup_by_mobile`, or `/lookup_by_ticket`.
2. Public listing (`allow list`) on `/lookup_by_mobile`, `/lookup_by_ticket`, `/settings`, `/prizes`, `/admins`, and `/test` is strictly denied (`if false;`) to prevent database scraping or PII enumeration.
3. Listing `/winners` is restricted exclusively to the verified administrator email without `get()`/`exists()` calls inside `allow list`.
4. All single-document operations validate `isValidId(id)` (`^[a-zA-Z0-9_-]+$`, `<= 128` chars).
5. All string fields enforce explicit `.size()` bounds and all arrays enforce `.size()` and element-type validation.
6. All `createdAt` and `updatedAt` timestamps must match `request.time`, and `createdAt` is immutable on update.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/settings/public` with `{ drawDate: '01-01-2099' }`.
2. Signed-in non-admin user attempting `create` in `/winners/fake123`.
3. Spoofed admin email with `email_verified: false` attempting write to `/prizes/current`.
4. Shadow update on `/settings/public` injecting extra ghost field `{ isVerified: true }`.
5. Public `list` query on `/lookup_by_mobile` attempting to scrape all mobile numbers.
6. Public `list` query on `/winners` attempting to enumerate all winner PII.
7. Oversized `id` path parameter (e.g., 500-char ID or invalid characters `../admin`) on `/winners/{winnerId}`.
8. Invalid type value poisoning: setting `taxProgress: "100"` (string instead of number) or `taxProgress: 500` (> 100) on `/winners/{winnerId}`.
9. Forged client timestamp on create/update (`updatedAt: "2020-01-01T00:00:00Z"` instead of `request.time`).
10. Overwriting immutable `createdAt` during an update to `/winners/{winnerId}`.
11. Unbounded array injection (`firstPrize` with > 500 elements or integer element `[12345]`) on `/prizes/current`.
12. Deleting `/settings/public` or `/prizes/current` singleton documents.
