import React from "react";

export const Icon = ({ name, size = 18, stroke = 1.5, ...rest }) => {
  const paths = {
    arrow:    <path d="M5 12h14M13 5l7 7-7 7" />,
    chev:     <path d="M9 6l6 6-6 6" />,
    chevD:    <path d="M6 9l6 6 6-6" />,
    chevL:    <path d="M15 6l-6 6 6 6" />,
    close:    <path d="M6 6l12 12M18 6L6 18" />,
    check:    <path d="M5 12l4 4 10-10" />,
    plus:     <path d="M12 5v14M5 12h14" />,
    minus:    <path d="M5 12h14" />,
    search:   <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
    cal:      <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9h17M8 3v4M16 3v4" /></>,
    clock:    <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin:      <><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></>,
    user:     <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
    users:    <><circle cx="9" cy="9" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-5-5.5" /></>,
    bolt:     <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
    star:     <path d="M12 2.5l2.9 6 6.6.6-5 4.5 1.5 6.4L12 16.7 5.9 20l1.5-6.4-5-4.5 6.6-.6L12 2.5z" />,
    logout:   <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list:     <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    trash:    <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>,
    edit:     <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />,
    alert:    <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
    info:     <><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></>,
    shield:   <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name] || null}
    </svg>
  );
};
