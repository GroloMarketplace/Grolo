import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { sellers } from "../data/mockData";
import { useSavedForLater } from "../context/SavedForLaterContext";
import { useInventory } from "../context/InventoryContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useListings } from "../context/ListingContext";
import MobileScreenLayout from "../components/MobileScreenLayout";
import OutlineIcon from "../components/OutlineIcon";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItems: removeCartItems, restoreItems, addToCart } = useCart();
  const { items: savedForLaterItems, addItems, removeItems: removeSavedForLater } = useSavedForLater();
  const { listings } = useListings();
  const [undoItem, setUndoItem] = useState(null);
  const undoTimeout = useRef(null);
  const scrollRef = useRef(null);
  const savedCartState = readNavigationState("cart", { scrollTop: 0 });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedCartState.scrollTop;
    const scrollElement = scrollRef.current;
    const saveState = () => writeNavigationState("cart", { scrollTop: scrollElement?.scrollTop ?? 0 });
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, []);
  const removeCartItem = (item) => {
    removeCartItems([item]);
    setUndoItem(item);
    window.clearTimeout(undoTimeout.current);
    undoTimeout.current = window.setTimeout(() => setUndoItem(null), 4000);
  };
  const undoRemove = () => {
    if (!undoItem) return;
    restoreItems([undoItem]);
    setUndoItem(null);
    window.clearTimeout(undoTimeout.current);
  };
  const { getAvailable } = useInventory();
  const getListingId = (item) => item.productId
    ?? item.listingId
    ?? listings.find((listing) => listing.id === item.id || listing.name === item.name)?.id
    ?? item.id;
  const getRealInventory = (item) => {
    const productId = getListingId(item);
    return { available: Math.max(0, Number(getAvailable(productId)) || 0), source: "InventoryContext.getAvailable" };
  };
  const moveToCart = (item) => {
    const productId = getListingId(item);
    const { available, source } = getRealInventory(item);
    const decision = available > 0 ? "Move to Active Cart Items" : "Keep in Temporarily Sold Out";
    console.info("Move to Cart inventory check", {
      productName: item.name,
      listingId: productId,
      quantityAvailable: available,
      inventorySource: source,
      decision,
    });
    if (available <= 0) {
      restoreItems([item]);
    } else {
      addToCart(item, Math.min(item.quantity, available), available);
    }
    removeSavedForLater([item]);
  };
  const { getSellerProfile } = useSellerSettings();
  const inventoryStatus = items.map((item) => {
    const { available, source } = getRealInventory(item);
    const inStock = available > 0;
    console.info("Cart inventory check", {
      productName: item.name,
      quantityAvailable: available,
      quantityInCart: item.quantity,
      inventorySource: source,
      inStock,
    });
    return { item, available, inStock };
  });
  const activeItems = inventoryStatus.filter(({ inStock }) => inStock).map(({ item }) => item);
  const soldOutItems = inventoryStatus.filter(({ inStock }) => !inStock).map(({ item, available }) => ({ item, available }));
  const savedForLaterStatus = savedForLaterItems.map((item) => ({ item, available: getRealInventory(item).available }));
  const savedForLaterActiveItems = savedForLaterStatus.filter(({ available }) => available > 0).map(({ item }) => item);
  const savedForLaterSoldOutItems = savedForLaterStatus.filter(({ available }) => available <= 0);
  const activeTotalQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const activeSubtotal = activeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const canCheckout = activeItems.length > 0;
  const storeGroups = Object.values(activeItems.reduce((groups, item) => {
    const sellerId = item.sellerId ?? "sarahs-backyard";
    if (!groups[sellerId]) groups[sellerId] = [];
    groups[sellerId].push(item);
    return groups;
  }, {}));

  useEffect(() => {
    inventoryStatus.forEach(({ item, available, inStock }) => {
      console.info("Move to Cart destination", {
        productName: item.name,
        listingId: item.productId ?? item.id,
        quantityAvailable: available,
        decision: inStock ? "Move to Active Cart Items" : "Keep in Temporarily Sold Out",
        destinationSection: inStock ? "Active Cart Items" : "Temporarily Sold Out",
      });
    });
  }, [items, getAvailable]);

  return (
    <MobileScreenLayout>
      <div className="shrink-0">
        <div className="flex h-14 items-center justify-center border-b border-[#E6E6E6]"><span className="text-[17px] font-semibold">Cart</span></div>
        <div className="flex flex-col gap-2 border-b border-[#E6E6E6] px-4 py-4">
          <Row label={`${activeTotalQuantity} Items`} value={`${storeGroups.length} Stores`} />
          <Row label="Subtotal" value={`$${activeSubtotal.toFixed(2)}`} />
        </div>
        <div className="px-4 py-4">
          {canCheckout ? <Link to="/checkout" className="block w-full rounded-lg bg-[#498467] py-3.5 text-center text-[16px] font-medium text-white">Proceed to Checkout</Link> : <div className="w-full rounded-lg bg-[#E6E6E6] py-3.5 text-center text-[16px] font-medium text-[#757575]">Checkout unavailable</div>}
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <CartSection title="Active Cart Items">
          {Object.entries(activeItems.reduce((groups, item) => {
            const sellerId = item.sellerId ?? "sarahs-backyard";
            if (!groups[sellerId]) groups[sellerId] = [];
            groups[sellerId].push(item);
            return groups;
          }, {})).map(([sellerId, storeItems]) => (
            <div key={sellerId} className="rounded-lg border border-[#E6E6E6] p-3">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => navigate(`/seller/${sellerId}`)} className="text-left text-[14px] font-normal text-[#498467]">{sellers[sellerId]?.name ?? "Local Store"}</button>
                {getSellerProfile(sellerId)?.vacationMode && <span className="text-[11px] font-medium text-[#4F4F4F]">Temporarily Closed</span>}
                <button type="button" onClick={() => navigate(`/seller/${sellerId}`)} className="text-[14px] font-normal text-[#498467]">View Store <span aria-hidden="true" className="text-[16px] text-[#498467]">›</span></button>
              </div>
              {getSellerProfile(sellerId)?.vacationMode && <div className="mt-3 rounded-lg bg-[#F5FFF6] p-3 text-[13px] text-[#4F4F4F]">This store is temporarily not accepting orders.</div>}
              <div className="mt-3 text-[12px] font-medium">ITEMS</div>
              <div className="mt-3 flex flex-col gap-4">{storeItems.map((item) => <CartItem key={item.id} item={item} updateQuantity={updateQuantity} removeItem={() => removeCartItem(item)} saveForLater={() => { addItems([item]); removeCartItems([item]); }} available={getRealInventory(item).available} sectionName="Active Cart Items" navigate={navigate} />)}</div>
            </div>
          ))}
        </CartSection>
        {(soldOutItems.length > 0 || savedForLaterSoldOutItems.length > 0) && (
          <CartSection title="Temporarily Sold Out">
            {soldOutItems.map(({ item }) => (
              <SwipeToDelete key={item.id} onDelete={() => removeCartItem(item)} className="rounded-lg border border-[#E6E6E6]">
                <div className="flex gap-3 p-3" role="link" tabIndex="0" onClick={(event) => { if (!event.target.closest("button")) navigate(`/product/${item.productId ?? item.id}`); }} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) navigate(`/product/${item.productId ?? item.id}`); }}>
                  <img src={item.image} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="text-[14px] font-medium">{item.name}</div>
                    <p className="mt-1 text-[13px] text-[#828282]">This item is currently unavailable.</p>
                    <div className="mt-1 text-[12px] text-[#828282]">Listing Inventory: {getRealInventory(item).available}</div>
                    <div className="mt-1 text-[12px] text-[#828282]">Current Section: Temporarily Sold Out</div>
                    <div className="mt-3 flex gap-3">
                      <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); removeCartItem(item); }} className="text-[12px] font-medium text-[#B42318]">Remove Item</button>
                      <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); navigate(`/product/${item.productId ?? item.id}`); }} className="text-[12px] font-medium text-[#498467]">View Listing</button>
                    </div>
                  </div>
                </div>
              </SwipeToDelete>
            ))}
            {savedForLaterSoldOutItems.map(({ item, available }) => (
              <SavedForLaterCard
                key={`sold-out-${item.id}`}
                item={item}
                available={available}
                onMove={() => {}}
                onRemove={() => removeSavedForLater([item])}
                onViewListing={() => navigate(`/product/${item.productId ?? item.id}`)}
                navigate={navigate}
                sectionName="Temporarily Sold Out"
              />
            ))}
          </CartSection>
        )}
        <CartSection title="Saved For Later">
          {savedForLaterActiveItems.length ? savedForLaterActiveItems.map((item) => (
            <SavedForLaterCard
              key={item.id}
              item={item}
              available={getRealInventory(item).available}
              onMove={() => moveToCart(item)}
              onRemove={() => removeSavedForLater([item])}
              onViewListing={() => navigate(`/product/${item.productId ?? item.id}`)}
              navigate={navigate}
              sectionName="Saved For Later"
            />
          )) : <p className="rounded-lg border border-[#E6E6E6] p-3 text-[13px] text-[#828282]">Items you move here will appear here.</p>}
        </CartSection>
      </div>
      {undoItem && (
        <div className="absolute bottom-[76px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#1E1E1E] px-4 py-2 text-[13px] font-medium text-white shadow-lg">
          <span>Item removed from cart</span>
          <button type="button" onClick={undoRemove} className="font-semibold text-[#A7D7B8]">Undo</button>
        </div>
      )}
    </MobileScreenLayout>
  );
}

