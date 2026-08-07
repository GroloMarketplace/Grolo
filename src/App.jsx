import { Routes, Route } from "react-router-dom";
import PhoneFrame from "./components/PhoneFrame";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { FollowProvider } from "./context/FollowContext";
import { ReviewProvider } from "./context/ReviewContext";
import { OrderProvider } from "./context/OrderContext";
import { EventProvider } from "./context/EventContext";
import { PromotionProvider } from "./context/PromotionContext";
import { SavedProvider } from "./context/SavedContext";
import { RegrowProvider } from "./context/RegrowContext";
import { ProfileModeProvider } from "./context/ProfileModeContext";
import { AdvertisingProvider } from "./context/AdvertisingContext";
import { CartProvider } from "./context/CartContext";
import { SavedForLaterProvider } from "./context/SavedForLaterContext";
import { FoundingMemberProvider } from "./context/FoundingMemberContext";
import { MessageProvider } from "./context/MessageContext";
import { InventoryProvider } from "./context/InventoryContext";
import { PaymentMethodsProvider } from "./context/PaymentMethodsContext";
import { DeliveryAddressProvider } from "./context/DeliveryAddressContext";
import { SellerSettingsProvider } from "./context/SellerSettingsContext";
import { BuyerSettingsProvider } from "./context/BuyerSettingsContext";
import { BuyerTrustProvider } from "./context/BuyerTrustContext";
import { ListingProvider } from "./context/ListingContext";
import { PostProvider } from "./context/PostContext";
import { EngagementProvider } from "./context/EngagementContext";
import Feed, { Notifications } from "./pages/Feed";
import Search from "./pages/Search";
import Category from "./pages/Category";
import Featured from "./pages/Featured";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderTracking from "./pages/OrderTracking";
import Profit from "./pages/Profit";
import ShopHome from "./pages/ShopHome";
import BuyerProfile from "./pages/BuyerProfile";
import PublicProfile from "./pages/PublicProfile";
import ProductDetail from "./pages/ProductDetail";
import SignIn from "./pages/SignIn";
import AccountSettings from "./pages/AccountSettings";
import CreateListing from "./pages/CreateListing";
import Saved from "./pages/Saved";
import SellerProfile from "./pages/SellerProfile";
import CreatePost from "./pages/CreatePost";
import EditListing from "./pages/EditListing";
import StoreReviews from "./pages/StoreReviews";
import Analytics from "./pages/Analytics";
import Orders from "./pages/Orders";
import LeaveReview from "./pages/LeaveReview";
import ProductReviews from "./pages/ProductReviews";
import ShopOrders from "./pages/ShopOrders";
import ShopEvents from "./pages/ShopEvents";
import CreateEvent from "./pages/CreateEvent";
import CreatePromotion from "./pages/CreatePromotion";
import Promotions from "./pages/Promotions";
import CommunityImpact from "./pages/CommunityImpact";
import Comments from "./pages/Comments";
import EventDetail from "./pages/EventDetail";
import PostDetail from "./pages/PostDetail";
import Advertising from "./pages/Advertising";
import CreateAdvertisingAd from "./pages/CreateAdvertisingAd";
import Trading from "./pages/Trading";
import StoreCheckout from "./pages/StoreCheckout";
import DeliveryAddress from "./pages/DeliveryAddress";

