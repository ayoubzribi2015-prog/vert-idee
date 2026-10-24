# Security Specification - Vert'Idée

## Data Invariants
- A `ProjectAudit` must always have a `userId` that matches the authenticated user's UID.
- A `ProjectAudit` cannot be created or updated by anyone other than its owner.
- User profiles (`users/{userId}`) can only be read or written by the owner of that profile.
- `global_projects` are read-only for all users and only writable by the Admin SDK (server-side).

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a project for another user.
   ```json
   { "id": "p1", "userId": "attacker_uid", "title": "Evil Project" }
   ```
2. **State Shortcutting**: Attempt to update a project's `createdAt` timestamp.
3. **Resource Poisoning**: Large string (1MB) in the `title` field.
4. **Email Spoofing**: Attempt to access data by claiming an admin email without verification.
5. **PII Leak**: Authenticated user trying to read another user's profile.
6. **Shadow Update**: Adding an `isAdmin: true` field to a user profile.
7. **Orphaned Write**: Creating a project without a valid user profile existing.
8. **Type Poisoning**: Sending a boolean instead of a string for `location`.
9. **Regex Bypass**: Using special characters in an ID that should be alphanumeric.
10. **Boundary Breach**: Setting a negative score in `projectSynthesis`.
11. **State Lock Bypass**: Updating a project after it's been marked as "terminal".
12. **Unbounded Array**: Sending a list of 10,000 tags.

## Test Runner (Logic Verification)
The following rules will ensure all these payloads return `PERMISSION_DENIED`.
