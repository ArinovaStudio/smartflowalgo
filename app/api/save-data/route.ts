import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveDataSchema } from "@/lib/checkout";
import { isAuthorized, unauthorizedResponse } from "@/lib/basic-auth";
import { Prisma } from "@/generated/prisma/client";
import sendEmail from "@/lib/email";
import { emailTemplate } from "@/lib/template";

const SORTABLE_FIELDS = ["createdAt", "name"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase() || undefined;
  const mobile = searchParams.get("mobile")?.trim() || undefined;
  const tradingViewId = searchParams.get("tradingViewId")?.trim() || undefined;

  const id = searchParams.get("id")?.trim() || undefined;

  if (email || mobile || tradingViewId) {
    return checkDuplicates({ email, mobile, tradingViewId });
  }
  if (id) {
    const data = await prisma.user.findFirst({
      where: { id },
      include: { payments: true },
    });
    return NextResponse.json({ data }, { status: 200 });
  }

  // Everything past this point returns full lead records — gate it.
  if (!isAuthorized(req)) {
    return unauthorizedResponse();
  }
  return listLeads(searchParams);
}

async function checkDuplicates(params: {
  email?: string;
  mobile?: string;
  tradingViewId?: string;
}) {
  const { email, mobile, tradingViewId } = params;

  try {
    const [emailMatch, mobileMatch, tradingViewIdMatch] = await Promise.all([
      email
        ? prisma.user.findUnique({ where: { email }, select: { id: true } })
        : null,
      mobile
        ? prisma.user.findUnique({ where: { mobile }, select: { id: true } })
        : null,
      tradingViewId
        ? prisma.user.findUnique({
            where: { tradingViewId },
            select: { id: true },
          })
        : null,
    ]);

    return NextResponse.json({
      emailExists: !!emailMatch,
      mobileExists: !!mobileMatch,
      tradingViewIdExists: !!tradingViewIdMatch,
    });
  } catch (err) {
    console.error("[save-data][GET][duplicate-check] failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

async function listLeads(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10),
  );

  const search = searchParams.get("search")?.trim() || undefined;

  const planTypeParam = searchParams.get("planType");
  const planType: Prisma.EnumAccTypeNullableFilter<"User">["equals"] | undefined =
    planTypeParam === "PAID"
      ? "PAID"
      : planTypeParam === "FREE" || planTypeParam === "APPLIED"
        ? "APPLIED"
        : undefined;

  const sortByParam = searchParams.get("sortBy");
  const sortBy: SortableField = SORTABLE_FIELDS.includes(
    sortByParam as SortableField,
  )
    ? (sortByParam as SortableField)
    : "createdAt";
  const order: "asc" | "desc" =
    searchParams.get("order") === "asc" ? "asc" : "desc";

  // NOTE: `mode: "insensitive"` requires Postgres or MongoDB. Drop it if
  // you're on MySQL/SQLite — their default collations are usually already
  // case-insensitive for this kind of comparison.
  const where: Prisma.UserWhereInput = {
    ...(planType ? { planType } : {}),
    ...(search
      ? {
          OR: [
            { userType: "CLIENT" },
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
            { tradingViewId: { contains: search, mode: "insensitive" } },
            { broker: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err) {
    console.error("[save-data][GET][list] failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, tradingViewId, broker, mobile, email, planType, version } = parsed.data;
  
  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { mobile }, { tradingViewId }] },
      select: { email: true, mobile: true, tradingViewId: true },
    });

    if (existing) {
      const conflicts: string[] = [];
      if (existing.email === email) conflicts.push("email");
      if (existing.mobile === mobile) conflicts.push("mobile");
      if (existing.tradingViewId === tradingViewId)
        conflicts.push("tradingViewId");

      return NextResponse.json(
        { error: "One or more fields are already registered", conflicts },
        { status: 409 },
      );
    }

    const lead = await prisma.user.create({
      data: { name, tradingViewId, broker, mobile, email, planType, version },
      select: { id: true, srn: true, createdAt: true },
    });

    const html = emailTemplate
      .replaceAll("{{name}}", name)
      .replaceAll("{{email}}", email)
      .replaceAll("{{tradingViewId}}", tradingViewId)
      .replaceAll(
        "{{requestDate}}",
        lead.createdAt.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      )
      .replaceAll("{{status}}", "Recevied")
      .replaceAll("{{srn}}", String(lead.srn))
      .replaceAll("{{telegramLink}}", "https://t.me/smartflowtrading")
      .replaceAll("{{year}}", new Date().getFullYear().toString());

    await sendEmail(email, "✅ We've Received Your Indicator Access Request | SmartFlowAlgo", html);
    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (err) {
    // Race-condition fallback: two requests slipped past the findFirst check
    // at the same time and the DB's unique constraint caught it instead.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      return NextResponse.json(
        {
          error: "One or more fields are already registered",
          conflicts: target,
        },
        { status: 409 },
      );
    }

    console.error("[save-data][POST] failed to save lead:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const id = search.get("id");

  if (!id) {
    return NextResponse.json({ error: "id not provided" }, { status: 400 });
  }
  await prisma.user.delete({
    where: { id },
  });
  return NextResponse.json({ data: "success" }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, planType, renualDate, broker } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (planType !== undefined) {
      dataToUpdate.planType = planType;
    }

    if (renualDate !== undefined) {
      dataToUpdate.renualDate = renualDate ? new Date(renualDate) : null;
    }

    if (broker !== undefined) {
      dataToUpdate.broker = broker ? String(broker).trim() : null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error("[save-data][PATCH] failed to update lead:", err);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
