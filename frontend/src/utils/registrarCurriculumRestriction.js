export const getRegistrarCurriculumId = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("curriculum_id") ||
    localStorage.getItem("registrar_curriculum_id") ||
    ""
  );
};

export const hasRegistrarCurriculumRestriction = () =>
  Boolean(getRegistrarCurriculumId());

export const isRegistrarCurriculumMatch = (value) => {
  const curriculumId = getRegistrarCurriculumId();
  if (!curriculumId) return true;
  if (value === null || value === undefined || value === "") return false;

  return String(value) === String(curriculumId);
};

export const restrictToRegistrarCurriculum = (items = [], getValue) => {
  const curriculumId = getRegistrarCurriculumId();
  if (!curriculumId) return items;

  return items.filter((item) => {
    const value = getValue
      ? getValue(item)
      : item?.curriculum_id ?? item?.program ?? item?.active_curriculum;

    return String(value ?? "") === String(curriculumId);
  });
};
