import { Citations } from './citation.js';
import type { Citation } from './citation.js';
import type { Upstream, UpstreamRequest, UpstreamResponse } from './http.js';
import type { Config } from '../config.js';
import type { SourceId } from '../sources/registry.js';

/** The envelope every tool returns, over MCP and over REST alike. */
export interface ToolResult<T = unknown> {
  data: T;
  citations: Citation[];
  /** Caveats a reader needs: suppressed cells, preliminary values, third-party copyright */
  notes: string[];
  meta: {
    tool: string;
    sources: SourceId[];
    upstream_calls: number;
    cache_hits: number;
    latency_ms: number;
  };
}

/** One tool call's view of the service: shared plumbing, plus the citations and notes for this result. */
export class ToolContext {
  readonly cite = new Citations();
  private readonly notes = new Set<string>();
  private readonly sources = new Set<SourceId>();
  private calls = 0;
  private hits = 0;

  constructor(
    readonly config: Config,
    readonly http: Upstream,
    private readonly refresh = false,
  ) {}

  async get<T>(req: UpstreamRequest): Promise<UpstreamResponse<T>> {
    this.sources.add(req.source);
    const res = await this.http.json<T>(this.refresh ? { ...req, refresh: true } : req);
    this.calls++;
    if (res.cached) this.hits++;
    return res;
  }

  note(text: string): void {
    this.notes.add(text);
  }

  finish<T>(tool: string, data: T, startedAt: number): ToolResult<T> {
    return {
      data,
      citations: this.cite.list(),
      notes: [...this.notes],
      meta: {
        tool,
        sources: [...this.sources],
        upstream_calls: this.calls,
        cache_hits: this.hits,
        latency_ms: Math.round(performance.now() - startedAt),
      },
    };
  }
}
