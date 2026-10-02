"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isAddress } from "@/config/brand";

/** Small address form that validates 0x + 40 hex and navigates to `${base}/${address}`. */
export function AddressJump({ base, placeholder, cta, disabledNote }: { base: string; placeholder: string; cta: string; disabledNote?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const v = value.trim();
  const ok = isAddress(v);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (ok) router.push(`${base}/${v}`);
      }}
      className="grid grid-cols-1 gap-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-label={placeholder}
          className="field num min-w-0 flex-1 !text-[14px]"
        />
        <button type="submit" className="btn btn-ink shrink-0">
          {cta}
        </button>
      </div>
      {touched && v && !ok ? <p className="text-[13px] text-danger">Expected 0x followed by 40 hex characters.</p> : null}
      {disabledNote ? <p className="text-[13px] text-ink-3">{disabledNote}</p> : null}
    </form>
  );
}
