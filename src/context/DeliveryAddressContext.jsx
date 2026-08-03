import { createContext, useContext, useState } from "react";

const DeliveryAddressContext = createContext(null);

export function DeliveryAddressProvider({ children }) {
  const [address, setAddress] = useState(null);
  return <DeliveryAddressContext.Provider value={{ address, saveAddress: setAddress }}>{children}</DeliveryAddressContext.Provider>;
}

export function useDeliveryAddress() {
  const context = useContext(DeliveryAddressContext);
  if (!context) throw new Error("useDeliveryAddress must be used within a DeliveryAddressProvider");
  return context;
}
