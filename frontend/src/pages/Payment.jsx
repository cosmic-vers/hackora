import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CreditCard, ShieldCheck, ReceiptText, CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import client, { apiError } from "../api/client";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

/** Loads the Razorpay checkout widget once and reuses it on later visits. */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Payment() {
  const { id } = useParams();
  const toast = useToast();
  useAuth(); // ensures the session is ready before we call authenticated endpoints
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    client.get(`/bookings/${id}`).then(({ data }) => setBooking(data.booking)).catch((e) => toast.error(apiError(e).message)).finally(() => setLoading(false));
  }, [id, toast]);

  const finishPayment = useCallback((updatedBooking, message) => {
    setBooking(updatedBooking);
    toast.success(message);
    setPaying(false);
  }, [toast]);

  const failPayment = useCallback((e) => {
    toast.error(apiError(e).message);
    setPaying(false);
  }, [toast]);

  // Demo/simulated instant payment — used automatically when the backend
  // has no Razorpay test-mode keys configured.
  const payDemo = useCallback(async () => {
    try {
      const { data } = await client.post(`/bookings/${id}/pay`, { method: "ONLINE_DEMO" });
      finishPayment(data.booking, "Payment successful. Receipt generated.");
    } catch (e) {
      failPayment(e);
    }
  }, [id, finishPayment, failPayment]);

  const pay = async () => {
    setPaying(true);
    try {
      const { data: order } = await client.post(`/bookings/${id}/pay/order`);
      if (order.alreadyPaid) { setBooking(order.booking); setPaying(false); return; }
      if (order.demo) { await payDemo(); return; }

      const ready = await loadRazorpayScript();
      if (!ready) { toast.error("Could not load the payment gateway. Check your connection and try again."); setPaying(false); return; }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            const { data } = await client.post(`/bookings/${id}/pay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            finishPayment(data.booking, "Payment successful. Receipt generated.");
          } catch (e) {
            failPayment(e);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      checkout.on("payment.failed", (response) => {
        toast.error(response.error?.description || "Payment failed. Please try again.");
        setPaying(false);
      });
      checkout.open();
    } catch (e) {
      failPayment(e);
    }
  };

  if (loading) return <Layout title="Secure checkout"><div className="card card-pad">Loading checkout…</div></Layout>;
  if (!booking) return <Layout title="Checkout"><div className="card card-pad">Booking not found.</div></Layout>;
  if (booking.paymentStatus === 'PAID') return <Layout title="Payment complete" subtitle="Your booking is paid and your digital receipt is ready."><div className="payment-success"><CheckCircle2 size={52}/><h2>Payment successful</h2><p>{booking.receiptNo}</p><div className="payment-actions"><Link className="btn btn-primary" to={`/app/receipt/${booking.id}`}><ReceiptText/> View receipt</Link><Link className="btn btn-ghost" to="/app/my-bookings">Back to bookings</Link></div></div></Layout>;
  return <Layout title="Secure checkout" subtitle="Complete the online booking payment after approval."><div className="checkout-grid"><div className="card card-pad"><div className="checkout-brand"><div className="icon-tile"><CreditCard/></div><div><h2>{booking.title}</h2><p>{booking.venueName} · {booking.date} · {booking.startTime}–{booking.endTime}</p></div></div><div className="checkout-demo"><ShieldCheck/><div><b>Secure checkout via Razorpay</b><span>Test mode — use Razorpay's test card/UPI details. No real money moves. Falls back to a simulated payment if the server has no Razorpay keys set.</span></div></div><button className="btn btn-primary btn-lg" onClick={pay} disabled={paying}>{paying?"Processing…":`Pay ₹${booking.totalAmount.toLocaleString("en-IN")}`}</button></div><div className="card card-pad"><h3>Order summary</h3><div className="price-row"><span>Venue</span><b>₹{booking.baseAmount.toLocaleString("en-IN")}</b></div><div className="price-row"><span>Additional services</span><b>₹{booking.servicesAmount.toLocaleString("en-IN")}</b></div>{booking.services?.map(s=><div className="price-row sub" key={s.id}><span>{s.name}</span><span>₹{Number(s.agreedRate).toLocaleString("en-IN")}</span></div>)}<div className="price-total"><span>Total</span><strong>₹{booking.totalAmount.toLocaleString("en-IN")}</strong></div></div></div></Layout>;
}
