/**
 * Read-side of the Log collection: builds the Mongo query behind the Audit Trail
 * filter bar and returns one page of results.
 *
 * Consumed by `GET /api/admin/logs`. Filtering and slicing happen here (in the
 * database) rather than in the browser — the viewer used to download every log
 * and filter in React, which does not survive a collection of any real size.
 */
import { Log } from "../../models/Log";
import { LogType } from "../../enums/logTypes";

export interface LogSearchFilters {
  type?: LogType;
  /** Partial match on the action code; prose labels ("Exceptional Approval") work too. */
  action?: string;
  /** Partial match on the actor's name. */
  actorName?: string;
  /** Request number / id, also matched against the log message. */
  reference?: string;
  /** Lower bound on `timestamp`, derived from the Date Range select. */
  from?: Date;
  page: number;
  limit: number;
}

export interface LogSearchResult {
  logs: unknown[];
  total: number;
  /** Clamped to the available range, so a stale page never renders empty. */
  page: number;
  limit: number;
  totalPages: number;
}

/** Escapes user input before it is interpolated into a `$regex` query. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive "contains" matcher for a user-supplied fragment. */
function contains(value: string) {
  return { $regex: escapeRegex(value), $options: "i" };
}

/** Mongo filter document. Loosely typed because `Log` is an untyped model. */
type LogFilter = Record<string, unknown>;

export class LogQueryService {
  /** Translates the filter bar into a Mongo filter document. */
  static buildQuery(filters: LogSearchFilters): LogFilter {
    const query: LogFilter = {};

    if (filters.type) query.type = filters.type;

    if (filters.action) {
      // The select offers prose labels while stored actions are SCREAMING_SNAKE
      // codes, so spaces are normalised before matching.
      query.action = contains(filters.action.trim().replace(/\s+/g, "_"));
    }

    if (filters.actorName) query.actorName = contains(filters.actorName.trim());

    if (filters.reference) {
      const needle = contains(filters.reference.trim());
      // A reference can be stored under either details key depending on which
      // service wrote the entry, and users also paste it into free-text search.
      query.$or = [
        { "details.requestNumber": needle },
        { "details.requestId": needle },
        { message: needle },
      ];
    }

    if (filters.from) query.timestamp = { $gte: filters.from };

    return query;
  }

  /** One page of logs, newest first, plus the total the filter bar matched. */
  static async search(filters: LogSearchFilters): Promise<LogSearchResult> {
    const query = LogQueryService.buildQuery(filters);

    const total = await Log.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / filters.limit));
    // Narrowing the filters can leave the client asking for a page that no
    // longer exists; serve the last one instead of an empty table.
    const page = Math.min(Math.max(1, filters.page), totalPages);

    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * filters.limit)
      .limit(filters.limit)
      .lean();

    return { logs, total, page, limit: filters.limit, totalPages };
  }
}