function CartSection({ title, children }) {
  return (
    <section className="border-b border-black/5 px-4 py-4">
      <h2 className="mb-3 text-[16px] font-semibold">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function SavedForLaterCard({ item, available, onMove, onRemove, onViewListing, navigate, sectionName }) {
  const canMoveToCart = available > 0;
  const productPath = `/product/${item.productId ?? item.id}`;

  return (
    <div role="link" tabIndex="0" className="flex cursor-pointer gap-3 rounded-lg border border-[#E6E6E6] p-3" onClick={(event) => { if (!event.target.closest("button")) navigate(productPath); }} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) navigate(productPath); }}>
      <img src={item.image} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium">{item.name}</div>
        <div className="mt-1 text-[13px] text-[#828282]">${item.price.toFixed(2)}</div>
        <div className="mt-1 text-[12px] text-[#828282]">Listing Inventory: {available}</div>
        <div className="mt-1 text-[12px] text-[#828282]">Current Section: {sectionName}</div>
        {!canMoveToCart && <p className="mt-2 text-[12px] text-[#828282]">Still Sold Out</p>}
        <div className="mt-3 flex flex-wrap gap-3">
          {canMoveToCart ? (
            <button type="button" onClick={onMove} className="text-[12px] font-medium text-[#498467]">Move to Cart</button>
          ) : (
            <button type="button" onClick={onViewListing} className="text-[12px] font-medium text-[#498467]">View Listing</button>
          )}
          <button type="button" onClick={onRemove} className="text-[12px] font-medium text-[#B42318]">Remove</button>
        </div>
      </div>
    </div>
  );
}

