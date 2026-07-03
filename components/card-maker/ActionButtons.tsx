"use client";

type ActionButtonsProps = {
  mobile?: boolean;
  onRestart: () => void;
  onSubmit: () => void;
  onSave: () => void;
};

export function ActionButtons({ mobile = false, onRestart, onSubmit, onSave }: ActionButtonsProps) {
  if (mobile) {
    return (
      <div className="flex w-full items-start gap-4 pt-2">
        <button
          type="button"
          onClick={onRestart}
          className="h-[40px] flex-1 rounded-[12px] bg-[#f1f1f1] text-[16px] font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
        >
          Restart
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="h-[40px] flex-1 rounded-[12px] bg-[#ff661e] text-[16px] font-bold text-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-[40px] flex-1 rounded-[12px] bg-[#f1f1f1] text-[16px] font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="hidden w-full justify-between gap-6 lg:flex">
      <button
        type="button"
        onClick={onRestart}
        className="h-[50px] w-[130px] rounded-[12px] bg-[#f1f1f1] text-[33px] font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
      >
        <span className="relative -top-1 text-[0.54em]">Restart</span>
      </button>
      <button
        type="button"
        onClick={onSubmit}
        className="h-[50px] w-[130px] rounded-[12px] bg-[#ff661e] text-[33px] font-bold text-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
      >
        <span className="relative -top-1 text-[0.54em]">Submit</span>
      </button>
      <button
        type="button"
        onClick={onSave}
        className="h-[50px] w-[130px] rounded-[12px] bg-[#f1f1f1] text-[33px] font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
      >
        <span className="relative -top-1 text-[0.54em]">Save</span>
      </button>
    </div>
  );
}
