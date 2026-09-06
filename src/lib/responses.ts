import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

export function notFoundResponse(message = "Not found") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

export function conflictResponse(message = "Resource already exists") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 409 }
  );
}

export function serverErrorResponse(message = "Internal server error") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  );
}
