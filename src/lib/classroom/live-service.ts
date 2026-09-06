import { z } from "zod";
import { getAIClient, type AIMessage } from "../ai/provider";

// ─── Types ───────────────────────────────────────────────────────────────────

export const SessionStatusSchema = z.enum([
  "scheduled",
  "waiting",
  "live",
  "paused",
  "ended",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ParticipantRoleSchema = z.enum([
  "host",
  "co_host",
  "instructor",
  "student",
  "observer",
]);
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

export interface LiveSession {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructorId: string;
  status: SessionStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  maxParticipants: number;
  isRecorded: boolean;
  recordingUrl?: string;
  settings: SessionSettings;
  whiteboard: WhiteboardState;
  participants: Participant[];
  breakoutRooms: BreakoutRoom[];
  chat: ChatMessage[];
  polls: Poll[];
  raisedHands: RaisedHand[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionSettings {
  allowStudentMic: boolean;
  allowStudentVideo: boolean;
  allowStudentScreenShare: boolean;
  allowStudentChat: boolean;
  allowStudentWhiteboard: boolean;
  enableBreakoutRooms: boolean;
  enableRecording: boolean;
  enableReactions: boolean;
  enableHandRaise: boolean;
  muteOnJoin: boolean;
  maxChatMessageLength: number;
}

export interface Participant {
  id: string;
  userId: string;
  displayName: string;
  role: ParticipantRole;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: Date;
  leftAt?: Date;
  speakingTimeMs: number;
  connectionQuality: "excellent" | "good" | "fair" | "poor";
  breakoutRoomId?: string;
}

export interface WhiteboardState {
  id: string;
  elements: WhiteboardElement[];
  activeTool: WhiteboardTool;
  activeUserId: string;
  width: number;
  height: number;
  background: string;
}

export type WhiteboardTool =
  | "select"
  | "pen"
  | "text"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "eraser"
  | "sticky_note"
  | "image";

export interface WhiteboardElement {
  id: string;
  type: WhiteboardTool;
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  style: ElementStyle;
}

export interface ElementStyle {
  color: string;
  strokeWidth: number;
  fillColor?: string;
  fontSize?: number;
  fontFamily?: string;
  opacity: number;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  participants: string[];
  maxParticipants: number;
  isActive: boolean;
  createdAt: Date;
  closedAt?: Date;
  duration?: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  timestamp: Date;
  isPrivate: boolean;
  recipientId?: string;
  isDeleted: boolean;
  reactions: ChatReaction[];
}

export interface ChatReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  isActive: boolean;
  allowMultiple: boolean;
  anonymous: boolean;
  createdAt: Date;
  closedAt?: Date;
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface RaisedHand {
  id: string;
  userId: string;
  displayName: string;
  timestamp: Date;
  message?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface ScreenShareState {
  isActive: boolean;
  userId: string;
  displayName: string;
  startedAt: Date;
  streamId?: string;
}

export interface RecordingState {
  isRecording: boolean;
  startedAt?: Date;
  duration: number;
  recordingId?: string;
}
