/* ==========================================================================
   ConfirmDialog.jsx — replaces window.confirm with a branded, accessible
   dialog that states the consequence and names the action.
   Usage:
     const [confirm, confirmDialog] = useConfirm();
     if (!(await confirm({ title, description, confirmLabel, tone: "danger" }))) return;
     ...render {confirmDialog} once in the page.
   ========================================================================== */
import { useCallback, useRef, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { t } from "../../i18n";

export function useConfirm() {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setOptions(opts);
  }), []);

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  const dialog = (
    <Modal
      open={Boolean(options)}
      onClose={() => close(false)}
      size="sm"
      title={options?.title}
      description={options?.description}
      footer={<>
        <Button variant="secondary" onClick={() => close(false)}>{options?.cancelLabel || t("تراجع")}</Button>
        <Button variant={options?.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)}>{options?.confirmLabel || t("تأكيد")}</Button>
      </>}
    >
      {options?.body || null}
    </Modal>
  );

  return [confirm, dialog];
}
