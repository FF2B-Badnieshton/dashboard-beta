import { createError, defineEventHandler, getQuery } from "h3";

type GeoApiItem = {
  nom: string;
  code: string;
  codesPostaux?: string[];
  codeDepartement?: string;
  codeRegion?: string;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const type = String(query.type || "");
  const q = String(query.q || "").trim();

  if (!["region", "department", "municipality"].includes(type)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Type géographique invalide.",
    });
  }

  if (q.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: "Saisissez au moins deux caractères.",
    });
  }

  try {
    let endpoint: string;
    const params: Record<string, string> = {
      fields: "nom,code",
      format: "json",
    };

    if (type === "region") {
      endpoint = "https://geo.api.gouv.fr/regions";
      params.nom = q;
    } else if (type === "department") {
      endpoint = "https://geo.api.gouv.fr/departements";
      params.fields = "nom,code,codeRegion";
      params.nom = q;
    } else {
      endpoint = "https://geo.api.gouv.fr/communes";
      params.fields = "nom,code,codesPostaux,codeDepartement,codeRegion";
      params.limit = "20";

      if (/^\d{5}$/.test(q)) {
        params.codePostal = q;
      } else if (/^\d{5}$/.test(q)) {
        params.code = q;
      } else {
        params.nom = q;
        params.boost = "population";
      }
    }

    const data = await $fetch<GeoApiItem[]>(endpoint, {
      query: params,
      timeout: 8000,
    });

    return {
      results: data.map((item) => ({
        type,
        name: item.nom,
        code: item.code,
        ...(type === "municipality"
          ? {
              insee_code: item.code,
              zip_codes: item.codesPostaux ?? [],
              department_code: item.codeDepartement,
              region_code: item.codeRegion,
            }
          : type === "department"
            ? { region_code: item.codeRegion }
            : {}),
      })),
    };
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    throw createError({
      statusCode: 502,
      statusMessage: "L'API géographique est momentanément indisponible.",
    });
  }
});
