export type Locale = "en" | "es" | "fr" | "de" | "ja" | "zh" | "pt" | "ar";

export interface TranslationKeys {
  // Common
  "common.save": string;
  "common.cancel": string;
  "common.delete": string;
  "common.edit": string;
  "common.create": string;
  "common.search": string;
  "common.loading": string;
  "common.error": string;
  "common.success": string;
  "common.confirm": string;
  "common.back": string;
  "common.next": string;
  "common.previous": string;
  "common.submit": string;
  "common.reset": string;
  "common.close": string;
  "common.viewAll": string;
  "common.learnMore": string;

  // Auth
  "auth.login": string;
  "auth.signup": string;
  "auth.logout": string;
  "auth.forgotPassword": string;
  "auth.resetPassword": string;
  "auth.email": string;
  "auth.password": string;
  "auth.confirmPassword": string;
  "auth.rememberMe": string;
  "auth.noAccount": string;
  "auth.hasAccount": string;

  // Navigation
  "nav.home": string;
  "nav.courses": string;
  "nav.dashboard": string;
  "nav.profile": string;
  "nav.settings": string;
  "nav.myCourses": string;
  "nav.certificates": string;
  "nav.notifications": string;

  // Courses
  "course.title": string;
  "course.description": string;
  "course.enroll": string;
  "course.enrolled": string;
  "course.instructor": string;
  "course.students": string;
  "course.rating": string;
  "course.price": string;
  "course.free": string;
  "course.duration": string;
  "course.modules": string;
  "course.lessons": string;
  "course.progress": string;
  "course.completed": string;
  "course.certificates": string;
  "course.prerequisites": string;
  "course.syllabus": string;
  "course.reviews": string;
  "course.overview": string;

  // Lessons
  "lesson.title": string;
  "lesson.content": string;
  "lesson.video": string;
  "lesson.resources": string;
  "lesson.next": string;
  "lesson.previous": string;
  "lesson.markComplete": string;
  "lesson.notes": string;
  "lesson.discussion": string;

  // Assignments
  "assignment.title": string;
  "assignment.description": string;
  "assignment.dueDate": string;
  "assignment.submit": string;
  "assignment.submitted": string;
  "assignment.graded": string;
  "assignment.score": string;
  "assignment.feedback": string;
  "assignment.late": string;
  "assignment.attempts": string;

  // Quizzes
  "quiz.title": string;
  "quiz.start": string;
  "quiz.submit": string;
  "quiz.nextQuestion": string;
  "quiz.previousQuestion": string;
  "quiz.timeRemaining": string;
  "quiz.score": string;
  "quiz.passed": string;
  "quiz.failed": string;
  "quiz.retake": string;
  "quiz.review": string;

  // Certificates
  "certificate.title": string;
  "certificate.issued": string;
  "certificate.download": string;
  "certificate.verify": string;
  "certificate.share": string;
  "certificate.courses": string;

  // Settings
  "settings.title": string;
  "settings.profile": string;
  "settings.account": string;
  "settings.billing": string;
  "settings.notifications": string;
  "settings.privacy": string;
  "settings.language": string;
  "settings.theme": string;

  // Dashboard
  "dashboard.welcome": string;
  "dashboard.overview": string;
  "dashboard.recentActivity": string;
  "dashboard.upcomingDeadlines": string;
  "dashboard.coursesInProgress": string;
  "dashboard.recommendedCourses": string;
  "dashboard.learningStats": string;
  "dashboard.streak": string;

  // Errors
  "error.notFound": string;
  "error.unauthorized": string;
  "error.forbidden": string;
  "error.serverError": string;
  "error.networkError": string;
  "error.validation": string;
}

