import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import PhoneFrame from "./components/PhoneFrame";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, readPendingVerificationEmail, useAuth } from "./context/AuthContext";
import { AuthPromptProvider } from "./context/AuthPromptContext";
import { authRouteDecision } from "./utils/authRouting";
import { ActivityProvider } from "./context/ActivityContext";
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
import NotificationSettings from "./pages/NotificationSettings";
import Search from "./pages/Search";
import Category from "./pages/Category";
import Featured from "./pages/Featured";
import Cart from "./pages/Cart";
import OrderTracking from "./pages/OrderTracking";
import Profit from "./pages/Profit";
import BuyerProfile from "./pages/BuyerProfile";
import PublicProfile from "./pages/PublicProfile";
import ProductDetail from "./pages/ProductDetail";
import SignIn from "./pages/SignIn";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail, { VerifyEmail } from "./pages/ConfirmEmail";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import TermsAcceptance from "./pages/TermsAcceptance";
import Onboarding from "./pages/Onboarding";
import AccountSettings from "./pages/AccountSettings";
import Saved from "./pages/Saved";
import SellerProfile from "./pages/SellerProfile";
import CreatePost from "./pages/CreatePost";
import ProposeTrade from "./pages/ProposeTrade";
import StoreReviews from "./pages/StoreReviews";
import StoreCategory from "./pages/StoreCategory";
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
import PromotionDetail from "./pages/PromotionDetail";
import CommunityImpact from "./pages/CommunityImpact";
import Comments from "./pages/Comments";
import EventDetail from "./pages/EventDetail";
import PostDetail from "./pages/PostDetail";
import Advertising from "./pages/Advertising";
import CreateAdvertisingAd from "./pages/CreateAdvertisingAd";
import Trading from "./pages/Trading";
import DeliveryAddress from "./pages/DeliveryAddress";
import GroloStatuses from "./pages/GroloStatuses";
import SellerStatuses from "./pages/SellerStatuses";
import FoundingMember from "./pages/FoundingMember";
import TrustReputation from "./pages/TrustReputation";
import SuspendedAccount from "./pages/SuspendedAccount";
import BlockedUsers from "./pages/BlockedUsers";

