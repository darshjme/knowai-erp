import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        },
      }),
});

/**
 * Create a child logger with request context for structured logging.
 * Usage: const log = requestLogger(req, user);
 *        log.info("payroll created");
 */
export function requestLogger(
  req: Request,
  user?: { id: string; role: string } | null
) {
  const url = new URL(req.url);
  return logger.child({
    method: req.method,
    path: url.pathname,
    userId: user?.id,
    role: user?.role,
  });
}
