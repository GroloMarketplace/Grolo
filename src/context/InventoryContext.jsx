import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const InventoryContext = createContext(null);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function listingFilter(id) {
  return UUID_PATTERN.test(String(id)) ? { column: "id", value: id } : { column: "legacy_id", value: id };
}

function normalizedQuantity(quantity) {
  return Number.isInteger(Number(quantity)) && Number(quantity) >= 0 ? Number(quantity) : 0;
}

function inventoryFromRows(rows) {
  return (rows ?? []).reduce((result, row) => {
    const quantity = normalizedQuantity(row.inventory_quantity);
    result[row.legacy_id ?? row.id] = quantity;
    if (row.legacy_id) result[row.id] = quantity;
    return result;
  }, {});
}

export function InventoryProvider({ children }) {
  const { user } = useAuth();
  const [inventory, setInventory] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      if (!isSupabaseConfigured) {
        setInventory({});
        return;
      }
      const { data, error } = await supabase
        .from("listings")
        .select("id, legacy_id, inventory_quantity");
      if (error) {
        console.error("Unable to load listing inventory", error);
        return;
      }
      if (!cancelled) setInventory(inventoryFromRows(data));
    }

    loadInventory();
    return () => { cancelled = true; };
  }, [user?.id]);

  const getAvailable = useCallback((listingId) => inventory[listingId] ?? 0, [inventory]);

  const updateListingQuantity = useCallback(async (listingId, quantity) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
    const normalized = normalizedQuantity(quantity);
    const filter = listingFilter(listingId);
    const { data, error } = await supabase
      .from("listings")
      .update({ inventory_quantity: normalized, updated_at: new Date().toISOString() })
      .eq(filter.column, filter.value)
      .select("id, legacy_id, inventory_quantity")
      .single();
    if (error) throw error;
    setInventory((current) => ({ ...current, ...inventoryFromRows([data]) }));
    return normalized;
  }, []);

  const updateAvailable = useCallback((listingId, quantity) => updateListingQuantity(listingId, quantity), [updateListingQuantity]);

  const reduceAvailable = useCallback(async (items, operationId) => {
    const operationKey = operationId ? `listing-inventory-reduction:${operationId}` : null;
    if (operationKey && window.sessionStorage.getItem(operationKey) === "done") return;
    if (operationKey) window.sessionStorage.setItem(operationKey, "done");

    for (const item of items) {
      const listingId = item.productId ?? item.id;
      const filter = listingFilter(listingId);
      const { data, error } = await supabase
        .from("listings")
        .select("id, legacy_id, inventory_quantity")
        .eq(filter.column, filter.value)
        .single();
      if (error) throw error;
      const quantityBefore = normalizedQuantity(data.inventory_quantity);
      const quantityRequested = Number(item.quantity) || 0;
      const quantityAfter = Math.max(0, quantityBefore - quantityRequested);
      console.warn("Inventory reduction", {
        operationId: operationId ?? null,
        listingId: data.legacy_id ?? data.id,
        quantityBefore,
        quantityRequested,
        quantityAfter,
      });
      await updateListingQuantity(data.legacy_id ?? data.id, quantityAfter);
    }
  }, [updateListingQuantity]);

  const restoreAvailable = useCallback(async (items) => {
    for (const item of items) {
      const listingId = item.productId ?? item.id;
      const filter = listingFilter(listingId);
      const { data, error } = await supabase
        .from("listings")
        .select("id, legacy_id, inventory_quantity")
        .eq(filter.column, filter.value)
        .single();
      if (error) throw error;
      await updateListingQuantity(data.legacy_id ?? data.id, normalizedQuantity(data.inventory_quantity) + (Number(item.quantity) || 0));
    }
  }, [updateListingQuantity]);

  const value = useMemo(
    () => ({ inventory, getAvailable, updateAvailable, reduceAvailable, restoreAvailable }),
    [inventory, getAvailable, updateAvailable, reduceAvailable, restoreAvailable],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within an InventoryProvider");
  return context;
}
