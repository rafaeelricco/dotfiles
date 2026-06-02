/**
 * Reference — the endpoint registry.
 * Source: app/frontend/src/api/endpoints.ts (ambar/HartAgency), adapted.
 * Maps friendly `api.*` names to typed backend command/query endpoint descriptors
 * (PlainEndpoint<Req, Res>). Call them with `call(api.x, body)` from ./request.example.tsx —
 * nothing runs until you `.fork`. Response types are re-exported for the call sites.
 */
export { api };

import { api as backend } from "@be/api";

export type { QueryResponse as ListCooperativesResponse } from "@be/domain/cooperative/query/listCooperatives.api";
export type { QueryResponse as LoansByCooperativeResponse } from "@be/domain/cooperative/query/loansByCooperativeId.api";
export type { QueryResponse as MembersByCooperativeResponse } from "@be/domain/cooperative/query/membersByCooperativeId.api";
export type { QueryResponse as TiersByCooperativeResponse } from "@be/domain/cooperative/query/tiersByCooperativeId.api";
export type { QueryResponse as ListOrgsResponse } from "@be/domain/org/query/listOrgs.api";
export type { CommandResponse as CreateCampaignResponse } from "@be/domain/campaign/command/createCampaign.api";

const api = {
  // Cooperative reads (consumed by ./cooperatives.example.tsx)
  listCooperatives: backend.query.cooperative_query_listCooperatives,
  loansByCooperativeId: backend.query.cooperative_query_loansByCooperativeId,
  membersByCooperativeId: backend.query.cooperative_query_membersByCooperativeId,
  tiersByCooperativeId: backend.query.cooperative_query_tiersByCooperativeId,

  // Campaign/org (consumed by ./campaigns.example.tsx)
  listOrgs: backend.query.org_query_listOrgs,
  createCampaign: backend.command.campaign_createCampaign,
} as const;
