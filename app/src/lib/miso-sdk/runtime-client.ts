/**
 * PocketBase Runtime Client
 *
 * Pre-configured PocketBase SDK client for data persistence.
 * Dev mode: requests route through /__runtime/ proxy → Session Manager → PocketBase container.
 * Published mode: requests route through
 * /site/<site_code>/__runtime/ → Flask → SM → PocketBase.
 *
 * Published auth is handled server-side by same-origin cookies.
 */

import PocketBase from "pocketbase";
import { getRuntimeBase, getAuthHeaders } from "./site-client";

const pb = new PocketBase(getRuntimeBase());

pb.beforeSend = async function (url: string, options: Record<string, unknown>) {
  const authHeaders = getAuthHeaders();
  if (Object.keys(authHeaders).length > 0) {
    options.headers = {
      ...(options.headers as Record<string, string> | undefined),
      ...authHeaders,
    };
  }
  return { url, options };
};

pb.afterSend = async function <T>(_response: Response, data: T): Promise<T> {
  return data;
};

export default pb;
