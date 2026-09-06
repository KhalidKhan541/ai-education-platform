import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Lesson,
  LessonProgress,
  LessonNavigation,
  LessonNote,
  LessonBookmark,
} from "@/types";

interface LessonState {
  // Current context
  currentLesson: Lesson | null;
  currentModuleId: string | null;
  currentCourseId: string | null;
  navigation: LessonNavigation | null;

  // Lessons list
  lessons: Lesson[];
  moduleLessons: Record<string, Lesson[]>;

  // Progress
  progress: Record<string, LessonProgress>;
  currentProgress: LessonProgress | null;

  // Video state
  videoPosition: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;

  // Notes
  notes: LessonNote[];
  currentNote: string;

  // Bookmarks
  bookmarks: LessonBookmark[];

  // UI state
  isContentVisible: boolean;
  isResourcesOpen: boolean;
  isDiscussionOpen: boolean;
  isNotesOpen: boolean;
  isTranscriptOpen: boolean;
  sidebarTab: "content" | "notes" | "discussion" | "resources";

  // Loading
  isLoading: boolean;
  isLoadingProgress: boolean;

  // Error
  error: string | null;

  // Actions - Current lesson
  setCurrentLesson: (lesson: Lesson | null) => void;
  setCurrentContext: (courseId: string, moduleId: string) => void;
  setNavigation: (navigation: LessonNavigation) => void;

  // Actions - Lessons
  setLessons: (lessons: Lesson[]) => void;
  setModuleLessons: (moduleId: string, lessons: Lesson[]) => void;

  // Actions - Progress
  setProgress: (lessonId: string, progress: LessonProgress) => void;
  setCurrentProgress: (progress: LessonProgress | null) => void;
  markComplete: (lessonId: string) => void;
  updateVideoProgress: (lessonId: string, position: number, duration: number) => void;

  // Actions - Video
  setVideoPosition: (position: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  setIsPiP: (pip: boolean) => void;

  // Actions - Notes
  addNote: (note: LessonNote) => void;
  updateNote: (noteId: string, content: string) => void;
  deleteNote: (noteId: string) => void;
  setCurrentNote: (content: string) => void;
  setNotes: (notes: LessonNote[]) => void;

  // Actions - Bookmarks
  addBookmark: (bookmark: LessonBookmark) => void;
  removeBookmark: (bookmarkId: string) => void;
  setBookmarks: (bookmarks: LessonBookmark[]) => void;

  // Actions - UI
  setIsContentVisible: (visible: boolean) => void;
  setIsResourcesOpen: (open: boolean) => void;
  setIsDiscussionOpen: (open: boolean) => void;
  setIsNotesOpen: (open: boolean) => void;
  setIsTranscriptOpen: (open: boolean) => void;
  setSidebarTab: (tab: LessonState["sidebarTab"]) => void;

  // Actions - Loading/Error
  setIsLoading: (loading: boolean) => void;
  setIsLoadingProgress: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Helpers
  getLessonById: (id: string) => Lesson | undefined;
  isLessonCompleted: (id: string) => boolean;
  getLessonProgress: (id: string) => LessonProgress | undefined;
  getNextLesson: () => Lesson | null;
  getPreviousLesson: () => Lesson | null;
  getModuleLessons: (moduleId: string) => Lesson[];
  getTotalWatchTime: () => number;
  reset: () => void;
}

const initialState = {
  currentLesson: null,
  currentModuleId: null,
  currentCourseId: null,
  navigation: null,
  lessons: [],
  moduleLessons: {},
  progress: {},
  currentProgress: null,
  videoPosition: 0,
  isPlaying: false,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  isPiP: false,
  notes: [],
  currentNote: "",
  bookmarks: [],
  isContentVisible: true,
  isResourcesOpen: false,
  isDiscussionOpen: false,
  isNotesOpen: false,
  isTranscriptOpen: false,
  sidebarTab: "content" as const,
  isLoading: false,
  isLoadingProgress: false,
  error: null,
};

export const useLessonStore = create<LessonState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Current lesson
        setCurrentLesson: (lesson) =>
          set((state) => {
            state.currentLesson = lesson;
            if (lesson) {
              state.currentNote = "";
            }
          }),

        setCurrentContext: (courseId, moduleId) =>
          set((state) => {
            state.currentCourseId = courseId;
            state.currentModuleId = moduleId;
          }),

        setNavigation: (navigation) =>
          set((state) => {
            state.navigation = navigation;
          }),

        // Lessons
        setLessons: (lessons) =>
          set((state) => {
            state.lessons = lessons;
          }),

        setModuleLessons: (moduleId, lessons) =>
          set((state) => {
            state.moduleLessons[moduleId] = lessons;
          }),

        // Progress
        setProgress: (lessonId, progress) =>
          set((state) => {
            state.progress[lessonId] = progress;
          }),

        setCurrentProgress: (progress) =>
          set((state) => {
            state.currentProgress = progress;
          }),

        markComplete: (lessonId) =>
          set((state) => {
            const existing = state.progress[lessonId];
            if (existing) {
              existing.status = "completed";
              existing.completedAt = new Date().toISOString();
              existing.isCompleted = true;
            } else {
              state.progress[lessonId] = {
                lessonId,
                userId: "",
                status: "completed",
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                lastAccessedAt: new Date().toISOString(),
                videoPosition: 0,
                videoWatchedPercentage: 100,
                timeSpent: 0,
                notes: [],
                bookmarks: [],
                completionCriteria: {
                  requireVideoWatch: false,
                  requireVideoPercentage: 100,
                  requireQuiz: false,
                  requireAssignment: false,
                  requireManualMarking: false,
                },
                isCompleted: true,
              };
            }
          }),

