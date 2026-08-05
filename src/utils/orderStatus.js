const STATUS_COLORS = {
  "Seller Notified": "text-[#2563EB]",
  Preparing: "text-[#D97706]",
  "In Progress": "text-[#D97706]",
  "Ready for Pickup": "text-[#16A34A]",
  Completed: "text-[#16A34A]",
  Cancelled: "text-[#DC2626]",
};

export function getOrderStatusLabel(status) {
  return status ?? "Status unavailable";
}

export function getOrderStatusClass(status) {
  return STATUS_COLORS[status] ?? "text-[#4F4F4F]";
}
