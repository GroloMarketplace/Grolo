import { Routes, Route } from "react-router-dom";
import PhoneFrame from "./components/PhoneFrame";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { TrustSafetyProvider } from "./context/TrustSafetyContext";
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
import AppErrorBoundary from "./components/AppErrorBoundary";
import { EngagementProvider } from "./context/EngagementContext";
import Feed from "./pages/Feed";
import NotificationCenter from "./pages/NotificationCenter";
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
import Onboarding from "./pages/Onboarding";
import AccountSettings from "./pages/AccountSettings";
import OpenStore from "./pages/OpenStore";
import CreateListing from "./pages/CreateListing";
import Saved from "./pages/Saved";
import SellerProfile from "./pages/SellerProfile";
import CreatePost from "./pages/CreatePost";
import ProposeTrade from "./pages/ProposeTrade";
import EditListing from "./pages/EditListing";
import StoreReviews from "./pages/StoreReviews";
import Analytics from "./pages/Analytics";
import AdminModeration from "./pages/AdminModeration";
import AdminRoute from "./components/AdminRoute";
import Orders from "./pages/Orders";
import LeaveReview from "./pages/LeaveReview";
import ProductReviews from "./pages/ProductReviews";
import ShopOrders from "./pages/ShopOrders";
import ShopEvents from "./pages/ShopEvents";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
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
import GroloStatuses from "./pages/GroloStatuses";
import FoundingMember from "./pages/FoundingMember";
import TrustReputation from "./pages/TrustReputation";
import SuspendedAccount from "./pages/SuspendedAccount";

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
      <NotificationProvider>
      <TrustSafetyProvider>
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
        <ListingProvider>
        <CartProvider>
        <MessageProvider>
        <InventoryProvider>
        <PaymentMethodsProvider>
        <SellerSettingsProvider>
        <BuyerSettingsProvider>
        <BuyerTrustProvider>
        <EngagementProvider>
        <PostProvider>
        <DeliveryAddressProvider>
        <Routes>
        <Route path="/signin" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><SignIn /></PhoneFrame>} />
        <Route path="/signup" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><SignIn /></PhoneFrame>} />
        <Route path="/account-suspended" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><SuspendedAccount /></PhoneFrame>} />
        <Route path="/onboarding" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><ProtectedRoute><Onboarding /></ProtectedRoute></PhoneFrame>} />
        <Route path="/" element={<PhoneFrame><ProtectedRoute profileRequired><AppErrorBoundary label="Home Feed"><Feed /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/home" element={<PhoneFrame><ProtectedRoute profileRequired><AppErrorBoundary label="Home Feed"><Feed /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/notifications" element={<PhoneFrame><ProtectedRoute><AppErrorBoundary label="Notifications"><NotificationCenter /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/shop" element={<PhoneFrame><AppErrorBoundary label="Seller Profile"><ProtectedRoute sellerOnly><ShopHome /></ProtectedRoute></AppErrorBoundary></PhoneFrame>} />
        <Route path="/seller-profile" element={<PhoneFrame><AppErrorBoundary label="Seller Profile"><ProtectedRoute sellerOnly><ShopHome /></ProtectedRoute></AppErrorBoundary></PhoneFrame>} />
        <Route path="/profile" element={<PhoneFrame><AppErrorBoundary label="Buyer Profile"><BuyerProfile /></AppErrorBoundary></PhoneFrame>} />
        <Route path="/profile/:userId" element={<PhoneFrame><PublicProfile /></PhoneFrame>} />
        <Route path="/buyer-profile" element={<PhoneFrame><AppErrorBoundary label="Buyer Profile"><BuyerProfile /></AppErrorBoundary></PhoneFrame>} />
        <Route path="/my-shop/reviews" element={<PhoneFrame><StoreReviews /></PhoneFrame>} />
        <Route
          path="/my-shop/advertising"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <Advertising />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/my-shop/advertising/create"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <CreateAdvertisingAd />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/event/:eventId" element={<PhoneFrame><AppErrorBoundary label="Event"><EventDetail /></AppErrorBoundary></PhoneFrame>} />
        <Route path="/post/:id" element={<PhoneFrame><AppErrorBoundary label="Post"><PostDetail /></AppErrorBoundary></PhoneFrame>} />
        <Route
          path="/my-shop/events"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <ShopEvents />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/create-event"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <CreateEvent />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/edit-event/:eventId"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <AppErrorBoundary label="Edit Event">
                  <EditEvent />
                </AppErrorBoundary>
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/promotions/:sellerId" element={<PhoneFrame><AppErrorBoundary label="Promotions"><Promotions /></AppErrorBoundary></PhoneFrame>} />
        <Route
          path="/create-promotion"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <CreatePromotion />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/community-impact" element={<PhoneFrame><CommunityImpact /></PhoneFrame>} />
        <Route path="/grolo-statuses" element={<PhoneFrame><GroloStatuses /></PhoneFrame>} />
        <Route path="/founding-member/:memberId" element={<PhoneFrame><FoundingMember /></PhoneFrame>} />

        <Route path="/trust-reputation" element={<PhoneFrame><TrustReputation /></PhoneFrame>} />
        <Route path="/comments" element={<PhoneFrame hideTabBar><Comments /></PhoneFrame>} />
        <Route
          path="/my-shop/orders"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <ShopOrders />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/product/:id" element={<PhoneFrame><AppErrorBoundary label="Listings"><ProductDetail /></AppErrorBoundary></PhoneFrame>} />
        <Route path="/listing/:id" element={<PhoneFrame><AppErrorBoundary label="Listings"><ProductDetail /></AppErrorBoundary></PhoneFrame>} />
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
        <Route path="/seller/:sellerId" element={<PhoneFrame><AppErrorBoundary label="Seller Profile"><SellerProfile /></AppErrorBoundary></PhoneFrame>} />
        <Route path="/category/:categoryName" element={<PhoneFrame><Category /></PhoneFrame>} />
        <Route path="/featured" element={<PhoneFrame><Featured /></PhoneFrame>} />
        <Route path="/trading" element={<PhoneFrame><Trading /></PhoneFrame>} />
        <Route path="/search" element={<PhoneFrame><AppErrorBoundary label="Search"><Search /></AppErrorBoundary></PhoneFrame>} />
        <Route
          path="/messages"
          element={
            <PhoneFrame>
              <AppErrorBoundary label="Messages"><ProtectedRoute><Messages /></ProtectedRoute></AppErrorBoundary>
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
              <ProtectedRoute sellerOnly>
                <Profit />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/analytics"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <Analytics />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route path="/admin/moderation" element={<PhoneFrame><AdminRoute><AdminModeration /></AdminRoute></PhoneFrame>} />
        <Route
          path="/create-listing"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <CreateListing />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
        <Route
          path="/edit-listing/:id"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
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
          path="/propose-trade/:listingId"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <AppErrorBoundary label="Propose Trade">
                  <ProposeTrade />
                </AppErrorBoundary>
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
          path="/open-store"
          element={
            <PhoneFrame>
              <ProtectedRoute>
                <OpenStore />
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
        </BuyerTrustProvider>
        </BuyerSettingsProvider>
        </SellerSettingsProvider>
        </PaymentMethodsProvider>
        </InventoryProvider>
        </MessageProvider>
        </CartProvider>
        </ListingProvider>
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
      </TrustSafetyProvider>
      </NotificationProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
