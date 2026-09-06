import nodemailer, { Transporter, SendMailOptions } from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || `AI Education Platform <${SMTP_USER}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }
  return transporter;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const transport = getTransporter();
    const options: SendMailOptions = {
      from: SMTP_FROM,
      to: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || stripHtml(params.html),
      attachments: params.attachments,
      replyTo: params.replyTo,
      cc: params.cc
        ? Array.isArray(params.cc)
          ? params.cc.join(", ")
          : params.cc
        : undefined,
      bcc: params.bcc
        ? Array.isArray(params.bcc)
          ? params.bcc.join(", ")
          : params.bcc
        : undefined,
    };
    await transport.sendMail(options);
    return true;
  } catch (error) {
    console.error("[Email] Send failed:", error);
    return false;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Education Platform</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 32px 24px; color: #333333; line-height: 1.6; }
    .content h2 { color: #1a1a2e; margin-top: 0; font-size: 20px; }
    .content p { margin: 0 0 16px; font-size: 15px; }
    .btn { display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0; }
    .info-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .footer { padding: 24px; text-align: center; color: #888888; font-size: 13px; border-top: 1px solid #eaeaea; }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI Education Platform</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>AI Education Platform &copy; ${new Date().getFullYear()}</p>
      <p><a href="${APP_URL}/settings/notifications">Notification Settings</a> | <a href="${APP_URL}/support">Support</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Email templates
export interface EnrollmentEmailData {
  studentName: string;
  courseName: string;
  instructorName: string;
  startDate: string;
  courseUrl: string;
}

export function enrollmentTemplate(data: EnrollmentEmailData): string {
  const content = `
    <h2>Welcome to ${data.courseName}!</h2>
    <p>Hi ${data.studentName},</p>
    <p>Congratulations! You've been successfully enrolled in <strong>${data.courseName}</strong>.</p>
    <div class="info-box">
      <p><strong>Instructor:</strong> ${data.instructorName}</p>
      <p><strong>Start Date:</strong> ${data.startDate}</p>
    </div>
    <p>Here's what you can do to get started:</p>
    <ul>
      <li>Review the course syllabus and materials</li>
      <li>Complete the introductory module</li>
      <li>Introduce yourself in the course discussion forum</li>
    </ul>
    <p style="text-align: center;">
      <a href="${data.courseUrl}" class="btn">Start Learning</a>
    </p>
    <p>If you have any questions, don't hesitate to reach out to your instructor or our support team.</p>
  `;
  return baseTemplate(content);
}

export interface AssignmentEmailData {
  studentName: string;
  assignmentTitle: string;
  courseName: string;
  dueDate: string;
  maxScore: number;
  assignmentUrl: string;
  type: "new" | "reminder" | "graded";
  grade?: number;
  feedback?: string;
}

export function assignmentTemplate(data: AssignmentEmailData): string {
  let content = "";

  switch (data.type) {
    case "new":
      content = `
        <h2>New Assignment Available</h2>
        <p>Hi ${data.studentName},</p>
        <p>A new assignment has been posted in <strong>${data.courseName}</strong>.</p>
        <div class="info-box">
          <p><strong>Assignment:</strong> ${data.assignmentTitle}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
          <p><strong>Max Score:</strong> ${data.maxScore} points</p>
        </div>
        <p style="text-align: center;">
          <a href="${data.assignmentUrl}" class="btn">View Assignment</a>
        </p>
      `;
      break;
    case "reminder":
      content = `
        <h2>Assignment Due Soon</h2>
        <p>Hi ${data.studentName},</p>
        <p>This is a friendly reminder that <strong>${data.assignmentTitle}</strong> is due soon.</p>
        <div class="info-box">
          <p><strong>Course:</strong> ${data.courseName}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
        </div>
        <p style="text-align: center;">
          <a href="${data.assignmentUrl}" class="btn">Submit Now</a>
        </p>
      `;
      break;
    case "graded":
      content = `
        <h2>Assignment Graded</h2>
        <p>Hi ${data.studentName},</p>
        <p>Your submission for <strong>${data.assignmentTitle}</strong> has been graded.</p>
        <div class="info-box">
          <p><strong>Score:</strong> ${data.grade} / ${data.maxScore}</p>
          ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ""}
        </div>
        <p style="text-align: center;">
          <a href="${data.assignmentUrl}" class="btn">View Results</a>
        </p>
      `;
      break;
  }
  return baseTemplate(content);
}

export interface CertificateEmailData {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateUrl: string;
  grade?: string;
  instructorName: string;
}

export function certificateTemplate(data: CertificateEmailData): string {
  const content = `
    <h2>Congratulations! 🎓</h2>
    <p>Hi ${data.studentName},</p>
    <p>We're thrilled to inform you that you've successfully completed <strong>${data.courseName}</strong>!</p>
    <div class="info-box">
      <p><strong>Course:</strong> ${data.courseName}</p>
      <p><strong>Instructor:</strong> ${data.instructorName}</p>
      <p><strong>Completion Date:</strong> ${data.completionDate}</p>
      ${data.grade ? `<p><strong>Final Grade:</strong> ${data.grade}</p>` : ""}
    </div>
    <p>Your certificate is ready! You can view and download it from your dashboard.</p>
    <p style="text-align: center;">
      <a href="${data.certificateUrl}" class="btn">View Certificate</a>
    </p>
    <p>Share your achievement with your professional network and keep building your skills!</p>
  `;
  return baseTemplate(content);
}

export function welcomeTemplate(userName: string): string {
  const content = `
    <h2>Welcome aboard!</h2>
    <p>Hi ${userName},</p>
    <p>Welcome to AI Education Platform! We're excited to have you join our community of learners.</p>
    <p>Here's what you can do to get started:</p>
    <ul>
      <li>Complete your profile</li>
      <li>Browse our course catalog</li>
      <li>Set your learning goals</li>
    </ul>
    <p style="text-align: center;">
      <a href="${APP_URL}/courses" class="btn">Explore Courses</a>
    </p>
  `;
  return baseTemplate(content);
}

export function passwordResetTemplate(
  userName: string,
  resetUrl: string
): string {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
  `;
  return baseTemplate(content);
}

export function verificationTemplate(
  userName: string,
  verificationUrl: string
): string {
  const content = `
    <h2>Verify Your Email</h2>
    <p>Hi ${userName},</p>
    <p>Please verify your email address to complete your registration.</p>
    <p style="text-align: center;">
      <a href="${verificationUrl}" class="btn">Verify Email</a>
    </p>
    <p>This link will expire in 24 hours.</p>
  `;
  return baseTemplate(content);
}

// Bulk email
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const success = await sendEmail({ to: recipient, subject, html });
    if (success) sent++;
    else failed++;
  }

  return { sent, failed };
}

// Email verification
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch {
    return false;
  }
}
