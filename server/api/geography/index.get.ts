import { createError, defineEventHandler, getQuery } from "h3";
import { prisma } from "../../utils/prisma";

const delegates = {
  country: prisma.countries,
  region: prisma.regions,
  department: prisma.departments,
  municipality: prisma.municipalities,
} as const;

export default defineEventHandler(async (event) => {
  const type = String(getQuery(event).type || "");

  if (!Object.hasOwn(delegates, type)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Type géographique invalide.",
    });
  }

  const delegate = delegates[type as keyof typeof delegates];

  return {
    items: await delegate.findMany({
      take: 100,
      orderBy: { name: "asc" },
    }),
  };
});
