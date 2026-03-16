import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Helpers ─────────────────────────────────────────────

function sanitize(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/javascript:/gi, "")
    .trim();
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku";

// ─── Department grouping by role ─────────────────────────

const ROLE_DEPARTMENT_MAP: Record<string, string> = {
  CEO: "Executive",
  CTO: "Executive",
  CFO: "Executive",
  BRAND_FACE: "Executive",
  ADMIN: "Operations",
  HR: "Operations",
  ACCOUNTING: "Finance",
  PRODUCT_OWNER: "Product",
  CONTENT_STRATEGIST: "Content",
  BRAND_PARTNER: "Marketing",
  SR_DEVELOPER: "Engineering",
  JR_DEVELOPER: "Engineering",
  EDITOR: "Content",
  GRAPHIC_DESIGNER: "Design",
  GUY: "General",
  OFFICE_BOY: "General",
};

function getDepartmentForRole(role: string): string {
  return ROLE_DEPARTMENT_MAP[role] || "General";
}

// ─── Auto-create department rooms ────────────────────────

async function ensureDepartmentRooms(workspaceId: string) {
  // Get all unique departments from current users
  const users = await prisma.user.findMany({
    where: { workspaceId },
    select: { id: true, role: true },
  });

  const deptUsers: Record<string, string[]> = {};
  for (const u of users) {
    const dept = getDepartmentForRole(u.role);
    if (!deptUsers[dept]) deptUsers[dept] = [];
    deptUsers[dept].push(u.id);
  }

  const createdRooms: any[] = [];

  for (const [dept, memberIds] of Object.entries(deptUsers)) {
    if (memberIds.length < 2) continue; // Skip single-person departments

    // Check if department room already exists
    const existing = await prisma.chatRoom.findFirst({
      where: { type: "department", department: dept },
      include: { members: { select: { userId: true } } },
    });

    if (existing) {
      // Sync members: add any new users to the department room
      const existingMemberIds = new Set(existing.members.map((m) => m.userId));
      const newMembers = memberIds.filter((id) => !existingMemberIds.has(id));

      if (newMembers.length > 0) {
        await prisma.chatRoomMember.createMany({
          data: newMembers.map((userId) => ({
            roomId: existing.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
      continue;
    }

    // Create department room - use first admin/executive as creator, fallback to first member
    const creatorId = memberIds[0];

    const room = await prisma.chatRoom.create({
      data: {
        name: `${dept} Team`,
        type: "department",
        department: dept,
        createdById: creatorId,
      },
    });

    await prisma.chatRoomMember.createMany({
      data: memberIds.map((userId) => ({
        roomId: room.id,
        userId,
      })),
      skipDuplicates: true,
    });

    await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        senderId: creatorId,
        content: `Welcome to the ${dept} department channel! All ${dept} team members are automatically added here.`,
        type: "system",
      },
    });

    createdRooms.push(room);
  }

  return createdRooms;
}

// ─── GET ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── List user's chat rooms ──
    if (action === "rooms") {
      const C_LEVEL_ROLES = ["CTO", "CEO", "ADMIN", "BRAND_FACE"];
      const isCLevel = C_LEVEL_ROLES.includes(user.role);
      // C-level can see all rooms including DMs
      const showAll = isCLevel;
      const typeFilter = searchParams.get("type"); // dm, group, project, department

      // Auto-create/sync department rooms on room listing
      if (user.workspaceId) {
        try {
          await ensureDepartmentRooms(user.workspaceId);
        } catch (err) {
          console.error("Failed to sync department rooms:", err);
        }
      }

      let rooms: any[];

      if (showAll) {
        // Admin sees ALL rooms
        const where: any = {};
        if (typeFilter) where.type = typeFilter;

        rooms = await prisma.chatRoom.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          include: {
            members: { select: { userId: true, lastRead: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, content: true, senderId: true, createdAt: true, type: true },
            },
          },
        });
      } else {
        // Get rooms where user is a member
        const memberOf = await prisma.chatRoomMember.findMany({
          where: { userId: user.id },
          select: { roomId: true, lastRead: true },
        });
        const roomIds = memberOf.map((m) => m.roomId);

        const where: any = { id: { in: roomIds } };
        if (typeFilter) where.type = typeFilter;

        rooms = await prisma.chatRoom.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          include: {
            members: { select: { userId: true, lastRead: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, content: true, senderId: true, createdAt: true, type: true },
            },
          },
        });
      }

      // Enrich with sender info for last message & member names for DMs
      const allUserIds = new Set<string>();
      rooms.forEach((r) => {
        r.members.forEach((m: any) => allUserIds.add(m.userId));
        if (r.messages[0]) allUserIds.add(r.messages[0].senderId);
      });

      const users = await prisma.user.findMany({
        where: { id: { in: [...allUserIds] } },
        select: { id: true, firstName: true, lastName: true, avatar: true, role: true, status: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rooms.map((r) => {
        // Compute unread count for current user
        const myMembership = r.members.find((m: any) => m.userId === user.id);
        const lastRead = myMembership?.lastRead ? new Date(myMembership.lastRead) : new Date(0);

        // For DMs, show other person's name
        let displayName = r.name;
        if (r.type === "dm") {
          const otherId = r.members.find((m: any) => m.userId !== user.id)?.userId;
          if (otherId && userMap[otherId]) {
            displayName = `${userMap[otherId].firstName} ${userMap[otherId].lastName}`;
          }
        }

        const lastMsg = r.messages[0] || null;

        return {
          id: r.id,
          name: displayName,
          type: r.type,
          projectId: r.projectId,
          department: r.department,
          createdById: r.createdById,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          memberCount: r.members.length,
          members: r.members.map((m: any) => ({
            userId: m.userId,
            ...(userMap[m.userId] || {}),
          })),
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                content: lastMsg.content,
                senderId: lastMsg.senderId,
                senderName: userMap[lastMsg.senderId]
                  ? `${userMap[lastMsg.senderId].firstName}`
                  : "Unknown",
                createdAt: lastMsg.createdAt,
                type: lastMsg.type,
              }
            : null,
          unreadCount: 0,
          _lastRead: lastRead,
        };
      });

      // Compute unread counts with a separate query for efficiency
      if (!showAll) {
        for (const room of data) {
          const count = await prisma.chatMessage.count({
            where: {
              roomId: room.id,
              createdAt: { gt: room._lastRead },
              senderId: { not: user.id },
            },
          });
          room.unreadCount = count;
        }
      }

      // Remove internal field
      const cleaned = data.map(({ _lastRead, ...rest }) => rest);

      return jsonOk({
        success: true,
        data: cleaned,
        currentUserId: user.id,
        currentUserRole: user.role,
        currentUserName: `${user.firstName} ${user.lastName}`,
      });
    }

    // ── Get messages for a room (paginated) ──
    if (action === "messages") {
      const roomId = searchParams.get("roomId");
      if (!roomId) return jsonError("roomId is required", 400);

      // Verify membership or admin
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { members: { select: { userId: true } } },
      });
      if (!room) return jsonError("Room not found", 404);

      const isMember = room.members.some((m) => m.userId === user.id);
      if (!isMember && user.role !== "ADMIN") {
        return jsonError("Access denied", 403);
      }

      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = 50;
      const skip = (page - 1) * limit;

      const total = await prisma.chatMessage.count({ where: { roomId } });

      const messages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          replyTo: {
            select: { id: true, content: true, senderId: true, type: true },
          },
        },
      });

      // Get sender info
      const senderIds = [...new Set(messages.map((m) => m.senderId))];
      const replyToSenderIds = messages
        .filter((m) => m.replyTo)
        .map((m) => m.replyTo!.senderId);
      const allIds = [...new Set([...senderIds, ...replyToSenderIds])];

      const senders = await prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, firstName: true, lastName: true, avatar: true, role: true, status: true },
      });
      const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]));

      const enriched = messages.reverse().map((m) => ({
        id: m.id,
        roomId: m.roomId,
        senderId: m.senderId,
        content: m.content,
        type: m.type,
        fileName: m.fileName,
        fileSize: m.fileSize,
        fileType: m.fileType,
        replyToId: m.replyToId,
        createdAt: m.createdAt,
        sender: senderMap[m.senderId] || {
          id: m.senderId,
          firstName: "Unknown",
          lastName: "",
          avatar: null,
          role: "USER",
          status: "OFFLINE",
        },
        replyTo: m.replyTo
          ? {
              ...m.replyTo,
              sender: senderMap[m.replyTo.senderId] || {
                id: m.replyTo.senderId,
                firstName: "Unknown",
                lastName: "",
              },
            }
          : null,
      }));

      return jsonOk({
        success: true,
        data: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // ── Search messages ──
    if (action === "search") {
      const q = searchParams.get("q")?.trim();
      if (!q || q.length < 2) return jsonError("Search query too short", 400);

      // Get user's rooms
      const myRooms = await prisma.chatRoomMember.findMany({
        where: { userId: user.id },
        select: { roomId: true },
      });
      const myRoomIds = myRooms.map((r) => r.roomId);

      const roomFilter = user.role === "ADMIN" ? {} : { roomId: { in: myRoomIds } };

      const messages = await prisma.chatMessage.findMany({
        where: {
          ...roomFilter,
          content: { contains: q, mode: "insensitive" as any },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          room: { select: { id: true, name: true, type: true } },
        },
      });

      // Get senders
      const senderIds = [...new Set(messages.map((m) => m.senderId))];
      const senders = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true, lastName: true, avatar: true },
      });
      const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]));

      const data = messages.map((m) => ({
        id: m.id,
        content: m.content,
        roomId: m.roomId,
        roomName: m.room.name,
        roomType: m.room.type,
        senderId: m.senderId,
        sender: senderMap[m.senderId] || { id: m.senderId, firstName: "Unknown", lastName: "" },
        createdAt: m.createdAt,
      }));

      return jsonOk({ success: true, data });
    }

    // ── Get room members ──
    if (action === "members") {
      const roomId = searchParams.get("roomId");
      if (!roomId) return jsonError("roomId is required", 400);

      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { members: { select: { userId: true, joinedAt: true } } },
      });
      if (!room) return jsonError("Room not found", 404);

      const isMember = room.members.some((m) => m.userId === user.id);
      if (!isMember && user.role !== "ADMIN") {
        return jsonError("Access denied", 403);
      }

      const memberIds = room.members.map((m) => m.userId);
      const memberUsers = await prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: {
          id: true, firstName: true, lastName: true, avatar: true,
          role: true, status: true, department: true,
        },
      });

      return jsonOk({ success: true, data: memberUsers });
    }

    // ── List all team users (for creating rooms / DMs) ──
    if (action === "users") {
      const teamUsers = await prisma.user.findMany({
        where: { workspaceId: user.workspaceId },
        select: {
          id: true, firstName: true, lastName: true, avatar: true,
          role: true, status: true, department: true,
        },
        orderBy: { firstName: "asc" },
      });
      return jsonOk({ success: true, data: teamUsers });
    }

    // ── Get department list with member counts ──
    if (action === "departments") {
      const allUsers = await prisma.user.findMany({
        where: { workspaceId: user.workspaceId },
        select: { id: true, role: true, firstName: true, lastName: true },
      });

      const departments: Record<string, { name: string; memberCount: number; members: any[] }> = {};
      for (const u of allUsers) {
        const dept = getDepartmentForRole(u.role);
        if (!departments[dept]) {
          departments[dept] = { name: dept, memberCount: 0, members: [] };
        }
        departments[dept].memberCount++;
        departments[dept].members.push({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
        });
      }

      return jsonOk({ success: true, data: Object.values(departments) });
    }

    return jsonError("Invalid action", 400);
  } catch (error) {
    console.error("Chat GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
    const action = body?.action;
    if (!action || typeof action !== "string") {
      return jsonError("Action is required", 400);
    }

    // ── Create room (DM / Group / Project / Department) ──
    if (action === "create-room") {
      const { name, type, memberIds } = body;

      if (!type || !["dm", "group", "project", "department"].includes(type)) {
        return jsonError("Invalid room type. Must be: dm, group, project, department", 400);
      }

      if (type === "group" && !name?.trim()) {
        return jsonError("Group name is required", 400);
      }

      if (type === "project" && !body.projectId) {
        return jsonError("projectId is required for project rooms", 400);
      }

      if (type === "department" && !body.department) {
        return jsonError("department name is required for department rooms", 400);
      }

      // For DMs, check if one already exists
      if (type === "dm") {
        if (!memberIds || memberIds.length !== 1) {
          return jsonError("DM requires exactly one other member", 400);
        }

        const targetId = memberIds[0];
        const myRooms = await prisma.chatRoomMember.findMany({
          where: { userId: user.id },
          select: { roomId: true },
        });
        const targetRooms = await prisma.chatRoomMember.findMany({
          where: { userId: targetId },
          select: { roomId: true },
        });

        const myRoomIds = new Set(myRooms.map((r) => r.roomId));
        const commonRoomIds = targetRooms
          .filter((r) => myRoomIds.has(r.roomId))
          .map((r) => r.roomId);

        if (commonRoomIds.length > 0) {
          const existing = await prisma.chatRoom.findFirst({
            where: { id: { in: commonRoomIds }, type: "dm" },
          });
          if (existing) {
            return jsonOk({ success: true, data: existing, existing: true });
          }
        }
      }

      // For project rooms, check if one already exists for this project
      if (type === "project" && body.projectId) {
        const existingProjectRoom = await prisma.chatRoom.findFirst({
          where: { type: "project", projectId: body.projectId },
        });
        if (existingProjectRoom) {
          // Add user as member if not already
          await prisma.chatRoomMember.createMany({
            data: [{ roomId: existingProjectRoom.id, userId: user.id }],
            skipDuplicates: true,
          });
          return jsonOk({ success: true, data: existingProjectRoom, existing: true });
        }
      }

      // For department rooms, check if one already exists
      if (type === "department" && body.department) {
        const existingDeptRoom = await prisma.chatRoom.findFirst({
          where: { type: "department", department: body.department },
        });
        if (existingDeptRoom) {
          await prisma.chatRoomMember.createMany({
            data: [{ roomId: existingDeptRoom.id, userId: user.id }],
            skipDuplicates: true,
          });
          return jsonOk({ success: true, data: existingDeptRoom, existing: true });
        }
      }

      const room = await prisma.chatRoom.create({
        data: {
          name: name?.trim() || null,
          type,
          projectId: body.projectId || null,
          department: body.department || null,
          createdById: user.id,
        },
      });

      // Add creator + members
      const allMemberIds = [user.id, ...(memberIds || []).filter((id: string) => id !== user.id)];

      // For department rooms, auto-add all users in that department
      if (type === "department" && body.department) {
        const deptUsers = await prisma.user.findMany({
          where: { workspaceId: user.workspaceId },
          select: { id: true, role: true },
        });
        const deptMemberIds = deptUsers
          .filter((u) => getDepartmentForRole(u.role) === body.department)
          .map((u) => u.id);
        for (const id of deptMemberIds) {
          if (!allMemberIds.includes(id)) allMemberIds.push(id);
        }
      }

      // For project rooms, auto-add project manager and assignees
      if (type === "project" && body.projectId) {
        try {
          const project = await prisma.project.findUnique({
            where: { id: body.projectId },
            include: {
              tasks: {
                select: { assigneeId: true },
                where: { assigneeId: { not: null } },
              },
            },
          });
          if (project) {
            if (!allMemberIds.includes(project.managerId)) {
              allMemberIds.push(project.managerId);
            }
            for (const task of project.tasks) {
              if (task.assigneeId && !allMemberIds.includes(task.assigneeId)) {
                allMemberIds.push(task.assigneeId);
              }
            }
          }
        } catch (err) {
          console.error("Failed to auto-add project members:", err);
        }
      }

      await prisma.chatRoomMember.createMany({
        data: allMemberIds.map((userId: string) => ({
          roomId: room.id,
          userId,
        })),
        skipDuplicates: true,
      });

      // Add system message
      let systemMsg = "Conversation started";
      if (type === "group") systemMsg = `${user.firstName} created "${name}"`;
      if (type === "project") systemMsg = `${user.firstName} created a project channel`;
      if (type === "department") systemMsg = `${user.firstName} created the ${body.department} department channel`;

      await prisma.chatMessage.create({
        data: {
          roomId: room.id,
          senderId: user.id,
          content: systemMsg,
          type: "system",
        },
      });

      return jsonOk({ success: true, data: room }, 201);
    }

    // ── Send message ──
    if (action === "send") {
      const { roomId, content, type: msgType, fileName, fileSize, fileType, fileUrl, replyToId } = body;

      if (!roomId) return jsonError("roomId is required", 400);

      // Check mute
      if (user.chatMuted) {
        return jsonError("You have been muted by an administrator", 403);
      }

      // Verify membership
      const membership = await prisma.chatRoomMember.findUnique({
        where: { roomId_userId: { roomId, userId: user.id } },
      });
      const C_LEVEL = ["CTO", "CEO", "ADMIN", "BRAND_FACE"];
      if (!membership && !C_LEVEL.includes(user.role)) {
        return jsonError("You are not a member of this room", 403);
      }
      // C-level can send without joining - they observe silently
      // No auto-join - they stay invisible unless they choose to join

      const messageType = msgType || "text";

      if (messageType === "text" && (!content || !content.trim())) {
        return jsonError("Message content is required", 400);
      }

      if (messageType === "file" && !fileName) {
        return jsonError("fileName is required for file messages", 400);
      }

      // Validate replyToId
      if (replyToId) {
        const replyMsg = await prisma.chatMessage.findUnique({ where: { id: replyToId } });
        if (!replyMsg || replyMsg.roomId !== roomId) {
          return jsonError("Invalid reply target", 400);
        }
      }

      const message = await prisma.chatMessage.create({
        data: {
          roomId,
          senderId: user.id,
          content: sanitize(content || (messageType === "file" ? `Shared a file: ${fileName}` : "")),
          type: messageType,
          fileName: fileName || null,
          fileSize: fileSize || null,
          fileType: fileType || null,
          fileUrl: fileUrl || null,
          replyToId: replyToId || null,
        },
        include: {
          replyTo: {
            select: { id: true, content: true, senderId: true, type: true },
          },
        },
      });

      // Update room timestamp
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      // Update sender's lastRead
      await prisma.chatRoomMember.updateMany({
        where: { roomId, userId: user.id },
        data: { lastRead: new Date() },
      });

      // Get replyTo sender if exists
      let replyToSender = null;
      if (message.replyTo) {
        replyToSender = await prisma.user.findUnique({
          where: { id: message.replyTo.senderId },
          select: { id: true, firstName: true, lastName: true },
        });
      }

      return jsonOk({
        success: true,
        data: {
          ...message,
          sender: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: user.role,
            status: user.status,
          },
          replyTo: message.replyTo
            ? { ...message.replyTo, sender: replyToSender || { id: message.replyTo.senderId, firstName: "Unknown", lastName: "" } }
            : null,
        },
      }, 201);
    }

    // ── Mark room as read ──
    if (action === "mark-read") {
      const { roomId } = body;
      if (!roomId) return jsonError("roomId is required", 400);

      await prisma.chatRoomMember.updateMany({
        where: { roomId, userId: user.id },
        data: { lastRead: new Date() },
      });

      return jsonOk({ success: true });
    }

    // ── Add members to a room ──
    if (action === "add-members") {
      const { roomId, memberIds: newMemberIds } = body;
      if (!roomId || !newMemberIds || !Array.isArray(newMemberIds) || newMemberIds.length === 0) {
        return jsonError("roomId and memberIds array are required", 400);
      }

      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: { members: { select: { userId: true } } },
      });
      if (!room) return jsonError("Room not found", 404);

      if (room.type === "dm") {
        return jsonError("Cannot add members to DM conversations", 400);
      }

      // Only creator, admin, or existing member can add
      const isMember = room.members.some((m) => m.userId === user.id);
      if (!isMember && user.role !== "ADMIN" && room.createdById !== user.id) {
        return jsonError("Access denied", 403);
      }

      await prisma.chatRoomMember.createMany({
        data: newMemberIds.map((userId: string) => ({
          roomId,
          userId,
        })),
        skipDuplicates: true,
      });

      // Fetch names of added members for system message
      const addedUsers = await prisma.user.findMany({
        where: { id: { in: newMemberIds } },
        select: { firstName: true, lastName: true },
      });
      const names = addedUsers.map((u) => `${u.firstName} ${u.lastName}`).join(", ");

      await prisma.chatMessage.create({
        data: {
          roomId,
          senderId: user.id,
          content: `${user.firstName} added ${names} to the ${room.type === "group" ? "group" : "channel"}`,
          type: "system",
        },
      });

      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      return jsonOk({ success: true, message: `${newMemberIds.length} member(s) added` });
    }

    // ── Remove member from a room ──
    if (action === "remove-member") {
      const { roomId, userId: targetUserId } = body;
      if (!roomId || !targetUserId) {
        return jsonError("roomId and userId are required", 400);
      }

      const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
      if (!room) return jsonError("Room not found", 404);

      if (room.type === "dm") {
        return jsonError("Cannot remove members from DM conversations", 400);
      }

      // Only creator or admin can remove (or self-leave)
      const isSelf = targetUserId === user.id;
      if (!isSelf && room.createdById !== user.id && user.role !== "ADMIN") {
        return jsonError("Only room creator or admin can remove members", 403);
      }

      await prisma.chatRoomMember.deleteMany({
        where: { roomId, userId: targetUserId },
      });

      const removedUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { firstName: true, lastName: true },
      });

      await prisma.chatMessage.create({
        data: {
          roomId,
          senderId: user.id,
          content: isSelf
            ? `${user.firstName} left the ${room.type === "group" ? "group" : "channel"}`
            : `${user.firstName} removed ${removedUser?.firstName || "a user"} from the ${room.type === "group" ? "group" : "channel"}`,
          type: "system",
        },
      });

      return jsonOk({ success: true, message: isSelf ? "You left the room" : "Member removed" });
    }

    // ── AI Assist ──
    if (action === "ai-assist") {
      const { roomId, question } = body;
      if (!roomId || !question?.trim()) {
        return jsonError("roomId and question are required", 400);
      }

      // Get last 10 messages for context
      const recentMessages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      const senderIds = [...new Set(recentMessages.map((m) => m.senderId))];
      const senders = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]));

      const contextLines = recentMessages.reverse().map((m) => {
        const s = senderMap[m.senderId];
        const senderName = s ? `${s.firstName} ${s.lastName}` : "Unknown";
        return `${senderName}: ${m.content}`;
      });

      let aiReply = "I'm sorry, I couldn't process your request. The AI service may not be configured.";

      if (OPENROUTER_API_KEY) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://knowai.com",
              "X-Title": "KnowAI Chat Assistant",
            },
            body: JSON.stringify({
              model: OPENROUTER_MODEL,
              messages: [
                {
                  role: "system",
                  content: `You are KnowAI Chat Assistant, helping within a team conversation. Here is the recent chat context:\n\n${contextLines.join("\n")}\n\nAnswer the user's question helpfully and concisely based on the conversation context. Keep responses under 300 words.`,
                },
                { role: "user", content: question.trim() },
              ],
              max_tokens: 500,
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            aiReply = data.choices?.[0]?.message?.content || aiReply;
          }
        } catch (err) {
          console.error("AI assist error:", err);
        }
      } else {
        aiReply = `Based on the recent conversation, here's what I can help with:\n\nThe last ${recentMessages.length} messages in this chat discuss various topics. Unfortunately, the AI service (OPENROUTER_API_KEY) is not configured, so I can't provide detailed analysis.\n\nAsk your admin to set up the API key for full AI assistance.`;
      }

      // Save AI message in the room
      const aiMessage = await prisma.chatMessage.create({
        data: {
          roomId,
          senderId: user.id,
          content: aiReply,
          type: "ai",
        },
      });

      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      return jsonOk({
        success: true,
        data: {
          ...aiMessage,
          sender: {
            id: "ai-assistant",
            firstName: "KnowAI",
            lastName: "Assistant",
            avatar: null,
            role: "SYSTEM",
            status: "ONLINE",
          },
        },
      });
    }

    // ── Mute user (ADMIN only) ──
    if (action === "muteUser") {
      if (user.role !== "ADMIN") return jsonError("Only admins can mute users", 403);
      const { userId } = body;
      if (!userId) return jsonError("userId is required", 400);

      await prisma.user.update({
        where: { id: userId },
        data: { chatMuted: true, chatMutedAt: new Date(), chatMutedBy: user.id },
      });

      return jsonOk({ success: true });
    }

    // ── Unmute user (ADMIN only) ──
    if (action === "unmuteUser") {
      if (user.role !== "ADMIN") return jsonError("Only admins can unmute users", 403);
      const { userId } = body;
      if (!userId) return jsonError("userId is required", 400);

      await prisma.user.update({
        where: { id: userId },
        data: { chatMuted: false, chatMutedAt: null, chatMutedBy: null },
      });

      return jsonOk({ success: true });
    }

    // ── Sync department rooms manually ──
    if (action === "sync-departments") {
      if (user.role !== "ADMIN") {
        return jsonError("Only admins can trigger department sync", 403);
      }

      const created = await ensureDepartmentRooms(user.workspaceId);
      return jsonOk({
        success: true,
        message: `Department rooms synced. ${created.length} new room(s) created.`,
        newRooms: created,
      });
    }

    return jsonError("Invalid action", 400);
  } catch (error) {
    console.error("Chat POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── PATCH ───────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
    const { roomId, name } = body || {};

    if (!roomId) return jsonError("roomId is required", 400);

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) return jsonError("Room not found", 404);

    if (room.createdById !== user.id && user.role !== "ADMIN") {
      return jsonError("Only room creator or admin can update", 403);
    }

    if (room.type === "dm") {
      return jsonError("Cannot rename DM conversations", 400);
    }

    const updated = await prisma.chatRoom.update({
      where: { id: roomId },
      data: { name: name?.trim() || room.name },
    });

    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("Chat PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── DELETE ──────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const messageId = searchParams.get("messageId");

    if (roomId) {
      const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
      if (!room) return jsonError("Room not found", 404);

      if (room.createdById !== user.id && user.role !== "ADMIN") {
        return jsonError("Only room creator or admin can delete", 403);
      }

      await prisma.chatRoom.delete({ where: { id: roomId } });
      return jsonOk({ success: true, message: "Room deleted" });
    }

    if (messageId) {
      const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
      if (!message) return jsonError("Message not found", 404);
      if (message.senderId !== user.id && user.role !== "ADMIN") {
        return jsonError("Can only delete your own messages", 403);
      }

      await prisma.chatMessage.delete({ where: { id: messageId } });
      return jsonOk({ success: true, message: "Message deleted" });
    }

    return jsonError("Provide roomId or messageId", 400);
  } catch (error) {
    console.error("Chat DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
