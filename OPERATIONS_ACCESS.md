# BurgerKiss staff access and operating workflow

## Staff roles and access modes

- **Mr Asamoah** — Owner
- **Vera** — Supervisor
- **Josephine** — Employee
- **Erica** — Employee

Mr Asamoah and Vera may sign in using **Remote Support** without joining a shift. Remote sessions are independent per device/browser tab, do not replace the active Foodtruck operator, and are intended for monitoring, reports and approvals. To operate the till, either person explicitly joins the Early or Late shift. Josephine and Erica always select an operational shift.

PINs are stored locally as salted PBKDF2 hashes rather than plain text. True multi-device identity and remote approvals still require Firebase Authentication and server-side Database Rules.

## Shifts and sales hours

- Early shift: **07:00–16:00**
- Late shift: **15:00–00:00**
- Handover overlap: **15:00–16:00**
- Sales hours: **08:00–23:59**, Monday through Sunday

Before 08:00 the POS shows preparation time. After 23:59 it blocks new orders while existing orders can still be completed. Closeout activity before 08:00 is assigned to the previous business date.

## Starting orders

When there is no open order, the POS shows **Walk-in Order** and **Online Order** instead of allocating an empty order number. Online channels are WhatsApp, Bolt, Chowdeck and Hubtel. Bolt, Chowdeck and Hubtel are prepaid. WhatsApp remains unpaid until the applicable pickup/delivery payment event.

## WhatsApp fulfilment

- **Pickup:** Cash or MoMo at pickup.
- **Customer rider:** MoMo must be received before handover.
- **BurgerKiss rider:** MoMo on delivery. Handover to the BurgerKiss rider changes the order to `out-for-delivery`; the order closes only after MoMo and delivery are confirmed.

## Packaging confirmation

Packaging is confirmed only after **Continue to Kitchen**, never while products are still being selected. Every menu always remains in its own food bag. Extra items are explicitly assigned to a menu/customer or a separate bag. Drinks may be packed together to reduce bag use or kept separated by customer group.

## Role permissions

Employees perform the normal Order → Make → Pay → Issue workflow and use discounts up to 3%. Vera and Mr Asamoah can additionally use 5%/10% discounts, void completed orders and open the daily report. Only Mr Asamoah can open Admin, clear local device storage and export full history data.
