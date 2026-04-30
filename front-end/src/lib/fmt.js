/* Formatters partagés */

export const fmt = {
  date:      (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
  dateShort: (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
  dateLong:  (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  time:      (d) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  timeRange: (s, e) => `${fmt.time(s)} – ${fmt.time(e)}`,
  duration:  (s, e) => {
    const m = Math.round((new Date(e) - new Date(s)) / 60000);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
  },
  euro:      (n) => `${n} €`,
  dayKey:    (d) => new Date(d).toISOString().slice(0, 10),
};

export const isFuture = (d) => new Date(d) > new Date();
export const isPast   = (d) => new Date(d) < new Date();