export default function App() {
  return (
    <AuthProvider>
      <ProfileModeProvider>
      <FollowProvider>
        <OrderProvider>
        <EventProvider>
        <PromotionProvider>
        <SavedProvider>
        <RegrowProvider>
        <ReviewProvider>
        <AdvertisingProvider>
        <FoundingMemberProvider>
        <SavedForLaterProvider>
        <CartProvider>
        <MessageProvider>
        <InventoryProvider>
        <PaymentMethodsProvider>
        <SellerSettingsProvider>
        <BuyerSettingsProvider>
        <BuyerTrustProvider>
        <ListingProvider>
        <EngagementProvider>
        <PostProvider>
        <DeliveryAddressProvider>
        <Routes>
        <Route path="/signin" element={<PhoneFrame hideTabBar statusBarBackground="bg-[#E6DCCF]" backgroundColor="bg-[#E6DCCF]"><SignIn /></PhoneFrame>} />
        <Route path="/" element={<PhoneFrame><Feed /></PhoneFrame>} />
        <Route path="/notifications" element={<PhoneFrame><Notifications /></PhoneFrame>} />
        <Route path="/shop" element={<PhoneFrame><ShopHome /></PhoneFrame>} />
        <Route path="/seller-profile" element={<PhoneFrame><ShopHome /></PhoneFrame>} />
        <Route path="/profile" element={<PhoneFrame><BuyerProfile /></PhoneFrame>} />
        <Route path="/profile/:userId" element={<PhoneFrame><PublicProfile /></PhoneFrame>} />
        <Route path="/buyer-profile" element={<PhoneFrame><BuyerProfile /></PhoneFrame>} />
        <Route path="/my-shop/reviews" element={<PhoneFrame><StoreReviews /></PhoneFrame>} />
        <Route
          path="/my-shop/advertising"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <Advertising />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/my-shop/advertising/create"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <CreateAdvertisingAd />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/event/:eventId" element={<PhoneFrame><EventDetail /></PhoneFrame>} />
        <Route path="/post/:id" element={<PhoneFrame><PostDetail /></PhoneFrame>} />
        <Route
          path="/my-shop/events"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <ShopEvents />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/create-event"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/promotions/:sellerId" element={<PhoneFrame><Promotions /></PhoneFrame>} />
        <Route
          path="/create-promotion"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <CreatePromotion />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/community-impact" element={<PhoneFrame><CommunityImpact /></PhoneFrame>} />
        <Route path="/comments" element={<PhoneFrame hideTabBar><Comments /></PhoneFrame>} />
        <Route
          path="/my-shop/orders"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <ShopOrders />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/product/:id" element={<PhoneFrame><ProductDetail /></PhoneFrame>} />
        <Route path="/listing/:id" element={<PhoneFrame><ProductDetail /></PhoneFrame>} />
        <Route path="/product/:id/reviews" element={<PhoneFrame><ProductReviews /></PhoneFrame>} />
        <Route
          path="/orders"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/orders/:id" element={<PhoneFrame><OrderTracking /></PhoneFrame>} />
        <Route
          path="/leave-review/:productId"
          element={
            <PhoneFrame hideTabBar>
              <ProtectedRoute>
                <LeaveReview />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/seller/:sellerId" element={<PhoneFrame><SellerProfile /></PhoneFrame>} />
        <Route path="/category/:categoryName" element={<PhoneFrame><Category /></PhoneFrame>} />
        <Route path="/featured" element={<PhoneFrame><Featured /></PhoneFrame>} />
        <Route path="/trading" element={<PhoneFrame><Trading /></PhoneFrame>} />
        <Route path="/search" element={<PhoneFrame><Search /></PhoneFrame>} />
        <Route
          path="/messages"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/messages/:id"
          element={
            <PhoneFrame hideTabBar>
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/cart" element={<PhoneFrame><Cart /></PhoneFrame>} />
        <Route path="/checkout" element={<PhoneFrame><Checkout /></PhoneFrame>} />
        <Route path="/checkout/:sellerId" element={<PhoneFrame><StoreCheckout /></PhoneFrame>} />
        <Route path="/delivery-address" element={<PhoneFrame hideTabBar><DeliveryAddress /></PhoneFrame>} />
        <Route path="/order-confirmation" element={<PhoneFrame><OrderConfirmation /></PhoneFrame>} />
        <Route
          path="/profit"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <Profit />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/analytics"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/create-listing"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <CreateListing />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/edit-listing/:id"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <EditListing />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/create-post"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <CreatePost />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/saved"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <Saved />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/account-settings"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
      </Routes>
        </DeliveryAddressProvider>
        </PostProvider>
        </EngagementProvider>
        </ListingProvider>
        </BuyerTrustProvider>
        </BuyerSettingsProvider>
        </SellerSettingsProvider>
        </PaymentMethodsProvider>
        </InventoryProvider>
        </MessageProvider>
        </CartProvider>
        </SavedForLaterProvider>
        </FoundingMemberProvider>
        </AdvertisingProvider>
        </ReviewProvider>
        </RegrowProvider>
        </SavedProvider>
        </PromotionProvider>
        </EventProvider>
        </OrderProvider>
      </FollowProvider>
      </ProfileModeProvider>
    </AuthProvider>
  );
}
