import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Course,
  CourseModule,
  Enrollment,
  EnrollmentProgress,
  CourseFilters,
  CourseSearchResult,
} from "@/types";

interface CourseState {
  // Course data
  courses: Course[];
  currentCourse: Course | null;
  courseModules: CourseModule[];
  featuredCourses: Course[];
  popularCourses: Course[];
  recentCourses: Course[];

  // Enrollment
  enrollments: Enrollment[];
  currentEnrollment: Enrollment | null;

  // Search & Filter
  filters: CourseFilters;
  searchQuery: string;
  searchResults: CourseSearchResult | null;

  // Pagination
  page: number;
  pageSize: number;
  totalCourses: number;
  hasMore: boolean;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isEnrolling: boolean;
  isSearching: boolean;

  // Error
  error: string | null;

  // Cache
  lastFetchedAt: number | null;

  // Actions - Courses
  setCourses: (courses: Course[]) => void;
  addCourses: (courses: Course[]) => void;
  setCurrentCourse: (course: Course | null) => void;
  setCourseModules: (modules: CourseModule[]) => void;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  removeCourse: (courseId: string) => void;

  // Actions - Featured/Popular
  setFeaturedCourses: (courses: Course[]) => void;
  setPopularCourses: (courses: Course[]) => void;
  setRecentCourses: (courses: Course[]) => void;

  // Actions - Enrollment
  setEnrollments: (enrollments: Enrollment[]) => void;
  addEnrollment: (enrollment: Enrollment) => void;
  setCurrentEnrollment: (enrollment: Enrollment | null) => void;
  updateEnrollment: (
    courseId: string,
    updates: Partial<Enrollment>
  ) => void;
  removeEnrollment: (courseId: string) => void;

  // Actions - Progress
  updateProgress: (
    courseId: string,
    progress: Partial<EnrollmentProgress>
  ) => void;
  markLessonComplete: (courseId: string, lessonId: string) => void;
  markAssignmentComplete: (courseId: string, assignmentId: string) => void;
  markQuizComplete: (courseId: string, quizId: string) => void;

  // Actions - Filters
  setFilters: (filters: Partial<CourseFilters>) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: CourseSearchResult | null) => void;

  // Actions - Pagination
  setPage: (page: number) => void;
  setTotalCourses: (total: number) => void;
  setHasMore: (hasMore: boolean) => void;

  // Actions - Loading
  setLoading: (value: boolean) => void;
  setLoadingMore: (value: boolean) => void;
  setEnrolling: (value: boolean) => void;
  setSearching: (value: boolean) => void;

  // Actions - Error
  setError: (error: string | null) => void;

  // Actions - Helpers
  isEnrolled: (courseId: string) => boolean;
  getEnrollment: (courseId: string) => Enrollment | undefined;
  getCourseProgress: (courseId: string) => number;
  clearCache: () => void;
  reset: () => void;
}

const defaultFilters: CourseFilters = {
  sortBy: "popular",
};

const initialState = {
  courses: [],
  currentCourse: null,
  courseModules: [],
  featuredCourses: [],
  popularCourses: [],
  recentCourses: [],
  enrollments: [],
  currentEnrollment: null,
  filters: defaultFilters,
  searchQuery: "",
  searchResults: null,
  page: 1,
  pageSize: 12,
  totalCourses: 0,
  hasMore: true,
  isLoading: false,
  isLoadingMore: false,
  isEnrolling: false,
  isSearching: false,
  error: null,
  lastFetchedAt: null,
};

