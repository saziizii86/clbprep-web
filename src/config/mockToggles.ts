// src/config/mockToggles.ts
export const isSkipPopupDisabled = () => {
  // "temporary" toggle: enable/disable anytime without rebuilding
  return localStorage.getItem("disableNoAnswerPopup") === "1";
};
