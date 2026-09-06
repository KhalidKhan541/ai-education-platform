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

// ─── Error Class ─────────────────────────────────────────────────────────────

export class ClassroomError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ClassroomError";
  }
}

// ─── Live Classroom Service ──────────────────────────────────────────────────

export class LiveClassroomService {
  private sessions: Map<string, LiveSession> = new Map();
  private client = getAIClient();

  createSession(
    courseId: string,
    title: string,
    instructorId: string,
    options?: {
      description?: string;
      scheduledAt?: Date;
      maxParticipants?: number;
      isRecorded?: boolean;
      settings?: Partial<SessionSettings>;
    },
  ): LiveSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const defaultSettings: SessionSettings = {
      allowStudentMic: false,
      allowStudentVideo: false,
      allowStudentScreenShare: false,
      allowStudentChat: true,
      allowStudentWhiteboard: false,
      enableBreakoutRooms: true,
      enableRecording: true,
      enableReactions: true,
      enableHandRaise: true,
      muteOnJoin: true,
      maxChatMessageLength: 1000,
    };

    const session: LiveSession = {
      id: sessionId,
      courseId,
      title,
      description: options?.description ?? "",
      instructorId,
      status: options?.scheduledAt ? "scheduled" : "waiting",
      scheduledAt: options?.scheduledAt,
      maxParticipants: options?.maxParticipants ?? 50,
      isRecorded: options?.isRecorded ?? false,
      settings: { ...defaultSettings, ...options?.settings },
      whiteboard: {
        id: `wb_${sessionId}`,
        elements: [],
        activeTool: "select",
        activeUserId: "",
        width: 1920,
        height: 1080,
        background: "#ffffff",
      },
      participants: [],
      breakoutRooms: [],
      chat: [],
      polls: [],
      raisedHands: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  startSession(sessionId: string): LiveSession {
    const session = this.getSession(sessionId);

    if (session.status !== "waiting" && session.status !== "scheduled") {
      throw new ClassroomError(
        `Cannot start session in "${session.status}" status.`,
      );
    }

    session.status = "live";
    session.startedAt = new Date();
    session.updatedAt = new Date();

    return session;
  }

  endSession(sessionId: string): LiveSession {
    const session = this.getSession(sessionId);

    session.status = "ended";
    session.endedAt = new Date();
    session.updatedAt = new Date();

    for (const room of session.breakoutRooms) {
      if (room.isActive) {
        room.isActive = false;
        room.closedAt = new Date();
      }
    }

    for (const participant of session.participants) {
      if (!participant.leftAt) {
        participant.leftAt = new Date();
      }
    }

    return session;
  }

  pauseSession(sessionId: string): LiveSession {
    const session = this.getSession(sessionId);
    if (session.status !== "live") {
      throw new ClassroomError("Can only pause a live session.");
    }
    session.status = "paused";
    session.updatedAt = new Date();
    return session;
  }

  resumeSession(sessionId: string): LiveSession {
    const session = this.getSession(sessionId);
    if (session.status !== "paused") {
      throw new ClassroomError("Can only resume a paused session.");
    }
    session.status = "live";
    session.updatedAt = new Date();
    return session;
  }

  joinSession(
    sessionId: string,
    userId: string,
    displayName: string,
    role: ParticipantRole = "student",
  ): Participant {
    const session = this.getSession(sessionId);

    if (
      session.status !== "live" &&
      session.status !== "waiting" &&
      session.status !== "scheduled"
    ) {
      throw new ClassroomError("Cannot join a session that is not active.");
    }

    const existing = session.participants.find(
      (p) => p.userId === userId && !p.leftAt,
    );
    if (existing) {
      return existing;
    }

    if (session.participants.filter((p) => !p.leftAt).length >= session.maxParticipants) {
      throw new ClassroomError("Session has reached maximum capacity.");
    }

    const participant: Participant = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      displayName,
      role,
      isMuted: session.settings.muteOnJoin,
      isVideoOn: false,
      isScreenSharing: false,
      isHandRaised: false,
      joinedAt: new Date(),
      speakingTimeMs: 0,
      connectionQuality: "good",
    };

    session.participants.push(participant);
    session.updatedAt = new Date();

    return participant;
  }

