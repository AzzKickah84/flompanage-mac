export type AdminEmailType = "warning" | "info" | "notification";

export type AdminEmailPreset = {
  label: string;
  type: AdminEmailType;
  subject: string;
  message: string;
};

export const ADMIN_EMAIL_PRESETS: AdminEmailPreset[] = [
  {
    label: "Waarschuwing",
    type: "warning",
    subject: "Waarschuwing - Flomp.TV",
    message:
      "Beste gebruiker,\n\nJe ontvangt deze waarschuwing omdat je gedrag niet voldoet aan onze huisregels.\n\n[Beschrijf hier de reden]\n\nBij herhaaldelijk overtreden kan je account worden geblokkeerd.",
  },
  {
    label: "Aangepast bericht",
    type: "info",
    subject: "",
    message: "",
  },
  {
    label: "Algemene melding",
    type: "notification",
    subject: "Bericht van Flomp.TV",
    message: "",
  },
];

export const ADMIN_EMAIL_SENDER = "noreply@flompert.nl";
