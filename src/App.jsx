import { Routes, Route } from "react-router-dom";
import PhoneFrame from "./components/PhoneFrame";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import Feed from "./pages/Feed";
import Search from "./pages/Search";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Cart from "./pages/Cart";
import Profit from "./pages/Profit";
import ShopHome from "./pages/ShopHome";
import ProductDetail from "./pages/ProductDetail";
import SignIn from "./pages/SignIn";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<PhoneFrame hideTabBar><SignIn /></PhoneFrame>} />
        <Route path="/" element={<PhoneFrame><Feed /></PhoneFrame>} />
        <Route path="/shop" element={<PhoneFrame><ShopHome /></PhoneFrame>} />
        <Route path="/product/:id" element={<PhoneFrame><ProductDetail /></PhoneFrame>} />
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
      </Routes>
    </AuthProvider>
  );
}