const en: TranslationKeys = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.create": "Create",
  "common.search": "Search",
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.success": "Success",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.next": "Next",
  "common.previous": "Previous",
  "common.submit": "Submit",
  "common.reset": "Reset",
  "common.close": "Close",
  "common.viewAll": "View All",
  "common.learnMore": "Learn More",
  "auth.login": "Log In",
  "auth.signup": "Sign Up",
  "auth.logout": "Log Out",
  "auth.forgotPassword": "Forgot Password?",
  "auth.resetPassword": "Reset Password",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.confirmPassword": "Confirm Password",
  "auth.rememberMe": "Remember me",
  "auth.noAccount": "Don't have an account?",
  "auth.hasAccount": "Already have an account?",
  "nav.home": "Home",
  "nav.courses": "Courses",
  "nav.dashboard": "Dashboard",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.myCourses": "My Courses",
  "nav.certificates": "Certificates",
  "nav.notifications": "Notifications",
  "course.title": "Course",
  "course.description": "Description",
  "course.enroll": "Enroll Now",
  "course.enrolled": "Enrolled",
  "course.instructor": "Instructor",
  "course.students": "Students",
  "course.rating": "Rating",
  "course.price": "Price",
  "course.free": "Free",
  "course.duration": "Duration",
  "course.modules": "Modules",
  "course.lessons": "Lessons",
  "course.progress": "Progress",
  "course.completed": "Completed",
  "course.certificates": "Certificates",
  "course.prerequisites": "Prerequisites",
  "course.syllabus": "Syllabus",
  "course.reviews": "Reviews",
  "course.overview": "Overview",
  "lesson.title": "Lesson",
  "lesson.content": "Content",
  "lesson.video": "Video",
  "lesson.resources": "Resources",
  "lesson.next": "Next Lesson",
  "lesson.previous": "Previous Lesson",
  "lesson.markComplete": "Mark as Complete",
  "lesson.notes": "Notes",
  "lesson.discussion": "Discussion",
  "assignment.title": "Assignment",
  "assignment.description": "Description",
  "assignment.dueDate": "Due Date",
  "assignment.submit": "Submit",
  "assignment.submitted": "Submitted",
  "assignment.graded": "Graded",
  "assignment.score": "Score",
  "assignment.feedback": "Feedback",
  "assignment.late": "Late",
  "assignment.attempts": "Attempts",
  "quiz.title": "Quiz",
  "quiz.start": "Start Quiz",
  "quiz.submit": "Submit Quiz",
  "quiz.nextQuestion": "Next Question",
  "quiz.previousQuestion": "Previous Question",
  "quiz.timeRemaining": "Time Remaining",
  "quiz.score": "Score",
  "quiz.passed": "Passed",
  "quiz.failed": "Failed",
  "quiz.retake": "Retake",
  "quiz.review": "Review",
  "certificate.title": "Certificate",
  "certificate.issued": "Issued",
  "certificate.download": "Download",
  "certificate.verify": "Verify",
  "certificate.share": "Share",
  "certificate.courses": "Courses",
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.account": "Account",
  "settings.billing": "Billing",
  "settings.notifications": "Notifications",
  "settings.privacy": "Privacy",
  "settings.language": "Language",
  "settings.theme": "Theme",
  "dashboard.welcome": "Welcome",
  "dashboard.overview": "Overview",
  "dashboard.recentActivity": "Recent Activity",
  "dashboard.upcomingDeadlines": "Upcoming Deadlines",
  "dashboard.coursesInProgress": "Courses in Progress",
  "dashboard.recommendedCourses": "Recommended Courses",
  "dashboard.learningStats": "Learning Stats",
  "dashboard.streak": "Streak",
  "error.notFound": "Page not found",
  "error.unauthorized": "You are not authorized",
  "error.forbidden": "Access denied",
  "error.serverError": "Server error",
  "error.networkError": "Network error",
  "error.validation": "Validation error",
};

