const TEKS_PATTERN = /^A\.(?:[1-9]|1[0-2])[A-Z]$/;

// Structured lessons can be activated here while the Algebra 1 completion
// branch is being built and QA'd. The static catalog remains the source of
// TEKS/module metadata; these overrides add only verified lesson capability.
const STRUCTURED_LESSON_OVERRIDES = {
  "alg1-a5b-linear-inequalities": {
    lesson_path: "/a5b-linear-inequalities.json"
  },
  "alg1-a5c-linear-systems": {
    lesson_path: "/a5c-linear-systems.json"
  },
  "alg1-a6a-quadratic-domain-range": {
    lesson_path: "/a6a-quadratic-domain-range.json"
  },
  "alg1-a6b-write-quadratics-from-vertex": {
    lesson_path: "/a6b-write-quadratics-from-vertex.json"
  },
  "alg1-a6c-write-quadratics-from-solutions": {
    lesson_path: "/a6c-write-quadratics-from-solutions.json"
  },
  "alg1-a7a-quadratic-key-features": {
    lesson_path: "/a7a-quadratic-key-features.json"
  },
  "alg1-a7b-factors-and-zeros": {
    lesson_path: "/a7b-factors-and-zeros.json"
  },
  "alg1-a7c-quadratic-transformations": {
    lesson_path: "/a7c-quadratic-transformations.json"
  },
  "alg1-a8a-solve-quadratic-equations": {
    lesson_path: "/a8a-solve-quadratic-equations.json"
  },
  "alg1-a8b-quadratic-regression": {
    lesson_path: "/a8b-quadratic-regression.json"
  },
  "alg1-a9a-exponential-domain-range": {
    lesson_path: "/a9a-exponential-domain-range.json"
  },
  "alg1-a9b-interpret-exponential-parameters": {
    lesson_path: "/a9b-interpret-exponential-parameters.json"
  },
  "alg1-a9c-write-exponential-models": {
    lesson_path: "/a9c-write-exponential-models.json"
  },
  "alg1-a9d-graph-exponential-functions": {
    lesson_path: "/a9d-graph-exponential-functions.json"
  },
  "alg1-a9e-exponential-regression": {
    lesson_path: "/a9e-exponential-regression.json"
  },
  "alg1-a10a-add-subtract-polynomials": {
    lesson_path: "/a10a-add-subtract-polynomials.json"
  },
  "alg1-a10b-multiply-polynomials": {
    lesson_path: "/a10b-multiply-polynomials.json"
  },
  "alg1-a10c-divide-polynomials": {
    lesson_path: "/a10c-divide-polynomials.json"
  },
  "alg1-a10d-equivalent-polynomial-forms": {
    lesson_path: "/a10d-equivalent-polynomial-forms.json"
  },
  "alg1-a10e-factor-trinomials": {
    lesson_path: "/a10e-factor-trinomials.json"
  },
  "alg1-a10f-difference-of-squares": {
    lesson_path: "/a10f-difference-of-squares.json",
    available_modes: ["lesson", "practice"]
  },
  "alg1-a11a-radical-expressions": {
    lesson_path: "/a11a-radical-expressions.json",
    available_modes: ["lesson", "practice"]
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

function applyStructuredOverride(module) {
  if (!module) return null;
  const override = STRUCTURED_LESSON_OVERRIDES[module.module_id];
  if (!override) return module;

  const overrideModes = Array.isArray(override.available_modes)
    ? override.available_modes
    : ["lesson"];

  return {
    ...module,
    ...override,
    status: "available",
    available_modes: Array.from(new Set([
      ...(module.available_modes || []),
      ...overrideModes
    ]))
  };
}

export function findCourseModule(catalog, moduleId) {
  const module = flattenCourseModules(catalog).find(
    candidate => candidate.module_id === moduleId
  ) || null;

  return applyStructuredOverride(module);
}

export function practiceModules(catalog) {
  return flattenCourseModules(catalog)
    .map(applyStructuredOverride)
    .filter(module =>
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
