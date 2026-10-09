interface GeocodingFeature {
  properties?: {
    label?: string;
    name?: string;
    postcode?: string;
    city?: string;
    citycode?: string;
    type?: string;
  };
}

interface GeocodingResponse {
  features?: GeocodingFeature[];
}

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event);
  const query = String(q ?? "").trim();

  if (query.length < 3) {
    return [];
  }

  const result = await $fetch<GeocodingResponse>(
    "https://data.geopf.fr/geocodage/search",
    {
      query: {
        q: query,
        limit: 6,
      },
    },
  );

  return (result.features ?? [])
    .map((feature) => {
      const properties = feature.properties ?? {};

      return {
        label: properties.label ?? properties.name ?? "",
        postcode: properties.postcode ?? "",
        city: properties.city ?? "",
        citycode: properties.citycode ?? "",
        type: properties.type ?? "",
      };
    })
    .filter((address) => address.label);
});