const es: Partial<TranslationKeys> = {
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.create": "Crear",
  "common.search": "Buscar",
  "common.loading": "Cargando...",
  "common.error": "Error",
  "common.success": "Éxito",
  "common.confirm": "Confirmar",
  "common.back": "Atrás",
  "common.next": "Siguiente",
  "common.previous": "Anterior",
  "common.submit": "Enviar",
  "common.reset": "Restablecer",
  "common.close": "Cerrar",
  "common.viewAll": "Ver Todo",
  "common.learnMore": "Más Información",
  "auth.login": "Iniciar Sesión",
  "auth.signup": "Registrarse",
  "auth.logout": "Cerrar Sesión",
  "auth.forgotPassword": "¿Olvidaste tu contraseña?",
  "auth.resetPassword": "Restablecer Contraseña",
  "auth.email": "Correo Electrónico",
  "auth.password": "Contraseña",
  "auth.confirmPassword": "Confirmar Contraseña",
  "auth.rememberMe": "Recordarme",
  "auth.noAccount": "¿No tienes una cuenta?",
  "auth.hasAccount": "¿Ya tienes una cuenta?",
  "nav.home": "Inicio",
  "nav.courses": "Cursos",
  "nav.dashboard": "Panel",
  "nav.profile": "Perfil",
  "nav.settings": "Configuración",
  "nav.myCourses": "Mis Cursos",
  "nav.certificates": "Certificados",
  "nav.notifications": "Notificaciones",
  "course.title": "Curso",
  "course.description": "Descripción",
  "course.enroll": "Inscribirse",
  "course.enrolled": "Inscrito",
  "course.instructor": "Instructor",
  "course.students": "Estudiantes",
  "course.rating": "Calificación",
  "course.price": "Precio",
  "course.free": "Gratis",
  "course.duration": "Duración",
  "course.modules": "Módulos",
  "course.lessons": "Lecciones",
  "course.progress": "Progreso",
  "course.completed": "Completado",
  "course.certificates": "Certificados",
  "course.prerequisites": "Prerrequisitos",
  "course.syllabus": "Programa",
  "course.reviews": "Reseñas",
  "course.overview": "Resumen",
  "lesson.title": "Lección",
  "lesson.content": "Contenido",
  "lesson.video": "Video",
  "lesson.resources": "Recursos",
  "lesson.next": "Siguiente Lección",
  "lesson.previous": "Lección Anterior",
  "lesson.markComplete": "Marcar como Completada",
  "lesson.notes": "Notas",
  "lesson.discussion": "Discusión",
  "assignment.title": "Tarea",
  "assignment.description": "Descripción",
  "assignment.dueDate": "Fecha de Entrega",
  "assignment.submit": "Entregar",
  "assignment.submitted": "Entregado",
  "assignment.graded": "Calificado",
  "assignment.score": "Puntuación",
  "assignment.feedback": "Comentarios",
  "assignment.late": "Tardío",
  "assignment.attempts": "Intentos",
  "quiz.title": "Quiz",
  "quiz.start": "Iniciar Quiz",
  "quiz.submit": "Enviar Quiz",
  "quiz.nextQuestion": "Siguiente Pregunta",
  "quiz.previousQuestion": "Pregunta Anterior",
  "quiz.timeRemaining": "Tiempo Restante",
  "quiz.score": "Puntuación",
  "quiz.passed": "Aprobado",
  "quiz.failed": "Reprobado",
  "quiz.retake": "Reintentar",
  "quiz.review": "Revisar",
  "certificate.title": "Certificado",
  "certificate.issued": "Emitido",
  "certificate.download": "Descargar",
  "certificate.verify": "Verificar",
  "certificate.share": "Compartir",
  "certificate.courses": "Cursos",
  "settings.title": "Configuración",
  "settings.profile": "Perfil",
  "settings.account": "Cuenta",
  "settings.billing": "Facturación",
  "settings.notifications": "Notificaciones",
  "settings.privacy": "Privacidad",
  "settings.language": "Idioma",
  "settings.theme": "Tema",
  "dashboard.welcome": "Bienvenido",
  "dashboard.overview": "Resumen",
  "dashboard.recentActivity": "Actividad Reciente",
  "dashboard.upcomingDeadlines": "Próximos Vencimientos",
  "dashboard.coursesInProgress": "Cursos en Progreso",
  "dashboard.recommendedCourses": "Cursos Recomendados",
  "dashboard.learningStats": "Estadísticas de Aprendizaje",
  "dashboard.streak": "Racha",
  "error.notFound": "Página no encontrada",
  "error.unauthorized": "No estás autorizado",
  "error.forbidden": "Acceso denegado",
  "error.serverError": "Error del servidor",
  "error.networkError": "Error de red",
  "error.validation": "Error de validación",
};

const fr: Partial<TranslationKeys> = {
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.create": "Créer",
  "common.search": "Rechercher",
  "common.loading": "Chargement...",
  "common.error": "Erreur",
  "common.success": "Succès",
  "common.confirm": "Confirmer",
  "common.back": "Retour",
  "common.next": "Suivant",
  "common.previous": "Précédent",
  "common.submit": "Soumettre",
  "common.reset": "Réinitialiser",
  "common.close": "Fermer",
  "common.viewAll": "Voir Tout",
  "common.learnMore": "En Savoir Plus",
  "auth.login": "Se Connecter",
  "auth.signup": "S'inscrire",
  "auth.logout": "Se Déconnecter",
  "auth.forgotPassword": "Mot de passe oublié?",
  "auth.resetPassword": "Réinitialiser le Mot de Passe",
  "auth.email": "E-mail",
  "auth.password": "Mot de Passe",
  "auth.confirmPassword": "Confirmer le Mot de Passe",
  "auth.rememberMe": "Se souvenir de moi",
  "auth.noAccount": "Pas encore de compte?",
  "auth.hasAccount": "Déjà un compte?",
  "nav.home": "Accueil",
  "nav.courses": "Cours",
  "nav.dashboard": "Tableau de Bord",
  "nav.profile": "Profil",
  "nav.settings": "Paramètres",
  "nav.myCourses": "Mes Cours",
  "nav.certificates": "Certificats",
  "nav.notifications": "Notifications",
};

