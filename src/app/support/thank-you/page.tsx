import type { Metadata } from "next";
import { ThankYouClient } from "./thank-you-client";

export const metadata: Metadata = {
  title: "Thank You — Govroll",
};

export default function ThankYouPage() {
  return <ThankYouClient />;
}