  leaveSession(sessionId: string, userId: string): void {
    const session = this.getSession(sessionId);
    const participant = session.participants.find(
      (p) => p.userId === userId && !p.leftAt,
    );

    if (participant) {
      participant.leftAt = new Date();
      session.updatedAt = new Date();

      if (participant.isScreenSharing) {
        participant.isScreenSharing = false;
      }
    }
  }

  getSession(sessionId: string): LiveSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ClassroomError(`Session "${sessionId}" not found.`);
    }
    return session;
  }

  getActiveSessions(courseId?: string): LiveSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) =>
        (s.status === "live" || s.status === "waiting") &&
        (!courseId || s.courseId === courseId),
    );
  }

  // ─── Participant Management ────────────────────────────────────────────────

  toggleMute(sessionId: string, userId: string): Participant {
    const session = this.getSession(sessionId);
    const participant = this.getParticipant(session, userId);
    participant.isMuted = !participant.isMuted;
    session.updatedAt = new Date();
    return participant;
  }

  toggleVideo(sessionId: string, userId: string): Participant {
    const session = this.getSession(sessionId);
    const participant = this.getParticipant(session, userId);
    participant.isVideoOn = !participant.isVideoOn;
    session.updatedAt = new Date();
    return participant;
  }

  toggleHandRaise(sessionId: string, userId: string): RaisedHand | null {
    const session = this.getSession(sessionId);
    const participant = this.getParticipant(session, userId);

    participant.isHandRaised = !participant.isHandRaised;

    if (participant.isHandRaised) {
      const hand: RaisedHand = {
        id: `hand_${Date.now()}`,
        userId,
        displayName: participant.displayName,
        timestamp: new Date(),
        acknowledged: false,
      };
      session.raisedHands.push(hand);
      session.updatedAt = new Date();
      return hand;
    }

    session.raisedHands = session.raisedHands.filter((h) => h.userId !== userId);
    session.updatedAt = new Date();
    return null;
  }

  acknowledgeHand(
    sessionId: string,
    handId: string,
    acknowledgedBy: string,
  ): RaisedHand {
    const session = this.getSession(sessionId);
    const hand = session.raisedHands.find((h) => h.id === handId);
    if (!hand) {
      throw new ClassroomError("Raised hand not found.");
    }
    hand.acknowledged = true;
    hand.acknowledgedBy = acknowledgedBy;
    session.updatedAt = new Date();
    return hand;
  }

  // ─── Chat ──────────────────────────────────────────────────────────────────

  sendChatMessage(
    sessionId: string,
    userId: string,
    displayName: string,
    content: string,
    options?: { isPrivate?: boolean; recipientId?: string },
  ): ChatMessage {
    const session = this.getSession(sessionId);

    if (!session.settings.allowStudentChat) {
      const sender = session.participants.find(
        (p) => p.userId === userId && !p.leftAt,
      );
      if (sender && sender.role === "student") {
        throw new ClassroomError("Chat is disabled for students.");
      }
    }

    if (content.length > session.settings.maxChatMessageLength) {
      throw new ClassroomError(
        `Message exceeds maximum length of ${session.settings.maxChatMessageLength} characters.`,
      );
    }

    const message: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      displayName,
      content,
      timestamp: new Date(),
      isPrivate: options?.isPrivate ?? false,
      recipientId: options?.recipientId,
      isDeleted: false,
      reactions: [],
    };

    session.chat.push(message);
    session.updatedAt = new Date();

    return message;
  }

  addReaction(
    sessionId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ): ChatMessage {
    const session = this.getSession(sessionId);
    const message = session.chat.find((m) => m.id === messageId);
    if (!message) {
      throw new ClassroomError("Message not found.");
    }

    const existing = message.reactions.find(
      (r) => r.emoji === emoji && r.userId === userId,
    );
    if (existing) {
      message.reactions = message.reactions.filter(
        (r) => !(r.emoji === emoji && r.userId === userId),
      );
    } else {
      message.reactions.push({ emoji, userId, timestamp: new Date() });
    }

    session.updatedAt = new Date();
    return message;
  }

  deleteChatMessage(sessionId: string, messageId: string): void {
    const session = this.getSession(sessionId);
    const message = session.chat.find((m) => m.id === messageId);
    if (message) {
      message.isDeleted = true;
      message.content = "[Message deleted]";
      session.updatedAt = new Date();
    }
  }

  getChatHistory(
    sessionId: string,
    options?: { includePrivate?: boolean; userId?: string },
  ): ChatMessage[] {
    const session = this.getSession(sessionId);
    return session.chat.filter((m) => {
      if (m.isDeleted) return false;
      if (m.isPrivate) {
        return (
          options?.includePrivate &&
          (m.userId === options.userId || m.recipientId === options.userId)
        );
      }
      return true;
    });
  }

  // ─── Whiteboard ────────────────────────────────────────────────────────────

  addWhiteboardElement(
    sessionId: string,
    userId: string,
    type: WhiteboardTool,
    data: Record<string, unknown>,
    style?: Partial<ElementStyle>,
  ): WhiteboardElement {
    const session = this.getSession(sessionId);
    const participant = this.getParticipant(session, userId);

    if (
      !session.settings.allowStudentWhiteboard &&
      participant.role === "student"
    ) {
      throw new ClassroomError("Whiteboard access is disabled for students.");
    }

    const defaultStyle: ElementStyle = {
      color: "#000000",
      strokeWidth: 2,
      opacity: 1,
    };

    const element: WhiteboardElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      userId,
      timestamp: new Date(),
      data,
      style: { ...defaultStyle, ...style },
    };

    session.whiteboard.elements.push(element);
    session.whiteboard.activeUserId = userId;
    session.updatedAt = new Date();

    return element;
  }

  updateWhiteboardElement(
    sessionId: string,
    elementId: string,
    data: Record<string, unknown>,
  ): WhiteboardElement {
    const session = this.getSession(sessionId);
    const element = session.whiteboard.elements.find((e) => e.id === elementId);
    if (!element) {
      throw new ClassroomError("Whiteboard element not found.");
    }

    element.data = { ...element.data, ...data };
    element.timestamp = new Date();
    session.updatedAt = new Date();

    return element;
  }

  removeWhiteboardElement(sessionId: string, elementId: string): void {
    const session = this.getSession(sessionId);
    session.whiteboard.elements = session.whiteboard.elements.filter(
      (e) => e.id !== elementId,
    );
    session.updatedAt = new Date();
  }

  clearWhiteboard(sessionId: string): void {
    const session = this.getSession(sessionId);
    session.whiteboard.elements = [];
    session.updatedAt = new Date();
  }

  setWhiteboardTool(
    sessionId: string,
    userId: string,
    tool: WhiteboardTool,
  ): void {
    const session = this.getSession(sessionId);
    session.whiteboard.activeTool = tool;
    session.whiteboard.activeUserId = userId;
    session.updatedAt = new Date();
  }

  // ─── Breakout Rooms ────────────────────────────────────────────────────────

  createBreakoutRoom(
    sessionId: string,
    name: string,
    maxParticipants: number = 6,
  ): BreakoutRoom {
    const session = this.getSession(sessionId);

    if (!session.settings.enableBreakoutRooms) {
      throw new ClassroomError("Breakout rooms are disabled for this session.");
    }

    const room: BreakoutRoom = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      participants: [],
      maxParticipants,
      isActive: true,
      createdAt: new Date(),
    };

    session.breakoutRooms.push(room);
    session.updatedAt = new Date();

    return room;
  }

  assignToBreakoutRoom(
    sessionId: string,
    roomId: string,
    userId: string,
  ): Participant {
    const session = this.getSession(sessionId);
    const room = session.breakoutRooms.find((r) => r.id === roomId);

    if (!room || !room.isActive) {
      throw new ClassroomError("Breakout room not found or inactive.");
    }

    if (room.participants.length >= room.maxParticipants) {
      throw new ClassroomError("Breakout room is full.");
    }

    const participant = this.getParticipant(session, userId);
    participant.breakoutRoomId = roomId;

    session.breakoutRooms.forEach((r) => {
      r.participants = r.participants.filter((p) => p !== userId);
    });

    room.participants.push(userId);
    session.updatedAt = new Date();

    return participant;
  }

  closeBreakoutRoom(sessionId: string, roomId: string): void {
    const session = this.getSession(sessionId);
    const room = session.breakoutRooms.find((r) => r.id === roomId);
    if (!room) {
      throw new ClassroomError("Breakout room not found.");
    }

    room.isActive = false;
    room.closedAt = new Date();
    room.duration = Date.now() - room.createdAt.getTime();

    for (const participant of session.participants) {
      if (participant.breakoutRoomId === roomId) {
        participant.breakoutRoomId = undefined;
      }
    }

    session.updatedAt = new Date();
  }

  returnAllFromBreakouts(sessionId: string): void {
    const session = this.getSession(sessionId);

    for (const room of session.breakoutRooms) {
      if (room.isActive) {
        room.isActive = false;
        room.closedAt = new Date();
        room.duration = Date.now() - room.createdAt.getTime();
      }
    }

    for (const participant of session.participants) {
      participant.breakoutRoomId = undefined;
    }

    session.updatedAt = new Date();
  }

  // ─── Polls ─────────────────────────────────────────────────────────────────

  createPoll(
    sessionId: string,
    createdBy: string,
    question: string,
    options: string[],
    settings?: { allowMultiple?: boolean; anonymous?: boolean },
  ): Poll {
    const session = this.getSession(sessionId);

    const poll: Poll = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question,
      options: options.map((text, i) => ({
        id: `opt_${i}`,
        text,
        votes: [],
      })),
      createdBy,
      isActive: true,
      allowMultiple: settings?.allowMultiple ?? false,
      anonymous: settings?.anonymous ?? false,
      createdAt: new Date(),
      totalVotes: 0,
    };

    session.polls.push(poll);
    session.updatedAt = new Date();

    return poll;
  }

  votePoll(sessionId: string, pollId: string, userId: string, optionIds: string[]): Poll {
    const session = this.getSession(sessionId);
    const poll = session.polls.find((p) => p.id === pollId);

    if (!poll || !poll.isActive) {
      throw new ClassroomError("Poll not found or inactive.");
    }

    if (!poll.allowMultiple && optionIds.length > 1) {
      throw new ClassroomError("This poll only allows one option.");
    }

    for (const option of poll.options) {
      option.votes = option.votes.filter((v) => v !== userId);
    }

    for (const optionId of optionIds) {
      const option = poll.options.find((o) => o.id === optionId);
      if (option) {
        option.votes.push(userId);
      }
    }

    poll.totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
    session.updatedAt = new Date();

    return poll;
  }

  closePoll(sessionId: string, pollId: string): Poll {
    const session = this.getSession(sessionId);
    const poll = session.polls.find((p) => p.id === pollId);
    if (!poll) {
      throw new ClassroomError("Poll not found.");
    }

    poll.isActive = false;
    poll.closedAt = new Date();
    session.updatedAt = new Date();

    return poll;
  }

  // ─── Screen Sharing ────────────────────────────────────────────────────────

  startScreenShare(sessionId: string, userId: string): ScreenShareState {
    const session = this.getSession(sessionId);
    const participant = this.getParticipant(session, userId);

    if (
      !session.settings.allowStudentScreenShare &&
      participant.role === "student"
    ) {
      throw new ClassroomError("Screen sharing is disabled for students.");
    }

    const existingSharer = session.participants.find(
      (p) => p.isScreenSharing && p.userId !== userId && !p.leftAt,
    );
    if (existingSharer) {
      throw new ClassroomError(
        `${existingSharer.displayName} is already sharing their screen.`,
      );
    }

    participant.isScreenSharing = true;
    session.updatedAt = new Date();

    return {
      isActive: true,
      userId,
      displayName: participant.displayName,
      startedAt: new Date(),
    };
  }

  stopScreenShare(sessionId: string, userId: string): void {
    const session = this.getSession(sessionId);
    const participant = this.getParticipant(session, userId);
    participant.isScreenSharing = false;
    session.updatedAt = new Date();
  }

  // ─── Recording ─────────────────────────────────────────────────────────────

  startRecording(sessionId: string): RecordingState {
    const session = this.getSession(sessionId);

    if (!session.settings.enableRecording) {
      throw new ClassroomError("Recording is disabled for this session.");
    }

    if (!session.isRecorded) {
      session.isRecorded = true;
    }

    session.updatedAt = new Date();

    return {
      isRecording: true,
      startedAt: new Date(),
      duration: 0,
      recordingId: `rec_${Date.now()}`,
    };
  }

  stopRecording(sessionId: string): RecordingState {
    const session = this.getSession(sessionId);
    session.updatedAt = new Date();

    return {
      isRecording: false,
      duration: 0,
    };
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  getSessionAnalytics(sessionId: string): SessionAnalytics {
    const session = this.getSession(sessionId);
    const participants = session.participants.filter((p) => !p.leftAt);
    const totalParticipants = session.participants.length;

    const durationMs = session.endedAt
      ? session.endedAt.getTime() - (session.startedAt?.getTime() ?? session.endedAt.getTime())
      : Date.now() - (session.startedAt?.getTime() ?? Date.now());

    const totalSpeakingTime = session.participants.reduce(
      (sum, p) => sum + p.speakingTimeMs,
      0,
    );

    const avgSpeakingTime =
      totalParticipants > 0 ? totalSpeakingTime / totalParticipants : 0;

    return {
      sessionId,
      totalParticipants,
      activeParticipants: participants.length,
      peakConcurrentParticipants: totalParticipants,
      durationMinutes: Math.round(durationMs / 60000),
      totalChatMessages: session.chat.filter((m) => !m.isDeleted).length,
      totalPolls: session.polls.length,
      averageSpeakingTimeMs: avgSpeakingTime,
      breakoutRoomsUsed: session.breakoutRooms.length,
      whiteboardElements: session.whiteboard.elements.length,
    };
  }

  // ─── AI-Powered Features ───────────────────────────────────────────────────

  async generateSessionSummary(sessionId: string): Promise<string> {
    const session = this.getSession(sessionId);

    const chatContent = session.chat
      .filter((m) => !m.isDeleted && !m.isPrivate)
      .map((m) => `${m.displayName}: ${m.content}`)
      .join("\n");

    const systemPrompt = `Summarize this live classroom session concisely.

Title: ${session.title}
Duration: ${session.startedAt ? Math.round((Date.now() - session.startedAt.getTime()) / 60000) : 0} minutes
Participants: ${session.participants.length}
Chat messages: ${session.chat.length}
Polls conducted: ${session.polls.length}

Key discussion points from chat:
${chatContent.substring(0, 3000)}

Provide a brief summary covering main topics, key decisions, and action items.`;

    const result = await this.client.complete(
      [{ role: "user", content: "Generate session summary." }],
      { temperature: 0.5, maxTokens: 1024 },
    );

    return result.content;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private getParticipant(session: LiveSession, userId: string): Participant {
    const participant = session.participants.find(
      (p) => p.userId === userId && !p.leftAt,
    );
    if (!participant) {
      throw new ClassroomError("Participant not found in session.");
    }
    return participant;
  }
}

// ─── Analytics Types ─────────────────────────────────────────────────────────

export interface SessionAnalytics {
  sessionId: string;
  totalParticipants: number;
  activeParticipants: number;
  peakConcurrentParticipants: number;
  durationMinutes: number;
  totalChatMessages: number;
  totalPolls: number;
  averageSpeakingTimeMs: number;
  breakoutRoomsUsed: number;
  whiteboardElements: number;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let liveService: LiveClassroomService | null = null;

export function getLiveClassroomService(): LiveClassroomService {
  if (!liveService) {
    liveService = new LiveClassroomService();
  }
  return liveService;
}
