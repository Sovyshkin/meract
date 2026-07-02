import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import styles from "./PayPage.module.css";
import back from '../../images/arrow-left.png';
import notification from '../../images/notification.png';
import candy1 from '../../images/candy1.png';
import candy2 from '../../images/candy2.png';
import candy3 from '../../images/candy3.png';
import candy4 from '../../images/candy4.png';

import { payApi } from '../../shared/api/pay';
import { useT } from '../../shared/hooks/useT';

const CARD_STYLE = {
  style: {
    base: {
      color: '#fff',
      fontFamily: 'Oxanium, sans-serif',
      fontSize: '16px',
      '::placeholder': { color: '#555' },
    },
    invalid: { color: '#ff4d4d' },
  },
};

// Иконки-заглушки по порядку (для товаров без imageUrl)
const PLACEHOLDER_IMGS = [candy1, candy2, candy3, candy4];

// ─── Форма оплаты (внутри Elements) ──────────────────────────────────────────

function CheckoutForm({ clientSecret, amount, currency, echoAmount, onSuccess, onCancel }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setProcessing(true);
    setErrorMsg('');
    try {
      const card = elements.getElement(CardElement);
      if (!card) {
        setErrorMsg('Card form is not ready');
        return;
      }
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (result.error) {
        setErrorMsg(result.error.message);
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess(result.paymentIntent);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>
        {(amount / 100).toFixed(2)} {currency?.toUpperCase()} → <b style={{ color: '#009DFF' }}>{echoAmount} ECHO</b>
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '14px',
        marginBottom: '16px',
      }}>
        <CardElement options={CARD_STYLE} />
      </div>
      {errorMsg && (
        <p style={{ color: '#ff4d4d', fontSize: '13px', marginBottom: '12px' }}>{errorMsg}</p>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: '#aaa', cursor: 'pointer', fontFamily: 'Oxanium, sans-serif',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          style={{
            flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
            background: processing ? '#333' : '#009DFF', color: 'white',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontFamily: 'Oxanium, sans-serif', fontWeight: 600,
          }}
        >
          {processing ? 'Processing…' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

// ─── Основной компонент ───────────────────────────────────────────────────────

const PayStore = () => {
  const t = useT();
  const navigate = useNavigate();

  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);

  // Stripe flow
  const [modal,        setModal]        = useState(null);   // { product, clientSecret, publishableKey, amount, currency, echoAmount }
  const [stripePromise, setStripePromise] = useState(null);
  const [buying,       setBuying]       = useState(null);   // productId — кнопка в состоянии загрузки

  // Статус после оплаты
  const [payStatus,    setPayStatus]    = useState(null);   // 'confirming' | 'done' | 'error'
  const [echoAdded,    setEchoAdded]    = useState(0);
  const [payError,     setPayError]     = useState('');

  // ── Загрузка товаров ──────────────────────────────────────────────────────
  useEffect(() => {
    payApi.shopProducts()
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Нажатие "Купить" ──────────────────────────────────────────────────────
  const handleBuy = async (product) => {
    setBuying(product.id);
    try {
      const data = await payApi.shopBuy(product.id);
      if (!data?.clientSecret || !data?.publishableKey) {
        throw new Error('Payment could not be initialized');
      }
      // data = { clientSecret, publishableKey, amount, currency, echoAmount }
      setStripePromise(loadStripe(data.publishableKey));
      setModal({ product, ...data });
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      alert(Array.isArray(apiMsg) ? apiMsg.join(', ') : (apiMsg || 'Failed to start payment'));
    } finally {
      setBuying(null);
    }
  };

  // ── Успешная оплата: подтверждение на сервере и зачисление ECHO ───────────
  const handlePaymentSuccess = async (intent) => {
    setModal(null);
    setPayStatus('confirming');
    setPayError('');
    try {
      const result = await payApi.shopConfirm(intent.id);
      setEchoAdded(result.echoAwarded ?? modal?.echoAmount ?? 0);
      setPayStatus('done');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Payment succeeded but ECHO was not credited. Contact support.';
      setPayError(Array.isArray(msg) ? msg.join(', ') : String(msg));
      setPayStatus('error');
    }
  };

  // ── Карточки товаров ──────────────────────────────────────────────────────
  const cards = products.map((p, idx) => ({
    ...p,
    img:       p.imageUrl || PLACEHOLDER_IMGS[idx % PLACEHOLDER_IMGS.length],
    echoLabel: String(Math.round(p.currency)),  // currency = кол-во echo
    priceLabel:`${Number(p.price).toFixed(2)}`,
    discount:  p.discount ? Math.round(p.discount) : null,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.header_cont}>
          <img src={back} alt="back" onClick={() => window.history.back()} style={{ cursor: 'pointer' }} />
          <div className="name"><h1>{t('walletShop')}</h1></div>
          <img src={notification} alt="notifications" onClick={() => navigate('/notifications')} />
        </div>
      </div>

      {/* Статус после оплаты */}
      {payStatus && (
        <div style={{
          margin: '0 0 16px',
          padding: '14px 18px',
          borderRadius: '12px',
          background:
            payStatus === 'done'
              ? 'rgba(0,243,0,0.08)'
              : payStatus === 'error'
                ? 'rgba(255,77,77,0.08)'
                : 'rgba(0,157,255,0.08)',
          border: `1px solid ${
            payStatus === 'done'
              ? '#00F30044'
              : payStatus === 'error'
                ? '#ff4d4d44'
                : '#009DFF44'
          }`,
          color:
            payStatus === 'done'
              ? '#00F300'
              : payStatus === 'error'
                ? '#ff4d4d'
                : '#009DFF',
          fontFamily: 'Oxanium, sans-serif',
          fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>
            {payStatus === 'confirming'
              ? '⏳ Confirming payment…'
              : payStatus === 'error'
                ? payError
                : `✅ +${echoAdded} ECHO credited to your balance!`}
          </span>
          {(payStatus === 'done' || payStatus === 'error') && (
            <button
              onClick={() => { setPayStatus(null); setPayError(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: payStatus === 'done' ? '#00F300' : '#ff4d4d',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >×</button>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888', textAlign: 'center', fontFamily: 'Oxanium, sans-serif' }}>Loading…</p>
      ) : (
        <div className={styles.storeGrid}>
          {cards.map((product, idx) => (
            <div
              key={product.id}
              className={`${styles.storeCard} ${idx === cards.length - 1 && cards.length % 2 !== 0 ? styles.mostcard : ''}`}
            >
              {product.discount && (
                <div
                  className={styles.discount}
                  style={{ background: idx === cards.length - 1 ? '#009DFF' : '' }}
                >
                  <p>-{product.discount}%</p>
                </div>
              )}
              <div className={styles.productImage}>
                <img src={product.img} alt="" />
              </div>
              <div className={styles.productInfo}>
                <div style={{ padding: '0px 0px 10px 0px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <p className={styles.productTitle}>{product.echoLabel} ECHO</p>
                  <p className={styles.productPrice}>${product.priceLabel}</p>
                </div>
                <div className={styles.btncont}>
                  <button
                    className={styles.button}
                    onClick={() => handleBuy(product)}
                    disabled={buying === product.id}
                    style={buying === product.id ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  >
                    {buying === product.id ? '…' : 'Buy'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stripe Payment Modal */}
      {modal && stripePromise && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div style={{
            background: '#111',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 40px',
            width: '100%',
            maxWidth: '480px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ color: 'white', margin: 0, fontFamily: 'Oxanium, sans-serif' }}>
                Purchase {modal.echoAmount} ECHO
              </h3>
              <button
                onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '22px' }}
              >×</button>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret: modal.clientSecret }}>
              <CheckoutForm
                clientSecret={modal.clientSecret}
                amount={modal.amount}
                currency={modal.currency}
                echoAmount={modal.echoAmount}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setModal(null)}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayStore;