        updateVideoProgress: (lessonId, position, duration) =>
          set((state) => {
            const existing = state.progress[lessonId];
            if (existing) {
              existing.videoPosition = position;
              existing.videoWatchedPercentage =
                duration > 0 ? (position / duration) * 100 : 0;
              existing.lastAccessedAt = new Date().toISOString();
            }
          }),

        // Video
        setVideoPosition: (position) =>
          set((state) => {
            state.videoPosition = position;
          }),

        setIsPlaying: (playing) =>
          set((state) => {
            state.isPlaying = playing;
          }),

        setPlaybackRate: (rate) =>
          set((state) => {
            state.playbackRate = rate;
          }),

        setVolume: (volume) =>
          set((state) => {
            state.volume = Math.max(0, Math.min(1, volume));
          }),

        setIsMuted: (muted) =>
          set((state) => {
            state.isMuted = muted;
          }),

        setIsFullscreen: (fullscreen) =>
          set((state) => {
            state.isFullscreen = fullscreen;
          }),

        setIsPiP: (pip) =>
          set((state) => {
            state.isPiP = pip;
          }),

        // Notes
        addNote: (note) =>
          set((state) => {
            state.notes.unshift(note);
          }),

        updateNote: (noteId, content) =>
          set((state) => {
            const note = state.notes.find((n) => n.id === noteId);
            if (note) {
              note.content = content;
              note.updatedAt = new Date().toISOString();
            }
          }),

        deleteNote: (noteId) =>
          set((state) => {
            state.notes = state.notes.filter((n) => n.id !== noteId);
          }),

        setCurrentNote: (content) =>
          set((state) => {
            state.currentNote = content;
          }),

        setNotes: (notes) =>
          set((state) => {
            state.notes = notes;
          }),

        // Bookmarks
        addBookmark: (bookmark) =>
          set((state) => {
            state.bookmarks.push(bookmark);
          }),

        removeBookmark: (bookmarkId) =>
          set((state) => {
            state.bookmarks = state.bookmarks.filter(
              (b) => b.id !== bookmarkId
            );
          }),

        setBookmarks: (bookmarks) =>
          set((state) => {
            state.bookmarks = bookmarks;
          }),

        // UI
        setIsContentVisible: (visible) =>
          set((state) => {
            state.isContentVisible = visible;
          }),

        setIsResourcesOpen: (open) =>
          set((state) => {
            state.isResourcesOpen = open;
          }),

        setIsDiscussionOpen: (open) =>
          set((state) => {
            state.isDiscussionOpen = open;
          }),

        setIsNotesOpen: (open) =>
          set((state) => {
            state.isNotesOpen = open;
          }),

        setIsTranscriptOpen: (open) =>
          set((state) => {
            state.isTranscriptOpen = open;
          }),

        setSidebarTab: (tab) =>
          set((state) => {
            state.sidebarTab = tab;
          }),

        // Loading/Error
        setIsLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setIsLoadingProgress: (loading) =>
          set((state) => {
            state.isLoadingProgress = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        // Helpers
        getLessonById: (id) => {
          return get().lessons.find((l) => l.id === id);
        },

        isLessonCompleted: (id) => {
          const p = get().progress[id];
          return p?.isCompleted || p?.status === "completed" || false;
        },

        getLessonProgress: (id) => {
          return get().progress[id];
        },

        getNextLesson: () => {
          const { navigation } = get();
          if (!navigation?.next) return null;
          const lesson = get().lessons.find(
            (l) => l.id === navigation.next!.id
          );
          return lesson || null;
        },

        getPreviousLesson: () => {
          const { navigation } = get();
          if (!navigation?.previous) return null;
          const lesson = get().lessons.find(
            (l) => l.id === navigation.previous!.id
          );
          return lesson || null;
        },

        getModuleLessons: (moduleId) => {
          return get().moduleLessons[moduleId] || [];
        },

        getTotalWatchTime: () => {
          const { progress } = get();
          return Object.values(progress).reduce(
            (total, p) => total + (p.timeSpent || 0),
            0
          );
        },

        reset: () =>
          set(() => {
            return initialState;
          }),
      })),
      {
        name: "aiedu-lesson-store",
        partialize: (state) => ({
          progress: state.progress,
          videoPosition: state.videoPosition,
          playbackRate: state.playbackRate,
          volume: state.volume,
          isMuted: state.isMuted,
          notes: state.notes,
          bookmarks: state.bookmarks,
        }),
      }
    ),
    { name: "LessonStore" }
  )
);

// Selectors
export const selectCurrentLesson = (state: LessonState) => state.currentLesson;
export const selectLessonProgress = (state: LessonState) => state.progress;
export const selectLessonNavigation = (state: LessonState) => state.navigation;
export const selectVideoState = (state: LessonState) => ({
  position: state.videoPosition,
  isPlaying: state.isPlaying,
  playbackRate: state.playbackRate,
  volume: state.volume,
  isMuted: state.isMuted,
  isFullscreen: state.isFullscreen,
});
export const selectNotes = (state: LessonState) => state.notes;
export const selectBookmarks = (state: LessonState) => state.bookmarks;
export const selectLessonLoading = (state: LessonState) => state.isLoading;
