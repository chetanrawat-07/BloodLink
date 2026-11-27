// Role-based access control and geographic jurisdiction.
import { FACILITIES, facById, STATES, districtById } from "./networkData.js";

export const ROLE_LABELS = {
  super: "Super Administrator",
  state: "State/UT Administrator",
  district: "District Administrator",
  centre: "Blood Bank Administrator",
  hospital: "Hospital / Requesting Authority",
  official: "Health Department Official",
  donor: "Donor",
};
export const STAFF_ROLES = ["super", "state", "district", "centre", "hospital", "official"];

// action → roles allowed (jurisdiction is checked separately)
export const PERMISSIONS = {
  "transfer.create": ["super", "state", "district", "centre"],
  "transfer.approve": ["super", "state", "district"],
  "transfer.dispatch": ["super", "centre"],
  "transfer.receive": ["super", "centre"],
  "emergency.create": ["super", "hospital", "centre", "district"],
  "emergency.review": ["super", "state", "district", "centre"],
  "emergency.approve": ["super", "state", "district"],
  "integration.run": ["super", "state"],
  "integration.configure": ["super"],
  "config.edit": ["super"],
  "users.manage": ["super", "state"],
  "reports.export": ["super", "state", "district", "centre", "official"],
  "ledger.verify": ["super", "state", "district", "centre", "official"],
};
export const can = (user, action) => !!user && (PERMISSIONS[action] || []).includes(user.role);

function facilityOf(user) {
  if (user.facId && facById[user.facId]) return facById[user.facId];
  const name = (user.facility || "").toLowerCase();
  return name ? FACILITIES.find((f) => f.name.toLowerCase() === name) : null;
}

export function scopeOf(user) {
  if (!user) return { level: "none" };
  if (user.role === "super" || user.role === "official") return { level: "all", label: "All participating States/UTs" };
  if (user.role === "state") return { level: "state", state: user.region, label: STATES.find((s) => s.id === user.region)?.name };
  if (user.role === "district") return { level: "district", state: user.region, district: user.district, label: `${districtById[user.district]?.name || user.district} district` };
  const fac = facilityOf(user);
  if (fac) return { level: "facility", facId: fac.id, state: fac.state, district: fac.district, label: fac.name };
  if (STATES.some((s) => s.id === user.region)) return { level: "state", state: user.region, label: "State-level (facility not mapped)", readOnly: true };
  return { level: "none", label: "No participating facility mapped" };
}

export function whereOf(scope) {
  switch (scope.level) {
    case "all": return () => true;
    case "state": return (f) => f.state === scope.state;
    case "district": return (f) => f.district === scope.district;
    case "facility": return (f) => f.id === scope.facId;
    default: return () => false;
  }
}

export const inScope = (scope, facId) => !!facById[facId] && whereOf(scope)(facById[facId]);

// Jurisdiction + role + separation-of-duties checks for workflow steps
export function canTransfer(user, t, to) {
  const scope = scopeOf(user);
  const from = facById[t.from], dest = facById[t.to];
  if (user.role === "super") return to !== "Approved" || t.createdById !== user.id;
  switch (to) {
    case "Pending Approval": case "Cancelled":
      return can(user, "transfer.create") && (inScope(scope, t.from) || inScope(scope, t.to));
    case "Approved": case "Rejected":
      if (!can(user, "transfer.approve") || t.createdById === user.id) return false; // creator cannot approve own request
      if (user.role === "district") return from.district === dest.district && scope.district === dest.district;
      return scope.state === dest.state;
    case "Dispatched": case "In Transit":
      return can(user, "transfer.dispatch") && scope.facId === t.from;
    case "Received": case "Closed":
      return can(user, "transfer.receive") && scope.facId === t.to;
    default: return false;
  }
}

export function canEmergency(user, r, to) {
  const scope = scopeOf(user);
  if (user.role === "super") return true;
  if (to === "Closed") return (user.role === "hospital" && scope.facId === r.destFacId) || can(user, "emergency.review");
  if (to === "Approved" || to === "Rejected") return can(user, "emergency.approve") && inScope(scope, r.destFacId);
  if (to === "Processing" || to === "Fulfilled") return user.role === "centre" && (scope.facId === r.source || scope.facId === r.destFacId);
  return can(user, "emergency.review") && (inScope(scope, r.destFacId) || (!!r.source && scope.facId === r.source));
}
