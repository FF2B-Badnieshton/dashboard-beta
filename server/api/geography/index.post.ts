import { createError, defineEventHandler, readBody } from "h3";
import { prisma } from "../../utils/prisma";

type GeoBody = {
  type: "country" | "region" | "department" | "municipality";
  name: string;
  code: string;
  insee_code?: string;
  zip_codes?: string[];
  department_code?: string;
  region_code?: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<GeoBody>(event);

  if (
    !body ||
    !["country", "region", "department", "municipality"].includes(body.type) ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.code !== "string" ||
    !body.code.trim()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données géographiques invalides.",
    });
  }

  const name = body.name.trim();
  const code = body.code.trim().toUpperCase();

  try {
    if (body.type === "country") {
      const existing = await prisma.countries.findFirst({
        where: { code },
      });

      if (existing) {
        throw createError({
          statusCode: 409,
          statusMessage: "Ce code pays existe déjà.",
        });
      }

      await prisma.countries.create({
        data: { name, code },
      });

      return { message: "Pays ajouté avec succès." };
    }

    // Pour le référentiel français, on rattache les territoires à la France.
    // Adapte "FR" si ton référentiel utilise un autre code pays.
    const country = await prisma.countries.findFirst({
      where: { code: "FR" },
    });

    if (!country) {
      throw createError({
        statusCode: 400,
        statusMessage: "Ajoute d'abord le pays France (code FR).",
      });
    }

    if (body.type === "region") {
      const existing = await prisma.regions.findFirst({
        where: { code },
      });

      if (existing) {
        return { message: "Cette région existe déjà." };
      }

      await prisma.regions.create({
        data: {
          name,
          code,
          country_id: country.id,
        },
      });

      return { message: "Région ajoutée avec succès." };
    }

    const regionCode = body.type === "region" ? code : body.region_code;

    let region = regionCode
      ? await prisma.regions.findFirst({
          where: { code: regionCode },
        })
      : null;

    // Une commune ou un département peut être importé avant sa région.
    if (!region && regionCode) {
      const regionData = await $fetch<{
        nom: string;
        code: string;
      }>(`https://geo.api.gouv.fr/regions/${encodeURIComponent(regionCode)}`);

      region = await prisma.regions.create({
        data: {
          name: regionData.nom,
          code: regionData.code,
          country_id: country.id,
        },
      });
    }

    if (!region) {
      throw createError({
        statusCode: 400,
        statusMessage: "Impossible de déterminer la région.",
      });
    }

    if (body.type === "department") {
      const existing = await prisma.departments.findFirst({
        where: { code },
      });

      if (existing) {
        return { message: "Ce département existe déjà." };
      }

      await prisma.departments.create({
        data: {
          name,
          code,
          region_id: region.id,
        },
      });

      return { message: "Département ajouté avec succès." };
    }

    const inseeCode = body.insee_code?.trim() || code;

    const departmentCode = body.department_code;
    let department = departmentCode
      ? await prisma.departments.findFirst({
          where: { code: departmentCode },
        })
      : null;

    if (!department && departmentCode) {
      const departmentData = await $fetch<{
        nom: string;
        code: string;
        codeRegion: string;
      }>(
        `https://geo.api.gouv.fr/departements/${encodeURIComponent(departmentCode)}`,
      );

      let departmentRegion = await prisma.regions.findFirst({
        where: { code: departmentData.codeRegion },
      });

      if (!departmentRegion) {
        const regionData = await $fetch<{
          nom: string;
          code: string;
        }>(
          `https://geo.api.gouv.fr/regions/${encodeURIComponent(departmentData.codeRegion)}`,
        );

        departmentRegion = await prisma.regions.create({
          data: {
            name: regionData.nom,
            code: regionData.code,
            country_id: country.id,
          },
        });
      }

      department = await prisma.departments.create({
        data: {
          name: departmentData.nom,
          code: departmentData.code,
          region_id: departmentRegion.id,
        },
      });
    }

    if (!department) {
      throw createError({
        statusCode: 400,
        statusMessage: "Impossible de déterminer le département.",
      });
    }

    const existingMunicipality = await prisma.municipalities.findFirst({
      where: { insee_code: inseeCode },
    });

    if (existingMunicipality) {
      return { message: "Cette commune existe déjà." };
    }

    await prisma.municipalities.create({
      data: {
        name,
        insee_code: inseeCode,
        zip_code: body.zip_codes?.[0] ?? null,
        departement_id: department.id,
        development_status : 'A ADAPTER (JE LE GERE MAIS PAS TROP)',
      },
    });

    return { message: "Commune ajoutée avec succès." };
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    console.error("Geography endpoint error:", error);

    throw createError({
      statusCode: 500,
      statusMessage:
        "Erreur lors de l'enregistrement. Vérifie le schéma Prisma et les contraintes.",
    });
  }
});
