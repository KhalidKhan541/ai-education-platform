import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

interface Lesson {
  id: string;
  title: string;
  type: "VIDEO" | "TEXT" | "INTERACTIVE" | "QUIZ" | "ASSIGNMENT";
  content?: string;
  videoUrl?: string;
  duration?: number;
  isCompleted?: boolean;
}

interface LessonPlayerProps {
  lesson: Lesson;
  onComplete?: (lessonId: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

function LessonPlayer({
  lesson,
  onComplete,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: LessonPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [completed, setCompleted] = React.useState(lesson.isCompleted ?? false);

  const handleComplete = () => {
    setCompleted(true);
    onComplete?.(lesson.id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div data-testid="lesson-player" className="lesson-player">
      <div data-testid="lesson-header" className="header">
        <h2 data-testid="lesson-title">{lesson.title}</h2>
        <span data-testid="lesson-type">{lesson.type}</span>
        {lesson.duration && (
          <span data-testid="lesson-duration">{formatDuration(lesson.duration)}</span>
        )}
        {completed && <span data-testid="completed-badge">Completed</span>}
      </div>

      <div data-testid="lesson-content" className="content">
        {lesson.type === "VIDEO" && lesson.videoUrl && (
          <div data-testid="video-player" className="video-container">
            <video src={lesson.videoUrl} data-testid="video-element" />
            <button
              data-testid="play-button"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
        )}

        {lesson.type === "TEXT" && lesson.content && (
          <div data-testid="text-content" className="prose">
            {lesson.content}
          </div>
        )}

        {lesson.type === "INTERACTIVE" && (
          <div data-testid="interactive-content">
            Interactive content placeholder
          </div>
        )}

        {lesson.type === "QUIZ" && (
          <div data-testid="quiz-content">
            Quiz lesson - <button data-testid="start-quiz">Start Quiz</button>
          </div>
        )}

        {lesson.type === "ASSIGNMENT" && (
          <div data-testid="assignment-content">
            Assignment lesson - <button data-testid="view-assignment">View Assignment</button>
          </div>
        )}
      </div>

      <div data-testid="lesson-controls" className="controls">
        <button
          data-testid="previous-button"
          onClick={onPrevious}
          disabled={!hasPrevious}
        >
          Previous
        </button>

        {!completed && (
          <button data-testid="complete-button" onClick={handleComplete}>
            Mark Complete
          </button>
        )}

        <button
          data-testid="next-button"
          onClick={onNext}
          disabled={!hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

describe("LessonPlayer", () => {
  const textLesson: Lesson = {
    id: "lesson-1",
    title: "Introduction to Variables",
    type: "TEXT",
    content: "Variables are containers for storing data values in JavaScript.",
    duration: 300,
    isCompleted: false,
  };

  const videoLesson: Lesson = {
    id: "lesson-2",
    title: "Video Tutorial",
    type: "VIDEO",
    videoUrl: "https://example.com/video.mp4",
    duration: 600,
  };

  it("should render lesson title", () => {
    render(<LessonPlayer lesson={textLesson} />);
    expect(screen.getByTestId("lesson-title")).toHaveTextContent("Introduction to Variables");
  });

  it("should render lesson type", () => {
    render(<LessonPlayer lesson={textLesson} />);
    expect(screen.getByTestId("lesson-type")).toHaveTextContent("TEXT");
  });

  it("should render formatted duration", () => {
    render(<LessonPlayer lesson={textLesson} />);
    expect(screen.getByTestId("lesson-duration")).toHaveTextContent("5:00");
  });

  it("should render text content", () => {
    render(<LessonPlayer lesson={textLesson} />);
    expect(screen.getByTestId("text-content")).toHaveTextContent("Variables are containers");
  });

  it("should render video player for VIDEO type", () => {
    render(<LessonPlayer lesson={videoLesson} />);
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
    expect(screen.getByTestId("video-element")).toHaveAttribute("src", "https://example.com/video.mp4");
  });

  it("should toggle play/pause", () => {
    render(<LessonPlayer lesson={videoLesson} />);
    const playBtn = screen.getByTestId("play-button");
    expect(playBtn).toHaveTextContent("Play");

    fireEvent.click(playBtn);
    expect(playBtn).toHaveTextContent("Pause");

    fireEvent.click(playBtn);
    expect(playBtn).toHaveTextContent("Play");
  });

  it("should render interactive content placeholder", () => {
    const interactiveLesson: Lesson = { id: "l3", title: "Interactive", type: "INTERACTIVE" };
    render(<LessonPlayer lesson={interactiveLesson} />);
    expect(screen.getByTestId("interactive-content")).toBeInTheDocument();
  });

  it("should render quiz content", () => {
    const quizLesson: Lesson = { id: "l4", title: "Quiz", type: "QUIZ" };
    render(<LessonPlayer lesson={quizLesson} />);
    expect(screen.getByTestId("quiz-content")).toBeInTheDocument();
    expect(screen.getByTestId("start-quiz")).toBeInTheDocument();
  });

  it("should render assignment content", () => {
    const assignmentLesson: Lesson = { id: "l5", title: "Assignment", type: "ASSIGNMENT" };
    render(<LessonPlayer lesson={assignmentLesson} />);
    expect(screen.getByTestId("assignment-content")).toBeInTheDocument();
    expect(screen.getByTestId("view-assignment")).toBeInTheDocument();
  });

  it("should call onComplete when marking complete", () => {
    const onComplete = jest.fn();
    render(<LessonPlayer lesson={textLesson} onComplete={onComplete} />);

    fireEvent.click(screen.getByTestId("complete-button"));
    expect(onComplete).toHaveBeenCalledWith("lesson-1");
  });

  it("should show completed badge after completing", () => {
    render(<LessonPlayer lesson={textLesson} />);
    expect(screen.queryByTestId("completed-badge")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("complete-button"));
    expect(screen.getByTestId("completed-badge")).toBeInTheDocument();
  });

  it("should not show complete button if already completed", () => {
    const completedLesson = { ...textLesson, isCompleted: true };
    render(<LessonPlayer lesson={completedLesson} />);
    expect(screen.queryByTestId("complete-button")).not.toBeInTheDocument();
  });

  it("should call onNext when clicking next", () => {
    const onNext = jest.fn();
    render(<LessonPlayer lesson={textLesson} onNext={onNext} hasNext={true} />);
    fireEvent.click(screen.getByTestId("next-button"));
    expect(onNext).toHaveBeenCalled();
  });

  it("should call onPrevious when clicking previous", () => {
    const onPrevious = jest.fn();
    render(<LessonPlayer lesson={textLesson} onPrevious={onPrevious} hasPrevious={true} />);
    fireEvent.click(screen.getByTestId("previous-button"));
    expect(onPrevious).toHaveBeenCalled();
  });

  it("should disable next button when no next lesson", () => {
    render(<LessonPlayer lesson={textLesson} hasNext={false} />);
    expect(screen.getByTestId("next-button")).toBeDisabled();
  });

  it("should disable previous button when no previous lesson", () => {
    render(<LessonPlayer lesson={textLesson} hasPrevious={false} />);
    expect(screen.getByTestId("previous-button")).toBeDisabled();
  });

  it("should enable navigation buttons when available", () => {
    render(
      <LessonPlayer
        lesson={textLesson}
        hasNext={true}
        hasPrevious={true}
      />
    );
    expect(screen.getByTestId("next-button")).not.toBeDisabled();
    expect(screen.getByTestId("previous-button")).not.toBeDisabled();
  });
});
