const TEKS_PATTERN = /^A\.(?:[1-9]|1[0-2])[A-Z]$/;

// Structured lessons can be activated here while the Algebra 1 completion
// branch is being built and QA'd. The static catalog remains the source of
// TEKS/module metadata; these overrides add only verified lesson capability.
const STRUCTURED_LESSON_OVERRIDES = {
  "alg1-a5b-linear-inequalities": {
    lesson_path: "/a5b-linear-inequalities.json"
  }
};

export function flattenCourseModules(catalog) {
  if (!Array.isArray(catalog?.units)) return [];

  return catalog.units.flatMap(unit =>
    (unit.modules || []).map(module => ({
      ...module,
      unit_id: unit.unit_id,
      unit_title: unit.title,
      unit_sequence: unit.sequence
    }))
  );
}

export function findCourseModule(catalog, moduleId) {
  const module = flattenCourseModules(catalog).find(
    candidate => candidate.module_id === moduleId
  ) || null;

  if (!module) return null;

  const override = STRUCTURED_LESSON_OVERRIDES[moduleId];
  if (!override) return module;

  return {
    ...module,
    ...override,
    status: "available",
    available_modes: Array.from(new Set([
      ...(module.available_modes || []),
      "lesson"
    ]))
  };
}

export function practiceModules(catalog) {
  return flattenCourseModules(catalog).filter(module =>
    Array.isArray(module.available_modes) &&
    module.available_modes.includes("practice")
  );
}

export function validateCourseCatalog(catalog) {
  const errors = [];

  if (!catalog || typeof catalog !== "object") {
    return ["Course catalog must be an object."];
  }

  for (const key of ["course_id", "course", "standards_framework"]) {
    if (!catalog[key]) errors.push(`Missing required field: ${key}.`);
  }

  if (!Array.isArray(catalog.embedded_process_standards)) {
    errors.push("embedded_process_standards must be an array.");
  }

  if (!Array.isArray(catalog.units) || catalog.units.length === 0) {
    errors.push("units must contain at least one unit.");
    return errors;
  }

  const modules = flattenCourseModules(catalog);
  const moduleIds = new Set();
  const contentStandards = new Set();

  for (const module of modules) {
    if (!module.module_id) {
      errors.push("Every course module needs a module_id.");
    } else if (moduleIds.has(module.module_id)) {
      errors.push(`Duplicate module_id: ${module.module_id}.`);
    } else {
      moduleIds.add(module.module_id);
    }

    if (!module.title) {
      errors.push(`Module ${module.module_id || "(unknown)"} needs a title.`);
    }

    if (!Array.isArray(module.teks) || module.teks.length !== 1) {
      errors.push(
        `Module ${module.module_id || "(unknown)"} must map to one content standard.`
      );
      continue;
    }

    const [teks] = module.teks;
    if (!TEKS_PATTERN.test(teks) || /^A\.1[A-G]$/.test(teks)) {
      errors.push(`Invalid Algebra 1 content standard: ${teks}.`);
    }
    if (contentStandards.has(teks)) {
      errors.push(`Duplicate content standard: ${teks}.`);
    }
    contentStandards.add(teks);

    if (!Array.isArray(module.available_modes)) {
      errors.push(`Module ${module.module_id} needs available_modes.`);
    }
    if (module.available_modes?.includes("lesson") && !module.lesson_path) {
      errors.push(`Lesson module ${module.module_id} needs a lesson_path.`);
    }
  }

  if (contentStandards.size !== catalog.content_standard_count) {
    errors.push(
      `Catalog declares ${catalog.content_standard_count} content standards but contains ${contentStandards.size}.`
    );
  }

  return errors;
}
