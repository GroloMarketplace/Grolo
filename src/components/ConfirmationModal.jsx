export default function ConfirmationModal({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <section className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-2xl">
        <h2 id="confirmation-title" className="text-[20px] font-semibold">{title}</h2>
        <p className="mt-3 text-[14px] leading-[150%] text-[#4F4F4F]">{message}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Cancel</button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 py-3 text-[14px] font-medium text-white">{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
