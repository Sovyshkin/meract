import api from "./api";

export const geoApi = {
  getLocationRanges: async () => {
    const response = await api.get("/geo/location-ranges");
    return response.data; // [{ id, label, minKm, maxKm, order }]
  },

  searchCountries: async (q = "") => {
    const response = await api.get("/geo/countries", { params: { q } });
    return response.data;
  },

  searchCities: async (country, q = "") => {
    const response = await api.get("/geo/cities", { params: { country, q } });
    return response.data;
  },
};
