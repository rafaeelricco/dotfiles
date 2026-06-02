/**
 * Reference — the HTTP layer.
 * Source: app/frontend/src/api/request.ts (ambar/HartAgency), verbatim.
 * `call` (JSON command/query), `query` (read), `uploadMultipart` (files), `stream` (websocket).
 * Each returns a `Future<FetchErrorResponse, Res>` — nothing runs until you `.fork`.
 */
export { call, uploadMultipart, Query, query, stream, type StreamCallbacks, type Cancel };

import * as JsonDecoder from "@ambarltd/core/json/decoder";
import { Future } from "@ambarltd/core/future";
import { fetchF, type FetchErrorResponse } from "@fe/lib/request";
import { MultipartEndpoint, PlainEndpoint, StreamingEndpoint } from "@be/app/endpoint";

type Decoder<T> = JsonDecoder.Decoder<T>;

const API_URL_BASE = import.meta.env.VITE_API_URL_BASE || window.location.origin;

/** Multipart POST for endpoints registered as MultipartEndpoint. Do not set
 *  Content-Type — the browser adds the multipart boundary itself. */
function uploadMultipart<Res>(endpoint: MultipartEndpoint<Res>, formData: FormData): Future<FetchErrorResponse, Res> {
  const url = new URL(endpoint.path, API_URL_BASE).toString();
  return fetchF(url, { method: "POST", body: formData }, endpoint.response.decoder);
}

function call<Req, Res>(endpoint: PlainEndpoint<Req, Res>, body: Req): Future<FetchErrorResponse, Res> {
  const url = new URL(endpoint.path, API_URL_BASE).toString();
  return fetchF(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(endpoint.request.encoder.run(body)),
    },
    endpoint.response.decoder,
  );
}

function query<Res>(q: Query<Res>): Future<FetchErrorResponse, Res> {
  return fetchF(
    q.endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    q.response_parser,
  );
}

class Query<Res> {
  readonly endpoint: string;
  readonly response_parser: Decoder<Res>;
  constructor(o: { endpoint: string; response_parser: Decoder<Res> }) {
    this.endpoint = o.endpoint;
    this.response_parser = o.response_parser;
  }
}

type Cancel = () => void;

type StreamCallbacks<Event> = Readonly<{
  onEvent: (event: Event) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}>;

function stream<Req, Res>(
  endpoint: StreamingEndpoint<Req, Res>,
  body: Req,
  callbacks: StreamCallbacks<Res>,
): Future<Error, Cancel> {
  return Future.create((reject, resolve) => {
    const apiBaseUrl = new URL(API_URL_BASE);
    const wsUrl = new URL(endpoint.path, apiBaseUrl);

    wsUrl.protocol =
      apiBaseUrl.protocol === "https:" ? "wss:"
      : apiBaseUrl.protocol === "http:" ? "ws:"
      : apiBaseUrl.protocol;

    const ws = new WebSocket(wsUrl.toString());

    ws.onopen = () => {
      ws.send(JSON.stringify(endpoint.request.encoder.run(body)));
      resolve(() => ws.close(1000, "Cancelled"));
    };

    ws.onmessage = (event: MessageEvent) => {
      JsonDecoder.decode(JSON.parse(event.data), endpoint.response.decoder).either(
        (error: string) => callbacks.onError(new Error(error)),
        (evt: Res) => callbacks.onEvent(evt),
      );
    };

    ws.onerror = () => {
      callbacks.onError(new Error("WebSocket connection error"));
      if (ws.readyState === WebSocket.CONNECTING) {
        reject(new Error("WebSocket connection error"));
      }
    };

    ws.onclose = () => {
      callbacks.onClose();
    };

    return () => {
      ws.close(1000, "Cancelled");
    };
  });
}
