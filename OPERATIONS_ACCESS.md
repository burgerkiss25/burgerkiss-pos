# BurgerKiss staff access and operating schedule

## Staff roles

- **Mr Asamoah** — Owner
- **Vera** — Supervisor
- **Josephine** — Employee
- **Erica** — Employee

On first use, Mr Asamoah creates a personal 4–6 digit PIN for every staff member. The browser stores salted PBKDF2 hashes rather than plain-text PINs. A signed-in operator selects the early or late shift, and the current operator remains active for the browser tab until they choose their identity in the header to sign out or switch staff.

## Shifts and sales hours

- Early shift: **07:00–16:00**
- Late shift: **15:00–00:00**
- Handover overlap: **15:00–16:00**
- Sales hours: **08:00–23:59**, Monday through Sunday

Before 08:00 the POS shows preparation time. After 23:59 it blocks the first item of a new order and new online orders, while existing orders can still be prepared, paid, issued, or voided by an authorized person. Closeout activity before 08:00 is assigned to the previous business date.

## Role permissions in this phase

Employees can perform the normal Order → Make → Pay → Issue workflow, print receipts, inspect history, and use discounts up to 3%. Vera and Mr Asamoah can additionally use 5%/10% discounts, void completed orders, and open the daily report. Only Mr Asamoah can open Admin, clear local device storage, and export full history data.

Order history now retains the staff member who created, paid, issued, or voided the order together with shift and business-date metadata.

## Security boundary

This access gate protects day-to-day use of the POS interface, but it is not a replacement for server-side authorization. Firebase Authentication claims and Realtime Database Rules must still enforce the same roles before the application is treated as secure against a person who can modify browser storage or run developer tools.