const Messages = lazy(() => import("./pages/Messages"));
const Chat = lazy(() => import("./pages/Chat"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const ShopHome = lazy(() => import("./pages/ShopHome"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AdminModeration = lazy(() => import("./pages/AdminModeration"));
const StoreCheckout = lazy(() => import("./pages/StoreCheckout"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const EditListing = lazy(() => import("./pages/EditListing"));
const OpenStore = lazy(() => import("./pages/OpenStore"));

function AuthStartupGate({ children }) {
  const { authInitialized, loading, session, emailVerified, profileStatus, onboardingComplete, acceptedTerms } = useAuth();
  const location = useLocation();
  const { pathname } = location;
  const pendingVerificationEmail = readPendingVerificationEmail();
  const routeDecision = authRouteDecision({
    authInitialized,
    loading,
    session,
    emailVerified,
    profileStatus,
    onboardingComplete,
    acceptedTerms,
    pathname,
    pendingVerificationEmail,
    allowSignup: location.state?.allowSignup === true,
  });

  useEffect(() => {
    console.info("[AuthDiagnostics]", {
      authInitializationComplete: authInitialized,
      sessionPresent: Boolean(session),
      emailVerified,
      currentRoute: pathname,
      redirectDecision: routeDecision.decision,
    });
  }, [authInitialized, emailVerified, pathname, routeDecision.decision, session]);

  if (routeDecision.waiting) return <div className="flex h-full min-h-[100svh] items-center justify-center text-[14px] text-[#777]">Loading...</div>;
  if (routeDecision.redirectTo) return <Navigate to={routeDecision.redirectTo} replace />;
  return children;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
      <AuthPromptProvider>
      <ActivityProvider>
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
        <BuyerSettingsProvider>
        <SellerSettingsProvider>
        <BuyerTrustProvider>
        <EngagementProvider>
        <PostProvider>
        <DeliveryAddressProvider>
        <Suspense fallback={<div className="flex h-full items-center justify-center text-[14px] text-[#777]">Loading…</div>}>
        <AuthStartupGate>
        <Routes>
        <Route path="/signin" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><SignIn /></PhoneFrame>} />
        <Route path="/signup" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><SignIn /></PhoneFrame>} />
        <Route path="/reset-password" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><ResetPassword /></PhoneFrame>} />
        <Route path="/confirm-email" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><ConfirmEmail /></PhoneFrame>} />
        <Route path="/verify-email" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><ProtectedRoute allowUnverified><VerifyEmail /></ProtectedRoute></PhoneFrame>} />
        <Route path="/terms" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><Terms /></PhoneFrame>} />
        <Route path="/privacy" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><Privacy /></PhoneFrame>} />
        <Route path="/community-guidelines" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><CommunityGuidelines /></PhoneFrame>} />
        <Route path="/terms-acceptance" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><ProtectedRoute allowUnverified><TermsAcceptance /></ProtectedRoute></PhoneFrame>} />
        <Route path="/account-suspended" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><SuspendedAccount /></PhoneFrame>} />
        <Route path="/blocked-users" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><ProtectedRoute><BlockedUsers /></ProtectedRoute></PhoneFrame>} />
        <Route path="/onboarding" element={<PhoneFrame hideTabBar backgroundColor="bg-white"><ProtectedRoute><Onboarding /></ProtectedRoute></PhoneFrame>} />
        <Route path="/" element={<PhoneFrame key="home"><ProtectedRoute profileRequired allowGuest><AppErrorBoundary label="Home Feed"><Feed /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/home" element={<PhoneFrame key="home"><ProtectedRoute profileRequired allowGuest><AppErrorBoundary label="Home Feed"><Feed /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/notifications" element={<PhoneFrame><ProtectedRoute><AppErrorBoundary label="Notifications"><NotificationCenter /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/notification-settings" element={<PhoneFrame><ProtectedRoute><AppErrorBoundary label="Notification Settings"><NotificationSettings /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/shop" element={<PhoneFrame><AppErrorBoundary label="Seller Profile"><ProtectedRoute sellerOnly><ShopHome /></ProtectedRoute></AppErrorBoundary></PhoneFrame>} />
        <Route path="/seller-profile" element={<PhoneFrame><AppErrorBoundary label="Seller Profile"><ProtectedRoute sellerOnly><ShopHome /></ProtectedRoute></AppErrorBoundary></PhoneFrame>} />
        <Route path="/profile" element={<PhoneFrame><ProtectedRoute><AppErrorBoundary label="Buyer Profile"><BuyerProfile /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/profile/:userId" element={<PhoneFrame><PublicProfile /></PhoneFrame>} />
        <Route path="/buyer-profile" element={<PhoneFrame><ProtectedRoute><AppErrorBoundary label="Buyer Profile"><BuyerProfile /></AppErrorBoundary></ProtectedRoute></PhoneFrame>} />
        <Route path="/my-shop/reviews" element={<PhoneFrame><ProtectedRoute sellerOnly><StoreReviews /></ProtectedRoute></PhoneFrame>} />
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
        <Route path="/promotion/:promotionId" element={<PhoneFrame><AppErrorBoundary label="Promotion Detail"><PromotionDetail /></AppErrorBoundary></PhoneFrame>} />
        <Route path="/promotions/:sellerId" element={<PhoneFrame><AppErrorBoundary label="Promotions"><Promotions /></AppErrorBoundary></PhoneFrame>} />
        <Route
          path="/edit-promotion/:promotionId"
          element={
            <PhoneFrame>
              <ProtectedRoute sellerOnly>
                <CreatePromotion />
              </ProtectedRoute>
            </PhoneFrame>
          }
        />
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
        <Route path="/seller-statuses" element={<PhoneFrame><SellerStatuses /></PhoneFrame>} />
        <Route path="/founding-member/:memberId" element={<PhoneFrame><FoundingMember /></PhoneFrame>} />

        <Route path="/trust-reputation" element={<PhoneFrame><ProtectedRoute><TrustReputation /></ProtectedRoute></PhoneFrame>} />
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
        <Route path="/orders/:id" element={<PhoneFrame><ProtectedRoute><OrderTracking /></ProtectedRoute></PhoneFrame>} />
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
        <Route path="/seller/:sellerId/category/:categoryName" element={<PhoneFrame><StoreCategory /></PhoneFrame>} />
        <Route path="/category/:categoryName" element={<PhoneFrame><Category /></PhoneFrame>} />
        <Route path="/featured" element={<PhoneFrame><Featured /></PhoneFrame>} />
        <Route path="/trading" element={<PhoneFrame><ProtectedRoute><Trading /></ProtectedRoute></PhoneFrame>} />
        <Route path="/search" element={<PhoneFrame key="search"><AppErrorBoundary label="Search"><Search /></AppErrorBoundary></PhoneFrame>} />
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
        <Route path="/checkout" element={<PhoneFrame><ProtectedRoute><Checkout /></ProtectedRoute></PhoneFrame>} />
        <Route path="/checkout/:sellerId" element={<PhoneFrame><ProtectedRoute><StoreCheckout /></ProtectedRoute></PhoneFrame>} />
        <Route path="/delivery-address" element={<PhoneFrame hideTabBar><ProtectedRoute><DeliveryAddress /></ProtectedRoute></PhoneFrame>} />
        <Route path="/order-confirmation" element={<PhoneFrame key="order-confirmation"><ProtectedRoute><OrderConfirmation /></ProtectedRoute></PhoneFrame>} />
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
        </AuthStartupGate>
        </Suspense>
        </DeliveryAddressProvider>
        </PostProvider>
        </EngagementProvider>
        </BuyerTrustProvider>
        </SellerSettingsProvider>
        </BuyerSettingsProvider>
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
      </ActivityProvider>
      </AuthPromptProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
