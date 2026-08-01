import { Routes, Route } from "react-router-dom";
import PhoneFrame from "./components/PhoneFrame";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { FollowProvider } from "./context/FollowContext";
import Feed from "./pages/Feed";
import Search from "./pages/Search";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Profit from "./pages/Profit";
import ShopHome from "./pages/ShopHome";
import ProductDetail from "./pages/ProductDetail";
import SignIn from "./pages/SignIn";
import AccountSettings from "./pages/AccountSettings";
import CreateListing from "./pages/CreateListing";
import Saved from "./pages/Saved";
import SellerProfile from "./pages/SellerProfile";
import CreatePost from "./pages/CreatePost";

export default function App() {
  return (
    <AuthProvider>
      <FollowProvider>
        <Routes>
        <Route path="/signin" element={<PhoneFrame hideTabBar statusBarBackground="bg-[#E6DCCF]" backgroundColor="bg-[#E6DCCF]"><SignIn /></PhoneFrame>} />
        <Route path="/" element={<PhoneFrame><Feed /></PhoneFrame>} />
        <Route path="/shop" element={<PhoneFrame><ShopHome /></PhoneFrame>} />
        <Route path="/product/:id" element={<PhoneFrame><ProductDetail /></PhoneFrame>} />
        <Route path="/product/:productId" element={<PhoneFrame><ProductDetail /></PhoneFrame>} />
        <Route path="/seller/:sellerId" element={<PhoneFrame><SellerProfile /></PhoneFrame>} />
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
        <Route path="/checkout" element={<PhoneFrame hideTabBar><Checkout /></PhoneFrame>} />
        <Route path="/order-confirmation" element={<PhoneFrame hideTabBar><OrderConfirmation /></PhoneFrame>} />
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
      </FollowProvider>
    </AuthProvider>
  );
}
