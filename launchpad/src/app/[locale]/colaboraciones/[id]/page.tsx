import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { CollaborationDetailClient } from "./collaboration-detail-client";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collaboration = await prisma.collaboration
    .findUnique({ where: { id: params.id }, select: { title: true, description: true } })
    .catch(() => null);

  if (!collaboration) return { title: "Colaboración" };

  return { title: collaboration.title, description: collaboration.description };
}

export default function CollaborationDetailPage({ params }: Props) {
  return <CollaborationDetailClient id={params.id} />;
}
