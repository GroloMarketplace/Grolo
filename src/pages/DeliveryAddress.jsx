import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useDeliveryAddress } from "../context/DeliveryAddressContext";
import { validateAddress } from "../utils/validation";

const FIELDS = [
  ["fullName", "Full Name", "e.g. Remi Smith"],
  ["streetAddress", "Street Address", "123 Main Street NW"],
  ["unit", "Apartment / Unit (optional)", "Unit 4"],
  ["city", "City", "Calgary"],
  ["province", "Province", "AB"],
  ["postalCode", "Postal Code", "T2N 1A1"],
];

export default function DeliveryAddress() {
  const navigate = useNavigate();
  const { address, saveAddress } = useDeliveryAddress();
  const [form, setForm] = useState(address ?? { fullName: "", streetAddress: "", unit: "", city: "", province: "", postalCode: "", notes: "" });
  const [error, setError] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const validationError = validateAddress(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    saveAddress({ ...form, province: form.province.trim().toUpperCase(), postalCode: form.postalCode.trim().toUpperCase().replace(/\s+/g, " ") });
    navigate(-1);
  };

  return <MobileScreenLayout><Header title="Delivery Address" onBack={() => navigate(-1)} /><div className="flex-1 overflow-y-auto no-scrollbar"><form onSubmit={submit} className="flex flex-col gap-4 px-4 py-5">{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}{FIELDS.map(([field, label, placeholder]) => <label key={field} className="text-[14px] font-medium">{label}<input required={field !== "unit"} value={form[field]} onChange={(event) => update(field, event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-[#E6E6E6] px-3 py-3 font-normal outline-none focus:border-[#498467]" /></label>)}<label className="text-[14px] font-medium">Delivery Notes (optional)<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Leave at front door" rows="3" className="mt-1 w-full resize-none rounded-lg border border-[#E6E6E6] px-3 py-3 font-normal outline-none focus:border-[#498467]" /></label><button type="submit" className="mt-2 w-full rounded-lg bg-[#498467] py-3.5 text-[16px] font-medium text-white">Save Address</button></form></div></MobileScreenLayout>;
}
