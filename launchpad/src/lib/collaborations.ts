export const collaborationSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} as const;
