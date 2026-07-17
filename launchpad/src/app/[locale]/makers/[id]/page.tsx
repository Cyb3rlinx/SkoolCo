import type { Metadata } from "next";
import { MakerProfileClient } from "./maker-profile-client";

interface Props {
  params: { id: string };
}

export const metadata: Metadata = { title: "Perfil de maker" };

export default function MakerProfilePage({ params }: Props) {
  return <MakerProfileClient id={params.id} />;
}
