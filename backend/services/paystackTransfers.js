const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return key;
}

async function paystackRequest(path, options = {}) {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== true) {
    const error = new Error(body.message || `Paystack request failed (${response.status})`);
    error.status = response.status;
    error.providerResponse = body;
    throw error;
  }
  return body.data;
}

async function createTransferRecipient({ name, accountNumber, bankCode, currency = 'NGN' }) {
  return paystackRequest('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency
    })
  });
}

async function initiateTransfer({ amount, recipientCode, reference, reason, currency = 'NGN' }) {
  if (!/^[a-z0-9_-]{16,50}$/.test(reference)) throw new Error('Invalid Paystack transfer reference');
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Transfer amount must be a positive integer in minor currency units');
  return paystackRequest('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount,
      recipient: recipientCode,
      reference,
      reason,
      currency
    })
  });
}

module.exports = { createTransferRecipient, initiateTransfer };
