const PLACEHOLDER_PATTERNS = [
  /option\s*a/i, /option\s*b/i, /option\s*c/i, /option\s*d/i,
  /sample\s*question/i, /example\s*question/i,
  /replace\s*(this|me)/i, /placeholder/i,
  /^lesson\s+\d+$/i, /^sub\s*unit\s+\d+$/i, /^unit\s+\d+$/i,
];

const TEMPLATED_TITLE_PATTERNS = [
  /^generated\s+(subject|unit|lesson)/i,
  /^new\s+(unit|sub\s*unit|lesson)/i,
  /^unit\s+\d+$/i, /^lesson\s+\d+$/i, /^sub\s*unit\s+\d+$/i,
];

export function createLogger(name) {
  return {
    info: (msg, data) => {
      const entry = { level: 'info', timestamp: new Date().toISOString(), service: name, message: msg };
      if (data) entry.data = typeof data === 'object' ? data : { value: data };
      console.log(JSON.stringify(entry));
    },
    warn: (msg, data) => {
      const entry = { level: 'warn', timestamp: new Date().toISOString(), service: name, message: msg };
      if (data) entry.data = typeof data === 'object' ? data : { value: data };
      console.warn(JSON.stringify(entry));
    },
    error: (msg, err) => {
      const entry = { level: 'error', timestamp: new Date().toISOString(), service: name, message: msg };
      if (err) entry.error = err instanceof Error ? { message: err.message, stack: err.stack?.split('\n').slice(0, 4).join('\n') } : err;
      console.error(JSON.stringify(entry));
    },
  };
}

export function withTimeout(promise, ms = 30000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function retry(fn, { maxRetries = 2, baseDelay = 1000, logger } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable = error.message?.includes('429') || error.message?.includes('500') || error.message?.includes('503') || error.message?.includes('timed out') || error.message?.includes('RESOURCE_EXHAUSTED');
      if (attempt >= maxRetries || !isRetryable) break;
      const delay = baseDelay * Math.pow(2, attempt);
      logger?.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export function detectPlaceholder(value) {
  if (!value) return false;
  if (typeof value === 'string') {
    return PLACEHOLDER_PATTERNS.some(p => p.test(value));
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.some(v => detectPlaceholder(v));
  }
  if (typeof value === 'object') {
    return Object.values(value).some(v => detectPlaceholder(v));
  }
  return false;
}

export function detectTemplatedTitle(title) {
  if (!title || typeof title !== 'string') return true;
  return TEMPLATED_TITLE_PATTERNS.some(p => p.test(title.trim()));
}

export function validateForgeStructure(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not a valid object');
  }

  const subject = data.subject;
  if (!subject) {
    throw new Error('Missing required field: subject');
  }
  if (!subject.title || typeof subject.title !== 'string' || subject.title.trim().length === 0) {
    throw new Error('Subject title is empty or missing');
  }
  if (detectTemplatedTitle(subject.title)) {
    throw new Error('Subject title appears to be a placeholder/template value');
  }

  const units = subject.units;
  if (!Array.isArray(units) || units.length === 0) {
    throw new Error('Subject must contain at least one unit');
  }
  if (units.length < 3) {
    throw new Error(`Generated only ${units.length} units; minimum required is 3`);
  }

  for (const unit of units) {
    if (!unit.title || typeof unit.title !== 'string' || unit.title.trim().length === 0) {
      throw new Error('Unit title is empty or missing');
    }
    if (detectTemplatedTitle(unit.title)) {
      throw new Error(`Unit title "${unit.title}" appears to be a placeholder`);
    }

    const subUnits = unit.subUnits;
    if (!Array.isArray(subUnits) || subUnits.length === 0) {
      throw new Error(`Unit "${unit.title}" has no sub-units`);
    }

    for (const subUnit of subUnits) {
      if (!subUnit.title || typeof subUnit.title !== 'string' || subUnit.title.trim().length === 0) {
        throw new Error('Sub-unit title is empty or missing');
      }
      if (detectTemplatedTitle(subUnit.title)) {
        throw new Error(`Sub-unit title "${subUnit.title}" appears to be a placeholder`);
      }

      const lessons = subUnit.lessons;
      if (!Array.isArray(lessons) || lessons.length === 0) {
        throw new Error(`Sub-unit "${subUnit.title}" has no lessons`);
      }

      for (const lesson of lessons) {
        if (!lesson.title || typeof lesson.title !== 'string' || lesson.title.trim().length === 0) {
          throw new Error('Lesson title is empty or missing');
        }
        if (detectTemplatedTitle(lesson.title)) {
          throw new Error(`Lesson title "${lesson.title}" appears to be a placeholder`);
        }

        const exercises = lesson.exercises;
        if (!Array.isArray(exercises) || exercises.length === 0) {
          throw new Error(`Lesson "${lesson.title}" has no exercises`);
        }

        for (const exercise of exercises) {
          if (!exercise.question || typeof exercise.question !== 'string') {
            throw new Error('Exercise question is missing');
          }
          // Enforce richer context: stems should be 2-4 sentences / scenario-based for reasoning
          if (exercise.question.trim().split(/\s+/).length < 12) {
            // allow short but warn – require reasoning depth
            console.warn(`Exercise question too short, may reward memorization: "${exercise.question.slice(0,60)}"`);
          }
          if (detectPlaceholder(exercise.question)) {
            throw new Error(`Exercise question "${exercise.question}" appears to be a placeholder`);
          }
          if (exercise.type === 'multipleChoice' && (!Array.isArray(exercise.options) || exercise.options.length < 2)) {
            throw new Error(`Multiple choice exercise "${exercise.question}" has insufficient options`);
          }
          if ((exercise.type === 'matchPairs' || exercise.type === 'matching' || exercise.type === 'matchVocabulary')) {
            const pairs = exercise.pairs || exercise.matches || exercise.items;
            if (!Array.isArray(pairs) || pairs.length < 2) {
              throw new Error(`Matching exercise "${exercise.question}" missing pairs (need >=2 pairs with left/right)`);
            }
            // Validate pairs shape
            for (const p of pairs) {
              const hasLeft = !!(p.left || p.term || p.key || p.label || (Array.isArray(p) && p[0]));
              const hasRight = !!(p.right || p.definition || p.description || p.value || (Array.isArray(p) && p[1]));
              if (!hasLeft || !hasRight) throw new Error(`Matching exercise "${exercise.question}" has malformed pair ${JSON.stringify(p).slice(0,100)}`);
            }
          }
          if ((exercise.type === 'arrangeOrder' || exercise.type === 'ordering' || exercise.type === 'sequence')) {
            const items = exercise.items || exercise.sequence || exercise.options;
            if (!Array.isArray(items) || items.length < 2) throw new Error(`Ordering exercise "${exercise.question}" missing items`);
          }
          if (!exercise.correctAnswer) {
            throw new Error('Exercise correctAnswer is missing');
          }
          if (!exercise.explanation || exercise.explanation.trim().length < 20) {
            throw new Error(`Exercise "${exercise.question}" missing rich explanation (why answer is correct)`);
          }
        }
      }
    }
  }

  if (detectPlaceholder(data)) {
    throw new Error('Response contains placeholder/template content');
  }

  return true;
}

export function validateLearningContent(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not a valid object');
  }

  const subjects = data.subjects;
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new Error('Missing required field: subjects array');
  }

  for (const subject of subjects) {
    if (!subject.title || typeof subject.title !== 'string' || subject.title.trim().length === 0) {
      throw new Error('Subject title is empty or missing');
    }
    if (detectTemplatedTitle(subject.title)) {
      throw new Error(`Subject title "${subject.title}" appears to be a placeholder`);
    }

    const units = subject.units;
    if (!Array.isArray(units) || units.length === 0) {
      throw new Error(`Subject "${subject.title}" has no units`);
    }

    for (const unit of units) {
      const lessons = unit.lessons;
      if (!Array.isArray(lessons) || lessons.length === 0) {
        throw new Error(`Unit "${unit.title}" has no lessons`);
      }

      for (const lesson of lessons) {
        if (!lesson.title || typeof lesson.title !== 'string' || lesson.title.trim().length === 0) {
          throw new Error('Lesson title is empty or missing');
        }
        if (detectTemplatedTitle(lesson.title)) {
          throw new Error(`Lesson title "${lesson.title}" appears to be a placeholder`);
        }

        const questions = lesson.questions || [];
        if (questions.length === 0) {
          throw new Error(`Lesson "${lesson.title}" has no questions`);
        }

        for (const question of questions) {
          if (!question.prompt || typeof question.prompt !== 'string') {
            throw new Error('Question prompt is missing');
          }
          if (question.type === 'multipleChoice' && (!Array.isArray(question.options) || question.options.length < 2)) {
            throw new Error(`Multiple choice question "${question.prompt}" has insufficient options`);
          }
          if (!question.correctAnswer) {
            throw new Error('Question correctAnswer is missing');
          }
        }
      }
    }
  }

  if (detectPlaceholder(data)) {
    throw new Error('Response contains placeholder/template content');
  }

  return true;
}

