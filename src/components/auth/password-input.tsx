"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { fieldInputStyle } from "./auth-card";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  hasError?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  function PasswordInput({ hasError = false, style, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div style={{ position: "relative" }}>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          style={{
            ...fieldInputStyle(hasError),
            paddingRight: 40,
            ...(style ?? {}),
          }}
          {...rest}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
          style={{
            position: "absolute",
            top: "50%",
            right: 8,
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            color: "var(--c-text-dim)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            cursor: "pointer",
          }}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);
