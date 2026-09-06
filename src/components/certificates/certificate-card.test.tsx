import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

interface CertificateCardProps {
  id: string;
  certificateNumber: string;
  courseName: string;
  issuedAt: string | Date;
  expiresAt?: string | Date | null;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  userName: string;
  onVerify?: (id: string) => void;
  onDownload?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

function CertificateCard({
  id,
  certificateNumber,
  courseName,
  issuedAt,
  expiresAt,
  status,
  userName,
  onVerify,
  onDownload,
  onRevoke,
}: CertificateCardProps) {
  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const displayStatus = isExpired ? "EXPIRED" : status;

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    REVOKED: "bg-red-100 text-red-800",
    EXPIRED: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div data-testid={`certificate-card-${id}`} className="certificate-card">
      <div data-testid="certificate-header" className="header">
        <div data-testid="certificate-icon">🎓</div>
        <div>
          <h3 data-testid="course-name">{courseName}</h3>
          <p data-testid="user-name">{userName}</p>
        </div>
      </div>

      <div data-testid="certificate-details" className="details">
        <div className="detail-row">
          <span className="label">Certificate No:</span>
          <span data-testid="certificate-number">{certificateNumber}</span>
        </div>
        <div className="detail-row">
          <span className="label">Issued:</span>
          <span data-testid="issued-date">{formatDate(issuedAt)}</span>
        </div>
        {expiresAt && (
          <div className="detail-row">
            <span className="label">Expires:</span>
            <span data-testid="expiry-date">{formatDate(expiresAt)}</span>
          </div>
        )}
      </div>

      <div data-testid="certificate-footer" className="footer">
        <span data-testid="status-badge" className={`badge ${statusColors[displayStatus]}`}>
          {displayStatus}
        </span>

        <div className="actions">
          {status === "ACTIVE" && (
            <>
              <button
                data-testid="verify-button"
                onClick={() => onVerify?.(id)}
              >
                Verify
              </button>
              <button
                data-testid="download-button"
                onClick={() => onDownload?.(id)}
              >
                Download
              </button>
            </>
          )}

          {status === "ACTIVE" && onRevoke && (
            <button
              data-testid="revoke-button"
              onClick={() => onRevoke?.(id)}
              className="revoke"
            >
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

describe("CertificateCard", () => {
  const defaultProps: CertificateCardProps = {
    id: "cert-1",
    certificateNumber: "CERT-ABC123XYZ",
    courseName: "Advanced React Patterns",
    issuedAt: "2026-01-15",
    expiresAt: "2027-01-15",
    status: "ACTIVE",
    userName: "Jane Smith",
  };

  it("should render course name", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("course-name")).toHaveTextContent("Advanced React Patterns");
  });

  it("should render user name", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("user-name")).toHaveTextContent("Jane Smith");
  });

  it("should render certificate number", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("certificate-number")).toHaveTextContent("CERT-ABC123XYZ");
  });

  it("should render issued date", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("issued-date")).toHaveTextContent("January 15, 2026");
  });

  it("should render expiry date", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("expiry-date")).toHaveTextContent("January 15, 2027");
  });

  it("should render ACTIVE status", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("ACTIVE");
  });

  it("should render REVOKED status", () => {
    render(<CertificateCard {...defaultProps} status="REVOKED" />);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("REVOKED");
  });

  it("should show EXPIRED if past expiry date", () => {
    render(
      <CertificateCard
        {...defaultProps}
        expiresAt="2020-01-01"
      />
    );
    expect(screen.getByTestId("status-badge")).toHaveTextContent("EXPIRED");
  });

  it("should render verify button for active certificates", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("verify-button")).toBeInTheDocument();
  });

  it("should render download button for active certificates", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("download-button")).toBeInTheDocument();
  });

  it("should not render verify/download for revoked certificates", () => {
    render(<CertificateCard {...defaultProps} status="REVOKED" />);
    expect(screen.queryByTestId("verify-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("download-button")).not.toBeInTheDocument();
  });

  it("should call onVerify when verify clicked", () => {
    const onVerify = jest.fn();
    render(<CertificateCard {...defaultProps} onVerify={onVerify} />);
    fireEvent.click(screen.getByTestId("verify-button"));
    expect(onVerify).toHaveBeenCalledWith("cert-1");
  });

  it("should call onDownload when download clicked", () => {
    const onDownload = jest.fn();
    render(<CertificateCard {...defaultProps} onDownload={onDownload} />);
    fireEvent.click(screen.getByTestId("download-button"));
    expect(onDownload).toHaveBeenCalledWith("cert-1");
  });

  it("should call onRevoke when revoke clicked", () => {
    const onRevoke = jest.fn();
    render(<CertificateCard {...defaultProps} onRevoke={onRevoke} />);
    fireEvent.click(screen.getByTestId("revoke-button"));
    expect(onRevoke).toHaveBeenCalledWith("cert-1");
  });

  it("should not render revoke button without onRevoke", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.queryByTestId("revoke-button")).not.toBeInTheDocument();
  });

  it("should render certificate icon", () => {
    render(<CertificateCard {...defaultProps} />);
    expect(screen.getByTestId("certificate-icon")).toHaveTextContent("🎓");
  });

  it("should hide expiry date when null", () => {
    render(<CertificateCard {...defaultProps} expiresAt={null} />);
    expect(screen.queryByTestId("expiry-date")).not.toBeInTheDocument();
  });
});