export const useCourseStore = create<CourseState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Course actions
        setCourses: (courses) =>
          set((state) => {
            state.courses = courses;
            state.lastFetchedAt = Date.now();
          }),

        addCourses: (courses) =>
          set((state) => {
            const existingIds = new Set(state.courses.map((c) => c.id));
            const newCourses = courses.filter((c) => !existingIds.has(c.id));
            state.courses.push(...newCourses);
            state.lastFetchedAt = Date.now();
          }),

        setCurrentCourse: (course) =>
          set((state) => {
            state.currentCourse = course;
          }),

        setCourseModules: (modules) =>
          set((state) => {
            state.courseModules = modules;
          }),

        updateCourse: (courseId, updates) =>
          set((state) => {
            const course = state.courses.find((c) => c.id === courseId);
            if (course) Object.assign(course, updates);
            if (state.currentCourse?.id === courseId) {
              Object.assign(state.currentCourse, updates);
            }
          }),

        removeCourse: (courseId) =>
          set((state) => {
            state.courses = state.courses.filter((c) => c.id !== courseId);
            if (state.currentCourse?.id === courseId) {
              state.currentCourse = null;
            }
          }),

        // Featured/Popular
        setFeaturedCourses: (courses) =>
          set((state) => {
            state.featuredCourses = courses;
          }),

        setPopularCourses: (courses) =>
          set((state) => {
            state.popularCourses = courses;
          }),

        setRecentCourses: (courses) =>
          set((state) => {
            state.recentCourses = courses;
          }),

        // Enrollment actions
        setEnrollments: (enrollments) =>
          set((state) => {
            state.enrollments = enrollments;
          }),

        addEnrollment: (enrollment) =>
          set((state) => {
            const exists = state.enrollments.find(
              (e) => e.courseId === enrollment.courseId
            );
            if (!exists) {
              state.enrollments.unshift(enrollment);
            }
          }),

        setCurrentEnrollment: (enrollment) =>
          set((state) => {
            state.currentEnrollment = enrollment;
          }),

        updateEnrollment: (courseId, updates) =>
          set((state) => {
            const enrollment = state.enrollments.find(
              (e) => e.courseId === courseId
            );
            if (enrollment) Object.assign(enrollment, updates);
            if (state.currentEnrollment?.courseId === courseId) {
              Object.assign(state.currentEnrollment, updates);
            }
          }),

        removeEnrollment: (courseId) =>
          set((state) => {
            state.enrollments = state.enrollments.filter(
              (e) => e.courseId !== courseId
            );
            if (state.currentEnrollment?.courseId === courseId) {
              state.currentEnrollment = null;
            }
          }),

        // Progress actions
        updateProgress: (courseId, progress) =>
          set((state) => {
            const enrollment = state.enrollments.find(
              (e) => e.courseId === courseId
            );
            if (enrollment) {
              Object.assign(enrollment.progress, progress);
            }
            if (state.currentEnrollment?.courseId === courseId) {
              Object.assign(state.currentEnrollment.progress, progress);
            }
          }),

        markLessonComplete: (courseId, lessonId) =>
          set((state) => {
            const enrollment = state.enrollments.find(
              (e) => e.courseId === courseId
            );
            if (
              enrollment &&
              !enrollment.progress.completedLessons.includes(lessonId)
            ) {
              enrollment.progress.completedLessons.push(lessonId);
            }
          }),

        markAssignmentComplete: (courseId, assignmentId) =>
          set((state) => {
            const enrollment = state.enrollments.find(
              (e) => e.courseId === courseId
            );
            if (
              enrollment &&
              !enrollment.progress.completedAssignments.includes(assignmentId)
            ) {
              enrollment.progress.completedAssignments.push(assignmentId);
            }
          }),

        markQuizComplete: (courseId, quizId) =>
          set((state) => {
            const enrollment = state.enrollments.find(
              (e) => e.courseId === courseId
            );
            if (
              enrollment &&
              !enrollment.progress.completedQuizzes.includes(quizId)
            ) {
              enrollment.progress.completedQuizzes.push(quizId);
            }
          }),

        // Filter actions
        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.page = 1;
          }),

        resetFilters: () =>
          set((state) => {
            state.filters = defaultFilters;
            state.page = 1;
          }),

        setSearchQuery: (query) =>
          set((state) => {
            state.searchQuery = query;
          }),

        setSearchResults: (results) =>
          set((state) => {
            state.searchResults = results;
          }),

        // Pagination
        setPage: (page) =>
          set((state) => {
            state.page = page;
          }),

        setTotalCourses: (total) =>
          set((state) => {
            state.totalCourses = total;
          }),

        setHasMore: (hasMore) =>
          set((state) => {
            state.hasMore = hasMore;
          }),

        // Loading
        setLoading: (value) =>
          set((state) => {
            state.isLoading = value;
          }),

        setLoadingMore: (value) =>
          set((state) => {
            state.isLoadingMore = value;
          }),

        setEnrolling: (value) =>
          set((state) => {
            state.isEnrolling = value;
          }),

        setSearching: (value) =>
          set((state) => {
            state.isSearching = value;
          }),

        // Error
        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        // Helpers
        isEnrolled: (courseId) => {
          return get().enrollments.some((e) => e.courseId === courseId);
        },

        getEnrollment: (courseId) => {
          return get().enrollments.find((e) => e.courseId === courseId);
        },

        getCourseProgress: (courseId) => {
          const enrollment = get().enrollments.find(
            (e) => e.courseId === courseId
          );
          return enrollment?.progress.overall || 0;
        },

        clearCache: () =>
          set((state) => {
            state.lastFetchedAt = null;
          }),

        reset: () =>
          set(() => {
            return initialState;
          }),
      })),
      {
        name: "aiedu-course-store",
        partialize: (state) => ({
          enrollments: state.enrollments,
          filters: state.filters,
          page: state.page,
        }),
      }
    ),
    { name: "CourseStore" }
  )
);

// Selectors
export const selectCourses = (state: CourseState) => state.courses;
export const selectCurrentCourse = (state: CourseState) => state.currentCourse;
export const selectEnrollments = (state: CourseState) => state.enrollments;
export const selectCourseFilters = (state: CourseState) => state.filters;
export const selectCoursePage = (state: CourseState) => state.page;
export const selectCourseLoading = (state: CourseState) => state.isLoading;
export const selectCourseError = (state: CourseState) => state.error;
export const selectCourseById = (id: string) => (state: CourseState) =>
  state.courses.find((c) => c.id === id);