function CartItem({ item, updateQuantity, removeItem, saveForLater, available, sectionName, navigate }) {
  return (
    <SwipeToDelete onDelete={removeItem}>
      <div role="link" tabIndex="0" className="flex gap-3 cursor-pointer" onClick={(event) => { if (!event.target.closest("button")) navigate(`/product/${item.productId ?? item.id}`); }} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) navigate(`/product/${item.productId ?? item.id}`); }}>
        <img src={item.image} alt={item.name} className="h-[84px] w-[84px] rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-black/50">{item.description}</div>
          <div className="text-[14px]">{item.name}</div>
          <div className="mt-1 text-[12px] text-[#828282]">Listing Inventory: {available}</div>
          <div className="mt-1 text-[12px] text-[#828282]">Current Section: {sectionName}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[12px] text-black/50">Quantity</span>
            <button type="button" aria-label={`Decrease quantity of ${item.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, -1, Number(available)); }} disabled={item.quantity <= 1} className="flex h-7 w-7 items-center justify-center rounded border border-[#E6E6E6] text-[16px] disabled:opacity-40">−</button>
            <span className="min-w-5 text-center text-[14px]">{item.quantity}</span>
            <button type="button" aria-label={`Increase quantity of ${item.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, 1, Number(available)); }} disabled={item.quantity >= Number(available)} className="flex h-7 w-7 items-center justify-center rounded border border-[#498467] text-[#498467] disabled:opacity-40">+</button>
            <button type="button" aria-label={`Remove ${item.name} from cart`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); removeItem(); }} className="ml-1 flex h-7 w-7 items-center justify-center text-[#B42318]" title="Remove item">
              <OutlineIcon name="trash" size={18} />
            </button>
          </div>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); saveForLater(); }} className="mt-2 text-[12px] font-medium text-[#498467]">Save for Later</button>
        </div>
        <div className="shrink-0 text-[14px]">${item.price.toFixed(2)}</div>
      </div>
    </SwipeToDelete>
  );
}

function SwipeToDelete({ children, onDelete, className = "" }) {
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(null);
  const startOffset = useRef(0);
  const deleteWidth = 88;

  const handlePointerDown = (event) => {
    startX.current = event.clientX;
    startOffset.current = offset;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (startX.current === null || removing) return;
    const nextOffset = Math.min(0, Math.max(-deleteWidth, startOffset.current + event.clientX - startX.current));
    setOffset(nextOffset);
  };

  const handlePointerUp = () => {
    if (startX.current === null) return;
    setOffset(offset < -deleteWidth / 2 ? -deleteWidth : 0);
    startX.current = null;
  };

  const handleDelete = () => {
    if (removing) return;
    setRemoving(true);
    onDelete();
  };

  return (
    <div className={`relative overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${removing ? "opacity-0" : ""} ${className}`} style={{ maxHeight: removing ? 0 : 300 }}>
      <button type="button" onClick={handleDelete} aria-label="Delete item" className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center gap-1 bg-[#B42318] text-[13px] font-medium text-white">
        <OutlineIcon name="trash" size={17} />
        Delete
      </button>
      <div
        className="relative bg-white transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${removing ? -deleteWidth : offset}px)`, touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }) { return <div className="flex justify-between"><span className="text-[14px]">{label}</span><span className="text-[14px]">{value}</span></div>; }