const de: Partial<TranslationKeys> = {
  "common.save": "Speichern",
  "common.cancel": "Abbrechen",
  "common.delete": "Löschen",
  "common.edit": "Bearbeiten",
  "common.create": "Erstellen",
  "common.search": "Suchen",
  "common.loading": "Laden...",
  "common.error": "Fehler",
  "common.success": "Erfolg",
  "common.confirm": "Bestätigen",
  "common.back": "Zurück",
  "common.next": "Weiter",
  "common.previous": "Zurück",
  "common.submit": "Absenden",
  "common.reset": "Zurücksetzen",
  "common.close": "Schließen",
  "common.viewAll": "Alle Anzeigen",
  "common.learnMore": "Mehr Erfahren",
  "auth.login": "Anmelden",
  "auth.signup": "Registrieren",
  "auth.logout": "Abmelden",
  "auth.forgotPassword": "Passwort vergessen?",
  "auth.resetPassword": "Passwort Zurücksetzen",
  "auth.email": "E-Mail",
  "auth.password": "Passwort",
  "auth.confirmPassword": "Passwort Bestätigen",
  "auth.rememberMe": "Angemeldet bleiben",
  "auth.noAccount": "Noch kein Konto?",
  "auth.hasAccount": "Bereits ein Konto?",
  "nav.home": "Startseite",
  "nav.courses": "Kurse",
  "nav.dashboard": "Dashboard",
  "nav.profile": "Profil",
  "nav.settings": "Einstellungen",
  "nav.myMeine": "Meine Kurse",
  "nav.certificates": "Zertifikate",
  "nav.notifications": "Benachrichtigungen",
};

const translations: Record<Locale, Partial<TranslationKeys>> = {
  en,
  es,
  fr,
  de,
  ja: {},
  zh: {},
  pt: {},
  ar: {},
};

// I18n context
export interface I18nContext {
  locale: Locale;
  fallbackLocale: Locale;
  translations: Record<string, string>;
}

let currentContext: I18nContext = {
  locale: "en",
  fallbackLocale: "en",
  translations: {},
};

export function setLocale(locale: Locale): void {
  currentContext.locale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("aiedu-locale", locale);
  }
}

export function getLocale(): Locale {
  return currentContext.locale;
}

export function getAvailableLocales(): Locale[] {
  return ["en", "es", "fr", "de", "ja", "zh", "pt", "ar"];
}

export function getLocaleLabel(locale: Locale): string {
  const labels: Record<Locale, string> = {
    en: "English",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    ja: "日本語",
    zh: "中文",
    pt: "Português",
    ar: "العربية",
  };
  return labels[locale];
}

// Translation function
export function t(
  key: keyof TranslationKeys,
  params?: Record<string, string | number>
): string {
  const localeTranslations = translations[currentContext.locale] || {};
  let value = localeTranslations[key] || en[key] || key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`{{${paramKey}}}`, "g"), String(paramValue));
    }
  }

  return value;
}

// Pluralization
export function tPlural(
  key: keyof TranslationKeys,
  count: number,
  params?: Record<string, string | number>
): string {
  const pluralKey = count === 1 ? key : `${key}_plural`;
  const resolvedKey = (translations[currentContext.locale]?.[pluralKey as keyof TranslationKeys]
    ? pluralKey
    : key) as keyof TranslationKeys;
  return t(resolvedKey, { count, ...params });
}

// Date formatting with locale
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = new Date(date);
  const localeMap: Record<Locale, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    ja: "ja-JP",
    zh: "zh-CN",
    pt: "pt-BR",
    ar: "ar-SA",
  };
  return new Intl.DateTimeFormat(localeMap[currentContext.locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(d);
}

// Number formatting with locale
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  const localeMap: Record<Locale, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    ja: "ja-JP",
    zh: "zh-CN",
    pt: "pt-BR",
    ar: "ar-SA",
  };
  return new Intl.NumberFormat(localeMap[currentContext.locale], options).format(value);
}

// Currency formatting
export function formatCurrency(
  value: number,
  currency = "USD"
): string {
  return formatNumber(value, {
    style: "currency",
    currency,
  });
}

// RTL detection
export function isRTL(): boolean {
  return currentContext.locale === "ar";
}

// Initialize from storage
export function initI18n(): void {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("aiedu-locale") as Locale | null;
    if (saved && getAvailableLocales().includes(saved)) {
      currentContext.locale = saved;
    } else {
      const browserLang = navigator.language.split("-")[0] as Locale;
      if (getAvailableLocales().includes(browserLang)) {
        currentContext.locale = browserLang;
      }
    }
  }
}
