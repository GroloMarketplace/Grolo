import { createContext, useContext, useState } from "react";
import { sellers } from "../data/mockData";

const PaymentMethodsContext = createContext(null);
const DEFAULT_METHODS = ["cash", "etransfer"];
const DEFAULT_FULFILLMENT = ["pickup"];

const initialSettings = Object.fromEntries(
  Object.values(sellers).map((seller) => [
    seller.id,
    {
      methods: seller.acceptedPaymentMethods ?? DEFAULT_METHODS,
      eTransferEmail: seller.eTransferEmail ?? `${seller.id}@grolo.local`,
      fulfillmentMethods: seller.fulfillmentMethods ?? DEFAULT_FULFILLMENT,
      deliveryFee: seller.deliveryFee ?? 0,
      deliveryRadius: seller.deliveryRadius ?? 0,
    },
  ]),
);

export function PaymentMethodsProvider({ children }) {
  const [settings, setSettings] = useState(initialSettings);
  const [fulfillmentMethod, setFulfillmentMethod] = useState("pickup");

  const getPaymentMethods = (sellerId) => settings[sellerId] ?? {
    methods: DEFAULT_METHODS,
    eTransferEmail: "",
    fulfillmentMethods: DEFAULT_FULFILLMENT,
    deliveryFee: 0,
    deliveryRadius: 0,
  };

  const updatePaymentMethods = (sellerId, methods) => {
    setSettings((current) => ({
      ...current,
      [sellerId]: { ...(current[sellerId] ?? getPaymentMethods(sellerId)), methods },
    }));
  };

  const updateFulfillment = (sellerId, fulfillmentMethods, deliveryFee, deliveryRadius) => {
    setSettings((current) => ({
      ...current,
      [sellerId]: {
        ...(current[sellerId] ?? getPaymentMethods(sellerId)),
        fulfillmentMethods,
        deliveryFee: Number(deliveryFee) || 0,
        deliveryRadius: Number(deliveryRadius) || 0,
      },
    }));
  };

  return (
    <PaymentMethodsContext.Provider value={{ getPaymentMethods, updatePaymentMethods, updateFulfillment, fulfillmentMethod, setFulfillmentMethod }}>
      {children}
    </PaymentMethodsContext.Provider>
  );
}

export function usePaymentMethods() {
  const context = useContext(PaymentMethodsContext);
  if (!context) throw new Error("usePaymentMethods must be used within a PaymentMethodsProvider");
  return context;
}
