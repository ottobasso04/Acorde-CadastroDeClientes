import { useCallback, useState } from "react";

export default function useFormErrors() {
  const [errors, setErrors] = useState({});

  const clearErrors = useCallback((keys) => {
    setErrors((current) => {
      if (!keys.some((key) => current[key])) return current;
      const next = { ...current };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  const field = useCallback(
    (key, setter) => (value) => {
      setter(value);
      clearErrors([key]);
    },
    [clearErrors]
  );

  return { errors, setErrors, clearErrors, field };
}
