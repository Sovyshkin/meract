
import api from "./api";

export const payApi = {
  getAll: async () => {
    const response = await api.get("/payment/transactions");
    return response.data;
  },
  getOne: async (id) => {
    const response = await api.get(`/payment/transactions/${id}`);
    return response.data;
  },
  sendEcho: async (data) => {
    const response = await api.post(`/payment/transfer-money`, data);
    return response.data;
  },

  // ─── Meract Shop ──────────────────────────────────────────────────────────────

  /** Получить список товаров магазина */
  shopProducts: async () => {
    const response = await api.get("/meract-shop/find-all");
    return response.data;
  },

  /**
   * Создать PaymentIntent для товара.
   * Возвращает { clientSecret, publishableKey, amount, currency, echoAmount }
   */
  shopBuy: async (productId) => {
    const response = await api.post(`/meract-shop/buy/${productId}`);
    return response.data;
  },

  /** Подтвердить оплату и зачислить ECHO (если webhook ещё не сработал) */
  shopConfirm: async (paymentIntentId) => {
    const response = await api.post('/meract-shop/confirm-payment', {
      paymentIntentId,
    });
    return response.data;
  },
};
