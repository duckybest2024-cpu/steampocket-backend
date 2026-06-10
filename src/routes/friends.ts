import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const friendsRouter = Router();

// All routes require auth
friendsRouter.use(requireAuth);

// GET /friends — list accepted friends
friendsRouter.get("/friends", async (req: AuthedRequest, res) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: { userId: req.userId! },
      include: {
        friend: { select: { id: true, username: true, level: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      friends: friendships.map((f) => ({
        id: f.friend.id,
        username: f.friend.username,
        level: f.friend.level,
        since: f.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /friends error:", err);
    res.status(500).json({ error: "Failed to load friends" });
  }
});

// GET /friends/requests — incoming pending requests
friendsRouter.get("/friends/requests", async (req: AuthedRequest, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { toId: req.userId!, status: "pending" },
      include: {
        from: { select: { id: true, username: true, level: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      requests: requests.map((r) => ({
        id: r.id,
        from: { id: r.from.id, username: r.from.username, level: r.from.level },
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /friends/requests error:", err);
    res.status(500).json({ error: "Failed to load friend requests" });
  }
});

const requestSchema = z.object({ username: z.string().min(1) });

// POST /friends/request — send a friend request by username
friendsRouter.post("/friends/request", async (req: AuthedRequest, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { username } = parsed.data;
  const fromId = req.userId!;

  try {
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.id === fromId) return res.status(400).json({ error: "You can't add yourself" });

    // Check already friends
    const existingFriendship = await prisma.friendship.findUnique({
      where: { userId_friendId: { userId: fromId, friendId: target.id } },
    });
    if (existingFriendship) return res.status(409).json({ error: "Already friends" });

    // Check request already sent
    const existingRequest = await prisma.friendRequest.findUnique({
      where: { fromId_toId: { fromId, toId: target.id } },
    });
    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(409).json({ error: "Friend request already sent" });
      }
      if (existingRequest.status === "accepted") {
        return res.status(409).json({ error: "Already friends" });
      }
    }

    await prisma.friendRequest.create({
      data: { fromId, toId: target.id, status: "pending" },
    });

    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Friend request already sent" });
    console.error("POST /friends/request error:", err);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

const acceptSchema = z.object({ requestId: z.string().min(1) });

// POST /friends/accept — accept a pending request
friendsRouter.post("/friends/accept", async (req: AuthedRequest, res) => {
  const parsed = acceptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { requestId } = parsed.data;
  const toId = req.userId!;

  try {
    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.toId !== toId) return res.status(403).json({ error: "Not your request" });
    if (request.status !== "pending") return res.status(400).json({ error: "Request is no longer pending" });

    await prisma.$transaction([
      prisma.friendship.create({ data: { userId: request.fromId, friendId: request.toId } }),
      prisma.friendship.create({ data: { userId: request.toId, friendId: request.fromId } }),
      prisma.friendRequest.update({ where: { id: requestId }, data: { status: "accepted" } }),
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Already friends" });
    console.error("POST /friends/accept error:", err);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

const rejectSchema = z.object({ requestId: z.string().min(1) });

// POST /friends/reject — reject a pending request
friendsRouter.post("/friends/reject", async (req: AuthedRequest, res) => {
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { requestId } = parsed.data;
  const toId = req.userId!;

  try {
    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.toId !== toId) return res.status(403).json({ error: "Not your request" });
    if (request.status !== "pending") return res.status(400).json({ error: "Request is no longer pending" });

    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "rejected" } });

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /friends/reject error:", err);
    res.status(500).json({ error: "Failed to reject friend request" });
  }
});

// DELETE /friends/:friendId — remove friendship (both directions)
friendsRouter.delete("/friends/:friendId", async (req: AuthedRequest, res) => {
  const { friendId } = req.params;
  const userId = req.userId!;

  try {
    await prisma.$transaction([
      prisma.friendship.deleteMany({ where: { userId, friendId } }),
      prisma.friendship.deleteMany({ where: { userId: friendId, friendId: userId } }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /friends/:friendId error:", err);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});
