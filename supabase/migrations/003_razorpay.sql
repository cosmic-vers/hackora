-- Tracks the Razorpay order created for a booking's checkout, so the
-- payment-verification step can confirm the signed callback belongs to an
-- order we actually created (and not one replayed for a different booking).
alter table bookings add column if not exists razorpay_order_id text not null default '';
