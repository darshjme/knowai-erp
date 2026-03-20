import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { getPaginationParams } from "@/lib/pagination";

export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const label = searchParams.get("label");
  const { page = 1, pageSize = 50 } = getPaginationParams(searchParams, { pageSize: 50 });

  const where: Record<string, unknown> = {
    createdBy: { workspaceId: user.workspaceId },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }
  if (label) {
    where.label = label;
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  return jsonOk({
    success: true,
    data: contacts,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  });
});

export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { name, email, phone, title, company, label, avatarColor } =
    await req.json();

  if (!name || !email) {
    return jsonError("Name and email are required", 400);
  }

  const contact = await prisma.contact.create({
    data: {
      name,
      email,
      phone: phone || null,
      title: title || null,
      company: company || null,
      label: label || "CLIENT",
      avatarColor: avatarColor || null,
      createdById: user.id,
    },
  });

  return jsonOk({ success: true, data: contact }, 201);
});

export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { id, name, email, phone, title, company, label, avatarColor } =
    await req.json();

  if (!id) return jsonError("Contact id is required", 400);

  const existing = await prisma.contact.findFirst({
    where: { id, createdBy: { workspaceId: user.workspaceId } },
  });
  if (!existing) return jsonError("Contact not found", 404);

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (title !== undefined) updateData.title = title;
  if (company !== undefined) updateData.company = company;
  if (label !== undefined) updateData.label = label;
  if (avatarColor !== undefined) updateData.avatarColor = avatarColor;

  const contact = await prisma.contact.update({
    where: { id },
    data: updateData,
  });

  return jsonOk({ success: true, data: contact });
});

export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Contact id is required", 400);

  const existing = await prisma.contact.findFirst({
    where: { id, createdBy: { workspaceId: user.workspaceId } },
  });
  if (!existing) return jsonError("Contact not found", 404);

  await prisma.contact.delete({ where: { id } });
  return jsonOk({ success: true, message: "Contact deleted" });
});
