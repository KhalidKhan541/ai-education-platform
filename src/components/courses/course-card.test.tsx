import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

interface CourseCardProps {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  instructor: { name: string; image?: string };
  price: number;
  currency?: string;
  level: string;
  enrollmentCount?: number;
  rating?: number;
  reviewCount?: number;
  isPublished?: boolean;
  onClick?: (id: string) => void;
}

function CourseCard({
  id,
  title,
  description,
  thumbnail,
  instructor,
  price,
  currency = "USD",
  level,
  enrollmentCount = 0,
  rating = 0,
  reviewCount = 0,
  isPublished = true,
  onClick,
}: CourseCardProps) {
  const formatPrice = (p: number, c: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
    }).format(p);
  };

  return (
    <div
      data-testid={`course-card-${id}`}
      className="course-card"
      onClick={() => onClick?.(id)}
      role="article"
      tabIndex={0}
    >
      <div data-testid="thumbnail" className="thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={title} />
        ) : (
          <div className="placeholder">No image</div>
        )}
      </div>

      <div className="content">
        <span data-testid="level" className={`level badge-${level.toLowerCase()}`}>
          {level}
        </span>

        <h3 data-testid="title">{title}</h3>

        {description && (
          <p data-testid="description">{description.length > 100 ? `${description.slice(0, 100)}...` : description}</p>
        )}

        <div data-testid="instructor" className="instructor">
          {instructor.image && <img src={instructor.image} alt={instructor.name} />}
          <span>{instructor.name}</span>
        </div>

        <div className="meta">
          <span data-testid="rating">
            {rating > 0 ? `${rating.toFixed(1)} (${reviewCount} reviews)` : "No reviews"}
          </span>
          <span data-testid="enrollment-count">{enrollmentCount} students</span>
        </div>

        <div className="footer">
          <span data-testid="price" className="price">
            {price === 0 ? "Free" : formatPrice(price, currency)}
          </span>
          {!isPublished && <span className="badge-draft">Draft</span>}
        </div>
      </div>
    </div>
  );
}

describe("CourseCard", () => {
  const defaultProps: CourseCardProps = {
    id: "course-1",
    title: "Introduction to React",
    description: "Learn React from scratch with hands-on projects",
    thumbnail: "https://example.com/thumb.jpg",
    instructor: { name: "John Doe", image: "https://example.com/john.jpg" },
    price: 49.99,
    currency: "USD",
    level: "BEGINNER",
    enrollmentCount: 1250,
    rating: 4.7,
    reviewCount: 320,
    isPublished: true,
  };

  it("should render course title", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByTestId("title")).toHaveTextContent("Introduction to React");
  });

  it("should render course description", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByTestId("description")).toHaveTextContent("Learn React from scratch");
  });

  it("should render thumbnail image", () => {
    render(<CourseCard {...defaultProps} />);
    const img = screen.getByTestId("thumbnail").querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");
    expect(img).toHaveAttribute("alt", "Introduction to React");
  });

  it("should render placeholder when no thumbnail", () => {
    render(<CourseCard {...defaultProps} thumbnail={undefined} />);
    expect(screen.getByText("No image")).toBeInTheDocument();
  });

  it("should render instructor name", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByTestId("instructor")).toHaveTextContent("John Doe");
  });

  it("should render instructor image", () => {
    render(<CourseCard {...defaultProps} />);
    const img = screen.getByTestId("instructor").querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/john.jpg");
  });

  it("should render price formatted", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByTestId("price")).toHaveTextContent("$49.99");
  });

  it("should render Free for zero price", () => {
    render(<CourseCard {...defaultProps} price={0} />);
    expect(screen.getByTestId("price")).toHaveTextContent("Free");
  });

  it("should render level badge", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByTestId("level")).toHaveTextContent("BEGINNER");
  });

  it("should render enrollment count", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByTestId("enrollment-count")).toHaveTextContent("1250 students");
  });

  it("should render rating", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByTestId("rating")).toHaveTextContent("4.7 (320 reviews)");
  });

  it("should render No reviews when rating is 0", () => {
    render(<CourseCard {...defaultProps} rating={0} />);
    expect(screen.getByTestId("rating")).toHaveTextContent("No reviews");
  });

  it("should call onClick when clicked", () => {
    const onClick = jest.fn();
    render(<CourseCard {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId("course-card-course-1"));
    expect(onClick).toHaveBeenCalledWith("course-1");
  });

  it("should not crash without onClick", () => {
    render(<CourseCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("course-card-course-1"));
  });

  it("should render Draft badge when not published", () => {
    render(<CourseCard {...defaultProps} isPublished={false} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("should truncate long descriptions", () => {
    const longDesc = "A".repeat(150);
    render(<CourseCard {...defaultProps} description={longDesc} />);
    const desc = screen.getByTestId("description");
    expect(desc.textContent?.length).toBeLessThan(150);
    expect(desc.textContent).toContain("...");
  });

  it("should be keyboard accessible", () => {
    render(<CourseCard {...defaultProps} />);
    const card = screen.getByTestId("course-card-course-1");
    expect(card).toHaveAttribute("tabIndex", "0");
    expect(card).toHaveAttribute("role", "article");
  });

  it("should render with different currency", () => {
    render(<CourseCard {...defaultProps} price={39.99} currency="EUR" />);
    expect(screen.getByTestId("price")).toHaveTextContent("€39.99");
  });
});
