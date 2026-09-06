import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

interface QuizQuestion {
  id: string;
  question: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  options?: Array<{ id: string; text: string }>;
  points: number;
}

interface QuizPlayerProps {
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  onSubmit?: (answers: Record<string, unknown>) => void;
}

function QuizPlayer({
  title,
  questions,
  timeLimit,
  maxAttempts = 3,
  passingScore = 70,
  onSubmit,
}: QuizPlayerProps) {
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [timeLeft, setTimeLeft] = React.useState(timeLimit ? timeLimit * 60 : 0);
  const [submitted, setSubmitted] = React.useState(false);
  const [score, setScore] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!timeLimit || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLimit, submitted]);

  const handleAnswer = (questionId: string, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    let correct = 0;
    let total = 0;
    questions.forEach((q) => {
      total += q.points;
      // Simple mock grading
      if (answers[q.id]) correct += q.points;
    });
    const finalScore = total > 0 ? (correct / total) * 100 : 0;
    setScore(finalScore);
    onSubmit?.(answers);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const question = questions[currentQuestion];

  return (
    <div data-testid="quiz-player" className="quiz-player">
      <div data-testid="quiz-header" className="header">
        <h2 data-testid="quiz-title">{title}</h2>
        <span data-testid="question-counter">
          Question {currentQuestion + 1} of {questions.length}
        </span>
        {timeLimit && (
          <span data-testid="timer" className={timeLeft < 60 ? "warning" : ""}>
            {formatTime(timeLeft)}
          </span>
        )}
        <span data-testid="max-attempts">Max attempts: {maxAttempts}</span>
      </div>

      {!submitted && question && (
        <div data-testid="question-container" className="question">
          <p data-testid="question-text">
            {question.question}
            <span data-testid="question-points"> ({question.points} pts)</span>
          </p>

          {question.type === "MULTIPLE_CHOICE" && question.options && (
            <div data-testid="multiple-choice-options" className="options">
              {question.options.map((opt) => (
                <label key={opt.id} className="option">
                  <input
                    type="radio"
                    name={question.id}
                    value={opt.id}
                    checked={answers[question.id] === opt.id}
                    onChange={() => handleAnswer(question.id, opt.id)}
                    data-testid={`option-${opt.id}`}
                  />
                  {opt.text}
                </label>
              ))}
            </div>
          )}

          {question.type === "TRUE_FALSE" && (
            <div data-testid="true-false-options">
              <label>
                <input
                  type="radio"
                  name={question.id}
                  value="true"
                  checked={answers[question.id] === "true"}
                  onChange={() => handleAnswer(question.id, "true")}
                  data-testid="option-true"
                />
                True
              </label>
              <label>
                <input
                  type="radio"
                  name={question.id}
                  value="false"
                  checked={answers[question.id] === "false"}
                  onChange={() => handleAnswer(question.id, "false")}
                  data-testid="option-false"
                />
                False
              </label>
            </div>
          )}

          {question.type === "SHORT_ANSWER" && (
            <input
              data-testid="short-answer-input"
              type="text"
              value={(answers[question.id] as string) ?? ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              placeholder="Type your answer..."
            />
          )}
        </div>
      )}

      {submitted && score !== null && (
        <div data-testid="results" className="results">
          <h3 data-testid="score">Score: {score.toFixed(1)}%</h3>
          <p data-testid="pass-status">
            {score >= passingScore ? "Passed!" : "Not passed"}
          </p>
          <p data-testid="passing-score">Passing score: {passingScore}%</p>
        </div>
      )}

      <div data-testid="quiz-controls" className="controls">
        {!submitted && (
          <>
            <button
              data-testid="prev-question"
              onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </button>
            <button
              data-testid="next-question"
              onClick={() => setCurrentQuestion((p) => Math.min(questions.length - 1, p + 1))}
              disabled={currentQuestion === questions.length - 1}
            >
              Next
            </button>
            <button data-testid="submit-quiz" onClick={handleSubmit}>
              Submit Quiz
            </button>
          </>
        )}
      </div>
    </div>
  );
}

describe("QuizPlayer", () => {
  const mockQuestions: QuizQuestion[] = [
    {
      id: "q1",
      question: "What is 2 + 2?",
      type: "MULTIPLE_CHOICE",
      options: [
        { id: "a", text: "3" },
        { id: "b", text: "4" },
        { id: "c", text: "5" },
      ],
      points: 5,
    },
    {
      id: "q2",
      question: "The sky is blue.",
      type: "TRUE_FALSE",
      points: 3,
    },
    {
      id: "q3",
      question: "What is the capital of France?",
      type: "SHORT_ANSWER",
      points: 2,
    },
  ];

  it("should render quiz title", () => {
    render(<QuizPlayer title="Math Quiz" questions={mockQuestions} />);
    expect(screen.getByTestId("quiz-title")).toHaveTextContent("Math Quiz");
  });

  it("should show question counter", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    expect(screen.getByTestId("question-counter")).toHaveTextContent("Question 1 of 3");
  });

  it("should render first question", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    expect(screen.getByTestId("question-text")).toHaveTextContent("What is 2 + 2?");
  });

  it("should render multiple choice options", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    expect(screen.getByTestId("multiple-choice-options")).toBeInTheDocument();
    expect(screen.getByTestId("option-a")).toBeInTheDocument();
    expect(screen.getByTestId("option-b")).toBeInTheDocument();
  });

  it("should select an answer", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    fireEvent.click(screen.getByTestId("option-b"));
    expect(screen.getByTestId("option-b")).toBeChecked();
  });

  it("should navigate to next question", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    fireEvent.click(screen.getByTestId("next-question"));
    expect(screen.getByTestId("question-counter")).toHaveTextContent("Question 2 of 3");
    expect(screen.getByTestId("question-text")).toHaveTextContent("The sky is blue.");
  });

  it("should navigate to previous question", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    fireEvent.click(screen.getByTestId("next-question"));
    fireEvent.click(screen.getByTestId("prev-question"));
    expect(screen.getByTestId("question-counter")).toHaveTextContent("Question 1 of 3");
  });

  it("should disable prev button on first question", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    expect(screen.getByTestId("prev-question")).toBeDisabled();
  });

  it("should disable next button on last question", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    fireEvent.click(screen.getByTestId("next-question"));
    fireEvent.click(screen.getByTestId("next-question"));
    expect(screen.getByTestId("next-question")).toBeDisabled();
  });

  it("should submit quiz and show results", () => {
    const onSubmit = jest.fn();
    render(<QuizPlayer title="Quiz" questions={mockQuestions} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId("submit-quiz"));
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByTestId("results")).toBeInTheDocument();
    expect(screen.getByTestId("score")).toBeInTheDocument();
  });

  it("should show pass/fail status", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    fireEvent.click(screen.getByTestId("submit-quiz"));
    expect(screen.getByTestId("pass-status")).toBeInTheDocument();
    expect(screen.getByTestId("passing-score")).toHaveTextContent("Passing score: 70%");
  });

  it("should show timer when timeLimit is set", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} timeLimit={10} />);
    expect(screen.getByTestId("timer")).toBeInTheDocument();
  });

  it("should not show timer when no timeLimit", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    expect(screen.queryByTestId("timer")).not.toBeInTheDocument();
  });

  it("should display max attempts", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} maxAttempts={5} />);
    expect(screen.getByTestId("max-attempts")).toHaveTextContent("Max attempts: 5");
  });

  it("should handle true/false question", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    fireEvent.click(screen.getByTestId("next-question"));
    expect(screen.getByTestId("true-false-options")).toBeInTheDocument();
    expect(screen.getByTestId("option-true")).toBeInTheDocument();
    expect(screen.getByTestId("option-false")).toBeInTheDocument();
  });

  it("should handle short answer question", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    fireEvent.click(screen.getByTestId("next-question"));
    fireEvent.click(screen.getByTestId("next-question"));
    expect(screen.getByTestId("short-answer-input")).toBeInTheDocument();
  });

  it("should display question points", () => {
    render(<QuizPlayer title="Quiz" questions={mockQuestions} />);
    expect(screen.getByTestId("question-points")).toHaveTextContent("(5 pts)");
  });
});
