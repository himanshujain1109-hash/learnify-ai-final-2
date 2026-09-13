import api from "./api";

export const getMaterials = async () => {
  const response = await api.get("/materials");
  return response.data;
};

export const getMaterial = async (id) => {
  const response = await api.get(`/materials/${id}`);
  return response.data;
};

export const uploadMaterial = async (file, title) => {
  const form = new FormData();

  form.append("file", file);

  if (title) {
    form.append("title", title);
  }

  // Do not set Content-Type manually. The browser adds the multipart
  // boundary; without it, some PDF uploads arrive as an empty body.
  const response = await api.post("/materials/upload", form);

  return response.data;
};

export const researchMaterial = async ({ topic, language = "Hinglish", level = "College" }) => {
  const response = await api.post("/materials/research", { topic, language, level });
  return response.data;
};