export function validateForgeAssistantReply(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not a valid object');
  }
  if (!data.reply || typeof data.reply !== 'string' || data.reply.trim().length === 0) {
    throw new Error('Reply is empty or missing');
  }
  return true;
}

export function validateHint(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not a valid object');
  }
  if (!data.hint || typeof data.hint !== 'string' || data.hint.trim().length === 0) {
    throw new Error('Hint is empty or missing');
  }
  return true;
}

export function validateExplanation(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not a valid object');
  }
  if (!data.explanation || typeof data.explanation !== 'string' || data.explanation.trim().length === 0) {
    throw new Error('Explanation is empty or missing');
  }
  return true;
}

export function validateFileResponse(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not a valid object');
  }

  const subject = data.subject;
  if (!subject) {
    throw new Error('Missing required field: subject');
  }
  if (!subject.title || typeof subject.title !== 'string' || subject.title.trim().length === 0) {
    throw new Error('Subject title is empty or missing');
  }
  if (detectTemplatedTitle(subject.title)) {
    throw new Error('Subject title appears to be a placeholder/template value');
  }

  const units = subject.units;
  if (!Array.isArray(units) || units.length === 0) {
    throw new Error('Subject must contain at least one unit');
  }

  let hasContent = false;
  for (const unit of units) {
    if (!unit.title) throw new Error('Unit title is missing');
    const subUnits = unit.subUnits;
    if (Array.isArray(subUnits)) {
      for (const subUnit of subUnits) {
        if (Array.isArray(subUnit.lessons) && subUnit.lessons.length > 0) {
          hasContent = true;
          for (const lesson of subUnit.lessons) {
            if (!lesson.title) throw new Error('Lesson title is missing');
            if (!Array.isArray(lesson.exercises) || lesson.exercises.length === 0) {
              throw new Error(`Lesson "${lesson.title}" has no exercises`);
            }
          }
        }
      }
    }
  }

  if (!hasContent) {
    throw new Error('Generated structure has no lessons');
  }

  if (detectPlaceholder(data)) {
    throw new Error('Response contains placeholder/template content');
  }

  return true;
}
