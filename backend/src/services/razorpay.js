const Razorpay = require("razorpay");
const env = require("../config/env");

let instance = null;

/** True once both test-mode keys are set; false keeps the app on the demo payment flow. */
function isConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function client() {
  if (!isConfigured()) return null;
  if (!instance) {
    instance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
}

module.exports = { isConfigured, client };
