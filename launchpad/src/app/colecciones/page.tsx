import type { Metadata } from "next";
import { CollectionsClient } from "./collections-client";

export const metadata: Metadata = {
  title: "Colecciones",
  description: "Selecciones curadas de productos de la comunidad.",
};

export default function CollectionsPage() {
  return <CollectionsClient />;
}
